# FounderOS extraction audit: what comes with each first-increment part, and what gets cut

**Question.** For each FounderOS part picked for the first Agentic OS increment, what has to come with it when it is copied out, and what has to be cut?

**Source.** `C:\Code\FounderOS` (MIT, Next 14.2.35, React 18.3, better-sqlite3 11.10.0, zod 3, Vitest 2), commit `e26392c`. I only read it. All paths below are relative to that repo.

**Method.** I wrote a script that follows imports (`import`, `export … from`, `import()`, `require()`, with the `@/` alias resolved as in `tsconfig.json`) and ran it from each part's entry files. Line counts are `wc -l`. A run is "with DB cut" when the walk stops at `lib/data.ts`. I also checked every resolved import against the real on-disk casing, since Linux is case-sensitive. There were zero mismatches across the 169-file union. Type-only imports count as edges, because the copy needs those types even though the compiled output drops them.

**Target constraints.** Front end plus read-only server routes. No business domains (clients, comms, finance, social, analytics). Must run on Linux and Node 22.

---

## The two hubs that blow up every closure

1. **`lib/data.ts` (`getDb()`).** Walking from `lib/data.ts` alone reaches **187 files / 58,845 lines**. The reasons:
   - `lib/data.ts:6` → `lib/demo/store.ts`, which pulls `seed-v1.ts` (1,984 lines), `company.json` (20,917 lines) and `demo/brain.ts`.
   - `lib/seed.ts:2` → `lib/agents/real.ts` → the whole `lib/lab/**` tree, `lib/foreplay/**` and connectors (Slack, Notion, IMAP, gcal, WhatsApp, the `ai` SDK).
   - `lib/db.ts` is 2,319 lines and declares about 90 tables (`lib/db.ts:83-1101`). Nearly all of them are business or lab tables: `funnel_contacts`, `client_work`, `trading_*`, `social_*`, `lab_*` and so on.

   Three of the four parts touch `getDb()`, and each needs only a few rows. **Cut `lib/data.ts` entirely** and replace each call site (see the per-part sections).
2. **`app/globals.css` (19,159 lines), one file for the whole app.** It serves three UI trees (`classic`, `glados`, `legacy`, chosen by a cookie in `lib/appearance.ts:294-302` `treeFor`) and every business page's styles. G-kit rules are scoped under `:root[data-ui='glados']`, and the kit tokens start at about line 8913. The parts' own classes are `kg-*` (354 selector hits, mostly in lines 10000–11000 plus a few around 17000–17800), `kv-*` (classic knowledge, plus `[data-ui='legacy']` overrides near 16542) and `sk-*`. You cannot copy one CSS file. You have to carve it (see the plan).

Not used by any of the four parts, and safe to leave behind: `app/layout.tsx`'s shell (`Sidebar`, `Topbar`, `CommandPalette`, `ConductorPanel`, `ModuleGate`, `LegacySlab`, and `buildCommands`, which itself calls `getDb()` for agents and tools), `middleware.ts` (auth gate), `instrumentation.ts` (cache warm and cron), and `scripts/serve.mjs` (password launcher wrapping `next`).

---

## 1. Knowledge Visualizer

**Entry:** `app/knowledge/page.tsx`. The server builds `knowledgeIndex()` and `graphAnalysis()` and hands both to the client (`app/knowledge/page.tsx:27-35`).

**Size.**
- **Without DB cut:** 258 files / 70,509 lines.
- **With DB cut:** 83 files / 14,736 lines. Of that, 7,186 lines are the G kit and 1,876 are `lib/schemas.ts`.
- **The part itself:** 14 files / about 4,030 lines:
  - `components/knowledge/{KnowledgeVisualizer,KnowledgeG,KnowledgeCanvas,KnowledgePanels,FocusPanel,FocusG,FullscreenOverlay,KnowledgeAbout}.tsx`: 2,221 lines
  - `lib/knowledge-{index,views,metrics}.ts` plus `lib/knowledge-g.ts`: 1,596 lines
  - `components/useSvgCamera.ts`: 138 lines
  - the page: 73 lines

`components/knowledge/DriftG.tsx` and `DriftRail.tsx` belong to `/drift` (they import `lib/drift`), not this page. Leave them out.

