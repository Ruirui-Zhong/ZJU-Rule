import fs from 'node:fs';
import assert from 'node:assert/strict';
import {generate,node,ini,root} from './helpers/substore.mjs';
const nodes=[node('家宽-v6','Plinx-home'),node('家宽普通','Plinx-home'),node('HK[01]'),node('US[01]'),node('JP[01]')];
for(const target of ['ClashMeta','Surge']){
  const changed=ini.replace('custom_proxy_group=🤖 AI 平台`select`[]🏠 家宽节点','custom_proxy_group=🤖 AI 平台`select`[]🏠 家宽 IPv6');
  assert.equal((await generate(target,nodes,{},changed)).g.get('🤖 AI 平台').proxies[0],'🏠 家宽 IPv6');
  const legacy=fs.readFileSync(root+'/tests/fixtures/legacy.ZJU.ini','utf8');
  assert((await generate(target,nodes,{},legacy)).g.has('🤖 AI 平台'),'new generator accepts old INI');
  const server=await generate(target,nodes,{profile:'server'});
  assert.equal(server.g.get('🤖 AI 平台').proxies[0],'🏠 家宽 IPv6');
  assert.equal(server.g.get('Claude').proxies[0],'🏠 家宽 IPv6');
  assert(!server.g.has('🏠 家宽稳定'));
  const home=await generate(target,nodes,{profile:'home'});
  assert.equal(home.g.get('🤖 AI 平台').proxies[0],'🏠 家宽 IPv4');
  const campus=await generate(target,nodes,{profile:'campus'});
  assert.equal(campus.g.get('📚 学术资源').proxies[0],'DIRECT');
  assert.equal(campus.g.get('🔐 公共验证').proxies[0],'📚 学术资源');
  const manual=await generate(target,nodes,{defaultSelections:{'🤖 AI 平台':'🚀 默认代理'}});
  assert.equal(manual.g.get('🤖 AI 平台').proxies[0],'🚀 默认代理');
  const stale=await generate(target,nodes,{defaultSelections:{'🤖 AI 平台':'expired-node'}});
  assert.equal(stale.g.get('🤖 AI 平台').proxies[0],'🏠 家宽节点');
  const full=await generate(target,nodes,{layout:'full'});
  for(const name of ['Ⓜ️ 微软服务','Ⓜ️ 微软云盘','🍎 苹果服务','🎮 游戏平台','🎥 奈飞视频'])assert(full.g.has(name));
  const loaded=await generate(target,nodes,{profile:'server'},ini,true);
  assert.equal(loaded.output,server.output,'atomic bundle is identical to standalone generation');
  const oneCompatible=await generate(target,[node('家宽-v6','Plinx-home'),node('US[01]','Plinx-high',{type:'vless'})]);
  assert.notEqual(oneCompatible.g.get('🚀 默认代理').proxies[0],'REJECT');
  await assert.rejects(()=>generate(target,nodes,{profile:'typo'}),/未知设备预设/);
  const collision=ini.replace('compact_group=Ⓜ️ 微软服务`🌐 通用服务','compact_group=Ⓜ️ 微软服务`Ⓜ️ 微软服务');
  await assert.rejects(()=>generate(target,nodes,{},collision),/循环引用/);
  if(target==='ClashMeta'){
    const original=(await generate(target,nodes)).config;
    const reordered=ini.split('\n').map(l=>l.endsWith('/Clash/ProxyPriority.list')?'':l).join('\n')
      .replace('[custom]','[custom]\nruleset=🚀 默认代理,https://raw.githubusercontent.com/Ruirui-Zhong/ZJU-Rule/main/Clash/ProxyPriority.list');
    const byURL=c=>Object.fromEntries(Object.entries(c['rule-providers']).map(([name,p])=>[p.url,{name,path:p.path}]));
    assert.deepEqual(byURL((await generate(target,nodes,{},reordered)).config),byURL(original));
    const inserted=ini.replace('[custom]','[custom]\nruleset=🚀 默认代理,https://raw.githubusercontent.com/Ruirui-Zhong/ZJU-Rule/main/Clash/ExtraFixture.list');
    const third=byURL((await generate(target,nodes,{},inserted)).config);
    for(const [url,value]of Object.entries(byURL(original)))assert.deepEqual(third[url],value);
    const mixed=await generate(target,[...nodes,node('US[99]-家宽','Plinx-home'),node('US[88]-香港','Plinx-high',{countryCode:'HK'})]);
    assert.deepEqual(mixed.g.get('♻️ 美国自动').proxies,['US[01]']);
  }
  console.log(target+': INI authority, legacy compatibility, profiles, layouts, atomic rollout and stable caches passed');
}
