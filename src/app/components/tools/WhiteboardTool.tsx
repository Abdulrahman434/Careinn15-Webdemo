import { useRef, useState, useCallback, useEffect } from "react";
import { useTheme, TYPE_SCALE, WEIGHT, SHADOW } from "../ThemeContext";
import { useLocale } from "../i18n";
import { useCanvasSize } from "../../lib/canvasSize";
import { toolHeader, toolHeaderGroup, toolHeaderButton, toolTitle, toolBody, toolPanes, toolSidePanel } from "./toolLayout";
import { ArrowLeft, ArrowRight, Trash2, Pencil, Eraser } from "lucide-react";

type Tool = "pen" | "eraser";

const COLORS = ["#000000", "#FF6B6B", "#4ECDC4", "#45B7D1", "#FFA07A", "#F7DC6F", "#BB8FCE", "#85C1E2"];
const SIZES = [4, 8, 16, 24];

export function WhiteboardTool({ onClose, onBackToTools }: { onClose: () => void; onBackToTools: () => void }) {
  const { theme } = useTheme();
  const { fontFamily, t, isRTL } = useLocale();
  const { portrait, compact } = useCanvasSize();
  /* "Back" is to the right in Arabic and Urdu. */
  const BackArrow = isRTL ? ArrowRight : ArrowLeft;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [tool, setTool] = useState<Tool>("pen");
  const [color, setColor] = useState("#000000");
  const [size, setSize] = useState(8);
  /* In portrait the toolbar is a row above the board, so its buttons are 48px squares. */
  const pick = portrait ? { width: "48px", height: "48px", flexShrink: 0 } : {};

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas size — in portrait, the board's own shape so strokes aren't stretched
    if (portrait && canvas.clientWidth > 0 && canvas.clientHeight > 0) {
      canvas.width = Math.round(canvas.clientWidth);
      canvas.height = Math.round(canvas.clientHeight);
    } else {
      canvas.width = 1600;
      canvas.height = 880;
    }

    // Fill with white background
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, [portrait]);

  const startDrawing = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const x = ((e.clientX - rect.left) * canvas.width) / rect.width;
      const y = ((e.clientY - rect.top) * canvas.height) / rect.height;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      setIsDrawing(true);
      ctx.beginPath();
      ctx.moveTo(x, y);
    },
    []
  );

  const draw = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!isDrawing) return;

      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const x = ((e.clientX - rect.left) * canvas.width) / rect.width;
      const y = ((e.clientY - rect.top) * canvas.height) / rect.height;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.lineWidth = size;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      if (tool === "pen") {
        ctx.globalCompositeOperation = "source-over";
        ctx.strokeStyle = color;
      } else {
        ctx.globalCompositeOperation = "destination-out";
      }

      ctx.lineTo(x, y);
      ctx.stroke();
    },
    [isDrawing, tool, color, size]
  );

  const stopDrawing = useCallback(() => {
    setIsDrawing(false);
  }, []);

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, []);

  return (
    <div
      className="absolute inset-0 z-50 flex flex-col"
      style={{
        backgroundColor: theme.background,
      }}
    >
      {/* Header */}
      <div
        className="shrink-0 flex items-center justify-between px-8"
        style={{
          height: "88px",
          ...toolHeader(compact),
          backgroundColor: theme.surface,
          borderBottom: theme.cardBorder,
          boxShadow: SHADOW.lg,
        }}
      >
        <div className="flex items-center gap-4" style={toolHeaderGroup(compact)}>
          <button
            onClick={onBackToTools}
            className="flex items-center justify-center cursor-pointer active:scale-95 transition-transform"
            style={{
              width: "56px",
              height: "56px",
              ...toolHeaderButton(compact),
              backgroundColor: theme.surfaceElevated,
              borderRadius: theme.radiusMd,
              border: "none",
              outline: "none",
            }}
          >
            <BackArrow size={24} color={theme.textHeading} />
          </button>
          <h1
            style={{
              fontFamily: fontFamily,
              fontSize: TYPE_SCALE.xl,
              fontWeight: WEIGHT.bold,
              color: theme.textHeading,
              ...toolTitle(compact),
            }}
          >
            {t("tool.whiteboard")}
          </h1>
        </div>
        <button
          onClick={onClose}
          className="flex items-center justify-center cursor-pointer active:scale-95 transition-transform"
          style={{
            width: "56px",
            height: "56px",
            ...toolHeaderButton(compact),
            backgroundColor: theme.surfaceElevated,
            borderRadius: theme.radiusMd,
            border: "none",
            outline: "none",
          }}
        >
          <span style={{ fontSize: "24px", color: theme.textHeading }}>×</span>
        </button>
      </div>

      {/* Whiteboard Content */}
      <div
        className="flex-1 flex gap-6 px-8 py-6"
        style={{ ...toolBody(portrait, compact), ...toolPanes(portrait, compact), ...(portrait ? { overflowY: "hidden" } : {}) }}
      >
        {/* Toolbar */}
        <div
          className="flex flex-col gap-6"
          style={{
            width: "120px",
            padding: "20px",
            ...(portrait
              ? { ...toolSidePanel(portrait), flexDirection: "row", alignItems: "flex-end", padding: compact ? "12px 16px" : "16px 20px", overflowX: "auto", scrollbarWidth: "none" }
              : {}),
            backgroundColor: theme.surface,
            borderRadius: theme.radiusCard,
            border: theme.cardBorder,
            boxShadow: SHADOW.md,
          }}
        >
          {/* Tools */}
          <div>
            <h3
              className="mb-3"
              style={{
                fontFamily: fontFamily,
                fontSize: TYPE_SCALE.sm,
                fontWeight: WEIGHT.bold,
                color: theme.textMuted,
              }}
            >
              Tools
            </h3>
            <div className="flex flex-col gap-2" style={portrait ? { flexDirection: "row" } : undefined}>
              <button
                onClick={() => setTool("pen")}
                className="cursor-pointer transition-transform"
                style={{
                  width: "80px",
                  height: "80px",
                  ...pick,
                  backgroundColor: tool === "pen" ? theme.primarySubtle : theme.surfaceElevated,
                  borderRadius: theme.radiusMd,
                  border: tool === "pen" ? `2px solid ${theme.primary}` : "none",
                  outline: "none",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Pencil size={32} color={tool === "pen" ? theme.primaryOn : theme.textMuted} />
              </button>
              <button
                onClick={() => setTool("eraser")}
                className="cursor-pointer transition-transform"
                style={{
                  width: "80px",
                  height: "80px",
                  ...pick,
                  backgroundColor: tool === "eraser" ? theme.primarySubtle : theme.surfaceElevated,
                  borderRadius: theme.radiusMd,
                  border: tool === "eraser" ? `2px solid ${theme.primary}` : "none",
                  outline: "none",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Eraser size={32} color={tool === "eraser" ? theme.primaryOn : theme.textMuted} />
              </button>
            </div>
          </div>

          {/* Colors */}
          {tool === "pen" && (
            <div>
              <h3
                className="mb-3"
                style={{
                  fontFamily: fontFamily,
                  fontSize: TYPE_SCALE.sm,
                  fontWeight: WEIGHT.bold,
                  color: theme.textMuted,
                }}
              >
                Colors
              </h3>
              <div className="flex flex-col gap-2" style={portrait ? { flexDirection: "row" } : undefined}>
                {COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setColor(c)}
                    className="cursor-pointer transition-transform"
                    style={{
                      width: "80px",
                      height: "48px",
                      ...pick,
                      backgroundColor: c,
                      borderRadius: theme.radiusMd,
                      border: color === c ? `3px solid ${theme.primaryOn}` : "none",
                      outline: "none",
                      boxShadow: color === c ? `0 0 12px ${c}` : "none",
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Sizes */}
          <div>
            <h3
              className="mb-3"
              style={{
                fontFamily: fontFamily,
                fontSize: TYPE_SCALE.sm,
                fontWeight: WEIGHT.bold,
                color: theme.textMuted,
              }}
            >
              Size
            </h3>
            <div className="flex flex-col gap-2" style={portrait ? { flexDirection: "row" } : undefined}>
              {SIZES.map((s) => (
                <button
                  key={s}
                  onClick={() => setSize(s)}
                  className="cursor-pointer transition-transform"
                  style={{
                    width: "80px",
                    height: "48px",
                    ...pick,
                    backgroundColor: size === s ? theme.primarySubtle : theme.surfaceElevated,
                    borderRadius: theme.radiusMd,
                    border: size === s ? `2px solid ${theme.primary}` : "none",
                    outline: "none",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <div
                    style={{
                      width: `${portrait ? Math.min(s * 2, 36) : s * 2}px`,
                      height: `${portrait ? Math.min(s * 2, 36) : s * 2}px`,
                      backgroundColor: size === s ? theme.primary : theme.textMuted,
                      borderRadius: "50%",
                    }}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Clear Button */}
          <button
            onClick={clearCanvas}
            className="cursor-pointer active:scale-95 transition-transform mt-auto"
            style={{
              width: "80px",
              height: "80px",
              backgroundColor: "#D10044",
              borderRadius: theme.radiusMd,
              border: "none",
              outline: "none",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "4px",
              ...(portrait ? { width: "auto", height: "48px", flexDirection: "row", gap: "8px", paddingInline: "16px", flexShrink: 0, marginTop: 0, marginInlineStart: "auto" } : {}),
            }}
          >
            <Trash2 size={28} color="#fff" />
            <span
              style={{
                fontFamily: fontFamily,
                fontSize: TYPE_SCALE.sm,
                fontWeight: WEIGHT.bold,
                color: "#fff",
              }}
            >
              Clear
            </span>
          </button>
        </div>

        {/* Canvas */}
        <div
          className="flex-1"
          style={{
            backgroundColor: theme.surface,
            borderRadius: theme.radiusCard,
            border: theme.cardBorder,
            boxShadow: SHADOW.md,
            padding: compact ? "8px" : "16px",
            ...(portrait ? { minHeight: 0 } : {}),
          }}
        >
          <canvas
            ref={canvasRef}
            onPointerDown={startDrawing}
            onPointerMove={draw}
            onPointerUp={stopDrawing}
            onPointerLeave={stopDrawing}
            className="cursor-crosshair"
            style={{
              width: "100%",
              height: "100%",
              backgroundColor: "#FFFFFF",
              borderRadius: theme.radiusMd,
              boxShadow: "inset 0 2px 8px rgba(0,0,0,0.1)",
              touchAction: "none",
            }}
          />
        </div>
      </div>
    </div>
  );
}
