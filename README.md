# routine-taskboard

A sidebar-mounted **routine board** for the DSH Web GUI: every long-lived
scheduled job (Windows 计划任务 / KAi cron) renders as one row — schedule,
carrier, dependency scripts (numbered steps, clickable, individually
runnable), typed input/output artifacts, and a business health lamp.

> v0.1.3 — configuration-driven: all machine-specific mappings live in a user
> config file outside the plugin, so plugin upgrades never clobber them.

## Install

```sh
dsh plugin --profile web add routine-taskboard
```

Restart `dsh web`. A **例行看板** entry appears in the sidebar; clicking it
toggles the board inside the conversation column (mutually exclusive with the
other dsh board panels).

## What you get

- **Board view** — 计划名称 / 时间 / 载体 / 依赖脚本 / 输入文件 / 输出文件,
  fed by `GET /dsh-taskboard/state` with a built-in fixture fallback.
- **Row actions** — ▶ 启动 (`schtasks /Run`), ⏸ 停用 (`/DISABLE`),
  ↻ 重新上线 (`/ENABLE`) for Windows-scheduled carriers.
- **Script steps** — multi-script jobs render as numbered steps; each step is
  clickable (reveal in Explorer) and has its own ▶ to run just that script
  (interpreter picked by extension: py/ps1/bat/vbs/mjs).
- **Health lamps** — green/red left border driven by the pipeline ledger.

## User configuration (optional, recommended)

Machine-specific paths and curated mappings are **not** shipped. Create:

    $DSH_HOME/storages/routine-taskboard.config.json

```json
{
  "pipelineFile": "D:/data/pipeline_status.json",
  "scriptBases": [["^ops-automation[\\\\/]", "D:\\work\\ops-automation\\\\"], ["^douyin_update\\\\.py$", "D:\\work\\douyin\\\\douyin_update.py"]],
  "ioMap": { "douyin-update": { "input": "D:\\data\\门店记录表.xlsx", "output": "D:\\data\\维表.xlsx" } },
  "ioByTitle": [{ "match": "临时区清理", "input": "D:\\work\\temp", "output": "" }],
  "scriptMap": { "daily-report": [{ "label": "run.bat", "path": "D:\\work\\daily-report\\run.bat" }] },
  "scriptByTitle": [{ "match": "会话守护", "scripts": [{ "label": "guard.ps1", "path": "D:\\x\\guard.ps1" }] }],
  "pathHints": { "依赖文档": "D:\\data\\依赖文档\\\" }
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
| `/routine-taskboard/fixtures` | GET | built-in fallback fixtures |
| `/routine-taskboard/pipeline` | GET | pipeline ledger contents |
| `/routine-taskboard/config` | GET | user config for the client |
| `/routine-taskboard/open` | POST | reveal a path in Explorer |
| `/routine-taskboard/run` | POST | `schtasks /Run` |
| `/routine-taskboard/state` | POST | `schtasks /Change /DISABLE|/ENABLE` |
| `/routine-taskboard/run-script` | POST | run one script detached |

## Development

```sh
node --check lib/index.js && node --check lib/client.js
```

## License

MIT © Amoss-1
