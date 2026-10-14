# dsh-connector 方向调研与实施记录

> 2026-09-23。调研同类资源，定位 dsh-connector 的差距，并记录本轮已实施的内容。

## 一、同类资源调研

### 1.1 生态里已经收敛出的三种形态

| 形态 | 代表 | 交互面 | 凭据/权限 |
|---|---|---|---|
| MCP 桥接（主流） | Telegram-Bridge-MCP、Slack 官方 MCP server | Agent 调 `send`/`ask` 工具 ↔ IM 双向 | OAuth（Slack）/ bot token + 用户白名单（Telegram） |
| 反向 MCP（读侧） | Hermes Agent MCP Server | 把 IM 历史暴露成 MCP 工具，供 Agent 读取 | 本地 |
| 单向通知 | MCP Slack Webhook | 只发不收 | webhook URL |

**结论**：生态已经收敛到 **MCP 作为连接器接口**，而不是每个 harness 自己定义插件 API。
dsh-connector 现在走的是「cordis 服务 `imConnector` + 适配器」的自有路线。
自有路线在**会话桥接**（把 IM 消息变成 dsh 会话输入）这类深度集成上更顺手，
但代价是**不能跨 harness 复用**。两者不冲突：可以把 `imConnector` 作为内核，
额外暴露一个 MCP 门面，让外部 harness 也能接。

### 1.2 最接近的对标：Telegram-Bridge-MCP

它把「IM 桥接」这件事做到的功能密度，值得逐条对照：

| 能力 | Telegram-Bridge-MCP | dsh-connector 当前 |
|---|---|---|
| 双向消息 | ✅ | ✅（飞书） |
| 多平台 | 1（但通用） | 1 已实现 + 4 规划 |
| 免公网地址 | ✅ 长轮询 | ✅ 本轮改为长连接 |
| 交互控件（按钮/确认） | ✅ inline buttons | ❌ |
| 语音转写 / TTS | ✅ 内置 Whisper + Kokoro | ❌ |
| 多会话隔离 | ✅ 队列 + token + 颜色标识 | ❌（无 IM 会话 ↔ dsh 会话映射） |
| 就地更新的进度条 / 清单 | ✅ super tools | ❌ |
| 开关与安全 | 用户白名单 + token | ⚠️ 本轮补白名单 + 只读模式 |
| 安装形态 | MCP server（跨客户端） | dsh 插件 |

**最大差距不是功能数量，而是「会话映射」**：现在的 `subscribe()` 有了，但没有任何代码
把 IM 会话映射到 dsh 会话，所以「把 IM 消息接入 dsh 会话」目前仍是**未实现的目标**。

### 1.3 飞书接入方式：长连接是共识

多份实践文档一致指向同一结论：

- 回调（webhook）方式**必须有公网可达的 HTTPS 地址**并让飞书验证 URL 有效性 →
  「对没有公网 IP 的个人开发者来说，这是个很大的障碍」
- 长连接方式由本机主动连飞书，**不需要公网地址、不需要填回调地址**
- 飞书要求「**应用先建立长连接才能提交发布**」，长连接是官方推荐路径

⚠️ **dsh-connector 原实现正好踩在反面上**：`src/adapters/feishu.js` 用的是
`createServer` + `port` + `verifyToken` + `url_verification` 的 webhook 形态。

其它被点名的坑（本轮已处理或记入路线）：
- 飞书事件是「**至少一次**」投递，必须按 `event_id` 去重，否则一次重推会重复触发 Agent
- Agent 有工具调用能力 + 接进企业 IM = **同事的消息可以触发 shell / 写文件**；
  强烈建议白名单 + 写操作二次确认
- 个人/小团队部署建议「配对授权」：机器人先回配对码，用户在 WebUI 批准后才生效

## 二、本轮已实施

### 2.1 设置从「hub 代管」迁到「自己内置」

