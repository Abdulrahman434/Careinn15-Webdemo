import { useState } from "react";
import { useTheme, TYPE_SCALE, WEIGHT, SHADOW } from "../ThemeContext";
import { useLocale } from "../i18n";
import { ArrowLeft, Quote, RefreshCw, Heart } from "lucide-react";

const QUOTES = [
  { text: "The greatest glory in living lies not in never falling, but in rising every time we fall.", author: "Nelson Mandela" },
  { text: "Your present circumstances don't determine where you can go; they merely determine where you start.", author: "Nido Qubein" },
  { text: "Believe you can and you're halfway there.", author: "Theodore Roosevelt" },
  { text: "Keep your face always toward the sunshine - and shadows will fall behind you.", author: "Walt Whitman" },
  { text: "Healing takes time, and asking for help is a courageous step.", author: "Unknown" },
  { text: "Every day is a second chance.", author: "Unknown" },
  { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
  { text: "Be kind whenever possible. It is always possible.", author: "Dalai Lama" },
];

export function DailyQuotesTool({ onClose, onBackToTools }: { onClose: () => void; onBackToTools: () => void }) {
  const { theme } = useTheme();
  const { isRTL, fontFamily } = useLocale();
  const [index, setIndex] = useState(() => Math.floor(Math.random() * QUOTES.length));
  
  const nextQuote = () => {
    let nextIndex;
    do {
      nextIndex = Math.floor(Math.random() * QUOTES.length);
    } while (nextIndex === index);
    setIndex(nextIndex);
  };

  const quote = QUOTES[index];

  return (
    <div className="absolute inset-0 z-50 flex flex-col" style={{ backgroundColor: theme.background }}>
      <div className="shrink-0 flex items-center justify-between px-8" style={{ height: "88px", backgroundColor: theme.surface, borderBottom: theme.cardBorder, boxShadow: SHADOW.lg }}>
        <div className="flex items-center gap-4">
          <button onClick={onBackToTools} className="flex items-center justify-center cursor-pointer active:scale-95 transition-transform" style={{ width: "56px", height: "56px", backgroundColor: theme.surfaceElevated, borderRadius: theme.radiusMd, border: "none", outline: "none" }}>
            <ArrowLeft size={24} color={theme.textHeading} style={{ transform: isRTL ? "rotate(180deg)" : "none" }} />
          </button>
          <h1 style={{ fontFamily: fontFamily, fontSize: TYPE_SCALE.xl, fontWeight: WEIGHT.bold, color: theme.textHeading }}>Daily Quotes</h1>
        </div>
        <button onClick={onClose} className="flex items-center justify-center cursor-pointer active:scale-95 transition-transform" style={{ width: "56px", height: "56px", backgroundColor: theme.surfaceElevated, borderRadius: theme.radiusMd, border: "none", outline: "none" }}>
          <span style={{ fontSize: "24px", color: theme.textHeading }}>×</span>
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center py-12 px-12 gap-12 bg-gradient-to-b from-transparent to-blue-50/30">
        <div className="relative w-full max-w-4xl p-16 bg-white rounded-[60px] shadow-2xl border border-blue-50 flex flex-col items-center text-center">
          <Quote size={80} className="text-blue-200 absolute top-10 left-10 transform -scale-x-100" />
          
          <div className="min-h-[200px] flex items-center justify-center flex-col gap-8">
            <p 
              className="text-4xl md:text-5xl leading-tight font-medium italic"
              style={{ fontFamily: fontFamily, color: theme.textHeading }}
            >
              "{quote.text}"
            </p>
            <div className="flex items-center gap-4">
              <div className="w-12 h-0.5 bg-blue-300" />
              <span className="text-2xl font-bold uppercase tracking-wider text-blue-500" style={{ fontFamily: fontFamily }}>
                {quote.author}
              </span>
              <div className="w-12 h-0.5 bg-blue-300" />
            </div>
          </div>

          <Heart size={80} className="text-red-50 absolute bottom-10 right-10" />
        </div>

        <button
          onClick={nextQuote}
          className="flex items-center gap-3 px-12 py-5 bg-blue-600 text-white rounded-full font-bold text-xl shadow-xl active:scale-90 transition-all hover:bg-blue-700 hover:shadow-2xl"
        >
          <RefreshCw size={24} /> NEXT QUOTE
        </button>
      </div>
    </div>
  );
}