**Transitive imports.**
- Data:
  - `lib/knowledge-index.ts:32-36` → `connectors/gbrain` (`readStoreNotes`), `brain-graph` (`parseNote`), `skills-catalog`, `stores`, `data` (`getDb`).
  - `connectors/gbrain` → `stores`, `paths`, `swr`, `brain` (types).
  - `brain-graph` → `schemas` (types only).
- UI:
  - `KnowledgeG.tsx` imports `useKnowledgeState` from `KnowledgeVisualizer.tsx` (`KnowledgeG.tsx:16`), so the classic file is needed even for a G-only copy.
  - The G kit comes in via `FocusG`, `KnowledgeG` and `AboutButton`.
  - `FullscreenOverlay` → `components/g/Overlays` (`Layer`).
  - `terminal.tsx` provides `SectionHead`.
- Theme: the page forks on `treeFor(getAppearance(), '/knowledge')` (`app/knowledge/page.tsx:38`) → `lib/appearance-server.ts` (`next/headers` cookies) plus `lib/appearance.ts`.
- Demo mode: indirect only. `stores.ts` and `paths.ts` switch every directory to `demo-data/` when "filming" is on (`lib/stores.ts:19-41`, `lib/paths.ts:36-51`).
- SQLite: `knowledge-index.ts:321-412` reads `departments`, `agents`, `funnel_contacts` (as `db.funnel.journeys()`), `workflows` and `tools`.

**Touches business domains.** Yes:
- Entity kind `client` comes from `db.funnel.journeys()`, links to `/funnel`, and has cluster "Accounts" (`knowledge-index.ts:363-377`).
- `knowledge-views.ts:66-105` gives `client` its own category, colour, label and hint.
- The `AMBIGUOUS` name list (`knowledge-index.ts:103-106`) is tuned to the FounderOS roster: Stripe, Wise, Slack and so on.
- Entity `href`s point to `/org`, `/agents`, `/funnel`, `/workflows` and `/integrations`, none of which exist in the target.

**Minimal standalone copy.**
- **Keep:**
  - the four lib files and the knowledge components (without Drift*)
  - `useSvgCamera`
  - from `connectors/gbrain`, only `readStoreNotes` and `walkMarkdown` (about 60 lines)
  - `parseNote` and `chunkText` from `brain-graph` (plus its `BrainGraph*` types, inlined from `schemas`)
  - `readUserSkills` and `readSkillMarkdown` from `skills-catalog`
  - a slim `stores.ts` (`brainStoreDir`, `skillsDir`)
