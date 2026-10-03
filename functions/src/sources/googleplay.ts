// STUB — Google Play is not synced yet; manual entry in the app covers it for now.
// connection.ref would be the package name ("com.studio.app").
// To implement: a Google Cloud service account linked in Play Console (Users and permissions),
// stored as a JSON key in credentials, and the Android Publisher API (androidpublisher v3):
//   edits.tracks.list for release status, reviews.list for store reviews.
import { emptyResult, type SourceAdapter } from "../types.js";

export const syncGooglePlay: SourceAdapter = async () => emptyResult();
