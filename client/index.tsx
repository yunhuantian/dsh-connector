/**
 * dsh-connector 浏览器半边 —— 「设置 → 插件」里的连接器卡片。
 *
 * 与本包 host 半边配对：
 *   host  : ctx.settings.register('dsh-connector', schema)   ← 拥有持久化与校验
 *   client: ctx.settingsScope.bind({ namespace: 'dsh-connector' })  ← 读/写同一命名空间
 *
 * DSH 的 settings 契约允许**仓库外**插件贡献卡片：
 * 「它自己在 Host 注册 settings namespace，自己在浏览器注册该 key 下的卡片，
 *   插件页把两者配对，而不需要知道这个 namespace 的含义。」
 * 所以卡片注册在 keyed 槽 `settings.plugin.item`，key 就是命名空间名。
 *
 * 凭据：appSecret / verifyToken 在 host schema 里是 role('secret')，读路径
 * 永远不会返回它们。因此这里的输入框是**只写**的：留空 = 不修改，
 * 绝不回显、也绝不因为「读不到」而把已存的密钥覆盖掉。
 */
import type { ReactNode } from 'react'
import { useCallback, useEffect, useState } from 'react'

/** 注册到 DSH 设置文档的命名空间（与 host 的 src/settings.js 一致）。 */
const NS = 'dsh-connector'

/** 插件页按这个 key 派发卡片。 */
const SLOT = 'settings.plugin.item'

/**
 * 服务依赖 —— 这是 **cordis fiber 的 inject 表**，必须列全所有要用到的服务。
 *
 * ⚠️ 别把 `package.json` 的 `dsh.client.inject` 当成这里用。那个字段是
 *    **包依赖图**（决定哪些 client bundle 先加载），会被写成 web boot graph
 *    行的 `inject`，**不进 fiber 的 inject 表**。实测 0.1.5-rc.3：
 *      graph 行 inject = 5 个包名；fiber inject = 这里的数组。
 *    所以少了谁，`ctx.<谁>` 就在运行时抛
 *    `cannot get property "<谁>" without inject`。
 *
 * locale 由 @deepseek-ai/dsh-client-locale（DSH 核心包，immediately: true）
 * 注册为 cordis 服务，写在这里就能合法取用。
 * 官方同构写法：dsh-client-ui-settings-plugins 的 inject 就含 "locale"。
 */
export const inject = ['slots', 'settingsScope', 'locale']

const zh: Record<string, string> = {
  'card.title': '连接器（IM 桥接）',
  'card.desc': '把飞书等 IM 的消息接入 dsh 会话，并在对话里直接回复。保存后立即重连生效。',
  'card.unavailable': '设置命名空间不可用（宿主未注册该插件）。',
  'card.readonlyDoc': '当前部署的设置文档不可写，只能查看。',
  'feishu': '飞书（Feishu / Lark）',
  'feishu.enabled': '启用',
  'feishu.mode': '事件接收方式',
  'feishu.mode.ws': '长连接（推荐，无需公网地址）',
  'feishu.mode.webhook': '回调地址（需要公网 HTTPS）',
  'feishu.appId': 'App ID',
  'feishu.appSecret': 'App Secret',
  'feishu.appSecret.hint': '已保存的密钥不会回显；留空表示不修改。',
  'feishu.verifyToken': 'Verify Token',
  'feishu.port': '监听端口',
  'feishu.allowUsers': '允许的用户 open_id（每行一个）',
  'feishu.allowUsers.hint': '留空 = 不限制。建议填写，避免同事的消息直接驱动 Agent。',
  'feishu.requireMention': '群聊中必须 @机器人',
  'global.readOnly': '只读模式',
  'global.readOnly.hint': '开启后连接器不会向 IM 发送任何消息（只收不发）。',
  'save': '保存',
  'discard': '放弃修改',
  'saving': '保存中…',
  'saved': '已保存',
  'failed': '保存失败',
  'dirty': '有未保存的修改',
  'loading': '加载中…',
}

