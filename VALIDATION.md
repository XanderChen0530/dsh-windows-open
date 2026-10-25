# Validation / 验证

## Scope and status / 范围与状态

The initial target is DSH 0.2.1-rc.2 in WSL with a Windows desktop at `C:\Windows`.
Required tools are Node.js 22 or later, Python 3, and `/usr/bin/wslpath`.
The observed-results section records this release's limited checks.
The later matrices define additional checks, not universal compatibility.

初始目标是 WSL 中的 DSH 0.2.1-rc.2，以及安装于 `C:\Windows` 的 Windows 桌面。
所需工具为 Node.js 22 或更新版本、Python 3 和 `/usr/bin/wslpath`。
已观察结果一节记录本次有限验证，后续矩阵列出更多检查要求。
这些结果不代表兼容全部格式或应用版本。

## 0.1.0 observed results / 0.1.0 已观察结果

Checks used synthetic files with DSH 0.2.1-rc.2, WSL2, and Windows 11.
No private files or screenshots form part of this release.

| Case | Observed result |
|---|---|
| PNG, PDF, TXT, XLSX, PPTX, DOCX, MP4 | Clicking the file entered Web preview or its unsupported-format view. No native open request occurred. |
| Markdown (`.md`) | Clicking entered Web preview with no native open request. The default-application request returned success. Selecting another listed application also returned success. The location request returned success. |
| Explicit Windows open and location actions | Both requests returned success for the seven tested formats. |
| Explorer selection | The Windows Shell API reported the matching test file selected for all seven formats. |
| Office and text windows | Target document windows appeared. Spreadsheet and presentation windows used Protected View. The checks did not bypass any protection. |
| Bridge control | Native location failed with the new bridge disabled and the earlier local adapter excluded. It succeeded after enabling this bridge. |

A video-player window appeared, but actual video decoding and playback were not independently verified.
The isolated legacy DOC creation check timed out. Its result remains unverified.
These are explicit limits, not successful format checks.
PNG and PDF handoff succeeded, but exact document content in their desktop windows was not independently checked.
Other application versions, Windows layouts, and storage locations need separate checks.

本次使用无个人内容的合成文件，在 DSH 0.2.1-rc.2、WSL2、Windows 11 环境检查。
普通点击七种文件均进入网页预览或不支持格式提示，没有触发原生打开请求。
Markdown（`.md`）点击进入网页预览，未触发原生打开；默认应用打开、下拉菜单中另一应用打开、定位请求均返回成功。
主动选择 Windows 打开及文件定位时，七种格式的请求均成功，Windows Shell API 确认选中了相应测试文件。
Office 文档和文本编辑器的目标窗口出现；表格、演示文稿处于受保护视图，没有绕过保护。
排除旧本地适配器后，禁用本桥会使原生定位失败，重新启用则成功。
视频播放器窗口出现，但实际解码播放未独立验证；旧版 DOC 创建检查超时，未完成验收。
PNG、PDF 转交成功，但未独立核对其桌面窗口的确切文档内容。
本发行不含私人文件、截图、机器路径、具体软件清单或私有日志。

## Automated commands / 自动检查命令

Run these commands from the package directory:

在包目录运行：

```sh
npm run build
npm test
node --check lib/host.mjs
```

The build should generate `lib/host.mjs` without a browser module.
The suite must check Host `PATH` effects, installer safety, and shim argument handling.
Controlled substitutes for Windows programs do not prove real desktop behavior.
Do not treat a fixed test count as a release guarantee.

构建应生成 `lib/host.mjs`，不生成浏览器模块。
测试应覆盖 Host `PATH` effect、安装器安全和 shim 参数处理。
Windows 程序的受控替身不证明真实桌面行为。
不要将固定测试数量作为发行保证。

## Native UI matrix / 原生界面实测矩阵

Use synthetic files in the existing authenticated DSH Web session.
Check conversation results, document views, and deliverables where those native surfaces exist.
Check the actual desktop separately from RPC or process success.

