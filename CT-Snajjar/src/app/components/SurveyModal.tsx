import { useTheme, TYPE_SCALE, WEIGHT, SHADOW, LEADING, TEXT_STYLE } from "./ThemeContext";
import { useLocale } from "./i18n";
import { useState } from "react";
import { ChevronLeft, ChevronRight, X, Frown, Smile, ClipboardList } from "lucide-react";
import introImage from "../../assets/c7c3a06662e8b608beebe5b13be2dd03c5fc435c.png";
import thankYouImage from "../../assets/23db5e568918c9a319b272caa7a9e865d4fbd418.png";

interface SurveyModalProps {
  onClose: () => void;
}

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

export function SurveyModal({ onClose }: SurveyModalProps) {
  const { theme } = useTheme();
  const { t, isRTL, fontFamily } = useLocale();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string | number>>({});
  const [feedbackText, setFeedbackText] = useState("");
  const [dynamicFeedbackText, setDynamicFeedbackText] = useState("");
  const [feedbackType, setFeedbackType] = useState<"complaint" | "praise" | "continue" | null>(null);
  const [introFeedbackText, setIntroFeedbackText] = useState("");

  const BRAND = theme.primary;
  const BRAND_DARK = theme.primaryDark;

  const totalSlides = 9; // intro + 7 questions + feedback + thank you

  const handleNext = () => {
    if (currentSlide < totalSlides) {
      setCurrentSlide(currentSlide + 1);
    }
  };

  const handlePrevious = () => {
    if (currentSlide === 10 || currentSlide === 11) {
      setCurrentSlide(0);
    } else if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1);
    }
  };

  const handleAnswer = (questionId: number, answer: string | number) => {
    setAnswers({ ...answers, [questionId]: answer });
  };

  const handleSubmit = () => {
    // Submit survey data
    console.log("Survey submitted:", { answers, feedbackText, dynamicFeedbackText, introFeedbackText, feedbackType });
    if (currentSlide === 10 || currentSlide === 11) {
      setCurrentSlide(1); // continue to survey
    } else {
      handleNext(); // Go to thank you slide
    }
  };

  const renderProgressBar = () => {
    const progress = ((currentSlide) / totalSlides) * 100;
    return (
      <div
        className="absolute top-0 left-0 right-0 h-2"
        style={{
          backgroundColor: theme.primarySubtle,
          zIndex: 20,
        }}
      >
        <div
          className="h-full transition-all duration-500 ease-out"
          style={{
            width: `${progress}%`,
            backgroundColor: BRAND,
          }}
        />
      </div>
    );
  };

  const renderIntroSlide = () => (
    <div className="flex flex-col items-center justify-center min-h-full px-16 text-center pb-12">
      <img
        src={introImage}
        alt="Share Your Experience"
        style={{ width: "400px", height: "auto", marginBottom: "64px" }}
      />
      <h2
        style={{
          fontFamily: fontFamily,
          fontSize: TYPE_SCALE["2xl"],
          fontWeight: WEIGHT.bold,
          color: theme.textHeading,
          marginBottom: "24px",
          lineHeight: LEADING.tight,
        }}
      >
        {t("survey.intro")}
      </h2>


      <div className="mt-12 flex flex-col items-center w-full max-w-3xl">

        <div className="flex flex-wrap items-center justify-center gap-4 mb-8">
          <button
            onClick={() => {
              setFeedbackType("complaint");
              setCurrentSlide(10);
            }}
            className="flex flex-col items-center gap-3"
            style={{
              padding: "16px 32px",
              borderRadius: theme.radiusMd,
              border: `2px solid ${feedbackType === "complaint" ? BRAND : theme.borderDefault}`,
              backgroundColor: feedbackType === "complaint" ? theme.primarySubtle : theme.surface,
              fontFamily: fontFamily,
              fontSize: TYPE_SCALE.base,
              fontWeight: WEIGHT.medium,
              color: feedbackType === "complaint" ? BRAND : theme.textBody,
              transition: "all 0.2s",
              minWidth: "160px"
            }}
          >
            <Frown size={40} style={{ color: "#ef4444" }} />
            <span>{t("survey.opt.complaint") || "Complaint"}</span>
          </button>
          <button
            onClick={() => {
              setFeedbackType("praise");
              setCurrentSlide(11);
            }}
            className="flex flex-col items-center gap-3"
            style={{
              padding: "16px 32px",
              borderRadius: theme.radiusMd,
              border: `2px solid ${feedbackType === "praise" ? BRAND : theme.borderDefault}`,
              backgroundColor: feedbackType === "praise" ? theme.primarySubtle : theme.surface,
              fontFamily: fontFamily,
              fontSize: TYPE_SCALE.base,
              fontWeight: WEIGHT.medium,
              color: feedbackType === "praise" ? BRAND : theme.textBody,
              transition: "all 0.2s",
              minWidth: "160px"
            }}
          >
            <Smile size={40} style={{ color: "#22c55e" }} />
            <span>{t("survey.opt.praise") || "Praise"}</span>
          </button>
          <button
            onClick={() => setFeedbackType("continue")}
            className="flex flex-col items-center gap-3"
            style={{
              padding: "16px 32px",
              borderRadius: theme.radiusMd,
              border: `2px solid ${feedbackType === "continue" ? BRAND : theme.borderDefault}`,
              backgroundColor: feedbackType === "continue" ? theme.primarySubtle : theme.surface,
              fontFamily: fontFamily,
              fontSize: TYPE_SCALE.base,
              fontWeight: WEIGHT.medium,
              color: feedbackType === "continue" ? BRAND : theme.textBody,
              transition: "all 0.2s",
              minWidth: "160px"
            }}
          >
            <ClipboardList size={40} style={{ color: BRAND }} />
            <span>{t("survey.opt.continueSurvey") || "Continue Survey"}</span>
          </button>
        </div>
        

      </div>
    </div>
  );

  const renderQuestionSlide = (questionIndex: number) => {
    const question = questions[questionIndex];
    const currentAnswer = answers[question.id];

    return (
      <div className="flex flex-col items-center justify-center h-full px-16">
        {/* Question number badge */}
        <div
          className="flex items-center justify-center rounded-full mb-6"
          style={{
            width: "96px",
            height: "96px",
            backgroundColor: theme.primarySubtle,
          }}
        >
          <span
            style={{
              fontFamily: fontFamily,
              fontSize: "40px",
              fontWeight: WEIGHT.bold,
              color: BRAND,
            }}
          >
            {question.id}
          </span>
        </div>

        {/* Question counter */}
        <p
          style={{
            fontFamily: fontFamily,
            fontSize: TYPE_SCALE.md,
            fontWeight: WEIGHT.medium,
            color: theme.textMuted,
            marginBottom: "40px",
          }}
        >
          {t("survey.questionOf", question.id, questions.length)}
        </p>

        {/* Question text */}
        <h3
          style={{
            fontFamily: fontFamily,
            fontSize: TYPE_SCALE["2xl"],
            fontWeight: WEIGHT.bold,
            color: theme.textHeading,
            marginBottom: "64px",
            textAlign: "center",
            maxWidth: "1000px",
            lineHeight: LEADING.compact,
          }}
        >
          {t(question.questionKey)}
        </h3>

        {/* Options */}
        <div className="flex flex-wrap items-center justify-center gap-5 max-w-[1100px]">
          {question.type === "emoji" ? (
            // Emoji options - 5 square buttons in a row
            question.optionKeys.map((option, idx) => {
              const isSelected = currentAnswer === idx;
              return (
                <button
                  key={idx}
                  onClick={() => handleAnswer(question.id, idx)}
                  className="transition-all duration-200"
                  style={{
                    width: "140px",
                    height: "140px",
                    borderRadius: theme.radiusXl,
                    border: isSelected ? `3px solid ${BRAND}` : `2px solid ${theme.borderDefault}`,
                    backgroundColor: isSelected ? theme.primarySubtle : theme.surface,
                    fontSize: "64px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    transform: isSelected ? "scale(1.05)" : "scale(1)",
                  }}
                >
                  {option}
                </button>
              );
            })
          ) : (
            // Regular text options - 4 on top row, 1 centered below
            <>
              <div className="flex flex-wrap items-center justify-center gap-5 w-full">
                {question.optionKeys.slice(0, 4).map((option, idx) => {
                  const isSelected = currentAnswer === option;
                  return (
                    <button
                      key={idx}
                      onClick={() => handleAnswer(question.id, option)}
                      className="transition-all duration-200"
                      style={{
                        minWidth: "220px",
                        padding: "20px 32px",
                        borderRadius: theme.radiusXl,
                        border: isSelected ? `3px solid ${BRAND}` : `2px solid ${theme.borderDefault}`,
                        backgroundColor: isSelected ? theme.primarySubtle : theme.surface,
                        fontFamily: fontFamily,
                        fontSize: TYPE_SCALE.lg,
                        fontWeight: WEIGHT.semibold,
                        color: isSelected ? BRAND : theme.textBody,
                        cursor: "pointer",
                        transform: isSelected ? "scale(1.03)" : "scale(1)",
                      }}
                    >
                      {t(option)}
                    </button>
                  );
                })}
              </div>
              {question.optionKeys.length > 4 && (
                <div className="flex justify-center w-full mt-2">
                  {question.optionKeys.slice(4).map((option, idx) => {
                    const isSelected = currentAnswer === option;
                    return (
                      <button
                        key={idx + 4}
                        onClick={() => handleAnswer(question.id, option)}
                        className="transition-all duration-200"
                        style={{
                          minWidth: "220px",
                          padding: "20px 32px",
                          borderRadius: theme.radiusXl,
                          border: isSelected ? `3px solid ${BRAND}` : `2px solid ${theme.borderDefault}`,
                          backgroundColor: isSelected ? theme.primarySubtle : theme.surface,
                          fontFamily: fontFamily,
                          fontSize: TYPE_SCALE.lg,
                          fontWeight: WEIGHT.semibold,
                          color: isSelected ? BRAND : theme.textBody,
                          cursor: "pointer",
                          transform: isSelected ? "scale(1.03)" : "scale(1)",
                        }}
                      >
                        {t(option)}
                      </button>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>

        {/* Dynamic Feedback for Q7 */}
        {question.id === 7 && currentAnswer !== undefined && (
          <div className="mt-12 w-full flex flex-col items-center animate-in fade-in slide-in-from-top-4 duration-500">
            <h3
              style={{
                fontFamily: fontFamily,
                fontSize: TYPE_SCALE.lg,
                fontWeight: WEIGHT.bold,
                color: theme.textHeading,
                marginBottom: "16px",
                textAlign: "center",
              }}
            >
              {currentAnswer === 0 || currentAnswer === 1
                ? t("survey.dyn.dissatisfiedTitle")
                : currentAnswer === 2
                ? t("survey.dyn.neutralTitle")
                : t("survey.dyn.satisfiedTitle")}
            </h3>
            <textarea
              value={dynamicFeedbackText}
              onChange={(e) => {
                if (e.target.value.length <= 500) {
                  setDynamicFeedbackText(e.target.value);
                }
              }}
              placeholder={
                currentAnswer === 0 || currentAnswer === 1
                  ? t("survey.dyn.dissatisfiedPlaceholder")
                  : currentAnswer === 2
                  ? t("survey.dyn.neutralPlaceholder")
                  : t("survey.dyn.satisfiedPlaceholder")
              }
              style={{
                width: "100%",
                maxWidth: "800px",
                height: "140px",
                padding: "24px",
                borderRadius: theme.radiusXl,
                border: `2px solid ${theme.borderDefault}`,
                fontFamily: fontFamily,
                fontSize: TYPE_SCALE.base,
                color: theme.textHeading,
                resize: "none",
                outline: "none",
                direction: isRTL ? "rtl" : "ltr",
                textAlign: isRTL ? "right" : "left",
                backgroundColor: theme.surface,
              }}
              onFocus={(e) => {
                e.target.style.borderColor = BRAND;
              }}
              onBlur={(e) => {
                e.target.style.borderColor = theme.borderDefault;
              }}
            />
          </div>
        )}
      </div>
    );
  };

  const renderFeedbackSlide = () => (
    <div className="flex flex-col items-center justify-center h-full px-16">
      <h3
        style={{
          fontFamily: fontFamily,
          fontSize: TYPE_SCALE["2xl"],
          fontWeight: WEIGHT.bold,
          color: theme.textHeading,
          marginBottom: "16px",
          textAlign: "center",
        }}
      >
        {t("survey.additionalFeedback")}
      </h3>
      <p
        style={{
          fontFamily: fontFamily,
          fontSize: TYPE_SCALE.base,
          fontWeight: WEIGHT.normal,
          color: theme.textMuted,
          marginBottom: "48px",
        }}
      >
        {t("survey.feedbackShortMessage")}
      </p>

      <textarea
        value={feedbackText}
        onChange={(e) => {
          if (e.target.value.length <= 500) {
            setFeedbackText(e.target.value);
          }
        }}
        placeholder={t("survey.feedbackPlaceholder")}
        style={{
          width: "100%",
          maxWidth: "800px",
          height: "220px",
          padding: "24px",
          borderRadius: theme.radiusXl,
          border: `2px solid ${theme.borderDefault}`,
          fontFamily: fontFamily,
          fontSize: TYPE_SCALE.base,
          color: theme.textHeading,
          resize: "none",
          outline: "none",
          direction: isRTL ? "rtl" : "ltr",
          textAlign: isRTL ? "right" : "left",
        }}
        onFocus={(e) => {
          e.target.style.borderColor = BRAND;
        }}
        onBlur={(e) => {
          e.target.style.borderColor = theme.borderDefault;
        }}
      />

      <p
        style={{
          fontFamily: fontFamily,
          fontSize: TYPE_SCALE.sm,
          fontWeight: WEIGHT.normal,
          color: theme.textMuted,
          marginTop: "16px",
          maxWidth: "800px",
          width: "100%",
          textAlign: isRTL ? "right" : "left",
        }}
      >
        {feedbackText.length} / 500 characters
      </p>
    </div>
  );

  const renderThankYouSlide = () => (
    <div className="flex flex-col items-center justify-center h-full px-16 text-center">
      <img
        src={thankYouImage}
        alt="Thank You"
        style={{ width: "280px", height: "auto", marginBottom: "64px" }}
      />
      <h2
        style={{
          fontFamily: fontFamily,
          fontSize: TYPE_SCALE["2xl"],
          fontWeight: WEIGHT.bold,
          color: theme.textHeading,
          marginBottom: "24px",
          lineHeight: LEADING.tight,
        }}
      >
        {t("survey.thankYou")}
      </h2>
      <p
        style={{
          fontFamily: fontFamily,
          ...TEXT_STYLE.body,
          fontSize: TYPE_SCALE.md,
          color: theme.textMuted,
          lineHeight: LEADING.relaxed,
          maxWidth: "700px",
        }}
      >
        {t("survey.thankYouDesc")}
      </p>
    </div>
  );

  const renderComplaintSlide = () => (
    <div className="flex flex-col items-center justify-center h-full px-16 animate-in fade-in duration-500">
      <div className="mb-6 p-4 rounded-full" style={{ backgroundColor: "#fee2e2" }}>
        <Frown size={64} style={{ color: "#ef4444" }} />
      </div>
      <h3
        style={{
          fontFamily: fontFamily,
          fontSize: TYPE_SCALE["2xl"],
          fontWeight: WEIGHT.bold,
          color: theme.textHeading,
          marginBottom: "16px",
          textAlign: "center",
        }}
      >
        We're sorry to hear that
      </h3>
      <p
        style={{
          fontFamily: fontFamily,
          fontSize: TYPE_SCALE.base,
          fontWeight: WEIGHT.normal,
          color: theme.textMuted,
          marginBottom: "48px",
        }}
      >
        Please tell us what happened so we can improve.
      </p>

      <textarea
        value={introFeedbackText}
        onChange={(e) => setIntroFeedbackText(e.target.value)}
        placeholder="Describe your issue or complaint"
        style={{
          width: "100%",
          maxWidth: "800px",
          height: "220px",
          padding: "24px",
          borderRadius: theme.radiusXl,
          border: `2px solid ${theme.borderDefault}`,
          fontFamily: fontFamily,
          fontSize: TYPE_SCALE.base,
          color: theme.textHeading,
          resize: "none",
          outline: "none",
          direction: isRTL ? "rtl" : "ltr",
          textAlign: isRTL ? "right" : "left",
          backgroundColor: theme.surface,
        }}
        onFocus={(e) => {
          e.target.style.borderColor = BRAND;
        }}
        onBlur={(e) => {
          e.target.style.borderColor = theme.borderDefault;
        }}
      />
    </div>
  );

  const renderPraiseSlide = () => (
    <div className="flex flex-col items-center justify-center h-full px-16 animate-in fade-in duration-500">
      <div className="mb-6 p-4 rounded-full" style={{ backgroundColor: "#dcfce7" }}>
        <Smile size={64} style={{ color: "#22c55e" }} />
      </div>
      <h3
        style={{
          fontFamily: fontFamily,
          fontSize: TYPE_SCALE["2xl"],
          fontWeight: WEIGHT.bold,
          color: theme.textHeading,
          marginBottom: "16px",
          textAlign: "center",
        }}
      >
        We're glad to hear that!
      </h3>
      <p
        style={{
          fontFamily: fontFamily,
          fontSize: TYPE_SCALE.base,
          fontWeight: WEIGHT.normal,
          color: theme.textMuted,
          marginBottom: "48px",
        }}
      >
        Tell us what you liked about your experience.
      </p>

      <textarea
        value={introFeedbackText}
        onChange={(e) => setIntroFeedbackText(e.target.value)}
        placeholder="Share what you liked about your experience"
        style={{
          width: "100%",
          maxWidth: "800px",
          height: "220px",
          padding: "24px",
          borderRadius: theme.radiusXl,
          border: `2px solid ${theme.borderDefault}`,
          fontFamily: fontFamily,
          fontSize: TYPE_SCALE.base,
          color: theme.textHeading,
          resize: "none",
          outline: "none",
          direction: isRTL ? "rtl" : "ltr",
          textAlign: isRTL ? "right" : "left",
          backgroundColor: theme.surface,
        }}
        onFocus={(e) => {
          e.target.style.borderColor = BRAND;
        }}
        onBlur={(e) => {
          e.target.style.borderColor = theme.borderDefault;
        }}
      />
    </div>
  );

  return (
    <div
      className="fixed inset-0 flex flex-col"
      style={{
        backgroundColor: theme.surface,
        zIndex: 1000,
        direction: isRTL ? "rtl" : "ltr",
      }}
    >
      {/* Progress bar */}
      {renderProgressBar()}

      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-8 p-3 transition-all duration-200"
        style={{
          borderRadius: theme.radiusLg,
          backgroundColor: theme.tileInactiveBg,
          zIndex: 30,
          ...(isRTL ? { left: "32px" } : { right: "32px" }),
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = theme.sliderBg;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = theme.tileInactiveBg;
        }}
      >
        <X size={28} style={{ color: theme.textMuted }} />
      </button>

      {/* Main content area */}
      <div className="flex-1 overflow-y-auto" style={{ paddingTop: "2px" }}>
        {currentSlide === 0 && renderIntroSlide()}
        {currentSlide >= 1 && currentSlide <= 7 && renderQuestionSlide(currentSlide - 1)}
        {currentSlide === 8 && renderFeedbackSlide()}
        {currentSlide === 9 && renderThankYouSlide()}
        {currentSlide === 10 && renderComplaintSlide()}
        {currentSlide === 11 && renderPraiseSlide()}
      </div>

      {/* Footer with navigation */}
      <div
        className="flex items-center justify-between px-12 py-8 border-t"
        style={{ borderColor: theme.borderDefault, zIndex: 20, direction: "ltr" }}
      >
        {/* Next button (left in RTL, right in LTR) */}
        {isRTL ? (
          currentSlide === 10 || currentSlide === 11 ? (
            <button
              onClick={handleSubmit}
              className="flex items-center gap-2 transition-all duration-200"
              style={{
                fontFamily: fontFamily,
                fontSize: TYPE_SCALE.lg,
                fontWeight: WEIGHT.semibold,
                color: theme.textInverse,
                cursor: "pointer",
                padding: "12px 32px",
                borderRadius: theme.radiusMd,
                backgroundColor: BRAND,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = BRAND_DARK;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = BRAND;
              }}
            >
              <ChevronLeft size={22} />
              {t("survey.submit")}
            </button>
          ) : currentSlide === 8 ? (
            <button
              onClick={handleSubmit}
              className="flex items-center gap-2 transition-all duration-200"
              style={{
                fontFamily: fontFamily,
                fontSize: TYPE_SCALE.lg,
                fontWeight: WEIGHT.semibold,
                color: theme.textInverse,
                cursor: "pointer",
                padding: "12px 32px",
                borderRadius: theme.radiusMd,
                backgroundColor: BRAND,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = BRAND_DARK;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = BRAND;
              }}
            >
              <ChevronLeft size={22} />
              {t("survey.submit")}
            </button>
          ) : currentSlide === 9 ? (
            <button
              onClick={onClose}
              className="flex items-center gap-2 transition-all duration-200"
              style={{
                fontFamily: fontFamily,
                fontSize: TYPE_SCALE.lg,
                fontWeight: WEIGHT.semibold,
                color: theme.textInverse,
                cursor: "pointer",
                padding: "12px 32px",
                borderRadius: theme.radiusMd,
                backgroundColor: BRAND,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = BRAND_DARK;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = BRAND;
              }}
            >
              {t("survey.close")}
            </button>
          ) : (
            <button
              onClick={handleNext}
              className="flex items-center gap-2 transition-all duration-200"
              style={{
                fontFamily: fontFamily,
                fontSize: TYPE_SCALE.lg,
                fontWeight: WEIGHT.semibold,
                color: theme.textInverse,
                cursor: "pointer",
                padding: "12px 32px",
                borderRadius: theme.radiusMd,
                backgroundColor: BRAND,
                visibility: currentSlide === 0 && feedbackType !== "continue" ? "hidden" : "visible",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = BRAND_DARK;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = BRAND;
              }}
            >
              <ChevronLeft size={22} />
              {t("survey.next")}
            </button>
          )
        ) : (
          <button
            onClick={handlePrevious}
            disabled={currentSlide === 0 || currentSlide === 9}
            className="flex items-center gap-2 transition-all duration-200"
            style={{
              fontFamily: fontFamily,
              fontSize: TYPE_SCALE.lg,
              fontWeight: WEIGHT.semibold,
              color: currentSlide === 0 || currentSlide === 9 ? theme.textDisabled : BRAND,
              cursor: currentSlide === 0 || currentSlide === 9 ? "not-allowed" : "pointer",
              opacity: currentSlide === 0 || currentSlide === 9 ? 0.4 : 1,
              padding: "12px 24px",
              borderRadius: theme.radiusMd,
              backgroundColor: currentSlide === 0 || currentSlide === 9 ? "transparent" : theme.primarySubtle,
            }}
            onMouseEnter={(e) => {
              if (currentSlide !== 0 && currentSlide !== 9) {
                e.currentTarget.style.backgroundColor = theme.primarySubtle;
              }
            }}
            onMouseLeave={(e) => {
              if (currentSlide !== 0 && currentSlide !== 9) {
                e.currentTarget.style.backgroundColor = theme.primarySubtle;
              }
            }}
          >
            <ChevronLeft size={22} />
            {t("survey.previous")}
          </button>
        )}

        {/* Progress dots */}
        <div className="flex items-center justify-center gap-2">
          {Array.from({ length: totalSlides + 1 }).map((_, i) => (
            <div
              key={i}
              className="rounded-full transition-all duration-300"
              style={{
                width: i === currentSlide ? "28px" : "8px",
                height: "8px",
                backgroundColor: i === currentSlide ? BRAND : theme.borderDefault,
              }}
            />
          ))}
        </div>

        {/* Previous button (right in RTL, right in LTR for Next) */}
        {isRTL ? (
          <button
            onClick={handlePrevious}
            disabled={currentSlide === 0 || currentSlide === 9}
            className="flex items-center gap-2 transition-all duration-200"
            style={{
              fontFamily: fontFamily,
              fontSize: TYPE_SCALE.lg,
              fontWeight: WEIGHT.semibold,
              color: currentSlide === 0 || currentSlide === 9 ? theme.textDisabled : BRAND,
              cursor: currentSlide === 0 || currentSlide === 9 ? "not-allowed" : "pointer",
              opacity: currentSlide === 0 || currentSlide === 9 ? 0.4 : 1,
              padding: "12px 24px",
              borderRadius: theme.radiusMd,
              backgroundColor: currentSlide === 0 || currentSlide === 9 ? "transparent" : theme.primarySubtle,
            }}
            onMouseEnter={(e) => {
              if (currentSlide !== 0 && currentSlide !== 9) {
                e.currentTarget.style.backgroundColor = theme.primarySubtle;
              }
            }}
            onMouseLeave={(e) => {
              if (currentSlide !== 0 && currentSlide !== 9) {
                e.currentTarget.style.backgroundColor = theme.primarySubtle;
              }
            }}
          >
            {t("survey.previous")}
            <ChevronRight size={22} />
          </button>
        ) : currentSlide === 10 || currentSlide === 11 ? (
          <button
            onClick={handleSubmit}
            className="flex items-center gap-2 transition-all duration-200"
            style={{
              fontFamily: fontFamily,
              fontSize: TYPE_SCALE.lg,
              fontWeight: WEIGHT.semibold,
              color: theme.textInverse,
              cursor: "pointer",
              padding: "12px 32px",
              borderRadius: theme.radiusMd,
              backgroundColor: BRAND,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = BRAND_DARK;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = BRAND;
            }}
          >
            {t("survey.submit")}
            <ChevronRight size={22} />
          </button>
        ) : currentSlide === 8 ? (
          <button
            onClick={handleSubmit}
            className="flex items-center gap-2 transition-all duration-200"
            style={{
              fontFamily: fontFamily,
              fontSize: TYPE_SCALE.lg,
              fontWeight: WEIGHT.semibold,
              color: theme.textInverse,
              cursor: "pointer",
              padding: "12px 32px",
              borderRadius: theme.radiusMd,
              backgroundColor: BRAND,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = BRAND_DARK;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = BRAND;
            }}
          >
            {t("survey.submit")}
            <ChevronRight size={22} />
          </button>
        ) : currentSlide === 9 ? (
          <button
            onClick={onClose}
            className="flex items-center gap-2 transition-all duration-200"
            style={{
              fontFamily: fontFamily,
              fontSize: TYPE_SCALE.lg,
              fontWeight: WEIGHT.semibold,
              color: theme.textInverse,
              cursor: "pointer",
              padding: "12px 32px",
              borderRadius: theme.radiusMd,
              backgroundColor: BRAND,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = BRAND_DARK;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = BRAND;
            }}
          >
            {t("survey.close")}
          </button>
        ) : (
          <button
            onClick={handleNext}
            className="flex items-center gap-2 transition-all duration-200"
            style={{
              fontFamily: fontFamily,
              fontSize: TYPE_SCALE.lg,
              fontWeight: WEIGHT.semibold,
              color: theme.textInverse,
              cursor: "pointer",
              padding: "12px 32px",
              borderRadius: theme.radiusMd,
              backgroundColor: BRAND,
              visibility: currentSlide === 0 && feedbackType !== "continue" ? "hidden" : "visible",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = BRAND_DARK;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = BRAND;
            }}
          >
            {t("survey.next")}
            <ChevronRight size={22} />
          </button>
        )}
      </div>
    </div>
  );
}