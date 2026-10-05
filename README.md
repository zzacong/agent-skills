# agent-skills

A versioned collection of agent skills, published to
[skills.sh](https://skills.sh).

Each immediate child directory of `skills/` containing a `SKILL.md` is a skill.
The frontmatter `name` falls back to the directory name.

## Skills

| Skill              | What it does                                                                                  |
| ------------------ | --------------------------------------------------------------------------------------------- |
| `babysit-pr`       | Watch a pull request's checks until they finish, then diagnose failures.                      |
| `choose-flow`      | Estimate the size of the current work and recommend /implement, /to-spec, or /to-tickets.     |
| `create-plan`      | Numbered implementation plan in `.plans/`.                                                    |
| `delta`            | Explain anything from the thread as a before-and-after, in whatever form is easiest to grasp. |
| `file-pr`          | File a concise pull request, then monitor its checks.                                         |
| `postplan`         | Publish a plan, proposal, brief, or similar document as a static HTML draft on Postplan.      |
| `postplan-read`    | Fetch and read a `postplan.dev` URL.                                                          |
| `rebase-pr`        | Rebase an open pull request onto main, push it, then monitor its checks.                      |
| `ticket-sweep`     | Implement all open local tickets in dependency order.                                         |
| `worktree-finish`  | Squash-merge a worktree branch into main, then remove the worktree and the branch.            |
| `worktree-session` | Create a Git worktree for the task and move the current session there.                        |

## Development

Requires Node 22.18+ and pnpm.

```sh
pnpm install
pnpm run fmt      # format Markdown, YAML, and JSON with oxfmt
pnpm run lint     # lint with oxlint
pnpm run check    # fmt --check + lint
```
