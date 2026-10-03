# Decisions

- Portfolio progress is not a single percent. "Needs you", "in review", "live", and "critical" are separate counts.
- Missing metrics are shown as disconnected. The UI does not fill them with sample revenue or crash rates.
- Durable agent memory lives in docs/ai. docs/project-brief.md stays the short summary Sync can refresh.
- A personal GitHub token is allowed for this private desk. A shared product should use a GitHub App.
- 2026-09-30: The product moves to Expo (iOS, Android, mobile web from one codebase). The Next.js desk is frozen, not deleted.
- 2026-09-30: The Claude API key lives only in the Functions secret `ANTHROPIC_API_KEY`. Source credentials sit in `users/{uid}/private/credentials`, which the client can write but never read.
- 2026-09-30: Home is four cards (apps, unfinished, inbox, analytics), one focus card and a project strip. New surfaces go on detail pages, not the home screen.
- 2026-09-30: "Unfinished" means work on your side, not waiting on a store. The rule lives in `mobile/src/domain/derive.ts:isUnfinished`.
- 2026-10-03: Live numbers come from server-side API credentials. App Store, GitHub, Vercel and Supabase have adapters. Google Play, RevenueCat and Crashlytics stay manual until those adapters exist. A GitHub markdown brief carries the project name, todos and intent. It does not carry revenue or downloads. MCP is the agent's tool during building, not the app's sync. Notion is not a source; the basket is the reading list.
- 2026-10-03: The basket is its own list. Home shows one reminder row only when an unread item is past its window (two days). Idea minting is a separate screen. Minting is free. Keeping or applying more than three ideas is Pro. This studio defaults to Pro. Billing is not connected, so the plan switch in Hesap is a preview and charges nothing.
- 2026-10-03: Halloween 2026 is a season template on the unfinished screen. It writes checklist rows on live apps. It does not invent metrics or store events.
