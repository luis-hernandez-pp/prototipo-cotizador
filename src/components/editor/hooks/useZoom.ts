import { useState, useCallback } from "react";
import type Konva from "konva";

export interface ZoomState {
  scale: number;
  offsetX: number;
  offsetY: number;
}

const MIN_SCALE = 0.25;
const MAX_SCALE = 3.0;
const STEP = 0.1;

function clamp(val: number, min: number, max: number) {
  return Math.max(min, Math.min(max, val));
}

export function useZoom(initialScale = 1) {
  const [zoom, setZoom] = useState<ZoomState>({
    scale: initialScale,
    offsetX: 0,
    offsetY: 0,
  });

  const zoomIn = useCallback(() => {
    setZoom((z) => ({ ...z, scale: clamp(+(z.scale + STEP).toFixed(2), MIN_SCALE, MAX_SCALE) }));
  }, []);

  const zoomOut = useCallback(() => {
    setZoom((z) => ({ ...z, scale: clamp(+(z.scale - STEP).toFixed(2), MIN_SCALE, MAX_SCALE) }));
  }, []);

  const zoomTo100 = useCallback(() => {
    setZoom({ scale: 1, offsetX: 0, offsetY: 0 });
  }, []);

  const zoomToFit = useCallback((
    stageW: number,
    stageH: number,
    contentW: number,
    contentH: number,
  ) => {
    const scaleX = stageW / contentW;
    const scaleY = stageH / contentH;
    const scale = clamp(Math.min(scaleX, scaleY) * 0.9, MIN_SCALE, MAX_SCALE);
    setZoom({ scale, offsetX: 0, offsetY: 0 });
  }, []);

  const zoomToScale = useCallback((scale: number) => {
    setZoom((z) => ({ ...z, scale: clamp(scale, MIN_SCALE, MAX_SCALE) }));
  }, []);

  const handleWheel = useCallback((e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    if (!e.evt.ctrlKey && !e.evt.metaKey) return; // only zoom when Ctrl held

    const stage = e.target.getStage();
    if (!stage) return;

    const oldScale = stage.scaleX();
    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    const direction = e.evt.deltaY > 0 ? -1 : 1;
    const newScale = clamp(+(oldScale + direction * STEP).toFixed(2), MIN_SCALE, MAX_SCALE);

    const mousePointTo = {
      x: (pointer.x - stage.x()) / oldScale,
      y: (pointer.y - stage.y()) / oldScale,
    };
    const newPos = {
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale,
    };

    setZoom({ scale: newScale, offsetX: newPos.x, offsetY: newPos.y });
  }, []);

  return { ...zoom, zoomIn, zoomOut, zoomTo100, zoomToFit, zoomToScale, handleWheel };
}
