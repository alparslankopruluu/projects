import assert from "node:assert/strict";
import { test } from "node:test";

import type { Project } from "./model";
import { collectNotes, mergeNoteDocs, noteLabel, type DeskNote } from "./notes";

const project: Project = {
  id: "p1",
  name: "Masa",
  tagline: "",
  hue: 10,
  stage: "building",
  priority: 0,
  nextStep: "",
  platforms: [],
  connections: [],
  checks: [],
  notes: [
    { id: "n1", body: "eski gövde", createdAt: "2026-10-01T00:00:00.000Z", author: "you" },
    { id: "n2", body: "yalnız projede", createdAt: "2026-10-02T00:00:00.000Z", author: "you" },
  ],
  startedAt: "2026-10-01T00:00:00.000Z",
  lastActivityAt: "2026-10-02T00:00:00.000Z",
  archived: false,
};

test("a mirrored note replaces the copy on the project", () => {
  const doc: DeskNote = {
    id: "n1",
    body: "editör yazdı",
    createdAt: "2026-10-03T00:00:00.000Z",
    author: "you",
    projectId: "p1",
    projectName: "Masa",
    title: "Karar",
  };
  const [merged] = mergeNoteDocs([project], [doc]);
  assert.equal(merged.notes.find((note) => note.id === "n1")?.body, "editör yazdı");
  assert.equal(merged.notes.some((note) => note.id === "n2"), true);
  assert.equal(noteLabel({ title: "" }), "Not");
  assert.equal(noteLabel({ title: "Karar" }), "Karar");
});

test("shared notes are listed without replacing owned ones", () => {
  const shared: DeskNote = {
    id: "n9",
    body: "paylaşılan",
    createdAt: "2026-10-04T00:00:00.000Z",
    author: "you",
    projectId: "p9",
    projectName: "Öteki",
  };
  const notes = collectNotes([project], [shared]);
  assert.deepEqual(notes.map((note) => note.id), ["n9", "n2", "n1"]);
});
