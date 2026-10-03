# Product

Projects is a project desk for studios and solo builders who run many apps at once. The home screen answers four questions at a glance: how many apps, which are half-finished, what needs attention, and how they are doing. Everything else lives one tap deeper.

Sources (GitHub, Vercel, App Store Connect, Supabase; Google Play, Firebase and RevenueCat by hand for now) feed one inbox. Claude reads the workspace on the server, picks today's focus, writes notes and raises alerts. Motion videos made with code mark a project's start, middle and launch.

It is not a second analytics suite. Numbers appear only when a source is connected or entered by hand.

Stack: Expo (React Native + web) in `mobile/`, Firebase Auth/Firestore/Functions in `functions/`, Remotion in `video/`. The older Next.js desk at the repo root stays until the mobile app replaces it.
