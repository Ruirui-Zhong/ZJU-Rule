// 离线执行两端转换器，验证分组和策略引用；不请求真实订阅。
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
const root=path.resolve(path.dirname(new URL(import.meta.url).pathname),'..');
const ini=fs.readFileSync(path.join(root,'Clash/config/ZJU.ini'),'utf8');
const AsyncFunction=Object.getPrototypeOf(async function(){}).constructor;
const expected=JSON.parse(fs.readFileSync(path.join(root,'tests/fixtures/group_order.json'),'utf8'));
const fixture=[
 {name:'家宽测试',type:'hysteria2',_subName:'Plinx-home'},
 {name:'JP[03]-测试',type:'hysteria2',_subName:'Plinx-high'},
 {name:'剩余流量',type:'hysteria2',_subName:'Plinx-home'},
];
for(const file of ['zju-sub-store.js','zju-sub-store-surge.js']){
 const fn=new AsyncFunction('$content','$files','produceArtifact','ProxyUtils',fs.readFileSync(path.join(root,'Clash/config',file),'utf8')+'\nreturn $content;');
 const utils={yaml:{dump:o=>JSON.stringify(o)},produce:xs=>xs.map(x=>`${x.name} = hysteria2, example.com, 443, password=test`)};
 for(const withInfo of [true,false]){
  const nodes=fixture.filter(x=>withInfo||x.name!=='剩余流量');
  const output=await fn(ini,[],async()=>structuredClone(nodes),utils);
  if(file==='zju-sub-store.js'){
   const cfg=JSON.parse(output),groups=cfg['proxy-groups'];
   assert.deepEqual(groups.map(x=>x.name),expected.filter(x=>withInfo||x!=='ℹ️ 订阅信息'));
   const group=n=>groups.find(x=>x.name===n);
   assert.deepEqual(group('🚀 节点选择').proxies,['⚡ 高速节点','家宽测试','JP[03]-测试']);
   assert.deepEqual(group('🏠 家宽节点').proxies,['家宽测试']);
   assert.deepEqual(group('⚡ 高速节点').proxies,['JP[03]-测试']);
   assert.equal(group('📚 学术资源').proxies[0],'DIRECT');
   assert.equal(group('🔎 学术搜索').proxies[0],'⚡ 高速节点');
   assert.equal(cfg.rules.at(-1),'MATCH,🐟 漏网之鱼');
   assert.equal(group('🛑 广告拦截').proxies[0],'REJECT');
   assert.equal(group('🛡️ 隐私防护').proxies[0],'REJECT');
   assert.equal(group('🤖 AI 平台').proxies[0],'🏠 家宽节点');
  }else{
   const groupText=output.split('[Proxy Group]\n')[1].split('[Rule]')[0];
   const groups=groupText.trim().split('\n');
   assert.equal(groups.length,withInfo?16:15);
   assert(groups.includes('🚀 节点选择 = select, ⚡ 高速节点, 家宽测试, JP[03]-测试'));
   assert(output.includes('FINAL,🐟 漏网之鱼'));
   assert.deepEqual(groups.map(x=>x.split(' = ')[0]),expected.filter(x=>withInfo||x!=='ℹ️ 订阅信息'));
   assert(output.includes('✔ ZJU内网 = select, DIRECT, 🚀 节点选择'));
   assert(output.includes('🌐 通用服务 = select, DIRECT, 🚀 节点选择'));
  }
 }
 console.log(file+': 有/无订阅信息的精简分组、默认策略与引用检查通过');
}
