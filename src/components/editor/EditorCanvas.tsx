import { useRef, useCallback, useEffect, useState } from "react";
import { Stage, Layer, Rect, Transformer, Line, Image as KonvaImage } from "react-konva";
import type Konva from "konva";
import type { CanvasElement, FaceData } from "./hooks/useEditorHistory";
import type { SnapGuide } from "./hooks/useSnapGuides";
import { ImageElement } from "./elements/ImageElement";
import { TextElement } from "./elements/TextElement";
import type { Tables } from "@/integrations/supabase/types";

type Product = Tables<"products">;
type ProductSubtype = Tables<"product_subtypes">;
type ProductType = Tables<"product_types">;

const FACE_LABELS: Record<number, string> = {
  1: "Frente", 2: "Reverso", 3: "Izquierdo", 4: "Derecho", 5: "Superior", 6: "Inferior"
};

interface EditorCanvasProps {
  stageRef: React.RefObject<Konva.Stage>;
  product: Product;
  subtype: ProductSubtype;
  type: ProductType;
  faces: Record<number, FaceData>;
  activeFace: number;
  onActiveFaceChange: (face: number) => void;
  selectedId: string | null;
  onSelectId: (id: string | null) => void;
  loadedImages: Record<string, HTMLImageElement>;
  onLoadImage: (url: string, id: string) => Promise<void>;
  snapGuides: SnapGuide[];
  zoom: { scale: number; offsetX: number; offsetY: number };
  onWheel: (e: Konva.KonvaEventObject<WheelEvent>) => void;
  // Centralized layout props from parent
  printOffsetX: number;
  printOffsetY: number;
  printW: number;
  printH: number;
  stageOffsetX: number;
  stageOffsetY: number;
  stageW: number;
  stageH: number;
  outerW: number;
  outerH: number;
  hasMockup?: boolean;
  mockupImageUrl?: string | null;
  // Konva node callbacks
  onDragMove: (elementId: string, node: Konva.Node) => void;
  onDragEnd: (elementId: string, node: Konva.Node) => void;
  onTransformEnd: (elementId: string, node: Konva.Node) => void;
  onTextChange: (elementId: string, text: string) => void;
}

