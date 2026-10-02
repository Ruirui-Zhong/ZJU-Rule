// Sub-Store 普通文件：远程 ZJU.ini -> 脚本操作。
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
const expectedGroups = ['🚀 手动节点', '🛰️ 中转节点', '⚡ 高速节点', '🤖 AI 平台', 'ℹ️ 订阅信息'];
const definitions = entries.filter(([key]) => key === 'custom_proxy_group').map(([, value]) => value.split('`'));
const definedNames = new Set(definitions.map(parts => parts[0]));
if (definedNames.size !== definitions.length || expectedGroups.some(name => !definedNames.has(name)) ||
    definitions.some(([, type]) => type !== 'select')) {
  throw new Error('INI 需要完整的手动节点组，且策略组名称不可重复。');
}
const sourceProxies = await produceArtifact({
  type: 'collection', name: collectionName, platform: 'ClashMeta', produceType: 'internal',
});
if (!Array.isArray(sourceProxies) || !sourceProxies.length) {
  throw new Error(`${collectionName} 没有可输出的节点，请检查组合订阅。`);
}
const notice = /通知|公告|剩余|重置|到期|流量|套餐|更新订阅|无节点可用/;
const proxies = sourceProxies.filter(proxy => !notice.test(proxy.name ?? '')).map(proxy => ({ ...proxy }));
const infoProxies = sourceProxies.filter(proxy => notice.test(proxy.name ?? ''))
  .map(proxy => ({ ...proxy, name: `[${proxy._subName ?? '未知订阅'}] ${proxy.name}` }));
const outputProxies = [...proxies, ...infoProxies];
const occupied = new Set(['DIRECT', 'REJECT', ...definedNames]);
for (const proxy of outputProxies) {
  if (!proxy.name) throw new Error('订阅节点缺少名称');
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
if (!relay.length || !high.length) throw new Error('中转或高速订阅没有可用节点，请检查两个订阅');
const select = (name, members) => ({ name, type: 'select', proxies: members });
const groups = [
  select('🚀 手动节点', proxies.map(proxy => proxy.name)),
  select('🛰️ 中转节点', relay),
  select('⚡ 高速节点', high),
  // 默认跟随常规节点；也可直接选择一个节点，仅供 AI 平台使用。
  select('🤖 AI 平台', ['🚀 手动节点', ...proxies.map(proxy => proxy.name)]),
  ...(infoProxies.length ? [select('ℹ️ 订阅信息', ['DIRECT', ...infoProxies.map(proxy => proxy.name)])] : []),
];
// 应用策略组从 INI 读取，保留默认顺序及校园/音乐专用节点匹配。
for (const [name, , ...selectors] of definitions) {
  if (expectedGroups.includes(name)) continue;
  const members = [];
  for (const selector of selectors) {
    if (selector.startsWith('[]')) {
      const member = selector.slice(2);
      if (!definedNames.has(member) && !['DIRECT', 'REJECT'].includes(member)) {
        throw new Error(`应用策略组引用不存在：${member}`);
      }
      members.push(member);
    } else {
      const pattern = new RegExp(selector);
      members.push(...proxies.filter(proxy => pattern.test(proxy.name)).map(proxy => proxy.name));
    }
  }
  const selected = [...new Set(members)];
  if (!selected.length) throw new Error(`应用策略组没有可用成员：${name}`);
  groups.push(select(name, selected));
}
const outputNames = new Set(['DIRECT', 'REJECT', ...outputProxies.map(proxy => proxy.name), ...groups.map(group => group.name)]);
for (const group of groups) {
  for (const member of group.proxies) if (!outputNames.has(member)) throw new Error(`输出策略引用不存在：${member}`);
}
function visitGroup(name, path = new Set()) {
  if (path.has(name)) throw new Error(`策略组循环引用：${name}`);
  const group = groups.find(item => item.name === name);
  if (!group) return;
  for (const member of group.proxies) visitGroup(member, new Set([...path, name]));
}
for (const group of groups) visitGroup(group.name);
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
$content = ProxyUtils.yaml.dump({
  'mixed-port': 7890, 'allow-lan': false, mode: 'rule', 'log-level': 'info',
  proxies: outputProxies, 'proxy-groups': groups, 'rule-providers': providers, rules,
});
