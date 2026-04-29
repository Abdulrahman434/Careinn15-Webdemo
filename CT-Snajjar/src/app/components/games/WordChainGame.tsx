import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, User, Trophy, RotateCcw } from 'lucide-react';
import { useTheme, TYPE_SCALE, WEIGHT, SHADOW } from '../ThemeContext';
import { saveGameState as saveGameStateApi, loadGameState as loadGameStateApi, clearGameState as clearGameStateApi } from "../../utils/gameStorage";

type Category = 'animals' | 'countries' | 'foods';

const DICTIONARIES: Record<Category, string[]> = {
  animals: ['cat', 'tiger', 'elephant', 'turtle', 'eagle', 'emu', 'unicorn', 'narwhal', 'lion', 'newt', 'toad', 'dog', 'gorilla', 'alligator', 'rat', 'tarantula', 'ant', 'tapir', 'rabbit', 'trout', 'turkey', 'yak', 'kangaroo', 'ostrich', 'hippopotamus', 'snake', 'echidna', 'alpaca', 'armadillo', 'owl', 'leopard', 'deer', 'rhinoceros', 'seal', 'lemur', 'raccoon', 'numbat', 'termite', 'eel', 'lizard', 'dolphin', 'nematode', 'earwig', 'goat', 'donkey', 'iguana', 'aardvark', 'koala'],
  countries: ['canada', 'australia', 'argentina', 'algeria', 'angola', 'afghanistan', 'albania', 'andorra', 'armenia', 'austria', 'azerbaijan', 'bahamas', 'bahrain', 'bangladesh', 'barbados', 'belarus', 'belgium', 'belize', 'benin', 'bhutan', 'bolivia', 'bosnia', 'botswana', 'brazil', 'brunei', 'bulgaria', 'burundi', 'cambodia', 'cameroon', 'chad', 'chile', 'china', 'colombia', 'comoros', 'congo', 'croatia', 'cuba', 'cyprus', 'czechia', 'denmark', 'djibouti', 'dominica', 'ecuador', 'egypt', 'eritrea', 'estonia', 'eswatini', 'ethiopia', 'fiji', 'finland', 'france', 'gabon', 'gambia', 'georgia', 'germany', 'ghana', 'greece', 'grenada', 'guatemala', 'guinea', 'guyana', 'haiti', 'honduras', 'hungary', 'iceland', 'india', 'indonesia', 'iran', 'iraq', 'ireland', 'israel', 'italy', 'jamaica', 'japan', 'jordan', 'kazakhstan', 'kenya', 'kiribati', 'kosovo', 'kuwait', 'kyrgyzstan', 'laos', 'latvia', 'lebanon', 'lesotho', 'liberia', 'libya', 'liechtenstein', 'lithuania', 'luxembourg', 'madagascar', 'malawi', 'malaysia', 'maldives', 'mali', 'malta', 'mauritania', 'mauritius', 'mexico', 'micronesia', 'moldova', 'monaco', 'mongolia', 'montenegro', 'morocco', 'mozambique', 'myanmar', 'namibia', 'nauru', 'nepal', 'netherlands', 'nicaragua', 'niger', 'nigeria', 'norway', 'oman', 'pakistan', 'palau', 'palestine', 'panama', 'paraguay', 'peru', 'philippines', 'poland', 'portugal', 'qatar', 'romania', 'russia', 'rwanda', 'samoa', 'san marino', 'saudi arabia', 'senegal', 'serbia', 'seychelles', 'singapore', 'slovakia', 'slovenia', 'somalia', 'south africa', 'spain', 'sri lanka', 'sudan', 'suriname', 'sweden', 'switzerland', 'syria', 'taiwan', 'tajikistan', 'tanzania', 'thailand', 'togo', 'tonga', 'trinidad', 'tunisia', 'turkey', 'turkmenistan', 'tuvalu', 'uganda', 'ukraine', 'united arab emirates', 'united kingdom', 'united states', 'uruguay', 'uzbekistan', 'vanuatu', 'vatican', 'venezuela', 'vietnam', 'yemen', 'zambia', 'zimbabwe'],
  foods: ['apple', 'egg', 'grape', 'eggplant', 'tomato', 'orange', 'eclair', 'radish', 'hamburger', 'rice', 'enchilada', 'apricot', 'taco', 'onion', 'nectarine', 'endive', 'edamame', 'empanada', 'artichoke', 'einkorn', 'noodle', 'elderberry', 'yam', 'melon', 'nut', 'turnip', 'pasta', 'almond', 'date', 'elderflower', 'ravioli', 'ice cream', 'macaroni', 'igloo', 'olive', 'eel', 'lemon', 'nachos', 'soup', 'pear', 'raspberry', 'yogurt', 'tangerine', 'garlic', 'carrot', 'toast', 'tea', 'asparagus', 'strawberry', 'salmon', 'nougat', 'truffle', 'eclairs', 'sushi', 'iguana', 'anise']
};

