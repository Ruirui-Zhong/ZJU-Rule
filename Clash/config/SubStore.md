# Sub-Store 接入 ZJU Rule

`ZJU.ini` 决定规则顺序、分组类型、成员和默认项。共享生成器位于 `src/substore-core.js`，Clash/Mihomo 与 Surge 的独立脚本由构建命令生成，不再各自维护一套策略。

## 推荐接入：原子配置包

1. 创建组合订阅 `Plinx`，通常包含 `Plinx-home`、`Plinx-high`，可加入 `Plinx-Extra`。单个来源失败或没有兼容节点时，继续使用其余来源；全部来源不可用时明确报错，由客户端保留上次有效配置。
2. 创建普通“文件”（不是 Mihomo 配置类型），远程来源填：

   ```text
   https://raw.githubusercontent.com/Ruirui-Zhong/ZJU-Rule/main/Clash/config/substore-bundle.json
   ```

3. 添加远程脚本操作。Clash/Mihomo 使用：

   ```text
   https://raw.githubusercontent.com/Ruirui-Zhong/ZJU-Rule/main/Clash/config/zju-sub-store-loader.js
   ```

   Surge 使用 `zju-sub-store-loader-surge.js`。Surge 仍仅输出可转换的 Hysteria2 节点。
4. 预览并保存，再将完整配置的下载链接导入客户端。一次下载的配置包同时包含 INI 和生成器，因此不会把新 INI 与旧生成脚本混用。加载器的协议为 `schema: 1`。

旧的 `ZJU.ini` + `zju-sub-store.js` 接入方式继续兼容，但推荐迁移到原子包。更改源码后运行 `node scripts/build_substore.mjs`，同时更新生成的脚本与配置包。

## 每台设备的参数

远程脚本 URL 的 fragment 可填写 URI 编码的 JSON 参数。保留已有 `preferredNodesByRegion`，按设备补充参数；例如 JSON `{"profile":"server","layout":"compact"}` 对应的 fragment 为 `#%7B%22profile%22%3A%22server%22%2C%22layout%22%3A%22compact%22%7D`。

| 参数 | 行为 |
| --- | --- |
| `profile: "default"`（默认） | 使用 INI 本身声明的默认项 |
| `profile: "server"` | AI 和 Claude 使用家宽稳定组，IPv6 入口排在 IPv4 前，每 60 秒检查并自动回退 |
| `profile: "home"` | AI 和 Claude 优先家宽 IPv4 自动回退 |
| `profile: "campus"` | 学术资源默认直连，机构认证跟随校园组，验证跟随学术资源 |
| `layout: "compact"`（默认） | 微软、苹果、游戏等映射到通用服务；视频映射到国外媒体 |
| `layout: "full"` | 独立展示微软、OneDrive、苹果、游戏、YouTube、Netflix、巴哈姆特等控制组 |
| `defaultSelections` | 组名称到成员名称的映射，覆盖该设备默认项；已消失的个人节点选择会被忽略 |
| `preferredNodesByRegion` | 地区代码到首选节点名称数组的映射，示例见 `node-preferences.example.json` |
| `residentialIPv4Relay` | 可选的高速节点名称数组；Clash/Mihomo 为家宽 IPv4 VLESS 入口启用链式中转，按数组顺序自动回退 |
| `collectionName`、`sourceCategory` | 适配自己的组合订阅和来源名称 |

不同设备应使用独立的文件或各自参数，不要把所有客户端共用的文件强行设为服务器预设。订阅可以记住客户端自己的选择；需要更改已记住的选项时，在客户端重新选择相应分组。

## 自动选择与故障转移

- 默认代理优先 `🔯 故障转移`，包含各地区高速来源的实际节点；还可选 `♻️ 自动选择` 和地区组。美国暂时不可用时，仍有其他地区的线路可用。
- 香港、日本、美国、台湾、新加坡、韩国、德国、英国等地区组均使用 `url-test`，支持个人首选排序，来源分类与地区元数据采用同一套逻辑。
- `🏠 家宽稳定`、`🏠 家宽 IPv4`、`🏠 家宽 IPv6` 使用 `fallback`。IPv4/IPv6 专组每 60 秒检查、5 秒超时，按优先级使用可用入口。
- 家宽 IPv6 依据名称中的独立 `v6`/`IPv6` 标记或 IPv6 字面服务器地址筛选，生成时不请求 DNS。IPv4 组收纳其余家宽入口。入口标签不保证网站看到的出口 IP 地址族。
- 高速自动/地区组排除家宽、Extra 和通知；家宽组只收纳家宽来源。没有匹配节点的可选组及引用会被省略。
- Claude 默认自动家宽，不再默认固定第一条实际节点；仍保留独立选择。

