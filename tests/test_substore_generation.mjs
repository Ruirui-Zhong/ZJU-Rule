// Offline checks for both formats: VLESS, residential auto, and isolated Extra.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
const root=path.resolve(path.dirname(new URL(import.meta.url).pathname),'..');
const ini=fs.readFileSync(path.join(root,'Clash/config/ZJU.ini'),'utf8');
const expected=JSON.parse(fs.readFileSync(path.join(root,'tests/fixtures/group_order.json'),'utf8'));
const AsyncFunction=Object.getPrototypeOf(async function(){}).constructor;
const fixture=[
 {name:'家宽测试',type:'hysteria2',_subName:'Plinx-home'},
 {name:'家宽VLESS测试',type:'vless',_subName:'Plinx-home'},
 {name:'US[02]-测试',type:'hysteria2',_subName:'Plinx-high'},
 {name:'US[07]-VLESS测试',type:'vless',_subName:'Plinx-high'},
 {name:'JP[03]-测试',type:'hysteria2',_subName:'Plinx-high'},
 {name:'US[04]-Extra测试',type:'hysteria2',_subName:'Plinx-Extra'},
 {name:'US[08]-ExtraVLESS',type:'vless',_subName:'Plinx-Extra'},
 {name:'剩余流量',type:'vless',_subName:'Plinx-home'},
];
const utils={yaml:{dump:JSON.stringify},produce:xs=>{assert(xs.every(x=>x.type==='hysteria2'));return xs.map(x=>`${x.name} = hysteria2, example.com, 443, password=test`);}};
for(const file of ['zju-sub-store.js','zju-sub-store-surge.js']){
 const surge=file.endsWith('surge.js');
 const fn=new AsyncFunction('$content','$files','produceArtifact','ProxyUtils',fs.readFileSync(path.join(root,'Clash/config',file),'utf8')+'\nreturn $content;');
 for(const withInfo of [true,false])for(const withExtra of [true,false]){
  const nodes=fixture.filter(x=>(withInfo||x.name!=='剩余流量')&&(withExtra||x._subName!=='Plinx-Extra'));
  const out=await fn(ini,[],async()=>structuredClone(nodes),utils);
  const namesExpected=expected.filter(x=>(withInfo||x!=='ℹ️ 订阅信息')&&(withExtra||x!=='🧩 Extra 节点')&&!['🏠 家宽 IPv6','🇭🇰 香港节点','🇹🇼 台湾节点','🇸🇬 新加坡节点','🇰🇷 韩国节点','🇩🇪 德国节点','🇬🇧 英国节点','🌐 其他高速节点'].includes(x));
  let groups;
  if(!surge){
   const c=JSON.parse(out);groups=c['proxy-groups'];
   assert(c.proxies.some(x=>x.type==='vless'&&x.name==='US[07]-VLESS测试'));
   assert.equal(c.rules.at(-1),'MATCH,🐟 漏网之鱼');
   const names=new Set(['DIRECT','REJECT',...groups.map(x=>x.name),...c.proxies.map(x=>x.name)]);
   for(const g of groups)for(const m of g.proxies)assert(names.has(m));
  }else{
   assert(!out.includes('VLESS测试'));assert(!out.includes('ExtraVLESS'));
   const text=out.split('[Proxy Group]\n')[1].split('[Rule]')[0].trim().split('\n');
   groups=text.map(line=>{const [name,rhs]=line.split(' = ');const [type,...members]=rhs.split(', ');return {name,type,proxies:members.filter(x=>!/^interval=|^tolerance=/.test(x))};});
   assert(out.includes('proxy-test-url = http://www.gstatic.com/generate_204'));
   assert(out.includes('FINAL,🐟 漏网之鱼'));
  }
  assert.deepEqual(groups.map(x=>x.name),namesExpected);
  const g=name=>groups.find(x=>x.name===name);
  assert.deepEqual(g('♻️ 美国自动').proxies,surge?['US[02]-测试']:['US[02]-测试','US[07]-VLESS测试']);
  assert.deepEqual(g('🏠 家宽稳定').proxies,surge?['家宽测试']:['家宽测试','家宽VLESS测试']);
  assert.equal(groups.filter(x=>x.type==='url-test').length,1);
  assert.equal(groups.filter(x=>x.type==='fallback').length,1);
  for(const name of ['♻️ 美国自动','🏠 家宽稳定']){
   assert.equal(g(name).type,name==='♻️ 美国自动'?'url-test':'fallback');
   if(!surge){assert.equal(g(name).interval,300);assert.equal(g(name).lazy,false);}
  }
  assert.equal(g('🏠 家宽节点').proxies[0],'🏠 家宽稳定');
  assert.deepEqual(g('Claude').proxies,surge?['家宽测试']:['家宽测试','家宽VLESS测试']);
  assert.equal(g('🤖 AI 平台').proxies[0],'🏠 家宽稳定');
  assert(g('🤖 AI 平台').proxies.includes('♻️ 美国自动'));
  assert.equal(g('🚀 默认代理').proxies[0],'♻️ 美国自动');
  assert(g('🚀 手动选择').proxies.every(n=>!groups.some(x=>x.name===n)));
  for(const name of ['🤖 AI 平台','🔎 学术搜索','🌍 国外媒体','🐟 漏网之鱼'])assert(g(name).proxies.every(n=>['DIRECT','REJECT'].includes(n)||groups.some(x=>x.name===n)));
  assert(!g('🚀 手动选择').proxies.some(x=>x.includes('Extra')));
  assert(!g('♻️ 美国自动').proxies.some(x=>x.includes('Extra')));
  assert(!g('🏠 家宽稳定').proxies.some(x=>x.includes('Extra')));
  assert.equal(g('⚡ 高速节点'),undefined);
  if(withExtra){assert.deepEqual(g('🧩 Extra 节点').proxies,surge?['US[04]-Extra测试']:['US[04]-Extra测试','US[08]-ExtraVLESS']);assert(g('🤖 AI 平台').proxies.includes('🧩 Extra 节点'));}
  for(const name of ['🔎 学术搜索','🌍 国外媒体','🐟 漏网之鱼'])assert.equal(g(name).proxies[0],'🚀 默认代理');
  assert.equal(g('📚 学术资源').proxies[0],'DIRECT');assert.equal(g('🛑 广告拦截').proxies[0],'REJECT');
 }
 // Missing US stays fail-closed instead of silently using Extra or another region.
 const withoutUS=await fn(ini,[],async()=>structuredClone(fixture.filter(x=>x._subName==='Plinx-Extra'||!x.name.startsWith('US'))),utils);
 if(!surge){const c=JSON.parse(withoutUS);assert.deepEqual(c['proxy-groups'].find(x=>x.name==='♻️ 美国自动').proxies,['REJECT']);}
 else assert(withoutUS.includes('♻️ 美国自动 = select, REJECT'));
 console.log(file+': VLESS compatibility, US/home auto, isolated Extra, optional groups, defaults passed');
}
