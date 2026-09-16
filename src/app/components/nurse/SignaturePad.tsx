import { useEffect, useRef, useState } from "react";
import { useTheme } from "../ThemeContext";
import { RotateCcw } from "lucide-react";

/** A finger-drawn signature on a bedside touchscreen.
 *
 *  The canvas is sized from its own laid-out box and the device pixel ratio, so
 *  the stroke is crisp on the kiosk's panel and the coordinates still line up
 *  with where the finger actually is. Pointer events cover finger, stylus and
 *  the mouse a nurse might use on a desktop preview. */
export function SignaturePad({
  onChange, height = 180,
}: {
  onChange: (dataUrl: string | null) => void;
  height?: number;
}) {
  const { theme: t } = useTheme();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawing = useRef(false);
  const dirty = useRef(false);
  const [hasInk, setHasInk] = useState(false);

  /* Size the backing store to the box and the pixel ratio. Re-run on resize so
     rotating the kiosk or opening a wider panel does not blur the stroke. */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const ratio = window.devicePixelRatio || 1;
      canvas.width = Math.max(1, Math.round(rect.width * ratio));
      canvas.height = Math.max(1, Math.round(rect.height * ratio));
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.scale(ratio, ratio);
      ctx.lineWidth = 2.4;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = t.textHeading;
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [t.textHeading]);

  const pointFrom = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const start = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drawing.current = true;
    const p = pointFrom(e);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
  };

  const move = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const p = pointFrom(e);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    if (!dirty.current) {
      dirty.current = true;
      setHasInk(true);
    }
  };

  const end = () => {
    if (!drawing.current) return;
    drawing.current = false;
    onChange(dirty.current ? (canvasRef.current?.toDataURL("image/png") ?? null) : null);
  };

  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    dirty.current = false;
    setHasInk(false);
    onChange(null);
  };

  return (
    <div className="flex flex-col" style={{ gap: 8 }}>
      <div
        style={{
          position: "relative",
          height,
          borderRadius: t.radiusLg,
          backgroundColor: t.surfaceInset,
          border: `1.5px dashed ${t.borderCardColor}`,
          overflow: "hidden",
        }}
      >
        <canvas
          ref={canvasRef}
          onPointerDown={start}
          onPointerMove={move}
          onPointerUp={end}
          onPointerCancel={end}
          onPointerLeave={end}
          style={{ width: "100%", height: "100%", display: "block", touchAction: "none", cursor: "crosshair" }}
        />
        {!hasInk && (
          <span
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
            style={{ fontFamily: t.fontFamily, fontSize: "14px", color: t.textMuted }}
          >
            Sign here
          </span>
        )}
      </div>
      <button
        onClick={clear}
        disabled={!hasInk}
        className="self-start flex items-center gap-2 cursor-pointer active:scale-95 transition-transform"
        style={{
          padding: "8px 14px",
          borderRadius: t.radiusMd,
          backgroundColor: t.tileInactiveBg,
          border: "none",
          outline: "none",
          opacity: hasInk ? 1 : 0.5,
          cursor: hasInk ? "pointer" : "default",
        }}
      >
        <RotateCcw size={15} style={{ color: t.textMuted }} />
        <span style={{ fontFamily: t.fontFamily, fontSize: "13px", fontWeight: 600, color: t.textMuted }}>
          Clear
        </span>
      </button>
    </div>
  );
}
