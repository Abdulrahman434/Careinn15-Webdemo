import { useState, useEffect } from "react";
import { useTheme, TYPE_SCALE, WEIGHT, SHADOW } from "../ThemeContext";
import { useLocale } from "../i18n";
import { ArrowLeft, Droplets, Plus, RotateCcw } from "lucide-react";

export function WaterTrackerTool({ onClose, onBackToTools }: { onClose: () => void; onBackToTools: () => void }) {
  const { theme } = useTheme();
  const { isRTL, fontFamily } = useLocale();
  const [ml, setMl] = useState(() => {
    const saved = localStorage.getItem("hbs-water-ml");
    return saved ? parseInt(saved, 10) : 0;
  });
  const GOAL = 2000;

  const [customAmount, setCustomAmount] = useState("");

  useEffect(() => {
    localStorage.setItem("hbs-water-ml", ml.toString());
  }, [ml]);

  const percentage = Math.min(100, (ml / GOAL) * 100);

  const handleAddCustom = () => {
    const val = parseInt(customAmount, 10);
    if (!isNaN(val) && val > 0) {
      setMl(ml + val);
      setCustomAmount("");
    }
  };

  return (
    <div className="absolute inset-0 z-50 flex flex-col" style={{ backgroundColor: theme.background }}>
      <div className="shrink-0 flex items-center justify-between px-8" style={{ height: "88px", backgroundColor: theme.surface, borderBottom: theme.cardBorder, boxShadow: SHADOW.lg }}>
        <div className="flex items-center gap-4">
          <button onClick={onBackToTools} className="flex items-center justify-center cursor-pointer active:scale-95 transition-transform" style={{ width: "56px", height: "56px", backgroundColor: theme.surfaceElevated, borderRadius: theme.radiusMd, border: "none", outline: "none" }}>
            <ArrowLeft size={24} color={theme.textHeading} style={{ transform: isRTL ? "rotate(180deg)" : "none" }} />
          </button>
          <h1 style={{ fontFamily: fontFamily, fontSize: TYPE_SCALE.xl, fontWeight: WEIGHT.bold, color: theme.textHeading }}>Water Intake</h1>
        </div>
        <button onClick={onClose} className="flex items-center justify-center cursor-pointer active:scale-95 transition-transform" style={{ width: "56px", height: "56px", backgroundColor: theme.surfaceElevated, borderRadius: theme.radiusMd, border: "none", outline: "none" }}>
          <span style={{ fontSize: "24px", color: theme.textHeading }}>×</span>
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center py-12 px-8 overflow-hidden gap-12">
        {/* Main Circle */}
        <div className="relative flex items-center justify-center transition-all" style={{ width: 340, height: 340 }}>
          <svg className="w-full h-full transform -rotate-90">
            <circle cx="170" cy="170" r="150" stroke="#E5E7EB" strokeWidth="20" fill="transparent" />
            <circle 
              cx="170" cy="170" r="150" stroke="#3B82F6" strokeWidth="20" fill="transparent"
              strokeDasharray={942}
              strokeDashoffset={942 - (942 * percentage) / 100}
              strokeLinecap="round"
              className="transition-all duration-1000 ease-out"
            />
          </svg>
          <div className="absolute flex flex-col items-center animate-bounce-slow">
            <Droplets size={64} className="text-blue-500 mb-2" />
            <span style={{ fontSize: "64px", fontWeight: WEIGHT.bold, color: theme.textHeading }}>{ml}</span>
            <span style={{ fontSize: TYPE_SCALE.lg, color: theme.textMuted }}>ml / {GOAL}ml</span>
          </div>
        </div>

        {/* Manual Input */}
        <div className="flex items-center gap-4 bg-white p-4 rounded-3xl shadow-sm border" style={{ borderColor: theme.cardBorder }}>
          <input 
            type="number"
            value={customAmount}
            onChange={(e) => setCustomAmount(e.target.value)}
            placeholder="Custom ml..."
            className="w-32 px-4 py-2 border-b-2 outline-none focus:border-blue-500 text-lg"
            style={{ fontFamily: fontFamily }}
          />
          <button 
            onClick={handleAddCustom}
            className="px-6 py-2 bg-blue-600 text-white rounded-xl font-bold active:scale-95 transition-all"
          >
            ADD
          </button>
        </div>

        {/* Buttons */}
        <div className="flex gap-6">
          <button 
            onClick={() => setMl(ml + 250)}
            className="flex flex-col items-center gap-2 p-6 bg-white border-2 rounded-3xl shadow-lg active:scale-90 transition-all hover:bg-blue-50"
            style={{ borderColor: theme.cardBorder }}
          >
            <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white shadow-inner">
              <Plus size={24} />
            </div>
            <span className="font-bold text-gray-700">Add 250ml</span>
          </button>
          
          <button 
            onClick={() => setMl(0)}
            className="flex flex-col items-center gap-2 p-6 bg-white border-2 rounded-3xl shadow-lg active:scale-90 transition-all hover:bg-red-50"
            style={{ borderColor: theme.cardBorder }}
          >
            <div className="w-12 h-12 bg-red-400 rounded-full flex items-center justify-center text-white shadow-inner">
              <RotateCcw size={24} />
            </div>
            <span className="font-bold text-gray-700">Reset</span>
          </button>
        </div>

        <div className="max-w-md text-center py-4 px-8 bg-blue-50 rounded-2xl border border-blue-100 text-blue-700 font-medium">
          Staying hydrated helps your body recover faster! 💧
        </div>
      </div>
    </div>
  );
}