export function WordChainGame({ onClose, onBackToGames }: { onClose: () => void; onBackToGames: () => void }) {
  const { theme } = useTheme();
  const [gameState, setGameState] = useState<'menu' | 'playing' | 'gameover'>('menu');
  const [category, setCategory] = useState<Category | null>(null);
  const [chain, setChain] = useState<string[]>([]);
  const [currentPlayer, setCurrentPlayer] = useState<1 | 2>(1);
  const [timeLeft, setTimeLeft] = useState(10);
  const [inputValue, setInputValue] = useState('');
  const [winner, setWinner] = useState<1 | 2 | null>(null);
  const [highScore, setHighScore] = useState(0);

  const timerRef = useRef<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [showResumeModal, setShowResumeModal] = useState(false);
  const [hasSavedGame, setHasSavedGame] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('wordchain-highscore');
    if (saved) setHighScore(parseInt(saved, 10));

    const init = async () => {
      const savedState = await loadGameStateApi('wordchain-game-state');
      if (savedState) {
        setHasSavedGame(true);
        setShowResumeModal(true);
      }
    };
    init();
  }, []);

  const saveGameState = () => {
    if (gameState !== 'playing') return;
    const state = {
      category, chain, currentPlayer, timeLeft,
      timestamp: Date.now()
    };
    saveGameStateApi('wordchain-game-state', state);
  };

  const loadGameState = async () => {
    const state = await loadGameStateApi('wordchain-game-state');
    if (state) {
      setCategory(state.category);
      setChain(state.chain);
      setCurrentPlayer(state.currentPlayer);
      setTimeLeft(state.timeLeft);
      setGameState('playing');
      setShowResumeModal(false);
    }
  };

  const clearGameState = () => {
    clearGameStateApi('wordchain-game-state');
  };

  const handleNewGameFromResume = () => {
    clearGameState();
    setHasSavedGame(false);
    setShowResumeModal(false);
    setGameState('menu');
  };

  useEffect(() => {
    if (gameState === 'playing') {
      saveGameState();
    }
  }, [gameState, category, chain, currentPlayer, timeLeft]);

  const startGame = (selectedCategory: Category) => {
    setCategory(selectedCategory);
    
    // Pick a random starting word from the dictionary
    const dict = DICTIONARIES[selectedCategory];
    const startWord = dict[Math.floor(Math.random() * dict.length)];
    
    setChain([startWord]);
    setCurrentPlayer(1);
    setTimeLeft(10);
    setInputValue('');
    setWinner(null);
    setGameState('playing');
    clearGameState();
  };

  const endGame = (losingPlayer: 1 | 2) => {
    setWinner(losingPlayer === 1 ? 2 : 1);
    setGameState('gameover');
    if (chain.length > highScore) {
      setHighScore(chain.length);
      localStorage.setItem('wordchain-highscore', chain.length.toString());
    }
    clearGameState();
  };

  useEffect(() => {
    if (gameState === 'playing') {
      // Player's turn timer
      timerRef.current = window.setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            endGame(currentPlayer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timerRef.current!);
    }
  }, [gameState, currentPlayer, chain, category]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const word = inputValue.trim().toLowerCase();
    
    // Check basic length and format
    if (word.length < 2 || !/^[a-z\s]+$/.test(word)) {
      endGame(currentPlayer);
      return;
    }

    const lastWord = chain[chain.length - 1];
    const lastLetter = lastWord[lastWord.length - 1].toLowerCase();

    // Word must start with the correct letter and must not have been used
    if (!word.startsWith(lastLetter) || chain.some(c => c.toLowerCase() === word)) {
      endGame(currentPlayer);
      return;
    }

    // Valid word!
    setChain(prev => [...prev, word]);
    setInputValue('');
    setCurrentPlayer(prev => prev === 1 ? 2 : 1);
    setTimeLeft(10);
    
    // Auto focus input again
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  return (
    <div className="absolute inset-0 z-50 flex flex-col" style={{ backgroundColor: theme.background }}>
      <div className="shrink-0 flex items-center justify-between px-8" style={{ height: "88px", backgroundColor: theme.surface, borderBottom: theme.cardBorder, boxShadow: SHADOW.lg }}>
        <div className="flex items-center gap-4">
          <button onClick={onBackToGames} className="flex items-center justify-center cursor-pointer active:scale-95 transition-transform" style={{ width: "56px", height: "56px", backgroundColor: theme.surfaceElevated, borderRadius: theme.radiusMd, border: "none", outline: "none" }}>
            <ArrowLeft size={24} color={theme.textHeading} />
          </button>
          <h1 style={{ fontSize: TYPE_SCALE.xl, fontWeight: WEIGHT.bold, color: theme.textHeading }}>Word Chain</h1>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="px-4 py-2 bg-green-50 text-green-700 font-bold rounded-full flex items-center gap-2">
            <Trophy size={20} />
            Best Chain: {highScore}
          </div>
          <button onClick={onClose} className="flex items-center justify-center cursor-pointer active:scale-95 transition-transform" style={{ width: "56px", height: "56px", backgroundColor: theme.surfaceElevated, borderRadius: theme.radiusMd, border: "none", outline: "none" }}>
            <div style={{ width: "24px", height: "24px", position: "relative" }}>
              <div style={{ position: "absolute", top: "50%", left: "50%", width: "20px", height: "2px", backgroundColor: theme.textHeading, transform: "translate(-50%, -50%) rotate(45deg)", borderRadius: "2px" }} />
              <div style={{ position: "absolute", top: "50%", left: "50%", width: "20px", height: "2px", backgroundColor: theme.textHeading, transform: "translate(-50%, -50%) rotate(-45deg)", borderRadius: "2px" }} />
            </div>
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center overflow-auto p-8 relative">
        {gameState === 'menu' && (
          <div className="w-full max-w-2xl flex flex-col items-center gap-8 bg-white p-10 rounded-3xl shadow-xl">
            <div className="text-center">
              <h2 className="text-4xl font-black mb-2 text-green-800">Word Chain</h2>
              <p className="text-lg text-gray-600">Connect words by their first and last letters!</p>
            </div>
            
            <div className="w-full animate-in fade-in slide-in-from-bottom-4">
              <h3 className="text-xl font-bold mb-4 text-gray-800 text-center">Select Category & Start</h3>
              <div className="grid grid-cols-3 gap-4">
                {(['animals', 'countries', 'foods'] as Category[]).map(cat => (
                  <button
                    key={cat}
                    onClick={() => startGame(cat)}
                    className="p-4 rounded-xl font-bold capitalize text-white bg-green-600 hover:bg-green-700 active:scale-95 transition-all shadow-md"
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {gameState === 'playing' && (
          <div className="w-full max-w-4xl flex flex-col h-full gap-6 relative">
            <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm">
              <div className={`flex items-center gap-3 ${currentPlayer === 1 ? 'text-green-600' : 'text-gray-400'}`}>
                <User size={32} />
                <span className="text-xl font-bold">Player 1</span>
              </div>
              
              <div className="flex flex-col items-center justify-center">
                <div className={`text-5xl font-black ${timeLeft <= 3 ? 'text-red-500 animate-pulse' : 'text-green-500'}`}>
                  {timeLeft}s
                </div>
                <div className="text-sm font-bold text-gray-400 mt-1 uppercase tracking-wider">
                  Chain: {chain.length}
                </div>
              </div>

              <div className={`flex items-center gap-3 ${currentPlayer === 2 ? 'text-green-600' : 'text-gray-400'}`}>
                <span className="text-xl font-bold">Player 2</span>
                <User size={32} />
              </div>
            </div>

            <div className="flex-1 overflow-auto flex flex-col justify-end gap-3 pb-4">
              <div className="flex flex-wrap gap-2 content-end">
                {chain.map((word, i) => (
                  <div key={i} className="flex items-center">
                    <div className="px-4 py-2 bg-green-100 text-green-800 font-bold rounded-lg text-lg capitalize border border-green-200 shadow-sm">
                      {word.slice(0, -1)}
                      <span className="text-green-500 underline underline-offset-4 decoration-2">{word.slice(-1)}</span>
                    </div>
                    {i < chain.length - 1 && (
                      <div className="mx-2 text-gray-400 font-black">→</div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <form onSubmit={handleSubmit} className="bg-white p-4 rounded-2xl shadow-lg border border-gray-100 flex flex-col gap-2">
              <div className="flex gap-4">
                <div className="flex-1 relative flex items-center">
                  <div className="absolute left-6 text-3xl font-black text-green-300 pointer-events-none select-none">
                    {chain[chain.length - 1][chain[chain.length - 1].length - 1].toUpperCase()}
                  </div>
                  <input
                    ref={inputRef}
                    type="text"
                    autoFocus
                    value={inputValue}
                    onChange={e => setInputValue(e.target.value)}
                    placeholder={`Player ${currentPlayer}, type a word...`}
                    className="w-full h-16 pl-14 pr-4 text-2xl font-bold bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-green-500 transition-colors uppercase"
                  />
                </div>
                <button type="submit" className="px-8 h-16 bg-green-600 hover:bg-green-700 text-white font-bold text-xl rounded-xl active:scale-95 transition-all shadow-md">
                  Submit
                </button>
              </div>
            </form>
          </div>
        )}

        {gameState === 'gameover' && (
          <div className="w-full max-w-2xl flex flex-col items-center gap-8 bg-white p-10 rounded-3xl shadow-xl animate-in zoom-in-95">
            <Trophy size={80} className="text-yellow-400" />
            
            <div className="text-center">
              <h2 className="text-5xl font-black mb-2 text-gray-800">
                Player {winner} Wins!
              </h2>
              <p className="text-2xl text-gray-600 font-bold">
                Chain Length: <span className="text-green-600">{chain.length}</span>
              </p>
            </div>

            <div className="flex flex-col w-full gap-4 mt-4">
              <button onClick={() => setGameState('menu')} className="w-full py-5 bg-green-600 text-white font-bold text-xl rounded-2xl shadow-lg active:scale-95 transition-all hover:bg-green-700">
                Play Again
              </button>
              <button onClick={onBackToGames} className="w-full py-5 bg-gray-100 text-gray-700 font-bold text-xl rounded-2xl active:scale-95 transition-all hover:bg-gray-200">
                Back to Games
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Resume Modal */}
      {showResumeModal && (
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{
            backgroundColor: "rgba(0,0,0,0.7)",
            backdropFilter: "blur(8px)",
            zIndex: 150,
          }}
        >
          <div
            className="flex flex-col items-center gap-8 px-16 py-12"
            style={{
              backgroundColor: theme.surface,
              borderRadius: theme.radiusCard,
              boxShadow: SHADOW["2xl"],
              border: theme.cardBorder,
              maxWidth: "500px",
              width: "90%"
            }}
          >
            <div className="w-24 h-24 rounded-full bg-green-100 flex items-center justify-center">
              <RotateCcw size={48} className="text-green-600" />
            </div>
            
            <div className="text-center gap-2 flex flex-col">
              <h2 style={{ fontSize: TYPE_SCALE["2xl"], fontWeight: WEIGHT.bold, color: theme.textHeading }}>
                Resume Game?
              </h2>
              <p style={{ fontSize: TYPE_SCALE.md, color: theme.textMuted }}>
                We found a saved session. Would you like to continue or start fresh?
              </p>
            </div>

            <div className="flex flex-col gap-4 w-full">
              <button
                onClick={loadGameState}
                className="w-full py-5 rounded-2xl font-bold flex items-center justify-center gap-3 transition-all hover:brightness-110 active:scale-95 bg-green-600 text-white shadow-md"
                style={{ fontSize: TYPE_SCALE.md }}
              >
                Continue Playing
              </button>
              <button
                onClick={handleNewGameFromResume}
                className="w-full py-5 rounded-2xl font-bold transition-all hover:bg-gray-100 active:scale-95 border-2 border-gray-200"
                style={{ backgroundColor: theme.surfaceElevated, color: theme.textHeading, fontSize: TYPE_SCALE.md }}
              >
                Start New Game
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
