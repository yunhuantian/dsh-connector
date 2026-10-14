/**
 * 飞书适配器 —— 长连接（WebSocket）为主，回调地址（webhook）兼容。
 *
 * 为什么默认长连接：
 *   - 长连接由本机主动连飞书，**不需要公网 IP、不需要回调地址校验**
 *   - 回调方式必须准备公网可达的 HTTPS 并让飞书验证 URL 有效性，
 *     个人 / 内网部署下这是最大的障碍
 *   - 飞书要求「应用先建立长连接才能发布」，长连接是官方推荐路径
 *
 * 依赖配置（来自 DSH settings 的 dsh-connector 命名空间）：
 *   mode         'ws' | 'webhook'（默认 ws）
 *   appId        飞书开放平台 App ID
 *   appSecret    应用密钥（secret，写入后不回显）
 *   verifyToken  仅 webhook 模式使用
 *   port         仅 webhook 模式使用
 *   allowUsers   open_id 白名单，留空=不限制
 *   requireMention 群聊是否必须 @机器人
 *
 * 能力：
 *   - 接收：im.message.receive_v1 → ImMessage
 *   - 发送：im.v1.message.create（文本消息）
 *
 * 文档：
 *   - 长连接：https://open.feishu.cn/document/server-docs/event-subscription-guide/event-subscription-configure-/request-url-configuration-case
 *   - 发消息：https://open.feishu.cn/document/server-docs/im-v1/message/create
 */
import { createServer } from 'node:http'
import { IMAdapter, ImMessage, ConnectorError } from '../connector.js'

const FEISHU_API = 'https://open.feishu.cn/open-apis'
/** 官方 Node SDK：长连接必须用它（自行实现 WS 协议不现实）。 */
const SDK_PKG = '@larksuiteoapi/node-sdk'

export class FeishuAdapter extends IMAdapter {
  /** 启动事件接收：默认长连接，可切回调。 */
  async start() {
    const cfg = this.config ?? {}
    const { appId, appSecret, mode = 'ws' } = cfg
    if (!appId || !appSecret) {
      throw new ConnectorError('飞书适配器缺少 appId/appSecret（在飞书开放平台创建应用后填入）', 'CONFIG')
    }

    if (mode === 'webhook') return this._startWebhook()
    return this._startLongConnection()
  }

  /**
   * 长连接：用官方 SDK 的 WSClient 接事件。
   * SDK 未安装时给出可执行的补救提示，而不是静默失败。
   */
  async _startLongConnection() {
    const { appId, appSecret } = this.config
    let Lark
    try {
      Lark = await import(SDK_PKG)
    } catch {
      throw new ConnectorError(
        `飞书长连接需要官方 SDK：请先安装 ${SDK_PKG}（npm i ${SDK_PKG}）。`
        + ' 若不想装 SDK，可把 mode 改为 webhook。',
        'SDK_MISSING',
      )
    }

    const dispatcher = new Lark.EventDispatcher({}).register({
      'im.message.receive_v1': async (data) => {
        await this._onReceiveEvent(data)
      },
    })

    this.wsClient = new Lark.WSClient({ appId, appSecret })
    // start() 返回 Promise 且长驻；不 await 完成，否则会阻塞插件启动。
    void this.wsClient.start({ eventDispatcher: dispatcher }).catch((e) => {
      console.error(`[dsh-connector] 飞书长连接异常退出: ${e?.message ?? e}`)
      this.running = false
    })

    this.running = true
    console.log('[dsh-connector] 飞书适配器已启动（长连接 wss，无需公网地址）')
    return this
  }

  /** 兼容路径：本地 HTTP 服务接收事件回调（需要公网可达地址）。 */
  async _startWebhook() {
    const { verifyToken, port = 8787 } = this.config
    this.port = port

    this.server = createServer((req, res) => {
      let body = ''
      req.on('data', (c) => { body += c })
      req.on('end', () => { void this._handleWebhookEvent(body, res) })
    })

    await new Promise((resolve, reject) => {
      this.server.once('error', reject)
      this.server.listen(this.port, resolve)
    })

    this.running = true
    console.log(`[dsh-connector] 飞书适配器已启动，webhook: http://0.0.0.0:${this.port}/feishu/event`)
    if (!verifyToken) console.warn('[dsh-connector] webhook 模式未配置 verifyToken，事件来源无法校验')
    return this
  }

  async stop() {
    if (this.wsClient) {
      try { await this.wsClient.stop?.() } catch { /* 忽略：连接可能已断开 */ }
      this.wsClient = null
    }
    if (this.server) {
      await new Promise((resolve) => this.server.close(() => resolve()))
      this.server = null
    }
    this.running = false
  }

