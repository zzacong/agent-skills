---
name: delta
description: Explain anything from the current thread as a before-and-after, in whatever form is easiest to grasp.
disable-model-invocation: true
argument-hint: "[what to explain: a change, a plan, a proposal, a doc, or a file — defaults to the current thread]"
---

# Delta

The user wants to understand something without reading the underlying material.
They may be lazy, may not know the domain well enough to read it, or may
suspect it is padded with filler. Give them the effect, in the form that makes
it easiest to grasp.

Output goes in chat. Do not write files, edit code, or run commands that change
state, unless the user asks for that specifically. Noticing something wrong in
the material you are explaining is not a reason to fix it. Report it instead.

## 1. Work out what "it" is

Use the argument the user passed to the skill. If they passed none, take the
most substantial thing in play: the work just done, the plan under discussion,
or the document just produced.

Never guess when the target is ambiguous between two candidates. Ask in one
line.

Then establish the "before":

| Target                  | Before is                                        |
| ----------------------- | ------------------------------------------------ |
| Code just changed       | the base version, read from git (see below)      |
| A plan or proposal      | the current state of the thing it would change   |
| A document just written | nothing, unless it replaces or revises something |
| A decision              | the state before the decision                    |

If there is no before, say so and drop the before-and-after frame. Use whatever
structure still makes it easy to grasp.

When the work is already committed on this branch, the base is the merge-base
against the default branch (`git merge-base HEAD origin/main`), not `HEAD`.
Otherwise the base is the last committed version of the file.

## 2. Choose the form that explains it

Pick by what the user needs to see, not by what is easiest to generate.

| The thing is                  | Show it as                               |
| ----------------------------- | ---------------------------------------- |
| A shape, flow, or dependency  | a diagram                                |
| A visual result               | before-and-after screenshots             |
| Something a program prints    | real terminal output, trimmed            |
| A size, count, or timing      | a table with real numbers                |
| An interface or payload shape | before-and-after code, 10 lines max      |
| A decision with tradeoffs     | the options considered and why one won   |
| Prose the user can't parse    | plain English, shorter than the original |

Multiple forms are fine when they say different things. A screenshot plus one
sentence beats two screenshots.

Never present a diff as evidence of a visual or behavioural change. Generate
the actual artefact. A diff is the artefact only when the change _is_ text, such
as a rename or an API payload.

To capture screenshots, load the `agent-browser` skill and drive a real browser.
Do not describe an image from the source.

## 3. Make it real

- Run it, don't describe it. For anything executable, produce actual output. Only
  run commands that observe: builds, tests, and scripts that print. If getting
  real output would require something that mutates state, don't run it. Say what
  you would have run and why you stopped.
- Read old behaviour from the source, never from memory.
- If the change is proposed but not implemented, label the "after" as
  hypothetical and ground it in the real files it would touch.
- If you cannot produce real output, show the source and say plainly that it is
  the source, not a demonstration.

## 4. Write it up

Lead with one sentence of plain English saying what is going on. The user may
stop there.

Then one block per point:

> **What changes.** One sentence, effect-first.
> **Before**
> **After**
> **Why.** One sentence, only when the reason is not self-evident.

Order by how much each point matters to the user, not by file order. Collapse
mechanical churn (renames, formatting, lockfiles) into one trailing line.

For prose the user found hard to read, do not restate it. Replace jargon with
the concrete thing it refers to, cut hedging, and cut anything that survives
only because it sounds thorough.

End with what is still unverified, undecided, or assumed.

## Anti-patterns

- Restating the source. The user could read it; they asked you to.
- Adjectives as evidence. "Much faster" is not a number.
- A wall of output with no sentence saying why it matters.
- Ceremony for changes with nothing to show. "No visible behaviour change" is a
  valid answer.