export function EditorCanvas({
  stageRef, product, subtype, type, faces, activeFace, onActiveFaceChange,
  selectedId, onSelectId, loadedImages, onLoadImage,
  snapGuides, zoom, onWheel,
  printOffsetX, printOffsetY, printW, printH,
  stageOffsetX, stageOffsetY, stageW, stageH,
  outerW, outerH,
  hasMockup, mockupImageUrl,
  onDragMove, onDragEnd, onTransformEnd, onTextChange,
}: EditorCanvasProps) {
  const transformerRef = useRef<Konva.Transformer>(null);
  const [rotationLabel, setRotationLabel] = useState<{ angle: number; x: number; y: number } | null>(null);
  const [mockupImg, setMockupImg] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    if (!mockupImageUrl) { setMockupImg(null); return; }
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => setMockupImg(img);
    img.onerror = () => setMockupImg(null);
    img.src = mockupImageUrl;
  }, [mockupImageUrl]);

  // Transformer sync
  useEffect(() => {
    if (!transformerRef.current || !stageRef.current) return;
    const node = stageRef.current.findOne(`#${selectedId}`);
    if (node) {
      transformerRef.current.nodes([node]);
      transformerRef.current.getLayer()?.batchDraw();
    } else {
      transformerRef.current.nodes([]);
      transformerRef.current.getLayer()?.batchDraw();
    }
  }, [selectedId, stageRef]);

  const currentElements = faces[activeFace]?.elements ?? [];

  // Convert % to absolute px on canvas
  // Use printW as uniform base for BOTH width and height to preserve aspect ratio.
  // Position y still uses printH so elements are placed correctly on the vertical axis.
  const percentToPxAbs = useCallback((el: CanvasElement) => {
    return {
      x: printOffsetX + (el.x / 100) * printW,
      y: printOffsetY + (el.y / 100) * printH,
      w: (el.width / 100) * printW,
      h: (el.height / 100) * printW,  // ← printW, NOT printH — same base to preserve aspect ratio
    };
  }, [printOffsetX, printOffsetY, printW, printH]);

  // Check out-of-bounds using the real Konva node's client rect
  // This is the ONLY reliable way when elements are rotated
  const checkOutOfBounds = useCallback((elementId: string): boolean => {
    if (!stageRef.current) return false;
    const node = stageRef.current.findOne(`#${elementId}`);
    if (!node) return false;

    const TOLERANCE_PX = printW * 0.03; // 3% of print width as pixel tolerance

    // getClientRect gives us the ACTUAL visual bounding box including rotation
    const rect = node.getClientRect({ relativeTo: stageRef.current });

    return rect.x < (printOffsetX - TOLERANCE_PX) ||
           rect.y < (printOffsetY - TOLERANCE_PX) ||
           (rect.x + rect.width) > (printOffsetX + printW + TOLERANCE_PX) ||
           (rect.y + rect.height) > (printOffsetY + printH + TOLERANCE_PX);
  }, [stageRef, printOffsetX, printOffsetY, printW, printH]);

  const selectedEl = currentElements.find((e) => e.id === selectedId);
  const isImageSelected = selectedEl?.type === "image";

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Face tabs */}
      <div className="bg-card border-b border-border px-4 h-11 flex items-center gap-1 shrink-0 overflow-x-auto">
        {(type.printable_faces ?? []).map((face) => {
          const faceData = faces[face];
          const isRestricted = (product.restricted_faces ?? []).includes(face);
          const isActive = activeFace === face;
          return (
            <button key={face}
              disabled={isRestricted}
              onClick={() => { onActiveFaceChange(face); onSelectId(null); }}
              title={isRestricted ? "No disponible" : undefined}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors shrink-0 ${
                isRestricted ? "text-muted-foreground/40 cursor-not-allowed"
                : isActive ? "gradient-hero text-primary-foreground"
                : faceData?.enabled ? "bg-accent/10 text-accent border border-accent/30 hover:bg-accent/20"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}>
              Cara {face} — {FACE_LABELS[face] ?? ""}
              {faceData?.elements.length > 0 && !isRestricted && (
                <span className="ml-1.5 w-4 h-4 rounded-full bg-accent text-accent-foreground text-xs inline-flex items-center justify-center">
                  {faceData.elements.length}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Konva stage */}
      <div className="flex-1 overflow-hidden relative bg-muted/30"
        onClick={(e) => { if (e.target === e.currentTarget) onSelectId(null); }}>
        <Stage
          ref={stageRef}
          width={stageW}
          height={stageH}
          scaleX={zoom.scale}
          scaleY={zoom.scale}
          x={zoom.offsetX}
          y={zoom.offsetY}
          onWheel={onWheel}
          onMouseDown={(e) => { if (e.target === e.target.getStage()) onSelectId(null); }}
        >
          <Layer>
            {/* Product background: mockup photo or placeholder rects */}
            {hasMockup && mockupImg ? (
              <>
                <KonvaImage
                  image={mockupImg}
                  x={stageOffsetX}
                  y={stageOffsetY}
                  width={outerW}
                  height={outerH}
                  listening={false}
                />
                <Rect x={printOffsetX} y={printOffsetY}
                  width={printW} height={printH}
                  fill="transparent" stroke="hsl(30 83% 57%)"
                  strokeWidth={1.5} dash={[6, 4]} />
              </>
            ) : (
              <>
                <Rect x={stageOffsetX} y={stageOffsetY}
                  width={outerW} height={outerH}
                  fill={subtype.color_hex ?? "#e5e7eb"} cornerRadius={4} />

                {/* Safety margin red zone */}
                <Rect x={stageOffsetX} y={stageOffsetY}
                  width={outerW} height={outerH}
                  fill="rgba(239,68,68,0.07)" />
                <Rect x={printOffsetX} y={printOffsetY}
                  width={printW} height={printH}
                  fill={subtype.color_hex ?? "#e5e7eb"} />

                {/* Outer border */}
                <Rect x={stageOffsetX} y={stageOffsetY}
                  width={outerW} height={outerH}
                  fill="transparent" stroke="#94a3b8" strokeWidth={1} />

                {/* Print area dashed border */}
                <Rect x={printOffsetX} y={printOffsetY}
                  width={printW} height={printH}
                  fill="transparent" stroke="hsl(30 83% 57%)"
                  strokeWidth={1.5} dash={[6, 4]} />
              </>
            )}

            {/* Snap guides */}
            {snapGuides.map((guide, i) => {
              if (guide.type === "horizontal") {
                return <Line key={i}
                  points={[printOffsetX, guide.position, printOffsetX + printW, guide.position]}
                  stroke="#ef4444" strokeWidth={1} dash={[4, 4]} />;
              }
              return <Line key={i}
                points={[guide.position, printOffsetY, guide.position, printOffsetY + printH]}
                stroke="#ef4444" strokeWidth={1} dash={[4, 4]} />;
            })}

            {/* Elements */}
            {currentElements.map((el) => {
              const { x, y, w, h } = percentToPxAbs(el);
              const outOfBounds = checkOutOfBounds(el.id);

              if (el.type === "image") {
                return (
                  <ImageElement key={el.id}
                    id={el.id}
                    imageUrl={el.imageUrl ?? ""}
                    assetId={el.assetId}
                    x={x} y={y} width={w} height={h}
                    rotation={el.rotation}
                    isSelected={selectedId === el.id}
                    outOfBounds={outOfBounds}
                    loadedImages={loadedImages}
                    onLoadImage={onLoadImage}
                    onSelect={() => onSelectId(el.id)}
                    onDragMove={(node) => onDragMove(el.id, node)}
                    onDragEnd={(node) => onDragEnd(el.id, node)}
                    onTransformEnd={(node) => onTransformEnd(el.id, node)}
                  />
                );
              }

              if (el.type === "text") {
                return (
                  <TextElement key={el.id}
                    id={el.id}
                    content={el.content ?? ""}
                    font={el.font ?? "Arial"}
                    fontSize={el.fontSize ?? 24}
                    color={el.color ?? "#1a365d"}
                    bold={el.bold ?? false}
                    italic={el.italic ?? false}
                    x={x} y={y} width={w} height={h}
                    rotation={el.rotation}
                    isSelected={selectedId === el.id}
                    outOfBounds={outOfBounds}
                    stageRef={stageRef}
                    zoom={zoom}
                    onSelect={() => onSelectId(el.id)}
                    onDragMove={(node) => onDragMove(el.id, node)}
                    onDragEnd={(node) => onDragEnd(el.id, node)}
                    onTransformEnd={(node) => onTransformEnd(el.id, node)}
                    onTextChange={(text) => onTextChange(el.id, text)}
                  />
                );
              }
              return null;
            })}

            {/* Transformer */}
            <Transformer ref={transformerRef}
              keepRatio={isImageSelected}
              rotateEnabled
              rotationSnaps={[0, 45, 90, 135, 180, 225, 270, 315]}
              rotationSnapTolerance={5}
              borderStroke="hsl(30 83% 57%)"
              anchorStroke="hsl(30 83% 57%)"
              anchorFill="white"
              anchorSize={8}
              onTransform={(e) => {
                const node = e.target;
                const rotation = Math.round(node.rotation() % 360);
                const normalizedRotation = rotation < 0 ? rotation + 360 : rotation;
                const box = node.getClientRect();
                setRotationLabel({
                  angle: normalizedRotation,
                  x: box.x + box.width + 10,
                  y: box.y - 10,
                });
              }}
              onTransformEnd={() => {
                setRotationLabel(null);
              }}
            />
          </Layer>
        </Stage>

        {/* Dimension labels overlay */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-3 pointer-events-none z-10">
          <span className="text-xs bg-card/90 border border-border rounded-full px-2.5 py-0.5 text-muted-foreground">
            {product.width_cm}×{product.height_cm} cm (físico)
          </span>
          <span className="text-xs bg-accent/10 border border-accent/30 rounded-full px-2.5 py-0.5 text-accent font-medium">
            {product.print_width_cm}×{product.print_height_cm} cm (impresión)
          </span>
        </div>

        {/* Rotation angle tooltip */}
        {rotationLabel && (
          <div
            className="absolute pointer-events-none z-20"
            style={{ left: `${rotationLabel.x}px`, top: `${rotationLabel.y}px` }}
          >
            <div className="bg-slate-900 text-white text-xs font-mono px-2 py-1 rounded shadow-lg">
              {rotationLabel.angle}°
            </div>
          </div>
        )}

        {/* Delete hint */}
        {selectedId && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-card/95 border border-border rounded-full px-3 py-1 shadow pointer-events-none z-10">
            <span className="text-xs text-muted-foreground">Delete para eliminar · Doble clic en texto para editar</span>
          </div>
        )}
      </div>
    </div>
  );
}
