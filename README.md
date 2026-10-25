# DSH Windows Open

**Preview result files in DSH Web first. Choose Windows only when you need a desktop application or Explorer.**

This host-only bridge helps DSH running in WSL find Windows commands.
It reuses DSH's native preview, document, and deliverables actions.
It adds no sidebar, path input, or duplicate buttons.

[中文说明](<README.zh-CN.md>) · [Security](<SECURITY.md>) · [Validation](<VALIDATION.md>)

## What it does

| Your task | Preferred action |
|---|---|
| Read Markdown (`.md`), PNG, PDF, or TXT | Click the result file for DSH Web preview. |
| Open XLSX, PPTX, DOCX, or DOC without browser support | Use DSH's Windows application prompt or native open action. |
| Edit a file in an installed Windows application | Explicitly choose the native action for the Windows default application. |
| Locate a result file | Explicitly choose the native Explorer action to request file selection. |
| Play a video outside the browser | Explicitly choose the Windows default player. Codec support still applies. |

**A normal result-file click should keep the native Web preview where supported.**
Only an explicit choice to open in Windows or reveal in Explorer should trigger the desktop.
The plugin does not add Office previews to the browser.
Native actions use a split button and menu, not two fixed, separate buttons.
The main label can be `Open in <app>`. The menu includes **Show file location**.
Without a detected default association, the main action may fall back to **Show file location**.
Labels, prompts, and available actions depend on the DSH version, file type, and default association.
Final desktop behavior still needs integration checks. See the [validation matrix](<VALIDATION.md>).

Desktop actions affect the Windows computer that runs DSH through WSL.
A visitor using a phone does not open the file on that phone.

## Markdown for developers and agent users

Read an agent's plan, report, `README.md`, or `AGENTS.md` in the Web preview first.
When you want to edit it, use the action beside the file:

1. Click the filename for DSH Web preview. This does not launch a Windows application.
2. Click `Open in <app>` to use the Windows default application for `.md` files.
3. Open the adjacent menu to select another registered application.
4. Choose **Show file location** in that menu to locate and select the file in Explorer.

For example, Windows can associate `.md` with a Markdown editor or a code editor.
The menu lists applications reported by Windows, not every installed program.
This package does not install editors or change your default association.

## Who this is for

- You run DSH Web inside WSL on a Windows computer.
- Your agent creates images, reports, Office documents, or videos.
- You prefer Web preview, with installed Windows applications available when needed.
- Native desktop actions fail because the DSH service has a Linux-only `PATH`.

This package is not a file manager, remote desktop, or cloud player.
A Linux VPS without a Windows desktop is outside its scope.

## Install

### 1. Check requirements

- DSH Web with native file preview, open, and reveal actions.
- WSL with Windows interoperation enabled and the Windows system drive mounted.
- Node.js 22 or later, Python 3, and `/usr/bin/wslpath`.
- Windows installed at `C:\Windows`, with the required applications installed and file associations configured.

The initial compatibility target is **DSH 0.2.1-rc.2**.
Other versions and Windows layouts need separate checks.
This target does not imply compatibility with every format or application version.

### 2. Get and build the package

```sh
git clone https://github.com/XanderChen0530/dsh-windows-open.git
cd dsh-windows-open
npm run build
npm test
```

There are no npm dependencies.
The build generates `lib/host.mjs`. It generates no browser module.
Keep the cloned directory in place while the plugin is active.

### 3. Register the plugin

Stop all other profile/configuration writers first.
The installer lock coordinates only copies of this installer.

```sh
node scripts/profile.mjs install --profile web
```

For a custom DSH data directory, replace the placeholder:

```sh
node scripts/profile.mjs install --profile web --dsh-home /path/to/dsh-home
```

The installer supports comments with an empty `[]` profile and existing block-list profiles.
It adds one marked block and preserves unrelated text.
It rejects conflicting entries, edited markers, and unsupported root structures.

It creates an exclusive `wx` lock and a private backup of the initial configuration snapshot.
It writes a private temporary file in the same directory, then replaces the profile through rename.
This prevents partial replacement, not concurrent changes by other configuration writers.
Backups can contain configuration secrets. Keep them private.
Remove a stale lock only after manually checking that its owner stopped.

Restart DSH when no tasks are running. Then refresh the page.
The installer does not stop or restart your service.

## Use the existing file actions

