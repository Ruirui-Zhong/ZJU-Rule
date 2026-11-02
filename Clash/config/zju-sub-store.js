// Sub-Store 普通文件：远程 ZJU.ini -> 脚本操作。
// 普通节点用于手动/美国自动，家宽可自动，Extra 独立且不参与自动组。
const collectionName = 'Plinx';
const sourceCategory = { 'Plinx-home': 'residential', 'Plinx-high': 'high', 'Plinx-Extra': 'extra' };
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
// BEGIN REGION DEFINITIONS (kept identical in both standalone scripts)
const regionDefinitions = [
  {code: 'HK', name: '🇭🇰 香港节点', aliases: ['HK', 'HKG'], pattern: /🇭🇰|香港|\bHong[\s_-]*Kong\b|(?:^|[^A-Za-z])(?:HK|HKG)(?=$|[^A-Za-z])/i},
  {code: 'JP', name: '🇯🇵 日本节点', aliases: ['JP', 'JPN'], pattern: /🇯🇵|日本|\bJapan\b|(?:^|[^A-Za-z])(?:JP|JPN)(?=$|[^A-Za-z])/i},
  {code: 'US', name: '🇺🇸 美国节点', aliases: ['US', 'USA'], pattern: /🇺🇸|🇺🇲|美国|美國|\bUnited[\s_-]*States\b|(?:^|[^A-Za-z])(?:US|USA)(?=$|[^A-Za-z])/i},
  {code: 'TW', name: '🇹🇼 台湾节点', aliases: ['TW', 'TWN'], pattern: /🇹🇼|台湾|台灣|\bTaiwan\b|(?:^|[^A-Za-z])(?:TW|TWN)(?=$|[^A-Za-z])/i},
  {code: 'SG', name: '🇸🇬 新加坡节点', aliases: ['SG', 'SGP'], pattern: /🇸🇬|新加坡|狮城|獅城|\bSingapore\b|(?:^|[^A-Za-z])(?:SG|SGP)(?=$|[^A-Za-z])/i},
  {code: 'KR', name: '🇰🇷 韩国节点', aliases: ['KR', 'KOR'], pattern: /🇰🇷|韩国|韓國|\b(?:South[\s_-]*)?Korea\b|(?:^|[^A-Za-z])(?:KR|KOR)(?=$|[^A-Za-z])/i},
  // GM follows this subscription's established naming convention; it is not an ISO code.
  {code: 'DE', name: '🇩🇪 德国节点', aliases: ['DE', 'DEU', 'GM'], pattern: /🇩🇪|德国|德國|\bGermany\b|(?:^|[^A-Za-z])(?:DE|DEU|GM)(?=$|[^A-Za-z])/i},
  {code: 'GB', name: '🇬🇧 英国节点', aliases: ['GB', 'GBR', 'UK'], pattern: /🇬🇧|英国|英國|\b(?:United[\s_-]*Kingdom|Great[\s_-]*Britain)\b|(?:^|[^A-Za-z])(?:GB|GBR|UK)(?=$|[^A-Za-z])/i},
];
const otherRegionName = '🌐 其他高速节点';
const regionGroupNames = [...regionDefinitions.map(region => region.name), otherRegionName];
const arxivGroupName = '📄 arXiv';
const scriptArguments = typeof $arguments === 'object' && $arguments ? $arguments : {};
const preferredNodesByRegion = scriptArguments.preferredNodesByRegion ?? {};
if (!preferredNodesByRegion || typeof preferredNodesByRegion !== 'object' || Array.isArray(preferredNodesByRegion) ||
    Object.values(preferredNodesByRegion).some(value => !Array.isArray(value) || value.some(name => typeof name !== 'string'))) {
  throw new Error('preferredNodesByRegion 必须是地区代码到节点名称数组的映射');
}
function identifyRegion(proxy) {
  // Only explicit country-code metadata is used; never infer from protocol or server IP.
  const countryCode = String(proxy._countryCode ?? proxy.countryCode ?? '').trim().toUpperCase();
  const declared = regionDefinitions.find(region => region.aliases.includes(countryCode));
  if (declared) return declared.code;
  const matches = regionDefinitions.map(region => ({region, match: region.pattern.exec(proxy.name)}))
    .filter(item => item.match).sort((a, b) => a.match.index - b.match.index);
  // If a label mentions multiple countries, use the first country marker.
  return matches[0]?.region.code ?? 'OTHER';
}
function prioritizeNodes(nodes, code) {
  const preferences = preferredNodesByRegion[code] ?? [];
  const baseName = name => name.replace(/\s+\(\d+\)$/, '');
  const score = proxy => {
    for (let i = 0; i < preferences.length; i++) {
      if (proxy.name === preferences[i]) return i * 2;
      if (baseName(proxy.name) === baseName(preferences[i])) return i * 2 + 1;
    }
    return Infinity;
  };
  // Stable sorting preserves subscription order when a personal preference is absent.
  return [...nodes].sort((a, b) => {
    const x = score(a), y = score(b);
    return x === y ? 0 : x - y;
  }).map(proxy => proxy.name);
}
// END REGION DEFINITIONS

