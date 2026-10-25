# DSH Windows Open

**结果文件优先在 DSH Web 预览。需要桌面应用或资源管理器时，再主动选择 Windows 操作。**

这是供 WSL 中的 DSH 使用的 host-only 桥接包，帮助服务找到 Windows 命令。
它复用 DSH 原生 preview、document 和 deliverables 操作。
不新增侧栏、路径输入框或重复按钮。

[English](<README.md>) · [安全说明](<SECURITY.md>) · [验证矩阵](<VALIDATION.md>)

## 它能做什么

| 你的需求 | 优先操作 |
|---|---|
| 查看 PNG、PDF、TXT | 点击结果文件，在 DSH Web 预览。 |
| 打开浏览器不支持的 XLSX、PPTX、DOCX、DOC | 使用 DSH 的 Windows 打开提示或原生打开操作。 |
| 用已安装的 Windows 应用编辑文件 | 主动选择 Windows 默认应用打开操作。 |
| 定位结果文件 | 主动选择原生 Explorer 菜单项，请求定位并选中文件。 |
| 在浏览器外播放视频 | 主动选择 Windows 默认播放器，仍受编解码器支持限制。 |

**普通结果文件点击应保留原生网页预览，不应直接触发桌面。**
只有用户主动选择 Windows 打开或 Explorer 定位时，才触发桌面操作。
插件没有为浏览器增加 Office 预览能力。
原生操作采用分体按钮及下拉菜单，不是固定两个独立按钮。
主标签可能是 `用 {app} 打开`，下拉菜单包含**显示文件位置**（英文 **Show file location**）。
未查询到默认关联时，主操作可能退化为**显示文件位置**。
具体标签、提示和可用操作取决于 DSH 版本、文件类型及默认应用关联。
最终桌面行为仍需集成实测，见[验证矩阵](<VALIDATION.md>)。

桌面操作发生在运行 WSL DSH 的 Windows 电脑上。
即使用手机访问网页，也不会在手机上打开文件。

## 适合谁

- 在 Windows 的 WSL 中运行 DSH Web。
- 经常让 agent 生成图片、报告、Office 文件或视频。
- 优先使用网页预览，需要时再使用已安装的 Windows 应用。
- DSH 服务只有 Linux `PATH`，导致原生桌面操作失败。

它不是文件管理器、远程桌面或云端播放器。
没有 Windows 桌面的 Linux VPS 不在适用范围内。

## 安装

### 1. 核对环境

- DSH Web 提供原生文件预览、打开和定位操作。
- WSL 已启用 Windows 互通，Windows 系统盘已挂载。
- Node.js 22 或更新版本、Python 3，以及 `/usr/bin/wslpath`。
- Windows 安装于 `C:\Windows`，所需应用已安装，文件关联已配置。

初始兼容目标是 **DSH 0.2.1-rc.2**。
其他版本和 Windows 安装布局需要单独检查。
这不代表兼容全部文件格式或应用版本。

### 2. 获取并构建

```sh
git clone https://github.com/XanderChen0530/dsh-windows-open.git
cd dsh-windows-open
npm run build
npm test
```

没有 npm 依赖。
构建生成 `lib/host.mjs`，不生成浏览器模块。
插件启用期间，请保留克隆目录的位置。

### 3. 注册插件

先停止所有其他 profile/configuration 写入者。
安装器的锁只协调本安装器的其他实例。

```sh
node scripts/profile.mjs install --profile web
```

使用自定义 DSH 数据目录时，请替换占位地址：

```sh
node scripts/profile.mjs install --profile web --dsh-home /path/to/dsh-home
```

安装器支持带注释的空 `[]` profile，也支持已有 block-list profile。
它添加一个带标记的区块，保留其他文字。
遇到冲突条目、被编辑的标记或不支持的根结构时停止。

安装器使用排他 `wx` 锁，并私有备份最初读取的配置快照。
它在同目录写入私有临时文件，再通过 rename 替换配置。
这能避免部分替换，不能阻止其他配置写入者的并发修改。
备份可能含配置密钥，必须保持私有。
只有人工确认锁的持有者已停止后，才能清理陈旧锁。

等任务停止后重启 DSH，再刷新网页。
安装器不会自行停止或重启服务。

## 使用已有文件操作