- **Stub or cut:**
  - Replace `getDb()` with nothing, or with a small read-only "records" source (for example the Agentic OS's own agent and tool registry). Drop the `client` kind from the index and the views.
  - Set `href: null` for every kind except `skill` (`/skills`).
  - Remove the theme fork: render one tree.
- **Tests worth copying:** `tests/knowledge-index.test.ts`, `knowledge-metrics.test.ts`, `knowledge-views.test.ts`, `knowledge-g.test.ts`, `brain-graph.test.ts`.

**Linux / Node 22.** Nothing platform-specific. The cost is all on the server: Brandes betweenness is O(V·E) per load and is cached against a walk of the store (`knowledge-index.ts:518-556`).

---

## 2. Brain observatory (`lib/gbrain-observatory.ts` and the `/brain` radial)

**Entry:** `loadObservatoryData()` (`lib/gbrain-observatory.ts:259-272`) and `components/GBrainRadialLazy.tsx` → `GBrainRadial.tsx`.

The `/brain` page itself (`app/brain/page.tsx`) is **not** extractable. It imports Attio (`attioClients`), Obsidian, `getDb`, the funnel, agent runs, Supabase layers, `PillarRadar` and `BrainDock`. Take only the radial.

**Size.**
- **Closure with DB cut:** 24 files / 6,858 lines.
- **The part itself:** about 1,900 lines:
  - `gbrain-observatory.ts`: 273
  - `GBrainRadial.tsx`: 1,172
  - `GBrainRadialLazy.tsx`: 21
  - `gbrain-live.ts`: 200
  - `SetupLink.tsx`: 32
  - `lib/use-palette.ts`: 148
  - `app/api/brain/route.ts`: 18
  - `lib/brain.ts`: 48

**Transitive imports.**
- `gbrain-observatory.ts:15-18` → `connectors/gbrain`, `brain-graph`, `stores` and **`lib/demo-mode.ts`** (`isFilming`, `demoContextHealth`).
  - `demo-mode.ts` is 370 lines of fake inbox, calendar and comms data. Through type imports it drags in `lib/comms.ts`, `lib/inbox.ts` and `lib/connectors/gcal.ts` (and `node-ical`) (`lib/demo-mode.ts:14-18`).
  - The two functions actually used are 3 and 8 lines long (`demo-mode.ts:20-49`).
- `GBrainRadial.tsx:20-26` → `lucide-react`, `react-dom` (`createPortal` into `#gbrain-notice-slot`), `gbrain-live` (live "thoughts"), `SetupLink` (`/setup`) and `use-palette` → `lib/appearance.ts` (theme colours on the canvas).
- `gbrain-live.ts:22` fetches **`GET /api/brain?q=`** → `app/api/brain/route.ts` → `lib/brain.ts` → `createGBrainProvider` (`connectors/gbrain.ts:201`).
  - The provider spawns the external **`gbrain` CLI** with `execFile` (`connectors/gbrain.ts:37-63`).
  - If the CLI is missing it falls back to a local grep of the markdown (`connectors/gbrain.ts:81-102`, `:242`).
- The glados tree wraps the radial in `RadialStage` (`components/brain/BrainG.tsx:27-54`), which needs the G kit (`GVizStage`, `GEmpty`) and **`BrainDock`**. `BrainDock` → `BrainDump` → a write route (`/api/brain/dump`, which runs `gbrain capture`).
- SQLite: none.

**Touches business domains.** Not directly. Only `demo-mode.ts`'s neighbours do (comms, inbox, calendar).

**Minimal standalone copy.**
- **Keep:**
  - `gbrain-observatory.ts`, with `isFilming()` replaced by `false` (or an env flag) and `demoContextHealth` inlined if demo is wanted
  - `GBrainRadial`, `GBrainRadialLazy`, `gbrain-live`
  - a read-only `/api/brain` route
  - `readStoreNotes` and `parseNote`/`chunkText`
- **For `/api/brain`, choose one:**
  - **Option A:** keep `createGBrainProvider().search` (the `execFile` path plus the local fallback).
  - **Option B:** ship only the local-grep fallback. It is the smaller copy and needs no CLI.
- **Cut:**
  - `capture()`, `overview()` and `stats()` in the provider (write or doctor paths)
  - `BrainDock` and `BrainDump`
  - the rest of the `/brain` page
- **Replace:**
  - `use-palette`, with a fixed palette or the new app's theme tokens
  - `SetupLink`, with plain text
- If you keep `RadialStage`, pass `bottomCenter={undefined}`.
- **Tests:** `tests/gbrain-observatory.test.ts`, `gbrain.test.ts`, `use-palette-appearance.test.ts` (only if `use-palette` is kept).

**Linux / Node 22.** `execFile('gbrain', …)` works on Linux when the binary is on `PATH`. When it isn't, ENOENT resolves to `code: 1` and the local fallback runs (`connectors/gbrain.ts:49-56`). `GBRAIN_DISABLE_DIRECT_POOL` and the Supabase/ZeroEntropy comments concern the operator's CLI, not this code. The default store is `~/knowledge/brain-store` (`lib/stores.ts:21`), overridden by `GBRAIN_STORE`.

---

## 3. Skills catalogue (`app/skills`, `lib/skills-catalog.ts`)

**Entry:** `app/skills/page.tsx` plus `app/api/skills/{[slug],propose,create}/route.ts`.

**Size.**
- **Closure with DB cut:** 74 files / 9,867 lines (the G kit is most of it).
- **The part itself:** 10 files / about 1,970 lines:
  - `page.tsx`: 63
  - `NewSkillIntake.tsx`: 212
  - `SkillsExplorer.tsx`: 48
  - `SkillsGrid.tsx`: 254
  - `SkillHierarchy.tsx`: 620
  - `skills/SkillsG.tsx`: 373
  - `skills-catalog.ts`: 311
  - the three routes: 86

**Transitive imports.**
- `skills-catalog.ts:1-4` → `stores` (`skillsDir`: `GLADOS_SKILLS_DIR` or `~/.claude/skills`, `lib/stores.ts:36-39`) → `paths`.
- `SkillHierarchy.tsx:21-23` → `useSvgCamera`, `use-palette` (→ `appearance`) and `GButton`.
- `SkillsGrid.tsx:26-27` → `terminal` (`SectionHead`) and `g/Overlays` (`Layer`).
- The client fetches `GET /api/skills/[slug]` for a skill's full SKILL.md (`SkillsGrid.tsx:148`, `SkillsG.tsx:182`).
- Theme fork: `app/skills/page.tsx:52`.
- **SQLite:** a fallback only. When no skills directory exists, the page reads `db.agents` and `db.skills` (the seeded catalogue) (`app/skills/page.tsx:33-46`).

**Touches business domains.** No. `skillGroup()` contains FounderOS-specific grouping heuristics (for example `^\d\d-` → "Content/Video prompts", `skills-catalog.ts:75-90`). That is cosmetic.

**Writes, which conflict with "read-only server routes":**
- `POST /api/skills/create` → `createDraftSkill` writes `SKILL.md` and `GROUP` into the skills directory (`skills-catalog.ts:246-306`).
- `POST /api/skills/propose` is read-only, but it only exists to feed `create`.
- Both are called from `NewSkillIntake.tsx` and from `SkillsG.tsx:281-299` (the "new skill" sheet).

**Minimal standalone copy.**
- **Keep:**
  - `skills-catalog.ts` read functions (`readUserSkills`, `readSkillMarkdown`, `parseSkillFrontmatter`, `skillGroup`, `splitGroup`)
  - `GET /api/skills/[slug]`
  - `SkillsGrid`, `SkillHierarchy`, `SkillsExplorer` (or `SkillsG`)
  - `useSvgCamera`
- **Cut:**
  - `create` and `propose` routes, `NewSkillIntake`, the create sheet in `SkillsG`
  - `createDraftSkill`, `proposePlacement`, `deriveSkillName`, `toKebabCase`, `resolveSkillsDir`
  - the DB fallback: show an empty state instead
- **Tests:** `tests/skills-catalog.test.ts` (drop the create cases), `skill-hierarchy-camera.test.ts`. Skip the `skills-create-route`, `skills-propose-route` and `skills-new-intake` tests.

**Linux / Node 22.** Fine. The path-traversal guard uses `path.sep` correctly (`skills-catalog.ts:270`). Frontmatter parsing accepts `\r?\n`. On Linux the default directory resolves to the server user's `~/.claude/skills`. Set `GLADOS_SKILLS_DIR` (rename it for the new repo) when serving another user's skills.

---

## 4. Usage (`app/usage`, `lib/usage*.ts`)

**Entry:** `app/usage/page.tsx` (forks into `UsageClassic`, `UsageG` and `UsageLegacy`) plus `GET /api/usage`, which the client polls every 10 s (`components/usage/use-usage.ts:28`).

**Size.**
- **Closure with DB cut:** 99 files / 14,867 lines. This includes the **legacy kit** (`components/legacy/*`, 14 files) and the G kit.
- **The part itself:** 11 files / about 2,440 lines:
  - `usage.ts`: 470
  - `usage-guard.ts`: 40
  - `usage-payload.ts`: 158
  - `usage-view.ts`: 405
  - `UsageG.tsx`: 453
  - `UsageClassic.tsx`: 435
  - `UsageLegacy.tsx`: 317
  - `use-usage.ts`: 90
  - the page, `/api/usage` and `/api/usage/push` routes: 72

**Transitive imports.**
- `usage.ts` itself is clean: only `node:fs`, `node:os`, `node:path` and `schemas` types (`lib/usage.ts:24-27`). It reads `~/.claude/projects/**/*.jsonl` (`CLAUDE_PROJECTS_DIR`) and `~/.codex/sessions` (`CODEX_SESSIONS_DIR`), and pings Ollama at `127.0.0.1:11434` (`usage.ts:184-189`, `:375-385`).
- `usage-payload.ts:12-18` brings in the coupling:
  - `getDb().usageReadings` (SQLite table `usage_readings`, `lib/db.ts:447`, repo `lib/db-ext/usage.ts`)
  - `paths.filmingMode`
  - `fo-sample.ts` (276 lines), whose `sampleUsageReadings` and `sampleUsageLanes` sit next to `sampleClients`, `sampleTrading`, `sampleDigestBody` and others, and which imports `comms-extras`
  - `push-auth.ts` → `auth.ts`, `auth-gate.ts`, `creds.ts`
  - `usage-guard.ts` (`modeFile`)
- The three page components each import `setupHrefFor` from `lib/integrations-catalog.ts` → `connectors/types`. `UsageLegacy` pulls the whole legacy kit.
- `POST /api/usage/push` is a **write route**. It authenticates with a token or session and inserts into `usage_readings`.
- Demo mode: in filming mode the payload returns a badged sample (`usage-payload.ts:73-89`). `usage-guard.ts` turns usage off when `DEMO_GATE=1`, `DEMO_MODE=1` or the `.glados-mode` file says filming or demo.

**Touches business domains.** Only through `fo-sample.ts` and `integrations-catalog.ts`. The lane classifier encodes the operator's own tooling: `/.paperclip/` → "Agent board", `/.superset/(worktrees|projects)/` → "My sessions" (`usage.ts:88-94`). That is not business, but it is personal.

**Minimal standalone copy.**
- **Keep:**
  - `usage.ts` as is, apart from the lane heuristic
  - `usage-view.ts`, `use-usage.ts`, one presentation (`UsageG` or `UsageClassic`)
  - `GET /api/usage`
- **Rewrite `usage-payload.ts`:**
  - Drop `getDb()`. Pushed readings become `[]`, or a small dedicated SQLite file if multi-machine push is wanted later.
  - Drop `push-auth`. `push.tokenSet` becomes `false`.
  - Inline the two sample functions (about 25 lines from `fo-sample.ts:217-243`).
  - Replace `filmingMode()` with an env flag.
- **Cut:**
  - `/api/usage/push`, `UsageLegacy` and `components/legacy/*`
  - `setupHrefFor`: use a constant or nothing
  - `usage-guard`'s mode-file path: keep only the env checks
- **Tests:** `tests/usage-page.test.ts`. Read it first: it may assume three trees.

**Linux / Node 22.**
- No platform-specific code. `fs.readSync` tailing with byte offsets is portable, and `AbortSignal.timeout` exists in Node 22.
- The lane regexes assume POSIX `cwd` strings, which is right on Linux.
- `os.hostname().replace(/\.local$/i, '')` is a macOS-ism, but harmless on Linux.
- Privacy: the page reads the transcripts of whichever user runs the server process. That is fine for a local or self-hosted Agentic OS. On a shared host, put it behind an env gate (that is what `DEMO_GATE` is for).

---

## Shared infrastructure (copy once)

| Piece | Used by | Size | What to do |
|---|---|---|---|
| G kit `components/g/*` (+ `lib/{appearance,theme,g-ready,l-ready,brand,chart-geometry,chart-sync,delta,escape-stack,format-number,timeline-place,use-melt,use-ui-style}.ts`, `components/ui/{Toast.tsx,use-dialog.ts}`) | Knowledge (G), Skills (G, `GButton` in hierarchy), Usage (G), radial stage | 56 files / 7,186 lines, deps only `react`, `react-dom`, `next`, `lucide-react` | Copy whole. It is self-contained (closure checked). Trim `appearance.ts` to a fixed `ui='glados'`. |
| `connectors/gbrain.ts` `readStoreNotes` / `walkMarkdown` | Knowledge, Brain | about 60 of 335 lines | Extract into a `lib/brain-store.ts`. Copy the provider's `search` only if `/api/brain` uses the CLI. |
| `lib/brain-graph.ts` (`parseNote`, `chunkText`) | Knowledge, Brain | 384 lines | Copy; inline the `BrainGraph*` types instead of importing the 1,876-line `schemas.ts`. |
| `lib/stores.ts` + `lib/paths.ts` | all four | 70 + 95 lines | Rewrite as one small `config.ts`: `brainStoreDir`, `skillsDir`, `gbrainBin`. Drop filming, the `.glados-mode` file, bdpilot and funnel. |
| `lib/skills-catalog.ts` (read half) | Knowledge, Skills | about 150 of 311 lines | Copy the read half only. |
| `components/useSvgCamera.ts` | Knowledge canvas, Skill hierarchy | 138 lines | Copy as is (pure React). |
| `lib/use-palette.ts` → `appearance.ts` | Brain radial, Skill hierarchy | 148 lines | Copy, pinned to one palette. |
| `lib/swr.ts` | gbrain provider doctor/stats cache | 115 lines | Needed only if the provider is copied. |
| `components/terminal.tsx` (`SectionHead`, `Dot`, `Badge`) | Knowledge classic, SkillsGrid, Usage classic | 134 lines | Copy. |
| `lib/format-number.ts` | usage-view, G kit | 64 lines | Copy. |
| Types from `lib/schemas.ts` (`UsagePlan`, `UsageReading`, `BrainGraph*`) | Usage, brain-graph | a few dozen lines out of 1,876 | Copy just these zod schemas and types. |
| CSS from `app/globals.css` | all | 19,159 lines total | Carve it: console tokens (top ~300 lines), the G-kit block from line 8913 on (`:root[data-ui='glados']` tokens and `.g-*` rules), and the `kg-*`, `kv-*` and `sk-*` rules. Set `data-ui="glados"` and the other `htmlAttributes` (`lib/appearance.ts:259-268`) statically on `<html>`, or the kit renders unstyled. |
| `tailwind.config.ts` (`os.*` colour tokens backed by CSS variables, `sm-t`/`md-t`/`lg-t` radii, `wide`/`ultra` screens) | classic components, brain stage helpers | 63 lines | Copy; set `content` to the new tree. |
| Fonts `app/fonts/Geist[wght].ttf`, `GeistMono[wght].ttf` via `next/font/local` | layout | — | Copy both. Drop `JetBrainsMono` (legacy only). Keep `tests/stubs/next-font-local.ts` and the Vitest alias (`vitest.config.ts`). |
| `next.config.mjs` | — | 44 lines | Keep only `serverComponentsExternalPackages: ['better-sqlite3']` (if SQLite is used at all). Drop the redirects, rewrites and `instrumentationHook`. |

**SQLite in the first increment.** Once the cuts above are made, **none of the four parts needs SQLite.** Every DB read was either business data (Knowledge's clients, workflows and tools), a seeded fallback (Skills), or multi-machine push (Usage). Keep `better-sqlite3` out until a part actually needs a table. That also removes the only native-module step.

**Linux / Node 22, across everything.**
- **Native modules.** `better-sqlite3` is the only one, and it drops out (above). If it comes back, run `npm ci` on the Linux host. Never copy `node_modules` from Windows. Version 11.10 is the installed one; check that the Node 22 prebuild for linux-x64 or arm64 downloads, or that build tools are present.
- **Next and TypeScript.** Next 14.2.35 declares `node >=18.17.0` (`node_modules/next/package.json:323-325`). `@types/node` is already `^22.5.5`.
- **No platform-specific code** in any closure file: no `process.platform`, `osascript`, `/Users/` or Homebrew paths. Import casing was checked.
- **Launcher.** Replace `scripts/serve.mjs` with plain `next dev` / `next start`. The original wraps `next` behind a password gate.
- **Filesystem layout.** Every default store sits under `os.homedir()` (`~/knowledge/brain-store`, `~/.claude/skills`, `~/.claude/projects`, `~/.codex/sessions`). On a Linux server these resolve to the service user's home, so set the env overrides explicitly in deployment.

---

## Minimal copy plan

1. **Scaffold** a fresh Next 14 / React 18 / TS / Tailwind 3 / zod / Vitest app on Node 22. Do not use `better-sqlite3` in this increment.
2. **Pick one UI tree: glados (the G kit).** All four parts have a G presentation, the kit is self-contained, and picking one deletes every `treeFor`/`getAppearance` fork. In `layout.tsx`, put fixed `data-ui="glados" data-accent=… data-mode=… data-theme=… data-ground=…` on `<html>`. Bring a slim `appearance.ts` (or a constant) so `use-palette` and `use-ui-style` still resolve. Leave out Sidebar, Topbar, CommandPalette, Conductor, ModuleGate, LegacySlab, middleware and instrumentation, and write a small nav of your own.
3. **Copy the shared base once:**
   - `components/g/*` plus its lib helpers and `components/ui/{Toast,use-dialog}`
   - `components/system-g/AboutButton.tsx`
   - `components/terminal.tsx`, `components/useSvgCamera.ts`
   - `lib/{format-number,use-palette,brain-graph}.ts`
   - a new `lib/config.ts` (replacing `stores.ts` and `paths.ts`)
   - a new `lib/brain-store.ts` (`readStoreNotes`, `walkMarkdown`)
   - the read half of `lib/skills-catalog.ts`
   - a trimmed `schemas.ts` with only the usage and brain-graph types
   - the carved CSS (tokens, G-kit block, `kg-*`/`kv-*`/`sk-*`), `tailwind.config.ts`, and the Geist fonts
4. **Knowledge Visualizer:**
   - Copy the four lib files and the eight knowledge components. Leave out Drift*.
   - Copy `app/knowledge/page.tsx`, rendering `KnowledgeG` only.
   - In `knowledge-index.ts`, delete the `getDb` block (lines 320–412) and the `client` kind. Optionally add a read-only "records" source from the new OS's agent and tool registry instead.
   - Set the hrefs to null except `/skills`. Prune `client` from `knowledge-views.ts`. Clear the FounderOS-specific `AMBIGUOUS` names.
5. **Brain radial:**
   - Copy `gbrain-observatory.ts` with `isFilming` set to false. Copy `GBrainRadial`, `GBrainRadialLazy` and `gbrain-live`.
   - Add a read-only `app/api/brain/route.ts` that does the local markdown grep, plus `execFile('gbrain','query')` only if the CLI is wanted.
   - Host it on a new `/brain` page, either bare or with `RadialStage` minus `BrainDock`.
   - Replace `SetupLink` with text.
6. **Skills:**
   - Copy `SkillsG` (minus the create sheet) or `SkillsExplorer`/`SkillsGrid`, plus `SkillHierarchy` and `GET /api/skills/[slug]`.
   - Leave out `create`, `propose`, `NewSkillIntake` and the DB fallback (use an empty state).
7. **Usage:**
   - Copy `usage.ts`, `usage-view.ts`, `use-usage.ts`, `UsageG` and `GET /api/usage`.
   - Rewrite `usage-payload.ts` without `getDb`, `push-auth` or `fo-sample` (inline the two sample functions behind an env flag).
   - Reduce `usage-guard.ts` to its env checks. Replace `setupHrefFor` with a constant.
   - Leave out `/api/usage/push`, `UsageClassic`, `UsageLegacy` and `components/legacy/*`. Review the `.paperclip`/`.superset` lane rules.
8. **Tests:** copy and adapt
   - knowledge: `knowledge-index`, `knowledge-metrics`, `knowledge-views`, `knowledge-g`
   - shared: `brain-graph`, `g-kit`
   - brain: `gbrain-observatory`, `gbrain` (search and local fallback only)
   - skills: `skills-catalog` (read cases), `skill-hierarchy-camera`
   - usage: `usage-page`

   Together the source suites are about 1,870 lines. Keep the Vitest `next/font/local` stub alias and the hermetic env block, renamed.
9. **Estimated copy.**
   - The parts themselves: about 9,000 lines after cuts, from roughly 4.0k (knowledge) + 1.9k (brain radial) + 1.3k (skills) + 1.7k (usage).
   - The shared base: about 9,000 lines, mostly the 7.2k-line G kit.
   - The carved CSS: an estimated 3–4k lines out of 19k. Measure this once the carve is done.

   That is roughly 20k lines in all, against the 70k-plus that a naive copy would drag in through `lib/data.ts`.
10. **Verify on Linux, Node 22:** `npm ci && npx tsc --noEmit && npx vitest run && next build`. Then load each page with `GBRAIN_STORE` and the skills directory pointed at fixture folders, and with neither set, to confirm the empty states.