const expectedGroups = ['🚀 手动选择', '🏠 家宽节点', '🤖 AI 平台', 'ℹ️ 订阅信息', '♻️ 自动选择', '🏠 自动家宽', '🧩 Extra 节点', ...regionGroupNames, arxivGroupName];
const definitions = entries.filter(([key]) => key === 'custom_proxy_group').map(([, value]) => value.split('`'));
const definedNames = new Set(definitions.map(parts => parts[0]));
if (definedNames.size !== definitions.length || expectedGroups.some(name => !definedNames.has(name)) ||
    definitions.some(([name, type]) => type !== (['♻️ 自动选择', '🏠 自动家宽'].includes(name) ? 'url-test' : 'select'))) {
  throw new Error('INI 需要完整的节点分类组，且策略组名称不可重复。');
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
const residential = [], high = [], extra = [];
const normalProxies = proxies.filter(proxy => sourceCategory[proxy._subName] !== 'extra');
for (const proxy of proxies) {
  const category = sourceCategory[proxy._subName];
  if (category === 'residential') residential.push(proxy.name);
  else if (category === 'high') high.push(proxy.name);
  else if (category === 'extra') extra.push(proxy.name);
  else if (category !== 'other') throw new Error(`发现未知订阅来源 ${proxy._subName}，请在 sourceCategory 中登记为 residential、high、extra 或 other`);
}
if (!residential.length || !high.length) throw new Error('家宽或高速订阅没有可用节点，请检查两个订阅');
const select = (name, members) => ({ name, type: 'select', proxies: members });
const auto = (name, members) => ({
  name, type: 'url-test', proxies: members,
  url: 'http://www.gstatic.com/generate_204', interval: 300, tolerance: 100, lazy: false,
});
// 自动组只使用美国节点；其他地区仍可手动选择。
const usNodes = normalProxies.filter(proxy => /^(?:US(?=\[|[-_\s\d])|美国|美國|🇺🇸|🇺🇲)/i.test(proxy.name)).map(proxy => proxy.name);
// BEGIN REGION GENERATION
// Strict source filtering happens before region detection: residential, Extra and notices never enter.
const highProxies = proxies.filter(proxy => sourceCategory[proxy._subName] === 'high');
const regionBuckets = new Map([...regionDefinitions.map(region => [region.code, []]), ['OTHER', []]]);
for (const proxy of highProxies) regionBuckets.get(identifyRegion(proxy)).push(proxy);
const regionGroups = regionDefinitions.flatMap(region => {
  const members = prioritizeNodes(regionBuckets.get(region.code), region.code);
  return members.length ? [select(region.name, members)] : [];
});
if (regionBuckets.get('OTHER').length) {
  regionGroups.push(select(otherRegionName, prioritizeNodes(regionBuckets.get('OTHER'), 'OTHER')));
}
const availableRegionNames = new Set(regionGroups.map(group => group.name));
const hkRegionName = regionDefinitions.find(region => region.code === 'HK').name;
// No silent cross-region fallback: without HK the initial arXiv policy fails closed.
const arxivMembers = [
  ...(availableRegionNames.has(hkRegionName) ? [hkRegionName] : ['REJECT']),
  ...regionGroups.map(group => group.name).filter(name => name !== hkRegionName),
  'DIRECT',
];
// END REGION GENERATION

const groups = [
  ...(infoProxies.length ? [select('ℹ️ 订阅信息', ['DIRECT', ...infoProxies.map(proxy => proxy.name)])] : []),
  select('🚀 手动选择', ['♻️ 自动选择', ...regionGroups.map(group => group.name), ...normalProxies.map(proxy => proxy.name)]),
  select('🏠 家宽节点', ['🏠 自动家宽', ...residential]),
  ...(usNodes.length ? [auto('♻️ 自动选择', usNodes)] : [select('♻️ 自动选择', ['REJECT'])]),
  ...regionGroups,
  select(arxivGroupName, arxivMembers),
  auto('🏠 自动家宽', residential),
  ...(extra.length ? [select('🧩 Extra 节点', extra)] : []),
  // AI 默认使用家宽组；也可固定到单个节点。
  select('🤖 AI 平台', ['🏠 家宽节点', '♻️ 自动选择', ...(extra.length ? ['🧩 Extra 节点'] : []), ...normalProxies.map(proxy => proxy.name)]),
];
// 校园、通用服务及学术/验证组从 INI 读取，保留独立出口切换。
for (const [name, , ...selectors] of definitions) {
  if (expectedGroups.includes(name)) continue;
  const members = [];
  for (const selector of selectors) {
    if (selector.startsWith('[]')) {
      const member = selector.slice(2);
      if (member === '🧩 Extra 节点' && !extra.length) continue;
      if (regionGroupNames.includes(member) && !availableRegionNames.has(member)) continue;
      if (!definedNames.has(member) && !['DIRECT', 'REJECT'].includes(member)) {
        throw new Error(`应用策略组引用不存在：${member}`);
      }
      members.push(member);
    } else {
      const pattern = new RegExp(selector);
      members.push(...normalProxies.filter(proxy => pattern.test(proxy.name)).map(proxy => proxy.name));
    }
  }
  const selected = [...new Set(members)];
  if (!selected.length) throw new Error(`应用策略组没有可用成员：${name}`);
  groups.push(select(name, selected));
}
// 展示顺序严格遵循 INI，不由特殊分组的构造顺序决定。
const groupOrder = new Map(definitions.map(([name], index) => [name, index]));
groups.sort((a, b) => groupOrder.get(a.name) - groupOrder.get(b.name));
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
