# Security / 安全说明

## Trust boundary / 信任边界

This host-only plugin targets a trusted personal DSH Host in WSL.
It is not a multi-user desktop security boundary.
DSH owns authentication, filesystem mapping, and native file-action policy.
The plugin adds no front-end module, HTTP metadata endpoint, existence-check route, or user-path normalizer.
It adds no command-execution API.

本 host-only 插件面向 WSL 中可信的个人 DSH Host，不是多用户桌面安全边界。
认证、文件系统映射和原生文件操作策略由 DSH 负责。
插件不增加前端模块、HTTP 元数据接口、存在性检查路由、用户路径规范化器或命令执行 API。

## Desktop effects / 桌面影响

Result-file clicks should use native Web preview where supported.
Only an explicit Windows open or Explorer reveal choice should trigger desktop operations.
The native split-button menu includes Explorer reveal. The plugin adds no duplicate buttons.
Authenticated users with native file-action access can affect the Host's Windows desktop.
Do not share that access with untrusted users.

结果文件点击应优先使用可用的原生网页预览。
只有主动选择 Windows 打开或 Explorer 定位时，才应触发桌面操作。
Explorer 定位在原生分体按钮菜单中，插件不新增重复按钮。
拥有原生文件操作权限的认证用户能影响 Host 的 Windows 桌面，不要向不可信用户开放此权限。

Only open trusted files.
Default applications can execute programs, scripts, or document macros.
Applications and file associations must exist on Windows.
The plugin does not bypass Office Protected View, application prompts, codec limits, or Windows execution policy.
A phone visitor still affects the Host computer, not the phone.

只打开可信文件。默认应用可能执行程序、脚本或文档宏。
Windows 必须安装对应应用并配置文件关联。
插件不绕过 Office 受保护视图、应用提示、编解码器限制或 Windows 执行策略。
手机访问者触发的桌面操作仍发生在 Host 电脑上。

Handoff does not prove file existence, a visible window, Explorer selection, or playback.
Native Explorer delegation may return `ok` for a missing file.
This plugin does not add an existence check or change that behavior.
Check the actual application when the result matters.

handoff 不证明文件存在、窗口出现、Explorer 选中或播放成功。
原生 Explorer 委托对不存在的文件也可能返回 `ok`。
插件不增加存在性检查，不改变该行为。重要结果需核对实际应用。

## Adapter scope / 适配器范围

The Host effect appends the private command directory to `PATH`.
This affects all Host child processes, including agent shells.
Existing earlier commands keep priority.
Python shims invoke Windows executables with argument arrays and `execv`, not constructed shell command strings.
They use `/usr/bin/wslpath` and check WSL interoperation socket connectivity.

Host effect 向 `PATH` 末尾追加私有命令目录，影响所有 Host 子进程，包括 agent shell。
已有的前序命令保持优先。
Python shim 使用参数列表和 `execv` 调用 Windows 程序，不拼接 shell 命令字符串。
它通过 `/usr/bin/wslpath` 并检查 WSL 互通套接字连通性。

The PowerShell shim converts its temporary script operand when needed.
The shims set `WSL_INTEROP` only in their own processes.
They do not change the Host's global `WSL_INTEROP`.
There is no additional panel-level path filter. DSH retains its native policy and limitations.

PowerShell shim 按需转换临时脚本参数。
shim 仅在自己的进程内设置 `WSL_INTEROP`，不修改 Host 全局值。
没有额外的面板路径过滤器，沿用 DSH 原生策略及限制。

## Configuration and data / 配置与数据

There is no telemetry or upload endpoint.
The plugin does not read conversation logs or account credentials.
The installer must read the selected profile to preserve its text.
Its private backup contains the initial configuration snapshot and can contain secrets.
Never publish backups, runtime metadata, or private configuration.

没有遥测或上传接口，插件不读取对话日志或账号凭据。
安装器需要读取选定的 profile 以保留其文字。
私有备份包含最初读取的配置快照，可能含密钥。
不得公开备份、运行时元数据或私有配置。

Stop all other configuration writers before installation or removal.
The exclusive `wx` lock coordinates only this installer.
Private temporary files and same-directory rename prevent partial replacement, not races with other writers.
The final reread and rename are not an atomic compare-and-swap.
Remove stale locks only after manually checking that their owners stopped.

安装和卸载前，先停止所有其他配置写入者。
排他 `wx` 锁只协调本安装器。
私有临时文件和同目录 rename 避免部分替换，不能阻止其他写入者的竞争。
最终重读与 rename 不是原子比较交换。
必须人工确认持有者已停止，才能清理陈旧锁。

## Reporting / 报告问题

Use synthetic filenames and redacted errors in public issues.
Do not include secrets, private paths, personal screenshots, business data, or specific private test logs.
Use GitHub private vulnerability reporting if the repository enables it.
Do not publish exploit details before a fix is available.

公开 issue 只使用合成文件名和脱敏错误。
不要包含密钥、私有路径、个人截图、业务数据或具体私有测试日志。
仓库启用 GitHub 私密漏洞报告时，可使用该渠道。
修复可用前，不公开利用细节。
