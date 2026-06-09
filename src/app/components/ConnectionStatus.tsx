import { RefreshCw } from "lucide-react";
import { useTheme } from "./ThemeContext";
import { useLocale } from "./i18n";
import {
  useConnectionStatus, timeAgo, ConnState,
} from "../lib/connectionStatus";

const DOT: Record<ConnState, string> = {
  connected: "#22c55e",   // green
  stale:     "#f59e0b",   // amber
  offline:   "#ef4444",   // red
};

export function ConnectionStatus() {
  const { theme: t } = useTheme();
  const { t: tr, fontFamily } = useLocale();
  const { state, lastContact, refreshAvailable, refresh } =
    useConnectionStatus();

  const label =
    state === "connected" ? tr("conn.connected")
    : state === "offline" ? tr("conn.offline")
    : `${tr("conn.lastUpdate")} ${timeAgo(lastContact)} ${tr("conn.ago")}`;

  // show the icon every 30 min, and whenever stale (so user can retry)
  const showRefresh = refreshAvailable || state === "stale";

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <span style={{
        width: 7, height: 7, borderRadius: "50%",
        backgroundColor: DOT[state], flexShrink: 0,
      }} />
      <span style={{
        fontFamily, fontSize: 11, color: t.textMuted,
        whiteSpace: "nowrap", letterSpacing: 0.2,
      }}>{label}</span>
      {showRefresh && (
        <button
          onClick={refresh}
          aria-label={tr("conn.refresh")}
          style={{
            background: "none", border: "none", padding: 2,
            cursor: "pointer", display: "flex", alignItems: "center",
            color: t.textMuted,
          }}
        >
          <RefreshCw size={12} />
        </button>
      )}
    </div>
  );
}
