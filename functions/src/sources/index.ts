import type { SourceKind } from "../model.js";
import type { SourceAdapter } from "../types.js";
import { syncAppStore } from "./appstore.js";
import { syncFirebase } from "./firebase.js";
import { syncGithub } from "./github.js";
import { syncGooglePlay } from "./googleplay.js";
import { syncRevenueCat } from "./revenuecat.js";
import { syncSupabase } from "./supabase.js";
import { syncVercel } from "./vercel.js";

// "claude" and "manual" are not external sources and have no adapter.
export const ADAPTERS: Partial<Record<SourceKind, SourceAdapter>> = {
  github: syncGithub,
  vercel: syncVercel,
  appstore: syncAppStore,
  supabase: syncSupabase,
  googleplay: syncGooglePlay,
  firebase: syncFirebase,
  revenuecat: syncRevenueCat,
};
