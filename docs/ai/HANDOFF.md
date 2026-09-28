# Handoff

Task: Turn the shelf into an operations desk. Today, cockpit, release matrix, and context files are in place.
Branch: main
Files: src/components/Frame.tsx, Today.tsx, Cockpit.tsx, AppsBoard.tsx, ReleasesBoard.tsx, Boards.tsx, src/lib/ops.ts, src/app routes, docs/ai, AGENTS.md
Tests: src/lib/ops.test.ts and src/lib/brief.test.ts
Blockers: Firebase project quota. No live store or RevenueCat connection.
Unfinished: GitHub App, webhooks, MCP server, real signals.
Next exact action: Connect one real status source, starting with App Store review state, and render it as a signal.
Last relevant commit: fill after the next push.
