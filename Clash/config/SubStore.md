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

## 精简策略组

保留 9 个路由选择组和 1 个订阅信息展示组：

| 策略组 | 默认行为与用途 |
| --- | --- |
| 🚀 节点选择 | 列出全部有效节点，电报、国外视频/媒体、GFW 规则与兜底共用 |
| ✔ ZJU内网 | 校园域名及校园 IP 独立设置，默认 DIRECT，可选校园节点或代理 |
| 🌐 通用服务 | 微软、苹果、游戏、FCM、网易云、国内媒体等合并，默认 DIRECT，可统一切换代理 |
| 🏠 家宽节点 | `Plinx-home` 的节点，按订阅来源分类 |
| ⚡ 高速节点 | `Plinx-high` 的节点，按订阅来源分类 |
| 🤖 AI 平台 | 默认家宽，也可选择高速或固定到具体节点 |
| 🔎 学术搜索 | 默认家宽，与默认代理独立，允许固定到具体节点 |
| 📚 学术资源 | 默认 DIRECT，可选择家宽、高速或校园专用节点 |
| 🔐 公共验证 | 默认跟随学术资源，需要时单独切换 |
| ℹ️ 订阅信息 | 仅展示套餐信息，不参与路由和测速 |

- 普通国内网站、局域网、RVPN/WebVPN 登录入口继续 DIRECT；校园资源交给校园组，微软等可切换服务交给通用服务组；广告及隐私规则合并使用 REJECT。
- 所有 49 项规则来源、优先级及原始默认直连/代理/拦截方向保持不变。相同默认行为的应用组统一选择出口，校园服务仍可独立设置。
- 手动选择节点，不设置自动测速、故障转移或地区组；节点不可用时需手动切换。家宽名称沿用订阅标注，不保证实际出口 IP 类型。
- 普通 INI 按名称识别家宽/高速，兼容旧名称中的“中转”；Sub-Store 脚本严格按订阅来源分类。
- AI 域名维护在 `Clash/AIPlatforms.list`。公共验证码独立分流，通用认证/支付服务不整体归入 AI。
- 订阅信息单独显示来源和流量，不合并两个套餐。`proxies` 是必需节点清单，`proxy-groups` 才是客户端显示的选择组；内部来源字段不输出。

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

## 合并版本更新

- INI 和两个转换脚本必须一起更新。Sub-Store 如果使用“快捷脚本”，需要替换保存的脚本文本；只更新 GitHub 不会更新已粘贴的脚本。
- 已导入客户端的旧配置不会自动删去旧策略组，须重新下载整份配置后替换/导入。更新后检查策略组只有上表 10 组（无套餐信息时为 9 组）。

- `tests/fixtures/routing_defaults.json` 固化合并前全部规则来源、顺序及默认方向，确保合并不会将原代理规则改为直连或丢失校园出口切换。
