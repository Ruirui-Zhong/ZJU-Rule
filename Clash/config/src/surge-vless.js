// Native Surge Mac 6.12+ / iOS 6+ VLESS. Keep this independent of Sub-Store's older producer.
// https://manual.nssurge.com/policies/vless.html
function surgeVlessUnsupported(proxy) {
  const network = proxy.network || 'tcp';
  if (!['tcp', 'raw', 'ws', 'grpc'].includes(network)) return 'transport';
  if (proxy.encryption && proxy.encryption !== 'none') return 'encryption';
  const reality = proxy['reality-opts'];
  const secure = proxy.tls === true || Boolean(reality);
  if (network === 'ws' && (reality || proxy['ws-opts']?.['v2ray-http-upgrade'] ||
      Number(proxy['ws-opts']?.['max-early-data'] || 0) > 0)) return 'websocket options';
  if (network === 'grpc' && !secure) return 'grpc without TLS';
  if (network === 'grpc' && proxy['grpc-opts']?.['grpc-mode'] &&
      !['gun','multi'].includes(proxy['grpc-opts']['grpc-mode'])) return 'grpc mode';
  if (proxy.flow && (!['xtls-rprx-vision', 'xtls-rprx-vision-udp443'].includes(proxy.flow) ||
      !['tcp', 'raw'].includes(network) || !secure)) return 'flow';
  if (proxy.smux?.enabled) return 'multiplexing';
  if (proxy['packet-encoding'] && proxy['packet-encoding'] !== 'xudp') return 'UDP encoding';
  return '';
}
function surgeVlessValue(value, field) {
  const text = String(value);
  // Do not interpolate untrusted lines or ambiguous quote escapes into a Surge profile.
  if (/[\x00-\x1f"\\]/.test(text)) throw new Error('VLESS 参数无法安全转换：'+field);
  return /[\s,;#=|]/.test(text) || text === '' ? '"'+text+'"' : text;
}
function surgeVlessLine(proxy) {
  if (surgeVlessUnsupported(proxy)) throw new Error('无法转换不受支持的 VLESS 参数组合');
  if (!proxy.server || !proxy.uuid || !Number.isInteger(Number(proxy.port)) ||
      Number(proxy.port) < 1 || Number(proxy.port) > 65535) throw new Error('VLESS 节点缺少有效地址、端口或用户 ID');
  const parts = ['vless', surgeVlessValue(proxy.server, 'server'), String(Number(proxy.port))];
  const add = (key, value) => {if (value !== undefined && value !== null) parts.push(key+'='+surgeVlessValue(value, key));};
  add('username', proxy.uuid);
  const network = proxy.network || 'tcp', reality = proxy['reality-opts'];
  if (proxy.tls || reality) add('tls', true);
  add('sni', proxy.servername ?? proxy.sni);
  add('flow', proxy.flow || undefined);
  if (reality) {
    if (!reality['public-key']) throw new Error('REALITY 节点缺少公钥');
    add('reality-public-key', reality['public-key']);
    add('reality-short-id', reality['short-id']);
  } else {
    add('skip-cert-verify', proxy['skip-cert-verify']);
    add('server-cert-fingerprint-sha256', proxy['tls-fingerprint']);
  }
  if (proxy.alpn) add('alpn', Array.isArray(proxy.alpn) ? proxy.alpn.join(',') : proxy.alpn);
  if (network === 'ws') {
    if (proxy['ws-opts']?.path && !proxy['ws-opts'].path.startsWith('/')) throw new Error('WebSocket 路径必须以 / 开头');
    add('ws', true);add('ws-path', proxy['ws-opts']?.path);
    const headers = Object.entries(proxy['ws-opts']?.headers ?? {});
    if (headers.some(([key, value]) => /[|:\r\n]/.test(key) || /[|\r\n]/.test(String(value))))
      throw new Error('WebSocket 请求头无法安全转换');
    if (headers.length) add('ws-headers', headers.map(([key,value])=>key+':'+value).join('|'));
  }
  if (network === 'grpc') {
    add('grpc', true);
    for (const key of ['grpc-service-name','grpc-mode','grpc-authority']) add(key, proxy['grpc-opts']?.[key]);
  }
  add('tfo', proxy.tfo);
  add('interface', proxy['interface-name']);
  const ipVersions = {ipv4:'v4-only', ipv6:'v6-only', 'ipv4-prefer':'prefer-v4', 'ipv6-prefer':'prefer-v6'};
  if (proxy['ip-version']) add('ip-version', ipVersions[proxy['ip-version']] ?? proxy['ip-version']);
  add('underlying-proxy', proxy['dialer-proxy'] ?? proxy['underlying-proxy']);
  return proxy.name+' = '+parts.join(', ');
}