1. 点击对话或原生 deliverables 视图中的结果文件。
2. 浏览器支持时，使用原生网页预览。
3. 需要桌面应用时，主动选择原生 Windows 默认应用打开操作。
4. 需要定位文件时，打开原生分体按钮菜单，选择**显示文件位置**。

PNG、PDF、TXT 可以在浏览器预览。
XLSX、PPTX、DOCX、DOC 在浏览器不支持时，应提示交给 Windows 打开。
插件只补命令桥，不负责提供这些提示或预览。
[验证矩阵](<VALIDATION.md>)区分待验证要求与已确认结果。

插件不安装 Office、WPS、PDF 阅读器、播放器或编解码器。
Windows 必须安装对应应用，并为文件类型设置关联。
Office 可能对 WSL 文件显示受保护视图或其他安全提示。
不要为通过测试而禁用文档保护。

## 它怎么做到

```text
点击结果文件 → 支持时使用 DSH 原生网页预览
主动选择 Windows 打开或 Explorer 定位
    → DSH 原生认证文件操作及文件系统映射
    → PATH 适配器 → Windows 应用或 Explorer
```

1. `src/index.mjs` 通过 effect 把私有 `bin` 目录追加到 Host 的 `PATH` 末尾。
2. `PATH` 中已有命令优先，effect 清理时移除新增项。
3. Python shim 在服务找不到 Windows 命令时提供 `explorer.exe` 和 `powershell.exe`。
4. shim 通过 `wslpath` 和有效的 WSL 互通套接字定位并调用 Windows 程序。
5. shim 用 `execv` 直接传递参数列表。PowerShell shim 按需转换临时脚本参数。

没有前端模块、HTTP 元数据接口、check route 或用户路径规范化器。
预览、document 和 deliverables 按钮、认证及文件操作策略均由 DSH 原生提供。
本包不修改 DSH 打包文件或历史消息。

## 安全与限制

**只打开你信任的文件。**
Windows 应用可能执行程序、脚本或文档宏。
桥接不是安全沙箱。
拥有原生文件操作权限的认证用户，可以触发 Host 电脑上的桌面操作。
不要把可信个人 Host 开放给不可信用户。

新增 `PATH` 项会影响 Host 的所有子进程，包括 agent shell。
shim 只在自己的进程内设置 `WSL_INTEROP`。
它不修改 Host 全局 `WSL_INTEROP` 或 Windows 执行策略。

**handoff 不证明文件存在、窗口出现、Explorer 选中或视频播放。**
原生 Explorer 委托对不存在的文件也可能返回 `ok`。
插件不添加存在性检查，也不改变该原生行为。
重要结果需查看实际应用或 Explorer 选中状态。

视频播放取决于播放器和编解码器。
Office 行为取决于已安装应用、关联和文档保护。
桥接不修复缺失文件、远端路径、异常链接或不支持的格式。
信任边界见[安全说明](<SECURITY.md>)。

## 卸载

先停止其他配置写入者。

```sh
node scripts/profile.mjs uninstall --profile web
```

安装时使用了自定义目录，卸载时需使用相同的 `--dsh-home`。
等任务停止后重启 DSH，再刷新网页。
安装器只移除自己的标记区块，保留无关文字。
它不删除结果文件或克隆目录。
备份保留在本机并保持私有。清理前请先核对过期备份。

## 常见问题

| 现象 | 检查方法 |
|---|---|
| 没有原生预览或文件操作 | 核对 DSH 版本和原生组件。本包不增加 UI。 |
| Windows 操作失败 | 核对 Python 3、`wslpath`、WSL 互通和桌面会话。 |
| 打开的应用不对 | 核对 Windows 默认应用和文件关联。 |
| 返回成功但 Explorer 没选中文件 | 核对文件存在性，并查看 Explorer 窗口。 |
| 视频或 Office 文件不能显示 | 核对编解码器、应用安装、文件完整性和安全提示。 |

不要在公开 issue 中发布私有路径、配置备份、令牌或个人截图。
使用合成文件名和脱敏错误。

## 开发

```sh
npm run build
npm test
node --check lib/host.mjs
```

自动检查不证明桌面行为，也不证明全部格式兼容。
命令和人工实测要求见[验证矩阵](<VALIDATION.md>)。

## 许可证

MIT，见 [LICENSE](<LICENSE>)。
