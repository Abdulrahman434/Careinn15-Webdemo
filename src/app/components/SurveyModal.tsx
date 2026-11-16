import { useTheme, TYPE_SCALE, WEIGHT, SHADOW, LEADING, TEXT_STYLE } from "./ThemeContext";
import { useLocale } from "./i18n";
import { useState, useRef, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight, MessageSquareHeart, MessageSquareWarning, FileText, AlertTriangle, Heart, Mic, MicOff, CheckCircle2, Star, ClipboardList, X, Loader2 } from "lucide-react";
import { InternalPageHeader } from "./InternalPageHeader";
import { ApiImage } from "./ApiImage";
import thankYouImage from "../../assets/23db5e568918c9a319b272caa7a9e865d4fbd418.webp";
import burjeelGoogleReviewQr from "../../assets/feedback/burjeel-google-review-qr.jpeg";
import burjeelPatientFormQr from "../../assets/feedback/burjeel-patient-form-qr.jpeg";
import { useReloadHold } from "../lib/reloadSafety";
import { useCanvasSize } from "../lib/canvasSize";

/* ═══════════════════════════════════════════════════════════════
 * DICTATION (speech-to-text into the text box, Web Speech API)
 * Hidden where the browser has no speech recognition.
 * ═══════════════════════════════════════════════════════════════ */
const SPEECH_LANG: Record<string, string> = { en: "en-US", ar: "ar-SA", ur: "ur-PK" };

function getSpeechRecognition(): (new () => any) | null {
  const w = window as any;
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

const METER_BARS = [0.55, 0.85, 1, 0.85, 0.55];
const SILENCE_MS = 3000;

function DictateButton({ color, value, onChange, maxLength }: {
  color: string;
  value: string;
  onChange: (text: string) => void;
  maxLength?: number;
}) {
  const { theme, darkMode } = useTheme();
  const { t, locale, fontFamily } = useLocale();
  const [listening, setListening] = useState(false);
  const [noSound, setNoSound] = useState(false);
  const recRef = useRef<any>(null);
  const baseRef = useRef("");
  const valueRef = useRef(value);
  valueRef.current = value;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  // Live mic level for the bars. Runs alongside speech recognition on its own stream.
  const barRefs = useRef<(HTMLDivElement | null)[]>([]);
  const meterRef = useRef<{ stream: MediaStream; ctx: AudioContext; raf: number } | null>(null);

  const stopMeter = useCallback(() => {
    const m = meterRef.current;
    if (!m) return;
    cancelAnimationFrame(m.raf);
    m.stream.getTracks().forEach((tr) => tr.stop());
    m.ctx.close().catch(() => {});
    meterRef.current = null;
  }, []);

  const startMeter = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!recRef.current) { stream.getTracks().forEach((tr) => tr.stop()); return; }
      const ctx = new AudioContext();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      ctx.createMediaStreamSource(stream).connect(analyser);
      const data = new Uint8Array(analyser.fftSize);
      let lastSound = performance.now();
      let silent = false;
      const tick = () => {
        analyser.getByteTimeDomainData(data);
        let sum = 0;
        for (let i = 0; i < data.length; i++) { const v = (data[i] - 128) / 128; sum += v * v; }
        const rms = Math.sqrt(sum / data.length);
        const level = Math.min(1, rms * 8);
        const now = performance.now();
        if (rms > 0.02) lastSound = now;
        const isSilent = now - lastSound > SILENCE_MS;
        if (isSilent !== silent) { silent = isSilent; setNoSound(isSilent); }
        barRefs.current.forEach((bar, i) => {
          if (bar) bar.style.height = `${Math.max(3, Math.round(18 * level * METER_BARS[i]))}px`;
        });
        if (meterRef.current) meterRef.current.raf = requestAnimationFrame(tick);
      };
      meterRef.current = { stream, ctx, raf: requestAnimationFrame(tick) };
    } catch {
      setNoSound(true);
    }
  }, []);

  useEffect(() => () => { recRef.current?.abort(); stopMeter(); }, [stopMeter]);

  const Recognition = getSpeechRecognition();
  if (!Recognition) return null;

  const start = () => {
    const rec = new Recognition();
    rec.lang = SPEECH_LANG[locale] ?? "en-US";
    rec.continuous = true;
    rec.interimResults = true;
    baseRef.current = valueRef.current.trim();
    rec.onresult = (e: any) => {
      let spoken = "";
      for (let i = 0; i < e.results.length; i++) spoken += " " + e.results[i][0].transcript;
      spoken = spoken.replace(/\s+/g, " ").trim();
      const next = baseRef.current ? `${baseRef.current} ${spoken}` : spoken;
      onChangeRef.current(maxLength ? next.slice(0, maxLength) : next);
    };
    const finish = () => { recRef.current = null; setListening(false); stopMeter(); };
    rec.onend = finish;
    rec.onerror = (e: any) => {
      console.warn("[dictate] speech error:", e?.error, e?.message);
      if (e?.error === "no-speech" || e?.error === "audio-capture") setNoSound(true);
      finish();
    };
    recRef.current = rec;
    setNoSound(false);
    try {
      rec.start();
      setListening(true);
      startMeter();
    } catch {
      finish();
    }
  };

  const stop = () => { recRef.current?.stop(); };

  const tone = listening ? theme.error : color;
  /* Sits inside the bottom edge of its text box (the parent is `relative`,
     the textarea reserves DICTATE_PAD at the bottom): the pill on the side
     text ends, the "can't hear you" hint on the other. */
  return (
    <div
      className="absolute flex items-center justify-between gap-3"
      style={{ insetInline: 12, bottom: 12, pointerEvents: "none", flexDirection: "row-reverse" }}
    >
      <button
        type="button"
        onClick={listening ? stop : start}
        className="flex items-center gap-2 shrink-0 cursor-pointer transition-transform duration-200 active:scale-[0.96]"
        style={{
          pointerEvents: "auto",
          height: 40, padding: "0 16px", borderRadius: 100, border: "none",
          backgroundColor: listening ? theme.errorSubtle : `${color}${darkMode ? "33" : "14"}`,
        }}
      >
        {listening
          ? (
            <div className="flex items-center" style={{ gap: 2, height: 18 }}>
              {METER_BARS.map((_, i) => (
                <div
                  key={i}
                  ref={(el) => { barRefs.current[i] = el; }}
                  style={{ width: 3, height: 3, borderRadius: 2, backgroundColor: tone, transition: "height 80ms linear" }}
                />
              ))}
            </div>
          )
          : <Mic size={18} style={{ color: tone }} />}
        <span style={{ fontFamily, fontSize: TYPE_SCALE.sm, fontWeight: WEIGHT.bold, color: darkMode && !listening ? theme.textHeading : tone, whiteSpace: "nowrap" }}>
          {listening ? t("dictate.listening") : t("dictate.speak")}
        </span>
      </button>
      {noSound && (
        <div className="flex items-center gap-2 min-w-0" style={{ color: theme.textMuted }}>
          <MicOff size={16} className="shrink-0" />
          <span style={{ fontFamily, fontSize: TYPE_SCALE.sm, fontWeight: WEIGHT.normal, lineHeight: 1.3 }}>{t("dictate.noSound")}</span>
        </div>
      )}
    </div>
  );
}

/** Bottom padding a textarea keeps clear for the dictate bar inside it. */
const DICTATE_PAD = 64;

interface SurveyModalProps {
  onClose: () => void;
  initialPath?: FeedbackPath;
}

/* ═══════════════════════════════════════════════════════════════
 * SURVEY QUESTIONS (kept from original)
 * ═══════════════════════════════════════════════════════════════ */
