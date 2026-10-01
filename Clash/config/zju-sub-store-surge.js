// Sub-Store 普通文件：远程 ZJU.ini -> Surge 脚本操作。
// 当前 Plinx 的 Surge 输出只保留 Hysteria2（iOS 5.8+ / Mac 5.4+）；VLESS 不输出。
// 手动选节点；不生成自动测速、故障转移或地区组。
const collectionName = 'Plinx';
const sourceCategory = { 'Plinx-home': 'relay', 'Plinx-high': 'high' };
const ownRoot = 'https://raw.githubusercontent.com/Ruirui-Zhong/ZJU-Rule/main/';
const ini = $content ?? $files?.[0];
if (typeof ini !== 'string' || !ini.includes('[custom]')) {
  throw new Error('文件远程来源必须是 Clash/config/ZJU.ini。');
}
const entries = [];
let section = '';
for (const raw of ini.replace(/^\uFEFF/, '').split(/\r?\n/)) {
  const line = raw.trim();
  if (!line || /^[;#]/.test(line)) continue;
  if (line.startsWith('[')) { section = line; continue; }
  if (section !== '[custom]') continue;
  const at = line.indexOf('=');
  if (at < 0) throw new Error('INI 存在无法解析的行');
  entries.push([line.slice(0, at).trim(), line.slice(at + 1).trim()]);
}
const expectedGroups = ['🚀 节点', '🛰️ 中转节点', '⚡ 高速节点', '🤖 AI 平台', 'ℹ️ 订阅信息'];
const definitions = entries.filter(([key]) => key === 'custom_proxy_group').map(([, value]) => value.split('`'));
if (definitions.length !== expectedGroups.length || new Set(definitions.map(parts => parts[0])).size !== expectedGroups.length ||
    definitions.some(([name, type]) => !expectedGroups.includes(name) || type !== 'select')) {
  throw new Error('请使用配套的简化版 ZJU.ini（手动选择组）。');
}
const sourceProxies = await produceArtifact({
  type: 'collection', name: collectionName, platform: 'ClashMeta', produceType: 'internal',
});
if (!Array.isArray(sourceProxies) || !sourceProxies.length) {
  throw new Error(`${collectionName} 没有可输出的节点，请检查组合订阅。`);
}
const notice = /通知|公告|剩余|重置|到期|流量|套餐|更新订阅|无节点可用/;
const proxies = sourceProxies.filter(proxy => !notice.test(proxy.name ?? '') && proxy.type === 'hysteria2')
  .map(proxy => ({ ...proxy }));
const infoProxies = sourceProxies.filter(proxy => notice.test(proxy.name ?? ''))
  .map(proxy => ({ ...proxy, name: `[${proxy._subName ?? '未知订阅'}] ${proxy.name}` }));
const outputProxies = [...proxies, ...infoProxies];
const occupied = new Set(['DIRECT', 'REJECT', ...expectedGroups]);
for (const proxy of outputProxies) {
  if (!proxy.name) throw new Error('订阅节点缺少名称');
  proxy.name = proxy.name.replace(/[=,\r\n"]/g, ' ').trim();
  if (!proxy.name) throw new Error('节点名称无法用于 Surge');
  const original = proxy.name;
  let suffix = 2;
  while (occupied.has(proxy.name)) proxy.name = `${original} (${suffix++})`;
  occupied.add(proxy.name);
}
const relay = [], high = [];
for (const proxy of proxies) {
  const category = sourceCategory[proxy._subName];
  if (category === 'relay') relay.push(proxy.name);
  else if (category === 'high') high.push(proxy.name);
  else throw new Error('发现未知订阅来源，请在 sourceCategory 中登记为 relay 或 high');
}
if (!relay.length || !high.length) throw new Error('中转或高速订阅没有 Surge 可用的 Hysteria2 节点');
const select = (name, members) => ({ name, type: 'select', proxies: members });
const groups = [
  select('🚀 节点', ['🛰️ 中转节点', '⚡ 高速节点']),
  select('🛰️ 中转节点', relay),
  select('⚡ 高速节点', high),
  // 默认跟随常规节点；也可直接选择一个节点，仅供 AI 平台使用。
  select('🤖 AI 平台', ['🚀 节点', ...proxies.map(proxy => proxy.name)]),
  ...(infoProxies.length ? [select('ℹ️ 订阅信息', ['DIRECT', ...infoProxies.map(proxy => proxy.name)])] : []),
];
const policyNames = new Set(['DIRECT', 'REJECT', ...groups.map(group => group.name)]);
const providers = {}, rules = [];
for (const [key, value] of entries) {
  if (key !== 'ruleset') continue;
  const at = value.indexOf(',');
  if (at < 0) throw new Error('ruleset 缺少逗号');
  const policy = value.slice(0, at).trim(), source = value.slice(at + 1).trim();
  if (!policyNames.has(policy) || policy === 'ℹ️ 订阅信息') throw new Error(`规则策略不可用：${policy}`);
  if (source.startsWith('[]')) {
    const inline = source.slice(2);
    if (inline === 'FINAL') rules.push(`MATCH,${policy}`);
    else if (/^GEOIP,[^,]+$/.test(inline)) rules.push(`${inline},${policy}`);
    else if (/^IP-CIDR,[^,]+\/\d+,no-resolve$/.test(inline)) {
      const [, cidr] = inline.split(',');
      rules.push(`IP-CIDR,${cidr},${policy},no-resolve`);
    } else throw new Error(`暂不支持内联规则：${inline}`);
  } else {
    if (!source.startsWith(ownRoot) || !source.endsWith('.list')) throw new Error('仅支持本仓库的 .list 规则源');
    const name = `zju-rule-${Object.keys(providers).length + 1}`;
    providers[name] = { type: 'http', behavior: 'classical', format: 'text', url: source,
      path: `./rule-providers/${name}.list`, interval: 86400 };
    rules.push(`RULE-SET,${name},${policy}`);
  }
}
if (!rules.length || !rules.at(-1).startsWith('MATCH,')) throw new Error('INI 需要以 []FINAL 兜底规则结尾');
for (const proxy of outputProxies) {
  for (const key of Object.keys(proxy)) if (key.startsWith('_')) delete proxy[key];
}
// 原生转换器处理认证、TLS 和端口参数；禁止将不支持的 VLESS 强行改成 VMess。
const proxyLines = ProxyUtils.produce(proxies.map(proxy => ({ ...proxy })), 'Surge', 'internal');
if (!Array.isArray(proxyLines) || proxyLines.length !== proxies.length) {
  throw new Error('有 Hysteria2 节点无法转换为 Surge，请检查日志和客户端版本');
}
const convertedNames = new Set(proxyLines.map(line => line.slice(0, line.indexOf('=')).trim()));
if (proxies.some(proxy => !convertedNames.has(proxy.name))) throw new Error('Surge 转换后的节点名称不一致');
const infoLines = infoProxies.map(proxy => `${proxy.name} = direct`);
const groupLines = groups.map(group => `${group.name} = select, ${group.proxies.join(', ')}`);
const ruleLines = rules.map(rule => {
  if (rule.startsWith('RULE-SET,')) {
    const [, name, policy] = rule.split(',');
    return `RULE-SET,${providers[name].url},${policy}`;
  }
  return rule.startsWith('MATCH,') ? rule.replace(/^MATCH,/, 'FINAL,') : rule;
});
$content = [
  '# ZJU Rule — Surge（Hysteria2 节点；iOS 5.8+ / Mac 5.4+）',
  '[General]', 'loglevel = notify', '',
  '[Proxy]', ...proxyLines, ...infoLines, '',
  '[Proxy Group]', ...groupLines, '',
  '[Rule]', ...ruleLines, '',
].join('\n');
