import { create } from "zustand";

export interface StepStatus {
  stepIndex: number;
  totalSteps: number;
  status: "running" | "completed" | "failed";
  description: string;
  error?: string;
}

interface CommandState {
  isListening: boolean;
  isExecuting: boolean;
  transcript: string;
  currentRequestId: string | null;
  steps: StepStatus[];
  setListening: (listening: boolean) => void;
  setTranscript: (text: string) => void;
  startExecution: (requestId: string) => void;
  updateStep: (step: StepStatus) => void;
  reset: () => void;
}

export const useCommandStore = create<CommandState>((set) => ({
  isListening: false,
  isExecuting: false,
  transcript: "",
  currentRequestId: null,
  steps: [],

  setListening: (listening) => set({ isListening: listening }),

  setTranscript: (text) => set({ transcript: text }),

  startExecution: (requestId) =>
    set({
      isExecuting: true,
      currentRequestId: requestId,
      steps: [],
    }),

  updateStep: (step) =>
    set((state) => {
      const existing = state.steps.findIndex(
        (s) => s.stepIndex === step.stepIndex
      );
      const newSteps = [...state.steps];
      if (existing >= 0) {
        newSteps[existing] = step;
      } else {
        newSteps.push(step);
      }

      const allDone = newSteps.every(
        (s) => s.status === "completed" || s.status === "failed"
      );

      return {
        steps: newSteps,
        isExecuting: !allDone,
      };
    }),

  reset: () =>
    set({
      isListening: false,
      isExecuting: false,
      transcript: "",
      currentRequestId: null,
      steps: [],
    }),
}));