const en: Record<string, string> = {
  'card.title': 'Connectors (IM bridge)',
  'card.desc': 'Bridge Feishu and other IM platforms into dsh sessions and reply from conversations. Reconnects as soon as you save.',
  'card.unavailable': 'Settings namespace unavailable (the owning plugin is not composed).',
  'card.readonlyDoc': 'This deployment keeps the settings document read-only; view only.',
  'feishu': 'Feishu / Lark',
  'feishu.enabled': 'Enabled',
  'feishu.mode': 'Event intake',
  'feishu.mode.ws': 'Long connection (recommended, no public address)',
  'feishu.mode.webhook': 'Callback URL (needs public HTTPS)',
  'feishu.appId': 'App ID',
  'feishu.appSecret': 'App Secret',
  'feishu.appSecret.hint': 'A stored secret is never echoed; leave blank to keep it.',
  'feishu.verifyToken': 'Verify Token',
  'feishu.port': 'Listen port',
  'feishu.allowUsers': 'Allowed open_ids (one per line)',
  'feishu.allowUsers.hint': 'Blank = unrestricted. Fill it in so colleagues’ messages cannot drive the agent.',
  'feishu.requireMention': 'Require @mention in groups',
  'global.readOnly': 'Read-only mode',
  'global.readOnly.hint': 'When on, the connector never sends messages to IM (receive-only).',
  'save': 'Save',
  'discard': 'Discard',
  'saving': 'Saving…',
  'saved': 'Saved',
  'failed': 'Save failed',
  'dirty': 'Unsaved changes',
  'loading': 'Loading…',
}

/** 命名空间段（与 host schema 对应；secret 字段读不到，故不在读模型里）。 */
interface FeishuSection {
  enabled?: boolean
  mode?: string
  appId?: string
  appSecret?: string
  verifyToken?: string
  port?: number
  allowUsers?: string[]
  requireMention?: boolean
}
interface ConnectorSection {
  feishu?: FeishuSection
  readOnly?: boolean
}

/** 草稿：全部按字符串暂存，保存时再按类型解析。 */
interface Draft {
  feishuEnabled: boolean
  feishuMode: string
  feishuAppId: string
  feishuAppSecret: string
  feishuVerifyToken: string
  feishuPort: string
  feishuAllowUsers: string
  feishuRequireMention: boolean
  readOnly: boolean
}

const EMPTY_DRAFT: Draft = {
  feishuEnabled: false,
  feishuMode: 'ws',
  feishuAppId: '',
  feishuAppSecret: '',
  feishuVerifyToken: '',
  feishuPort: '8787',
  feishuAllowUsers: '',
  feishuRequireMention: true,
  readOnly: false,
}

/** 从命名空间快照的已解析值填充草稿。 */
function draftOf(value: ConnectorSection | undefined): Draft {
  const f = value?.feishu ?? {}
  return {
    feishuEnabled: f.enabled === true,
    feishuMode: f.mode === 'webhook' ? 'webhook' : 'ws',
    feishuAppId: String(f.appId ?? ''),
    // secret 读不到，永远是空串：空 = 不修改
    feishuAppSecret: '',
    feishuVerifyToken: '',
    feishuPort: String(f.port ?? 8787),
    feishuAllowUsers: (f.allowUsers ?? []).join('\n'),
    feishuRequireMention: f.requireMention !== false,
    readOnly: value?.readOnly === true,
  }
}

/**
 * 连接器设置卡片。
 *
 * 只用一个 `mutate` 写回所有改动：DSH 的 settings 写是带修订号栅栏的
 * 原子操作，逐字段 set 会把一次编辑拆成多次写入；再加 secret 字段只写不读，
 * 逐字段写也无法安全地「跳过未改动的密钥」。
 */
