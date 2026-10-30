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

## 策略组与展示顺序

按下面顺序展示，只有缺少套餐条目时省略“订阅信息”：

| 顺序 | 策略组 | 默认行为 |
| --- | --- | --- |
| 1 | ℹ️ 订阅信息 | 仅展示，不参与路由 |
| 2 | 🚀 手动选择 | 自动选择，同时保留高速组和全部手动节点 |
| 3 | 🏠 家宽节点 | 手动选择家宽订阅节点 |
| 4 | 🤖 AI 平台 | 家宽组 |
| 5 | ✔ ZJU内网 | DIRECT，可独立切换校园节点或代理 |
| 6 | 🔎 学术搜索 | 手动选择组，可固定具体节点 |
| 7 | 📚 学术资源 | DIRECT |
| 8 | 🔐 公共验证 | 跟随学术资源，默认直连 |
| 9 | 🌍 国外媒体 | 手动选择组 |
| 10 | 🌏 国内媒体 | DIRECT |
| 11 | 🌐 通用服务 | DIRECT，可统一切换代理 |
| 12 | 🎯 全球直连 | DIRECT，可临时切换代理 |
| 13 | 🛑 广告拦截 | REJECT，可临时放行 |
| 14 | 🛡️ 隐私防护 | REJECT，可独立放行 |
| 15 | 🐟 漏网之鱼 | 手动选择组，处理全部规则未命中的流量 |

- 国外媒体合并 YouTube、Netflix、巴哈姆特和其他国外媒体；国内媒体合并哔哩哔哩、网易云音乐和其他国内媒体。
- 通用服务合并微软/Bing/OneDrive、苹果、游戏、FCM，保留默认直连及代理切换能力。普通 Google 服务沿原通用代理规则，GoogleCN 例外归全球直连；谷歌学术独立。
- 广告拦截合并 BanAD、BanProgramAD、BanEasyList、BanEasyListChina；BanEasyPrivacy 保留独立隐私防护。
- 所有 49 项规则来源、匹配优先级和合并前的默认直连/代理/拦截方向保持不变。LAN、Tailscale、RVPN/WebVPN 登录入口保留硬性直连，避免递归代理；ResearchGate 保留自定义直连。
- `FINAL` 必须交给漏网之鱼；域名未列出但命中 GEOIP 等规则时，仍按命中的规则处理。
- AI 默认家宽，其他需要代理的组默认手动选择；校园、国内媒体、通用服务、全球直连、学术资源和拦截组不强制走高速。
- 新增唯一的 `♻️ 自动选择`：仅对美国 US 节点测试可用性与延迟，间隔 300 秒、切换容差 100ms；其他地区不参与。`🚀 手动选择` 默认选此自动组，也保留全部实际节点。家宽仍为单层手动组，不再生成高速组。AI 默认家宽，也可选择美国自动组。测试通过不代表 GPT 等特定网站一定可用，切换不迁移已有连接。
- 普通 INI 按名称识别家宽/高速；Sub-Store 脚本严格按订阅来源分类，并按 INI 定义排序所有策略组。

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

- `ScholarProxy.list` 显式覆盖谷歌学术常用地区入口、专用资源和 Google 登录/reCAPTCHA 依赖，优先于 `GoogleCN` 与 `ProxyGFWlist`。`🔎 学术搜索` 默认手动选择，可选家宽或具体节点；不单独生成高速组；需要自动切换时，可在学术搜索等应用组里选择“自动选择”。
- Google 登录、`www.google.com`、`www.gstatic.com`、`ssl.gstatic.com` 和 `recaptcha.net` 是共享主机，分流也会作用于其他使用它们的网页，不能按来源页面自动决定出口。没有接管整个 Google 或公共 CDN 域名。
- `AcademicSupplement.list` 补充预印本、索引、ORCID 与开放数据平台；出版商列表补充 Springer Nature/CDN、Optica、De Gruyter Brill、Liebert。默认沿用学术资源直连，不保证当前网络可达或拥有机构全文权限。
- PubMed/PMC、Semantic Scholar API、Elsevier 登录、ScienceDirect 静态资源原已被后缀规则覆盖，不重复添加；ResearchGate 继续沿用自定义直连。
- 运行 `python3 -m unittest discover -s tests -v` 检查域名实际按顺序首先匹配的策略、策略默认引用、Provider 同步，以及非学术 Google/公共 CDN 未被扩大接管。检查范围是明确列出的域名样本，不等于覆盖所有学术网站或浏览器端到端验证。
- 本机 Surge 使用内联规则即时应用；仓库中的远程新列表仍需发布后才能由其他客户端订阅。

参考：[Google Scholar 帮助](https://scholar.google.com/intl/en/scholar/help.html)、[Semantic Scholar API](https://api.semanticscholar.org/api-docs/)、[Optica](https://opg.optica.org/)、[De Gruyter Brill](https://www.degruyterbrill.com/publishing/about-us)。

## 合并版本更新

- INI 和两个转换脚本必须一起更新。Sub-Store 如果使用“快捷脚本”，需要替换保存的脚本文本；只更新 GitHub 不会更新已粘贴的脚本。
- 已导入客户端的旧配置不会自动删去旧策略组，须重新下载整份配置后替换/导入。更新后检查策略组包含上述 15 组以及美国自动组（共 16 组，无套餐信息时为 15 组）。

- `tests/fixtures/routing_defaults.json` 固化合并前全部规则来源、顺序及默认方向，确保合并不会将原代理规则改为直连或丢失校园出口切换。

美国自动组展示在 AI 平台前。Clash/Mihomo 使用 url-test（lazy=false）；Surge 使用 url-test 和全局 proxy-test-url。过滤 VLESS 实际节点，保留套餐信息。客户端可能记住上次选择；需在“手动选择”中选“自动选择”才能自动切换。AI 要使用美国自动组时也需单独选择；固定实际节点不会自动替换。

`Plinx-Extra` 与 `Plinx-high` 都纳入全部手动节点，不生成单独高速组；名称符合美国规则时参与美国自动组。AI 默认家宽，其他需要代理的应用默认手动选择；原有 DIRECT/REJECT 默认不变。

最终出口：所有实际节点统一放入“手动选择”（含 Plinx-high、Plinx-Extra）；AI 默认家宽，其他默认需要代理的应用跟随手动选择。原 DIRECT/REJECT 默认保留。
