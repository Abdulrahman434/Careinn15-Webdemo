import { useState } from "react";
import { useTheme, TYPE_SCALE, WEIGHT, SHADOW } from "../ThemeContext";
import { useLocale } from "../i18n";
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";

export function CalendarTool({ onClose, onBackToTools }: { onClose: () => void; onBackToTools: () => void }) {
  const { theme } = useTheme();
  const { isRTL, fontFamily } = useLocale();
  const [currentDate, setCurrentDate] = useState(new Date());

  const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const totalDays = daysInMonth(year, month);
  const offset = firstDayOfMonth(year, month);
  
  const today = new Date();
  const isToday = (d: number) => today.getDate() === d && today.getMonth() === month && today.getFullYear() === year;

  return (
    <div className="absolute inset-0 z-50 flex flex-col" style={{ backgroundColor: theme.background }}>
      <div className="shrink-0 flex items-center justify-between px-8" style={{ height: "88px", backgroundColor: theme.surface, borderBottom: theme.cardBorder, boxShadow: SHADOW.lg }}>
        <div className="flex items-center gap-4">
          <button onClick={onBackToTools} className="flex items-center justify-center cursor-pointer active:scale-95 transition-transform" style={{ width: "56px", height: "56px", backgroundColor: theme.surfaceElevated, borderRadius: theme.radiusMd, border: "none", outline: "none" }}>
            <ArrowLeft size={24} color={theme.textHeading} style={{ transform: isRTL ? "rotate(180deg)" : "none" }} />
          </button>
          <h1 style={{ fontFamily: fontFamily, fontSize: TYPE_SCALE.xl, fontWeight: WEIGHT.bold, color: theme.textHeading }}>Calendar</h1>
        </div>
        <button onClick={onClose} className="flex items-center justify-center cursor-pointer active:scale-95 transition-transform" style={{ width: "56px", height: "56px", backgroundColor: theme.surfaceElevated, borderRadius: theme.radiusMd, border: "none", outline: "none" }}>
          <span style={{ fontSize: "24px", color: theme.textHeading }}>×</span>
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center py-12 px-8 overflow-hidden">
        <div className="w-full max-w-4xl bg-white rounded-3xl shadow-xl overflow-hidden border" style={{ borderColor: theme.cardBorder }}>
          {/* Calendar Header */}
          <div className="flex items-center justify-between px-8 py-6 bg-blue-600 text-white">
            <button onClick={prevMonth} className="p-2 hover:bg-white/10 rounded-full transition-colors"><ChevronLeft size={32} /></button>
            <h2 className="text-3xl font-bold" style={{ fontFamily: fontFamily }}>
              {monthNames[month]} {year}
            </h2>
            <button onClick={nextMonth} className="p-2 hover:bg-white/10 rounded-full transition-colors"><ChevronRight size={32} /></button>
          </div>

          {/* Grid */}
          <div className="p-8">
            <div className="grid grid-cols-7 mb-4">
              {dayNames.map(d => (
                <div key={d} className="text-center font-bold text-gray-400 py-2 uppercase text-sm tracking-widest">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-2">
              {Array(offset).fill(null).map((_, i) => (
                <div key={`empty-${i}`} className="h-24" />
              ))}
              {Array(totalDays).fill(null).map((_, i) => {
                const day = i + 1;
                const active = isToday(day);
                return (
                  <div 
                    key={day} 
                    className="h-24 flex flex-col items-center justify-center bg-gray-50 rounded-2xl relative border hover:border-blue-300 transition-all cursor-pointer"
                    style={{ 
                      borderColor: active ? theme.primary : "transparent",
                      backgroundColor: active ? theme.primarySubtle : "rgb(249, 250, 251)"
                    }}
                  >
                    <span 
                      style={{ 
                        fontSize: TYPE_SCALE.xl, 
                        fontWeight: active ? WEIGHT.bold : WEIGHT.medium,
                        color: active ? theme.primary : theme.textHeading
                      }}
                    >
                      {day}
                    </span>
                    {active && <div className="w-2 h-2 bg-blue-500 rounded-full mt-1" />}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
