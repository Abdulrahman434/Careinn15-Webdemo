import { useState, useCallback, useEffect } from "react";
import { useTheme, TYPE_SCALE, WEIGHT, SHADOW } from "../ThemeContext";
import { useLocale } from "../i18n";
import { useCanvasSize } from "../../lib/canvasSize";
import { toolHeader, toolHeaderGroup, toolHeaderButton, toolTitle, toolBody, toolPanes, toolSidePanel } from "./toolLayout";
import { ArrowLeft, ArrowRight, Play, Pause, Wind } from "lucide-react";

type BreathingPhase = "inhale" | "hold1" | "exhale" | "hold2";

interface BreathingTechnique {
  name: string;
  description: string;
  pattern: Record<BreathingPhase, number>; // seconds
  color: string;
}

const techniques: BreathingTechnique[] = [
  {
    name: "4-7-8 Breathing",
    description: "Calming technique for stress and sleep",
    pattern: { inhale: 4, hold1: 7, exhale: 8, hold2: 0 },
    color: "#4ECDC4",
  },
  {
    name: "Box Breathing",
    description: "Navy SEAL technique for focus",
    pattern: { inhale: 4, hold1: 4, exhale: 4, hold2: 4 },
    color: "#667eea",
  },
  {
    name: "Relaxing Breath",
    description: "Simple deep breathing for relaxation",
    pattern: { inhale: 4, hold1: 0, exhale: 6, hold2: 0 },
    color: "#FFA07A",
  },
];

