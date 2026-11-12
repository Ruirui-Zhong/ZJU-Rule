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
