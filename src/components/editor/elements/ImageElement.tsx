import { useEffect, useRef, useState, useCallback } from "react";
import { Image as KonvaImage } from "react-konva";
import type Konva from "konva";
import type { Tables } from "@/integrations/supabase/types";

type CustomerAsset = Tables<"customer_assets">;

interface ImageElementProps {
  id: string;
  imageUrl: string;
  assetId?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  isSelected: boolean;
  outOfBounds: boolean;
  loadedImages: Record<string, HTMLImageElement>;
  onLoadImage: (url: string, id: string) => Promise<void>;
  onSelect: () => void;
  onDragMove: (node: Konva.Node) => void;
  onDragEnd: (node: Konva.Node) => void;
  onTransformEnd: (node: Konva.Node) => void;
}

export function ImageElement({
  id, imageUrl, assetId,
  x, y, width, height, rotation,
  isSelected, outOfBounds,
  loadedImages, onLoadImage,
  onSelect, onDragMove, onDragEnd, onTransformEnd,
}: ImageElementProps) {
  const cacheKey = assetId ?? imageUrl;
  const img = loadedImages[cacheKey];

  useEffect(() => {
    if (!img) {
      onLoadImage(imageUrl, cacheKey);
    }
  }, [imageUrl, cacheKey, img, onLoadImage]);

  if (!img) return null;

  return (
    <KonvaImage
      id={id}
      image={img}
      x={x} y={y}
      width={width} height={height}
      rotation={rotation}
      draggable
      stroke={isSelected ? "hsl(30 83% 57%)" : outOfBounds ? "#f97316" : "transparent"}
      strokeWidth={isSelected ? 1.5 : outOfBounds ? 1.5 : 0}
      dash={outOfBounds && !isSelected ? [6, 3] : undefined}
      onClick={onSelect}
      onTap={onSelect}
      onDragMove={(e) => onDragMove(e.target)}
      onDragEnd={(e) => onDragEnd(e.target)}
      onTransformEnd={(e) => onTransformEnd(e.target)}
    />
  );
}

// ── High-res SVG loading helper ──────────────────────────────────────────────

export async function loadImageWithBlob(url: string): Promise<HTMLImageElement> {
  const isSvg = url.toLowerCase().includes(".svg") || url.includes("image/svg");

  const tryLoad = (src: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const img = new window.Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });

  if (isSvg) {
    // Render SVG to high-res canvas to avoid blurry rendering
    try {
      const response = await fetch(url);
      const svgText = await response.text();
      const scale = 2;

      // Parse SVG to get natural dimensions
      const parser = new DOMParser();
      const doc = parser.parseFromString(svgText, "image/svg+xml");
      const svgEl = doc.querySelector("svg");
      let svgW = 200, svgH = 200;
      if (svgEl) {
        const vb = svgEl.getAttribute("viewBox");
        const w = parseFloat(svgEl.getAttribute("width") ?? "0");
        const h = parseFloat(svgEl.getAttribute("height") ?? "0");
        if (w && h) { svgW = w; svgH = h; }
        else if (vb) {
          const parts = vb.split(/[\s,]+/);
          if (parts.length === 4) { svgW = parseFloat(parts[2]); svgH = parseFloat(parts[3]); }
        }
      }

      const canvas = document.createElement("canvas");
      canvas.width = svgW * scale;
      canvas.height = svgH * scale;
      const ctx = canvas.getContext("2d")!;

      const blob = new Blob([svgText], { type: "image/svg+xml" });
      const blobUrl = URL.createObjectURL(blob);
      const svgImg = await tryLoad(blobUrl);
      ctx.drawImage(svgImg, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(blobUrl);

      const result = await tryLoad(canvas.toDataURL("image/png"));
      return result;
    } catch {
      // fallback
    }
  }

  // Raster: blob fetch first
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    const img = await tryLoad(blobUrl);
    return img;
  } catch {
    // Final fallback
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    return tryLoad(url);
  }
}
