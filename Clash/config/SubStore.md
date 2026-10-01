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

- `🚀 节点` 只有两个选项：`🛰️ 中转节点`、`⚡ 高速节点`。进入对应组直接选择实际节点，不设置自动、故障转移、负载均衡或地区子组。
- `🤖 AI 平台` 默认跟随 `🚀 节点`，也可以直接选择独立节点，供 AI 平台使用，不改变一般代理流量的节点选择。
- AI 域名统一维护在 `Clash/AIPlatforms.list`，当前包含原规则中的 ChatGPT/OpenAI、Claude、Gemini、Poe 等平台。不将通用登录、支付或监控域名整体归入 AI。
- 学术和一般代理流量使用 `🚀 节点`，原先默认直连的规则使用 `DIRECT`，广告拦截使用 `REJECT`。保留校园规则的匹配顺序，移除应用策略组及其切换选项。
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