const questions = [
  {
    id: 1,
    questionKey: "survey.q1",
    optionKeys: ["survey.opt.extremelyDissatisfied", "survey.opt.dissatisfied", "survey.opt.neutral", "survey.opt.satisfied", "survey.opt.extremelySatisfied"],
    type: "satisfaction" as const,
  },
  {
    id: 2,
    questionKey: "survey.q2",
    optionKeys: ["survey.opt.veryPoor", "survey.opt.poor", "survey.opt.average", "survey.opt.good", "survey.opt.excellent"],
    type: "rating" as const,
  },
  {
    id: 3,
    questionKey: "survey.q3",
    optionKeys: ["survey.opt.stronglyDisagree", "survey.opt.disagree", "survey.opt.neutral", "survey.opt.agree", "survey.opt.stronglyAgree"],
    type: "agreement" as const,
  },
  {
    id: 4,
    questionKey: "survey.q4",
    optionKeys: ["survey.opt.veryPoor", "survey.opt.poor", "survey.opt.average", "survey.opt.good", "survey.opt.excellent"],
    type: "rating" as const,
  },
  {
    id: 5,
    questionKey: "survey.q5",
    optionKeys: ["survey.opt.stronglyDisagree", "survey.opt.disagree", "survey.opt.neutral", "survey.opt.agree", "survey.opt.stronglyAgree"],
    type: "agreement" as const,
  },
  {
    id: 6,
    questionKey: "survey.q6",
    optionKeys: ["survey.opt.extremelyDissatisfied", "survey.opt.dissatisfied", "survey.opt.neutral", "survey.opt.satisfied", "survey.opt.extremelySatisfied"],
    type: "satisfaction" as const,
  },
  {
    id: 7,
    questionKey: "survey.q7",
    optionKeys: ["😞", "😕", "😐", "🙂", "😊"],
    type: "emoji" as const,
  },
];

/* ═══════════════════════════════════════════════════════════════
 * CONCERN & APPRECIATION DATA
 * ═══════════════════════════════════════════════════════════════ */
const concernAreas = [
  "concern.area.nursing",
  "concern.area.food",
  "concern.area.room",
  "concern.area.medical",
  "concern.area.wait",
  "concern.area.other",
];

const appreciationTargets = [
  "appreciation.who.specific",
  "appreciation.who.nursing",
  "appreciation.who.doctor",
  "appreciation.who.hospital",
];

/* ═══════════════════════════════════════════════════════════════
 * COLOR CONSTANTS
 * ═══════════════════════════════════════════════════════════════ */
const CONCERN_COLOR = "#C4571A";
const CONCERN_SUBTLE = "rgba(196,87,26,0.08)";
const CONCERN_BORDER = "rgba(196,87,26,0.18)";

const APPRECIATION_COLOR = "#1B7F5A";
const APPRECIATION_SUBTLE = "rgba(27,127,90,0.08)";
const APPRECIATION_BORDER = "rgba(27,127,90,0.18)";

/* Dr. Soliman Fakeeh Hospital's own occurrence-reporting form */
const FAKEEH_OVR_URL = "https://e-ovr.fakeeh.care:173/cmsregisterarabic";

type FeedbackPath = "hub" | "survey" | "concern" | "appreciation";