function ConnectorCard({ scope, t }: { scope: any; t: (k: string) => string }): ReactNode {
  const snapshot = useScopeSnapshot(scope)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const value = snapshot?.value as ConnectorSection | undefined

  // 快照到达 / 外部变更后重新播种草稿；正在保存时不覆盖用户的输入。
  useEffect(() => {
    if (saving) return
    setDraft(draftOf(value))
  }, [value?.feishu?.appId, value?.feishu?.enabled, value?.feishu?.mode, value?.feishu?.port, value?.feishu?.requireMention, value?.readOnly, value?.feishu?.allowUsers?.join(','), saving])

  const status = snapshot?.status
  const writable = snapshot?.writable === true

  const save = useCallback(async () => {
    if (!draft || !scope) return
    setSaving(true)
    setError(null)
    try {
      const ops: Array<{ op: 'set' | 'unset'; path: string[]; value?: unknown }> = []
      const set = (path: string[], v: unknown) => ops.push({ op: 'set', path, value: v })

      set(['feishu', 'enabled'], draft.feishuEnabled)
      set(['feishu', 'mode'], draft.feishuMode === 'webhook' ? 'webhook' : 'ws')
      set(['feishu', 'appId'], draft.feishuAppId.trim())
      set(['feishu', 'requireMention'], draft.feishuRequireMention)
      set(['feishu', 'port'], Number(draft.feishuPort || 8787))
      set(['feishu', 'allowUsers'], draft.feishuAllowUsers.split('\n').map((s) => s.trim()).filter(Boolean))
      set(['readOnly'], draft.readOnly)

      // 密钥只在用户真的输入了才写 —— 留空绝不下发，避免把已存密钥抹成空串。
      if (draft.feishuAppSecret.trim()) set(['feishu', 'appSecret'], draft.feishuAppSecret.trim())
      if (draft.feishuVerifyToken.trim()) set(['feishu', 'verifyToken'], draft.feishuVerifyToken.trim())

      await scope.mutate(ops, snapshot?.revision)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSaving(false)
    }
  }, [draft, scope, snapshot?.revision])

  if (status === 'loading') return <div className="conn-card"><p className="conn-hint">{t('loading')}</p></div>
  if (status === 'unavailable') return <div className="conn-card"><p className="conn-hint">{t('card.unavailable')}</p></div>
  if (!draft) return null

  const d = draft
  const field = (label: string, node: ReactNode, hint?: string) => (
    <div className="conn-row">
      <label className="conn-label">{label}</label>
      <div className="conn-control">
        {node}
        {hint && <p className="conn-hint">{hint}</p>}
      </div>
    </div>
  )

  return (
    <div className="conn-card">
      {/* 标题由外层 CardShell 的 h4.conn-title 负责；这里只放状态徽标，
          别再重复渲染 t('card.title')，否则卡片上会连出现两次同名标题。 */}
      {saving && (
        <div className="conn-head">
          <span className="conn-chip">{t('saving')}</span>
        </div>
      )}
      <p className="conn-hint">{t('card.desc')}</p>
      {!writable && <p className="conn-warn">{t('card.readonlyDoc')}</p>}
      {error && <p className="conn-error">{t('failed')}: {error}</p>}

      <fieldset className="conn-group" disabled={!writable || saving}>
        <legend>{t('feishu')}</legend>

        {field(t('feishu.enabled'),
          <input type="checkbox" checked={d.feishuEnabled}
            onChange={(e) => setDraft({ ...d, feishuEnabled: e.target.checked })} />)}

        {field(t('feishu.mode'),
          <select className="conn-input" value={d.feishuMode}
            onChange={(e) => setDraft({ ...d, feishuMode: e.target.value })}>
            <option value="ws">{t('feishu.mode.ws')}</option>
            <option value="webhook">{t('feishu.mode.webhook')}</option>
          </select>)}

        {field(t('feishu.appId'),
          <input className="conn-input" value={d.feishuAppId} placeholder="cli_xxxxxxxxxxxx"
            onChange={(e) => setDraft({ ...d, feishuAppId: e.target.value })} />)}

        {field(t('feishu.appSecret'),
          <input className="conn-input" type="password" value={d.feishuAppSecret} placeholder="••••••••"
            onChange={(e) => setDraft({ ...d, feishuAppSecret: e.target.value })} />,
          t('feishu.appSecret.hint'))}

        {d.feishuMode === 'webhook' && field(t('feishu.verifyToken'),
          <input className="conn-input" type="password" value={d.feishuVerifyToken} placeholder="••••••••"
            onChange={(e) => setDraft({ ...d, feishuVerifyToken: e.target.value })} />)}

        {d.feishuMode === 'webhook' && field(t('feishu.port'),
          <input className="conn-input conn-num" type="number" min={1} max={65535} value={d.feishuPort}
            onChange={(e) => setDraft({ ...d, feishuPort: e.target.value })} />)}

        {field(t('feishu.allowUsers'),
          <textarea className="conn-input conn-area" rows={3} value={d.feishuAllowUsers}
            onChange={(e) => setDraft({ ...d, feishuAllowUsers: e.target.value })} />,
          t('feishu.allowUsers.hint'))}

        {field(t('feishu.requireMention'),
          <input type="checkbox" checked={d.feishuRequireMention}
            onChange={(e) => setDraft({ ...d, feishuRequireMention: e.target.checked })} />)}
      </fieldset>

      <fieldset className="conn-group" disabled={!writable || saving}>
        <legend>{t('global.readOnly')}</legend>
        <div className="conn-row">
          <input type="checkbox" checked={d.readOnly}
            onChange={(e) => setDraft({ ...d, readOnly: e.target.checked })} />
          <span className="conn-hint">{t('global.readOnly.hint')}</span>
        </div>
      </fieldset>

      <div className="conn-actions">
        <button type="button" className="conn-btn conn-btn-primary"
          disabled={!writable || saving} onClick={() => void save()}>{t('save')}</button>
        <button type="button" className="conn-btn"
          disabled={saving} onClick={() => setDraft(draftOf(value))}>{t('discard')}</button>
      </div>
    </div>
  )
}

