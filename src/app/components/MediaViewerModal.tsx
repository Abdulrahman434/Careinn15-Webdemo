import { useState } from "react";
import { X, ZoomIn, ZoomOut, RotateCw } from "lucide-react";
import { useTheme } from "./ThemeContext";
import { useLocale } from "./i18n";

interface MediaViewerModalProps {
  onClose: () => void;
  type: "image" | "video";
  src: string;
  title: string;
}

export function MediaViewerModal({ onClose, type, src, title }: MediaViewerModalProps) {
  const { theme } = useTheme();
  const { isRTL, fontFamily } = useLocale();
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);

  const handleZoomIn = () => setScale((s) => Math.min(s + 0.25, 3.0));
  const handleZoomOut = () => setScale((s) => Math.max(s - 0.25, 0.5));
  const handleRotate = () => setRotation((r) => (r + 90) % 360);

  return (
    <div
      className="absolute inset-0 z-[100] flex flex-col overflow-hidden"
      style={{
        backgroundColor: "#1e1f22",
        touchAction: "none",
        userSelect: "none",
        fontFamily,
      }}
    >
      {/* CSS Keyframes for animated entries */}
      <style>{`
        .media-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 44px;
          height: 44px;
          border-radius: 8px;
          border: none;
          background: rgba(255, 255, 255, 0.08);
          color: #e8e8e8;
          cursor: pointer;
          transition: background 0.15s, transform 0.1s;
        }
        .media-btn:active {
          background: rgba(255, 255, 255, 0.18);
          transform: scale(0.95);
        }
      `}</style>

      {/* TOP HEADER BAR */}
      <div
        className="shrink-0 flex items-center justify-between"
        style={{
          height: 48,
          backgroundColor: "#2b2d30",
          borderBottom: "1px solid #1a1a1a",
          zIndex: 20,
          color: "#fff",
          paddingLeft: 20,
          paddingRight: 4,
        }}
      >
        <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: ".3px", opacity: 0.9 }}>
          {title || (type === "image" ? "Image Viewer" : "Video Player")}
        </span>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 56 }}>
          <button
            onClick={onClose}
            className="media-btn"
            style={{
              backgroundColor: "#dc2626",
              borderRadius: 10,
              color: "#fff",
            }}
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* MAIN MEDIA CONTENT WINDOW */}
      <div className="flex-1 relative flex items-center justify-center p-8 overflow-hidden">
        {type === "image" ? (
          <div className="relative overflow-hidden w-full h-full flex items-center justify-center">
            <img
              src={src}
              alt={title}
              style={{
                maxHeight: "80vh",
                maxWidth: "85vw",
                objectFit: "contain",
                borderRadius: "8px",
                boxShadow: "0 15px 40px rgba(0, 0, 0, 0.4)",
                transform: `scale(${scale}) rotate(${rotation}deg)`,
                transition: "transform 0.25s cubic-bezier(0.2, 0.8, 0.2, 1.0)",
              }}
            />

            {/* FLOATING ZOOM / ROTATE TOOLBAR */}
            <div
              className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 px-4 py-2.5 rounded-full"
              style={{
                backgroundColor: "rgba(43, 45, 48, 0.85)",
                backdropFilter: "blur(12px)",
                WebkitBackdropFilter: "blur(12px)",
                border: "1px solid rgba(255, 255, 255, 0.12)",
                boxShadow: "0 10px 30px rgba(0, 0, 0, 0.3)",
                zIndex: 30,
              }}
            >
              <button onClick={handleZoomOut} className="media-btn" style={{ width: 38, height: 38 }} title="Zoom Out">
                <ZoomOut size={16} />
              </button>
              <span style={{ color: "#fff", fontSize: 13, fontWeight: 600, minWidth: 40, textAlign: "center" }}>
                {Math.round(scale * 100)}%
              </span>
              <button onClick={handleZoomIn} className="media-btn" style={{ width: 38, height: 38 }} title="Zoom In">
                <ZoomIn size={16} />
              </button>
              <div style={{ width: 1, height: 24, backgroundColor: "rgba(255, 255, 255, 0.15)", margin: "0 4px" }} />
              <button onClick={handleRotate} className="media-btn" style={{ width: 38, height: 38 }} title="Rotate">
                <RotateCw size={16} />
              </button>
            </div>
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center relative p-4">
            <video
              src={src}
              controls
              autoPlay
              muted
              playsInline
              style={{
                width: "100%",
                height: "100%",
                maxWidth: "92vw",
                maxHeight: "82vh",
                objectFit: "contain",
                borderRadius: "12px",
                boxShadow: "0 20px 50px rgba(0, 0, 0, 0.6)",
                backgroundColor: "#000",
                outline: "none",
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
