import { useState, useEffect } from "react";
import { useTheme, TYPE_SCALE, WEIGHT, SHADOW } from "../ThemeContext";
import { useLocale } from "../i18n";
import { ArrowLeft, Plus, Check, Trash2 } from "lucide-react";

interface NoteTask {
  id: number;
  text: string;
  completed: boolean;
}

export function ToDoListTool({ onClose, onBackToTools }: { onClose: () => void; onBackToTools: () => void }) {
  const { theme } = useTheme();
  const { isRTL, fontFamily } = useLocale();
  const [tasks, setTasks] = useState<NoteTask[]>(() => {
    try {
      const saved = localStorage.getItem("hbs-todo-tasks");
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [input, setInput] = useState("");

  useEffect(() => {
    localStorage.setItem("hbs-todo-tasks", JSON.stringify(tasks));
  }, [tasks]);

  const addTask = () => {
    if (!input.trim()) return;
    setTasks([...tasks, { id: Date.now(), text: input.trim(), completed: false }]);
    setInput("");
  };

  const toggleTask = (id: number) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  const deleteTask = (id: number) => {
    setTasks(tasks.filter(t => t.id !== id));
  };

  return (
    <div className="absolute inset-0 z-50 flex flex-col" style={{ backgroundColor: theme.background }}>
      <div className="shrink-0 flex items-center justify-between px-8" style={{ height: "88px", backgroundColor: theme.surface, borderBottom: theme.cardBorder, boxShadow: SHADOW.lg }}>
        <div className="flex items-center gap-4">
          <button onClick={onBackToTools} className="flex items-center justify-center cursor-pointer active:scale-95 transition-transform" style={{ width: "56px", height: "56px", backgroundColor: theme.surfaceElevated, borderRadius: theme.radiusMd, border: "none", outline: "none" }}>
            <ArrowLeft size={24} color={theme.textHeading} style={{ transform: isRTL ? "rotate(180deg)" : "none" }} />
          </button>
          <h1 style={{ fontFamily: fontFamily, fontSize: TYPE_SCALE.xl, fontWeight: WEIGHT.bold, color: theme.textHeading }}>To-Do List</h1>
        </div>
        <button onClick={onClose} className="flex items-center justify-center cursor-pointer active:scale-95 transition-transform" style={{ width: "56px", height: "56px", backgroundColor: theme.surfaceElevated, borderRadius: theme.radiusMd, border: "none", outline: "none" }}>
          <span style={{ fontSize: "24px", color: theme.textHeading }}>×</span>
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center py-12 px-8 overflow-hidden">
        <div className="w-full max-w-2xl flex flex-col gap-6 h-full">
          {/* Add input */}
          <div className="flex gap-3">
            <input 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addTask()}
              placeholder="What needs to be done?"
              className="flex-1 px-6 py-4 bg-white rounded-2xl border-2 focus:border-blue-500 outline-none shadow-sm text-lg transition-all"
              style={{ fontFamily: fontFamily, borderColor: theme.cardBorder }}
            />
            <button 
              onClick={addTask}
              className="px-6 bg-blue-600 text-white rounded-2xl shadow-lg active:scale-95 transition-all"
            >
              <Plus size={24} />
            </button>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar flex flex-col gap-3">
            {tasks.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center opacity-50 text-center">
                <Check size={64} className="mb-4" />
                <p className="text-xl">No tasks yet. Add one above!</p>
              </div>
            ) : (
              tasks.map(task => (
                <div 
                  key={task.id} 
                  className="flex items-center gap-4 p-5 bg-white rounded-2xl shadow-sm border transition-all"
                  style={{ borderColor: theme.cardBorder }}
                >
                  <button 
                    onClick={() => toggleTask(task.id)}
                    className="w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all"
                    style={{ 
                      borderColor: task.completed ? "#10B981" : "#D1D5DB",
                      backgroundColor: task.completed ? "#10B981" : "transparent"
                    }}
                  >
                    {task.completed && <Check size={18} color="white" />}
                  </button>
                  <span 
                    className="flex-1 text-lg"
                    style={{ 
                      color: task.completed ? theme.textMuted : theme.textNormal,
                      textDecoration: task.completed ? "line-through" : "none"
                    }}
                  >
                    {task.text}
                  </span>
                  <button 
                    onClick={() => deleteTask(task.id)}
                    className="p-2 hover:bg-red-50 text-red-500 rounded-lg transition-colors"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
