import { useCallback, useReducer, useEffect } from "react";

export interface FaceData {
  enabled: boolean;
  elements: CanvasElement[];
}

export interface CanvasElement {
  id: string;
  type: "image" | "text";
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  assetId?: string;
  imageUrl?: string;
  content?: string;
  font?: string;
  fontSize?: number;
  color?: string;
  bold?: boolean;
  italic?: boolean;
}

export type FacesData = Record<number, FaceData>;

const MAX_HISTORY = 50;

interface HistoryState {
  past: FacesData[];
  present: FacesData;
  future: FacesData[];
}

type HistoryAction =
  | { type: "PUSH"; payload: FacesData }
  | { type: "UNDO" }
  | { type: "REDO" }
  | { type: "RESET"; payload: FacesData };

function historyReducer(state: HistoryState, action: HistoryAction): HistoryState {
  switch (action.type) {
    case "PUSH": {
      const newPast = [...state.past, state.present].slice(-MAX_HISTORY);
      return { past: newPast, present: structuredClone(action.payload), future: [] };
    }
    case "UNDO": {
      if (state.past.length === 0) return state;
      const prev = state.past[state.past.length - 1];
      return {
        past: state.past.slice(0, -1),
        present: prev,
        future: [state.present, ...state.future],
      };
    }
    case "REDO": {
      if (state.future.length === 0) return state;
      const next = state.future[0];
      return {
        past: [...state.past, state.present],
        present: next,
        future: state.future.slice(1),
      };
    }
    case "RESET": {
      return { past: [], present: structuredClone(action.payload), future: [] };
    }
  }
}

export function useEditorHistory(initialFaces: FacesData) {
  const [state, dispatch] = useReducer(historyReducer, {
    past: [],
    present: structuredClone(initialFaces),
    future: [],
  });

  const pushState = useCallback((newFaces: FacesData) => {
    dispatch({ type: "PUSH", payload: newFaces });
  }, []);

  const undo = useCallback(() => dispatch({ type: "UNDO" }), []);
  const redo = useCallback(() => dispatch({ type: "REDO" }), []);
  const reset = useCallback((faces: FacesData) => dispatch({ type: "RESET", payload: faces }), []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().includes("MAC");
      const mod = isMac ? e.metaKey : e.ctrlKey;
      if (!mod) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "z" && !e.shiftKey) { e.preventDefault(); undo(); }
      if ((e.key === "z" && e.shiftKey) || e.key === "y") { e.preventDefault(); redo(); }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [undo, redo]);

  return {
    faces: state.present,
    canUndo: state.past.length > 0,
    canRedo: state.future.length > 0,
    pushState,
    undo,
    redo,
    reset,
  };
}
