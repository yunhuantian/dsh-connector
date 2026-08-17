# dsh-connector — IM/聊天平台桥接 + 工具深度集成

把 **IM/聊天平台的消息接入 dsh 会话**：微信(企业微信)、飞书、钉钉、QQ 等平台的消息
桥进 dsh，对话中直接收发 IM 消息、深度调用 dsh 工具链。

> **归属**：本包是 **[dsh-plugin-hub](https://github.com/yunhuantian/dsh-plugin-hub) 官方可扩展类插件**（hub 内标记「可扩展类 / Hub Extensions」= 官方自研）。

## 架构

```
IM 平台(飞书/企微/钉钉/QQ)                     dsh
┌───────────────────┐   webhook   ┌────────────────────────────┐
│ 事件订阅 / 长连接   │ ──────────► │ ConnectorHub (注册表)        │
│ 消息 → ImMessage   │             │  ├ feishu / wecom / ding…  │
└───────────────────┘             │  ├ 统一事件模型              │
        ▲                          │  └ subscribe(platform, fn)  │
        │ send(chatId, text)      │        │                    │
        └─────────────────────────│ 工具桥接：对话中调用 send()  │
                                  └────────────────────────────┘
```

- **统一抽象** `src/connector.js`：`IMAdapter`（start/stop/send/onMessage）+ `ConnectorHub`（多平台注册表、消息分发）
- **每个平台一个适配器**，实现 `IMAdapter` 即可接入

## 平台支持

| 平台 | 状态 | 通道 | 说明 |
|---|---|---|---|
| **飞书** | ✅ 已实现 | 开放平台事件订阅 + 发消息 API | 官方正规，`src/adapters/feishu.js` |
| **企业微信** | ⏳ 规划 | 企业微信开放 API | 微信官方通道；**个人微信无官方 API，不做** |
| **钉钉** | ⏳ 规划 | 钉钉开放平台 | 官方 API |
| **QQ** | ⏳ 规划 | QQ 开放平台机器人 | 官方 API |
| **Slack** | ⏳ 规划 | Web API | 海外通用 |

## 使用

1. 安装插件（本地安装自动归 hub「自创作/可扩展类」）：
   ```bash
   dsh plugin --profile web add E:/DeepSeek Harness/work/dsh-connector
   ```
2. 配置平台凭据（环境变量，后续接入 hub 设置页）：
   ```bash
   export DSH_CONNECTOR_CONFIG='{"feishu":{"enabled":true,"appId":"cli_xxx","appSecret":"xxx","verifyToken":"xxx","port":8787}}'
   ```
3. 重启 dsh → 日志出现 `飞书适配器已启动`；
4. 在飞书开放平台把事件订阅 URL 配成 `http://<本机>:8787/feishu/event`，给应用发消息即可桥接；
5. 深度集成：会话/其他插件通过 `ctx.imConnector.send(platform, chatId, text)` 发消息回 IM。

## 规划（后续迭代）

- M2：企微 / 钉钉适配器 + 工具注册（对话中直接调用 IM 工具）
- M3：hub 设置页配置平台凭据（不再依赖环境变量）
- M4：消息 → dsh 会话的完整双向路由（IM 里 @机器人 直接和 dsh 对话）
