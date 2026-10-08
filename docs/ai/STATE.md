# State

Updated: 2026-10-08

Expo desk in `mobile/` is the product. Home still has four cards, plus a basket reminder row when something has sat unread for two days. New screens: Sepet (`/basket`) and Fikirler (`/ideas`). Analytics shows App Store, Play, RevenueCat and Firebase as connected, manual, or missing, and ranks demand only where a number exists. Unfinished can stamp Halloween checks onto live apps. A rejection on a project can add the fix tasks.

Release gate reads `config/release`. Below min is a force update. Below latest is a soft update that can be dismissed. No document means the desk stays open. Rules are local until `firebase deploy --only firestore:rules`.

The studio provides Claude from one server key. A call runs only when `billing/claude` has an open subscription allowance (40 per period) or a credit. The Hesap plan switch does not open Claude. In-app purchase is not connected.

Notes have a list (Hesap → Notlar), one alarm each, and a 48-hour single-use code for a project or a note. Roles are view and edit. The owner changes the role or removes the person. There is no public link. Shared rows stay off the owner's project list. Claude still reads note text. The alarm names the project and never the note. Firestore rules for this are local until deploy. Tools stay blocked: the functions secret, Play, RevenueCat, Crashlytics.

Local-first AsyncStorage. Plan defaults to Pro for this studio. Free keeps three ideas. No payment is collected. Firebase project `projects-desk` on techtactoeappstudio@gmail.com has web, iOS and Android apps, email/password auth, and Firestore in europe-west1. Client config is in gitignored `mobile/.env` and `.env.local`. Billing is on. Secret Manager API is enabled. The `ANTHROPIC_API_KEY` secret does not exist yet, so Cloud Functions are not deployed and sync and Claude are untested on a device. Play, RevenueCat and Crashlytics adapters are still stubs.