export function SurveyModal({ onClose, initialPath = "hub" }: SurveyModalProps) {
  // A survey on screen is a survey being answered; do not replace it underneath.
  useReloadHold(true, "survey", "survey open");
  const { theme } = useTheme();
  const { t, isRTL, fontFamily } = useLocale();
  const { portrait, compact, width: canvasW, height: canvasH } = useCanvasSize();

  const BRAND = theme.primary;
  const BRAND_DARK = theme.primaryDark;
  const isFakeeh = theme.id === "dsfh";
  /* Burjeel's printed QR posters: Google Maps review + their own patient form */
  const isBurjeel = theme.id === "burjeel";

  // Hub state
  const [path, setPath] = useState<FeedbackPath>(initialPath);
  const [qrPoster, setQrPoster] = useState<string | null>(null);
  /* The poster is sized to fit the white panel; null until both the panel
     box and the image's own size are known (a spinner shows meanwhile). */
  const [posterBox, setPosterBox] = useState<{ w: number; h: number } | null>(null);
  const [posterNatural, setPosterNatural] = useState<{ w: number; h: number } | null>(null);
  const posterAreaRef = useRef<HTMLDivElement | null>(null);
  const openPoster = (src: string) => { setPosterNatural(null); setQrPoster(src); };
  useEffect(() => {
    const el = posterAreaRef.current;
    if (!qrPoster || !el) return;
    const measure = () => setPosterBox({ w: el.clientWidth - 48, h: el.clientHeight - 48 });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [qrPoster]);
  const posterFit = posterBox && posterNatural
    ? Math.min(posterBox.w / posterNatural.w, posterBox.h / posterNatural.h)
    : 0;
  const posterLoaded = posterFit > 0;

  // Survey state
  const [currentSlide, setCurrentSlide] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string | number>>({});
  const [feedbackText, setFeedbackText] = useState("");

  // Concern state
  const [concernArea, setConcernArea] = useState<string | null>(null);
  const [concernText, setConcernText] = useState("");
  const [concernSubmitted, setConcernSubmitted] = useState(false);

  // Appreciation state
  const [appreciationTarget, setAppreciationTarget] = useState<string | null>(null);
  const [appreciationText, setAppreciationText] = useState("");
  const [appreciationSubmitted, setAppreciationSubmitted] = useState(false);

  /* ─── Survey Navigation ─── */
  const totalSlides = 9; // 7 questions + feedback + thank you (no intro, survey starts directly)

  const handleNext = () => {
    if (currentSlide < totalSlides) setCurrentSlide(currentSlide + 1);
  };

  const handlePrevious = () => {
    if (currentSlide > 0) setCurrentSlide(currentSlide - 1);
  };

  const handleAnswer = (questionId: number, answer: string | number) => {
    setAnswers({ ...answers, [questionId]: answer });
  };

  const handleSurveySubmit = () => {
    console.log("Survey submitted:", { answers, feedbackText });
    handleNext();
  };

  /* ─── Concern Submit ─── */
  const handleConcernSubmit = () => {
    console.log("Concern submitted:", { area: concernArea, text: concernText });
    setConcernSubmitted(true);
  };

  /* ─── Appreciation Submit ─── */
  const handleAppreciationSubmit = () => {
    console.log("Appreciation submitted:", { target: appreciationTarget, text: appreciationText });
    setAppreciationSubmitted(true);
  };

  const resetAppreciation = () => {
    setAppreciationTarget(null);
    setAppreciationText("");
    setAppreciationSubmitted(false);
  };

  /* ═══════════════════════════════════════════════════════════════
   * RENDER: HUB SCREEN (cards side-by-side)
   * ═══════════════════════════════════════════════════════════════ */
  /* One card size for every hospital: 416 wide, 24 apart. Two cards and the
     gap (856) are exactly the portrait panel's inner width, so portrait
     stacks them in that same 856 column. */
  const HUB_CARD_W = 416;
  const hubCards = isBurjeel || isFakeeh ? 2 : 3;
  const hubPerRow = Math.min(hubCards, 3);
  const hubRowMax = portrait ? 2 * HUB_CARD_W + 24 : hubPerRow * HUB_CARD_W + (hubPerRow - 1) * 24;

  const renderHubScreen = () => (
    <div className="sm-hub sm-pad flex flex-col items-center justify-center h-full px-16 text-center">
      <div className="sm-hub-row flex items-center justify-center gap-6 w-full" style={{ maxWidth: hubRowMax }}>
        {/* Burjeel collects feedback through its own QR posters only */}
        {!isBurjeel && (
        <>
        {/* Quick Survey Card */}
        <button
          onClick={() => setPath("survey")}
          className="sm-card flex-1 flex flex-col items-center cursor-pointer"
          style={{
            padding: "56px 32px",
            borderRadius: theme.radiusCard,
            backgroundColor: theme.surface,
            border: `1.5px solid ${theme.borderCardColor}`,
            boxShadow: SHADOW.sm,
            outline: "none",
          }}
        >
          <div
            className="sm-iconbox flex items-center justify-center mb-6"
            style={{ width: 112, height: 112, borderRadius: theme.radiusFull, backgroundColor: theme.primarySubtle }}
          >
            <FileText size={56} style={{ color: BRAND }} />
          </div>
          <span style={{ fontFamily, fontSize: TYPE_SCALE.xl, fontWeight: WEIGHT.bold, color: theme.textHeading, marginBottom: "8px" }}>
            {t("feedback.quickSurvey")}
          </span>
          <span style={{ fontFamily, fontSize: TYPE_SCALE.md, fontWeight: WEIGHT.medium, color: theme.textMuted }}>
            {isRTL ? "عن إقامتك · دقيقتان" : "About your stay · 2 min"}
          </span>
        </button>

        {/* Fakeeh routes concerns + appreciation to the hospital's own OVR form */}
        {isFakeeh ? (
        <button
          onClick={() => window.open(FAKEEH_OVR_URL, "_blank", "noopener,noreferrer")}
          className="sm-card flex-1 flex flex-col items-center cursor-pointer"
          style={{
            padding: "56px 32px",
            borderRadius: theme.radiusCard,
            backgroundColor: theme.surface,
            border: `1.5px solid ${theme.borderCardColor}`,
            boxShadow: SHADOW.sm,
            outline: "none",
          }}
        >
          <div
            className="sm-iconbox flex items-center justify-center mb-6"
            style={{ width: 112, height: 112, borderRadius: theme.radiusFull, backgroundColor: theme.accentSubtle }}
          >
            <MessageSquareWarning size={56} style={{ color: theme.accentOn }} />
          </div>
          <span style={{ fontFamily, fontSize: TYPE_SCALE.xl, fontWeight: WEIGHT.bold, color: theme.textHeading, marginBottom: "8px" }}>
            {t("feedback.suggestionsComplaints")}
          </span>
          <span style={{ fontFamily, fontSize: TYPE_SCALE.md, fontWeight: WEIGHT.medium, color: theme.textMuted }}>
            {t("feedback.suggestionsComplaintsDesc")}
          </span>
        </button>
        ) : (
        <>
        {/* Raise a Concern Card */}
        <button
          onClick={() => setPath("concern")}
          className="sm-card flex-1 flex flex-col items-center cursor-pointer"
          style={{
            padding: "56px 32px",
            borderRadius: theme.radiusCard,
            backgroundColor: theme.surface,
            border: `1.5px solid ${theme.borderCardColor}`,
            boxShadow: SHADOW.sm,
            outline: "none",
          }}
        >
          <div
            className="sm-iconbox flex items-center justify-center mb-6"
            style={{ width: 112, height: 112, borderRadius: theme.radiusFull, backgroundColor: CONCERN_SUBTLE }}
          >
            <AlertTriangle size={56} style={{ color: CONCERN_COLOR }} />
          </div>
          <span style={{ fontFamily, fontSize: TYPE_SCALE.xl, fontWeight: WEIGHT.bold, color: theme.textHeading, marginBottom: "8px" }}>
            {t("feedback.raiseConcern")}
          </span>
          <span style={{ fontFamily, fontSize: TYPE_SCALE.md, fontWeight: WEIGHT.medium, color: theme.textMuted }}>
            {isRTL ? "بلغ عن مشكلة · دقيقة واحدة" : "Report an issue · 1 min"}
          </span>
        </button>

        {/* Send Appreciation Card */}
        <button
          onClick={() => setPath("appreciation")}
          className="sm-card flex-1 flex flex-col items-center cursor-pointer"
          style={{
            padding: "56px 32px",
            borderRadius: theme.radiusCard,
            backgroundColor: theme.surface,
            border: `1.5px solid ${theme.borderCardColor}`,
            boxShadow: SHADOW.sm,
            outline: "none",
          }}
        >
          <div
            className="sm-iconbox flex items-center justify-center mb-6"
            style={{ width: 112, height: 112, borderRadius: theme.radiusFull, backgroundColor: APPRECIATION_SUBTLE }}
          >
            <Heart size={56} style={{ color: APPRECIATION_COLOR }} />
          </div>
          <span style={{ fontFamily, fontSize: TYPE_SCALE.xl, fontWeight: WEIGHT.bold, color: theme.textHeading, marginBottom: "8px" }}>
            {t("feedback.sendAppreciation")}
          </span>
          <span style={{ fontFamily, fontSize: TYPE_SCALE.md, fontWeight: WEIGHT.medium, color: theme.textMuted }}>
            {isRTL ? "اشكر فريقنا · ٣٠ ثانية" : "Thank our team · 30 sec"}
          </span>
        </button>
        </>
        )}
        </>
        )}

        {isBurjeel && (
        <>
        {/* Rate Us — Google Maps review QR poster */}
        <button
          onClick={() => openPoster(burjeelGoogleReviewQr)}
          className="sm-card flex-1 flex flex-col items-center cursor-pointer"
          style={{
            padding: "56px 32px",
            borderRadius: theme.radiusCard,
            backgroundColor: theme.surface,
            border: `1.5px solid ${theme.borderCardColor}`,
            boxShadow: SHADOW.sm,
            outline: "none",
          }}
        >
          <div
            className="sm-iconbox flex items-center justify-center mb-6"
            style={{ width: 112, height: 112, borderRadius: theme.radiusFull, backgroundColor: theme.primarySubtle }}
          >
            <Star size={56} style={{ color: BRAND }} />
          </div>
          <span style={{ fontFamily, fontSize: TYPE_SCALE.xl, fontWeight: WEIGHT.bold, color: theme.textHeading, marginBottom: "8px" }}>
            {t("feedback.rateUs")}
          </span>
          <span style={{ fontFamily, fontSize: TYPE_SCALE.md, fontWeight: WEIGHT.medium, color: theme.textMuted }}>
            {t("feedback.rateUsDesc")}
          </span>
        </button>

        {/* Patient Form — inpatient / day-care feedback QR poster */}
        <button
          onClick={() => openPoster(burjeelPatientFormQr)}
          className="sm-card flex-1 flex flex-col items-center cursor-pointer"
          style={{
            padding: "56px 32px",
            borderRadius: theme.radiusCard,
            backgroundColor: theme.surface,
            border: `1.5px solid ${theme.borderCardColor}`,
            boxShadow: SHADOW.sm,
            outline: "none",
          }}
        >
          <div
            className="sm-iconbox flex items-center justify-center mb-6"
            style={{ width: 112, height: 112, borderRadius: theme.radiusFull, backgroundColor: theme.primarySubtle }}
          >
            <ClipboardList size={56} style={{ color: BRAND }} />
          </div>
          <span style={{ fontFamily, fontSize: TYPE_SCALE.xl, fontWeight: WEIGHT.bold, color: theme.textHeading, marginBottom: "8px" }}>
            {t("feedback.patientForm")}
          </span>
          <span style={{ fontFamily, fontSize: TYPE_SCALE.md, fontWeight: WEIGHT.medium, color: theme.textMuted }}>
            {t("feedback.patientFormDesc")}
          </span>
        </button>
        </>
        )}
      </div>
    </div>
  );

  /* ═══════════════════════════════════════════════════════════════
   * RENDER: SURVEY PATH (questions)
   * ═══════════════════════════════════════════════════════════════ */
  const renderSurveyProgressBar = () => {
    const progress = ((currentSlide + 1) / totalSlides) * 100;
    return (
      <div
        className="absolute top-0 left-0 right-0 h-2"
        style={{ backgroundColor: theme.primarySubtle, zIndex: 20 }}
      >
        <div
          className="h-full transition-transform duration-500 ease-out"
          style={{ width: `${progress}%`, backgroundColor: BRAND }}
        />
      </div>
    );
  };

  const renderQuestionSlide = (questionIndex: number) => {
    const question = questions[questionIndex];
    const currentAnswer = answers[question.id];

    return (
      <div className="sm-pad flex flex-col items-center justify-center min-h-full px-16 py-10">
        {/* Question number badge */}
        <div
          className="sm-qbadge flex items-center justify-center rounded-full mb-6"
          style={{ width: "96px", height: "96px", backgroundColor: theme.primarySubtle }}
        >
          <span style={{ fontFamily, fontSize: "40px", fontWeight: WEIGHT.bold, color: BRAND }}>
            {question.id}
          </span>
        </div>

        {/* Question counter */}
        <p className="sm-qcount" style={{ fontFamily, fontSize: TYPE_SCALE.md, fontWeight: WEIGHT.medium, color: theme.textMuted, marginBottom: "40px" }}>
          {t("survey.questionOf", question.id, questions.length)}
        </p>

        {/* Question text */}
        <h3 className="sm-qtitle" style={{
          fontFamily,
          fontSize: TYPE_SCALE["2xl"],
          fontWeight: WEIGHT.bold,
          color: theme.textHeading,
          marginBottom: "64px",
          textAlign: "center",
          maxWidth: "1000px",
          lineHeight: LEADING.compact,
        }}>
          {t(question.questionKey)}
        </h3>

        {/* Options */}
        <div className="sm-options flex flex-wrap items-center justify-center gap-x-5 gap-y-7 max-w-[1100px]">
          {question.type === "emoji" ? (
            question.optionKeys.map((option, idx) => {
              const isSelected = currentAnswer === idx;
              return (
                <button
                  key={idx}
                  onClick={() => handleAnswer(question.id, idx)}
                  className="sm-emoji transition-transform duration-200"
                  style={{
                    width: "140px", height: "140px",
                    borderRadius: theme.radiusXl,
                    border: isSelected ? `3px solid ${BRAND}` : `2px solid ${theme.borderDefault}`,
                    backgroundColor: isSelected ? theme.primarySubtle : theme.surface,
                    fontSize: "64px",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    cursor: "pointer",
                    transform: isSelected ? "scale(1.05)" : "scale(1)",
                  }}
                >
                  {option}
                </button>
              );
            })
          ) : (
            /* One wrapping run for every option: a row takes as many as
               fit and the rest share the next one, centred. */
            question.optionKeys.map((option, idx) => {
              const isSelected = currentAnswer === option;
              return (
                <button
                  key={idx}
                  onClick={() => handleAnswer(question.id, option)}
                  className="sm-opt transition-transform duration-200"
                  style={{
                    minWidth: "220px", padding: "20px 32px",
                    borderRadius: theme.radiusXl,
                    border: isSelected ? `3px solid ${BRAND}` : `2px solid ${theme.borderDefault}`,
                    backgroundColor: isSelected ? theme.primarySubtle : theme.surface,
                    fontFamily, fontSize: TYPE_SCALE.lg, fontWeight: WEIGHT.semibold,
                    color: isSelected ? BRAND : theme.textBody,
                    cursor: "pointer",
                    transform: isSelected ? "scale(1.03)" : "scale(1)",
                  }}
                >
                  {t(option)}
                </button>
              );
            })
          )}
        </div>
      </div>
    );
  };

  const renderSurveyFeedbackSlide = () => (
    <div className="sm-pad flex flex-col items-center justify-center min-h-full px-16 py-10">
      <h3 style={{ fontFamily, fontSize: TYPE_SCALE.lg, fontWeight: WEIGHT.bold, color: theme.textHeading, marginBottom: "16px", textAlign: "center" }}>
        {t("survey.additionalFeedback")}
      </h3>
      <p style={{ fontFamily, fontSize: TYPE_SCALE.base, fontWeight: WEIGHT.normal, color: theme.textMuted, marginBottom: "48px" }}>
        (Optional)
      </p>

      <div className="relative" style={{ width: "100%", maxWidth: "800px" }}>
        <textarea
          value={feedbackText}
          onChange={(e) => { if (e.target.value.length <= 500) setFeedbackText(e.target.value); }}
          placeholder={t("survey.feedbackPlaceholder")}
          style={{
            width: "100%", height: "220px", padding: "24px", paddingBottom: DICTATE_PAD,
            borderRadius: theme.radiusXl, border: `2px solid ${theme.borderDefault}`,
            fontFamily, fontSize: TYPE_SCALE.base, color: theme.textHeading,
            resize: "none", outline: "none",
            direction: isRTL ? "rtl" : "ltr", textAlign: isRTL ? "right" : "left",
          }}
          onFocus={(e) => { e.target.style.borderColor = BRAND; }}
          onBlur={(e) => { e.target.style.borderColor = theme.borderDefault; }}
        />
        <DictateButton color={BRAND} value={feedbackText} onChange={setFeedbackText} maxLength={500} />
      </div>
      <p style={{ fontFamily, fontSize: TYPE_SCALE.sm, fontWeight: WEIGHT.normal, color: theme.textMuted, marginTop: "16px", maxWidth: "800px", width: "100%", textAlign: isRTL ? "right" : "left" }}>
        {feedbackText.length} / 500 characters
      </p>
    </div>
  );

  const renderSurveyThankYou = () => (
    <div className="sm-pad flex flex-col items-center justify-center min-h-full px-16 py-10 text-center"
      style={{ backgroundColor: theme.primarySubtle }}>
      {/* Check icon */}
      <div className="flex items-center justify-center mb-8"
        style={{ width: 72, height: 72, borderRadius: "50%", backgroundColor: "rgba(255,255,255,0.4)", border: `2px solid ${BRAND}30` }}>
        <CheckCircle2 size={36} style={{ color: BRAND }} />
      </div>
      <h2 style={{ fontFamily, fontSize: TYPE_SCALE["2xl"], fontWeight: WEIGHT.bold, color: theme.textHeading, marginBottom: "16px", lineHeight: LEADING.tight }}>
        {t("survey.thankYou")}
      </h2>
      <p style={{ fontFamily, ...TEXT_STYLE.body, fontSize: TYPE_SCALE.md, color: theme.textMuted, lineHeight: LEADING.relaxed, maxWidth: "500px", marginBottom: "40px" }}>
        {t("survey.thankYouDesc")}
      </p>
      {/* Close button */}
      <button onClick={onClose} className="transition-transform duration-200 active:scale-[0.96] cursor-pointer"
        style={{ padding: "14px 48px", borderRadius: theme.radiusMd, backgroundColor: BRAND, border: "none", boxShadow: `0 4px 16px ${BRAND}40` }}>
        <span style={{ fontFamily, fontSize: TYPE_SCALE.md, fontWeight: WEIGHT.bold, color: "#fff" }}>{t("survey.close")}</span>
      </button>
    </div>
  );

  const renderSurveyPath = () => (
    <div className="sm-path flex-1 flex flex-col overflow-hidden relative">
      {renderSurveyProgressBar()}

      {/* Main content */}
      <div className="sm-scroll flex-1 overflow-y-auto" style={{ paddingTop: "2px" }}>
        {currentSlide >= 0 && currentSlide <= 6 && renderQuestionSlide(currentSlide)}
        {currentSlide === 7 && renderSurveyFeedbackSlide()}
        {currentSlide === 8 && renderSurveyThankYou()}
      </div>

      {/* Survey footer nav */}
      {currentSlide < 8 && (
        <div
          className="sm-footer flex items-center justify-between px-10 py-5"
          style={{ borderColor: theme.borderDefault, zIndex: 20, direction: "ltr" }}
        >
          {/* LTR left = Previous / RTL left = Next */}
          {isRTL ? (
            currentSlide === 7 ? (
              <button onClick={handleSurveySubmit} className="flex items-center gap-2 transition-transform duration-200"
                style={{ fontFamily, fontSize: "18px", fontWeight: WEIGHT.semibold, color: theme.textInverse, cursor: "pointer", height: "52px", padding: "0 28px", borderRadius: "14px", backgroundColor: BRAND, border: `1px solid rgba(255,255,255,0.35)` }}>
                <ChevronLeft size={22} />
                {t("survey.submit")}
              </button>
            ) : (
              <button onClick={handleNext} className="flex items-center gap-2 transition-transform duration-200"
                style={{ fontFamily, fontSize: "18px", fontWeight: WEIGHT.semibold, color: theme.textInverse, cursor: "pointer", height: "52px", padding: "0 28px", borderRadius: "14px", backgroundColor: BRAND, border: `1px solid rgba(255,255,255,0.35)` }}>
                <ChevronLeft size={22} />
                {t("survey.next")}
              </button>
            )
          ) : (
            <button
              onClick={currentSlide === 0 ? () => setPath("hub") : handlePrevious}
              className="flex items-center gap-2 transition-transform duration-200"
              style={{
                fontFamily, fontSize: "18px", fontWeight: WEIGHT.semibold,
                color: BRAND, cursor: "pointer",
                height: "52px", padding: "0 24px", borderRadius: "14px",
                backgroundColor: "#fff", border: `1.5px solid ${theme.borderCardColor}`,
              }}
            >
              <ChevronLeft size={22} />
              {currentSlide === 0 ? t("feedback.back") : t("survey.previous")}
            </button>
          )}

          {/* Progress dots */}
          <div className="flex items-center justify-center gap-2">
            {Array.from({ length: totalSlides - 2 }).map((_, i) => (
              <div
                key={i}
                className="rounded-full transition-transform duration-300"
                style={{
                  width: i === currentSlide ? "28px" : "8px",
                  height: "8px",
                  backgroundColor: i === currentSlide ? BRAND : theme.borderDefault,
                }}
              />
            ))}
          </div>

          {/* LTR right = Next / RTL right = Previous */}
          {isRTL ? (
            <button
              onClick={currentSlide === 0 ? () => setPath("hub") : handlePrevious}
              className="flex items-center gap-2 transition-transform duration-200"
              style={{
                fontFamily, fontSize: "18px", fontWeight: WEIGHT.semibold,
                color: BRAND, cursor: "pointer",
                height: "52px", padding: "0 24px", borderRadius: "14px",
                backgroundColor: "#fff", border: `1.5px solid ${theme.borderCardColor}`,
              }}
            >
              {currentSlide === 0 ? t("feedback.back") : t("survey.previous")}
              <ChevronRight size={22} />
            </button>
          ) : currentSlide === 7 ? (
            <button onClick={handleSurveySubmit} className="flex items-center gap-2 transition-transform duration-200"
              style={{ fontFamily, fontSize: "18px", fontWeight: WEIGHT.semibold, color: theme.textInverse, cursor: "pointer", height: "52px", padding: "0 28px", borderRadius: "14px", backgroundColor: BRAND, border: `1px solid rgba(255,255,255,0.35)` }}>
              {t("survey.submit")}
              <ChevronRight size={22} />
            </button>
          ) : (
            <button onClick={handleNext} className="flex items-center gap-2 transition-transform duration-200"
              style={{ fontFamily, fontSize: "18px", fontWeight: WEIGHT.semibold, color: theme.textInverse, cursor: "pointer", height: "52px", padding: "0 28px", borderRadius: "14px", backgroundColor: BRAND, border: `1px solid rgba(255,255,255,0.35)` }}>
              {t("survey.next")}
              <ChevronRight size={22} />
            </button>
          )}
        </div>
      )}
    </div>
  );

  /* ═══════════════════════════════════════════════════════════════
   * RENDER: CONCERN PATH
   * ═══════════════════════════════════════════════════════════════ */
  const renderConcernPath = () => {
    if (concernSubmitted) {
      const refNumber = `CR-${Math.floor(10000 + Math.random() * 90000)}`;
      return (
        <div className="sm-pad flex-1 flex flex-col items-center justify-center px-16 text-center"
          style={{ backgroundColor: "rgba(196,87,26,0.03)" }}>
          {/* Check icon */}
          <div className="flex items-center justify-center mb-8"
            style={{ width: 72, height: 72, borderRadius: "50%", backgroundColor: CONCERN_SUBTLE, border: `2px solid ${CONCERN_BORDER}` }}>
            <CheckCircle2 size={36} style={{ color: CONCERN_COLOR }} />
          </div>
          <h2 style={{ fontFamily, fontSize: TYPE_SCALE["2xl"], fontWeight: WEIGHT.bold, color: theme.textHeading, marginBottom: "16px" }}>
            {t("concern.received")}
          </h2>
          <p style={{ fontFamily, fontSize: TYPE_SCALE.md, color: theme.textMuted, maxWidth: "500px", lineHeight: LEADING.relaxed, marginBottom: "32px" }}>
            {t("concern.receivedDesc")}
          </p>
          {/* Reference number */}
          <div className="flex items-center gap-4 px-6 py-3 mb-10"
            style={{ borderRadius: theme.radiusLg, border: `1.5px solid ${CONCERN_BORDER}`, backgroundColor: theme.surface }}>
            <span style={{ fontFamily, fontSize: TYPE_SCALE.sm, fontWeight: WEIGHT.medium, color: theme.textMuted }}>{t("concern.refNumber")}</span>
            <span style={{ fontFamily, fontSize: TYPE_SCALE.lg, fontWeight: WEIGHT.bold, color: theme.textHeading }}>#{refNumber}</span>
          </div>
          {/* Close button */}
          <button onClick={onClose} className="transition-transform duration-200 active:scale-[0.96] cursor-pointer"
            style={{ padding: "14px 48px", borderRadius: theme.radiusMd, backgroundColor: CONCERN_COLOR, border: "none", boxShadow: `0 4px 16px ${CONCERN_SUBTLE}` }}>
            <span style={{ fontFamily, fontSize: TYPE_SCALE.md, fontWeight: WEIGHT.bold, color: "#fff" }}>{t("survey.close")}</span>
          </button>
        </div>
      );
    }

    return (
      <div className="sm-path flex-1 flex flex-col overflow-hidden relative">
        <div className="sm-path flex-1 flex flex-col overflow-hidden items-center justify-center">
          <div className="sm-form w-full max-w-[800px] flex flex-col max-h-full min-h-0">
            {/* Header */}
            <div className="sm-form-head shrink-0 flex items-center gap-4 px-0 pt-10 pb-4">
              <div className="flex items-center justify-center"
                style={{ width: 44, height: 44, borderRadius: theme.radiusLg, backgroundColor: CONCERN_SUBTLE }}>
                <AlertTriangle size={22} style={{ color: CONCERN_COLOR }} />
              </div>
              <div className="flex flex-col">
                <span style={{ fontFamily, fontSize: TYPE_SCALE.lg, fontWeight: WEIGHT.bold, color: theme.textHeading }}>
                  {t("concern.title")}
                </span>
                <span style={{ fontFamily, fontSize: TYPE_SCALE.sm, color: theme.textMuted }}>
                  {t("concern.subtitle")}
                </span>
              </div>
            </div>

            {/* Content */}
            <div className="sm-scroll min-h-0 overflow-y-auto px-0 pb-10 scrollbar-width-none">
              {/* Area question */}
              <h3 style={{ fontFamily, fontSize: TYPE_SCALE.lg, fontWeight: WEIGHT.bold, color: theme.textHeading, marginBottom: "20px", marginTop: "24px" }}>
                {t("concern.areaQuestion")}
              </h3>
              <div className="flex flex-wrap gap-3 mb-10">
                {concernAreas.map((area) => {
                  const isSelected = concernArea === area;
                  return (
                    <button
                      key={area}
                      onClick={() => setConcernArea(area)}
                      className="transition-transform duration-200 active:scale-[0.96] cursor-pointer"
                      style={{
                        padding: "12px 24px",
                        borderRadius: theme.radiusLg,
                        border: isSelected ? `2px solid ${CONCERN_COLOR}` : `1.5px solid ${theme.borderDefault}`,
                        backgroundColor: isSelected ? CONCERN_SUBTLE : theme.surface,
                        fontFamily,
                        fontSize: TYPE_SCALE.base,
                        fontWeight: isSelected ? WEIGHT.bold : WEIGHT.medium,
                        color: isSelected ? CONCERN_COLOR : theme.textBody,
                      }}
                    >
                      {t(area)}
                    </button>
                  );
                })}
              </div>

              {/* Tell us */}
              <h3 style={{ fontFamily, fontSize: TYPE_SCALE.lg, fontWeight: WEIGHT.bold, color: theme.textHeading, marginBottom: "16px" }}>
                {t("concern.tellUs")}
              </h3>
              <div className="relative">
                <textarea
                  value={concernText}
                  onChange={(e) => setConcernText(e.target.value)}
                  placeholder={t("concern.placeholder")}
                  style={{
                    width: "100%", height: "180px", padding: "20px", paddingBottom: DICTATE_PAD,
                    borderRadius: theme.radiusLg,
                    border: `1.5px solid ${theme.borderCardColor}`,
                    fontFamily, fontSize: TYPE_SCALE.base, color: theme.textHeading,
                    resize: "none", outline: "none",
                    direction: isRTL ? "rtl" : "ltr", textAlign: isRTL ? "right" : "left",
                  }}
                  onFocus={(e) => { e.target.style.borderColor = CONCERN_COLOR; }}
                  onBlur={(e) => { e.target.style.borderColor = theme.borderDefault; }}
                />
                <DictateButton color={CONCERN_COLOR} value={concernText} onChange={setConcernText} />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sm-footer shrink-0 flex items-center justify-between px-10 py-5" style={{ borderColor: theme.borderDefault, direction: "ltr" }}>
          {isRTL ? (
            <>
              <button
                onClick={handleConcernSubmit}
                disabled={!concernArea || !concernText.trim()}
                className="flex items-center gap-2 transition-transform duration-200 active:scale-[0.96] cursor-pointer"
                style={{
                  fontFamily, fontSize: "18px", fontWeight: WEIGHT.semibold, color: "#fff",
                  height: "52px", padding: "0 28px", borderRadius: "14px",
                  backgroundColor: (!concernArea || !concernText.trim()) ? theme.textDisabled : CONCERN_COLOR,
                  border: `1px solid rgba(255,255,255,0.35)`, opacity: (!concernArea || !concernText.trim()) ? 0.5 : 1,
                  boxShadow: `0 4px 16px ${CONCERN_SUBTLE}`,
                }}
              >
                <ChevronLeft size={22} />
                {t("survey.submit")}
              </button>
              <button onClick={() => setPath("hub")} className="flex items-center gap-2 cursor-pointer transition-transform duration-200"
                style={{ background: "none", border: `1.5px solid ${theme.borderCardColor}`, height: "52px", padding: "0 24px", borderRadius: "14px", backgroundColor: "#fff", fontFamily, fontSize: "18px", fontWeight: WEIGHT.semibold, color: theme.textMuted }}>
                {t("feedback.back")}
                <ChevronRight size={22} />
              </button>
            </>
          ) : (
            <>
              <button onClick={() => setPath("hub")} className="flex items-center gap-2 cursor-pointer transition-transform duration-200"
                style={{ background: "none", border: `1.5px solid ${theme.borderCardColor}`, height: "52px", padding: "0 24px", borderRadius: "14px", backgroundColor: "#fff", fontFamily, fontSize: "18px", fontWeight: WEIGHT.semibold, color: theme.textMuted }}>
                <ChevronLeft size={22} />
                {t("feedback.back")}
              </button>
              <button
                onClick={handleConcernSubmit}
                disabled={!concernArea || !concernText.trim()}
                className="flex items-center gap-2 transition-transform duration-200 active:scale-[0.96] cursor-pointer"
                style={{
                  fontFamily, fontSize: "18px", fontWeight: WEIGHT.semibold, color: "#fff",
                  height: "52px", padding: "0 28px", borderRadius: "14px",
                  backgroundColor: (!concernArea || !concernText.trim()) ? theme.textDisabled : CONCERN_COLOR,
                  border: `1px solid rgba(255,255,255,0.35)`, opacity: (!concernArea || !concernText.trim()) ? 0.5 : 1,
                  boxShadow: `0 4px 16px ${CONCERN_SUBTLE}`,
                }}
              >
                {t("survey.submit")}
                <ChevronRight size={22} />
              </button>
            </>
          )}
        </div>
      </div>
    );
  };

  /* ═══════════════════════════════════════════════════════════════
   * RENDER: APPRECIATION PATH
   * ═══════════════════════════════════════════════════════════════ */
  const renderAppreciationPath = () => {
    if (appreciationSubmitted) {
      return (
        <div className="sm-pad flex-1 flex flex-col items-center justify-center px-16 text-center"
          style={{ backgroundColor: APPRECIATION_SUBTLE }}>
          {/* Heart icon */}
          <div className="flex items-center justify-center mb-8"
            style={{ width: 72, height: 72, borderRadius: "50%", backgroundColor: "rgba(27,127,90,0.12)", border: `2px solid ${APPRECIATION_BORDER}` }}>
            <Heart size={36} style={{ color: APPRECIATION_COLOR }} />
          </div>
          <h2 style={{ fontFamily, fontSize: TYPE_SCALE["2xl"], fontWeight: WEIGHT.bold, color: theme.textHeading, marginBottom: "16px" }}>
            {t("appreciation.delivered")}
          </h2>
          <p style={{ fontFamily, fontSize: TYPE_SCALE.md, color: theme.textMuted, maxWidth: "500px", lineHeight: LEADING.relaxed, marginBottom: "40px" }}>
            {t("appreciation.deliveredDesc")}
          </p>
          {/* Action buttons */}
          <div className="flex items-center gap-4">
            <button onClick={() => { resetAppreciation(); }} className="transition-transform duration-200 active:scale-[0.96] cursor-pointer"
              style={{ padding: "14px 32px", borderRadius: theme.radiusMd, backgroundColor: theme.surface, border: `1.5px solid ${APPRECIATION_BORDER}` }}>
              <span style={{ fontFamily, fontSize: TYPE_SCALE.md, fontWeight: WEIGHT.bold, color: APPRECIATION_COLOR }}>{t("appreciation.sendAnother")}</span>
            </button>
            <button onClick={onClose} className="transition-transform duration-200 active:scale-[0.96] cursor-pointer"
              style={{ padding: "14px 40px", borderRadius: theme.radiusMd, backgroundColor: APPRECIATION_COLOR, border: "none", boxShadow: `0 4px 16px ${APPRECIATION_SUBTLE}` }}>
              <span style={{ fontFamily, fontSize: TYPE_SCALE.md, fontWeight: WEIGHT.bold, color: "#fff" }}>{t("survey.close")}</span>
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="sm-path flex-1 flex flex-col overflow-hidden relative">
        <div className="sm-path flex-1 flex flex-col overflow-hidden items-center justify-center">
          <div className="sm-form w-full max-w-[800px] flex flex-col max-h-full min-h-0">
            {/* Header */}
            <div className="sm-form-head shrink-0 flex items-center gap-4 px-0 pt-10 pb-4">
              <div className="flex items-center justify-center"
                style={{ width: 44, height: 44, borderRadius: theme.radiusLg, backgroundColor: APPRECIATION_SUBTLE }}>
                <Heart size={22} style={{ color: APPRECIATION_COLOR }} />
              </div>
              <div className="flex flex-col">
                <span style={{ fontFamily, fontSize: TYPE_SCALE.lg, fontWeight: WEIGHT.bold, color: theme.textHeading }}>
                  {t("appreciation.title")}
                </span>
                <span style={{ fontFamily, fontSize: TYPE_SCALE.sm, color: theme.textMuted }}>
                  {t("appreciation.subtitle")}
                </span>
              </div>
            </div>

            {/* Content */}
            <div className="sm-scroll min-h-0 overflow-y-auto px-0 pb-10 scrollbar-width-none">
              {/* Who to thank */}
              <h3 style={{ fontFamily, fontSize: TYPE_SCALE.lg, fontWeight: WEIGHT.bold, color: theme.textHeading, marginBottom: "20px", marginTop: "24px" }}>
                {t("appreciation.whoQuestion")}
              </h3>
              <div className="flex flex-wrap gap-3 mb-10">
                {appreciationTargets.map((target) => {
                  const isSelected = appreciationTarget === target;
                  return (
                    <button
                      key={target}
                      onClick={() => setAppreciationTarget(target)}
                      className="transition-transform duration-200 active:scale-[0.96] cursor-pointer"
                      style={{
                        padding: "12px 24px",
                        borderRadius: theme.radiusLg,
                        border: isSelected ? `2px solid ${APPRECIATION_COLOR}` : `1.5px solid ${theme.borderDefault}`,
                        backgroundColor: isSelected ? APPRECIATION_SUBTLE : theme.surface,
                        fontFamily,
                        fontSize: TYPE_SCALE.base,
                        fontWeight: isSelected ? WEIGHT.bold : WEIGHT.medium,
                        color: isSelected ? APPRECIATION_COLOR : theme.textBody,
                      }}
                    >
                      {t(target)}
                    </button>
                  );
                })}
              </div>

              {/* Message */}
              <h3 style={{ fontFamily, fontSize: TYPE_SCALE.lg, fontWeight: WEIGHT.bold, color: theme.textHeading, marginBottom: "16px" }}>
                {t("appreciation.yourMessage")}
              </h3>
              <div className="relative">
                <textarea
                  value={appreciationText}
                  onChange={(e) => setAppreciationText(e.target.value)}
                  placeholder={t("appreciation.placeholder")}
                  style={{
                    width: "100%", height: "180px", padding: "20px", paddingBottom: DICTATE_PAD,
                    borderRadius: theme.radiusLg,
                    border: `1.5px solid ${theme.borderCardColor}`,
                    fontFamily, fontSize: TYPE_SCALE.base, color: theme.textHeading,
                    resize: "none", outline: "none",
                    direction: isRTL ? "rtl" : "ltr", textAlign: isRTL ? "right" : "left",
                  }}
                  onFocus={(e) => { e.target.style.borderColor = APPRECIATION_COLOR; }}
                  onBlur={(e) => { e.target.style.borderColor = theme.borderDefault; }}
                />
                <DictateButton color={APPRECIATION_COLOR} value={appreciationText} onChange={setAppreciationText} />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sm-footer shrink-0 flex items-center justify-between px-10 py-5" style={{ borderColor: theme.borderDefault, direction: "ltr" }}>
          {isRTL ? (
            <>
              <button
                onClick={handleAppreciationSubmit}
                disabled={!appreciationTarget || !appreciationText.trim()}
                className="flex items-center gap-2 transition-transform duration-200 active:scale-[0.96] cursor-pointer"
                style={{
                  fontFamily, fontSize: "18px", fontWeight: WEIGHT.semibold, color: "#fff",
                  height: "52px", padding: "0 28px", borderRadius: "14px",
                  backgroundColor: (!appreciationTarget || !appreciationText.trim()) ? theme.textDisabled : APPRECIATION_COLOR,
                  border: `1px solid rgba(255,255,255,0.35)`, opacity: (!appreciationTarget || !appreciationText.trim()) ? 0.5 : 1,
                  boxShadow: `0 4px 16px ${APPRECIATION_SUBTLE}`,
                }}
              >
                <ChevronLeft size={22} />
                {t("appreciation.send")}
              </button>
              <button onClick={() => setPath("hub")} className="flex items-center gap-2 cursor-pointer transition-transform duration-200"
                style={{ background: "none", border: `1.5px solid ${theme.borderCardColor}`, height: "52px", padding: "0 24px", borderRadius: "14px", backgroundColor: "#fff", fontFamily, fontSize: "18px", fontWeight: WEIGHT.semibold, color: theme.textMuted }}>
                {t("feedback.back")}
                <ChevronRight size={22} />
              </button>
            </>
          ) : (
            <>
              <button onClick={() => setPath("hub")} className="flex items-center gap-2 cursor-pointer transition-transform duration-200"
                style={{ background: "none", border: `1.5px solid ${theme.borderCardColor}`, height: "52px", padding: "0 24px", borderRadius: "14px", backgroundColor: "#fff", fontFamily, fontSize: "18px", fontWeight: WEIGHT.semibold, color: theme.textMuted }}>
                <ChevronLeft size={22} />
                {t("feedback.back")}
              </button>
              <button
                onClick={handleAppreciationSubmit}
                disabled={!appreciationTarget || !appreciationText.trim()}
                className="flex items-center gap-2 transition-transform duration-200 active:scale-[0.96] cursor-pointer"
                style={{
                  fontFamily, fontSize: "18px", fontWeight: WEIGHT.semibold, color: "#fff",
                  height: "52px", padding: "0 28px", borderRadius: "14px",
                  backgroundColor: (!appreciationTarget || !appreciationText.trim()) ? theme.textDisabled : APPRECIATION_COLOR,
                  border: `1px solid rgba(255,255,255,0.35)`, opacity: (!appreciationTarget || !appreciationText.trim()) ? 0.5 : 1,
                  boxShadow: `0 4px 16px ${APPRECIATION_SUBTLE}`,
                }}
              >
                {t("appreciation.send")}
                <ChevronRight size={22} />
              </button>
            </>
          )}
        </div>
      </div>
    );
  };

  /* Small-screen rules. In landscape the 1920×1080 canvas is scaled to fit,
     so they stay on the browser's media queries exactly as before. In portrait
     the canvas is the screen itself and its own size decides; the shared
     header sizes itself there, so the header (.iph) rules stay landscape-only. */
  const smHeaderSmall = `
          .sm-root .iph { gap: 10px !important; padding: 14px 12px 10px !important; }
          .sm-root .iph-divider, .sm-root .iph-icon, .sm-root .iph-subtitle { display: none !important; }
          .sm-root .iph-title { font-size: 20px !important; line-height: 24px !important; }
          .sm-root .iph > button, .sm-root .iph-actions button { width: 40px !important; height: 40px !important; }
          .sm-root .iph-actions { gap: 6px !important; }`;
  const smContentSmall = `
          .sm-content { padding: 0 10px 10px !important; }`;
  const smBodySmall = `
          .sm-pad { padding: 20px 16px !important; }
          .sm-hub-row { flex-direction: column !important; gap: 12px !important; }
          .sm-root .sm-card { flex: 0 0 auto !important; width: 100% !important; padding: 20px 16px !important; }
          .sm-root .sm-iconbox { width: 56px !important; height: 56px !important; margin-bottom: 10px !important; }
          .sm-root .sm-iconbox svg { width: 28px; height: 28px; }
          .sm-qbadge { width: 60px !important; height: 60px !important; margin-bottom: 10px !important; }
          .sm-qbadge span { font-size: 26px !important; }
          .sm-qcount { font-size: 15px !important; margin-bottom: 14px !important; }
          .sm-qtitle { font-size: 22px !important; margin-bottom: 22px !important; }
          .sm-options { gap: 10px !important; width: 100%; }
          .sm-emoji { width: 60px !important; height: 60px !important; font-size: 32px !important; }
          .sm-opt { min-width: 0 !important; width: 100%; padding: 14px 18px !important; font-size: 17px !important; }
          .sm-form { padding: 0 16px; }
          .sm-form-head { padding-top: 18px !important; }
          .sm-footer { gap: 8px; padding: 10px 12px !important; }
          .sm-footer > div { display: none !important; }
          .sm-footer button { height: 46px !important; padding: 0 16px !important; font-size: 16px !important; }`;
  const smShortFlow = `
          .sm-root { overflow-y: auto !important; }
          .sm-content, .sm-shell, .sm-path, .sm-scroll, .sm-form { flex: none !important; height: auto !important; min-height: 0 !important; overflow: visible !important; }
          .sm-hub { height: auto !important; overflow: visible !important; }`;
  const smHeaderShort = `
          .sm-root .iph { gap: 10px !important; padding: 12px 16px 10px !important; }
          .sm-root .iph-divider, .sm-root .iph-icon, .sm-root .iph-subtitle { display: none !important; }
          .sm-root .iph-title { font-size: 20px !important; line-height: 24px !important; }
          .sm-root .iph > button, .sm-root .iph-actions button { width: 40px !important; height: 40px !important; }`;
  const smLandShort = `
          .sm-root .iph { padding-top: 16px !important; padding-bottom: 12px !important; }
          .sm-content { padding-bottom: 16px !important; }
          .sm-pad { padding-top: 20px !important; padding-bottom: 20px !important; }
          .sm-qbadge { width: 64px !important; height: 64px !important; margin-bottom: 10px !important; }
          .sm-qbadge span { font-size: 28px !important; }
          .sm-qcount { margin-bottom: 14px !important; }
          .sm-qtitle { font-size: 26px !important; margin-bottom: 24px !important; }
          .sm-emoji { width: 96px !important; height: 96px !important; font-size: 46px !important; }
          .sm-footer { padding-top: 12px !important; padding-bottom: 12px !important; }`;

  /* ═══════════════════════════════════════════════════════════════
   * MAIN RENDER
   * ═══════════════════════════════════════════════════════════════ */
  return (
    <div
      className="sm-root fixed inset-0 flex flex-col overflow-hidden"
      style={{
        background: theme.pageGradientFlat,
        zIndex: 1000,
        direction: isRTL ? "rtl" : "ltr",
        ["--sm-primary" as any]: theme.primary,
      }}
    >
      {/* Subtle hospital hero photo — consistent with other internal pages */}
      <ApiImage
        src={theme.heroImageUrl}
        alt=""
        aria-hidden
        className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none"
        style={{ opacity: 0.08, mixBlendMode: "luminosity", userSelect: "none" }}
      />

      <style>{`
        .sm-card { transition: border-color .2s ease, box-shadow .2s ease, transform .2s ease; }
        .sm-card:hover { border-color: var(--sm-primary); box-shadow: ${SHADOW.md}; transform: translateY(-4px); }
        .sm-card:active { transform: scale(0.985); }
        .sm-iconbox { transition: transform .2s ease; }
        .sm-card:hover .sm-iconbox { transform: scale(1.06); }

        /* Hub: centred while it fits, scrolls from the top when it doesn't */
        .sm-hub { justify-content: flex-start !important; overflow-y: auto; }
        .sm-hub-row { margin-top: auto; margin-bottom: auto; }

        /* ── Small screens (phones, tablets in portrait) ── */
        ${portrait
          ? `${canvasW <= 820 ? smBodySmall : `
          .sm-hub-row { flex-direction: column !important; }
          .sm-root .sm-card { flex: 0 0 auto !important; width: 100% !important; }`}
             ${compact ? `.sm-content { padding: 0 16px 16px !important; }
          .sm-options { gap: 8px !important; }
          .sm-emoji { width: 56px !important; height: 56px !important; font-size: 30px !important; }` : ""}
             ${canvasH <= 560 ? smShortFlow : `
          /* Portrait: the hub cards share the panel's height instead of
             floating in its middle — never shorter than what they say, never
             taller than 480. */
          .sm-hub-row { flex: 1 0 auto; margin: 0 !important; align-items: stretch !important; justify-content: center !important; }
          ${compact ? "" : ".sm-hub { padding-top: 48px !important; padding-bottom: 48px !important; }"}
          .sm-root .sm-card { flex: 1 1 0 !important; min-height: min-content; max-height: 480px; justify-content: center; }`}`
          : `@media (max-width: 820px) {${smHeaderSmall}${smContentSmall}${smBodySmall}
        }
        /* Very short windows: the white card no longer has to fit the screen.
           The whole page scrolls instead, so nothing is squeezed or clipped. */
        @media (max-height: 560px) {${smShortFlow}${smHeaderShort}
        }
        /* Short landscape screens: tighter vertical rhythm */
        @media (max-height: 700px) and (min-width: 821px) {${smLandShort}
        }`}
      `}</style>

      {/* ─── Header (white text on brand gradient) ─── */}
      <InternalPageHeader
        title={t("survey.intro")}
        subtitle={theme.hospitalName}
        icon={<MessageSquareHeart size={24} />}
        onClose={onClose}
      />

      {/* ─── Main content — large white rounded card ─── */}
      <div className="sm-content flex-1 min-h-0 px-12 pt-2 pb-8 relative z-10 flex flex-col">
        <div
          className="sm-shell relative flex-1 min-h-0 flex flex-col overflow-hidden"
          style={{
            backgroundColor: theme.surface,
            borderRadius: theme.radiusXl,
            boxShadow: SHADOW.xl,
            border: theme.cardBorder,
          }}
        >
          {path === "hub" && renderHubScreen()}
          {path === "survey" && renderSurveyPath()}
          {path === "concern" && renderConcernPath()}
          {path === "appreciation" && renderAppreciationPath()}

          {/* QR poster — held inside the white panel; tap outside or ✕ to dismiss */}
          {qrPoster && (
            <div
              ref={posterAreaRef}
              className="absolute inset-0 flex items-center justify-center"
              style={{ zIndex: 20, backgroundColor: theme.overlay, animation: "smPosterFade .15s ease-out" }}
              onClick={() => setQrPoster(null)}
            >
              {!posterLoaded && (
                <Loader2 className="animate-spin absolute" size={40} style={{ color: theme.primaryOn }} />
              )}
              <div
                className="relative shrink-0"
                style={{
                  width: posterNatural ? posterNatural.w * posterFit : 0,
                  height: posterNatural ? posterNatural.h * posterFit : 0,
                  opacity: posterLoaded ? 1 : 0, transition: "opacity .2s ease",
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <img
                  key={qrPoster}
                  src={qrPoster}
                  alt=""
                  onLoad={(e) => setPosterNatural({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
                  className="block select-none w-full h-full"
                  style={{ borderRadius: theme.radiusLg, boxShadow: SHADOW.xl }}
                  draggable={false}
                />
                {posterLoaded && (
                  <button
                    onClick={() => setQrPoster(null)}
                    aria-label={t("feedback.closePoster")}
                    className="absolute flex items-center justify-center cursor-pointer active:scale-90 transition-transform"
                    style={{
                      top: 16, insetInlineEnd: 16, width: 56, height: 56,
                      borderRadius: theme.radiusFull, backgroundColor: theme.surface,
                      border: `1.5px solid ${theme.borderCardColor}`, boxShadow: SHADOW.md, outline: "none",
                    }}
                  >
                    <X size={28} style={{ color: theme.textHeading }} />
                  </button>
                )}
              </div>
              <style>{`@keyframes smPosterFade { from { opacity: 0; } to { opacity: 1; } }`}</style>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}