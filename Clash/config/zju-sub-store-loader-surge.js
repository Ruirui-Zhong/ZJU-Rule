// Stable loader: the INI and generator arrive together in one versioned payload.
const bundle = JSON.parse($content ?? $files?.[0]);
if (bundle.schema !== 1 || typeof bundle.ini !== 'string' || typeof bundle.core !== 'string') throw new Error('不支持的原子配置包；保留上次有效配置');
const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
$content = await new AsyncFunction('$content','$files','produceArtifact','ProxyUtils','$arguments','$target',bundle.core+'\nreturn $content;')(
  bundle.ini, [], produceArtifact, ProxyUtils, typeof $arguments === 'object' ? $arguments : {}, 'Surge');
