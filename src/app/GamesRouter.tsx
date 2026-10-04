import { useEffect, useState, type ComponentType } from "react";
import { BrowserRouter, Link, Route, Routes, useNavigate } from "react-router";
import { useTheme, SPACE, TYPE_SCALE, WEIGHT } from "./components/ThemeContext";
import { useLocale } from "./components/i18n";
import { MemoryGame } from "./components/games/MemoryGame";
import { TicTacToeGame } from "./components/games/TicTacToeGame";
import { SlidingPuzzleGame } from "./components/games/SlidingPuzzleGame";
import { ColorMatchGame } from "./components/games/ColorMatchGame";
import { PatternMemoryGame } from "./components/games/PatternMemoryGame";
import { EmojiMatchGame } from "./components/games/EmojiMatchGame";
import { SimonSaysGame } from "./components/games/SimonSaysGame";
import { WordSearchGame } from "./components/games/WordSearchGame";
import { ReactionTimeGame } from "./components/games/ReactionTimeGame";
import { BrainMathGame } from "./components/games/BrainMathGame";
import { TriviaQuizGame } from "./components/games/TriviaQuizGame";
import { JigsawPuzzleGame } from "./components/games/JigsawPuzzleGame";
import { ImageJigsawGame } from "./components/games/ImageJigsawGame";
import { WordChainGame } from "./components/games/WordChainGame";

type GameProps = { onClose: () => void; onBackToGames: () => void };

const GAMES: { path: string; title: string; Component: ComponentType<GameProps> }[] = [
  { path: "memory", title: "Memory", Component: MemoryGame },
  { path: "tictactoe", title: "Tic Tac Toe", Component: TicTacToeGame },
  { path: "sliding", title: "Sliding Puzzle", Component: SlidingPuzzleGame },
  { path: "color", title: "Color Match", Component: ColorMatchGame },
  { path: "pattern", title: "Pattern Memory", Component: PatternMemoryGame },
  { path: "emoji", title: "Emoji Match", Component: EmojiMatchGame },
  { path: "simon", title: "Simon Says", Component: SimonSaysGame },
  { path: "wordsearch", title: "Word Search", Component: WordSearchGame },
  { path: "reaction", title: "Reaction Time", Component: ReactionTimeGame },
  { path: "brainmath", title: "Brain Math", Component: BrainMathGame },
  { path: "trivia", title: "Trivia Quiz", Component: TriviaQuizGame },
  { path: "puzzle", title: "Jigsaw Puzzle", Component: JigsawPuzzleGame },
  { path: "imagepuzzle", title: "Image Jigsaw", Component: ImageJigsawGame },
  { path: "wordchain", title: "Word Chain", Component: WordChainGame },
];

const DESIGN_W = 1920;
const DESIGN_H = 1080;

const getScale = () => Math.min(window.innerWidth / DESIGN_W, window.innerHeight / DESIGN_H);

function useCanvasScale() {
  const [scale, setScale] = useState(getScale);
  useEffect(() => {
    const onResize = () => setScale(getScale());
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return scale;
}

function GameRoute({ Component }: { Component: ComponentType<GameProps> }) {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const { dir, fontFamily } = useLocale();
  const scale = useCanvasScale();
  const goHome = () => navigate("/");
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: theme.background,
      }}
    >
      <div
        dir={dir}
        style={{
          position: "relative",
          flexShrink: 0,
          width: DESIGN_W,
          height: DESIGN_H,
          overflow: "hidden",
          transform: `scale(${scale})`,
          transformOrigin: "center center",
          background: theme.gradientCanvas,
          fontFamily,
        }}
      >
        <Component onClose={goHome} onBackToGames={goHome} />
      </div>
    </div>
  );
}

function GamesIndex() {
  const { theme } = useTheme();
  const { dir, fontFamily } = useLocale();
  return (
    <div
      dir={dir}
      style={{
        minHeight: "100vh",
        padding: SPACE[4],
        background: theme.background,
        color: theme.textHeading,
        fontFamily,
      }}
    >
      <h1 style={{ marginBottom: SPACE[3], fontSize: TYPE_SCALE["2xl"], fontWeight: WEIGHT.bold }}>Games</h1>
      <ul style={{ display: "flex", flexWrap: "wrap", gap: SPACE[2], listStyle: "none", padding: 0 }}>
        {GAMES.map(({ path, title }) => (
          <li key={path}>
            <Link
              to={`/${path}`}
              style={{
                display: "block",
                padding: `${SPACE[2]} ${SPACE[3]}`,
                fontSize: TYPE_SCALE.md,
                borderRadius: theme.radiusMd,
                background: theme.surface,
                color: theme.textHeading,
                textDecoration: "none",
              }}
            >
              {title}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function GamesRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<GamesIndex />} />
        {GAMES.map(({ path, Component }) => (
          <Route key={path} path={`/${path}`} element={<GameRoute Component={Component} />} />
        ))}
      </Routes>
    </BrowserRouter>
  );
}
