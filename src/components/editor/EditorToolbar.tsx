import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Undo2, Redo2, ZoomIn, ZoomOut, Maximize2, Percent,
  AlignHorizontalSpaceAround, AlignVerticalSpaceAround, FileDown,
} from "lucide-react";
import { useState } from "react";

interface EditorToolbarProps {
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  scale: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomToFit: () => void;
  onZoomTo100: () => void;
  onZoomToScale: (scale: number) => void;
  hasMultipleSelected?: boolean;
  onAlignH?: () => void;
  onAlignV?: () => void;
  onExportPdf?: () => void;
}

export function EditorToolbar({
  canUndo, canRedo, onUndo, onRedo,
  scale, onZoomIn, onZoomOut, onZoomToFit, onZoomTo100, onZoomToScale,
  hasMultipleSelected, onAlignH, onAlignV, onExportPdf,
}: EditorToolbarProps) {
  const [editingZoom, setEditingZoom] = useState(false);
  const [zoomInput, setZoomInput] = useState("");

  const pct = Math.round(scale * 100);

  return (
    <div className="h-10 bg-slate-50 border-b border-border flex items-center px-3 gap-1 shrink-0">
      {/* Undo / Redo */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="sm" className="h-7 px-2" disabled={!canUndo} onClick={onUndo}>
            <Undo2 className="w-3.5 h-3.5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Deshacer (Ctrl+Z)</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="sm" className="h-7 px-2" disabled={!canRedo} onClick={onRedo}>
            <Redo2 className="w-3.5 h-3.5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Rehacer (Ctrl+Shift+Z)</TooltipContent>
      </Tooltip>

      <div className="w-px h-5 bg-border mx-1" />

      {/* Zoom */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="sm" className="h-7 px-2" onClick={onZoomOut}>
            <ZoomOut className="w-3.5 h-3.5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Reducir zoom</TooltipContent>
      </Tooltip>

      {editingZoom ? (
        <input
          autoFocus
          className="w-14 h-7 text-xs text-center border border-border rounded bg-background"
          value={zoomInput}
          onChange={(e) => setZoomInput(e.target.value)}
          onBlur={() => {
            const val = parseInt(zoomInput);
            if (!isNaN(val)) onZoomToScale(val / 100);
            setEditingZoom(false);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              const val = parseInt(zoomInput);
              if (!isNaN(val)) onZoomToScale(val / 100);
              setEditingZoom(false);
            }
            if (e.key === "Escape") setEditingZoom(false);
          }}
        />
      ) : (
        <button
          className="h-7 px-2 text-xs font-mono font-medium text-foreground hover:bg-muted rounded transition-colors min-w-[44px]"
          onDoubleClick={() => { setZoomInput(String(pct)); setEditingZoom(true); }}
          title="Doble clic para editar zoom"
        >
          {pct}%
        </button>
      )}

      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="sm" className="h-7 px-2" onClick={onZoomIn}>
            <ZoomIn className="w-3.5 h-3.5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Aumentar zoom</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={onZoomToFit}>
            <Maximize2 className="w-3.5 h-3.5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Ajustar al viewport</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={onZoomTo100}>
            <Percent className="w-3.5 h-3.5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>100%</TooltipContent>
      </Tooltip>

      {/* Align — only show when 2+ selected */}
      {hasMultipleSelected && (
        <>
          <div className="w-px h-5 bg-border mx-1" />
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 px-2" onClick={onAlignH}>
                <AlignHorizontalSpaceAround className="w-3.5 h-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Centrar horizontalmente</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 px-2" onClick={onAlignV}>
                <AlignVerticalSpaceAround className="w-3.5 h-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Centrar verticalmente</TooltipContent>
          </Tooltip>
        </>
      )}

      {/* Export PDF */}
      {onExportPdf && (
        <>
          <div className="w-px h-5 bg-border mx-1 ml-auto" />
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 px-2" onClick={onExportPdf}>
                <FileDown className="w-3.5 h-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Exportar PDF</TooltipContent>
          </Tooltip>
        </>
      )}
    </div>
  );
}
