---
name: yadm
description: Stage, commit, and push named files to the yadm repo. Arguments are paths or loose names.
disable-model-invocation: true
---

# yadm

Stage, commit, and push the files named in the arguments. yadm tracks paths relative to `$HOME`.

Only the resolved target files get committed. Other modified files in `yadm status` stay untouched.

## 1. Resolve each argument to files

Try in order, stop at the first match:

1. **Path**: an existing path (`~/...`, absolute, or relative to cwd) under `$HOME`; else stop.
2. **Tracked name**: `yadm ls-files` and filter by every word in the argument (case-insensitive), e.g. `yadm ls-files | rg -i pi | rg -i settings`.
3. **Untracked name**: search only known config roots, never `~` or `/`:
   `find ~/.config ~/.pi ~/.agents -maxdepth 4 -iname '*<name>*' -not -path '*/node_modules/*'`, plus top-level dotfiles via `ls -d ~/.*<name>*`.

One exact match: proceed. Ambiguous or none: list candidates and ask. Alternates (`file##condition`, e.g. `.zshrc##os.Darwin`) count as separate candidates.

Stop and ask before staging any credential-like file (names containing `auth`, `token`, `secret`, `credential`, or `.env`, or extensions `.pem`, `.key`, or `id_*`).

## 2. Check the index is clean

Run `yadm status`. Never pass `-u` / `--untracked-files` (in any form): it lists every untracked file in `$HOME` and floods the output. Run `yadm diff --cached --name-only`. If the index holds anything that isn't a resolved target, stop and ask. No changes to targets: report nothing to commit and stop.

## 3. Stage and verify

Run `yadm add -- <exact paths>`. Never `yadm add -A`, `.`, or an unlisted directory. Ignored path: stop and report.

Confirm `yadm diff --cached --name-only` matches the targets exactly. Unstage extras with `yadm reset -q -- <path>`.

## 4. Commit

Write a Conventional Commit subject from `yadm diff --cached`: `<type>(<scope>): <imperative description>`. Use the tool name as the scope (`pi`, `zsh`, `ghostty`). Example: `chore(zsh): track zshrc`.

One commit per tool or scope; stage and commit each group separately.

## 5. Push

Run `yadm push`. Never force-push. If the push is rejected, stop and report; don't pull or rebase without asking.

## Report

Commit hashes and subjects, push result, and any targets skipped or left for the user.
