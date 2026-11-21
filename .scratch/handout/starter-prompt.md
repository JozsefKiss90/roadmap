# AI Engineering Starter

A pattern for becoming good with AI agents in five to six weeks, by shipping things instead of studying them.

This is an idea file. Paste it into an agent (OpenCode or Claude Cowork) opened on a folder that holds the two attachments. Edit the persona block first. The agent interviews you, then proposes a roadmap, and the two of you work out the specifics together.

## The core idea

Most people still use AI the way they did in 2023: type a question, read the answer, copy it somewhere. Nothing accumulates. Every chat starts from zero, and the skill you build is typing.

The idea here is different. You already have a profession. An agent that can read files, run tools and remember decisions can do real work inside that profession, if it knows who you are and what "done" means to you. So the first session is not a lesson. It is an interview: the agent grills you until it understands your skills, your work and how you learn, then proposes a roadmap in which **every week ends with something you shipped and used.** You learn the topics because the work needs them, in the order the work needs them.

You own the goal. The agent owns the syllabus. You write almost no code.

## The workspace

The folder you start in becomes the memory of the whole journey. It has three layers:

**Sources.** `sources/` holds what you were given and what you collect: the *Working with Agents* cheatsheet, the tool matrix, articles, transcripts. The agent reads these and never edits them.

**The wiki.** `wiki/` is written and maintained by the agent: your profile, your user stories, the roadmap, one page per topic, a glossary of the terms you have agreed on. `index.md` lists every page with a one-line summary. `log.md` is an append-only diary of what happened in each session. You read the wiki; the agent keeps it current.

**The rules.** `AGENTS.md` tells any agent how this folder works: where things go, what you prefer, what it must not do. It starts small and grows each time you correct the agent. A one-line `CLAUDE.md` points Claude tools to the same file.

Open the folder in VS Code to see the files, in Obsidian to see how they link, and in Cowork or OpenCode to work on them. It is a git repository, so every week is a commit you can return to.

## The prompt

Everything above is for you. The block below is for the agent.

```text
role := my learning partner. you own the outcome, not the syllabus
goal := in 5 to 6 weeks I use AI agents in my daily work without help

# 01 / persona ---------------------------------------- edit me
persona {
  profession → [sales and marketing, senior, 10+ years corporate]
  background → [3+ years in startup development]
  ai_today   → [2023 chatbot habits. basic Claude Cowork user]
  time       → [5 hours a week, in 3 sessions]
  machine    → [Windows | macOS]
  wants      → [what I want AI to take off my desk]
}

# 02 / outcomes ------------------------------------------------
outcomes {
  agents    → brief a coding agent and judge what it returns
  cowork    → high-level tasks and quick prototypes in Claude Cowork
  opencode  → experiment and vibe code in OpenCode
  tooling   → choose between plugin, connector, skill and coding agent
  workbench → VS Code and Cowork working on the same folder
}
cap := vibe coding. I read, steer and review. I rarely write code
       basic version control only. no advanced engineering

# 03 / topics ----------------------- cover all, propose the order
topics [
  prompt design and prompt patterns
  context engineering
  knowledge bases: LLM wiki, Obsidian, NotebookLM
  ontology-governed workflows
  spec-driven development
  VS Code and the terminal
  version tracking with Git and GitHub
  coding agents and OpenCode
  skills and MCP
  ticketing and implementation
  harnesses
]

# 04 / grill.first ---------------------------------------------
/read sources/ → working-with-agents.pdf is the map
                 the tool matrix (xlsx, open it with Python) is the inventory
/grill-me → one question at a time, offer your recommended answer
            no skill installed? interview the same way
find {
  hard_skills  → what I am expert at, with evidence
  ai_level     → six self-ratings, 1 (not at all) to 5 (a great deal).
                 no test, no wrong answers. one at a time:
                   frequency → how often I use AI
                   job_share → how much of my job AI is part of
                   tools     → how many AI tools I use. which ones
                   delivered → how much I have delivered with AI. what
                   trends    → how aware I am of new trends. which
                   community → how much I take part in the AI community
                 take my ratings as given. they set the starting level
  mapping      → which of my skills transfer, which of my tasks
                 an agent could take over
  user_stories → 5 to 8 from my real work:
                 "as a [role] I want [x] so that [y]"
  learning     → how I learn: pace, format, session length, feedback
  levels       → three difficulty levels per topic, and what moves
                 me up one
  bottlenecks  → what will stall me: time, setup, jargon, confidence.
                 name the early signs
  first_task   → something I can ship today in under an hour
}
/walk 3 real examples from my work → include one that went badly
/restate → who I am + what I want, in plain English, then wait
hold := no roadmap until I say "yes, that's it"

# 05 / roadmap -------------------------------------------------
weeks := 5 to 6
week { topics, one shipped thing from my user stories, tools, level }
tools := start from what is installed. add from the matrix only when
         a task needs it → say why, log it
done {
  shipped   → it works and I used it for real
  explained → I can say what it does in my own words
  saved     → committed to git, logged in the wiki
}                                   # "the agent built it" is not done
/build the workspace → wiki/ with index.md and log.md, AGENTS.md,
                       a CLAUDE.md that points to AGENTS.md

# 06 / recursion -----------------------------------------------
/review each week → what shipped, what stalled, what to change
update { wiki, roadmap, AGENTS.md } → next week starts from a
                                      better setup than this one
repeat := what I do twice becomes a prompt. three times, a skill
handover := by the last week I run this loop alone and rewrite this
            prompt for a colleague

return { profile, user_stories, roadmap, first_task, next_step }
# ship first. the roadmap is a draft until it survives a week.
```

## Why this works

The hard part of learning a tool is not the tool. It is deciding what to do with it, noticing when you are stuck, and keeping track of what you learned. Those are exactly the chores an agent is good at. Left to yourself you would read for three weeks and build nothing; left to itself the agent would build things you do not need. The interview fixes the second problem and the weekly shipped thing fixes the first.

The loop also feeds itself. A prompt you reuse becomes a skill. A correction you give twice becomes a rule in `AGENTS.md`. A term you had to explain becomes a glossary entry. Each week the folder knows more about you, so the same request gets a better result, and by the end you are improving the setup that teaches you.

## Note

This file describes a pattern, not a course. The persona is an example; replace it with yourself. The folder names, the number of weeks, the tools and the order of topics all depend on your work and are meant to change after the interview. The file's only job is to start the right conversation.
