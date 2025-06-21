"use client";

import { create } from "zustand";

interface WorkflowStore {
  workflowIds: string[];
  addWorkflowId: (workflowId: string) => void;
  removeWorkflowId: (workflowId: string) => void;
}

export const useWorkflowStore = create<WorkflowStore>((set) => ({
  workflowIds: [],
  addWorkflowId: (workflowId) =>
    set((state) => ({
      workflowIds: state.workflowIds.includes(workflowId)
        ? state.workflowIds
        : [...state.workflowIds, workflowId],
    })),
  removeWorkflowId: (workflowId) =>
    set((state) => ({
      workflowIds: state.workflowIds.filter((id) => id !== workflowId),
    })),
}));
