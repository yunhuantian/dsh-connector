/**
 * 打包 dsh-connector 的浏览器半边。
 *
 * 与 dsh-plugin-hub 的构建脚本同构：esbuild 把 src 打成一个 CommonJS 体，
 * 只把**外壳种子表里提供**的模块保留为 external，其余全部内联；
 * 再包进 `window.__ModuleLoader__.load({ id, factory })` 交给 web 外壳的
 * 客户端模块系统（每个 dsh client bundle 都是这个形状）。
 *
 * ⚠️ EXTERNALS 必须落在当前 web 外壳的种子表内 —— 表外的名字在浏览器端
 *    require 时会直接抛（client-modules: require("...") missed the module
 *    table）。种子表由前端 `dsh-web-frontend` 的 boot 代码提供，实测：
 *      0.1.2-rc.1 → 8 个（react / react-dom 系列 / cordis / dsh-client-store /
 *                   dsh-client-ui-slots / dsh-client-ui-primitives）
 *      0.1.5-rc.3 → 9 个（上面 + @deepseek-ai/dsh-client-ui-dockkit）
 *    **注意**：跨插件协作（services、locale、slots 契约）一律走 cordis 服务，
 *    不要把对方的 client 包写成 external —— 它不在种子表里，且在语义上你
 *    拿到的会是宿主单例之外的第二份实例。
 */
import { build } from 'esbuild'
import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const entry = join(root, 'client', 'index.tsx')
const outBody = join(root, 'dist', 'client-body.js')
const outFile = join(root, 'lib', 'client.js')
const outMap = join(root, 'lib', 'client.js.map')
const cssFile = join(root, 'client', 'card.css')

/** 外壳种子表内的模块 —— 只有这些可以留作 external。 */
const EXTERNALS = [
  'react',
  'react/jsx-runtime',
  'react-dom',
  'react-dom/client',
  '@deepseek-ai/cordis',
  '@deepseek-ai/dsh-client-store',
  '@deepseek-ai/dsh-client-ui-slots',
  '@deepseek-ai/dsh-client-ui-primitives',
]

const PLUGIN_ID = 'dsh-connector'

async function main() {
  rmSync(join(root, 'dist'), { recursive: true, force: true })
  mkdirSync(dirname(outFile), { recursive: true })

  await build({
    entryPoints: [entry],
    bundle: true,
    format: 'cjs',
    platform: 'browser',
    target: ['es2020'],
    jsx: 'automatic',
    outfile: outBody,
    external: EXTERNALS,
    sourcemap: true,
    minify: false,
    logLevel: 'info',
  })

  const body = readFileSync(outBody, 'utf8')
  const map = readFileSync(`${outBody}.map`, 'utf8')
  writeFileSync(outMap, map)

  // 样式随 bundle 一起注入：bundle 是自包含的，不能假设宿主会加载额外 css 文件。
  const css = JSON.stringify(readFileSync(cssFile, 'utf8'))
  const styleInjection = `\t\tif (typeof document !== 'undefined' && !document.querySelector('style[data-dsh-connector-css]')) {
\t\t\tvar s = document.createElement('style');
\t\t\ts.setAttribute('data-dsh-connector-css', '');
\t\t\ts.textContent = ${css};
\t\t\tdocument.head.appendChild(s);
\t\t}
`

  const wrapped = `window.__ModuleLoader__.load({
\tid: ${JSON.stringify(PLUGIN_ID)},
\tfactory: (require) => {
\t\tvar module = { exports: {} };
\t\tvar exports = module.exports;
${indent(styleInjection, 0)}${indent(body, 2)}
\t\treturn module.exports;
\t}
});

//# sourceMappingURL=client.js.map
`

  writeFileSync(outFile, wrapped)
  try { rmSync(join(root, 'dist'), { recursive: true, force: true }) } catch { /* 非致命 */ }
  console.log(`client bundle written: ${outFile} (${wrapped.length} bytes)`)
}

function indent(text, level) {
  const pad = '\t'.repeat(level)
  return text.split('\n').map((line) => (line ? pad + line : line)).join('\n')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
