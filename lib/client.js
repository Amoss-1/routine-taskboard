/* routine-taskboard client half — web GUI 例行看板.
 * Mirrors the dsh-taskboard mounting pattern: a sidebar entry row toggles a
 * kanban-style board rendered in the conversation column (same-origin fetch
 * against the host fixture registry).
 */
window.__ModuleLoader__.load({
  id: "routine-taskboard",
  factory: function (require) {
    var react_dom_client = require("react-dom/client");
    var react = require("react");
    var react_jsx_runtime = require("react/jsx-runtime");

    var PREFIX = "/routine-taskboard";
    var PLUGIN_ID = "routine-taskboard";
    var ENTRY_SELECTOR = "[data-rtb-entry]";
    var ACTIVE_ATTR = "data-rtb-board";
    var ACTIVATE_EVENT = "dsh-panel-activate";
    var PANEL_NAME = "routine-taskboard";
    var OTHER_ACTIVE_ATTRS = ["data-dsh-atb-active", "data-dsh-ssh-active", "data-dsh-mnemon-active"];
    var ICON = '<svg viewBox="0 0 16 16" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="2.5" width="12" height="11" rx="1.5"/><path d="M2 7h12M6.5 7v6.5M11 7v6.5"/></svg>';

    // #region styles (kanban look, own prefixed classes)
    var STYLE_TEXT = [
      "html[data-rtb-board] [data-pane='conversation'] > *:not([data-rtb-view]),",
      "html[data-rtb-board] [class*='centerCol'] > *:not([data-rtb-view]) { display: none !important; }",
      ".rtb-view-wrap { display: none; }",
      "html[data-rtb-board] .rtb-view-wrap { display: flex; flex-direction: column; height: 100%; overflow: hidden; }",
      ".rtb-entry { box-sizing: border-box; width: 100%; min-height: 36px;",
      "  color: var(--dsw-alias-label-secondary, var(--dsw-text-secondary, gray));",
      "  white-space: nowrap; cursor: pointer; background: transparent; border: none;",
      "  border-radius: 8px; align-items: center; gap: 10px; padding: 0 10px;",
      "  font-size: 13px; display: flex; }",
      ".rtb-entry:hover { color: var(--dsw-alias-label-primary, var(--dsw-text, inherit)); background: var(--dsw-alias-interactive-bg-hover, var(--dsw-hover, rgba(128,128,128,.12))); }",
      ".rtb-entry[data-active='true'] { color: var(--dsw-alias-label-primary, var(--dsw-text, inherit)); background: var(--dsw-alias-interactive-bg-active, var(--dsw-active, rgba(128,128,128,.18))); font-weight: 600; }",
      ".rtb-entry-icon { flex: none; justify-content: center; align-items: center; width: 24px; height: 24px; display: inline-flex; }",
      ".rtb-entry-icon svg { width: 18px; height: 18px; display: block; }",
      ".rtb-entry-label { text-overflow: ellipsis; overflow: hidden; }",
      ".rtb-entry-count { margin-left: auto; font-size: 11px; color: var(--dsw-alias-label-secondary, var(--dsw-text-secondary, gray)); font-variant-numeric: tabular-nums; }",
      "[data-dsh-frame][data-sidebar-collapsed] .rtb-entry { border-radius: 50%; justify-content: center; width: 36px; min-height: 36px; margin: 0 auto 12px; padding: 0; }",
      "[data-dsh-frame][data-sidebar-collapsed] .rtb-entry-label, [data-dsh-frame][data-sidebar-collapsed] .rtb-entry-count { display: none; }",
      "[data-sidebar-collapsed] .rtb-entry-label, [data-sidebar-collapsed] .rtb-entry-count { display: none; }",
      ".rtb-view { height: 100%; overflow: auto; padding: 14px 16px; }",
      ".rtb-bar { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; flex-wrap: wrap; }",
      ".rtb-title { font-size: 14px; font-weight: 600; }",
      ".rtb-sub { color: var(--dsw-text-secondary, gray); font-size: 12px; }",
      ".rtb-refresh { margin-left: auto; font: inherit; font-size: 12px; padding: 3px 10px;",
      "  border-radius: 999px; border: 1px solid var(--dsw-border, rgba(128,128,128,.3));",
      "  background: var(--dsw-bg, transparent); color: inherit; cursor: pointer; }",
      ".rtb-close { font: inherit; font-size: 15px; line-height: 1; padding: 2px 8px;",
      "  border-radius: 6px; border: none; background: transparent; color: inherit; cursor: pointer; }",
      ".rtb-close:hover { background: var(--dsw-hover, rgba(128,128,128,.15)); }",
      ".rtb-grid { display: grid; grid-template-columns: minmax(150px,1.4fr) 0.8fr 1.1fr 1.3fr 1fr 1fr;",
      "  gap: 10px; padding: 7px 10px; align-items: center; font-size: 12.5px; }",
      ".rtb-row[data-health='ok'] { border-left: 3px solid #30a46c; }",
      ".rtb-row[data-health='ok'] .rtb-nm { color: #30a46c; }",
      ".rtb-row[data-health='fail'] { border-left: 3px solid #e5484d; }",
      ".rtb-row[data-health='fail'] .rtb-nm { color: #e5484d; }",
      ".rtb-file { cursor: pointer; color: var(--dsw-alias-accent, #3e63dd); text-decoration: underline dotted;",
      "  overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }",
      ".rtb-file:hover { text-decoration: underline; }",
      ".rtb-nm-wrap { display: flex; align-items: center; gap: 6px; min-width: 0; }",
      ".rtb-run { flex: none; font: inherit; font-size: 11px; padding: 2px 7px; border-radius: 999px;",
      "  border: 1px solid var(--dsw-border, rgba(128,128,128,.35)); background: transparent; color: inherit;",
      "  cursor: pointer; white-space: nowrap; }",
      ".rtb-run:hover { background: var(--dsw-alias-interactive-bg-hover, rgba(128,128,128,.12)); color: var(--dsw-alias-label-primary, inherit); }",
      ".rtb-scripts { display: flex; flex-direction: column; gap: 2px; min-width: 0; }",
      ".rtb-script { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }",
      ".rtb-script-link { cursor: pointer; color: var(--dsw-alias-accent, #3e63dd); text-decoration: underline dotted; }",
      ".rtb-script-link:hover { text-decoration: underline; }",
      ".rtb-step { display: flex; align-items: center; gap: 4px; min-width: 0; }",
      ".rtb-step-run { flex: none; font: inherit; font-size: 10px; line-height: 1; padding: 1px 5px;",
      "  border-radius: 999px; border: 1px solid var(--dsw-border, rgba(128,128,128,.3)); background: transparent;",
      "  color: inherit; cursor: pointer; }",
      ".rtb-step-run:hover { background: var(--dsw-alias-interactive-bg-hover, rgba(128,128,128,.12)); }",
      ".rtb-th { color: var(--dsw-text-secondary, gray); font-size: 11px;",
      "  border-bottom: 1px solid var(--dsw-border, rgba(128,128,128,.25)); }",
      ".rtb-row { border-bottom: 1px solid var(--dsw-border, rgba(128,128,128,.15));",
      "  font-variant-numeric: tabular-nums; }",
      ".rtb-row:hover { background: var(--dsw-hover, rgba(128,128,128,.08)); }",
      ".rtb-nm { font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }",
      ".rtb-script { color: var(--dsw-text-secondary, gray); overflow: hidden;",
      "  text-overflow: ellipsis; white-space: nowrap; }",
      ".rtb-empty { padding: 22px 10px; color: var(--dsw-text-secondary, gray);",
      "  border: 1px dashed var(--dsw-border, rgba(128,128,128,.3)); border-radius: 10px;",
      "  text-align: center; }",
      ".rtb-err { padding: 12px; color: #e5484d; border: 1px solid rgba(229,72,77,.4);",
      "  border-radius: 8px; background: rgba(229,72,77,.08); }",
    ].join("\n");
    // #endregion

    // #region curated input/output map (audited against the filesystem)
    var IO_MAP ={};
    var IO_BY_TITLE =[];
    function ioFor(f) {
      if (f.healthKey && IO_MAP[f.healthKey]) return IO_MAP[f.healthKey];
      for (var i = 0; i < IO_BY_TITLE.length; i++) {
        if (f.name.indexOf(IO_BY_TITLE[i].match) >= 0) return IO_BY_TITLE[i];
      }
      return null;
    }
    // curated script lists (audited on disk) — override the regex extraction
    var SCRIPT_MAP ={};
    var SCRIPT_BY_TITLE =[];
    function scriptMapFor(f) {
      if (f.healthKey && SCRIPT_MAP[f.healthKey]) return SCRIPT_MAP[f.healthKey];
      for (var i = 0; i < SCRIPT_BY_TITLE.length; i++) {
        if (f.name.indexOf(SCRIPT_BY_TITLE[i].match) >= 0) return SCRIPT_BY_TITLE[i].scripts;
      }
      return null;
    }
    // #endregion

    // #region script extraction (steps + absolute paths)
    var SCRIPT_BASES = []
    var PATH_HINTS = {}
    function applyConfig(cfg) {
      if (!cfg) return
      SCRIPT_BASES = (cfg.scriptBases || []).map(function (p) { return [new RegExp(p[0]), p[1]] })
      IO_MAP = cfg.ioMap || {}
      IO_BY_TITLE = cfg.ioByTitle || []
      SCRIPT_MAP = cfg.scriptMap || {}
      SCRIPT_BY_TITLE = cfg.scriptByTitle || []
      PATH_HINTS = cfg.pathHints || {}
    }
    function loadConfig() {
      return fetch(PREFIX + "/config").then(function (r) { return r.json() }).then(function (j) { if (j.ok) applyConfig(j) }).catch(function () {})
    };
    function absScript(tok) {
      if (!tok) return "";
      if (/^[A-Za-z]:[\\/]/.test(tok)) return tok;
      for (var i = 0; i < SCRIPT_BASES.length; i++) {
        if (SCRIPT_BASES[i][0].test(tok)) return SCRIPT_BASES[i][1] + tok.replace(SCRIPT_BASES[i][0], "");
      }
      return "";
    }
    function extractScripts(d) {
      var list = [];
      var seen = {};
      function add(raw, label) {
        if (!raw) return;
        var parts = raw.split(/\s*\+\s*/);
        parts.forEach(function (p) {
          p = p.trim().replace(/^[（(]|[）)]$/g, "");
          if (!p) return;
          var m = p.match(/([\w.\\/:-]+\.(?:py|ps1|bat|vbs|mjs|js))/);
          var tok = m ? m[1] : "";
          var key = tok || p;
          if (seen[key]) return;
          seen[key] = true;
          var abs = absScript(tok);
          list.push({ label: (label ? label + " " : "") + p, path: abs || tok, ext: tok.match(/\.(\w+)$/)?.[1] || "" });
        });
      }
      var d0 = d || "";
      var sLine = "";
      d0.split("\n").forEach(function (line) {
        var i = line.indexOf("脚本：");
        if (i < 0) i = line.indexOf("脚本:");
        if (i >= 0 && line.indexOf("脚本区") < 0) sLine = line.slice(i + 3).trim();
      });
      add(sLine, "");
      var zLine = "";
      d0.split("\n").forEach(function (line) {
        var i = line.indexOf("脚本区");
        if (i >= 0) zLine = line.slice(i + 3).trim();
      });
      add(zLine, "");
      d0.split("\n").forEach(function (line) {
        if (/wscript|start_scheduled|\.vbs|\.bat/.test(line) && !line.includes("脚本") && !line.includes("载体")) add(line.trim(), "");
      });
      return list;
    }
    // #endregion

    // #region fixture mapping (taskboard registration cards → facility rows)
    function parseTask(t, note) {
      var d = t.description || "";
      function pick(label) {
        var i = d.indexOf(label + "：");
        if (i < 0) i = d.indexOf(label + ":");
        if (i < 0) return "";
        var rest = d.slice(i + label.length + 1);
        var nl = rest.indexOf("\n");
        return (nl < 0 ? rest : rest.slice(0, nl)).trim();
      }
      // health key from 健康判据/健康
      var h = pick("健康判据") || pick("健康");
      var hk = "";
      var km = h.match(/pipeline_status\.([A-Za-z0-9_.\-]+)/) || h.match(/键\s*([A-Za-z0-9_.\-]+)/);
      if (km) hk = km[1];
      // time: 触发 first segment before （
      var tm = pick("触发") || (t.title.match(/每天[^｜|]*/) || [""])[0];
      var time = tm.split(/[（(]/)[0].trim();
      // carrier: windows task name or cron id
      var cv = pick("载体");
      var carrier = cv;
      var wm = cv.match(/计划任务「([^」]+)」/);
      var ron = cv.match(/(cron_[A-Za-z0-9\-]+)/);
      if (wm) carrier = "windows·" + wm[1];
      else if (ron) carrier = "cron·" + ron[1];
      return {
        id: t.id,
        name: t.title,
        time: time,
        carrier: carrier,
        taskName: wm ? wm[1] : "",
        scripts: extractScripts(d),
        input: extractInput(d, note),
        output: extractOutput(d, note),
        healthKey: hk,
        status: t.status,
        blocked: !!t.blocked
      };
    }
    function extractInput(d, note) {
      var q = (d || "").match(/["“]([A-Za-z]:[^"”]+)\.(?:xlsx|csv|json|txt)["”]/);
      if (q) return q[0].replace(/["“”]/g, "");
      var dep = (d || "").match(/依赖文档[\\/]([^，。\s」）)]+)/);
      if (dep) { var hb = PATH_HINTS['任务依赖文档']; if (hb) return hb + dep[1]; }
      var src = (note || "").match(/source=([^;,\s]+)/);
      if (src) return src[1];
      return "";
    }
    function extractOutput(d, note) {
      var shot = (note || "").match(/candidate_screenshot["']?\s*[:=]\s*["']([^"']+)["']/);
      if (shot) return shot[1];
      var am = (d || "").match(/另存[^，。\n]*?([^，。\n]+\.xlsx)/);
      if (am) { var hb2 = PATH_HINTS['任务依赖文档']; if (hb2) return hb2 + am[1].trim(); }
      var abs = (note || "").match(/([A-Za-z]:\\(?:[^"\\\s]+\\?)+)/);
      if (abs) return abs[1];
      return "";
    }
    function openPath(path) {
      if (!path) return;
      fetch(PREFIX + "/open", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ path: path }) }).catch(function () {});
    }
    function runTask(f) {
      if (!f.taskName) return;
      fetch(PREFIX + "/run", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ task: f.taskName }) })
        .then(function (r) { return r.json() })
        .then(function (j) {
          if (j.ok) window.alert("已触发计划任务：" + f.taskName);
          else window.alert("触发失败：" + (j.out || j.error || "未知"));
        })
        .catch(function () { window.alert("触发失败：无法连接"); });
    }
    function runScript(path) {
      if (!path) return;
      fetch(PREFIX + "/run-script", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ path: path }) })
        .then(function (r) { return r.json() })
        .then(function (j) {
          if (j.ok) window.alert("已后台启动脚本：" + path);
          else window.alert("启动脚本失败：" + (j.error || "未知"));
        })
        .catch(function () { window.alert("启动脚本失败：无法连接"); });
    }
    function setTaskState(f, action) {
      if (!f.taskName) return;
      var label = action === "disable" ? "停用" : "重新上线";
      fetch(PREFIX + "/state", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ task: f.taskName, action: action }) })
        .then(function (r) { return r.json() })
        .then(function (j) {
          if (j.ok) window.alert("已" + label + "计划任务：" + f.taskName);
          else window.alert(label + "失败：" + (j.out || j.error || "未知"));
        })
        .catch(function () { window.alert(label + "失败：无法连接"); });
    }
    // #endregion

    // #region controller (minimal: boardOpen + fixtures)
    function makeController() {
      var state = { boardOpen: false, fixtures: [], loaded: false, error: null };
      var subs = new Set();
      var that = {
        getSnapshot: function () { return state },
        subscribe: function (fn) { subs.add(fn); return function () { subs.delete(fn) } },
        setState: function (patch) { state = Object.assign({}, state, patch); subs.forEach(function (fn) { fn() }) },
        toggleBoard: function () { this.setState({ boardOpen: !state.boardOpen }) },
        closeBoard: function () { this.setState({ boardOpen: false }) },
        refresh: function () {
          function loadOwn() {
            return fetch(PREFIX + "/fixtures").then(function (r) { return r.json() }).then(function (j) {
              if (j.ok) that.setState({ fixtures: j.fixtures || [], loaded: true, error: null });
              else that.setState({ fixtures: [], loaded: true, error: j.error });
            }).catch(function (e) { that.setState({ fixtures: [], loaded: true, error: String(e && e.message || e) }) });
          }
          return loadConfig().then(function () {
          return Promise.all([
            fetch("/dsh-taskboard/state").then(function (r) { return r.json() }).catch(function () { return null }),
            fetch(PREFIX + "/pipeline").then(function (r) { return r.json() }).catch(function () { return null })
          ]).then(function (res) {
            var stateJ = res[0], pipeJ = res[1];
            if (stateJ && stateJ.ok && stateJ.value && Array.isArray(stateJ.value.tasks) && stateJ.value.tasks.length > 0) {
              var health = (pipeJ && pipeJ.ok && pipeJ.tasks) ? pipeJ.tasks : {};
              var fx = stateJ.value.tasks.map(function (t) {
                var f = parseTask(t);
                var rec = health[f.healthKey];
                f.health = rec ? rec.status : undefined;
                if (rec && rec.note) {
                  f.output = f.output || extractOutput(t.description || "", rec.note);
                  f.input = f.input || extractInput(t.description || "", rec.note);
                }
                var io = ioFor(f);
                if (io) {
                  if (io.input) f.input = io.input;
                  if (io.output) f.output = io.output;
                }
                var sm = scriptMapFor(f);
                if (sm) f.scripts = sm;
                return f;
              });
              that.setState({ fixtures: fx, loaded: true, error: null });
            } else return loadOwn();
          }).catch(function () { return loadOwn() });
          });
        }
      };
      return that;
    }
    // #endregion

    // #region sidebar entry
    function sidebarRoot() {
      var column = document.querySelector("[data-pane='sidebar'], [class*='sidebarCol']");
      if (column === null) return void 0;
      return column.querySelector("[class*='logoRow']")?.parentElement ?? column.firstElementChild;
    }
    function createEntry(controller) {
      var entry = document.createElement("button");
      entry.type = "button";
      entry.dataset.rtbEntry = "";
      entry.className = "rtb-entry";
      entry.setAttribute("aria-label", "例行看板");
      entry.innerHTML = "<span class='rtb-entry-icon'>" + ICON + "</span><span class='rtb-entry-label'>例行看板</span><span class='rtb-entry-count'></span>";
      entry.addEventListener("click", function () { controller.toggleBoard() });
      return entry;
    }
    function newSessionButton(root) {
      var nested = root.querySelector("button[class*='newSession']");
      if (nested !== null) return nested;
      for (var i = 0; i < root.children.length; i++) {
        var child = root.children[i];
        if (child instanceof HTMLButtonElement && !child.matches(ENTRY_SELECTOR)) return child;
      }
      return root.querySelector("button[aria-label='新建会话'], button[aria-label='New Session'], button[aria-label*='新会话']") ?? void 0;
    }
    /** Re-insert the entry after the New Session row (never touches the brand row). */
    function placeEntry(root, entry) {
      var button = newSessionButton(root);
      if (button === void 0) return false;
      if (entry.parentElement !== root) {
        var row = button.closest("[class*='logoRow']");
        var base = row !== null && row.parentElement === root ? row : button;
        var family = Array.from(root.children).filter(function (el) {
          return el instanceof HTMLElement && el.matches("[data-rtb-entry], [data-dsh-atb-entry], [data-dsh-taskboard-entry], [data-dsh-ssh-entry], [data-dsh-mnemon-entry]");
        });
        var anchor = family.length > 0 ? (family[0] ?? null) : (base.nextElementSibling ?? null);
        root.insertBefore(entry, anchor);
      }
      return true;
    }
    function mountSidebarEntry(controller) {
      var entry = createEntry(controller);
      var root, placed = false;
      function tryPlace() {
        if (placed && document.body.contains(entry)) return;
        root ??= sidebarRoot();
        if (root === void 0) return;
        placed = placeEntry(root, entry);
      }
      var waitObserver = new MutationObserver(tryPlace);
      waitObserver.observe(document.body, { childList: true, subtree: true });
      var syncActive = function () {
        if (controller.getSnapshot().boardOpen) entry.dataset.active = "true";
        else delete entry.dataset.active;
        var n = controller.getSnapshot().fixtures.length;
        entry.querySelector(".rtb-entry-count").textContent = n > 0 ? String(n) : "";
      };
      var unsub = controller.subscribe(syncActive);
      syncActive(); tryPlace();
      return function () {
        waitObserver.disconnect(); unsub();
        entry.remove();
      };
    }
    // #endregion

    // #region board view
    function FixtureView({ controller }) {
      var s = react.useState(controller.getSnapshot());
      var data = s[0], setData = s[1];
      react.useEffect(function () {
        var unsub = controller.subscribe(function () { setData(controller.getSnapshot()) });
        if (!controller.getSnapshot().loaded) controller.refresh();
        return unsub;
      }, []);
      var fx = data.fixtures;
      return react_jsx_runtime.jsx("div", { className: "rtb-view", children: [
        react_jsx_runtime.jsx("div", { className: "rtb-bar", children: [
          react_jsx_runtime.jsx("span", { className: "rtb-title", children: "🔁 例行看板" }),
          react_jsx_runtime.jsx("span", { className: "rtb-sub", children: "routine-taskboard · 常驻设施" }),
          react_jsx_runtime.jsx("button", { type: "button", className: "rtb-refresh", onClick: function () { controller.refresh() }, children: "刷新" }),
          react_jsx_runtime.jsx("button", { type: "button", className: "rtb-close", title: "关闭看板", onClick: function () { controller.closeBoard() }, children: "×" })
        ] }),
        data.error ? react_jsx_runtime.jsx("div", { className: "rtb-err", children: "获取失败：" + data.error }) :
        fx.length === 0 ? react_jsx_runtime.jsx("div", { className: "rtb-empty", children: "暂无设施卡。注册 fixture 后显示在这里。" }) :
        react_jsx_runtime.jsx("div", { children: [
          react_jsx_runtime.jsx("div", { className: "rtb-grid rtb-th", children: [
            react_jsx_runtime.jsx("span", { children: "计划名称" }),
            react_jsx_runtime.jsx("span", { children: "时间" }),
            react_jsx_runtime.jsx("span", { children: "载体" }),
            react_jsx_runtime.jsx("span", { children: "依赖脚本" }),
            react_jsx_runtime.jsx("span", { children: "输入文件" }),
            react_jsx_runtime.jsx("span", { children: "输出文件" })
          ] }),
          fx.map(function (f) {
            var healthCls = f.health === "ok" ? "ok" : (f.health && f.health !== "ok") ? "fail" : "";
            var scripts = f.scripts || [];
            return react_jsx_runtime.jsx("div", { className: "rtb-grid rtb-row", "data-health": healthCls, children: [
              react_jsx_runtime.jsx("span", { className: "rtb-nm-wrap", children: [
                react_jsx_runtime.jsx("span", { className: "rtb-nm", title: f.name, children: f.name }),
                f.taskName ? react_jsx_runtime.jsx("button", { type: "button", className: "rtb-run", title: "立即启动计划任务", onClick: function () { runTask(f) }, children: "▶ 启动" }) : null,
                f.taskName ? react_jsx_runtime.jsx("button", { type: "button", className: "rtb-run", title: "停用此计划任务", onClick: function () { setTaskState(f, "disable") }, children: "⏸ 停用" }) : null,
                f.taskName ? react_jsx_runtime.jsx("button", { type: "button", className: "rtb-run", title: "重新上线此计划任务", onClick: function () { setTaskState(f, "enable") }, children: "↻ 重新上线" }) : null
              ] }),
              react_jsx_runtime.jsx("span", { children: f.time || "—" }),
              react_jsx_runtime.jsx("span", { title: f.carrier, children: f.carrier || "—" }),
              react_jsx_runtime.jsx("span", { className: "rtb-scripts", title: scripts.map(function (s) { return s.path }).join("\n"), children: scripts.length ? scripts.map(function (s, i) {
                return react_jsx_runtime.jsx("span", { className: "rtb-step", children: [
                  react_jsx_runtime.jsx("span", { className: "rtb-script" + (s.path ? " rtb-script-link" : ""), title: s.path || s.label, onClick: s.path ? function () { openPath(s.path) } : undefined, children: (scripts.length > 1 ? (i + 1) + ". " : "") + (s.label || s.path || "—") }),
                  s.path ? react_jsx_runtime.jsx("button", { type: "button", className: "rtb-step-run", title: "单独运行此脚本", onClick: function () { runScript(s.path) }, children: "▶" }) : null
                ] }, i);
              }) : react_jsx_runtime.jsx("span", { children: "—" }) }),
              f.input ? react_jsx_runtime.jsx("span", { className: "rtb-file", title: f.input, onClick: function () { openPath(f.input) }, children: f.input }) : react_jsx_runtime.jsx("span", { children: "—" }),
              f.output ? react_jsx_runtime.jsx("span", { className: "rtb-file", title: f.output, onClick: function () { openPath(f.output) }, children: f.output }) : react_jsx_runtime.jsx("span", { children: "—" })
            ] }, f.id);
          })
        ] })
      ] });
    }
    // #endregion

    // #region board mount (conversation column)
    function conversationColumn() {
      return document.querySelector("[data-pane='conversation'], [class*='centerCol']") ?? void 0;
    }
    function mountBoard(controller) {
      var root, container;
      function ensure() {
        if (container !== void 0) return;
        var column = conversationColumn();
        if (column === void 0) return;
        container = document.createElement("div");
        container.dataset.rtbView = "";
        container.className = "rtb-view-wrap";
        column.appendChild(container);
        root = react_dom_client.createRoot(container);
        root.render(react_jsx_runtime.jsx(FixtureView, { controller: controller }));
      }
      var waitObserver = new MutationObserver(ensure);
      waitObserver.observe(document.body, { childList: true, subtree: true });
      function applyActive() {
        if (controller.getSnapshot().boardOpen) {
          for (var i = 0; i < OTHER_ACTIVE_ATTRS.length; i++) document.documentElement.removeAttribute(OTHER_ACTIVE_ATTRS[i]);
          document.documentElement.setAttribute(ACTIVE_ATTR, "");
          document.dispatchEvent(new CustomEvent(ACTIVATE_EVENT, { detail: PANEL_NAME }));
        } else document.documentElement.removeAttribute(ACTIVE_ATTR);
      }
      function onOtherActivate(event) {
        if (event.detail !== PANEL_NAME && controller.getSnapshot().boardOpen) controller.closeBoard();
      }
      var SIDEBAR_ROW_SELECTOR = "[class*='sessionRow'], [class*='projectRow'], [class*='searchResultRow'], [class*='searchResultWorkspace'], [class*='newSession']";
      function onClickSidebarRow(event) {
        if (!controller.getSnapshot().boardOpen) return;
        var target = event.target;
        if (target instanceof Element && target.closest(SIDEBAR_ROW_SELECTOR) !== null) controller.closeBoard();
      }
      var unsub = controller.subscribe(applyActive);
      document.addEventListener(ACTIVATE_EVENT, onOtherActivate);
      document.addEventListener("click", onClickSidebarRow, true);
      ensure(); applyActive();
      return function () {
        waitObserver.disconnect();
        document.removeEventListener(ACTIVATE_EVENT, onOtherActivate);
        document.removeEventListener("click", onClickSidebarRow, true);
        unsub();
        if (root !== void 0) { root.unmount(); root = void 0 }
        if (container !== void 0) { container.remove(); container = void 0 }
        document.documentElement.removeAttribute(ACTIVE_ATTR);
      };
    }
    // #endregion

    // #region apply
    var applied = false, styleEl = null;
    function apply(ctx) {
      if (applied) return;
      applied = true;
      try {
        styleEl = document.createElement("style");
        styleEl.textContent = STYLE_TEXT;
        (document.head || document.documentElement).appendChild(styleEl);
        var controller = makeController();
        ctx.effect(function () {
          var disposeSidebar = mountSidebarEntry(controller);
          var disposeBoard = mountBoard(controller);
          return function () {
            disposeSidebar();
            disposeBoard();
            if (styleEl !== null) { styleEl.remove(); styleEl = null }
            applied = false;
          };
        }, PLUGIN_ID + ": kanban panel");
      } catch (e) {
        applied = false;
        throw e;
      }
    }
    return { apply: apply };
  },
});
