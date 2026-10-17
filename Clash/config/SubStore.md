# Sub-Store 接入 ZJU Rule

## 配置

1. 创建组合订阅 `Plinx`，包含 `Plinx-home`（家宽）和 `Plinx-high`（高速）。如订阅名称不同，修改脚本顶部 `collectionName` 和 `sourceCategory`。
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

- `🚀 节点选择` 直接列出所有可用家宽和高速节点，选择实际节点即可。`🏠 家宽节点` 和 `⚡ 高速节点` 另保留分类选择，不设置自动、故障转移、负载均衡或地区子组。
- `🤖 AI 平台` 默认跟随 `🏠 家宽节点`，也可以直接选择独立节点，供 AI 平台使用，不改变一般代理流量的节点选择。
- AI 域名统一维护在 `Clash/AIPlatforms.list`，继承原 OpenAI/ChatBot 的全部域名规则，并保留新增的 Claude、Gemini API 域名。
- 保留 ZJU 内网、学术、电报、视频、媒体、微软、苹果、游戏、广告和漏网之鱼等应用策略组，学术资源默认直连，AI 默认家宽，其余应用保留原有默认选择。只将原 ChatBot 改为 AI 平台；应用组可以单独选择 DIRECT 或节点分类。移除的地区/自动组引用改为高速或主节点组。
- `ℹ️ 订阅信息` 单独显示带来源标签的流量、重置及到期条目，不参与分流和测速；两个套餐不合并计算，更新配置后刷新。客户端顶部流量统计由响应头决定，脚本不改写响应头。
- `🏠 家宽节点` 对应 `Plinx-home`，`⚡ 高速节点` 对应 `Plinx-high`，按订阅来源分类，不通过节点名称猜测线路；家宽名称沿用订阅标注，不保证实际出口 IP 类型。普通 INI 按名称匹配，兼容旧名称中的“中转”。
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

## 学术与公共验证

- `ZJU.list` 只保留校园服务，`AcademicPublishers.list` 保存原列表中的出版商；与 `ZJU-More-Scholar.list`、`Scholar.list` 一起交给 `📚 学术资源`，默认 DIRECT，可切换家宽、高速或校园专用节点。
- `SharedVerification.list` 在 AI、媒体与广告规则之前匹配，`🔐 公共验证` 默认跟随 `📚 学术资源`，使默认直连的 OUP 与 Cloudflare 验证使用相同出口策略。不是关闭验证，也不能保证通过网站风控。
- 域名分流无法按来源网站让共享验证码自动跟随不同出口。若 AI 网页验证失败，将公共验证切换到与 AI 相同的具体出口；不要在验证过程中切换节点。
- 从 AI 和媒体列表移除对 auth0.com、stripe.com、sentry.io 等通用服务的整域接管，它们交回后续规则。
- 本地仓库修改不会自动更新 GitHub。发布后须更新 INI、脚本及规则集；新配置引用新增列表前，先保证远程列表可访问。
- 已导入 Surge 的本地配置可使用内联规则先应用本次修改，无需等待远程发布；再次导入旧订阅会覆盖本地修订。

## 学术域名覆盖与回归检查

- `ScholarProxy.list` 显式覆盖谷歌学术常用地区入口、专用资源和 Google 登录/reCAPTCHA 依赖，优先于 `GoogleCN` 与 `ProxyGFWlist`。`🔎 学术搜索` 默认家宽，可选高速或具体节点，默认与“节点选择”解耦；它是手动策略，节点失效不会自动切换。
- Google 登录、`www.google.com`、`www.gstatic.com`、`ssl.gstatic.com` 和 `recaptcha.net` 是共享主机，分流也会作用于其他使用它们的网页，不能按来源页面自动决定出口。没有接管整个 Google 或公共 CDN 域名。
- `AcademicSupplement.list` 补充预印本、索引、ORCID 与开放数据平台；出版商列表补充 Springer Nature/CDN、Optica、De Gruyter Brill、Liebert。默认沿用学术资源直连，不保证当前网络可达或拥有机构全文权限。
- PubMed/PMC、Semantic Scholar API、Elsevier 登录、ScienceDirect 静态资源原已被后缀规则覆盖，不重复添加；ResearchGate 继续沿用自定义直连。
- 运行 `python3 -m unittest discover -s tests -v` 检查域名实际按顺序首先匹配的策略、策略默认引用、Provider 同步，以及非学术 Google/公共 CDN 未被扩大接管。检查范围是明确列出的域名样本，不等于覆盖所有学术网站或浏览器端到端验证。
- 本机 Surge 使用内联规则即时应用；仓库中的远程新列表仍需发布后才能由其他客户端订阅。

参考：[Google Scholar 帮助](https://scholar.google.com/intl/en/scholar/help.html)、[Semantic Scholar API](https://api.semanticscholar.org/api-docs/)、[Optica](https://opg.optica.org/)、[De Gruyter Brill](https://www.degruyterbrill.com/publishing/about-us)。
