window.__ModuleLoader__.load({
	id: "dsh-connector",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		if (typeof document !== 'undefined' && !document.querySelector('style[data-dsh-connector-css]')) {
			var s = document.createElement('style');
			s.setAttribute('data-dsh-connector-css', '');
			s.textContent = "/* dsh-connector 设置卡片样式。\n *\n * 用 CSS 变量并带兜底值：宿主主题定义了就用宿主的，没定义也能看。\n * 每个规则都限定在 .conn-section 下，避免污染其它插件的设置页。\n */\n.conn-section {\n  margin: 0 0 18px;\n}\n.conn-title {\n  margin: 0 0 8px;\n  font-size: 14px;\n  font-weight: 600;\n  color: var(--dsh-text-primary, #e6e6e6);\n}\n.conn-card {\n  border: 1px solid var(--dsh-border, rgba(127, 127, 127, 0.28));\n  border-radius: 8px;\n  padding: 12px 14px;\n  background: var(--dsh-surface, rgba(127, 127, 127, 0.06));\n}\n.conn-head {\n  display: flex;\n  align-items: center;\n  gap: 8px;\n  margin-bottom: 4px;\n}\n.conn-chip {\n  font-size: 11px;\n  padding: 1px 6px;\n  border-radius: 999px;\n  background: rgba(127, 127, 127, 0.2);\n  color: var(--dsh-text-secondary, #a8a8a8);\n}\n.conn-group {\n  border: none;\n  border-top: 1px solid var(--dsh-border, rgba(127, 127, 127, 0.22));\n  margin: 12px 0 0;\n  padding: 10px 0 0;\n}\n.conn-group legend {\n  font-size: 12px;\n  font-weight: 600;\n  color: var(--dsh-text-secondary, #a8a8a8);\n  padding: 0 6px 0 0;\n}\n.conn-row {\n  display: flex;\n  align-items: flex-start;\n  gap: 10px;\n  margin: 8px 0;\n}\n.conn-label {\n  flex: 0 0 132px;\n  font-size: 12px;\n  line-height: 26px;\n  color: var(--dsh-text-secondary, #a8a8a8);\n}\n.conn-control {\n  flex: 1 1 auto;\n  min-width: 0;\n}\n.conn-input {\n  width: 100%;\n  box-sizing: border-box;\n  padding: 4px 8px;\n  font-size: 12px;\n  line-height: 18px;\n  border-radius: 6px;\n  border: 1px solid var(--dsh-border, rgba(127, 127, 127, 0.32));\n  background: var(--dsh-input-bg, transparent);\n  color: var(--dsh-text-primary, #e6e6e6);\n}\n.conn-input:focus {\n  outline: none;\n  border-color: var(--dsh-accent, #4c8dff);\n}\n.conn-num { max-width: 120px; }\n.conn-area { resize: vertical; font-family: inherit; }\n.conn-hint {\n  margin: 2px 0 0;\n  font-size: 11px;\n  line-height: 16px;\n  color: var(--dsh-text-tertiary, #8b8b8b);\n}\n.conn-warn,\n.conn-error {\n  margin: 6px 0 0;\n  padding: 6px 8px;\n  border-radius: 6px;\n  font-size: 12px;\n}\n.conn-warn {\n  background: rgba(210, 160, 40, 0.12);\n  color: var(--dsh-warning, #d2a028);\n}\n.conn-error {\n  background: rgba(220, 80, 80, 0.12);\n  color: var(--dsh-danger, #dc5050);\n}\n.conn-actions {\n  display: flex;\n  gap: 8px;\n  margin-top: 14px;\n}\n.conn-btn {\n  padding: 4px 14px;\n  font-size: 12px;\n  line-height: 20px;\n  border-radius: 6px;\n  border: 1px solid var(--dsh-border, rgba(127, 127, 127, 0.32));\n  background: transparent;\n  color: var(--dsh-text-primary, #e6e6e6);\n  cursor: pointer;\n}\n.conn-btn-primary {\n  border-color: transparent;\n  background: var(--dsh-accent, #4c8dff);\n  color: #fff;\n}\n.conn-btn:disabled {\n  opacity: 0.5;\n  cursor: not-allowed;\n}\n";
			document.head.appendChild(s);
		}
		var __defProp = Object.defineProperty;
		var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
		var __getOwnPropNames = Object.getOwnPropertyNames;
		var __hasOwnProp = Object.prototype.hasOwnProperty;
		var __export = (target, all) => {
		  for (var name in all)
		    __defProp(target, name, { get: all[name], enumerable: true });
		};
		var __copyProps = (to, from, except, desc) => {
		  if (from && typeof from === "object" || typeof from === "function") {
		    for (let key of __getOwnPropNames(from))
		      if (!__hasOwnProp.call(to, key) && key !== except)
		        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
		  }
		  return to;
		};
		var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

		// client/index.tsx
		var index_exports = {};
		__export(index_exports, {
		  apply: () => apply,
		  default: () => index_default,
		  inject: () => inject
		});
		module.exports = __toCommonJS(index_exports);
		var import_react = require("react");
		var import_jsx_runtime = require("react/jsx-runtime");
		var NS = "dsh-connector";
		var SLOT = "settings.plugin.item";
		var inject = ["slots", "settingsScope", "locale"];
		var zh = {
		  "card.title": "\u8FDE\u63A5\u5668\uFF08IM \u6865\u63A5\uFF09",
		  "card.desc": "\u628A\u98DE\u4E66\u7B49 IM \u7684\u6D88\u606F\u63A5\u5165 dsh \u4F1A\u8BDD\uFF0C\u5E76\u5728\u5BF9\u8BDD\u91CC\u76F4\u63A5\u56DE\u590D\u3002\u4FDD\u5B58\u540E\u7ACB\u5373\u91CD\u8FDE\u751F\u6548\u3002",
		  "card.unavailable": "\u8BBE\u7F6E\u547D\u540D\u7A7A\u95F4\u4E0D\u53EF\u7528\uFF08\u5BBF\u4E3B\u672A\u6CE8\u518C\u8BE5\u63D2\u4EF6\uFF09\u3002",
		  "card.readonlyDoc": "\u5F53\u524D\u90E8\u7F72\u7684\u8BBE\u7F6E\u6587\u6863\u4E0D\u53EF\u5199\uFF0C\u53EA\u80FD\u67E5\u770B\u3002",
		  "feishu": "\u98DE\u4E66\uFF08Feishu / Lark\uFF09",
		  "feishu.enabled": "\u542F\u7528",
		  "feishu.mode": "\u4E8B\u4EF6\u63A5\u6536\u65B9\u5F0F",
		  "feishu.mode.ws": "\u957F\u8FDE\u63A5\uFF08\u63A8\u8350\uFF0C\u65E0\u9700\u516C\u7F51\u5730\u5740\uFF09",
		  "feishu.mode.webhook": "\u56DE\u8C03\u5730\u5740\uFF08\u9700\u8981\u516C\u7F51 HTTPS\uFF09",
		  "feishu.appId": "App ID",
		  "feishu.appSecret": "App Secret",
		  "feishu.appSecret.hint": "\u5DF2\u4FDD\u5B58\u7684\u5BC6\u94A5\u4E0D\u4F1A\u56DE\u663E\uFF1B\u7559\u7A7A\u8868\u793A\u4E0D\u4FEE\u6539\u3002",
		  "feishu.verifyToken": "Verify Token",
		  "feishu.port": "\u76D1\u542C\u7AEF\u53E3",
		  "feishu.allowUsers": "\u5141\u8BB8\u7684\u7528\u6237 open_id\uFF08\u6BCF\u884C\u4E00\u4E2A\uFF09",
		  "feishu.allowUsers.hint": "\u7559\u7A7A = \u4E0D\u9650\u5236\u3002\u5EFA\u8BAE\u586B\u5199\uFF0C\u907F\u514D\u540C\u4E8B\u7684\u6D88\u606F\u76F4\u63A5\u9A71\u52A8 Agent\u3002",
		  "feishu.requireMention": "\u7FA4\u804A\u4E2D\u5FC5\u987B @\u673A\u5668\u4EBA",
		  "global.readOnly": "\u53EA\u8BFB\u6A21\u5F0F",
		  "global.readOnly.hint": "\u5F00\u542F\u540E\u8FDE\u63A5\u5668\u4E0D\u4F1A\u5411 IM \u53D1\u9001\u4EFB\u4F55\u6D88\u606F\uFF08\u53EA\u6536\u4E0D\u53D1\uFF09\u3002",
		  "save": "\u4FDD\u5B58",
		  "discard": "\u653E\u5F03\u4FEE\u6539",
		  "saving": "\u4FDD\u5B58\u4E2D\u2026",
		  "saved": "\u5DF2\u4FDD\u5B58",
		  "failed": "\u4FDD\u5B58\u5931\u8D25",
		  "dirty": "\u6709\u672A\u4FDD\u5B58\u7684\u4FEE\u6539",
		  "loading": "\u52A0\u8F7D\u4E2D\u2026"
		};
		var en = {
		  "card.title": "Connectors (IM bridge)",
		  "card.desc": "Bridge Feishu and other IM platforms into dsh sessions and reply from conversations. Reconnects as soon as you save.",
		  "card.unavailable": "Settings namespace unavailable (the owning plugin is not composed).",
		  "card.readonlyDoc": "This deployment keeps the settings document read-only; view only.",
		  "feishu": "Feishu / Lark",
		  "feishu.enabled": "Enabled",
		  "feishu.mode": "Event intake",
		  "feishu.mode.ws": "Long connection (recommended, no public address)",
		  "feishu.mode.webhook": "Callback URL (needs public HTTPS)",
		  "feishu.appId": "App ID",
		  "feishu.appSecret": "App Secret",
		  "feishu.appSecret.hint": "A stored secret is never echoed; leave blank to keep it.",
		  "feishu.verifyToken": "Verify Token",
		  "feishu.port": "Listen port",
		  "feishu.allowUsers": "Allowed open_ids (one per line)",
		  "feishu.allowUsers.hint": "Blank = unrestricted. Fill it in so colleagues\u2019 messages cannot drive the agent.",
		  "feishu.requireMention": "Require @mention in groups",
		  "global.readOnly": "Read-only mode",
		  "global.readOnly.hint": "When on, the connector never sends messages to IM (receive-only).",
		  "save": "Save",
		  "discard": "Discard",
		  "saving": "Saving\u2026",
		  "saved": "Saved",
		  "failed": "Save failed",
		  "dirty": "Unsaved changes",
		  "loading": "Loading\u2026"
		};
		function draftOf(value) {
		  const f = value?.feishu ?? {};
		  return {
		    feishuEnabled: f.enabled === true,
		    feishuMode: f.mode === "webhook" ? "webhook" : "ws",
		    feishuAppId: String(f.appId ?? ""),
		    // secret 读不到，永远是空串：空 = 不修改
		    feishuAppSecret: "",
		    feishuVerifyToken: "",
		    feishuPort: String(f.port ?? 8787),
		    feishuAllowUsers: (f.allowUsers ?? []).join("\n"),
		    feishuRequireMention: f.requireMention !== false,
		    readOnly: value?.readOnly === true
		  };
		}
		function ConnectorCard({ scope, t }) {
		  const snapshot = useScopeSnapshot(scope);
		  const [draft, setDraft] = (0, import_react.useState)(null);
		  const [saving, setSaving] = (0, import_react.useState)(false);
		  const [error, setError] = (0, import_react.useState)(null);
		  const value = snapshot?.value;
		  (0, import_react.useEffect)(() => {
		    if (saving) return;
		    setDraft(draftOf(value));
		  }, [value?.feishu?.appId, value?.feishu?.enabled, value?.feishu?.mode, value?.feishu?.port, value?.feishu?.requireMention, value?.readOnly, value?.feishu?.allowUsers?.join(","), saving]);
		  const status = snapshot?.status;
		  const writable = snapshot?.writable === true;
		  const save = (0, import_react.useCallback)(async () => {
		    if (!draft || !scope) return;
		    setSaving(true);
		    setError(null);
		    try {
		      const ops = [];
		      const set = (path, v) => ops.push({ op: "set", path, value: v });
		      set(["feishu", "enabled"], draft.feishuEnabled);
		      set(["feishu", "mode"], draft.feishuMode === "webhook" ? "webhook" : "ws");
		      set(["feishu", "appId"], draft.feishuAppId.trim());
		      set(["feishu", "requireMention"], draft.feishuRequireMention);
		      set(["feishu", "port"], Number(draft.feishuPort || 8787));
		      set(["feishu", "allowUsers"], draft.feishuAllowUsers.split("\n").map((s) => s.trim()).filter(Boolean));
		      set(["readOnly"], draft.readOnly);
		      if (draft.feishuAppSecret.trim()) set(["feishu", "appSecret"], draft.feishuAppSecret.trim());
		      if (draft.feishuVerifyToken.trim()) set(["feishu", "verifyToken"], draft.feishuVerifyToken.trim());
		      await scope.mutate(ops, snapshot?.revision);
		    } catch (e) {
		      setError(e instanceof Error ? e.message : String(e));
		    } finally {
		      setSaving(false);
		    }
		  }, [draft, scope, snapshot?.revision]);
		  if (status === "loading") return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "conn-card", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "conn-hint", children: t("loading") }) });
		  if (status === "unavailable") return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "conn-card", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "conn-hint", children: t("card.unavailable") }) });
		  if (!draft) return null;
		  const d = draft;
		  const field = (label, node, hint) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "conn-row", children: [
		    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { className: "conn-label", children: label }),
		    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "conn-control", children: [
		      node,
		      hint && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "conn-hint", children: hint })
		    ] })
		  ] });
		  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "conn-card", children: [
		    saving && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "conn-head", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "conn-chip", children: t("saving") }) }),
		    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "conn-hint", children: t("card.desc") }),
		    !writable && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "conn-warn", children: t("card.readonlyDoc") }),
		    error && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { className: "conn-error", children: [
		      t("failed"),
		      ": ",
		      error
		    ] }),
		    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("fieldset", { className: "conn-group", disabled: !writable || saving, children: [
		      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("legend", { children: t("feishu") }),
		      field(
		        t("feishu.enabled"),
		        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
		          "input",
		          {
		            type: "checkbox",
		            checked: d.feishuEnabled,
		            onChange: (e) => setDraft({ ...d, feishuEnabled: e.target.checked })
		          }
		        )
		      ),
		      field(
		        t("feishu.mode"),
		        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
		          "select",
		          {
		            className: "conn-input",
		            value: d.feishuMode,
		            onChange: (e) => setDraft({ ...d, feishuMode: e.target.value }),
		            children: [
		              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "ws", children: t("feishu.mode.ws") }),
		              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "webhook", children: t("feishu.mode.webhook") })
		            ]
		          }
		        )
		      ),
		      field(
		        t("feishu.appId"),
		        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
		          "input",
		          {
		            className: "conn-input",
		            value: d.feishuAppId,
		            placeholder: "cli_xxxxxxxxxxxx",
		            onChange: (e) => setDraft({ ...d, feishuAppId: e.target.value })
		          }
		        )
		      ),
		      field(
		        t("feishu.appSecret"),
		        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
		          "input",
		          {
		            className: "conn-input",
		            type: "password",
		            value: d.feishuAppSecret,
		            placeholder: "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022",
		            onChange: (e) => setDraft({ ...d, feishuAppSecret: e.target.value })
		          }
		        ),
		        t("feishu.appSecret.hint")
		      ),
		      d.feishuMode === "webhook" && field(
		        t("feishu.verifyToken"),
		        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
		          "input",
		          {
		            className: "conn-input",
		            type: "password",
		            value: d.feishuVerifyToken,
		            placeholder: "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022",
		            onChange: (e) => setDraft({ ...d, feishuVerifyToken: e.target.value })
		          }
		        )
		      ),
		      d.feishuMode === "webhook" && field(
		        t("feishu.port"),
		        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
		          "input",
		          {
		            className: "conn-input conn-num",
		            type: "number",
		            min: 1,
		            max: 65535,
		            value: d.feishuPort,
		            onChange: (e) => setDraft({ ...d, feishuPort: e.target.value })
		          }
		        )
		      ),
		      field(
		        t("feishu.allowUsers"),
		        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
		          "textarea",
		          {
		            className: "conn-input conn-area",
		            rows: 3,
		            value: d.feishuAllowUsers,
		            onChange: (e) => setDraft({ ...d, feishuAllowUsers: e.target.value })
		          }
		        ),
		        t("feishu.allowUsers.hint")
		      ),
		      field(
		        t("feishu.requireMention"),
		        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
		          "input",
		          {
		            type: "checkbox",
		            checked: d.feishuRequireMention,
		            onChange: (e) => setDraft({ ...d, feishuRequireMention: e.target.checked })
		          }
		        )
		      )
		    ] }),
		    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("fieldset", { className: "conn-group", disabled: !writable || saving, children: [
		      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("legend", { children: t("global.readOnly") }),
		      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "conn-row", children: [
		        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
		          "input",
		          {
		            type: "checkbox",
		            checked: d.readOnly,
		            onChange: (e) => setDraft({ ...d, readOnly: e.target.checked })
		          }
		        ),
		        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "conn-hint", children: t("global.readOnly.hint") })
		      ] })
		    ] }),
		    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "conn-actions", children: [
		      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
		        "button",
		        {
		          type: "button",
		          className: "conn-btn conn-btn-primary",
		          disabled: !writable || saving,
		          onClick: () => void save(),
		          children: t("save")
		        }
		      ),
		      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
		        "button",
		        {
		          type: "button",
		          className: "conn-btn",
		          disabled: saving,
		          onClick: () => setDraft(draftOf(value)),
		          children: t("discard")
		        }
		      )
		    ] })
		  ] });
		}
		function useScopeSnapshot(scope) {
		  const [snap, setSnap] = (0, import_react.useState)(() => scope?.getSnapshot?.());
		  (0, import_react.useEffect)(() => {
		    if (!scope) return;
		    setSnap(scope.getSnapshot());
		    return scope.subscribe(() => setSnap(scope.getSnapshot()));
		  }, [scope]);
		  return snap;
		}
		function CardShell({ t, children }) {
		  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { className: "conn-section", children: [
		    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h4", { className: "conn-title", children: [
		      "\u{1F50C} ",
		      t("card.title")
		    ] }),
		    children
		  ] });
		}
		async function apply(ctx) {
		  const disposers = [];
		  const feature = ctx.inject(["slots", "settingsScope"], (scope) => {
		    const t = ctx.locale.bind(NS);
		    const bound = scope.settingsScope.bind({ namespace: NS });
		    disposers.push(scope.slots.inject(SLOT, () => scope.slots.register({
		      name: SLOT,
		      key: NS
		    }, () => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardShell, { t, children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ConnectorCard, { scope: bound, t }) }))));
		  });
		  let disposeLocale;
		  try {
		    disposeLocale = ctx.locale.register(NS, { zh, en });
		  } catch (e) {
		    console.warn("[dsh-connector] locale \u5B57\u5178\u6CE8\u518C\u5931\u8D25\uFF0C\u9000\u56DE\u5185\u5D4C zh\uFF1A", e?.message ?? e);
		  }
		  return async () => {
		    for (const d of disposers) {
		      try {
		        d();
		      } catch {
		      }
		    }
		    try {
		      await feature?.dispose?.();
		    } catch {
		    }
		    try {
		      disposeLocale?.();
		    } catch {
		    }
		  };
		}
		var index_default = { apply, inject };
		//# sourceMappingURL=client-body.js.map

		return module.exports;
	}
});

//# sourceMappingURL=client.js.map
