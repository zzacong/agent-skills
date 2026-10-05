---
name: worktree-session
description: Create a Git worktree for the requested task under the shared ~/Developer/worktrees layout, and move the current session into it when the harness supports a session API.
argument-hint: "Task slug or short description"
---

# Worktree session

Use this skill as the first step for work that should happen on a new branch. It creates the worktree, moves this session to it, and only then starts the requested task.

## Harness support

The worktree convention applies in every harness. Create the worktree under `~/Developer/worktrees/<repository>/<slug>`, branch from the current `HEAD`, and copy any `.worktreeinclude` files. Do all of that even when the harness has no session API.

Only the session move depends on the harness. Perform it when the running harness can relocate the current session to another directory, which OpenCode does through the V2 API (`opencode api session.get`, `opencode api session.move`). Check for that capability at runtime instead of assuming it. Without it, create and verify the worktree as normal, then tell the user the branch and absolute path and that the session stayed where it was because this harness cannot move it. A missing session API is never a reason to skip the worktree.

## Process

### 1. Establish the task and repository

1. Read the invocation argument. If it does not provide a clear task or short slug, ask the user for one before running commands.
2. Normalize the task into a lowercase ASCII slug containing only letters, numbers, and hyphens. Use the slug for the worktree directory.
3. Read any applicable `AGENTS.md` or `CLAUDE.md` instructions before choosing the branch name. Follow any documented branch naming rule. Otherwise use `opencode/<slug>`.
4. Resolve the current repository and require a clean source worktree:

   ```sh
   repo_root="$(git rev-parse --show-toplevel)"
   git status --short
   ```

   If `git status --short` prints anything, stop and ask the user to commit, stash, or otherwise account for those changes. `git worktree add` starts from `HEAD`; it does not copy uncommitted changes.

5. If the harness can move sessions, confirm it is available and that you can read the current session. Use the session ID from the session context, not a newly created session or one picked from a list:

   ```sh
   command -v opencode
   command -v jq
   session_id="<current session ID>"
   opencode api session.get --param "sessionID=$session_id"
   ```

   Stop before changing Git state if a check fails. Without this capability, skip the step and keep going.

### 2. Choose the worktree location

Always use the shared `~/Developer/worktrees/<repository>/<slug>` layout. This keeps new worktrees outside the current checkout, including when the current checkout is already a linked worktree.

```sh
main_root="$(git worktree list --porcelain | sed -n '1s/^worktree //p')"
repo_name="$(basename "$main_root")"
worktree_root="$HOME/Developer/worktrees/$repo_name"
mkdir -p "$worktree_root"

slug="<normalized slug>"
destination="$worktree_root/$slug"
branch="<branch name selected under repository rules>"
```

Check both the destination path and branch name before creating anything:

```sh
if [ -e "$destination" ] || [ -L "$destination" ]; then
  printf 'Worktree path already exists: %s\n' "$destination" >&2
  exit 1
fi

if git show-ref --verify --quiet "refs/heads/$branch"; then
  printf 'Branch already exists: %s\n' "$branch" >&2
  exit 1
fi
```

If either exists, stop and ask for a different slug or branch. Do not reuse an existing worktree for a new task.

### 3. Create and move

Create the branch and worktree from the current `HEAD`:

```sh
git worktree add -b "$branch" "$destination" HEAD
```

A worktree holds only tracked files, so Git-ignored local files stay
behind and the new checkout can behave differently from the one it came
from. Local credentials, environment files, and machine-specific config
are common cases. If the repository root has a `.worktreeinclude` file
(the Claude Code convention, Git-ignore syntax, only ignored files are
copied), copy every file it names into the worktree:

```sh
if [ -f "$repo_root/.worktreeinclude" ]; then
  while IFS= read -r entry || [ -n "$entry" ]; do
    case "$entry" in ''|\#*) continue ;; esac
    git -C "$repo_root" ls-files --others --ignored --exclude-standard -- "$entry" |
      while IFS= read -r file; do
        [ -n "$file" ] || continue
        mkdir -p "$destination/$(dirname "$file")"
        cp -p "$repo_root/$file" "$destination/$file"
      done
  done < "$repo_root/.worktreeinclude"
fi
```

Do this before the session move so the checkout is complete when the
session lands, and stop if the copy fails.

When the harness supports it, move the current session to the new directory after that command succeeds. The destination is another checkout of the same Git project, so the move relocates the session without creating a second one:

```sh
payload="$(jq -n --arg directory "$destination" '{directory: $directory}')"
opencode api session.move \
  --param "sessionID=$session_id" \
  --data "$payload"
```

If the move fails, leave the new worktree in place, report its path and the error, and stop. Do not begin the task in the old worktree.

### 4. Verify before implementation

Require all of these checks to pass:

```sh
test "$(git -C "$destination" rev-parse --show-toplevel)" = "$destination"
test "$(git -C "$destination" branch --show-current)" = "$branch"
test -z "$(git -C "$destination" status --short)"
```

If you moved the session, also require:

```sh
opencode api session.get --param "sessionID=$session_id" \
  | jq -e --arg directory "$destination" '.data.location.directory == $directory' >/dev/null
```

A session move is complete only when the harness reports the new directory. Use the destination as the working directory for every later command. If a moved session still reports the old directory, stop and fix the session context before editing files. In a harness without a session API, run every later command against the destination yourself and say so when you report the setup.

Once these checks pass, continue with the requested task in the new worktree. Report the branch and absolute worktree path when the setup is complete.
