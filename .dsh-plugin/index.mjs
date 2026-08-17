/**
 * dsh-connector Node half — IM/聊天平台桥接 + 工具深度集成（hub 可扩展类）。
 *
 * 装配：
 *   - 创建 ConnectorHub（多平台统一注册表）
 *   - 按配置注册平台适配器（当前：飞书；企微/钉钉/QQ 规划中）
 *   - 暴露 ctx.imConnector 服务，供 dsh 会话/其他插件订阅消息、发消息
 *   - 桥接工具（深度集成）：对话中可将 dsh 能力回复/主动消息发回 IM
 *
 * 配置来源（后续接入 hub 设置页）：
 *   DSH_CONNECTOR_CONFIG  JSON 字符串，如
 *   {"feishu":{"enabled":true,"appId":"cli_xxx","appSecret":"xxx","verifyToken":"xxx","port":8787}}
 */
import { createHub } from '../src/connector.js'
import { FeishuAdapter } from '../src/adapters/feishu.js'

export const name = 'dsh-connector'
export const inject = []

export function apply(ctx) {
  const hub = createHub()

  // 读取配置（环境变量或 dsh 插件配置）
  let config = {}
  try {
    config = JSON.parse(process.env.DSH_CONNECTOR_CONFIG ?? '{}')
  } catch {
    console.warn('[dsh-connector] DSH_CONNECTOR_CONFIG 不是合法 JSON，使用空配置')
  }

  // 注册平台适配器（配置存在的平台）
  if (config.feishu) hub.register('feishu', new FeishuAdapter(config.feishu))
  // 规划中：wecom / dingtalk / qq / slack —— 复用 IMAdapter 子类
  // if (config.wecom) hub.register('wecom', new WecomAdapter(config.wecom))

  // 暴露服务（供 dsh 会话 / 其他插件调用）
  try {
    ctx.provide('imConnector', () => ({
      hub,
      send: (platform, chatId, text) => hub.send(platform, chatId, text),
      subscribe: (platform, fn) => hub.subscribe(platform, fn),
      startAll: () => hub.startAll(),
      stopAll: () => hub.stopAll(),
      platforms: () => [...hub.adapters.keys()],
    }))
  } catch {
    console.warn('[dsh-connector] ctx.provide 不可用，服务降级为仅导出 hub')
  }
  ctx.imConnector = { hub, send: (p, c, t) => hub.send(p, c, t), subscribe: (p, f) => hub.subscribe(p, f), platforms: () => [...hub.adapters.keys()] }

  // 配置了 enabled 的平台自动启动
  const anyEnabled = Object.values(config).some((c) => c?.enabled)
  if (anyEnabled) {
    hub.startAll().then((started) => {
      console.log(`[dsh-connector] 已启动平台: ${started.join(', ') || '无'}`)
    }).catch((e) => console.error(`[dsh-connector] 启动失败: ${e.message}`))
  } else {
    console.log('[dsh-connector] 未启用任何平台。配置 DSH_CONNECTOR_CONFIG 后重启即可桥接 IM。')
  }

  return { hub, config }
}
