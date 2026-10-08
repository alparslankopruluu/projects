import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { Project } from "../src/model.js";
import { overlayProjectNotes } from "../src/notes.js";

const project = { id: "p1", notes: [{ id: "n1", body: "eski", createdAt: "2026-10-01T00:00:00.000Z", author: "you" as const }] } as Project;

describe("note overlay", () => {
  it("prefers the note document and keeps project-only notes", () => {
    const [merged] = overlayProjectNotes(
      [project],
      [{ id: "n1", body: "yeni", createdAt: "2026-10-03T00:00:00.000Z", author: "you", projectId: "p1", title: "Karar" }],
    );
    assert.equal(merged.notes.find((note) => note.id === "n1")?.body, "yeni");
    assert.equal(merged.notes.find((note) => note.id === "n1")?.title, "Karar");
  });
});