  /** webhook 请求入口：URL 校验 + 消息事件。 */
  async _handleWebhookEvent(body, res) {
    let json
    try {
      json = JSON.parse(body || '{}')
    } catch {
      res.writeHead(400); res.end('bad json'); return
    }
    const { verifyToken } = this.config

    // 飞书配置订阅地址时的 challenge 验证
    if (json.type === 'url_verification') {
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ challenge: json.challenge }))
      return
    }

    if (verifyToken && json.header?.token !== verifyToken) {
      res.writeHead(403); res.end('bad verify token'); return
    }

    if (json.header?.event_type === 'im.message.receive_v1') {
      // 先回 200 再处理：飞书按「至少一次」投递，超时会重推。
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ code: 0, msg: 'success' }))
      await this._onReceiveEvent(json)
      return
    }

    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ code: 0, msg: 'success' }))
  }

  /**
   * 事件 → ImMessage 的统一入口（长连接与 webhook 共用）。
   *
   * 两道闸门：
   *   1. 去重 —— 飞书投递是「至少一次」，同一条消息可能重复到达；
   *      若不去重，一次重推就会再触发一轮 Agent（可能重复执行写操作）。
   *   2. 白名单 —— 只有 allowUsers 里的用户可以驱动 Agent。
   */
  async _onReceiveEvent(json) {
    const header = json?.header ?? {}
    const eventId = String(header.event_id ?? '')
    if (eventId && this._seen(eventId)) return

    const ev = json?.event ?? {}
    const msg = ev.message ?? {}
    const sender = ev.sender ?? {}
    const openId = String(sender.sender_id?.open_id ?? '')

    const { allowUsers = [], requireMention = true } = this.config
    if (allowUsers.length > 0 && !allowUsers.includes(openId)) {
      console.warn(`[dsh-connector] 拒绝未授权用户 ${openId}（不在 allowUsers 白名单内）`)
      return
    }
    if (requireMention && this._isGroup(msg) && !this._mentionsBot(msg)) return

    this._receive(new ImMessage({
      platform: 'feishu',
      chatId: String(ev.chat_id ?? msg.chat_id ?? ''),
      userId: openId,
      user: openId.slice(-6),
      text: this._textOf(msg),
      raw: json,
    }))
  }

  /** 事件去重：只保留最近 500 个 event_id，避免无界增长。 */
  _seen(eventId) {
    this._seenIds ??= new Set()
    if (this._seenIds.has(eventId)) return true
    this._seenIds.add(eventId)
    if (this._seenIds.size > 500) {
      const first = this._seenIds.values().next().value
      this._seenIds.delete(first)
    }
    return false
  }

  _isGroup(msg) {
    return String(msg.chat_type ?? '') === 'group'
  }

  /** 群聊里机器人被 @ 时，mentions 里会出现自己的 open_id。 */
  _mentionsBot(msg) {
    const mentions = Array.isArray(msg.mentions) ? msg.mentions : []
    return mentions.some((m) => m?.name && String(m.name).length > 0)
  }

  /** content 是 JSON 字符串：{"text":"..."}；解析失败时退回原文。 */
  _textOf(msg) {
    const raw = String(msg.content ?? '')
    try {
      const parsed = JSON.parse(raw)
      return String(parsed.text ?? parsed.content ?? '')
    } catch {
      return raw
    }
  }

  /** 发文本消息到飞书会话（chatId = chat_id）。 */
  async send(chatId, text) {
    const token = await this._tenantToken()
    const res = await fetch(`${FEISHU_API}/im/v1/messages?receive_id_type=chat_id`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ receive_id: chatId, msg_type: 'text', content: JSON.stringify({ text }) }),
    })
    const data = await res.json()
    if (data.code !== 0) throw new ConnectorError(`飞书发消息失败: ${data.msg ?? res.status}`, 'FEISHU_SEND')
    return data
  }

  /** 获取 tenant access token（带缓存）。 */
  async _tenantToken() {
    if (this._token && this._tokenExp > Date.now()) return this._token
    const { appId, appSecret } = this.config
    const res = await fetch(`${FEISHU_API}/auth/v3/tenant_access_token/internal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ app_id: appId, app_secret: appSecret }),
    })
    const data = await res.json()
    if (data.code !== 0) throw new ConnectorError(`飞书获取 token 失败: ${data.msg ?? res.status}`, 'FEISHU_AUTH')
    this._token = data.tenant_access_token
    this._tokenExp = Date.now() + (data.expire - 60) * 1000
    return this._token
  }
}
