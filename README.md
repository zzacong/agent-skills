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

Requires Bun 1.4+.

```sh
bun install
bun run fmt         # format Markdown, YAML, and JSON with oxfmt
bun run lint        # lint with oxlint
bun run typecheck   # tsc --noEmit
bun test            # bun test
bun run check       # fmt --check + lint + typecheck + test
```

### Wrapping prose at 80 columns

`oxfmt` is configured with `proseWrap: preserve`, so it never rewraps prose.
To reflow Markdown text to 80 columns, use `scripts/wrap-markdown.ts`. It
touches only paragraph text and copies everything else through unchanged:
front matter, headings, code fences, indented code, tables, HTML blocks,
thematic breaks, and link definitions. Blockquote markers and list hanging
indents are preserved, as are hard line breaks. CJK and emoji are measured as
two columns, and unspaced CJK wraps at character boundaries.

```sh
bun run wrap README.md skills/delta/SKILL.md   # rewrite in place
bun run wrap --diff README.md                  # preview as a unified diff
bun run wrap --width 100 --stdout README.md    # other widths, to stdout
bun run wrap:check README.md                   # exit 1 if it needs wrapping
```

The wrapper is idempotent. Tests live in `scripts/wrap-markdown.test.ts`
(`bun test`) and cover both the wrapper and the unified diff it emits.
