// Offline fixtures: IPv6 entry classification, source isolation and optional fallback groups.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const ini = fs.readFileSync(path.join(root, 'Clash/config/ZJU.ini'), 'utf8');
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
const groupName = '🏠 家宽 IPv6';
const node = (name, source = 'Plinx-home', extra = {}) =>
  ({name, type: 'hysteria2', server:'example.invalid', port:443,
    uuid:'2cae91b3-f85c-433b-88ee-a002b9ed6d61', _subName: source, ...extra});
const base = [node('家宽 IPv4'), node('US[01]', 'Plinx-high')];
const fixture = [
  ...base,
  node('家宽14-VLESS-v6', 'Plinx-home', {type: 'vless'}),
  node('家宽14-Hy2-IPv6'),
  node('家宽字面地址', 'Plinx-home', {server: '2001:db8::1'}),
  node('家宽方括号地址', 'Plinx-home', {server: '[2001:db8::2]'}),
  node('家宽14-v6'), node('家宽14-v6'),
  node('家宽14-v60'),
  node('家宽普通域名', 'Plinx-home', {server: 'v6.example.invalid'}),
  node('US[02]-v6', 'Plinx-high'),
  node('家宽-Extra-v6', 'Plinx-Extra'),
  node('剩余流量-v6'),
];
const utils = {
  yaml: {dump: JSON.stringify},
  produce: nodes => {
    assert(nodes.every(n => n.type === 'hysteria2'));
    return nodes.map(n => `${n.name} = hysteria2, example.invalid, 443, password=test`);
  },
};

for (const filename of ['zju-sub-store.js', 'zju-sub-store-surge.js']) {
  const surge = filename.endsWith('surge.js');
  const script = fs.readFileSync(path.join(root, 'Clash/config', filename), 'utf8');
  const generate = new AsyncFunction('$content', '$files', 'produceArtifact', 'ProxyUtils', script + '\nreturn $content;');
  const run = async (nodes, source = ini) => {
    const output = await generate(source, [], async () => structuredClone(nodes), utils);
    const config = surge ? null : JSON.parse(output);
    const groups = config?.['proxy-groups'] ?? output.split('[Proxy Group]\n')[1].split('[Rule]')[0].trim().split('\n')
      .map(line => {
        const [name, rhs] = line.split(' = ');
        const [type, ...members] = rhs.split(', ');
        return {name, type, proxies: members.filter(m => !/^(interval|tolerance)=/.test(m))};
      });
    const actualNodes = config?.proxies.map(n => n.name) ?? output.split('[Proxy]\n')[1].split('[Proxy Group]')[0]
      .trim().split('\n').map(line => line.split(' = ')[0]);
    const valid = new Set(['DIRECT', 'REJECT', ...groups.map(g => g.name), ...actualNodes]);
    for (const g of groups) {
      assert(g.proxies.length, 'empty group '+g.name);
      for (const member of g.proxies) assert(valid.has(member), 'dangling reference '+member);
    }
    return {groups, g: name => groups.find(g => g.name === name), output};
  };

  const result = await run(fixture);
  const expected = [
    '家宽14-VLESS-v6',
    '家宽14-Hy2-IPv6', '家宽字面地址', '家宽方括号地址', '家宽14-v6', '家宽14-v6 (2)',
  ];
  assert.deepEqual(result.g(groupName).proxies, expected);
  assert.equal(result.g(groupName).type, 'fallback');
  for (const parent of ['🚀 默认代理', '🤖 AI 平台', '🏠 家宽节点', 'Claude'])
    assert(result.g(parent).proxies.includes(groupName), parent+' cannot select IPv6 fallback');
  assert.equal(result.g('🚀 默认代理').proxies[0], '♻️ 自动选择');
  assert.equal(result.g('🤖 AI 平台').proxies[0], '🏠 家宽节点');
  assert.equal(result.g('🏠 家宽节点').proxies[0], '🏠 家宽 IPv6');
  assert.equal(result.g('Claude').proxies[0], '🏠 家宽 IPv6');
  const order = result.groups.map(g => g.name);
  assert.equal(order.indexOf(groupName), order.indexOf('🏠 家宽 IPv4') + 1);
  if (surge) {
    assert(result.output.includes(`${groupName} = fallback, ${expected.join(', ')}, interval=60`));
    assert(result.output.includes('test-timeout = 5'));
  } else {
    assert.equal(result.g(groupName).interval, 60);
    assert.equal(result.g(groupName).timeout, 5000);
    assert.equal(result.g(groupName).lazy, false);
  }

  // Missing IPv6 entrances must not leave empty groups in either target.
  for (const nodes of [base, [...base, node('US[02]-v6', 'Plinx-high'), node('家宽-Extra-v6', 'Plinx-Extra')]]) {
    const absent = await run(nodes);
    assert.equal(absent.g(groupName), undefined);
    assert(absent.groups.every(g => !g.proxies.includes(groupName)));
  }
  const vlessOnly = await run([...base, node('家宽-VLESS-v6', 'Plinx-home', {type: 'vless'})]);
  assert.equal(Boolean(vlessOnly.g(groupName)), true);

  // An INI-defined application can explicitly reference the optional group without phantom members.
  const customINI = ini.replace('custom_proxy_group=🌐 通用服务`select`[]DIRECT',
    'custom_proxy_group=🌐 通用服务`select`[]DIRECT`[]🏠 家宽 IPv6');
  assert((await run(fixture, customINI)).g('🌐 通用服务').proxies.includes(groupName));
  assert(!(await run(base, customINI)).g('🌐 通用服务').proxies.includes(groupName));
  console.log(filename+': IPv6 membership, fallback settings, defaults, format compatibility and empty-group handling passed');
}
