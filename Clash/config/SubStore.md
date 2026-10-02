# Sub-Store 接入 ZJU Rule

## 配置

1. 创建组合订阅 `Plinx`，包含 `Plinx-home`（中转）和 `Plinx-high`（高速）。如订阅名称不同，修改脚本顶部 `collectionName` 和 `sourceCategory`。
2. 新建普通“文件”（不是“mihomo 配置”），名称 `ZJU-Plinx`，来源“远程”：

   ```text
   https://raw.githubusercontent.com/Ruirui-Zhong/ZJU-Rule/main/Clash/config/ZJU.ini
   ```

3. 添加脚本操作，粘贴同目录 `zju-sub-store.js` 的全部内容，或使用远程脚本：

   ```text
   https://raw.githubusercontent.com/Ruirui-Zhong/ZJU-Rule/main/Clash/config/zju-sub-store.js
   ```

4. 即时预览并保存，将完整配置下载链接导入客户端。升级旧版本时，需要同时更新 INI 和脚本，可禁用远程缓存后预览。

## 手动选择

- `🚀 手动节点` 直接列出所有可用中转和高速节点，选择实际节点即可。`🛰️ 中转节点` 和 `⚡ 高速节点` 另保留分类选择，不设置自动、故障转移、负载均衡或地区子组。
- `🤖 AI 平台` 默认跟随 `🚀 手动节点`，也可以直接选择独立节点，供 AI 平台使用，不改变一般代理流量的节点选择。
- AI 域名统一维护在 `Clash/AIPlatforms.list`，继承原 OpenAI/ChatBot 的全部域名规则，并保留新增的 Claude、Gemini API 域名。
- 保留 ZJU 内网、学术、电报、视频、媒体、微软、苹果、游戏、广告和漏网之鱼等应用策略组，规则顺序和各组默认选择继承原配置。只将原 ChatBot 改为 AI 平台；应用组可以单独选择 DIRECT 或节点分类。移除的地区/自动组引用改为高速或主节点组。
- `ℹ️ 订阅信息` 单独显示带来源标签的流量、重置及到期条目，不参与分流和测速；两个套餐不合并计算，更新配置后刷新。客户端顶部流量统计由响应头决定，脚本不改写响应头。
- 当前家宽专用中转节点仍归中转，不单独生成家宽组。普通 INI 供 subconverter 使用时按名称匹配；Sub-Store 脚本按订阅来源分类。
- `proxies` 是必需的节点清单，`proxy-groups` 才是客户端选择分组；同名节点追加编号，内部来源字段不输出。

## 直连与更新

- 第一条内联规则 `IP-CIDR,100.101.106.44/32,DIRECT,no-resolve` 保证访问这台 Tailscale 服务器时走直连。客户端需要处于规则模式且连接 Tailscale；它不会自动启动 Tailscale。
- ResearchGate 主站及子域名由 `ResearchDirect.list` 优先直连。其余规则顺序保留在 `ZJU.ini`。
- `.list` 对应的 YAML Provider 可运行 `python3 update_providers.py` 同步；Mihomo 规则集每 86400 秒更新。
- 初次导入可先临时关闭系统代理，获取新版订阅后切回规则模式；若电脑使用另一份配置，需要在那份配置顶部也加入服务器直连规则。
- 脚本只适配本仓库的简化 INI，不执行全部 subconverter 选项。端口、DNS、TUN、控制接口和密钥通过客户端配置或 Clash for Linux 的 Mixin 管理。
- 两端都需要能获取远程规则；直连规则决定路由，不保证网站在当前网络中可达。
- 不要将订阅 URL、节点凭据或控制接口密钥提交到仓库。

## Surge 客户端

Mihomo YAML 不能作为完整 Surge 配置导入。单独新建文件 `ZJU-Plinx-Surge`，远程来源仍用同一个 `ZJU.ini`，脚本改用 `zju-sub-store-surge.js`。服务器继续使用原 `ZJU-Plinx`，不要覆盖它。

- 预览应包含 `[General]`、`[Proxy]`、`[Proxy Group]`、`[Rule]`，复制这个文件的配置下载链接给 Surge。
- 当前订阅中只输出 Surge 支持的 Hysteria2 节点，VLESS 节点不输出；要求 Surge Mac 5.4+ 或 iOS 5.8+。特殊混淆参数可能要求更高版本，以客户端官方文档为准。
- 手动选择、AI 独立节点、服务器和 ResearchGate 直连规则保持一致。订阅信息以 `direct` 别名显示，不作为代理节点参与分流。
- 这是完整配置，可从 URL 导入 Surge；也可通过 `policy-path` 读取其中的 `[Proxy]` 节点，但这种方式不会导入分组和规则。只需要纯节点列表时，可在订阅管理中将组合订阅导出为 Surge 节点格式。
- 当前输出为标准 Surge 配置，未声明 `MANAGED-CONFIG`，不承诺自动更新整份配置。需要时重新从 URL 导入；远程规则更新由客户端管理。

协议与配置格式依据：[Surge 支持协议](https://manual.nssurge.com/policies/overview.html)、[Hysteria2](https://manual.nssurge.com/policies/hysteria2.html)、[远程配置](https://manual.nssurge.com/profile/managed-profile.html)。
