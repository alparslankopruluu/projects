import type { Note, Project } from "./model.js";

export type StoredNote = Note & { projectId?: string };

/** Note documents override the same id on the project. Notes that exist only on the project stay. */
export function overlayProjectNotes(projects: Project[], docs: StoredNote[]): Project[] {
  const byProject = new Map<string, Note[]>();
  for (const doc of docs) {
    if (!doc.projectId || !doc.id || typeof doc.body !== "string") continue;
    const list = byProject.get(doc.projectId) ?? [];
    list.push({
      id: doc.id,
      body: doc.body,
      createdAt: doc.createdAt,
      author: doc.author === "claude" ? "claude" : "you",
      ...(doc.title ? { title: doc.title } : {}),
      ...(doc.alarmAt != null ? { alarmAt: doc.alarmAt } : {}),
    });
    byProject.set(doc.projectId, list);
  }
  return projects.map((project) => {
    const mirrored = byProject.get(project.id);
    if (!mirrored?.length) return project;
    const ids = new Set(mirrored.map((note) => note.id));
    const notes = [...mirrored, ...(project.notes ?? []).filter((note) => !ids.has(note.id))].sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt),
    );
    return { ...project, notes };
  });
}