1. Click a result file in the conversation or native deliverables view.
2. Use the native Web preview when the browser supports the file.
3. Choose the native Windows default-application action only when you need it.
4. Open the native split-button menu and choose **Show file location** to locate and select the file.

Markdown (`.md`), PNG, PDF, and TXT can use browser previews.
For XLSX, PPTX, DOCX, and DOC without browser support, DSH should offer Windows opening instead.
This plugin supplies the command bridge, not those prompts or previews.
The [validation matrix](<VALIDATION.md>) separates required behavior from observed results.

The plugin does not install Office, WPS, PDF readers, players, or codecs.
Windows needs an installed application and a file association for the selected type.
Office can show Protected View or other security prompts for WSL files.
Do not disable document protection to make a test pass.

## How it works

```text
Result-file click -> DSH native Web preview where supported
Explicit Windows open/reveal choice
    -> DSH native authenticated file action and filesystem mapping
    -> PATH adapter -> Windows application or Explorer
```

1. `src/index.mjs` adds the private `bin` directory to the end of the Host's `PATH` through an effect.
2. Existing commands earlier in `PATH` keep priority. Effect cleanup removes the added entry.
3. Python shims supply `explorer.exe` and `powershell.exe` when the service cannot find Windows commands.
4. The shims use `wslpath` and a live WSL interoperation socket to locate and invoke Windows programs.
5. They pass argument arrays through `execv`. The PowerShell shim converts its temporary script operand when needed.

There is no front-end module, HTTP metadata endpoint, check route, or user-path normalizer.
DSH owns the preview, document, and deliverables buttons, authentication, and file-action policy.
The package does not change DSH bundles or historical messages.

## Safety and limits

**Only open files you trust.**
A Windows application can execute programs, scripts, or document macros.
The bridge is not a security sandbox.
Authenticated users with native file-action access can trigger desktop operations on the Host computer.
Do not expose a trusted personal Host to untrusted users.

The `PATH` addition affects all Host child processes, including agent shells.
The shims set `WSL_INTEROP` only in their own processes.
They do not change the Host's global `WSL_INTEROP` or Windows execution policy.

**Handoff does not prove file existence, a visible window, Explorer selection, or video playback.**
Native Explorer delegation may still return `ok` for a missing file.
This plugin does not add an existence check or change that native behavior.
Check the actual application or Explorer selection when the result matters.

Video playback depends on the player and codec.
Office behavior depends on installed applications, associations, and document protection.
The bridge does not fix missing files, remote paths, malformed links, or unsupported formats.
See [Security](<SECURITY.md>) for the trust boundary.

## Uninstall

Stop other configuration writers first.

```sh
node scripts/profile.mjs uninstall --profile web
```

Use the same `--dsh-home` option if installation used a custom directory.
Restart DSH when no tasks are running. Then refresh the page.
The installer removes only its marked block and preserves unrelated text.
It does not remove result files or the cloned directory.
Backups remain private and local. Review obsolete backups before removing them.

## Troubleshooting

| Symptom | Check |
|---|---|
| No native preview or file action | Check the DSH version and native components. This package adds no UI. |
| Windows action fails | Check Python 3, `wslpath`, WSL interoperation, and the desktop session. |
| Wrong application opens | Check the Windows default application and file association. |
| Explorer selects nothing despite success | Check file existence and inspect the Explorer window. |
| Video or Office file does not show | Check codecs, installed applications, file integrity, and security prompts. |

Do not post private paths, profile backups, tokens, or personal screenshots in public issues.
Use synthetic filenames and redacted errors.

## Development

```sh
npm run build
npm test
node --check lib/host.mjs
```

Automated checks do not prove desktop behavior or universal format support.
See [Validation](<VALIDATION.md>) for commands and the required manual matrix.

## Independent review

Two independent model reviewers audited the frozen candidate:

- **Architect pass:** Claude Opus 5.5 at high reasoning effort.
- **Oracle pass:** GPT 6 Astra at high reasoning effort.

Both reported PASS for the reviewed code. The architect pass also reviewed the final documentation.
Review led to these changes:

- The package no longer adds a UI panel.
- The interop-socket check now probes a live socket.
- The installer handles more profile formats.
- The button labels match DSH.

Missing files can still report success. See [Safety and limits](<#safety-and-limits>).
Review is static reading plus supplied evidence. It does not replace a desktop test on your computer.

## License

MIT. See [LICENSE](<LICENSE>).
