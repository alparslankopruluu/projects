# Handoff

Task: Basket, idea minting, and a plain stats desk for store and money sources. Continue the Expo app.
Branch: main

Files:
- mobile/src/domain/basket.ts, basket.test.ts, model.ts
- mobile/src/data/store.tsx
- mobile/src/app/basket.tsx, ideas.tsx, index.tsx, analytics.tsx, unfinished.tsx, apps/[id].tsx, settings.tsx, sources.tsx
- functions/src/model.ts (mirrored types)
- docs/ai/PRODUCT.md, DECISIONS.md, STATE.md

Tests run:
- mobile: npm test (14 pass), tsc --noEmit in mobile and functions (exit 0)
- Expo web, Playwright: basket categories, idea mint and reopen, analytics "ölçülmüyor", Halloween idempotent (12 checks), rejection fixes, free cap of 3, home reminder. Desktop and 390px.

Blockers:
- No Firebase project. EXPO_PUBLIC_FIREBASE_* and ANTHROPIC_API_KEY are still unset, so API sync and Claude are not proven on a device.
- Google Play, RevenueCat and Crashlytics adapters still return nothing.
- Billing is a plan flag only.

Unfinished:
- Wire Play, RevenueCat and Crashlytics for real.
- Charge for Pro, or remove the preview switch once a store product exists.
- Push reminder for stale basket items (needs EAS).

Next exact action: Configure Firebase (EXPO_PUBLIC_FIREBASE_* and a deployed sync function), then connect one App Store key and confirm Analytics moves that app from "bağlı değil" to a real number.

Last relevant commit: d264192
