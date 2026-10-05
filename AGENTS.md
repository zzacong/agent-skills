# AGENTS.md

## Skills

- Each skill lives in `skills/<name>/SKILL.md`. Keep its `name` aligned
  with the directory name.
- For every new or revised skill, choose whether the agent may invoke it
  automatically or only after a human explicitly asks. For manual-only skills,
  set `disable-model-invocation: true`.
- For auto-invokable skills, treat the description as trigger text. Use terms
  users are likely to say, including task verbs and domain terms. Add key
  exclusions to avoid matching nearby tasks. Keep procedure details in
  `SKILL.md`.
  Example (excerpt from Vercel's React skill):
  > "Use this skill when writing, reviewing, or refactoring React/Next.js code.
  > Triggers on tasks involving React components, Next.js pages, data fetching,
  > bundle optimization, or performance improvements."
- Include OpenAI-compatible metadata at
  `skills/<name>/agents/openai.yaml` for each skill.
- Write for an LLM, not a beginner. Leave out general knowledge and routine
  explanations.
- For skills that destroy data or write to something outside the local
  checkout, state what the invocation authorizes and what needs asking first.
  Do not manufacture ceremony for ordinary, expected steps: a request to file
  a PR covers pushing the branch and opening the PR. Draw the line at actions
  the user would be surprised to learn happened. A worktree-cleanup skill
  should say whether explicit invocation authorizes deleting the named
  worktree and branch, and require asking if the target or merge status is
  unclear.
- Update the skill list in `README.md` when adding or removing skills.

## Verification

Run `pnpm check` after changing files.
