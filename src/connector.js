/**
 * IM Connector 抽象 — 多平台统一接口。
 *
 * 每个平台适配器实现该接口，dsh-connector 以统一事件模型桥接：
 *   IM 消息 → (verify) → onMessage(callback) → 桥进 dsh 会话
 *   dsh 工具 → send(chatId, text) → 发回 IM
 *
 * 平台清单（当前实现 → 规划中）：
 *   ✅ feishu   飞书开放平台（事件订阅 + 发消息 API，官方正规通道）
 *   ⏳ wecom    企业微信（微信官方通道；个人微信无官方 API，不做）
 *   ⏳ dingtalk 钉钉开放平台
 *   ⏳ qq       QQ 官方开放平台（机器人）
 *   ⏳ slack    通用（海外）
 */
export class ConnectorError extends Error {
  constructor(message, code = 'CONNECTOR_ERR') {
    super(message)
    this.code = code
  }
}

/** 统一消息事件（平台无关）。 */
export class ImMessage {
  constructor({ platform, chatId, userId, user, text, raw }) {
    this.platform = platform   // 'feishu' | 'wecom' | ...
    this.chatId = chatId       // 会话/群唯一 id
    this.userId = userId
    this.user = user           // 显示名
    this.text = text           // 纯文本内容
    this.raw = raw             // 平台原始事件（供高级扩展）
    this.ts = Date.now()
  }
}

/**
 * 平台适配器基类。
 * 子类实现：start()（监听/订阅）、stop()、send(chatId, text)（发消息）。
 * 事件通过 this.emit('message', ImMessage) 向上抛。
 */
export class IMAdapter extends EventTarget {
  constructor(config) {
    super()
    this.config = config ?? {}
    this.running = false
    this._msgHandler = null
  }

  /** 设置消息回调（桥接层用）。 */
  onMessage(fn) { this._msgHandler = fn }

  /** 内部触发：收到消息 → 校验 → 回调。 */
  _receive(msg) {
    if (this._msgHandler) this._msgHandler(msg)
  }

  /** 子类实现：启动监听。 */
  async start() { throw new ConnectorError('start() 未实现') }

  /** 子类实现：停止监听。 */
  async stop() { this.running = false }

  /** 子类实现：发消息到 IM。 */
  async send(chatId, text) { throw new ConnectorError('send() 未实现') }
}

/** 连接器注册表：管理所有平台适配器 + 统一桥接。 */
export class ConnectorHub {
  constructor() {
    this.adapters = new Map()
    this.handlers = new Map() // 平台名 → 消息回调（可多个）
  }

  /** 注册平台适配器（id: 'feishu' 等）。 */
  register(id, adapter) {
    this.adapters.set(id, adapter)
    adapter.onMessage((msg) => {
      const fns = this.handlers.get(id) ?? []
      for (const fn of fns) {
        try { fn(msg) } catch { /* 单 handler 失败不影响其他 */ }
      }
    })
    return this
  }

  /** 订阅某平台的消息（供 dsh 会话/工具桥接）。返回取消函数。 */
  subscribe(platform, fn) {
    const list = this.handlers.get(platform) ?? []
    list.push(fn)
    this.handlers.set(platform, list)
    return () => {
      const l = this.handlers.get(platform) ?? []
      this.handlers.set(platform, l.filter((x) => x !== fn))
    }
  }

  /** 启动所有已配置的适配器。 */
  async startAll() {
    const started = []
    for (const [id, ad] of this.adapters) {
      if (!ad.config?.enabled) continue
      await ad.start()
      started.push(id)
    }
    return started
  }

  /** 停止全部。 */
  async stopAll() {
    for (const ad of this.adapters.values()) {
      try { await ad.stop() } catch { /* ignore */ }
    }
  }

  /** 通过平台发消息。 */
  async send(platform, chatId, text) {
    const ad = this.adapters.get(platform)
    if (!ad) throw new ConnectorError(`未知平台: ${platform}`, 'NO_ADAPTER')
    return ad.send(chatId, text)
  }
}

/** 创建默认 ConnectorHub 的工厂。 */
export function createHub() {
  return new ConnectorHub()
}
