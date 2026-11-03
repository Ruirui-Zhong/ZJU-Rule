# 高速地区分组与 arXiv

这次调整针对配套的 Sub-Store 文件脚本，Clash/Mihomo 与 Surge 使用同一套地区匹配逻辑。不要把普通 subconverter 的节点名正则当成订阅来源元数据：需要严格隔离家宽和 Extra 时，必须使用配套脚本生成配置。

## 分组和默认路径

- `🚀 默认代理` 默认美国自动，也可选择手动或地区出口。`🚀 手动选择` 只列实际普通节点，Extra 继续独立。
- 香港、日本、美国，以及现有台湾、新加坡、韩国、德国、英国节点各自进入地区组。没有对应节点的组不输出。未识别的高速节点进入 `🌐 其他高速节点`，不会丢弃。
- 所有新地区组都是手动 `select`，只包含 `sourceCategory` 映射为 `high` 的实际节点。家宽、Extra、流量/到期占位条目不参与地区分组。当前 `Plinx-high` 是高速来源，`Plinx-home` 和 `Plinx-Extra` 分别独立。
- 地区识别兼容缩写（如 HK/HKG、JP/JPN、US/USA、UK/GB）、中文、常见英文、旗帜和重复后缀。有效的 `_countryCode` 或 `countryCode` 显式代码优先；名称包含多个国家时采用最前面的国家标记。不会按协议、服务器 IP 或宽泛的单字猜测国家。`GM` 仅沿用本订阅表示德国的命名约定。
- `📄 arXiv` 初始路径是 `🇭🇰 香港节点 → 具体香港节点`。组中仍可手动选择其他可用地区或 `DIRECT`，不会默认跨地区回退。
- 没有香港节点时，不生成空香港组，arXiv 初始明确选择 `REJECT`。需要用户主动选择其他地区或直连；不会伪装成香港或自动落到其他地区。没有美国节点时，既有美国自动入口同样显式 `REJECT`，避免生成空组；来源整体无家宽或高速节点仍按项目现有方式报清晰错误，不输出无效配置。
- 新地区组只在生成时按最新订阅内容构建，节点增删、协议过滤后重新计算。Surge 按现有 Hysteria2 输出限制筛选后再分类，所以组内数量及可用首选可能和 Clash 不同。
- 不增加跨地区自动组。其他服务的规则顺序、DIRECT/REJECT/代理默认方向、AI 家宽默认、ZJU、Google Scholar 和其他学术资源保持原意。

## 域名与策略分离

`Clash/Arxiv.list` 只定义 `DOMAIN-SUFFIX,arxiv.org`，覆盖主域及子域，不包含节点名；对应 YAML 在 `Clash/Providers/Arxiv.yaml`。`ZJU.ini` 将该规则集映射到 `📄 arXiv`，放在通用学术资源之前。原来 `AcademicSupplement.list` 中的重复 arXiv 条目已移除，对应 Provider 同步。

其他学术资源仍默认走原来的 `📚 学术资源`（DIRECT），公共验证规则不因 arXiv 改道。

## 个人香港首选

公共脚本不包含任何个人节点首选，默认保持订阅内稳定顺序。个人优先级通过脚本参数传入：

```json
{
  "preferredNodesByRegion": {
    "HK": ["你的香港节点名称"]
  }
}
```

示例位于 `node-preferences.example.json`。本机 `node-preferences.local.json` 保存个人首选，并在 `.gitignore` 中明确排除；该文件不会被远程脚本自动读取。节点不存在时忽略过期偏好，仍选择同地区的可用节点。重名追加编号后仍能识别相同基础名称，精确名称优先。

后续经用户授权启用时，可把个人参数用于 Sub-Store 的远程脚本链接：

```bash
node -e 'const fs=require("fs");const p=JSON.parse(fs.readFileSync("Clash/config/node-preferences.local.json","utf8"));console.log("https://raw.githubusercontent.com/Ruirui-Zhong/ZJU-Rule/main/Clash/config/zju-sub-store.js#"+encodeURIComponent(JSON.stringify(p)));'
```

Surge 改用 `zju-sub-store-surge.js`。在 Sub-Store 文件中选择脚本操作的远程链接模式；URL 的片段参数会作为 `$arguments` 传入。不要把个人参数链接或 local.json 提交到公共仓库。

节点首选只调整新生成配置的初始顺序，不强制覆盖客户端记住的旧选择。导入后若客户端沿用旧状态，需要手动在 arXiv 组选择香港，并在香港组确认所需节点。

## 启用与回退

本次只做本地修改和隔离测试。未经用户授权不发布、不更新 Sub-Store 文件、不重载运行中的 Clash，也不修改全局 DNS、TUN 或系统代理。生成的 Provider URL 指向本仓库；正式启用前必须先发布新增列表和配套脚本，否则远程客户端无法获取未发布的列表。

- 临时回退：在 arXiv 组选择 `DIRECT`，恢复本次调整前的直连方向；或手动换另一个香港节点/地区。
- 恢复原学术组控制：撤销 `ZJU.ini` 的 arXiv 专用规则，并把 arXiv 条目放回 `AcademicSupplement.list`，同步 Provider 后重新生成。其他分组不必删除。
- 撤销规则与生成器改动：对交付的 `regions-arxiv.patch` 执行 `git apply -R --check`，确认后再 `git apply -R`。补丁会删除本次新增的公共文件；为保护个人偏好，特意不回退 `.gitignore` 的个人文件忽略项，local.json 独立保留或按需删除。

## 验证

```bash
node tests/test_substore_generation.mjs
node tests/test_region_routing.mjs
python3 -B -m unittest discover -s tests -p 'test_*.py'
git diff --check
```

校验覆盖来源隔离、缩写/中文/英文/旗帜/重复后缀、元数据优先、每个高速节点唯一归类、未知地区、首选节点消失、缺少香港/美国/其他地区、错误引用和循环引用，以及 arXiv 规则先于通用学术生效。原默认方向基线只新增 arXiv 这一项代理例外。
