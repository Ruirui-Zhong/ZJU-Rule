# ZJU Rule

基于 [ACL4SSR](https://github.com/ACL4SSR/ACL4SSR/tree/master) 修改后的 ZJU 分流规则

项目使用 CC-BY-SA-4.0 协议发布 [![CC-BY-SA-4.0](https://licensebuttons.net/l/by-sa/4.0/88x31.png)](https://creativecommons.org/licenses/by-sa/4.0/deed.zh)


## 支持功能

以下应用保留分流规则，简化版不单独生成各应用策略组。

+ ZJU 内网资源/学术资源分流（直连访问/ RVPN访问）
+ 节点手动选择（中转 / 高速）
+ AI 平台独立选择节点
+ Telegram 分流
+ Youtube 分流
+ Netflix 分流
+ 动画疯分流
+ 哔哩哔哩分流（解锁港澳台）
+ Google 服务分流
+ OneDrive 分流
+ Microsoft 服务分流
+ Apple 服务分流
+ 游戏平台分流（Steam/Epic/Sony）
+ 网易云音乐分流（灰色歌曲解锁）
+ 广告拦截/应用净化/AdBlock/隐私防护
+ ...

## 常见问题

+ 我可以对 ZJU Rule 进行完善吗？

  欢迎通过 Issue 提出意见或建议，或提交 Pull Request 完善规则。ZJU 内网规则之外的规则请向项目上游 [ACL4SSR](https://github.com/ACL4SSR/ACL4SSR/tree/master) 进行反馈，上游不予采纳时也可以向 ZJU Rule 提交

## Sub-Store 与自定义直连

- [配置步骤](Clash/config/SubStore.md)：组合订阅 → 远程 ZJU.ini → 文件脚本 → 完整 Mihomo 配置。
- [适配脚本](Clash/config/zju-sub-store.js)：“节点” → “中转节点 / 高速节点”，直接手动选择，无自动或地区组；套餐信息独立展示。
- [AIPlatforms.list](Clash/AIPlatforms.list)：AI 平台独立策略组，可选择专用节点，其余代理流量使用“节点”。
- [ResearchDirect.list](Clash/ResearchDirect.list)：ResearchGate 主站和子域名优先直连；`ZJU.ini` 同时内联优先直连 Tailscale 服务器 `100.101.106.44`。
- 修改 `.list` 后可运行 `python3 update_providers.py` 同步 Provider。直连只决定路由，不保证网站可达。

- Surge 客户端使用独立的 [Surge 适配脚本](Clash/config/zju-sub-store-surge.js)，当前输出 Hysteria2 节点；不要导入 Mihomo YAML。
