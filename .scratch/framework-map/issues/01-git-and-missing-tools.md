# 01: Put the repository under git and install the missing tools

**What to build:** The repository is under version control, and every tool in the settled toolset is either installed and usable from Claude Code or recorded as dropped. After this ticket, later tickets can end in a commit and can call the design and three.js skills and the Playwright MCP server.

The tools not installed today are threejs-skills, Impeccable, frontend-design, ui-ux-pro-max and the Playwright MCP server (headless). Only free tools are allowed. See the spec at `.scratch/framework-map/spec.md`, Further Notes, open question 3.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [x] The repository is a git repository with a first commit of the current files
- [x] An ignore file keeps dependencies, build caches and screenshots out of version control
- [x] Each of threejs-skills, Impeccable, frontend-design, ui-ux-pro-max and Playwright MCP is installed, confirmed free, and confirmed callable in a fresh session
- [x] Any tool that cannot be installed or is not free is dropped, and this ticket records which one and why under Comments
- [x] If a design skill is dropped, the order of authority (style guide, Impeccable, frontend-design, ui-ux-pro-max) is restated without it under Comments
- [x] The work is committed

## Comments

### 2026-11-17: done, nothing dropped

All five tools are installed at project scope, so they travel with the repository. None was dropped, so the order of authority stands unchanged: style guide, Impeccable, frontend-design, ui-ux-pro-max.

| Tool | Source | Licence | How it is installed | Fresh-session check |
| --- | --- | --- | --- | --- |
| threejs-skills | `CloudAI-X/threejs-skills` | MIT | `npx skills add`, all 13 `threejs-*` skills in `.claude/skills/` | All 13 listed |
| Impeccable | `pbakaus/impeccable`, skill 4.9.2 | Apache-2.0 | `npx skills add`, `.claude/skills/impeccable/` | Listed as `impeccable` |
| ui-ux-pro-max | `nextlevelbuilder/ui-ux-pro-max-skill` | MIT | `npx skills add`, `.claude/skills/ui-ux-pro-max/` | Listed; a `search.py` lookup returned results |
| frontend-design | Anthropic plugin directory | Apache-2.0 | Plugin enabled in `.claude/settings.json` | Listed as `frontend-design:frontend-design` |
| Playwright MCP | `@playwright/mcp` 0.0.85, pinned | Apache-2.0 | `.mcp.json`, headless | Opened `diagrams/roadmap-stack.html` by `file://`, saved a screenshot, 0 console errors |

The fresh-session check was a separate `claude -p` run. Licences were read from the GitHub API and npm on this date.

Things later tickets need to know:

- **`.mcp.json` is written for Windows.** It starts the server through `cmd /c npx`; on macOS or Linux the command would be plain `npx`.
- **Playwright MCP needs one approval.** Claude Code holds a project MCP server as "pending approval" until a person accepts it at the next interactive start. The check above passed the config in explicitly with `--mcp-config .mcp.json`.
- **Playwright MCP blocks `file://` by default.** The map is a single file opened from disk (ADR 0003), so `.mcp.json` sets `--allow-unrestricted-file-access`. That also lets the server read files outside the repository.
- **Playwright MCP writes page snapshots to `.playwright-mcp/`**, which is ignored. A screenshot given a bare filename lands in the working directory, so save screenshots under `screenshots/`.
- **Impeccable's engine has not been run.** Its launcher downloads a native binary (engine 0.1.25) from the project's GitHub releases on first use and checks it against the pinned SHA-256. One of the `skills` installer's auditors rates the skill "Critical Risk" for this; the other two report it safe. The critique rubric is plain markdown and works without the engine. Impeccable can also install an edit hook (`impeccable hooks on`); it is not enabled.
- **Only the `ui-ux-pro-max` skill was taken from its repository.** The six sibling skills (banner-design, brand, design, design-system, slides, ui-styling) are outside the settled toolset. It needs Python 3; 3.11 is present.
- **`.gitattributes` stores text files with LF line endings** (`.cmd` files keep CRLF). The `skills` installer wrote the new skills with CRLF on this Windows machine; `scripts/impeccable`, the shell launcher, was checked out again with LF so that it runs under Git Bash.
- **The three new skill packs are locked by content hash only.** The installer wrote no `commit` for them in `skills-lock.json`, unlike the older `mattpocock/skills` entries. The copies in `.claude/skills/` are the versions in use.
- **frontend-design is enabled here, not vendored.** `.claude/settings.json` turns the plugin on; the plugin files come from Claude Code's built-in Anthropic directory and sit in the per-user cache. Whether another clone resolves it without a manual install is untested.
- **`.gitignore` also covers `.serena/` and Python bytecode**, both per-machine output.
