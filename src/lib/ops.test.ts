import assert from "node:assert/strict";
import test from "node:test";
import { needsYou, portfolioCounts, signals, waitingOn } from "./ops";
import { seedProjects } from "./seed";

const projects = seedProjects();

test("portfolio counts separate your work from Apple review", () => {
  const counts = portfolioCounts(projects);
  assert.ok(counts.you > 0);
  assert.equal(counts.review, projects.filter((project) => project.attention === "waiting_review").length);
  assert.equal(counts.critical, 1);
  assert.equal(needsYou(projects.find((project) => project.id === "belto")!).length, 0);
  assert.equal(waitingOn(projects.find((project) => project.id === "belto")!).length, 1);
  assert.ok(needsYou(projects.find((project) => project.id === "chordly")!).some((item) => item.title.includes("mesaj")));
});

test("signals do not invent revenue", () => {
  const text = signals(projects).map((item) => item.title).join("\n");
  assert.match(text, /Apple mesaj/);
  assert.match(text, /bağlı değil/);
  assert.doesNotMatch(text, /\$|%/);
});
