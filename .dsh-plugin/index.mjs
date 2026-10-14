/**
 * dsh-connector Node half —— IM/聊天平台桥接 + 工具深度集成。
 *
 * 装配：
 *   - 创建 ConnectorHub（多平台统一注册表）
 *   - 在 DSH 设置系统里注册自己的命名空间 `dsh-connector`：
 *     持久化、修订号栅栏、凭据脱敏都由 ctx.settings 负责，插件不再自己管 config.json
 *   - 按设置注册平台适配器（当前：飞书；企微/钉钉/QQ 规划中）
 *   - 以 cordis 服务 `imConnector` 暴露给其它插件
 *
 * 凭据：`appSecret` / `verifyToken` 在 schema 里声明为 `role('secret')`，
 * 该字段**永不下发到浏览器**（设置界面只回报「是否已设置」）。
 *
 * 开发期覆盖：环境变量 DSH_CONNECTOR_CONFIG（JSON 字符串）作为合成层 base，
 * 优先级低于用户在设置界面里的填写。
 */
import { createHub } from '../src/connector.js'
import { FeishuAdapter } from '../src/adapters/feishu.js'
import { NS, connectorSchema, normalize } from '../src/settings.js'

export const name = 'dsh-connector'
/** 依赖 DSH 的用户设置服务（提供者：@deepseek-ai/dsh-settings-file）。 */
export const inject = ['settings']
export const provide = ['imConnector']

/** 解析环境变量覆盖（合成层）。非法 JSON 时忽略并提示。 */
function envBase() {
  const raw = process.env.DSH_CONNECTOR_CONFIG
  if (!raw) return undefined
  try { return JSON.parse(raw) } catch {
    console.warn('[dsh-connector] DSH_CONNECTOR_CONFIG 不是合法 JSON，已忽略')
    return undefined
  }
}

export function apply(ctx) {
  const scope = ctx.settings.register(NS, connectorSchema, {
    base: envBase(),
    applies: 'live',
  })

  let hub = null
  const build = () => {
    const cfg = normalize(scope.get())
    const next = createHub({ readOnly: cfg.readOnly })
    if (cfg.feishu?.enabled) next.register('feishu', new FeishuAdapter(cfg.feishu))
    // 规划中：wecom / dingtalk / qq / slack —— 复用 IMAdapter 子类
    return { hub: next, cfg }
  }

  /** 起停一轮适配器，把「配置变了」变成「适配器真的重连了」。 */
  const reconcile = async (reason) => {
    const prev = hub
    const built = build()
    hub = built.hub
    if (prev) {
      try { await prev.stopAll() } catch { /* 已断开的连接忽略 */ }
    }
    const started = await hub.startAll()
    const platforms = [...hub.adapters.keys()]
    if (platforms.length === 0) {
      console.log(`[dsh-connector] 未启用任何平台（${reason}）。在「设置 → 插件 → 连接器」里配置后即可桥接 IM。`)
    } else {
      console.log(`[dsh-connector] 已启动平台: ${started.join(', ') || '无'}（${reason}）`)
    }
    return platforms
  }

  /** 对外服务：其它插件 inject: ['imConnector'] 即可调用。 */
  ctx.provide('imConnector', () => ({
    send: (platform, chatId, text) => hub.send(platform, chatId, text),
    subscribe: (platform, fn) => hub.subscribe(platform, fn),
    startAll: () => hub.startAll(),
    stopAll: () => hub.stopAll(),
    platforms: () => [...hub.adapters.keys()],
    readOnly: () => hub.readOnly,
  }))

  // 首次装配
  void reconcile('启动').catch((e) => {
    console.error(`[dsh-connector] 启动失败: ${e.message}`)
  })

  // 设置变更 → 重建适配器（凭据改了要重连，否则还是旧凭据）
  const disposeWatch = scope.watch(() => {
    void reconcile('设置变更').catch((e) => {
      console.error(`[dsh-connector] 应用设置失败: ${e.message}`)
    })
  })

  return () => {
    disposeWatch()
    return hub?.stopAll?.()
  }
}
