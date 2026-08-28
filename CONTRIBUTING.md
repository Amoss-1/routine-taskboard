# Contributing to routine-taskboard

Thanks for wanting to make this plugin better! This is a small, focused DSH
plugin and every kind of contribution is welcome — bug reports, UI polish,
new card parsers, docs, tests, and feature ideas.

## Project basics

- Repo: <https://github.com/Amoss-1/routine-taskboard>
- Package: `routine-taskboard` on npm (installed via the DSH plugin market).
- License: MIT — fork, modify, and redistribute freely.
- Scope: a **self-contained routine board**. It must never depend on the
  official `dsh-taskboard` plugin, and it must never ship user machine data
  (paths, credentials, business keys live in the user's config, not here).

## Before you start

1. A working DSH install (`dsh web`) with the plugin enabled, so you can
   verify behavior locally.
2. Node.js ≥ 20 (only used for `node --check` / `npm`).
3. Read `README.md` — it documents the config file, routes, and host mount.

## Filing a bug report

Open an issue and include:

- Plugin version (`package.json` or the market entry).
- DSH version and profile name.
- What you did, what you expected, what actually happened.
- For route/UI issues: the exact URL that failed (API routes are
  `/routine-taskboard/...`, NOT `/plugins/...`), and any DSH log lines.
- Your `$DSH_HOME/storages/routine-taskboard.config.json` **structure only**
  (redact real paths/values if you prefer).

## Sending a pull request

1. **Fork** the repo and create a branch: `git checkout -b fix/whatever`.
2. Make your change. Keep it small and focused — one concern per PR.
3. Run the syntax checks:

```sh
node --check lib/index.js
node --check lib/client.js
```

4. If you touched `lib/client.js`, test in the browser (hard refresh
   Ctrl+Shift+R after syncing the file into the profile's `node_modules`).
5. If you touched `lib/index.js`, restart `dsh web` and verify the routes
   (`/routine-taskboard/health` should answer 200 with JSON).
6. Update `README.md` when behavior or routes change.
7. Open the PR against `main`. Describe what changed and why, and include a
   screenshot for UI changes.

## Code conventions

- Two files, one job each:
  - `lib/index.js` — node host: routes, fixture registry, config loading.
  - `lib/client.js` — browser client: board UI, sidebar entry, actions.
- Routes live under the `/routine-taskboard` prefix; follow the existing
  `sendJson` / `trusted` helpers.
- Register the host exactly as documented: the `webServer` service is only
  reachable through the `workspaceRegistry → agents → webServer` inject
  chain — never assume `ctx.webServer` at the top level.
- **Never hardcode user paths or business keys** in shipped code. Everything
  machine-specific goes through `routine-taskboard.config.json`.
- Keep the UI readable on dark themes: prefer theme variables
  (`var(--dsw-*)`) over fixed colors.
- Plain JS (ESM), no build step, no framework dependencies beyond the
  predeclared React externals.

## Release checklist (maintainers)

1. Bump `version` in `package.json`.
2. `npm pack --dry-run` — confirm the tarball contains `lib/index.js` AND
   `lib/client.js` (a broken package without `lib/` shipped once; do not
   repeat it).
3. `npm publish`.
4. Mirror the published files to GitHub (`lib/*`, `package.json`, `README.md`).
5. Tag the release if you use tags.

Users update through the DSH plugin market; upgrades never touch
`$DSH_HOME/storages/routine-taskboard.config.json` or the fixture registry.

## Communication

- Issues and PRs are the source of truth — no separate chat channel.
- Be kind; small maintainers have small review queues.