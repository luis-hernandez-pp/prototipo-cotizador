import { useState, useCallback, useMemo } from "react";
import type Konva from "konva";
import type { CanvasElement } from "./useEditorHistory";

export interface SnapGuide {
  type: "horizontal" | "vertical";
  position: number;
}

const SNAP_THRESHOLD = 6;

export function useSnapGuides(
  printOffsetX: number,
  printOffsetY: number,
  printW: number,
  printH: number,
) {
  const [guides, setGuides] = useState<SnapGuide[]>([]);

  // Static reference points (print area edges and center)
  const staticPoints = useMemo(() => ({
    hLines: [
      printOffsetY,                    // top edge
      printOffsetY + printH / 2,       // center H
      printOffsetY + printH,           // bottom edge
    ],
    vLines: [
      printOffsetX,                    // left edge
      printOffsetX + printW / 2,       // center V
      printOffsetX + printW,           // right edge
    ],
  }), [printOffsetX, printOffsetY, printW, printH]);

  const checkSnap = useCallback((
    node: Konva.Node,
    otherElements: CanvasElement[],
    percentToPx: (el: CanvasElement) => { x: number; y: number; w: number; h: number },
  ) => {
    // Use getClientRect for rotation-aware bounding box
    const stage = node.getStage();
    const rect = stage ? node.getClientRect({ relativeTo: stage }) : null;

    const nodeX = node.x();
    const nodeY = node.y();

    // Visual bounding box (accounts for rotation)
    const visualX = rect ? rect.x : nodeX;
    const visualY = rect ? rect.y : nodeY;
    const visualW = rect ? rect.width : node.width() * node.scaleX();
    const visualH = rect ? rect.height : node.height() * node.scaleY();
    const visualCenterX = visualX + visualW / 2;
    const visualCenterY = visualY + visualH / 2;

    const activeGuides: SnapGuide[] = [];
    let snapX = nodeX;
    let snapY = nodeY;

    // Build all reference V/H positions
    const vRefs = [...staticPoints.vLines];
    const hRefs = [...staticPoints.hLines];

    // Add other element edges/centers (using their visual rects too)
    otherElements.forEach((el) => {
      if (el.id === node.id()) return;
      const { x, y, w, h } = percentToPx(el);
      vRefs.push(x, x + w / 2, x + w);
      hRefs.push(y, y + h / 2, y + h);
    });

    // Check visual left, center, right against vRefs
    const nodeXPoints = [
      { visual: visualX, label: "left" },
      { visual: visualCenterX, label: "center" },
      { visual: visualX + visualW, label: "right" },
    ];
    for (const pt of nodeXPoints) {
      for (const vRef of vRefs) {
        if (Math.abs(pt.visual - vRef) < SNAP_THRESHOLD) {
          activeGuides.push({ type: "vertical", position: vRef });
          // Calculate offset: difference between visual position and node.x()
          const visualOffset = pt.visual - nodeX;
          snapX = vRef - visualOffset;
          break;
        }
      }
    }

    // Check visual top, center, bottom against hRefs
    const nodeYPoints = [
      { visual: visualY, label: "top" },
      { visual: visualCenterY, label: "center" },
      { visual: visualY + visualH, label: "bottom" },
    ];
    for (const pt of nodeYPoints) {
      for (const hRef of hRefs) {
        if (Math.abs(pt.visual - hRef) < SNAP_THRESHOLD) {
          activeGuides.push({ type: "horizontal", position: hRef });
          const visualOffset = pt.visual - nodeY;
          snapY = hRef - visualOffset;
          break;
        }
      }
    }

    // Apply snap
    if (snapX !== nodeX || snapY !== nodeY) {
      node.x(snapX);
      node.y(snapY);
    }

    setGuides(activeGuides);
  }, [staticPoints, printOffsetX, printOffsetY]);

  const clearGuides = useCallback(() => setGuides([]), []);

  return { guides, checkSnap, clearGuides };
}
