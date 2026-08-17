/**
 * 自测 — connector 抽象 + 飞书适配器核心逻辑（URL 校验/消息解析）。
 * 运行: node scripts/smoke.mjs（无需真实凭据，mock fetch 与事件）
 */
import assert from 'node:assert/strict'
import { createHub, ImMessage, ConnectorError } from '../src/connector.js'
import { FeishuAdapter } from '../src/adapters/feishu.js'

let passed = 0
const ok = (name) => { passed++; console.log(`  ✅ ${name}`) }

// 1) ConnectorHub 注册/订阅/分发
{
  console.log('· ConnectorHub 桥接')
  const hub = createHub()
  const fake = { onMessage: null }
  fake.onMessage = (fn) => { fake._fn = fn }
  fake.send = async (chatId, text) => ({ chatId, text })
  fake.start = async () => { fake.running = true }
  fake.stop = async () => {}
  hub.register('fake', fake)
  const received = []
  const unsub = hub.subscribe('fake', (m) => received.push(m))
  fake._fn(new ImMessage({ platform: 'fake', chatId: 'c1', text: 'hi' }))
  assert.equal(received.length, 1)
  assert.equal(received[0].text, 'hi')
  unsub()
  fake._fn(new ImMessage({ platform: 'fake', chatId: 'c2', text: 'x' }))
  assert.equal(received.length, 1) // 退订后不再收到
  ok('注册/订阅/退订/分发')
}

// 2) FeishuAdapter: URL 校验 challenge
{
  console.log('· 飞书 URL 校验')
  const ad = new FeishuAdapter({ appId: 'a', appSecret: 's' })
  let body = ''
  const res = { writeHead: (c, h) => { body = JSON.stringify({ code: c, h }) }, end: (s) => { body = s } }
  ad._handleEvent(JSON.stringify({ type: 'url_verification', challenge: 'abc123' }), res)
  assert.equal(JSON.parse(body).challenge, 'abc123')
  ok('url_verification 返回 challenge')
}

// 3) FeishuAdapter: 消息事件 → ImMessage
{
  console.log('· 飞书消息事件解析')
  const ad = new FeishuAdapter({ appId: 'a', appSecret: 's', verifyToken: 'vt' })
  let got = null
  ad.onMessage((m) => { got = m })
  let body = ''
  const res = { writeHead: (c) => { body = String(c) }, end: (s) => { body = String(s) } }
  const event = {
    header: { event_type: 'im.message.receive_v1', token: 'vt' },
    event: {
      chat_id: 'oc_test123',
      sender: { sender_id: { open_id: 'ou_open456' } },
      message: { content: JSON.stringify({ text: '你好 dsh' }) },
    },
  }
  ad._handleEvent(JSON.stringify(event), res)
  assert.equal(got.platform, 'feishu')
  assert.equal(got.chatId, 'oc_test123')
  assert.equal(got.text, '你好 dsh')
  ok('消息事件 → ImMessage(text 解析)')
}

// 4) FeishuAdapter: verifyToken 不符拒绝
{
  console.log('· 飞书 token 校验')
  const ad = new FeishuAdapter({ appId: 'a', appSecret: 's', verifyToken: 'vt' })
  let status = 0
  const res = { writeHead: (c) => { status = c }, end: () => {} }
  ad._handleEvent(JSON.stringify({ header: { event_type: 'im.message.receive_v1', token: 'WRONG' } }), res)
  assert.equal(status, 403)
  ok('错误 verify token 返回 403')
}

// 5) FeishuAdapter: send 走 mock fetch
{
  console.log('· 飞书发消息（mock fetch）')
  const origFetch = globalThis.fetch
  let calls = []
  globalThis.fetch = async (url, opts) => {
    calls.push({ url, opts })
    if (url.includes('tenant_access_token')) return { json: async () => ({ code: 0, tenant_access_token: 'tok1', expire: 7200 }) }
    return { json: async () => ({ code: 0, data: { message_id: 'm1' } }) }
  }
  try {
    const ad = new FeishuAdapter({ appId: 'a', appSecret: 's' })
    const r = await ad.send('oc_x', 'hello')
    assert.equal(r.data.message_id, 'm1')
    assert.equal(calls.length, 2) // token + 发消息
    assert.equal(JSON.parse(calls[1].opts.body).msg_type, 'text')
    ok('send() token 获取 + 消息创建')
  } finally {
    globalThis.fetch = origFetch
  }
}

// 6) 无配置启动报错
{
  console.log('· 缺配置保护')
  const ad = new FeishuAdapter({})
  let err = null
  try { await ad.start() } catch (e) { err = e }
  assert.ok(err instanceof ConnectorError)
  ok('缺少 appId/appSecret 时明确报错')
}

console.log(`\n[dsh-connector] smoke: ${passed}/6 通过`)
