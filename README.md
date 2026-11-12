# ZJU Rule

基于 [SubConv/ZJU-Rule](https://github.com/SubConv/ZJU-Rule) 和 [ACL4SSR](https://github.com/ACL4SSR/ACL4SSR) 的分流配置，支持校园、家庭和服务器的不同出口需求。

项目按 [CC-BY-SA-4.0](https://creativecommons.org/licenses/by-sa/4.0/deed.zh) 发布。

## 支持功能

- 各地区自动选择、跨地区故障转移、家宽 IPv4/IPv6 自动回退；高速、家宽、Extra 与通知按来源隔离。
- AI 服务覆盖上游明确的 AI 域名及本地补充，Claude 可独立选择自动组。
- 机构认证默认跟随校园出口；普通学术资源、谷歌学术、arXiv 和公共验证分别选择策略。
- 默认显示简洁分组，完整布局恢复微软、OneDrive、苹果、游戏及媒体的独立控制。
- 服务器、家庭、校园预设与个人节点偏好通过参数设置，公共规则不强制所有设备使用同一地址族。
- Clash/Mihomo 与 Surge 共用生成逻辑；原子配置包避免 INI/脚本版本错配；稳定缓存名称避免规则重排时串用缓存。
- Surge Mac 6.12+ / iOS 6+ 配置保留兼容的原生 VLESS 与 Hysteria2；过滤 XHTTP 等不支持的传输，支持家宽 IPv4 VLESS 中转。
- 上游基础规则与社区学术域名持续同步，经过离线回归检查后再发布。

## 使用与维护

推荐使用[原子配置包接入 Sub-Store](Clash/config/SubStore.md)，其中说明了设备预设、简洁/完整布局、来源映射及迁移步骤。

规则结构由 [ZJU.ini](Clash/config/ZJU.ini) 决定；生成器源码位于 [Clash/config/src](Clash/config/src)，修改后运行：

```bash
node scripts/build_substore.mjs
node scripts/validate.mjs
```

基础规则同步范围与本地保留项见 [config/upstream_rules.json](config/upstream_rules.json)，实际同步版本见 [config/upstream-lock.json](config/upstream-lock.json)。学术域名维护见 [SubStore.md](Clash/config/SubStore.md#学术机构认证和公共验证)。

连通性检查通过不保证网站解锁或机构权限，故障切换不能恢复已经中断的连接。公共验证的出口需要与当前业务场景保持一致。
