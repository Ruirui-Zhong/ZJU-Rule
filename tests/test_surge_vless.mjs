import assert from 'node:assert/strict';
import {generate,node} from './helpers/substore.mjs';
const key='dwrjY6KiAMPxKdlF7T4AWFXXBtsxeHCXtBQYeCOdZV4';
const v=(name,extra={})=>node(name,'Plinx-home',{type:'vless',...extra});
const reality={tls:true,servername:'www.microsoft.com','reality-opts':{'public-key':key,'short-id':'0123456789abcdef'}};
const supported=[
 v('家宽 REALITY',{...reality,flow:'xtls-rprx-vision','client-fingerprint':'chrome','skip-cert-verify':true}),
 v('家宽 TLS Vision',{tls:true,flow:'xtls-rprx-vision-udp443','skip-cert-verify':false,alpn:['h2','http/1.1']}),
 v('家宽 WS',{network:'ws',tls:true,'ws-opts':{path:'/vless?token=a,b',headers:{Host:'cdn.example.invalid','X-Token':'abc'}}}),
 v('家宽 gRPC',{network:'grpc',tls:true,'grpc-opts':{'grpc-service-name':'service','grpc-mode':'multi','grpc-authority':'authority.example'}}),
 v('家宽 gRPC REALITY',{...reality,network:'grpc'}),v('家宽 RAW'),
 v('家宽-v6',{...reality,server:'2001:db8::1'}),node('HK[02]'),
];
const unsupported=[v('家宽 XHTTP',{network:'xhttp'}),v('家宽 HTTPUpgrade',{network:'httpupgrade'}),
 v('家宽 加密',{encryption:'mlkem768x25519plus.test'}),v('家宽 WS REALITY',{...reality,network:'ws'}),
 v('家宽 grpc-plain',{network:'grpc'}),v('家宽 WS Vision',{network:'ws',tls:true,flow:'xtls-rprx-vision'}),
 v('家宽 Vision plain',{flow:'xtls-rprx-vision'}),v('家宽 mux',{smux:{enabled:true}}),
 v('家宽 WS-upgrade',{network:'ws','ws-opts':{'v2ray-http-upgrade':true}}),
 v('家宽 grpc-mode',{network:'grpc',tls:true,'grpc-opts':{'grpc-mode':'unknown'}})];
const out=await generate('Surge',[...supported,...unsupported],{profile:'home',residentialIPv4Relay:['HK[02]']});
// Tokenize quoted commas independently of the generator and verify fields against Surge's manual.
const lines=out.output.split('[Proxy]\n')[1].split('[Proxy Group]')[0].trim().split('\n');
const parsed=new Map(lines.map(line=>{
 const at=line.indexOf(' = ');const tokens=line.slice(at+3).match(/(?:[^,"]|"[^"]*")+/g).map(s=>s.trim());
 const values=Object.fromEntries(tokens.slice(3).map(token=>{const at=token.indexOf('=');let value=token.slice(at+1);if(value.startsWith('"'))value=value.slice(1,-1);return[token.slice(0,at),value];}));
 return[line.slice(0,at),{type:tokens[0],server:tokens[1],port:tokens[2],...values}];
}));
assert.equal(parsed.size,supported.length);
for(const p of unsupported)assert(!parsed.has(p.name));
for(const p of supported.filter(p=>p.type==='vless')){
 assert.equal(parsed.get(p.name).username,p.uuid);
 if(!p.name.endsWith('-v6'))assert.equal(parsed.get(p.name)['underlying-proxy'],'🔗 家宽中转');
}
assert.equal(parsed.get('家宽 REALITY')['reality-public-key'],key);
assert.equal(parsed.get('家宽 REALITY')['reality-short-id'],'0123456789abcdef');
assert.equal(parsed.get('家宽 REALITY').flow,'xtls-rprx-vision');
assert.equal(parsed.get('家宽 REALITY').sni,'www.microsoft.com');
assert(!('skip-cert-verify'in parsed.get('家宽 REALITY')));
assert(!out.output.includes('client-fingerprint='));
assert.equal(parsed.get('家宽 TLS Vision')['skip-cert-verify'],'false');
assert.equal(parsed.get('家宽 TLS Vision').alpn,'h2,http/1.1');
assert.equal(parsed.get('家宽 WS')['ws-path'],'/vless?token=a,b');
assert.equal(parsed.get('家宽 WS')['ws-headers'],'Host:cdn.example.invalid|X-Token:abc');
assert.equal(parsed.get('家宽 gRPC')['grpc-service-name'],'service');
assert.equal(parsed.get('家宽 gRPC')['grpc-mode'],'multi');
assert.equal(parsed.get('家宽 gRPC')['grpc-authority'],'authority.example');
assert.equal(parsed.get('家宽 gRPC REALITY')['reality-public-key'],key);
assert.equal(parsed.get('家宽-v6').server,'2001:db8::1');
assert(!('underlying-proxy'in parsed.get('家宽-v6')));
assert.equal(out.g.get('🤖 AI 平台').proxies[0],'🏠 家宽 IPv4');
assert.equal((await generate('Surge',[...supported,...unsupported],{profile:'home',residentialIPv4Relay:['HK[02]']},undefined,true)).output,out.output);
await assert.rejects(()=>generate('Surge',unsupported),/没有当前客户端支持/);
for(const bad of [v('bad',{uuid:''}),v('bad',{port:0}),v('bad',{...reality,'reality-opts':{}}),
 v('bad',{network:'ws','ws-opts':{path:'/ok\n[Rule]'}})])
 await assert.rejects(()=>generate('Surge',[bad]),/缺少|安全转换/);
await assert.rejects(()=>generate('Surge',[v('bad',{'dialer-proxy':'missing'})]),/中转引用不存在/);
console.log('Surge native VLESS: REALITY/Vision, TLS, WS, gRPC, unsupported filters, relay mapping and safe serialization passed');
