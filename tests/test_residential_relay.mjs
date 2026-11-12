import assert from 'node:assert/strict';
import {generate,node} from './helpers/substore.mjs';
const nodes=[node('家宽 IPv4','Plinx-home',{type:'vless'}),
  node('家宽-v6','Plinx-home',{type:'vless'}),node('家宽 Hy2','Plinx-home'),
  node('HK[02]'),node('US[14]-v6'),node('Extra','Plinx-Extra')];
const args={profile:'server',residentialIPv4Relay:['missing','HK[02]','US[14]-v6','HK[02]','Extra']};
const {config,g}=await generate('ClashMeta',nodes,args);
assert.deepEqual(g.get('🔗 家宽中转').proxies,['HK[02]','US[14]-v6']);
assert.equal(g.get('🔗 家宽中转').type,'fallback');
assert.equal(config.proxies.find(p=>p.name==='家宽 IPv4')['dialer-proxy'],'🔗 家宽中转');
for(const name of ['家宽-v6','家宽 Hy2','HK[02]','US[14]-v6','Extra'])
  assert.equal(config.proxies.find(p=>p.name===name)['dialer-proxy'],undefined);
assert(!g.has('🏠 家宽稳定'));
assert.equal(g.get('🤖 AI 平台').proxies[0],'🏠 家宽 IPv6');
assert.equal(g.get('Claude').proxies[0],'🏠 家宽 IPv6');
assert(!g.get('🏠 家宽 IPv6').proxies.some(name=>config.proxies.find(p=>p.name===name)?.['dialer-proxy']),
  'IPv6 selection must never use residential IPv4 relay targets');
assert.equal((await generate('ClashMeta',nodes,args,undefined,true)).output,JSON.stringify(config));
const home=await generate('ClashMeta',nodes,{profile:'home'});
assert(!home.g.has('🔗 家宽中转'));
assert.equal(home.config.proxies.find(p=>p.name==='家宽 IPv4')['dialer-proxy'],undefined);
for(const subset of [nodes.filter(p=>p._subName!=='Plinx-high'),nodes.filter(p=>p._subName!=='Plinx-home')]){
  const partial=await generate('ClashMeta',subset,args);
  assert(!partial.g.has('🔗 家宽中转'),'missing source must not introduce dangling dialer references');
}
const existing=await generate('ClashMeta',nodes.map(p=>p.name==='家宽 IPv4'?{...p,'dialer-proxy':'DIRECT'}:p),args);
assert.equal(existing.config.proxies.find(p=>p.name==='家宽 IPv4')['dialer-proxy'],'DIRECT');
assert(!existing.g.has('🔗 家宽中转'));
const surge=await generate('Surge',nodes,args);
assert.deepEqual(surge.g.get('🔗 家宽中转').proxies,['HK[02]','US[14]-v6']);
const line=name=>surge.output.split('\n').find(line=>line.startsWith(name+' = vless,'));
assert(line('家宽 IPv4').includes('underlying-proxy='));
assert(!line('家宽-v6').includes('underlying-proxy='));
assert(!surge.output.includes('dialer-proxy='));
await assert.rejects(()=>generate('ClashMeta',nodes,{residentialIPv4Relay:'HK[02]'}),/必须是高速中转节点名称数组/);
await assert.rejects(()=>generate('ClashMeta',[...nodes,node('🔗 家宽中转')],args),/名称.*冲突/);
console.log('Residential relay: independent high-speed hops, IPv6-first failover, opt-in and partial sources passed');