export function BreathingTool({ onClose, onBackToTools }: { onClose: () => void; onBackToTools: () => void }) {
  const { theme } = useTheme();
  const { fontFamily, t, isRTL } = useLocale();
  const { portrait, compact } = useCanvasSize();
  /* "Back" is to the right in Arabic and Urdu. */
  const BackArrow = isRTL ? ArrowRight : ArrowLeft;
  const [selectedTechnique, setSelectedTechnique] = useState<BreathingTechnique>(techniques[0]);
  const [isActive, setIsActive] = useState(false);
  const [currentPhase, setCurrentPhase] = useState<BreathingPhase>("inhale");
  const [secondsInPhase, setSecondsInPhase] = useState(0);
  const [cyclesCompleted, setCyclesCompleted] = useState(0);

  useEffect(() => {
    if (!isActive) return;

    const interval = setInterval(() => {
      const phaseDuration = selectedTechnique.pattern[currentPhase];
      
      if (secondsInPhase < phaseDuration - 1) {
        setSecondsInPhase(secondsInPhase + 1);
      } else {
        // Move to next phase
        setSecondsInPhase(0);
        if (currentPhase === "inhale") {
          if (selectedTechnique.pattern.hold1 > 0) {
            setCurrentPhase("hold1");
          } else {
            setCurrentPhase("exhale");
          }
        } else if (currentPhase === "hold1") {
          setCurrentPhase("exhale");
        } else if (currentPhase === "exhale") {
          if (selectedTechnique.pattern.hold2 > 0) {
            setCurrentPhase("hold2");
          } else {
            setCurrentPhase("inhale");
            setCyclesCompleted(cyclesCompleted + 1);
          }
        } else if (currentPhase === "hold2") {
          setCurrentPhase("inhale");
          setCyclesCompleted(cyclesCompleted + 1);
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isActive, currentPhase, secondsInPhase, selectedTechnique, cyclesCompleted]);

  const handleStart = useCallback(() => {
    setIsActive(true);
    setCurrentPhase("inhale");
    setSecondsInPhase(0);
  }, []);

  const handlePause = useCallback(() => {
    setIsActive(false);
  }, []);

  const handleReset = useCallback(() => {
    setIsActive(false);
    setCurrentPhase("inhale");
    setSecondsInPhase(0);
    setCyclesCompleted(0);
  }, []);

  const getPhaseText = () => {
    switch (currentPhase) {
      case "inhale":
        return "Breathe In";
      case "hold1":
      case "hold2":
        return "Hold";
      case "exhale":
        return "Breathe Out";
    }
  };

  const getCircleScale = () => {
    const phaseDuration = selectedTechnique.pattern[currentPhase];
    const progress = (secondsInPhase + 1) / phaseDuration;
    
    if (currentPhase === "inhale") {
      return 0.5 + progress * 0.5; // grow from 0.5 to 1
    } else if (currentPhase === "exhale") {
      return 1 - progress * 0.5; // shrink from 1 to 0.5
    }
    return 1; // hold phases
  };

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
            {t("tool.breathing")}
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

      {/* Breathing Content */}
      <div className="flex-1 flex gap-8 px-16 py-12" style={{ ...toolBody(portrait, compact), ...toolPanes(portrait, compact) }}>
        {/* Breathing Visualization — portrait: takes the spare height and keeps
            the circle in its middle, the techniques under it. */}
        <div className="flex-1 flex flex-col items-center justify-center" style={portrait ? { flex: "1 0 auto" } : undefined}>
          {/* Breathing Circle */}
          <div
            className="relative flex items-center justify-center mb-12"
            style={{
              width: "500px",
              height: "500px",
              ...(compact ? { width: "280px", height: "280px", marginBottom: "24px" } : {}),
            }}
          >
            {/* Animated Circle */}
            <div
              className="absolute transition-transform duration-1000 ease-in-out"
              style={{
                width: "100%",
                height: "100%",
                transform: `scale(${getCircleScale()})`,
                opacity: isActive ? 1 : 0.5,
              }}
            >
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  backgroundColor: `${selectedTechnique.color}40`,
                  borderRadius: "50%",
                  border: `8px solid ${selectedTechnique.color}`,
                  boxShadow: `0 0 60px ${selectedTechnique.color}60`,
                }}
              />
            </div>

            {/* Text Content */}
            <div className="relative z-10 text-center">
              <p
                className={compact ? "mb-2" : "mb-4"}
                style={{
                  fontFamily: fontFamily,
                  /* Phones: the resting circle is ~175px — the label must fit inside it. */
                  fontSize: compact ? TYPE_SCALE.base : TYPE_SCALE["2xl"],
                  fontWeight: WEIGHT.bold,
                  color: theme.textHeading,
                }}
              >
                {isActive ? getPhaseText() : "Ready to Begin"}
              </p>
              {isActive && (
                <p
                  style={{
                    fontFamily: fontFamily,
                    fontSize: compact ? "64px" : "96px",
                    fontWeight: WEIGHT.bold,
                    color: selectedTechnique.color,
                    lineHeight: 1,
                  }}
                >
                  {selectedTechnique.pattern[currentPhase] - secondsInPhase}
                </p>
              )}
              {!isActive && (
                <Wind size={compact ? 56 : 96} color={theme.textMuted} strokeWidth={1.5} className="mx-auto" />
              )}
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-6 mb-6" style={compact ? { gap: "12px" } : undefined}>
            {!isActive ? (
              <button
                onClick={handleStart}
                className="flex items-center gap-3 px-12 py-5 cursor-pointer active:scale-95 transition-transform"
                style={{
                  ...(compact ? { paddingInline: "24px" } : {}),
                  backgroundColor: selectedTechnique.color,
                  borderRadius: theme.radiusMd,
                  border: "none",
                  outline: "none",
                  boxShadow: SHADOW.xl,
                }}
              >
                <Play size={24} color="#fff" />
                <span
                  style={{
                    fontFamily: fontFamily,
                    fontSize: TYPE_SCALE.lg,
                    fontWeight: WEIGHT.bold,
                    color: "#fff",
                  }}
                >
                  Start Exercise
                </span>
              </button>
            ) : (
              <>
                <button
                  onClick={handlePause}
                  className="flex items-center gap-3 px-12 py-5 cursor-pointer active:scale-95 transition-transform"
                  style={{
                    ...(compact ? { paddingInline: "24px" } : {}),
                    backgroundColor: "#D10044",
                    borderRadius: theme.radiusMd,
                    border: "none",
                    outline: "none",
                    boxShadow: SHADOW.xl,
                  }}
                >
                  <Pause size={24} color="#fff" />
                  <span
                    style={{
                      fontFamily: fontFamily,
                      fontSize: TYPE_SCALE.lg,
                      fontWeight: WEIGHT.bold,
                      color: "#fff",
                    }}
                  >
                    Pause
                  </span>
                </button>
                <button
                  onClick={handleReset}
                  className="px-12 py-5 cursor-pointer active:scale-95 transition-transform"
                  style={{
                    ...(compact ? { paddingInline: "24px" } : {}),
                    backgroundColor: theme.surfaceElevated,
                    borderRadius: theme.radiusMd,
                    border: "none",
                    outline: "none",
                    boxShadow: SHADOW.md,
                    fontFamily: fontFamily,
                    fontSize: TYPE_SCALE.lg,
                    fontWeight: WEIGHT.bold,
                    color: theme.textHeading,
                  }}
                >
                  Reset
                </button>
              </>
            )}
          </div>

          {/* Cycles Counter */}
          {cyclesCompleted > 0 && (
            <div
              className="px-8 py-3"
              style={{
                backgroundColor: theme.primarySubtle,
                borderRadius: theme.radiusFull,
              }}
            >
              <span
                style={{
                  fontFamily: fontFamily,
                  fontSize: TYPE_SCALE.base,
                  fontWeight: WEIGHT.semibold,
                  color: theme.primaryOn,
                }}
              >
                {cyclesCompleted} {cyclesCompleted === 1 ? "cycle" : "cycles"} completed
              </span>
            </div>
          )}
        </div>

        {/* Technique Selector */}
        <div
          className="flex flex-col gap-4"
          style={{
            width: "400px",
            ...toolSidePanel(portrait),
          }}
        >
          <h3
            className="mb-2"
            style={{
              fontFamily: fontFamily,
              fontSize: TYPE_SCALE.md,
              fontWeight: WEIGHT.bold,
              color: theme.textHeading,
            }}
          >
            Select Technique
          </h3>
          {techniques.map((tech) => (
            <button
              key={tech.name}
              onClick={() => {
                setSelectedTechnique(tech);
                handleReset();
              }}
              disabled={isActive}
              className="cursor-pointer text-left transition-transform"
              style={{
                padding: "24px",
                backgroundColor: selectedTechnique.name === tech.name ? theme.surface : theme.surfaceElevated,
                borderRadius: theme.radiusMd,
                border: selectedTechnique.name === tech.name ? `3px solid ${tech.color}` : theme.cardBorder,
                boxShadow: selectedTechnique.name === tech.name ? `0 0 20px ${tech.color}40` : SHADOW.sm,
                outline: "none",
                opacity: isActive && selectedTechnique.name !== tech.name ? 0.5 : 1,
              }}
            >
              <div className="flex items-center gap-3 mb-2">
                <div
                  style={{
                    width: "12px",
                    height: "12px",
                    backgroundColor: tech.color,
                    borderRadius: "50%",
                  }}
                />
                <h4
                  style={{
                    fontFamily: fontFamily,
                    fontSize: TYPE_SCALE.md,
                    fontWeight: WEIGHT.bold,
                    color: theme.textHeading,
                  }}
                >
                  {tech.name}
                </h4>
              </div>
              <p
                className="mb-3"
                style={{
                  fontFamily: fontFamily,
                  fontSize: TYPE_SCALE.sm,
                  color: theme.textMuted,
                }}
              >
                {tech.description}
              </p>
              <div className="flex gap-2 flex-wrap">
                {tech.pattern.inhale > 0 && (
                  <span
                    style={{
                      padding: "4px 12px",
                      backgroundColor: theme.background,
                      borderRadius: theme.radiusFull,
                      fontFamily: fontFamily,
                      fontSize: TYPE_SCALE.xs,
                      color: theme.textMuted,
                    }}
                  >
                    Inhale: {tech.pattern.inhale}s
                  </span>
                )}
                {tech.pattern.hold1 > 0 && (
                  <span
                    style={{
                      padding: "4px 12px",
                      backgroundColor: theme.background,
                      borderRadius: theme.radiusFull,
                      fontFamily: fontFamily,
                      fontSize: TYPE_SCALE.xs,
                      color: theme.textMuted,
                    }}
                  >
                    Hold: {tech.pattern.hold1}s
                  </span>
                )}
                {tech.pattern.exhale > 0 && (
                  <span
                    style={{
                      padding: "4px 12px",
                      backgroundColor: theme.background,
                      borderRadius: theme.radiusFull,
                      fontFamily: fontFamily,
                      fontSize: TYPE_SCALE.xs,
                      color: theme.textMuted,
                    }}
                  >
                    Exhale: {tech.pattern.exhale}s
                  </span>
                )}
                {tech.pattern.hold2 > 0 && (
                  <span
                    style={{
                      padding: "4px 12px",
                      backgroundColor: theme.background,
                      borderRadius: theme.radiusFull,
                      fontFamily: fontFamily,
                      fontSize: TYPE_SCALE.xs,
                      color: theme.textMuted,
                    }}
                  >
                    Hold: {tech.pattern.hold2}s
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
