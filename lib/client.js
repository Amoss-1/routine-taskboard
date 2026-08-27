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
    var OTHER_ACTIVE_ATTRS = ["data-dsh-atb-board"];
    var ICON = '<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="2.5" width="12" height="11" rx="1.5"/><path d="M2 7h12M6.5 7v6.5M11 7v6.5"/></svg>';

    // #region styles (kanban look, own prefixed classes)
    var STYLE_TEXT = [
      ".rtb-entry { display: flex; align-items: center; gap: 8px; width: 100%;",
      "  padding: 6px 10px; border: none; background: transparent; color: inherit;",
      "  cursor: pointer; font: inherit; border-radius: 8px; text-align: left; }",
      ".rtb-entry:hover { background: var(--dsw-hover, rgba(128,128,128,.12)); }",
      ".rtb-entry[data-active='true'] { background: var(--dsw-active, rgba(9,105,218,.14)); }",
      ".rtb-entry-icon { display: inline-flex; color: var(--dsw-text-secondary, gray); }",
      ".rtb-entry-label { flex: 1; font-size: 12.5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }",
      ".rtb-entry-count { font-size: 11px; color: var(--dsw-text-secondary, gray); }",
      "[data-sidebar-collapsed] .rtb-entry-label, [data-sidebar-collapsed] .rtb-entry-count { display: none; }",
      ".rtb-view { height: 100%; overflow: auto; padding: 14px 16px; }",
      ".rtb-bar { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; flex-wrap: wrap; }",
      ".rtb-title { font-size: 14px; font-weight: 600; }",
      ".rtb-sub { color: var(--dsw-text-secondary, gray); font-size: 12px; }",
      ".rtb-refresh { margin-left: auto; font: inherit; font-size: 12px; padding: 3px 10px;",
      "  border-radius: 999px; border: 1px solid var(--dsw-border, rgba(128,128,128,.3));",
      "  background: var(--dsw-bg, transparent); color: inherit; cursor: pointer; }",
      ".rtb-grid { display: grid; grid-template-columns: minmax(220px,2.2fr) 1fr 1fr 1.7fr;",
      "  gap: 10px; padding: 7px 10px; align-items: center; font-size: 12.5px; }",
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
          fetch(PREFIX + "/fixtures").then(function (r) { return r.json() }).then(function (j) {
            if (j.ok) that.setState({ fixtures: j.fixtures || [], loaded: true, error: null });
            else that.setState({ fixtures: [], loaded: true, error: j.error });
          }).catch(function (e) { that.setState({ fixtures: [], loaded: true, error: String(e && e.message || e) }) });
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
    function placeEntry(root, entry) {
      var anchor = root.querySelector("button[class*='newSession'], button[aria-label='新建会话'], button[aria-label='New Session']");
      if (anchor === void 0 || anchor === null) {
        var direct = Array.from(root.children).find(function (c) { return c instanceof HTMLButtonElement && !c.matches(ENTRY_SELECTOR) });
        if (direct !== void 0) { root.insertBefore(entry, direct); return true }
        root.appendChild(entry); return true;
      }
      anchor.parentElement?.insertBefore(entry, anchor.nextSibling);
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
          react_jsx_runtime.jsx("button", { type: "button", className: "rtb-refresh", onClick: function () { controller.refresh() }, children: "刷新" })
        ] }),
        data.error ? react_jsx_runtime.jsx("div", { className: "rtb-err", children: "获取失败：" + data.error }) :
        fx.length === 0 ? react_jsx_runtime.jsx("div", { className: "rtb-empty", children: "暂无设施卡。注册 fixture 后显示在这里。" }) :
        react_jsx_runtime.jsx("div", { children: [
          react_jsx_runtime.jsx("div", { className: "rtb-grid rtb-th", children: [
            react_jsx_runtime.jsx("span", { children: "设施 / 排程" }),
            react_jsx_runtime.jsx("span", { children: "载体" }),
            react_jsx_runtime.jsx("span", { children: "业务键" }),
            react_jsx_runtime.jsx("span", { children: "入口脚本" })
          ] }),
          fx.map(function (f) {
            return react_jsx_runtime.jsx("div", { className: "rtb-grid rtb-row", children: [
              react_jsx_runtime.jsx("span", { className: "rtb-nm", title: f.title, children: f.title }),
              react_jsx_runtime.jsx("span", { children: f.schedule || "—" }),
              react_jsx_runtime.jsx("span", { children: f.carrier || "—" }),
              react_jsx_runtime.jsx("span", { className: "rtb-script", title: f.script, children: f.script || "" })
            ] }, f.id);
          })
        ] })
      ] });
    }
    // #endregion

    // #region board mount (conversation column)
    function conversationColumn() {
      return document.querySelector("[data-pane='conversation'], [class*='conversationCol'], [class*='mainCol']") ?? void 0;
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
      var unsub = controller.subscribe(applyActive);
      document.addEventListener(ACTIVATE_EVENT, onOtherActivate);
      ensure(); applyActive();
      return function () {
        waitObserver.disconnect();
        document.removeEventListener(ACTIVATE_EVENT, onOtherActivate);
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