在已有认证 DSH Web 会话中使用合成文件。
检查对话结果、document 视图和 deliverables 中实际存在的原生入口。
桌面效果必须单独观察，不能用 RPC 或进程成功替代。

| Check / 检查 | Required observation / 要求观察 |
|---|---|
| PNG, PDF, TXT | A normal click uses Web preview without opening Windows. / 普通点击在网页预览，不打开 Windows。 |
| XLSX, PPTX, DOCX, DOC without browser support / 浏览器不支持时 | Native UI offers Windows opening. No plugin-added Office preview claim. / 原生界面提示 Windows 打开，不声称插件增加 Office 预览。 |
| Explicit default-application action / 主动选择默认应用 | Check the installed application and association, then observe the actual window and file. / 核对应用安装及关联，观察实际窗口和文件。 |
| Native split-button menu / 原生分体按钮菜单 | Check **Show file location**, folder location, and actual file selection. No duplicate UI. / 检查**显示文件位置**、定位目录和实际选中状态，无重复 UI。 |
| Missing or unavailable association / 未查询到或缺少关联 | Check `Open in <app>` and possible **Show file location** fallback against the installed application state. / 对照应用状态检查 `用 {app} 打开` 标签及退化为**显示文件位置**的行为。 |

## Desktop and failure matrix / 桌面与失败实测矩阵

| Check / 检查 | Required observation / 要求观察 |
|---|---|
| Video / 视频 | Explicit Windows opening uses the installed player. Check actual decoding and playback. / 主动 Windows 打开后核对播放器、解码及实际播放。 |
| Office protection / Office 保护 | Observe Protected View and security prompts. Do not bypass them. / 观察受保护视图和安全提示，不绕过。 |
| Missing file / 文件不存在 | Record native success or failure separately from existence. Native delegation may still return `ok`. / 分开记录原生响应和存在性，原生委托仍可能返回 `ok`。 |
| Missing interoperation, tools, or desktop / 缺少互通、工具或桌面 | Check failure behavior without claiming a visible application. / 检查失败行为，不声称窗口出现。 |
| Remote browser / 远端浏览器 | Explicit actions affect the Host's Windows computer, not the visitor's device. / 主动操作影响 Host 的 Windows，而非访问者设备。 |

Handoff alone proves neither file existence, a visible window, selection, nor playback.
Other DSH versions, application versions, formats, and Windows layouts need separate checks.

handoff 本身不证明文件存在、窗口出现、选中或播放。
其他 DSH 版本、应用版本、格式和 Windows 布局需单独检查。

## Installer and scope matrix / 安装器与范围检查矩阵

Use disposable synthetic profiles, never production configuration.
Stop other configuration writers before real installation or removal.

使用可丢弃的合成 profile，不使用生产配置。
真实安装和卸载前停止其他配置写入者。

| Check / 检查 | Required observation / 要求观察 |
|---|---|
| Comments plus `[]`, existing block lists / 注释加 `[]`、已有 block-list | Install and uninstall preserve unrelated text and restore the managed replacement. / 安装卸载保留无关文字，恢复被管理替换内容。 |
| Conflicts and edited markers / 冲突和标记变更 | Refuse unsupported changes without corrupting configuration. / 拒绝不支持的变更，不损坏配置。 |
| Exclusive lock / 排他锁 | Concurrent installer refuses. Manually check that the owner stopped before stale-lock cleanup. / 并发安装器拒绝执行，陈旧锁清理前人工确认持有者已停止。 |
| Private backup and replacement / 私有备份及替换 | Check the initial snapshot, private temporary file, and same-directory rename. Other writers remain outside lock protection. / 检查初始快照、私有临时文件及同目录 rename，锁不保护其他写入者。 |
| Host-only boundary / 仅 Host 边界 | Check `PATH` setup and cleanup. Check for absence of an added client, metadata/check routes, path panel, or normalizer. / 检查 `PATH` 设置及清理，无新增客户端、元数据或检查路由、路径面板及规范化器。 |