原来：hub 设置页硬编码了 dsh-connector 的存储路径、平台字段名、飞书配置结构，
写 `~/.dsh/storages/dsh-connector/config.json`，dsh-connector 读它。
这是**层次错位**：插件商店不该托管另一个插件的设置界面与存储布局。

现在：dsh-connector 在 DSH 设置系统里注册**自己的命名空间**。

```
host   : ctx.settings.register('dsh-connector', schema, { applies: 'live' })
client : ctx.settingsScope.bind({ namespace: 'dsh-connector' })
         注册到 keyed 槽 settings.plugin.item（key = 命名空间名）
```

DSH 的契约明确支持仓库外插件这么做：
> 「它自己在 Host 注册 settings namespace，自己在浏览器注册该 key 下的卡片，
> 插件页把两者配对，而不需要知道这个 namespace 的含义。」

好处（相比自己管 config.json）：
- 持久化 / 修订号栅栏 / 并发写串行化 全由 DSH 负责
- **凭据永不下发浏览器**：`appSecret` / `verifyToken` 声明为 `role('secret')`，
  已实测确认序列化 schema 里带 `meta.role="secret"`，DSH 的 `redactSecrets` 会剥离它们
- 字段在设置页可以按 namespace 归组，不会被 hub 的 UI 绑架

### 2.2 飞书接入迁移到长连接

`src/adapters/feishu.js` 改为：
- **默认 `mode: 'ws'`** —— 用官方 SDK `@larksuiteoapi/node-sdk` 的 `WSClient` 接事件，
  不需要公网地址
- `mode: 'webhook'` 保留为兼容路径（已有反向代理的部署可用）
- SDK 未安装时给**可执行的补救提示**（装什么包 / 或改 mode），不静默失败

### 2.3 安全与可靠性补齐

| 项 | 实现 |
|---|---|
| 事件去重 | 按 `event_id` 去重，只保留最近 500 条（飞书至少一次投递） |
| 用户白名单 | `allowUsers`，不在名单内直接拒绝并告警 |
| 群聊 @ 判定 | `requireMention`（默认开） |
| 只读模式 | `readOnly`，开启后 `hub.send()` 直接拒绝，只收不发 |
| 凭据不回显 | `role('secret')` + 客户端输入框「留空=不修改」 |

### 2.4 已知未完成

- ❌ **IM 会话 ↔ dsh 会话映射**（「接入 dsh 会话」的核心，目前仍是目标而非实现）
- ❌ 交互卡片 / 按钮确认（飞书最强项，未用）
- ❌ 多平台（企微 / 钉钉 / QQ 仍只有注释）
- ⚠️ 客户端卡片的**实际渲染未做活体验证**（沙箱内 DSH 启动被 safe-delete 守卫拦住）

## 三、发展方向建议

### 阶段一：把「接入会话」真正做出来（最高优先）
现在的适配器能把消息接进来，但**没有消费者**。建议：
- `imConnector` 增加 `bindSession(platform, chatId, sessionId)` 与默认会话策略
- IM 消息 → 创建/复用 dsh 会话 → 跑一轮 → 回复结果到原会话
- 回复走「就地更新」：先发「思考中」占位，再编辑成结果（Telegram-Bridge-MCP 的做法）

### 阶段二：飞书能力补齐
- 交互卡片（确认按钮）——为「写操作二次确认」提供 UI 载体
- 群聊 @ 精确判定（现在只看 `mentions` 非空，应比对机器人自己的 open_id）
- 文件 / 图片收发

### 阶段三：多平台
按 `IMAdapter` 子类补齐 wecom / dingtalk / QQ / slack。
注意个人微信无官方 API，不做（现有注释已表明）。

### 阶段四：暴露 MCP 门面（可选）
把 `send` / `ask` / `list chats` 暴露成 MCP 工具，让 Claude Code / Codex 等
外部 harness 也能用同一套连接器 —— 复用已验证的适配器，不重复造轮子。

### 阶段五：配对授权
首次使用回配对码，用户在设置界面批准后才接受该用户消息。
把「白名单」从「手填 open_id」升级为「点一下批准」。
