import { useMemo } from "react";
import type { DesignTemplate } from "../EditorLeftPanel";

interface TemplatePreviewProps {
  template: DesignTemplate;
}

interface TemplateZone {
  type: "image" | "text";
  x: number;
  y: number;
  width: number;
  height: number;
  label?: string;
}

function parseZones(template: DesignTemplate): TemplateZone[] {
  // Try layout_data JSONB if available (cast from Json type)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data = (template as any).layout_data as any;
  if (data?.zones && Array.isArray(data.zones)) return data.zones;

  // Generate synthetic zones based on template metadata
  const zones: TemplateZone[] = [];

  if (template.layout_type === "pattern" && template.pattern_cols && template.pattern_rows) {
    const cols = template.pattern_cols;
    const rows = template.pattern_rows;
    const gap = template.pattern_gap_cm ? 2 : 0; // 2% gap in preview
    const cellW = (100 - gap * (cols - 1)) / cols;
    const cellH = (100 - gap * (rows - 1)) / rows;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        zones.push({
          type: "image",
          x: c * (cellW + gap),
          y: r * (cellH + gap),
          width: cellW,
          height: cellH,
        });
      }
    }
  } else {
    // Single or custom — use position/scale metadata
    const scale = template.scale_percentage ?? 50;
    const x = template.position_x === "center" ? 50 - scale / 2
      : template.position_x === "right" ? 100 - scale : 5;
    const y = template.position_y === "center" ? 50 - scale / 2
      : template.position_y === "bottom" ? 100 - scale : 5;
    zones.push({ type: "image", x, y, width: scale, height: scale });
  }

  return zones;
}

const PREVIEW_W = 120;
const PREVIEW_H = 80;

export function TemplatePreview({ template }: TemplatePreviewProps) {
  const svgContent = useMemo(() => {
    if (template.preview_image_url) return null; // use real image

    const zones = parseZones(template);
    const zoneEls = zones.map((zone, i) => {
      const x = (zone.x / 100) * (PREVIEW_W - 16) + 8;
      const y = (zone.y / 100) * (PREVIEW_H - 12) + 6;
      const w = Math.max(4, (zone.width / 100) * (PREVIEW_W - 16));
      const h = Math.max(4, (zone.height / 100) * (PREVIEW_H - 12));

      if (zone.type === "text") {
        return (
          <rect key={i} x={x} y={y + h * 0.3} width={w} height={Math.max(3, h * 0.4)}
            fill="#94a3b8" rx="1" />
        );
      }
      return (
        <rect key={i} x={x} y={y} width={w} height={h}
          fill="#cbd5e1" stroke="#94a3b8" strokeWidth="0.5" rx="2" />
      );
    });

    return (
      <svg width={PREVIEW_W} height={PREVIEW_H} viewBox={`0 0 ${PREVIEW_W} ${PREVIEW_H}`}
        className="rounded" style={{ display: "block" }}>
        {/* Product background */}
        <rect x="2" y="2" width={PREVIEW_W - 4} height={PREVIEW_H - 4} fill="#f1f5f9" rx="3" />
        {/* Print area */}
        <rect x="8" y="6" width={PREVIEW_W - 16} height={PREVIEW_H - 12}
          fill="none" stroke="#3b82f6" strokeWidth="0.8" strokeDasharray="3,2" rx="2" />
        {/* Zones */}
        {zoneEls}
        {/* Outer border */}
        <rect x="2" y="2" width={PREVIEW_W - 4} height={PREVIEW_H - 4}
          fill="none" stroke="#cbd5e1" strokeWidth="1" rx="3" />
      </svg>
    );
  }, [template]);

  if (template.preview_image_url) {
    return (
      <img src={template.preview_image_url} alt={template.name}
        className="w-full aspect-video object-cover rounded mb-1" />
    );
  }

  return <div className="mb-1">{svgContent}</div>;
}

// Badge for template category
export function TemplateBadge({ template }: { template: DesignTemplate }) {
  const label =
    template.layout_type === "pattern" ? "Patrón"
    : template.position_x === "center" && template.position_y === "center" ? "Centrado"
    : template.layout_type === "custom" ? "Personalizado"
    : "Esquinas";

  const colorClass =
    template.layout_type === "pattern" ? "bg-purple-100 text-purple-700"
    : label === "Centrado" ? "bg-blue-100 text-blue-700"
    : label === "Personalizado" ? "bg-orange-100 text-orange-700"
    : "bg-green-100 text-green-700";

  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${colorClass}`}>
      {label}
    </span>
  );
}
