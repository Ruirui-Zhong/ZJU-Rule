# ZJU Rule

基于 [ACL4SSR](https://github.com/ACL4SSR/ACL4SSR/tree/master) 修改后的 ZJU 分流规则

项目使用 CC-BY-SA-4.0 协议发布 [![CC-BY-SA-4.0](https://licensebuttons.net/l/by-sa/4.0/88x31.png)](https://creativecommons.org/licenses/by-sa/4.0/deed.zh)


## 支持功能

- 节点选择默认跟随高速节点，同时列出全部节点并统一处理普通代理流量，另保留家宽和高速分类。
- AI 平台、学术搜索、学术资源及公共验证分别选择出口。
- 校园出口独立设置；微软、苹果、游戏等合并为通用服务，默认直连且可切换代理；国内及广告规则保留。
- 保留原有域名规则来源和顺序，移除电报、视频、微软、游戏等重复的应用策略组。
- 仅保留 9 个路由选择组，套餐信息额外展示；不设置自动测速或故障转移。

## 常见问题

+ 我可以对 ZJU Rule 进行完善吗？

  欢迎通过 Issue 提出意见或建议，或提交 Pull Request 完善规则。ZJU 内网规则之外的规则请向项目上游 [ACL4SSR](https://github.com/ACL4SSR/ACL4SSR/tree/master) 进行反馈，上游不予采纳时也可以向 ZJU Rule 提交

## Sub-Store 与自定义直连

- [配置步骤](Clash/config/SubStore.md)：组合订阅 → 远程 ZJU.ini → 文件脚本 → 完整 Mihomo 配置。
- [适配脚本](Clash/config/zju-sub-store.js)：“节点选择”保留全部节点；校园和通用服务分别设置出口；套餐信息独立展示。
- [AIPlatforms.list](Clash/AIPlatforms.list)：AI 平台独立策略组，可选择专用节点，普通代理应用共用节点选择。
- [ResearchDirect.list](Clash/ResearchDirect.list)：ResearchGate 主站和子域名优先直连；`ZJU.ini` 同时内联优先直连 Tailscale 服务器 `100.101.106.44`。
- 修改 `.list` 后可运行 `python3 update_providers.py` 同步 Provider。直连只决定路由，不保证网站可达。

- Surge 客户端使用独立的 [Surge 适配脚本](Clash/config/zju-sub-store-surge.js)，当前输出 Hysteria2 节点；不要导入 Mihomo YAML。

- 学术出版商独立于校园内网；公共验证单独分流，默认跟随学术资源。详见 [学术与公共验证](Clash/config/SubStore.md#学术与公共验证)。

- `ScholarProxy.list` 将谷歌学术及相关验证依赖交给独立的“学术搜索”（默认家宽）；`AcademicSupplement.list` 补齐常用学术站点。回归检查：`python3 -m unittest discover -s tests -v`。
