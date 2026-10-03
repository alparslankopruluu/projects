# Handoff

Task: Turn the desk into a multi-project management app: Expo mobile + Firebase backend + Claude analysis + code-made motion videos.
Branch: main (all work uncommitted on top of a947e25)

Files:
- mobile/ (new Expo SDK 57 app): src/app/* routes, src/domain/{model,seed,derive}.ts, src/data/{store,firebase,push}.ts(x), src/ui/{theme,kit,motion,rows}.tsx, assets/video/kickoff.mp4
- functions/ (new): src/{index,analyze,sync,rules,signals,push}.ts, src/sources/*, test/*
- video/ (new): Remotion Kickoff + ProjectStage, out/kickoff-preview.png
- firebase.json (functions block), firestore.rules (users/{uid}/*, private/* write-only)
- tsconfig.json, eslint.config.mjs (exclude functions, mobile, video)
- .claude/launch.json (mobile-web preview on 8081)
- docs/ai/PRODUCT.md, STATE.md, DECISIONS.md

Tests run:
- mobile: tsc, expo lint, npm test (5/5), expo export --platform ios OK, web checked in browser at 375px light/dark
- functions: build, npm test (13/13)
- video: tsc, both compositions rendered

Blockers:
- No Firebase project configured (quota). Need EXPO_PUBLIC_FIREBASE_* in mobile/.env and `firebase functions:secrets:set ANTHROPIC_API_KEY`.
- Push needs `eas init` for an EAS project id.

Unfinished:
- isUnfinished rule in mobile/src/domain/derive.ts is a default for the owner to tune.
- Stub adapters: Google Play, Crashlytics, RevenueCat. No sync writes Metric rows yet.
- Stage MP4s from the app (Remotion Lambda or Cloud Run).
- Workspaces/teams, billing.

Next exact action: Configure a Firebase project, deploy rules + functions, sign in from the app, run "Claude ile analiz et" once and check users/{uid}/insights/latest.

Last relevant commit: a947e25
