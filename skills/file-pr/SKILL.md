---
name: file-pr
description: File a concise pull request, then monitor its checks. Use when the user asks to file, open, or create a PR.
---

# File PR

1. Check for an existing PR

Check for an open PR on the current branch before doing anything else. If one
exists, update it instead of filing a second. Before pushing to it, confirm
the head branch and head repository are yours to write to — the PR may sit on
someone else's fork.

2. Prep the branch

Rebase onto latest `main`, then review the diff against `origin/main` to
confirm it matches the goal.

Check whether the branch is already pushed; an open PR isn't the only signal,
since a closed or hand-pushed branch counts too. If it is, push the rebase
with `--force-with-lease` pinned to the SHA you reviewed, and stop if the
lease rejects. If the branch is already up to date with `main`, skip the
rebase.

If a PR already exists and is behind `main`, `rebase-pr` owns that; don't
rebase here.

Run the repo's local check command and fix what it reports before filing. If
it fails for a reason outside this change, report it and ask whether to file
anyway.

Push the branch, setting an upstream if it doesn't have one.

3. Write the title

Match repo convention from recent merges. State why the change matters in
plain words.

Bad:

> perf(server): negotiate permessage-deflate on the websocket

Good:

> perf(server): cut websocket frame size by 70%+ with gzipping

4. Write the description

The description is for a reviewer who wasn't in the thread and can't ask you a
question. Five parts, in order:

1. The problem and why it hurt
2. The solution
3. The visible effect, before and after
4. How it works
5. The testing

Parts 3 to 5 have their own sections below. Don't begin with implementation
details.

Bad:

> Removed implicit workspace carry-over from all "new thread" entry points.
> Deleted buildContextualThreadOptions, startNewThreadInProjectFromContext,
> and the sidebar seed-context machinery.

Good:

> My "new worktree" default was ignored when starting new threads on existing
> worktrees. Super unintuitive. Now your preferences always apply.

### Show the effect

Wherever the change is visible, show the before and the after. Pick the medium
that fits what changed:

| What changed                  | Show it as                                          |
| ----------------------------- | --------------------------------------------------- |
| CLI output, logs, errors      | before/after transcript, trimmed                    |
| A page, component, or style   | before/after screenshots                            |
| An API response or data shape | before/after payloads                               |
| A document, plan, or message  | before/after prose, the actual text                 |
| A number, count, or timing    | a table with real figures                           |
| Types, schemas, validation    | before/after of the type, or a test that now passes |
| A design or architecture      | before/after diagrams                               |

Show the artefact, not a description of it. Fences and images both work; the
format is yours to choose.

Below is one filled-in example, a CLI, so it shows fences. Don't copy the medium
from it. Copy the shape: measured problem, real before, real after.

Good:

> `fleet skill doctor` printed one paragraph per double-presence finding. Twelve
> colliding skills became twelve near-identical paragraphs, and you scanned past
> the same two hundred characters to find the one value that changed. It now
> groups by harness and home pair. Two colliding repos take a few lines.
>
> Before:
>
> ```text
> ⚠ double presence (10)
> "babysit-pr" exists in both the explicit repo (/Users/zacong/…/skills/babysit-pr) and the explicit repo (/Users/zacong/…/skills/babysit-pr) — opencode and pi would see it twice — resolve by hand (remove one of the copies: …)
> … 9 more near-identical paragraphs
> ```
>
> After:
>
> ```text
> ⚠ double presence (10)
>   opencode  duplicated in ~/Developer/projects/fleet/skills and ~/Developer/projects/agent-skills/skills — remove one copy by hand
>             babysit-pr, choose-flow, file-pr, postplan, ticket-sweep
>   pi        duplicated in ~/Developer/projects/fleet/skills and ~/Developer/projects/agent-skills/skills — remove one copy by hand
>             babysit-pr, choose-flow, file-pr, postplan, ticket-sweep
> ```

Bad:

> Significantly reduced output verbosity.

Rules:

- Show the output; don't describe it. If there's nothing to show, say the change
  has no visible effect.
- Match the medium to the repo. A CLI change gets a transcript, a web change
  gets screenshots, a docs change gets the rewritten paragraphs.
- A screenshot needs a caption saying what to look at. A reviewer skims images.
- One before/after pair per PR, for the change a user would notice first. Even
  when the change spans a data model, a renderer, and docs. If a second pair
  seems necessary, the first one wasn't the right choice.
- Elide with a count, not a bare ellipsis. The reader should know how much
  they're not seeing.
- Measure the problem. Counts and sizes beat adjectives.
- No evidence is a fine outcome. A refactor with no observable behaviour change
  needs none. Don't manufacture one.

### Explain how it works

One paragraph on the mechanism: the data or API change, the new code path, and
anything hardcoded becoming computed. Name the files. Skip the tour of every
hunk.

### State the testing

The commands run, and what each test asserts. Name the manual check if you did
one. Say what you skipped.

5. Add attribution

> Generated by [model] via [harness]

`[model]` must be the exact model identifier your harness reports — preserve
its spelling, casing, and version. Don't substitute the provider name, model
family, or a nickname (e.g. `GPT-5.6 Luna`, not "GPT" or "OpenAI").
If you can't determine the exact identifier, ask before filing the PR.

6. Open the PR

Open ready for review so bots run. Use draft only if the user explicitly asks.

7. Babysit the PR

After creating or updating the PR, invoke `babysit-pr` with its URL and follow
it to completion.
