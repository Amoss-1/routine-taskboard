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
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

export const inject = ['webServer']

/** Route prefix every handler below lives under. */
const PREFIX = '/routine-taskboard'
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
