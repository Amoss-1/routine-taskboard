/**
 * routine-taskboard — host half.
 *
 * A dedicated registry of long-lived scheduled infrastructure placards for
 * the DSH Web GUI. Unlike a work-order board, these cards have no done state:
 * each is a row in the 设施 (fixture) view carrying its own schedule, carrier
 * (windows task / kai-cron / ai-session), business health key, entry script
 * and typed input/output artifacts.
 *
 * v0.1.0 scope (MVP):
 *  - host-authoritative fixture registry persisted under DSH_HOME/storages
 *  - GET /routine-taskboard/health  — plugin liveness probe
 *  - GET /routine-taskboard/fixtures — the registry snapshot (client renders)
 *
 * All state stays on this machine; routes answer only same-origin loopback
 * requests (the DSH webserver binds loopback by itself).
 */
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { spawn } from 'node:child_process'

export const inject = ['webServer']

/** Route prefix every handler below lives under. */
const PREFIX = '/routine-taskboard'
/**
 * User configuration (NOT shipped with the plugin): read from
 * $DSH_HOME/storages/routine-taskboard.config.json so plugin upgrades never
 * clobber it. Holds the pipeline ledger path plus curated input/output and
 * script mappings. Absent file = generic behavior (regex extraction only).
 */
let userConfig = {}
function loadUserConfig() {
  const home = process.env.DSH_HOME || join(process.env.USERPROFILE || '.', '.dsh')
  try {
    userConfig = JSON.parse(readFileSync(join(home, 'storages', 'routine-taskboard.config.json'), 'utf8'))
  } catch {
    userConfig = {}
  }
  return userConfig
}
/** Plugin version surfaced by /health. */
export const PLUGIN_VERSION = '0.1.0'

//#region fixture registry storage
let fixtureFile = null
let fixtures = new Map()

function initStorage() {
  if (fixtureFile !== null) return
  const home = process.env.DSH_HOME || join(process.env.USERPROFILE || '.', '.dsh')
  try {
    const dir = join(home, 'storages')
    mkdirSync(dir, { recursive: true })
    fixtureFile = join(dir, 'routine-taskboard.json')
  } catch {
    fixtureFile = join(home, 'routine-taskboard.json')
  }
}

function loadFixtures() {
  initStorage()
  try {
    const raw = readFileSync(fixtureFile, 'utf8')
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) {
      fixtures = new Map(parsed.map((f) => [String(f.id), f]))
    }
  } catch {
    // First run or unreadable file: start empty.
  }
}

function persistFixtures() {
  initStorage()
  const list = [...fixtures.values()]
  writeFileSync(fixtureFile, JSON.stringify(list, null, 2), 'utf8')
}

/**
 * Register (or update) one fixture placard. Idempotent by id.
 */
export function registerFixture(f) {
  initStorage()
  loadFixtures()
  const id = String(f.id)
  fixtures.set(id, {
    id,
    title: String(f.title ?? id),
    schedule: typeof f.schedule === 'string' ? f.schedule : undefined,
    carrier: typeof f.carrier === 'string' ? f.carrier : undefined,
    taskName: typeof f.taskName === 'string' ? f.taskName : undefined,
    healthKey: typeof f.healthKey === 'string' ? f.healthKey : undefined,
    script: typeof f.script === 'string' ? f.script : undefined,
    inputs: Array.isArray(f.inputs) ? f.inputs.map(String) : undefined,
    outputs: Array.isArray(f.outputs) ? f.outputs.map(String) : undefined,
    updatedAt: Date.now(),
  })
  persistFixtures()
  return id
}

/** Snapshot of all registered fixtures (plain array, insertion order). */
export function listFixtures() {
  initStorage()
  loadFixtures()
  return [...fixtures.values()]
}

/** Remove one placard by id; returns true when it existed. */
export function unregisterFixture(id) {
  initStorage()
  loadFixtures()
  const existed = fixtures.delete(String(id))
  if (existed) persistFixtures()
  return existed
}
//#endregion

/** Minimal same-origin guard: only loopback hosts may call these routes. */
function trusted(req) {
  const host = req.headers?.host ?? ''
  return host.startsWith('127.0.0.1') || host.startsWith('localhost') || host.startsWith('[::1]')
}

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload)
  res.statusCode = status
  res.setHeader('content-type', 'application/json; charset=utf-8')
  res.setHeader('content-length', Buffer.byteLength(body))
  res.end(body)
}

