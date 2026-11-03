// No network or secrets: execute both standalone file generators with synthetic source metadata.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
const root=path.resolve(path.dirname(new URL(import.meta.url).pathname),'..');
const ini=fs.readFileSync(path.join(root,'Clash/config/ZJU.ini'),'utf8');
const AsyncFunction=Object.getPrototypeOf(async function(){}).constructor;
const regions=['🇭🇰 香港节点','🇯🇵 日本节点','🇺🇸 美国节点','🇹🇼 台湾节点','🇸🇬 新加坡节点','🇰🇷 韩国节点','🇩🇪 德国节点','🇬🇧 英国节点','🌐 其他高速节点'];
const node=(name,source='Plinx-high',extra={})=>({name,type:'hysteria2',_subName:source,...extra});
const fixture=[
 node('家宽入口','Plinx-home'),node('HK[00]-家宽','Plinx-home'),
 node('HK[01]-测试'),node('HK[02]-测试'),
 node('HK[02]-测试'),node('香港-测试'),node('Hong Kong-02 (2)'),node('🇭🇰 HK[09]'),node('[高速] HKG 10'),
 node('HK[11]-JP备用'),node('JP[01]'),node('日本 东京 (2)'),node('Japan-03'),
 node('US[01]'),node('美国 洛杉矶'),node('USA-03'),node('🇺🇸 US[04]'),
 node('TW[01]'),node('SG[01]'),node('KR[01]'),node('GM[01]'),node('DE-02'),node('UK[01]'),node('GB[02]'),
 node('自动线路A'),node('USABILITY-线路'),
 node('US[88]-显式元数据','Plinx-high',{countryCode:'HK'}),
 node('HK[99]-Extra','Plinx-Extra'),node('US[99]-Extra','Plinx-Extra'),
 node('香港剩余流量','Plinx-high'),node('HK[12]-VLESS','Plinx-high',{type:'vless'}),
];
const utils={yaml:{dump:JSON.stringify},produce:xs=>xs.map(x=>`${x.name} = hysteria2, example.com, 443, password=test`)};
function parseSurge(text){
 const lines=text.split('[Proxy Group]\n')[1].split('[Rule]')[0].trim().split('\n');
 return lines.map(line=>{const [name,rhs]=line.split(' = ');const [type,...members]=rhs.split(', ');return {name,type,proxies:members.filter(x=>!/^interval=|^tolerance=/.test(x))};});
}
for(const file of ['zju-sub-store.js','zju-sub-store-surge.js']){
 const script=fs.readFileSync(path.join(root,'Clash/config',file),'utf8');
 const fn=new AsyncFunction('$content','$files','produceArtifact','ProxyUtils','$arguments',script+'\nreturn $content;');
 const run=async(nodes=fixture,args={},source=ini)=>{
  const output=await fn(source,[],async()=>structuredClone(nodes),utils,args);
  const config=file.endsWith('surge.js')?null:JSON.parse(output);
  const groups=config?.['proxy-groups']??parseSurge(output);
  const g=new Map(groups.map(x=>[x.name,x]));
  assert.equal(g.size,groups.length);
  for(const group of groups){assert(group.proxies.length);const walk=(name,seen=new Set())=>{assert(!seen.has(name),'cycle '+name);for(const m of g.get(name)?.proxies??[])if(g.has(m))walk(m,new Set([...seen,name]));};walk(group.name);}
  return {g,config,output};
 };
 const {g,config,output}=await run(fixture,{preferredNodesByRegion:{HK:['HK[02]-测试']}});
 assert.equal(g.get('📄 arXiv').proxies[0],'🇭🇰 香港节点');
 assert.equal(g.get('🇭🇰 香港节点').proxies[0],'HK[02]-测试');
 assert(g.get('🇭🇰 香港节点').proxies.includes('HK[02]-测试 (2)'));
 assert(g.get('🇭🇰 香港节点').proxies.includes('US[88]-显式元数据'));
 assert(g.get('🇭🇰 香港节点').proxies.includes('HK[11]-JP备用'));
 assert(!g.get('🇯🇵 日本节点').proxies.includes('HK[11]-JP备用'));
 const members=regions.flatMap(name=>g.get(name)?.proxies??[]);
 assert.equal(new Set(members).size,members.length,'each high proxy belongs to exactly one region');
 assert(!members.some(n=>/家宽|Extra|流量/.test(n)));
 assert.deepEqual(g.get('🌐 其他高速节点').proxies,['自动线路A','USABILITY-线路']);
 assert(!g.get('🇺🇸 美国节点').proxies.includes('US[88]-显式元数据'));
 for(const name of regions){assert(g.has(name));assert.equal(g.get(name).type,'select');assert(g.get('🚀 默认代理').proxies.includes(name));}
 assert(g.get('📄 arXiv').proxies.includes('DIRECT'));
 assert.equal(g.get('♻️ 美国自动').type,'url-test');
 assert.equal(g.get('🤖 AI 平台').proxies[0],'🏠 家宽稳定');
 assert.equal(g.get('📚 学术资源').proxies[0],'DIRECT');
 if(config){
  const key=Object.keys(config['rule-providers']).find(k=>config['rule-providers'][k].url.endsWith('/Arxiv.list'));
  const at=config.rules.indexOf(`RULE-SET,${key},📄 arXiv`);
  assert(at>=0);assert(config.rules.slice(at+1).some(r=>r.endsWith(',📚 学术资源')));
 }else assert(output.includes('RULE-SET,https://raw.githubusercontent.com/Ruirui-Zhong/ZJU-Rule/main/Clash/Arxiv.list,📄 arXiv'));
 // Missing preferred node remains in HK, and stale preferences never create phantom members.
 const missingPreferred=await run(fixture,{preferredNodesByRegion:{HK:['missing-node']}});
 assert.equal(missingPreferred.g.get('🇭🇰 香港节点').proxies[0],'HK[01]-测试');
 // Missing HK omits the empty group and explicitly rejects arXiv; other regions/DIRECT require manual selection.
 const noHK=fixture.filter(p=>p._subName!=='Plinx-high'||(!/HK|HKG|香港|Hong Kong/.test(p.name)&&p.countryCode!=='HK'));
 const absent=await run(noHK);
 assert(!absent.g.has('🇭🇰 香港节点'));assert.equal(absent.g.get('📄 arXiv').proxies[0],'REJECT');
 assert(!absent.g.get('🚀 默认代理').proxies.includes('🇭🇰 香港节点'));
 // A country with no nodes and unknown buckets with no nodes are omitted, without broken references.
 const sparse=await run([node('家宽','Plinx-home'),node('US[01]')]);
 assert(!sparse.g.has('🇯🇵 日本节点'));assert(!sparse.g.has('🌐 其他高速节点'));
 // No US node must not silently select a different region for the legacy US automatic entry.
 const noUS=await run([node('家宽','Plinx-home'),node('HK[01]')]);
 assert.deepEqual(noUS.g.get('♻️ 美国自动').proxies,['REJECT']);
 await assert.rejects(()=>run(fixture,{preferredNodesByRegion:{HK:'not-an-array'}}),/preferredNodesByRegion/);
 const cycleINI=ini.replace('custom_proxy_group=🌐 通用服务`select`[]DIRECT','custom_proxy_group=🌐 通用服务`select`[]🌐 通用服务');
 await assert.rejects(()=>run(fixture,{},cycleINI),/循环引用/);
 const badINI=ini.replace('custom_proxy_group=🌐 通用服务`select`[]DIRECT','custom_proxy_group=🌐 通用服务`select`[]不存在的组');
 await assert.rejects(()=>run(fixture,{},badINI),/引用不存在/);
 console.log(file+': region/source isolation, aliases, duplicates, preferences, missing regions, arXiv chain, cycles passed');
}
