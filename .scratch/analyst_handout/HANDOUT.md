# AI Engineering Handout

A starting kit for someone who is expert in their own profession and new to working with AI agents. It was written for a senior sales and marketing analyst, and it works for any newcomer: change the persona block in the starter prompt, and read the sales examples below as placeholders for your own work.

The aim is not to study AI engineering. It is to install a small set of tools, paste one prompt, and learn by shipping something useful every week for five to six weeks.

## What is in the kit

| File | What it is for |
| --- | --- |
| `HANDOUT.md` | This page: what to install, how to start, what the six weeks cover |
| `starter-prompt.md` | The one prompt you paste into an agent to begin |
| `working-with-agents.pdf` | Guide map and cheatsheet: prompt, context window, harness |
| `Agentic OS tool matrix.xlsx` | Inventory of tools: where the starting set comes from and where you look for the next one |

## Where you will be in five to six weeks

You will be able to:

- brief a coding agent and judge what it returns
- use Claude Cowork for high-level tasks and quick prototypes
- experiment and vibe code in OpenCode
- decide when a plugin, a connector, a skill or a coding agent is the right tool
- work with VS Code and Cowork on the same folder

**The ceiling is vibe coding.** You describe, steer and review; the agent writes. You will not become a software engineer and you do not need to. Basic version control is the only engineering habit you must pick up.

## 1. Install before day one

Everything here should be working before the first session, so that the first session is about your work and not about setup. Budget an hour. If a step fails, paste the error into Claude and ask what to do: that is already the first lesson.

| # | Tool | Why you need it | Get it | Check it works |
| --- | --- | --- | --- | --- |
| 1 | **Claude desktop app with Cowork** (paid plan) | Your main surface for high-level tasks, documents and prototypes | claude.com/download | Open the Cowork tab and pick a folder |
| 2 | **Git** | Saves every version of your work so nothing an agent does is permanent | git-scm.com | `git --version` |
| 3 | **GitHub account** | Online copy of your folders; where tickets live later | github.com | You can sign in |
| 4 | **VS Code** | The window where you see files, changes and a terminal | code.visualstudio.com | It opens a folder |
| 5 | **Python 3.12 or newer** | Agents write small scripts in it, for example to read the tool matrix; you only need it installed | python.org | `python --version` (`python3 --version` on macOS) |
| 6 | **Node.js LTS** | Needed to install OpenCode and the skills | nodejs.org | `node --version` |
| 7 | **OpenCode** | An open coding agent for experiments and vibe coding | `npm install -g @opencode/cli` (see opencode.ai/docs if this changes) | `opencode --version`, then `/connect` inside it to choose a model. This needs a model provider account or API key, separate from the Claude plan: ask whoever gave you this kit |
| 8 | **Matt Pocock skills** | Ready-made working methods: interview, spec, tickets, implement, handoff | Installed in section 2, step 5, because they live in your journey folder | Type `/grill-me` in OpenCode |
| 9 | **Obsidian** | Shows your notes folder as a linked knowledge base | obsidian.md | It opens a folder as a vault |
| 10 | **NotebookLM** | Question-and-answer over a pile of sources; nothing to install | notebooklm.google.com | You can create a notebook |

The check commands are typed in a terminal. In VS Code: menu *Terminal → New Terminal*.

## 2. Start

1. Create a folder called `ai-journey` and inside it a folder called `sources`.
2. Copy `working-with-agents.pdf` and `Agentic OS tool matrix.xlsx` into `sources`.
3. Open `ai-journey` in VS Code and open its terminal.
4. Give the folder a history. Type these four lines, with your own name and email:

   ```text
   git init
   git config --global user.name "Your Name"
   git config --global user.email "you@example.com"
   git add . && git commit -m "start"
   ```

   The last line is a save point. Repeat it, with a different message, whenever you want one.
5. Install the skills: `npx skills@latest add mattpocock/skills`. When it asks which skills, take `setup-matt-pocock-skills`, `grill-me`, `to-spec`, `to-tickets`, `implement` and `handoff`.
6. Open `starter-prompt.md` and edit the six lines of the **persona** block so they describe you.
7. In the same terminal type `opencode`. Run `/setup-matt-pocock-skills` once: choose local files as the issue tracker and accept the suggested defaults for the rest.
8. Paste the whole of `starter-prompt.md` and press Enter.
9. Answer the questions. Be honest about what you do not know; the agent builds the roadmap from your answers.

Steps 1 to 7 take about fifteen minutes; the interview takes 30 to 45.

Cowork can run the prompt too: choose `ai-journey` as its folder and paste it there. The slash commands may not be available in Cowork, so the prompt tells the agent to interview you the same way without them.

## 3. What the prompt does

The agent reads the two attachments, then runs a `/grill-me` interview, one question at a time. It works through eight things:

| It establishes | So that |
| --- | --- |
| Your hard skills | the roadmap builds on what you are already expert at |
| Your real AI proficiency, tested with a small live task | nothing starts too easy or too hard |
| A map from your current skills to AI | you see which of your tasks an agent can take over |
| User stories from your work | every week produces something you actually want |
| Your learning style and preferences | sessions fit your pace and time |
| Progression and difficulty levels | you know when you have moved up |
| Likely bottlenecks | stalls are caught in week one, not week four |
| One task you can do today | you ship something in the first hour |

It also asks you to walk through three real examples from your work, including one that went badly. It then restates what it understood and waits. Only after you say "yes, that's it" does it propose the roadmap and build the rest of your workspace around the `sources/` folder you made: a `wiki/` it writes and keeps current, and an `AGENTS.md` with the rules of the folder.

