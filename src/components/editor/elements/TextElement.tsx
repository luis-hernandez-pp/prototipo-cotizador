import { useEffect, useRef, useState, useCallback } from "react";
import type Konva from "konva";

interface TextElementProps {
  id: string;
  content: string;
  font: string;
  fontSize: number;
  color: string;
  bold: boolean;
  italic: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  isSelected: boolean;
  outOfBounds: boolean;
  stageRef: React.RefObject<Konva.Stage>;
  zoom: { scale: number; offsetX: number; offsetY: number };
  onSelect: () => void;
  onDragMove: (node: Konva.Node) => void;
  onDragEnd: (node: Konva.Node) => void;
  onTransformEnd: (node: Konva.Node) => void;
  onTextChange: (newText: string) => void;
}

// Dynamic import to avoid SSR issues
import { Text as KonvaText } from "react-konva";

export function TextElement({
  id, content, font, fontSize, color, bold, italic,
  x, y, width, height, rotation,
  isSelected, outOfBounds,
  stageRef, zoom,
  onSelect, onDragMove, onDragEnd, onTransformEnd, onTextChange,
}: TextElementProps) {
  const textRef = useRef<Konva.Text>(null);
  const [editing, setEditing] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const startEdit = useCallback(() => {
    if (!textRef.current || !stageRef.current) return;
    setEditing(true);
  }, [stageRef]);

  useEffect(() => {
    if (!editing || !textRef.current || !stageRef.current) return;

    const node = textRef.current;
    const stage = stageRef.current;
    const container = stage.container();
    const containerRect = container.getBoundingClientRect();

    const absPos = node.getAbsolutePosition();
    const scale = zoom.scale;

    const ta = document.createElement("textarea");
    ta.value = content;
    ta.style.position = "fixed";
    ta.style.top = `${containerRect.top + absPos.y}px`;
    ta.style.left = `${containerRect.left + absPos.x}px`;
    ta.style.width = `${width * scale}px`;
    ta.style.minHeight = `${height * scale}px`;
    ta.style.fontSize = `${fontSize * scale}px`;
    ta.style.fontFamily = font;
    ta.style.fontWeight = bold ? "bold" : "normal";
    ta.style.fontStyle = italic ? "italic" : "normal";
    ta.style.color = color;
    ta.style.background = "rgba(255,255,255,0.95)";
    ta.style.border = "1.5px solid hsl(30 83% 57%)";
    ta.style.borderRadius = "4px";
    ta.style.padding = "2px 4px";
    ta.style.outline = "none";
    ta.style.resize = "none";
    ta.style.zIndex = "9999";
    ta.style.lineHeight = "1.2";
    ta.style.overflow = "hidden";
    ta.style.transformOrigin = "top left";
    ta.style.transform = rotation ? `rotate(${rotation}deg)` : "";

    document.body.appendChild(ta);
    textareaRef.current = ta;
    ta.focus();
    ta.select();

    const finish = () => {
      onTextChange(ta.value);
      setEditing(false);
      document.body.removeChild(ta);
      textareaRef.current = null;
    };

    ta.addEventListener("blur", finish);
    ta.addEventListener("keydown", (e: KeyboardEvent) => {
      if (e.key === "Escape") { finish(); }
      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); finish(); }
    });

    return () => {
      if (document.body.contains(ta)) {
        document.body.removeChild(ta);
      }
    };
  }, [editing]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <KonvaText
      ref={textRef}
      id={id}
      text={content}
      x={x} y={y}
      width={width}
      fontSize={fontSize}
      fontFamily={font}
      fontStyle={`${italic ? "italic" : ""} ${bold ? "bold" : ""}`.trim() || "normal"}
      fill={editing ? "transparent" : color}
      rotation={rotation}
      draggable={!editing}
      stroke={outOfBounds ? "red" : "transparent"}
      strokeWidth={outOfBounds ? 1 : 0}
      onClick={onSelect}
      onTap={onSelect}
      onDblClick={startEdit}
      onDblTap={startEdit}
      onDragMove={(e) => onDragMove(e.target)}
      onDragEnd={(e) => onDragEnd(e.target)}
      onTransformEnd={(e) => onTransformEnd(e.target)}
    />
  );
}
