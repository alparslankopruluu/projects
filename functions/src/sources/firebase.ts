// STUB — Firebase (Crashlytics) is not synced yet; manual entry in the app covers it for now.
// Crashlytics has no public REST API for crash-free rates. To implement: enable the Crashlytics
// BigQuery export in the Firebase console, give the Functions service account BigQuery Data Viewer
// on that dataset, and query the export tables to compute a "crashFree" Metric per project.
import { emptyResult, type SourceAdapter } from "../types.js";

export const syncFirebase: SourceAdapter = async () => emptyResult();