服务器到家宽 IPv4 入口超时、但其他高速入口正常时，可在服务器文件的参数中增加：

```json
{"profile":"server","residentialIPv4Relay":["HK[02]-三网优化","HK[02]-三网优化-xhttp","US[14]-三网优化-v6"]}
```

此时路径为服务器 → 高速中转 → 家宽 IPv4 入口 → 目标网站；网站看到的仍是家宽出口。
生成器新增 `🔗 家宽中转` 自动回退组，并仅给 IPv4 家宽 VLESS 节点设置 Mihomo 的 `dialer-proxy`。
保留家宽 IPv6 直连，避免把整个家宽组与高速组互相引用；Hy2 等 UDP 家宽协议保持原配置。
默认不启用中转。Mac 家用网络同样连不上家宽 IPv4 时，也可在 `profile: "home"` 的文件启用此参数，使用前两个 IPv4 高速中转入口即可，不依赖家庭 IPv6。Surge 文件保持原配置。
节点名称应与订阅一致；某个来源缺失时不生成无效引用。名称相同服务器上的两个中转协议仍可能同时故障。
中转会增加时延，并同时消耗高速和家宽两端流量；它绕过原入口路径故障，不代表原路径已经恢复。
用法参考 [Mihomo 链式代理文档](https://wiki.metacubex.one/config/proxies/dialer-proxy/)。

服务器切换示例：

```bash
clashsub use PlinX-Merge
clashnode use "🤖 AI 平台" "🏠 家宽稳定"
clashnode use "Claude" "🏠 家宽稳定"
```

健康检查检测一般连通性，不证明特定 AI 服务已经解锁。故障切换不能迁移已经中断的连接；共同出口或整个网络故障时，组内节点仍可能同时不可用。

## 学术、机构认证和公共验证

- `📚 机构认证` 处理 ACM、JSTOR、Web of Science 等依赖学校订阅的资源，默认跟随 `✔ ZJU内网`。校园组的切换会同步影响这些资源。
- `📚 学术资源` 处理普通学术站点和社区学术域名，默认跟随默认代理；校园预设可改为直连。
- `📄 arXiv` 优先香港自动组；香港组不存在时，从 INI 中其余可用选项继续选择，不生成无意义的空组。
- `🔎 学术搜索` 独立处理谷歌学术及明确的共享依赖，不整体接管全部 Google/CDN 域名。
- `🔐 公共验证` 默认跟随 AI，避免 AI 主站与验证走不同出口。用于论文网站时可改为学术资源或机构认证。纯域名规则不能知道验证请求来自哪个网页，因此不承诺跨所有业务自动匹配来源出口。
- 直连不等于获得机构权限；校外仍需要学校认可的远程认证方式。

## 上游同步与缓存

`config/upstream_rules.json` 明确列出同步的基础规则和本地保留项。自动任务从 SubConv/ZJU-Rule 的同一个提交取回整个批次，检查格式与数量后更新规则及 YAML 镜像；任一下载或验证失败都不发布该批次。`config/upstream-lock.json` 记录实际来源提交。

AI 规则由上游 AI 列表加 `AIPlatformExtras.list` 生成，明确的 AI 服务优先于微软、Google 等通用规则；Claude 和共享认证/CDN 域名分开处理。校园、机构认证、研究例外等本地策略不被通用同步覆盖。社区学术域名另由既有工作流同步，两种维护任务串行运行。

规则缓存名由来源 URL 稳定生成，不使用 INI 顺序编号。插入或重排规则不会复用另一来源的旧缓存；更新内容仍由客户端按 86400 秒间隔获取。旧的 `zju-rule-N.list` 不再被新配置引用，无需删除正在使用的缓存。

## 维护与离线检查

```bash
node scripts/build_substore.mjs
node scripts/validate.mjs
python3 scripts/sync_upstream_rules.py --source-dir /path/to/SubConv-ZJU-Rule
```

验证覆盖 AI/学术首次匹配、来源隔离、缓存名稳定性、旧 INI 兼容、单来源失效、设备预设、两种布局和两种输出格式。不发起节点连通性测试。提交 INI/脚本变化时必须同时构建配置包；CI 会拒绝过期的生成文件。
