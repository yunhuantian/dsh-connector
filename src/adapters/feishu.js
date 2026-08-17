/**
 * 飞书适配器 — 官方开放平台正规通道。
 *
 * 依赖配置（config）：
 *   appId     飞书开放平台应用 App ID
 *   appSecret 应用密钥
 *   verifyToken 事件订阅验证 token（用于 URL 校验）
 *   port      本地 webhook 监听端口（默认 8787）
 *
 * 能力：
 *  - 接收：事件订阅（im.message.receive_v1）→ ImMessage
 *  - 发送：im.v1.message.create（文本消息）
 *
 * 文档：
 *  - https://open.feishu.cn/document/event/event-subscription-guide
 *  - https://open.feishu.cn/document/server-docs/im-v1/message/create
 */
import { createServer } from 'node:http'
import { IMAdapter, ImMessage, ConnectorError } from '../connector.js'

const FEISHU_API = 'https://open.feishu.cn/open-apis'

export class FeishuAdapter extends IMAdapter {
  /** 启动本地 webhook server，接收飞书事件订阅。 */
  async start() {
    const { appId, appSecret, verifyToken, port = 8787 } = this.config
    if (!appId || !appSecret) throw new ConnectorError('飞书适配器缺少 appId/appSecret（在飞书开放平台创建应用后填入）', 'CONFIG')
    this.port = port

    this.server = createServer((req, res) => {
      let body = ''
      req.on('data', (c) => { body += c })
      req.on('end', () => {
        void this._handleEvent(body, res)
      })
    })

    await new Promise((resolve, reject) => {
      this.server.once('error', reject)
      this.server.listen(this.port, resolve)
    })

    this.running = true
    console.log(`[dsh-connector] 飞书适配器已启动，webhook: http://0.0.0.0:${this.port}/feishu/event（在飞书开放平台配置该事件订阅 URL）`)
    return this
  }

  async stop() {
    if (this.server) {
      await new Promise((resolve) => this.server.close(() => resolve()))
      this.server = null
    }
    this.running = false
  }

  /** 处理飞书事件订阅请求：URL 校验 + 消息事件。 */
  async _handleEvent(body, res) {
    const json = JSON.parse(body || '{}')
    const { verifyToken } = this.config

    // URL 校验（飞书第一次配置订阅地址时的 challenge 验证）
    if (json.type === 'url_verification') {
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ challenge: json.challenge }))
      return
    }

    // 事件回调：校验 token
    if (verifyToken && json.header?.token && json.header.token !== verifyToken) {
      res.writeHead(403); res.end('bad verify token'); return
    }

    // 消息事件 im.message.receive_v1
    if (json.header?.event_type === 'im.message.receive_v1') {
      const ev = json.event ?? {}
      const msg = ev.message ?? {}
      // content 是 JSON 字符串：{"text":"..."} 或纯文本
      let text = ''
      try {
        const parsed = JSON.parse(String(msg.content ?? ''))
        text = String(parsed.text ?? parsed.content ?? '')
      } catch {
        text = String(msg.content ?? '')
      }
      const sender = ev.sender ?? {}
      this._receive(new ImMessage({
        platform: 'feishu',
        chatId: String(ev.chat_id ?? msg.chat_id ?? ''),
        userId: String(sender.sender_id?.open_id ?? ''),
        user: String(sender.sender_id?.open_id ?? '').slice(-6),
        text,
        raw: json,
      }))
    }

    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ code: 0, msg: 'success' }))
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
