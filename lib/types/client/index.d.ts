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
export declare const inject: string[];
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
export declare function apply(ctx: any): Promise<() => Promise<void>>;
declare const _default: {
    apply: typeof apply;
    inject: string[];
};
export default _default;
