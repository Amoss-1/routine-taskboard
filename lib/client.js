/* routine-taskboard client half — web GUI 设施视图.
 * Hand-written UMD-style bundle following the DSH client plugin contract:
 * window.__ModuleLoader__.load({ id, factory }) where factory returns
 * { apply(ctx) }. The GUI supplies react / react-dom/client / jsx-runtime.
 */
window.__ModuleLoader__.load({
  id: "routine-taskboard",
  factory: function (require) {
    var react_dom_client = require("react-dom/client");
    var react = require("react");
    var react_jsx_runtime = require("react/jsx-runtime");

    var PREFIX = "/routine-taskboard";
    var PLUGIN_ID = "routine-taskboard";

    // #region styles
    var STYLE_TEXT = [
      ".rtb-btn { position: fixed; right: 14px; bottom: 96px; z-index: 2147483000;",
      "  font: 12.5px system-ui, sans-serif; padding: 7px 12px; border-radius: 999px;",
      "  border: 1px solid var(--dsw-border, rgba(128,128,128,.3)); background: var(--dsw-bg, #fff);",
      "  color: var(--dsw-text, #1f2328); cursor: pointer; box-shadow: 0 2px 8px rgba(0,0,0,.14); }",
      ".rtb-btn:hover { background: var(--dsw-hover, rgba(128,128,128,.12)); }",
      ".rtb-panel { position: fixed; right: 14px; bottom: 140px; z-index: 2147483001;",
      "  width: min(760px, calc(100vw - 32px)); max-height: 60vh; overflow: auto;",
      "  font: 12.5px system-ui, sans-serif; border-radius: 12px;",
      "  border: 1px solid var(--dsw-border, rgba(128,128,128,.28));",
      "  background: var(--dsw-bg, #fff); color: var(--dsw-text, #1f2328);",
      "  box-shadow: 0 8px 30px rgba(0,0,0,.18); padding: 12px 14px; }",
      ".rtb-head { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }",
      ".rtb-title { font-weight: 600; }",
      ".rtb-count { color: var(--dsw-text-secondary, gray); font-size: 11.5px; }",
      ".rtb-spacer { flex: 1; }",
      ".rtb-x { border: none; background: transparent; color: inherit; cursor: pointer;",
      "  font-size: 15px; line-height: 1; padding: 2px 6px; border-radius: 6px; }",
      ".rtb-x:hover { background: var(--dsw-hover, rgba(128,128,128,.15)); }",
      ".rtb-tbl { display: grid; grid-template-columns: minmax(200px,2.2fr) 1fr 1fr 1.6fr;",
      "  gap: 10px; padding: 6px 8px; align-items: center; }",
      ".rtb-th { color: var(--dsw-text-secondary, gray); font-size: 11px;",
      "  border-bottom: 1px solid var(--dsw-border, rgba(128,128,128,.25)); }",
      ".rtb-row { border-bottom: 1px solid var(--dsw-border, rgba(128,128,128,.15));",
      "  font-variant-numeric: tabular-nums; }",
      ".rtb-row:hover { background: var(--dsw-hover, rgba(128,128,128,.08)); }",
      ".rtb-nm { font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }",
      ".rtb-script { color: var(--dsw-text-secondary, gray); overflow: hidden;",
      "  text-overflow: ellipsis; white-space: nowrap; }",
      ".rtb-empty { padding: 18px 8px; color: var(--dsw-text-secondary, gray);",
      "  border: 1px dashed var(--dsw-border, rgba(128,128,128,.3)); border-radius: 10px;",
      "  text-align: center; }",
      ".rtb-err { padding: 12px; color: #e5484d; border: 1px solid rgba(229,72,77,.4);",
      "  border-radius: 8px; background: rgba(229,72,77,.08); }",
    ].join("\n");
    // #endregion

    // #region react view
    function FixtureView() {
      var s = react.useState({ state: "loading", fixtures: [], error: null });
      var data = s[0], setData = s[1];
      react.useEffect(function () {
        var alive = true;
        fetch(PREFIX + "/fixtures")
          .then(function (r) { return r.json() })
          .then(function (j) {
            if (!alive) return;
            if (j.ok) setData({ state: "ready", fixtures: j.fixtures || [], error: null });
            else setData({ state: "error", fixtures: [], error: j.error || "load failed" });
          })
          .catch(function (e) {
            if (alive) setData({ state: "error", fixtures: [], error: String(e && e.message || e) });
          });
        return function () { alive = false };
      }, []);
      if (data.state === "loading") {
        return react_jsx_runtime.jsx("div", { className: "rtb-empty", children: "加载中…" });
      }
      if (data.state === "error") {
        return react_jsx_runtime.jsx("div", { className: "rtb-err", children: "获取设施失败：" + data.error });
      }
      if (data.fixtures.length === 0) {
        return react_jsx_runtime.jsx("div", { className: "rtb-empty", children: "暂无设施卡。注册 fixture 后，它们会出现在这里——排程/载体/业务键/入口脚本一目了然。" });
      }
      return react_jsx_runtime.jsx("div", { className: "rtb-tbl", children: [
        react_jsx_runtime.jsx("div", { className: "rtb-th", children: "设施 / 排程" }),
        react_jsx_runtime.jsx("div", { className: "rtb-th", children: "载体" }),
        react_jsx_runtime.jsx("div", { className: "rtb-th", children: "业务键" }),
        react_jsx_runtime.jsx("div", { className: "rtb-th", children: "入口脚本" }),
        data.fixtures.map(function (f) {
          return react_jsx_runtime.jsxs("div", { key: f.id, className: "rtb-row rtb-tbl", children: [
            react_jsx_runtime.jsx("span", { className: "rtb-nm", title: f.title, children: f.title }),
            react_jsx_runtime.jsx("span", { children: f.schedule || "—" }),
            react_jsx_runtime.jsx("span", { children: f.carrier || "—" }),
            react_jsx_runtime.jsx("span", { className: "rtb-script", title: f.script, children: f.script || "" }),
          ] });
        }),
      ] });
    }
    // #endregion

    // #region mount / apply
    var applied = false;
    var btnEl = null, panelEl = null, styleEl = null, reactRoot = null, open = false;

    function ensureStyle() {
      if (styleEl !== null) return;
      styleEl = document.createElement("style");
      styleEl.textContent = STYLE_TEXT;
      (document.head || document.documentElement).appendChild(styleEl);
    }

    function togglePanel() {
      open = !open;
      if (!open) {
        if (panelEl !== null) { panelEl.remove(); panelEl = null }
        if (reactRoot !== null) { reactRoot.unmount(); reactRoot = null }
        return;
      }
      panelEl = document.createElement("div");
      panelEl.className = "rtb-panel";
      var closeBtn = document.createElement("button");
      closeBtn.type = "button";
      closeBtn.className = "rtb-x";
      closeBtn.textContent = "×";
      closeBtn.title = "关闭";
      closeBtn.addEventListener("click", function () { togglePanel() });
      var head = document.createElement("div");
      head.className = "rtb-head";
      var title = document.createElement("span");
      title.className = "rtb-title";
      title.textContent = "🔁 Routine 设施";
      var count = document.createElement("span");
      count.className = "rtb-count";
      count.textContent = "routine-taskboard";
      var spacer = document.createElement("span");
      spacer.className = "rtb-spacer";
      head.appendChild(title);
      head.appendChild(count);
      head.appendChild(spacer);
      head.appendChild(closeBtn);
      var body = document.createElement("div");
      panelEl.appendChild(head);
      panelEl.appendChild(body);
      document.body.appendChild(panelEl);
      reactRoot = react_dom_client.createRoot(body);
      reactRoot.render(react_jsx_runtime.jsx(FixtureView, {}));
    }

    function mount() {
      ensureStyle();
      btnEl = document.createElement("button");
      btnEl.type = "button";
      btnEl.className = "rtb-btn";
      btnEl.textContent = "🔁 Routine";
      btnEl.title = "routine-taskboard 设施视图";
      btnEl.addEventListener("click", togglePanel);
      document.body.appendChild(btnEl);
    }

    function unmount() {
      if (reactRoot !== null) { reactRoot.unmount(); reactRoot = null }
      if (panelEl !== null) { panelEl.remove(); panelEl = null }
      if (btnEl !== null) { btnEl.remove(); btnEl = null }
      if (styleEl !== null) { styleEl.remove(); styleEl = null }
      open = false;
      applied = false;
    }

    function apply(ctx) {
      if (applied) return;
      applied = true;
      ctx.effect(function () {
        mount();
        return unmount;
      }, PLUGIN_ID + ": fixture panel");
    }

    return { apply: apply };
  },
});
