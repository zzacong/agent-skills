# agent-skills

A versioned collection of agent skills, published to
[skills.sh](https://skills.sh) and consumed by
[fleet](https://github.com/zzacong/fleet).

## Layout

```
skills/
  babysit-pr/SKILL.md
  choose-flow/SKILL.md
  create-plan/SKILL.md
  file-pr/SKILL.md
  postplan/SKILL.md
  postplan-read/SKILL.md
  rebase-pr/SKILL.md
  ticket-sweep/SKILL.md
  worktree-finish/SKILL.md
  worktree-session/SKILL.md
```

Each immediate child directory of `skills/` containing a `SKILL.md` is a skill.
The frontmatter `name` falls back to the directory name.

`skills/` stays at the repo root so the repo matches the layout fleet expects
from a customs repo (`<repo>/skills`). Point fleet at it with:

```sh
fleet skill pull git@github.com:zzacong/agent-skills.git
```

## Skills

- `babysit-pr` — watch a pull request's checks until they finish, then diagnose
  failures.
- `choose-flow` — estimate the size of the current work and recommend whether
  to use /implement, /to-spec, or /to-tickets next.
- `create-plan` — numbered implementation plan in `.plans/`.
- `file-pr` — file a concise pull request, then monitor its checks.
- `postplan` — publish a plan, proposal, brief, architecture note, or similar
  document as a static HTML draft on Postplan.
- `postplan-read` — fetch and read a `postplan.dev` URL.
- `rebase-pr` — rebase an open pull request onto main, push it, then monitor
  its checks.
- `ticket-sweep` — implement all open local tickets in dependency order.
- `worktree-finish` — squash-merge a worktree branch into main, then remove the
  worktree and the branch.
- `worktree-session` — create a Git worktree for the requested task and move
  the current session there.
