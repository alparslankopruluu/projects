// STUB — RevenueCat is not synced yet; manual entry in the app covers it for now.
// connection.ref would be the RevenueCat project id ("proj…").
// To implement: a RevenueCat v2 secret API key (read-only, "charts_metrics" permission) stored in credentials,
// then GET https://api.revenuecat.com/v2/projects/{project_id}/metrics/overview → revenue / trials / activeUsers Metrics.
import { emptyResult, type SourceAdapter } from "../types.js";

export const syncRevenueCat: SourceAdapter = async () => emptyResult();
