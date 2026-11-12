import assert from 'node:assert/strict';
import {generate,node} from './helpers/substore.mjs';
const fixture=[node('家宽测试','Plinx-home'),node('家宽VLESS测试','Plinx-home',{type:'vless'}),
  node('US[02]-测试'),node('US[07]-VLESS测试','Plinx-high',{type:'vless'}),node('JP[03]-测试'),
  node('US[04]-Extra测试','Plinx-Extra'),node('US[08]-ExtraVLESS','Plinx-Extra',{type:'vless'}),
  node('剩余流量','Plinx-home',{type:'vless'})];
for(const target of ['ClashMeta','Surge']){
  const surge=target==='Surge';
  for(const withInfo of [true,false])for(const withExtra of [true,false]){
    const nodes=fixture.filter(n=>(withInfo||n.name!=='剩余流量')&&(withExtra||n._subName!=='Plinx-Extra'));
    const {g,config,output}=await generate(target,nodes);
    assert.equal(g.get('🚀 默认代理').proxies[0],'🔯 故障转移');
    assert.equal(g.get('🤖 AI 平台').proxies[0],'🏠 家宽稳定');
    assert.equal(g.get('Claude').proxies[0],'🏠 家宽稳定');
    assert.equal(g.get('📚 学术资源').proxies[0],'🚀 默认代理');
    assert.equal(g.get('📚 机构认证').proxies[0],'✔ ZJU内网');
    assert.equal(g.get('🔐 公共验证').proxies[0],'🤖 AI 平台');
    assert.deepEqual(g.get('♻️ 美国自动').proxies,surge?['US[02]-测试']:['US[02]-测试','US[07]-VLESS测试']);
    assert.deepEqual(g.get('🏠 家宽稳定').proxies,surge?['家宽测试']:['家宽测试','家宽VLESS测试']);
    assert.equal(g.has('🏠 家宽 IPv6'),false);
    assert.equal(g.has('ℹ️ 订阅信息'),withInfo);assert.equal(g.has('🧩 Extra 节点'),withExtra);
    for(const name of ['♻️ 美国自动','♻️ 自动选择','🔯 故障转移','🏠 家宽稳定']){
      assert(!g.get(name).proxies.some(n=>n.includes('Extra')));
      if(!surge){assert.equal(g.get(name).lazy,false);assert.equal(g.get(name).timeout,5000);}
    }
    assert(!g.get('🚀 手动选择').proxies.some(n=>n.includes('Extra')));
    assert.equal(g.has('Ⓜ️ 微软服务'),false);
    if(config){assert(config.proxies.some(n=>n.type==='vless'));assert.equal(config.rules.at(-1),'MATCH,🐟 漏网之鱼');assert.equal(config.profile['store-selected'],true);}
    else{assert(!output.includes('VLESS测试'));assert(output.includes('FINAL,🐟 漏网之鱼'));}
  }
  const highOnly=await generate(target,fixture.filter(n=>n._subName==='Plinx-high'));
  assert.equal(highOnly.g.has('🏠 家宽稳定'),false);
  assert.equal(highOnly.g.get('🤖 AI 平台').proxies[0],'♻️ 美国自动');
  assert.equal(highOnly.g.get('Claude').proxies[0],'🚀 默认代理');
  const homeOnly=await generate(target,fixture.filter(n=>n._subName==='Plinx-home'));
  assert.equal(homeOnly.g.has('🔯 故障转移'),false);
  assert.equal(homeOnly.g.get('🚀 默认代理').proxies[0],'🏠 家宽节点');
  const extraOnly=await generate(target,fixture.filter(n=>n._subName==='Plinx-Extra'));
  assert.equal(extraOnly.g.get('🚀 默认代理').proxies[0],'🧩 Extra 节点');
  await assert.rejects(()=>generate(target,[]),/没有当前客户端支持/);
  console.log(target+': source degradation, automatic defaults, source isolation, compatibility and valid group graph passed');
}
