/**
 * dsh-connector Node half — IM/聊天平台桥接 + 工具深度集成（hub 可扩展类）。
 *
 * 装配：
 *   - 创建 ConnectorHub（多平台统一注册表）
 *   - 按配置注册平台适配器（当前：飞书；企微/钉钉/QQ 规划中）
 *   - 状态通过文件暴露（~/.dsh/storages/dsh-connector/status.json），
 *     hub 读取展示——插件与商店解耦（同 dsh-bench 约定）
 *
 * 配置来源（优先级）：
 *   1) 环境变量 DSH_CONNECTOR_CONFIG（JSON 字符串）
 *   2) 配置文件 ~/.dsh/storages/dsh-connector/config.json（hub 设置页写入）
 *
 * 示例配置：
 *   {"feishu":{"enabled":true,"appId":"cli_xxx","appSecret":"xxx","verifyToken":"xxx","port":8787}}
 */
import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { homedir } from 'node:os'
import { createHub } from '../src/connector.js'
import { FeishuAdapter } from '../src/adapters/feishu.js'

export const name = 'dsh-connector'
export const inject = []
export const provide = ['imConnector']

const STORE_DIR = join(homedir(), '.dsh', 'storages', 'dsh-connector')
const CONFIG_FILE = join(STORE_DIR, 'config.json')
const STATUS_FILE = join(STORE_DIR, 'status.json')

/** 读取配置：环境变量优先，其次配置文件。 */
function loadConfig() {
  if (process.env.DSH_CONNECTOR_CONFIG) {
    try { return JSON.parse(process.env.DSH_CONNECTOR_CONFIG) } catch {
      console.warn('[dsh-connector] DSH_CONNECTOR_CONFIG 不是合法 JSON，忽略')
    }
  }
  if (existsSync(CONFIG_FILE)) {
    try { return JSON.parse(readFileSync(CONFIG_FILE, 'utf8')) } catch {
      console.warn(`[dsh-connector] 配置文件损坏，忽略: ${CONFIG_FILE}`)
    }
  }
  return {}
}

/** 写状态文件（hub 读取展示）。 */
function writeStatus(status) {
  try {
    mkdirSync(STORE_DIR, { recursive: true })
    writeFileSync(STATUS_FILE, JSON.stringify({ updatedAt: new Date().toISOString(), platforms: status }, null, 2), 'utf8')
  } catch { /* best-effort */ }
}

export function apply(ctx) {
  const hub = createHub()
  const config = loadConfig()

  // 注册平台适配器（配置存在的平台）
  if (config.feishu) hub.register('feishu', new FeishuAdapter(config.feishu))
  // 规划中：wecom / dingtalk / qq / slack —— 复用 IMAdapter 子类
  // if (config.wecom) hub.register('wecom', new WecomAdapter(config.wecom))

  // 启动完成回调：更新状态文件
  const syncStatus = () => {
    const out = {}
    for (const [id, ad] of hub.adapters) {
      const cfg = config[id] ?? {}
      out[id] = {
        configured: Boolean(cfg.appId && cfg.appSecret),
        enabled: Boolean(cfg.enabled),
        running: ad.running ?? false,
        port: cfg.port ?? null,
      }
    }
    writeStatus(out)
  }

  // 暴露服务（cordis 服务：其他组件声明 inject: ['imConnector'] 即可调用）
  const service = {
    hub,
    send: (platform, chatId, text) => hub.send(platform, chatId, text),
    subscribe: (platform, fn) => hub.subscribe(platform, fn),
    startAll: () => hub.startAll(),
    stopAll: () => hub.stopAll(),
    status: syncStatus,
    platforms: () => [...hub.adapters.keys()],
  }
  ctx.provide('imConnector', () => service)

  // 配置了 enabled 的平台自动启动
  const anyEnabled = Object.values(config).some((c) => c?.enabled)
  if (anyEnabled) {
    hub.startAll().then((started) => {
      console.log(`[dsh-connector] 已启动平台: ${started.join(', ') || '无'}`)
      syncStatus()
    }).catch((e) => {
      console.error(`[dsh-connector] 启动失败: ${e.message}`)
      syncStatus()
    })
  } else {
    console.log('[dsh-connector] 未启用任何平台。在 hub「连接器」设置里配置飞书等平台后重启即可桥接 IM。')
    syncStatus()
  }

  return { config, status: syncStatus }
}
