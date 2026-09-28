<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Projects

Before doing any work:

1. Read this file.
2. Read docs/ai/PRODUCT.md, docs/ai/STATE.md, docs/ai/HANDOFF.md, and docs/ai/DECISIONS.md.
3. Check commits after the SHA recorded in HANDOFF.md.
4. Do not scan the whole repository unless the task requires it.
5. State the current task and repository state before editing.

While working:

- Do not rewrite durable context from scratch.
- Add to DECISIONS.md only when a product or architecture decision is actually made.
- Add to EXPERIMENTS.md only when something measurable is being tested.
- Keep STATE.md short. Remove state that is no longer true.

Before ending the session:

- Update STATE.md.
- Replace HANDOFF.md with the current task, branch, files changed, tests run, blockers, unfinished work, the next exact action, and the last relevant commit SHA.
- Keep HANDOFF.md under 60 lines.
- Never store secrets, tokens, or personal data in these files.

The one-line resume prompt is: Resume Projects. Follow AGENTS.md and continue from the current handoff.

docs/project-brief.md is the short generated summary. The durable memory is docs/ai.