/** 订阅一个设置命名空间的快照（DSH 的 scope 只暴露 subscribe/getSnapshot）。 */
function useScopeSnapshot(scope: any): any {
  const [snap, setSnap] = useState<any>(() => scope?.getSnapshot?.())
  useEffect(() => {
    if (!scope) return
    setSnap(scope.getSnapshot())
    return scope.subscribe(() => setSnap(scope.getSnapshot()))
  }, [scope])
  return snap
}

/**
 * 卡片外壳：keyed 槽的 owner props 为空、父级不下发 chrome，所以标题得插件自绘。
 * 描述与表单由 ConnectorCard 负责 —— 两边只画各自那一半，别重复渲染标题。
 */
function CardShell({ t, children }: { t: (k: string) => string; children: ReactNode }): ReactNode {
  return (
    <section className="conn-section">
      <h4 className="conn-title">🔌 {t('card.title')}</h4>
      {children}
    </section>
  )
}

/**
 * 挂载卡片：绑定命名空间 → 等槽声明 → 注册到 settings.plugin.item。
 *
 * ⚠️ 两个必须遵守的契约（都踩过，且失败表现都是「静默无卡片」）：
 *
 * 1) `settings.plugin.item` 是**声明式槽**，自己不能凭空注册。
 *    它的声明挂在官方插件 dsh-client-ui-settings-plugins 那个 tab 条目的
 *    `children` 表上：`children: { "settings.plugin.item": { kind:"keyed", scope:"root" } }`。
 *    插件加载顺序早于该 tab 时直接 `register()` 会抛
 *    `slot "settings.plugin.item" is not declared (a parent entry's children
 *     table must declare it)`，而这句抛在 inject 回调里**不会**让 fiber 失败，
 *    所以页面既不报错也不出卡片，极难排查。
 *    正确姿势是 `slots.inject(SLOT, () => slots.register(...))`：它的回调
 *    在声明就绪时（已存在 → 立即；尚未 → 声明提交后）执行。
 *
 * 2) locale 必须写进本模块导出的 `inject`（见文件上方），不能只写在
 *    package.json 的 `dsh.client.inject` 里。
 */
export async function apply(ctx: any): Promise<() => Promise<void>> {
  const disposers: Array<() => void> = []
  const feature = ctx.inject(['slots', 'settingsScope'], (scope: any) => {
    const t = ctx.locale.bind(NS)
    // 绑定本插件自己的命名空间；作用域随本 fiber 生命周期回收。
    // 入参是 SettingsScopeSpec 对象 { namespace }，保持对象形态。
    const bound = scope.settingsScope.bind({ namespace: NS })
    // slots.inject 返回的 disposer 同时负责「取消等待」和「撤下已生效的贡献」，
    // 所以这里 push 的是它，而不是里层 register 的返回值。
    disposers.push(scope.slots.inject(SLOT, () => scope.slots.register({
      name: SLOT,
      key: NS,
    }, () => <CardShell t={t}><ConnectorCard scope={bound} t={t} /></CardShell>)))
  })

  // 双参形态 register(ns, {zh, en})：一次注册全部内置语言。
  // ⚠️ 别改成单参数组 register([ns, zh, en]) —— 第二参必须是「locale → 字典」
  //    的映射（非字符串时走 Object.entries），传数组会把 ns 吞掉并炸在
  //    Object.entries(undefined) 上。
  // 包 try：同一 (ns, locale) 二次注册会 throw，热重载时容易撞上；
  // 字典注册失败只该退回内嵌 zh，不该让整个插件加载失败。
  let disposeLocale: (() => void) | undefined
  try {
    disposeLocale = ctx.locale.register(NS, { zh, en })
  } catch (e) {
    console.warn('[dsh-connector] locale 字典注册失败，退回内嵌 zh：', (e as Error)?.message ?? e)
  }

  return async () => {
    for (const d of disposers) { try { d() } catch { /* 已释放 */ } }
    try { await feature?.dispose?.() } catch { /* 已释放 */ }
    try { disposeLocale?.() } catch { /* 已释放 */ }
  }
}

export default { apply, inject }
