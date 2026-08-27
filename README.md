# routine-taskboard

A dedicated registry of **long-lived scheduled infrastructure placards** for
the DSH Web GUI — the 设施 (fixture) view. Unlike a work-order board, these
cards have no done state: each row carries its own schedule, carrier, business
health key, entry script and typed input/output artifacts.

> v0.1.0 — MVP: host-authoritative fixture registry + read-only fixture panel.
> Dual-source health lamps (⚙️ OS facts vs 🩺 business self-report) and
> artifact freshness (📤 file mtime) land in the P2 collector pass.

## Install (this machine / link)

```sh
dsh plugin --profile web add link:D:\AI软件\deepseek-harness\dsh-plugins\routine-taskboard
```

Restart `dsh web`, then click the **🔁 Routine** button (bottom-right) to open
the fixture panel.

## What you get

- **Fixture registry** — host-authoritative placards persisted under
  `DSH_HOME/storages/routine-taskboard.json`, exposed via
  `GET /routine-taskboard/fixtures`.
- **Fixture panel** — Web GUI view listing 排程 / 载体 / 业务键 / 入口脚本.
- **Health probe** — `GET /routine-taskboard/health`.

## Development

```sh
git clone https://github.com/Amoss-1/routine-taskboard.git
cd routine-taskboard
node --check lib/index.js && node --check lib/client.js
```

## License

MIT © Amoss-1
