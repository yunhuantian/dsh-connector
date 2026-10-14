/**
 * dsh-connector 设置契约 —— host 与 client 共享的唯一真相。
 *
 * 为什么用 DSH 原生 settings 而不是自己写 config.json：
 *   - 持久化 / 修订号栅栏 / 并发写串行化 由 ctx.settings 负责，插件不再自己管文件
 *   - `role('secret')` 声明的字段**永不下发**到浏览器（只回报「是否已设置」），
 *     appSecret 这类凭据不会出现在任何响应体里
 *   - 设置界面按 namespace 配对：host 注册 namespace，client 注册同 key 的卡片
 *
 * namespace 必须是「小写字母开头 + 小写字母/数字/连字符」。
 */
import Schema from '@deepseek-ai/schemastery'

/** 注册到 DSH 设置文档里的命名空间（落盘为 ~/.dsh/settings.yaml 的顶层键）。 */
export const NS = 'dsh-connector'

/** 平台开关与凭据。每个平台一段，便于后续加 wecom / dingtalk / qq。 */
const platform = (fields) => Schema.object(fields)

/**
 * 一个平台的通用字段。`appSecret` 用 role('secret') —— 它是写后不可读的。
 */
export const feishuSchema = platform({
  enabled: Schema.boolean().default(false).description('启用飞书桥接'),
  /**
   * 事件接收方式：
   *   ws      —— 长连接（默认，推荐）。主动连飞书，**不需要公网 IP / 回调地址**
   *   webhook —— 回调地址。需要公网可达的 HTTPS，仅适合已有反向代理的部署
   */
  mode: Schema.string().default('ws').description('事件接收方式：ws=长连接（推荐）/ webhook=回调地址'),
  appId: Schema.string().default('').description('飞书开放平台 App ID'),
  appSecret: Schema.string().role('secret').default('').description('飞书应用密钥（写入后不再回显）'),
  /** 仅 webhook 模式使用。 */
  verifyToken: Schema.string().role('secret').default('').description('事件订阅验证 Token（仅 webhook 模式）'),
  /** 仅 webhook 模式使用。 */
  port: Schema.natural().default(8787).description('本地 webhook 监听端口（仅 webhook 模式）'),
  /**
   * 安全边界：只有这些 open_id 可以驱动 Agent。
   * 留空 = 不限制（仅建议在完全可信的企业内网使用）。
   */
  allowUsers: Schema.array(Schema.string()).default([]).description('允许驱动 Agent 的用户 open_id 白名单（留空=不限制）'),
  /** 单聊/群聊均适用；群聊里 @机器人 才触发。 */
  requireMention: Schema.boolean().default(true).description('群聊中必须 @机器人 才响应'),
})

/** 整个插件的设置 schema。 */
export const connectorSchema = Schema.object({
  feishu: feishuSchema,
  /** 全局安全开关：只读模式下行内写操作（发消息等）被拒绝。 */
  readOnly: Schema.boolean().default(false).description('只读模式：不向 IM 发送任何消息'),
})

/** 读取设置后的形态。 */
export const DEFAULT_SECTION = {
  feishu: {
    enabled: false,
    mode: 'ws',
    appId: '',
    appSecret: '',
    verifyToken: '',
    port: 8787,
    allowUsers: [],
    requireMention: true,
  },
  readOnly: false,
}

/**
 * 把设置段整理成适配器配置：补齐默认值，避免下游每处都写 `?? {}`。
 * @param section - ctx.settings 解析出的段（可能为 undefined）
 * @returns 规范化后的配置
 */
export function normalize(section) {
  const s = section ?? {}
  return {
    readOnly: s.readOnly === true,
    feishu: { ...DEFAULT_SECTION.feishu, ...(s.feishu ?? {}) },
  }
}
