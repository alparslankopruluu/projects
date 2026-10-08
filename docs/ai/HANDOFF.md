# Handoff

Task: Notes list, one alarm per note, and expiring view/edit invites are on main. Rules are local until deploy.
Branch: main.

Built: Hesap → Notlar and Davet koduyla katıl. Home stays four cards. Project share is owner-only. Editors may change next step, checks, notes, stage, tagline, and last activity. One phone alarm per note. The text is the project name or "Hatırlatma", plus "Bir notun zamanı geldi." Web saves the time and does not ring. The invite is 16 characters, 48 hours, one person, and not a link.

Tests this session: mobile `tsc --noEmit` passed after typed routes were regenerated. Domain tests were 31 pass and functions tests 18 pass plus functions `tsc` earlier in the same feature. Expo web, fresh profile: added a note on Chordly, opened the list and the note, saved a title, set the one-hour alarm without clearing the title, share and join asked for sign-in, settings links stayed, home stayed four cards, and the notes list and project fit a 390px width. Two accounts were not clicked, and the rules are not deployed. Do not treat a root `next build` as part of this work.

Blockers:
- Firestore rules are not deployed. Invite create and redeem fail against production until `firebase deploy --only firestore:rules`.
- No ANTHROPIC_API_KEY, so functions are not deployed. Claude stays closed until that secret and a `billing/claude` doc exist.
- `config/release` is not written. Do not raise min above 1.0.0.
- Play, RevenueCat, and Crashlytics adapters are stubs. In-app purchase is not connected.

Files: mobile/src/app/notes, share.tsx, join.tsx, apps/[id].tsx, settings.tsx, _layout.tsx, data/store.tsx, data/sharing.ts, data/alarm.ts, domain/share.ts, domain/notes.ts, domain/alarm.ts, firestore.rules, functions/src/notes.ts, functions/src/analyze.ts.

Next exact action: Deploy firestore rules so invites work. Then set the Claude secret, deploy functions, write `billing/claude`, and write `config/release` without raising min above 1.0.0.

Last relevant commit: 556f572
