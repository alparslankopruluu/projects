# State

Updated: 2026-09-30

The product is now the Expo app in `mobile/` (iOS, Android, mobile web). Home: four soft cards (apps, unfinished, inbox, analytics), today's focus, project strip. Detail pages: apps list, project page (stage, checklist, manual metrics, sources, commit/store feed, notes, stage story), unfinished, inbox, analytics, sources, account, intro video.

Local-first in AsyncStorage with the ten real apps seeded. Firebase sign-in streams `users/{uid}/*` and migrates local data on first login. Firebase is not configured yet (`mobile/.env`), so cloud, Claude and sync are untested end to end.

`functions/`: `analyze` (Claude Opus 5.5, structured output, server-side fallback), `syncSources` + `scheduledSync` (GitHub, Vercel, App Store Connect, Supabase), `dailyDigest` (Expo push). Google Play, Crashlytics and RevenueCat adapters are stubs; enter those numbers by hand. Not deployed.

`video/`: Remotion `Kickoff` (20s, rendered, bundled at 720p in the app) and `ProjectStage` (start/middle/end, props-driven). Server-side rendering from the app is not built.

The Next.js desk at the root is frozen.
