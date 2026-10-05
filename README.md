# agent-skills

A versioned collection of agent skills, published to
[skills.sh](https://skills.sh).

Each immediate child directory of `skills/` containing a `SKILL.md` is a skill.
The frontmatter `name` falls back to the directory name.

## Skills

- `babysit-pr` — watch a pull request's checks until they finish, then diagnose
  failures.
- `choose-flow` — estimate the size of the current work and recommend whether
  to use /implement, /to-spec, or /to-tickets next.
- `create-plan` — numbered implementation plan in `.plans/`.
- `delta` — explain anything from the thread as a before-and-after, in whatever
  form is easiest to grasp.
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

## Development

Requires Node 22.18+ and pnpm.

```sh
pnpm install
pnpm run fmt      # format Markdown, YAML, and JSON with oxfmt
pnpm run lint     # lint with oxlint
pnpm run check    # fmt --check + lint
```
