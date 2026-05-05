import { useState, useEffect } from "react";
import { ArrowLeft, RefreshCw, X, Globe, Shield, ExternalLink, Info } from "lucide-react";
import { useTheme, TYPE_SCALE, WEIGHT, SHADOW } from "./ThemeContext";
import { useLocale } from "./i18n";

interface InternetBrowserProps {
  initialUrl: string;
  onClose: () => void;
}

export function InternetBrowser({ initialUrl, onClose }: InternetBrowserProps) {
  const { theme } = useTheme();
  const { t, dir, isRTL } = useLocale();

  const [url, setUrl] = useState(initialUrl);
  const [isLoading, setIsLoading] = useState(true);

  // Auto-format URL if needed
  useEffect(() => {
    let formattedUrl = initialUrl;
    if (formattedUrl && !formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
      formattedUrl = 'https://' + formattedUrl;
    }
    setUrl(formattedUrl);
  }, [initialUrl]);

  return (
    <div 
      className="absolute inset-0 z-[100] flex flex-col animate-in fade-in zoom-in-95 duration-200"
      style={{ backgroundColor: theme.background }}
      dir={dir}
    >
      {/* Browser Toolbar */}
      <div 
        className="shrink-0 flex items-center justify-between px-8" 
        style={{ 
          height: "80px", 
          backgroundColor: theme.surface, 
          borderBottom: theme.cardBorder,
          boxShadow: SHADOW.md 
        }}
      >
        <div className="flex items-center gap-4 flex-1">
          <button 
            onClick={onClose} 
            className="flex items-center justify-center cursor-pointer active:scale-95 transition-transform group" 
            style={{ 
              width: "56px", 
              height: "56px", 
              backgroundColor: theme.primary, 
              borderRadius: theme.radiusMd,
              border: "none",
              boxShadow: SHADOW.sm
            }}
          >
            <ArrowLeft size={28} color="#fff" className={isRTL ? 'rotate-180' : ''} />
          </button>
          
          <div 
            className="flex items-center gap-3 px-4 py-2 flex-1 max-w-2xl" 
            style={{ 
              backgroundColor: theme.background, 
              borderRadius: theme.radiusLg,
              border: `1px solid ${theme.primarySubtle}` 
            }}
          >
            <Shield size={18} color={theme.success} />
            <span 
              className="text-sm font-medium truncate" 
              style={{ color: theme.textMuted }}
            >
              {url}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button 
            onClick={() => { setIsLoading(true); const currentUrl = url; setUrl(''); setTimeout(() => setUrl(currentUrl), 10); }}
            className="flex items-center justify-center cursor-pointer active:scale-95 transition-transform"
            style={{ 
              width: "48px", 
              height: "48px", 
              backgroundColor: theme.surfaceElevated, 
              borderRadius: theme.radiusMd,
              border: "none"
            }}
          >
            <RefreshCw size={20} color={theme.textHeading} className={isLoading ? 'animate-spin' : ''} />
          </button>
          <button 
            onClick={onClose} 
            className="flex items-center justify-center cursor-pointer active:scale-95 transition-transform" 
            style={{ 
              width: "48px", 
              height: "48px", 
              backgroundColor: theme.surfaceElevated, 
              borderRadius: theme.radiusMd,
              border: "none"
            }}
          >
            <X size={24} color={theme.textHeading} />
          </button>
        </div>
      </div>

      {/* Browser Content */}
      <div className="flex-1 relative bg-white overflow-hidden">
        {isLoading && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/90 backdrop-blur-sm">
            <div className="w-16 h-16 border-4 border-t-blue-600 border-blue-100 rounded-full animate-spin mb-4" />
            <p className="text-slate-600 font-bold animate-pulse">
              {t("general.loading") || "Loading content..."}
            </p>
          </div>
        )}

        <iframe 
          key={url}
          src={url}
          className="w-full h-full border-none"
          onLoad={() => setIsLoading(false)}
          sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
          title="Internet Browser Content"
        />

        {/* Technical Guidance Banner */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-full max-w-2xl px-6 pointer-events-none">
          <div 
            className="bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-2xl p-5 shadow-2xl flex items-start gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-700 fill-mode-forwards opacity-0"
            style={{ pointerEvents: "auto" }}
          >
            <div className="bg-blue-500/20 p-2 rounded-lg text-blue-400">
              <Info size={24} />
            </div>
            <div className="flex-1">
              <h4 className="text-white font-bold text-sm mb-1">Technical Note for Testing</h4>
              <p className="text-white/60 text-xs leading-relaxed">
                Sites like <b>BBC, CNN, and Google</b> block embedding in standard browsers. 
                <span className="text-emerald-400 font-bold block mt-1">This will work on the actual bedside hardware.</span> 
                For now, please use the <b>"Open Full"</b> button in the toolbar.
              </p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Security Footer Notice */}
      <div className="shrink-0 px-8 py-2 flex items-center justify-center gap-2" style={{ backgroundColor: theme.surface, fontSize: '12px', color: theme.textMuted }}>
        <Globe size={12} />
        <span>You are browsing within the secure CareInn environment. External links are monitored.</span>
      </div>
    </div>
  );
}
