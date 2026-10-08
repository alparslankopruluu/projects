import assert from "node:assert/strict";
import { test } from "node:test";

import { ALARM_BODY, alarmIsDue, alarmNotification, alarmPreset } from "./alarm";

const NOON = new Date("2026-10-08T12:00:00");

test("presets are one hour, tonight at 20:00, and tomorrow at 09:00", () => {
  assert.equal(alarmPreset("hour", NOON), new Date(NOON.getTime() + 60 * 60 * 1000).toISOString());
  const tonight = new Date(alarmPreset("tonight", NOON));
  assert.equal(tonight.getHours(), 20);
  assert.equal(tonight.getDate(), NOON.getDate());
  const late = new Date("2026-10-08T21:30:00");
  const rolled = new Date(alarmPreset("tonight", late));
  assert.equal(rolled.getDate(), 9);
  assert.equal(rolled.getHours(), 20);
  const morning = new Date(alarmPreset("tomorrow", NOON));
  assert.equal(morning.getDate(), 9);
  assert.equal(morning.getHours(), 9);
});

test("the notification names the project and never the note", () => {
  const copy = alarmNotification("Masa");
  assert.equal(copy.title, "Masa");
  assert.equal(copy.body, ALARM_BODY);
  assert.equal(alarmNotification("  ").title, "Hatırlatma");
  assert.equal(alarmNotification(null).body, "Bir notun zamanı geldi.");
  assert.equal(Object.keys(alarmNotification("Masa")).join(), "title,body");
});

test("a missing or past alarm is not scheduled", () => {
  assert.equal(alarmIsDue(null, NOON), false);
  assert.equal(alarmIsDue(new Date(NOON.getTime() - 1000).toISOString(), NOON), false);
  assert.equal(alarmIsDue(new Date(NOON.getTime() + 1000).toISOString(), NOON), true);
});
