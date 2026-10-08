import type { Note, Project } from "./model";
import { cleanLabel } from "./share";

export type DeskNote = Note & { projectId: string; projectName: string };

export function noteLabel(note: { title?: string | null }) {
  return cleanLabel(note.title ?? "");
}

export function toDeskNote(note: Note, projectId: string, projectName: string): DeskNote {
  return { ...note, projectId, projectName: projectName.trim() || "Proje" };
}

/** Note documents win over the copy stored on the project, so an editor's change is what Claude and the owner see. */
export function mergeNoteDocs(projects: Project[], docs: DeskNote[]): Project[] {
  const byProject = new Map<string, DeskNote[]>();
  for (const note of docs) {
    if (!note.projectId) continue;
    const list = byProject.get(note.projectId) ?? [];
    list.push(note);
    byProject.set(note.projectId, list);
  }
  return projects.map((project) => {
    const mirrored = byProject.get(project.id);
    if (!mirrored?.length) return project;
    const ids = new Set(mirrored.map((note) => note.id));
    const notes = [...mirrored.map(asNote), ...project.notes.filter((note) => !ids.has(note.id))].sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt),
    );
    return { ...project, notes };
  });
}

export function collectNotes(projects: Project[], shared: DeskNote[], sharedProjects: Project[] = []): DeskNote[] {
  const owned = [...projects, ...sharedProjects].flatMap((project) => project.notes.map((note) => toDeskNote(note, project.id, project.name)));
  const ids = new Set(owned.map((note) => note.id));
  return [...owned, ...shared.filter((note) => !ids.has(note.id))].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function asNote(note: DeskNote): Note {
  return {
    id: note.id,
    body: note.body,
    createdAt: note.createdAt,
    author: note.author,
    ...(note.title ? { title: note.title } : {}),
    ...(note.alarmAt != null ? { alarmAt: note.alarmAt } : note.alarmAt === null ? { alarmAt: null } : {}),
  };
}

export function parseDeskNote(id: string, data: Record<string, unknown>): DeskNote | null {
  if (typeof data.body !== "string" || typeof data.createdAt !== "string" || typeof data.projectId !== "string") return null;
  if (data.author !== "you" && data.author !== "claude") return null;
  if (!data.projectId) return null;
  const title = typeof data.title === "string" ? data.title : undefined;
  const alarmAt = data.alarmAt == null ? data.alarmAt === null ? null : undefined : typeof data.alarmAt === "string" ? data.alarmAt : undefined;
  return {
    id,
    body: data.body,
    createdAt: data.createdAt,
    author: data.author,
    projectId: data.projectId,
    projectName: typeof data.projectName === "string" && data.projectName.trim() ? data.projectName : "Proje",
    ...(title ? { title } : {}),
    ...(alarmAt !== undefined ? { alarmAt } : {}),
  };
}
