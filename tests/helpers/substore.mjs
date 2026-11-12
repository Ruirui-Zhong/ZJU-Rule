import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
export const root = path.resolve(path.dirname(new URL(import.meta.url).pathname),'../..');
export const ini = fs.readFileSync(root+'/Clash/config/ZJU.ini','utf8');
const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
const utils = {yaml:{dump:JSON.stringify},produce:xs=>{
  assert(xs.every(x=>x.type==='hysteria2'));
  return xs.map(x=>`${x.name} = hysteria2, example.invalid, 443, password=test`);
}};
export const node = (name,source='Plinx-high',extra={})=>({name,type:'hysteria2',_subName:source,...extra});
export function parseSurge(output) {
  return output.split('[Proxy Group]\n')[1].split('[Rule]')[0].trim().split('\n').map(line=>{
    const [name,rhs]=line.split(' = ');const [type,...parts]=rhs.split(', ');
    return {name,type,proxies:parts.filter(x=>!/^(interval|tolerance)=/.test(x))};
  });
}
export async function generate(target,nodes,args={},source=ini,loader=false) {
  const suffix=target==='Surge'?'-surge':'';
  const script=fs.readFileSync(`${root}/Clash/config/zju-sub-store${loader?'-loader':''}${suffix}.js`,'utf8');
  const fn=new AsyncFunction('$content','$files','produceArtifact','ProxyUtils','$arguments',script+'\nreturn $content;');
  const content=loader?fs.readFileSync(root+'/Clash/config/substore-bundle.json','utf8'):source;
  const output=await fn(content,[],async()=>structuredClone(nodes),utils,args);
  const config=target==='Surge'?null:JSON.parse(output);
  const groups=config?.['proxy-groups']??parseSurge(output);
  const g=new Map(groups.map(x=>[x.name,x]));assert.equal(g.size,groups.length);
  const names=new Set(['DIRECT','REJECT',...g.keys(),...(config?.proxies.map(x=>x.name)??output.split('[Proxy]\n')[1].split('[Proxy Group]')[0].trim().split('\n').map(x=>x.split(' = ')[0]))]);
  for(const group of groups){
    assert(group.proxies.length,'empty '+group.name);
    for(const member of group.proxies)assert(names.has(member),'missing '+member);
    const visit=(name,seen=new Set())=>{assert(!seen.has(name),'cycle '+name);for(const m of g.get(name)?.proxies??[])if(g.has(m))visit(m,new Set([...seen,name]));};visit(group.name);
  }
  return {output,config,groups,g};
}
