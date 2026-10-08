// One reminder per note. The notification is generic on purpose: it must not carry the note body.

export const ALARM_BODY = "Bir notun zamanı geldi.";

export type AlarmPreset = "hour" | "tonight" | "tomorrow";

export function alarmPreset(preset: AlarmPreset, now: Date): string {
  if (preset === "hour") return new Date(now.getTime() + 60 * 60 * 1000).toISOString();
  const next = new Date(now);
  if (preset === "tonight") {
    next.setHours(20, 0, 0, 0);
    if (next.getTime() <= now.getTime()) next.setDate(next.getDate() + 1);
    return next.toISOString();
  }
  next.setDate(next.getDate() + 1);
  next.setHours(9, 0, 0, 0);
  return next.toISOString();
}

export function alarmIsDue(alarmAt: string | null | undefined, now: Date) {
  if (!alarmAt) return false;
  const at = Date.parse(alarmAt);
  return Number.isFinite(at) && at > now.getTime();
}

/** Title is the project name. The body is fixed. Callers cannot pass the note text. */
export function alarmNotification(projectName: string | null | undefined): { title: string; body: string } {
  const title = projectName?.trim() || "Hatırlatma";
  return { title, body: ALARM_BODY };
}
