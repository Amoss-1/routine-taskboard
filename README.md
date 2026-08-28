# routine-taskboard

A sidebar-mounted **routine board** for the DSH Web GUI: every long-lived
scheduled job (Windows 计划任务 / KAi cron) renders as one row — schedule,
carrier, dependency scripts (numbered steps, clickable, individually
runnable), typed input/output artifacts, and a health lamp.

> **Fully self-contained since v0.1.9.** The board is driven by the plugin's
> own fixture registry — it does **not** depend on the official `dsh-taskboard`
> plugin or its `/dsh-taskboard/state` API. All machine-specific mappings live
> in a user config file outside the package, so upgrades never clobber them.

## Install

```sh
dsh plugin --profile web add routine-taskboard
```

Restart `dsh web`. A **例行看板** entry appears in the sidebar; clicking it
toggles the board inside the conversation column (mutually exclusive with the
other dsh board panels).

## What you get

- **Board view** — 计划名称 / 时间 / 载体 / 依赖脚本 / 输入文件 / 输出文件,
  fed by the plugin's own `GET /routine-taskboard/fixtures` registry.
- **Row actions** — ▶ 启动 (`schtasks /Run`), ⏸ 停用 (`/DISABLE`),
  ↻ 重新上线 (`/ENABLE`) for Windows-scheduled carriers. Buttons adapt to
  state: a disabled task only shows 重新上线; an active one shows 启动+停用.
- **Script steps** — multi-script jobs render as numbered steps (`1. 2. 3.`);
  each step is clickable (reveal in Explorer) and has its own ▶ to run just
  that script (interpreter picked by extension: py/ps1/bat/vbs/mjs/js).
- **Health lamps & badges** — three states: 运行中 (green) / 已停用 (amber) /
 异常 (red), with a text badge next to the plan name.

## Fixture registry (the board's own data)

The board renders from `$DSH_HOME/storages/routine-taskboard.json` — an array
of placards (`id / name / time / carrier / taskName / scripts / input / output /
healthKey / status`). Ships empty; register cards via the host API or seed the
file directly. It is fully independent of any other plugin.

## User configuration (optional, recommended)

Machine-specific paths and curated mappings are **not** shipped. Create:

    $DSH_HOME/storages/routine-taskboard.config.json

```json
{
  "pipelineFile": "D:/data/pipeline_status.json",
  "scriptBases": [["^ops-automation[\\\\/", "D:\\work\\ops-automation\\"], ["^douyin_update\\.py$", "D:\\work\\douyin\\douyin_update.py"]],
  "ioMap": { "douyin-update": { "input": "D:\\data\\门店记录表.xlsx", "output": "D:\\data\\维表.xlsx" } },
  "ioByTitle": [{ "match": "临时区清理", "input": "D:\\work\\temp", "output": "" }],
  "scriptMap": { "daily-report": [{ "label": "run.bat", "path": "D:\\work\\daily-report\\run.bat" }] },
  "scriptByTitle": [{ "match": "会话守护", "scripts": [{ "label": "guard.ps1", "path": "D:\\x\\guard.ps1" }] }],
  "pathHints": { "依赖文档": "D:\\data\\依赖文档\\" }
}
```

- `pipelineFile` — business health ledger (`{tasks:{key:{status,note}}}`);
  `RTB_PIPELINE_FILE` env is the fallback.
- `scriptBases` — `[regexSource, absoluteBase]` pairs turning relative script
  tokens from card descriptions into absolute paths.
- `ioMap` / `ioByTitle` — curated input/output overrides keyed by health key
  or title substring (they beat regex extraction).
- `scriptMap` / `scriptByTitle` — curated script-step lists for cards whose
  descriptions undersell the real pipeline.
- `pathHints` — folder bases used to complete relative artifact names.

Absent file = fully generic behavior (regex extraction only). The file is
read at plugin start and served to the client via `GET /routine-taskboard/config`.

## Routes (host)

| Route | Method | Purpose |
| --- | --- | --- |
| `/routine-taskboard/fixtures` | GET | the board's own fixture registry |
| `/routine-taskboard/pipeline` | GET | pipeline ledger contents |
| `/routine-taskboard/config` | GET | user config for the client |
| `/routine-taskboard/open` | POST | reveal a path in Explorer |
| `/routine-taskboard/run` | POST | `schtasks /Run` |
| `/routine-taskboard/state` | POST | `schtasks /Change /DISABLE|/ENABLE` |
| `/routine-taskboard/run-script` | POST | run one script detached |

## Development & contributing

Anyone can pick this up. Source of truth:

```sh
git clone https://github.com/Amoss-1/routine-taskboard.git
cd routine-taskboard
```

### Layout

```
lib/index.js   # host: routes + fixture registry + config loading (node)
lib/client.js  # web client: board UI, sidebar entry, actions (browser)
cordis.patch.yml  # bundle patch: registers the plugin row in a profile
README.md, LICENSE, package.json
```

### How the host mounts

`lib/index.js` exports `name`, `inject`, and `apply(ctx)`. Route registration
lives under the workspace/agent/web chain — mirror the official pattern:

```js
ctx.inject(['workspaceRegistry'], (wsCtx) => {
  wsCtx.inject(['agents'], (agentCtx) => {
    agentCtx.inject(['webServer'], (webCtx) => {
      webCtx.webServer.register({ kind: 'prefix', path: '/routine-taskboard', handler })
    })
  })
})
```

`webServer` is **not** available at the top level of a normal plugin's `ctx`.

### Local iteration

1. Edit `lib/*.js`; syntax-check: `node --check lib/index.js && node --check lib/client.js`.
2. Host changes: copy into the profile and restart `dsh web`.
3. Client changes: the browser hard-refresh (Ctrl+Shift+R) is enough.
4. The start script only force-restarts when a profile `package.json`/lock
   file changed; after manual host edits, touch `cordis.patch.yml` (mtime) or
   use a forced restart.

### Release

1. Bump `version` in `package.json`.
2. `npm publish` (verify the tarball contains `lib/index.js` + `lib/client.js`
   — a broken package missing `lib/` was once published; check `npm pack --dry-run`).
3. Push the same files to the GitHub repo (`Amoss-1/routine-taskboard`).
4. Users update through the plugin market; upgrades never touch
   `$DSH_HOME/storages/routine-taskboard.config.json` or the fixture registry.

## License

MIT © Amoss-1