/** The plugin entry: registers routes on the shared DSH webserver. */
export function apply(ctx) {
  ctx.effect(() => {
    loadUserConfig()
    ctx.webServer.register({
      kind: 'prefix',
      path: PREFIX,
      handler: async (req, res) => {
        const url = req.url ?? '/'
        const pathname = decodeURIComponent(new URL(url, 'http://x').pathname)
        const rest = pathname.slice(PREFIX.length + 1)
        if (!trusted(req)) return sendJson(res, 403, { ok: false, error: 'cross-origin request refused' })
        try {
          if (rest === 'health' || rest === 'ping') {
            return sendJson(res, 200, { ok: true, plugin: 'routine-taskboard', version: PLUGIN_VERSION })
          }
          if (rest === 'fixtures' && req.method === 'GET') {
            return sendJson(res, 200, { ok: true, fixtures: listFixtures() })
          }
          if (rest === 'pipeline' && req.method === 'GET') {
            const pipelineFile = userConfig.pipelineFile || process.env.RTB_PIPELINE_FILE || ''
            if (pipelineFile === '') return sendJson(res, 200, { ok: false, error: 'pipeline file not configured (storages/routine-taskboard.config.json or RTB_PIPELINE_FILE)' })
            try {
              const parsed = JSON.parse(readFileSync(pipelineFile, 'utf8'))
              return sendJson(res, 200, { ok: true, tasks: parsed.tasks, updated: parsed._updated })
            } catch (error) {
              return sendJson(res, 200, { ok: false, error: 'pipeline_status unreadable: ' + (error?.message ?? String(error)) })
            }
          }
          if (rest === 'config' && req.method === 'GET') {
            if (userConfig.pipelineFile === undefined) loadUserConfig()
            return sendJson(res, 200, {
              ok: true,
              scriptBases: Array.isArray(userConfig.scriptBases) ? userConfig.scriptBases : [],
              ioMap: userConfig.ioMap && typeof userConfig.ioMap === 'object' ? userConfig.ioMap : {},
              ioByTitle: Array.isArray(userConfig.ioByTitle) ? userConfig.ioByTitle : [],
              scriptMap: userConfig.scriptMap && typeof userConfig.scriptMap === 'object' ? userConfig.scriptMap : {},
              scriptByTitle: Array.isArray(userConfig.scriptByTitle) ? userConfig.scriptByTitle : [],
              pathHints: userConfig.pathHints && typeof userConfig.pathHints === 'object' ? userConfig.pathHints : {},
            })
          }
          if (rest === 'open' && req.method === 'POST') {
            let body = ''
            for await (const chunk of req) body += chunk
            const payload = JSON.parse(body || '{}')
            const target = typeof payload?.path === 'string' ? payload.path : ''
            if (target === '' || !existsSync(target)) return sendJson(res, 400, { ok: false, error: 'path missing or not found: ' + target })
            const isDir = statSync(target).isDirectory()
            const child = spawn('explorer.exe', isDir ? [target] : ['/select,' + target], { detached: true, stdio: 'ignore' })
            child.unref()
            return sendJson(res, 200, { ok: true, opened: target })
          }
          if (rest === 'run' && req.method === 'POST') {
            let body = ''
            for await (const chunk of req) body += chunk
            const payload = JSON.parse(body || '{}')
            const taskName = typeof payload?.task === 'string' ? payload.task : ''
            if (taskName === '') return sendJson(res, 400, { ok: false, error: 'task required' })
            const result = await new Promise((resolve) => {
              const child = spawn('schtasks.exe', ['/Run', '/TN', taskName], { windowsHide: true })
              let out = ''
              child.stdout.on('data', (d) => { out += d })
              child.stderr.on('data', (d) => { out += d })
              child.on('close', (code) => resolve({ code, out }))
            })
            const okRun = result.code === 0
            return sendJson(res, okRun ? 200 : 500, { ok: okRun, task: taskName, code: result.code, out: result.out.trim().slice(0, 400) })
          }
          if (rest === 'run-script' && req.method === 'POST') {
            let body = ''
            for await (const chunk of req) body += chunk
            const payload = JSON.parse(body || '{}')
            const scriptPath = typeof payload?.path === 'string' ? payload.path : ''
            if (scriptPath === '' || !existsSync(scriptPath)) return sendJson(res, 400, { ok: false, error: 'script path missing or not found' })
            const ext = scriptPath.split('.').pop().toLowerCase()
            const cfg = {
              py: ['python', [scriptPath]],
              ps1: ['powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', scriptPath]],
              bat: ['cmd.exe', ['/c', scriptPath]],
              cmd: ['cmd.exe', ['/c', scriptPath]],
              vbs: ['wscript.exe', [scriptPath]],
              mjs: ['node', [scriptPath]],
              js: ['node', [scriptPath]],
            }[ext]
            if (!cfg) return sendJson(res, 400, { ok: false, error: 'unsupported script type: ' + ext })
            try {
              const child = spawn(cfg[0], cfg[1], { cwd: dirname(scriptPath), windowsHide: true, detached: true, stdio: 'ignore' })
              child.unref()
              return sendJson(res, 200, { ok: true, started: scriptPath, cmd: cfg[0] })
            } catch (error) {
              return sendJson(res, 500, { ok: false, error: error?.message ?? String(error) })
            }
          }
          if (rest === 'state' && req.method === 'POST') {
            let body = ''
            for await (const chunk of req) body += chunk
            const payload = JSON.parse(body || '{}')
            const taskName = typeof payload?.task === 'string' ? payload.task : ''
            const action = payload?.action === 'enable' ? 'enable' : payload?.action === 'disable' ? 'disable' : ''
            if (taskName === '' || action === '') return sendJson(res, 400, { ok: false, error: 'task + action(enable|disable) required' })
            const result = await new Promise((resolve) => {
              const child = spawn('schtasks.exe', ['/Change', '/TN', taskName, action === 'disable' ? '/DISABLE' : '/ENABLE'], { windowsHide: true })
              let out = ''
              child.stdout.on('data', (d) => { out += d })
              child.stderr.on('data', (d) => { out += d })
              child.on('close', (code) => resolve({ code, out }))
            })
            const okState = result.code === 0
            return sendJson(res, okState ? 200 : 500, { ok: okState, task: taskName, action, code: result.code, out: result.out.trim().slice(0, 400) })
          }
          return sendJson(res, 404, { ok: false, error: 'unknown route ' + rest })
        } catch (error) {
          return sendJson(res, 200, { ok: false, error: error?.message ?? String(error) })
        }
      },
    })
  }, 'routine-taskboard: routes')
  ctx.logger.info('routine-taskboard: routes ready under %s', PREFIX)
}

/** Storage location diagnostics (used by tests and /health debugging). */
export function storagePath() {
  initStorage()
  return fixtureFile
}
