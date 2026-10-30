// Offline conversion checks: US-only auto selection and preserved routing/groups.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
const root=path.resolve(path.dirname(new URL(import.meta.url).pathname),'..');
const ini=fs.readFileSync(path.join(root,'Clash/config/ZJU.ini'),'utf8');
const expected=JSON.parse(fs.readFileSync(path.join(root,'tests/fixtures/group_order.json'),'utf8'));
const AsyncFunction=Object.getPrototypeOf(async function(){}).constructor;
const fixture=[
 {name:'家宽测试',type:'hysteria2',_subName:'Plinx-home'},
 {name:'US[02]-测试',type:'hysteria2',_subName:'Plinx-high'},
 {name:'US[04]-测试',type:'hysteria2',_subName:'Plinx-high'},
 {name:'JP[03]-测试',type:'hysteria2',_subName:'Plinx-high'},
 {name:'US[07]-VLESS过滤测试',type:'vless',_subName:'Plinx-high'},
 {name:'剩余流量',type:'vless',_subName:'Plinx-home'},
];
const utils={yaml:{dump:JSON.stringify},produce:xs=>xs.map(x=>`${x.name} = hysteria2, example.com, 443, password=test`)};
for(const file of ['zju-sub-store.js','zju-sub-store-surge.js']){
 const fn=new AsyncFunction('$content','$files','produceArtifact','ProxyUtils',fs.readFileSync(path.join(root,'Clash/config',file),'utf8')+'\nreturn $content;');
 for(const withInfo of [true,false]){
  const nodes=fixture.filter(x=>withInfo||x.name!=='剩余流量');
  const out=await fn(ini,[],async()=>structuredClone(nodes),utils);
  assert(!out.includes('VLESS过滤测试'));
  if(file==='zju-sub-store.js'){
   const c=JSON.parse(out),groups=c['proxy-groups'],g=n=>groups.find(x=>x.name===n);
   assert.deepEqual(groups.map(x=>x.name),expected.filter(x=>withInfo||x!=='ℹ️ 订阅信息'));
   assert.deepEqual(g('♻️ 自动选择').proxies,['US[02]-测试','US[04]-测试']);
   assert.equal(g('♻️ 自动选择').type,'url-test');assert.equal(g('♻️ 自动选择').interval,300);assert.equal(g('♻️ 自动选择').tolerance,100);assert.equal(g('♻️ 自动选择').lazy,false);
   assert.equal(groups.filter(x=>x.type==='url-test').length,1);
   assert.deepEqual(g('🏠 家宽节点').proxies,['家宽测试']);
   assert.deepEqual(g('⚡ 高速节点').proxies,['US[02]-测试','US[04]-测试','JP[03]-测试']);
   assert.equal(g('🚀 手动选择').proxies[0],'♻️ 自动选择');
   assert(g('🚀 手动选择').proxies.includes('家宽测试')&&g('🚀 手动选择').proxies.includes('JP[03]-测试'));
   assert.equal(g('🤖 AI 平台').proxies[0],'🏠 家宽节点');assert(g('🤖 AI 平台').proxies.includes('♻️ 自动选择'));
   assert.equal(g('📚 学术资源').proxies[0],'DIRECT');assert.equal(g('🛑 广告拦截').proxies[0],'REJECT');
   const names=new Set(['DIRECT','REJECT',...groups.map(x=>x.name),...c.proxies.map(x=>x.name)]);
   for(const group of groups)for(const member of group.proxies)assert(names.has(member));
   assert.equal(c.rules.at(-1),'MATCH,🐟 漏网之鱼');
  }else{
   const groups=out.split('[Proxy Group]\n')[1].split('[Rule]')[0].trim().split('\n');
   assert.deepEqual(groups.map(x=>x.split(' = ')[0]),expected.filter(x=>withInfo||x!=='ℹ️ 订阅信息'));
   assert(groups.includes('♻️ 自动选择 = url-test, US[02]-测试, US[04]-测试, interval=300, tolerance=100'));
   assert.equal(groups.filter(x=>x.includes(' = url-test,')).length,1);
   assert(groups.includes('🏠 家宽节点 = select, 家宽测试'));
   assert(out.includes('proxy-test-url = http://www.gstatic.com/generate_204'));
   assert(out.includes('FINAL,🐟 漏网之鱼'));
  }
 }
 await assert.rejects(()=>fn(ini,[],async()=>structuredClone(fixture.filter(x=>!x.name.startsWith('US'))),utils),/没有可用的美国 US 节点/);
 console.log(file+': US-only auto, VLESS filtering, information preservation, manual nodes and routing passed');
}