The roadmap is **recursive**: each week ends with a review that updates the wiki, the roadmap and the rules, so the next week starts from a better setup. What you do twice becomes a saved prompt; three times, a skill. By the last week you run the loop yourself and can rewrite the starter prompt for a colleague.

## 4. The topics, week by week

These are the eleven topics, in a default order over six weeks. The roadmap the agent proposes after the interview replaces this order and may fit it into five. Each week has one shipped thing, taken from your own user stories; the examples below are from sales and marketing.

| Week | Topics | Where you work | You ship, for example |
| --- | --- | --- | --- |
| 1 | Prompt design and prompt patterns · Context engineering | Cowork | A reusable brief that turns raw call notes into an account plan |
| 2 | Knowledge bases (LLM wiki, Obsidian, NotebookLM) · Ontology-governed workflows | Cowork, Obsidian, NotebookLM | A wiki on one market or account, with an agreed glossary of terms |
| 3 | VS Code and the terminal · Version tracking with Git and GitHub | VS Code and Cowork on the same folder | A Cowork task whose changes you reviewed in VS Code, committed and pushed to GitHub |
| 4 | Coding agents and OpenCode · Spec-driven development | OpenCode in VS Code | A small tool built from a written spec, such as a lead-scoring sheet or a landing page |
| 5 | Skills and MCP · Ticketing and implementation | OpenCode, Cowork | Your own skill for a task you repeat, one connector wired in, one feature delivered ticket by ticket |
| 6 | Harnesses · Capstone | All of them | A routine that runs on a schedule with rules and checks, and the starter prompt rewritten for a colleague |

What each topic means in one line:

- **Prompt design and patterns.** Writing a request so it cannot be misread: task, context, reference, success brief, rules.
- **Context engineering.** Choosing what the agent sees. Small, relevant context beats a long chat.
- **Knowledge bases.** Notes the agent maintains for you, so knowledge accumulates instead of being re-explained.
- **Ontology-governed workflows.** Agree the words and the things first (lead, account, qualified, done), then let the workflow follow those definitions.
- **Spec-driven development.** Write down what you want and how you will know it works before anything is built.
- **VS Code and the terminal.** One window for files, changes and commands. You need about ten commands.
- **Git and GitHub.** Save points. Commit before the agent changes things, and you can always go back.
- **Coding agents and OpenCode.** An agent that edits files and runs commands in your folder while you steer.
- **Skills and MCP.** Skills are saved working methods. MCP servers and connectors plug the agent into other systems.
- **Ticketing and implementation.** Cut a spec into small tickets and let the agent do them one at a time.
- **Harnesses.** Everything around the model that lets it work safely: permissions, memory, hooks, checks.

## 5. Which tool for which job

| You want to | Use | Because |
| --- | --- | --- |
| Think, research, draft, make a document or a deck | **Cowork** | It works on files and connectors without a terminal |
| Reach your email, calendar, CRM or drive | A **connector** in Cowork | It is one click and maintained for you |
| Get a whole role's toolkit, such as sales or marketing | A **plugin** in Cowork | It bundles skills and connectors that fit together |
| Repeat a method you have used three times | A **skill** | It turns your way of working into one command |
| Build or change something made of files: a tool, a site, a script | A **coding agent** (OpenCode) in VS Code | It can edit, run and test, and Git shows every change |
| Ask questions across many sources | **NotebookLM** or your wiki | Answers come with their sources |

Rule of thumb: start in Cowork. Move to a coding agent when the result is a thing that must keep working, not a document. Add a plugin, connector or skill only when a real task needs it, one at a time.

VS Code and Cowork work well together on the same folder: Cowork does the task, VS Code shows you exactly which files changed, and a commit saves the result.

## 6. How to use the two attachments

**`working-with-agents.pdf`** is the map. Its four parts match the journey:

| Part of the cheatsheet | Use it in |
| --- | --- |
| Anatomy of a Prompt | Week 1 |
| Context Engineering for Coding Agents (grill → spec → tickets → implement → handoff) | Weeks 1, 4 and 5 |
| Harness Engineering | Week 6 |
| Three Paradigms: prompt, context, harness | Whenever you feel lost |

**`Agentic OS tool matrix.xlsx`** is the inventory, with 766 tools. Do not read it. The install table in section 1 is your day-one set; the matrix is where you look for the next tool. Filter it:

- Sheet *Matrix*, column *Used by* contains your role ("Analyst" here), column *Decision class* is "Core v1" or "Skill / rule": this is your shortlist of about 70 committed tools.
- Pick the clusters closest to your work. For sales and marketing: *3H Marketing, content and distribution*, *3I Sales, CRM and outreach*, *3J Client measurement and analytics*, *3C Research, news and opportunity monitoring*, *4G Knowledge work surface*.
- Sheet *Axes* explains every column.

When a task needs a tool you do not have, ask the agent to look in the matrix first, explain its pick, and log the addition in your wiki.

## 7. Five habits that keep you safe

1. **Commit before you let an agent change things.** Then nothing is lost.
2. **Read the plan before you approve it.** Ask the agent to plan first and build second.
3. **Keep secrets and client data out of prompts** unless you know where they go.
4. **Start a fresh session when the chat gets long.** Use `/handoff` to carry the state over.
5. **"The agent built it" is not done.** Done means it works, you used it, and you can explain it.

## For whoever hands this out

- Edit the persona block in `starter-prompt.md` for the person, or let them do it.
- Send the four files together. The tool matrix lives at the repository root.
- Give them a model provider for OpenCode (an account or an API key with a spending limit).
- Sit with them for the installs if you can. Setup is the most common place to stall.
- Ask for the `wiki/log.md` at the end of week one. It shows whether the loop is running.
