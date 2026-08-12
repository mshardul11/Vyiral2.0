import { create, useStore } from "zustand";
import { persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import { temporal, type TemporalState } from "zundo";
import {
  emptyResume,
  type Education,
  type Experience,
  type Project,
  type Resume,
  type SkillGroup,
} from "@resume/shared";

/**
 * The single source of truth for the resume being edited.
 *
 * Persisted to localStorage: the MVP has no accounts, so the browser *is* the
 * database. `temporal` (zundo) records history so an AI rewrite the user dislikes is
 * one undo away — worth having when a single click can replace a whole section.
 *
 * List items are keyed by array index in the UI rather than carrying synthetic ids.
 * That is safe here because every input is fully controlled, so a reorder or delete
 * re-renders with the correct values; the only artifact is that keyboard focus stays
 * with the position rather than following the item. The alternative — an id-carrying
 * draft type plus converters at every API boundary — costs more than it buys.
 */

const STORAGE_KEY = "resume-builder/resume/v1";

type Mutator = (resume: Resume) => void;

export interface ResumeState {
  resume: Resume;

  /** Apply an in-place mutation. Immer turns it into an immutable update. */
  edit: (mutate: Mutator) => void;
  /** Wholesale replacement — used by import, generate, and tailor. */
  replace: (resume: Resume) => void;
  reset: () => void;

  addExperience: (entry: Experience) => void;
  addEducation: (entry: Education) => void;
  addSkillGroup: (entry: SkillGroup) => void;
  addProject: (entry: Project) => void;
}

/** Moves an item within an array, clamping to the bounds. Drives the ↑/↓ controls. */
export function moveItem<T>(items: T[], from: number, to: number): void {
  if (to < 0 || to >= items.length || from === to) return;
  const [item] = items.splice(from, 1);
  if (item !== undefined) items.splice(to, 0, item);
}

export const useResumeStore = create<ResumeState>()(
  persist(
    temporal(
      immer((set) => ({
        resume: emptyResume(),

        edit: (mutate) =>
          set((state) => {
            mutate(state.resume);
          }),

        replace: (resume) =>
          set((state) => {
            state.resume = resume;
          }),

        reset: () =>
          set((state) => {
            state.resume = emptyResume();
          }),

        addExperience: (entry) =>
          set((state) => {
            state.resume.experience.push(entry);
          }),
        addEducation: (entry) =>
          set((state) => {
            state.resume.education.push(entry);
          }),
        addSkillGroup: (entry) =>
          set((state) => {
            state.resume.skills.push(entry);
          }),
        addProject: (entry) =>
          set((state) => {
            state.resume.projects.push(entry);
          }),
      })),
      {
        limit: 50,
        // Only the document is undoable.
        partialize: (state) => ({ resume: state.resume }),
      },
    ),
    {
      name: STORAGE_KEY,
      partialize: (state) => ({ resume: state.resume }) as ResumeState,
    },
  ),
);

/**
 * Undo/redo, from zundo. `useResumeStore.temporal` is a vanilla store rather than a
 * hook, so it needs `useStore` to subscribe a component to it.
 */
type UndoState = { resume: Resume };

export function useTemporalStore<T>(
  selector: (state: TemporalState<UndoState>) => T,
): T {
  return useStore(useResumeStore.temporal, selector);
}

/**
 * Discards undo history. Call after a wholesale replacement that the user has
 * already confirmed (import, generate) so the first undo doesn't jump back past it
 * into a document they were never shown.
 */
export function clearHistory(): void {
  useResumeStore.temporal.getState().clear();
}
