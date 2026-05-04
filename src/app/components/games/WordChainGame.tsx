import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, User, Trophy, RotateCcw } from 'lucide-react';
import { useTheme, TYPE_SCALE, WEIGHT, SHADOW } from '../ThemeContext';
import { useLocale } from '../i18n';
import { GAME_TRANSLATIONS } from './gameTranslations';

type Category = 'animals' | 'countries' | 'foods';

const DICTIONARIES: Record<Category, string[]> = {
  animals: [
    'cat', 'dog', 'tiger', 'lion', 'elephant', 'giraffe', 'zebra', 'panda', 'kangaroo', 'koala', 'hippo', 'rhino', 'monkey', 'gorilla', 'chimpanzee', 'baboon', 'lemur', 'sloth', 'bear', 'wolf', 'fox', 'coyote', 'hyena', 'leopard', 'cheetah', 'jaguar', 'panther', 'deer', 'moose', 'elk', 'reindeer', 'camel', 'llama', 'alpaca', 'horse', 'donkey', 'mule', 'zebra', 'pig', 'cow', 'sheep', 'goat', 'chicken', 'duck', 'goose', 'turkey', 'peacock', 'eagle', 'hawk', 'falcon', 'owl', 'parrot', 'penguin', 'ostrich', 'emu', 'flamingo', 'swan', 'stork', 'pelican', 'seagull', 'whale', 'dolphin', 'shark', 'octopus', 'squid', 'crab', 'lobster', 'shrimp', 'turtle', 'tortoise', 'snake', 'lizard', 'crocodile', 'alligator', 'frog', 'toad', 'salamander', 'newt', 'bee', 'wasp', 'ant', 'butterfly', 'moth', 'spider', 'scorpion', 'beetle', 'ladybug', 'mosquito', 'fly', 'dragonfly', 'bat', 'rabbit', 'hare', 'squirrel', 'chipmunk', 'beaver', 'otter', 'seal', 'walrus', 'penguin', 'polar bear', 'panda', 'koala', 'sloth', 'armadillo', 'hedgehog', 'mole', 'rat', 'mouse', 'hamster', 'guinea pig', 'gerbil'
  ],
  countries: [
    'afghanistan', 'albania', 'algeria', 'andorra', 'angola', 'antigua', 'argentina', 'armenia', 'australia', 'austria', 'azerbaijan', 'bahamas', 'bahrain', 'bangladesh', 'barbados', 'belarus', 'belgium', 'belize', 'benin', 'bhutan', 'bolivia', 'bosnia', 'botswana', 'brazil', 'brunei', 'bulgaria', 'burkina faso', 'burundi', 'cambodia', 'cameroon', 'canada', 'cape verde', 'central african republic', 'chad', 'chile', 'china', 'colombia', 'comoros', 'congo', 'costa rica', 'croatia', 'cuba', 'cyprus', 'czech republic', 'denmark', 'djibouti', 'dominica', 'dominican republic', 'ecuador', 'egypt', 'el salvador', 'equatorial guinea', 'eritrea', 'estonia', 'eswatini', 'ethiopia', 'fiji', 'finland', 'france', 'gabon', 'gambia', 'georgia', 'germany', 'ghana', 'greece', 'grenada', 'guatemala', 'guinea', 'guyana', 'haiti', 'honduras', 'hungary', 'iceland', 'india', 'indonesia', 'iran', 'iraq', 'ireland', 'israel', 'italy', 'jamaica', 'japan', 'jordan', 'kazakhstan', 'kenya', 'kiribati', 'north korea', 'south korea', 'kuwait', 'kyrgyzstan', 'laos', 'latvia', 'lebanon', 'lesotho', 'liberia', 'libya', 'liechtenstein', 'lithuania', 'luxembourg', 'madagascar', 'malawi', 'malaysia', 'maldives', 'mali', 'malta', 'marshall islands', 'mauritania', 'mauritius', 'mexico', 'micronesia', 'moldova', 'monaco', 'mongolia', 'montenegro', 'morocco', 'mozambique', 'myanmar', 'namibia', 'nauru', 'nepal', 'netherlands', 'new zealand', 'nicaragua', 'niger', 'nigeria', 'north macedonia', 'norway', 'oman', 'pakistan', 'palau', 'palestine', 'panama', 'papua new guinea', 'paraguay', 'peru', 'philippines', 'poland', 'portugal', 'qatar', 'romania', 'russia', 'rwanda', 'saint kitts', 'saint lucia', 'saint vincent', 'samoa', 'san marino', 'sao tome', 'saudi arabia', 'senegal', 'serbia', 'seychelles', 'sierra leone', 'singapore', 'slovakia', 'slovenia', 'solomon islands', 'somalia', 'south africa', 'south sudan', 'spain', 'sri lanka', 'sudan', 'suriname', 'sweden', 'switzerland', 'syria', 'taiwan', 'tajikistan', 'tanzania', 'thailand', 'timor-leste', 'togo', 'tonga', 'trinidad and tobago', 'tunisia', 'turkey', 'turkmenistan', 'tuvalu', 'uganda', 'ukraine', 'united arab emirates', 'united kingdom', 'united states', 'usa', 'america', 'uruguay', 'uzbekistan', 'vanuatu', 'vatican city', 'venezuela', 'vietnam', 'yemen', 'zambia', 'zimbabwe'
  ],
  foods: [
    'apple', 'banana', 'orange', 'strawberry', 'grape', 'watermelon', 'pineapple', 'mango', 'peach', 'pear', 'plum', 'cherry', 'blueberry', 'raspberry', 'blackberry', 'kiwi', 'lemon', 'lime', 'coconut', 'avocado', 'tomato', 'potato', 'onion', 'garlic', 'carrot', 'broccoli', 'cauliflower', 'spinach', 'lettuce', 'cucumber', 'pepper', 'corn', 'pea', 'bean', 'lentil', 'rice', 'bread', 'pasta', 'noodle', 'pizza', 'burger', 'sandwich', 'taco', 'sushi', 'steak', 'chicken', 'fish', 'shrimp', 'egg', 'milk', 'cheese', 'butter', 'yogurt', 'ice cream', 'cake', 'cookie', 'pie', 'candy', 'chocolate', 'honey', 'sugar', 'salt', 'pepper', 'olive', 'oil', 'vinegar', 'soup', 'salad', 'toast', 'cereal', 'pancake', 'waffle', 'coffee', 'tea', 'juice', 'soda', 'water', 'wine', 'beer', 'nut', 'almond', 'walnut', 'peanut', 'cashew', 'pistachio', 'ham', 'bacon', 'sausage', 'salami'
  ]
};

export function WordChainGame({ onClose, onBackToGames }: { onClose: () => void; onBackToGames: () => void }) {
  const { theme } = useTheme();
  const { isRTL, dir, locale } = useLocale();
  const gt = GAME_TRANSLATIONS[locale === 'ar' ? 'ar' : 'en'];
  const [gameState, setGameState] = useState<'menu' | 'playing' | 'gameover'>('menu');
  const [category, setCategory] = useState<Category | null>(null);
  const [chain, setChain] = useState<string[]>([]);
  const [currentPlayer, setCurrentPlayer] = useState<1 | 2>(1);
  const [timeLeft, setTimeLeft] = useState(10);
  const [inputValue, setInputValue] = useState('');
  const [winner, setWinner] = useState<1 | 2 | 'draw' | null>(null);
  const [highScore, setHighScore] = useState(0);
  const [scores, setScores] = useState({ 1: 0, 2: 0 });
  const [turnsPlayed, setTurnsPlayed] = useState(0);
  const [errorFeedback, setErrorFeedback] = useState<string | null>(null);
  const [lastAction, setLastAction] = useState<string | null>(null);

  const timerRef = useRef<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [showResumeModal, setShowResumeModal] = useState(false);
  const [hasSavedGame, setHasSavedGame] = useState(false);

  useEffect(() => {
    const savedScore = localStorage.getItem('wordchain-highscore');
    console.log('=== LOAD GAME STATE ===', 'wordchain-highscore', savedScore);
    if (savedScore) setHighScore(parseInt(savedScore, 10));

    const savedState = localStorage.getItem('wordchain-game-state');
    console.log('=== LOAD GAME STATE ===', 'wordchain-game-state', savedState);
    if (savedState) {
      setHasSavedGame(true);
      setShowResumeModal(true);
    }
  }, []);

  const saveGameState = () => {
    if (gameState !== 'playing') return;
    const state = {
      category, chain, currentPlayer, timeLeft,
      timestamp: Date.now()
    };
    localStorage.setItem('wordchain-game-state', JSON.stringify(state));
    console.log('=== SAVE ===', state);
    console.log('=== SAVE GAME STATE ===', 'wordchain-game-state', JSON.stringify(state));
  };

  const loadGameState = () => {
    const saved = localStorage.getItem('wordchain-game-state');
    console.log('=== LOAD GAME STATE ===', 'wordchain-game-state', saved);
    if (saved) {
      const state = JSON.parse(saved);
      setCategory(state.category);
      setChain(state.chain);
      setCurrentPlayer(state.currentPlayer);
      setTimeLeft(state.timeLeft);
      setGameState('playing');
      setShowResumeModal(false);
    }
  };

  const clearGameState = () => {
    localStorage.removeItem('wordchain-game-state');
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
  }, [gameState, category, chain, currentPlayer, timeLeft, scores, turnsPlayed]);

  const startGame = (selectedCategory: Category) => {
    setCategory(selectedCategory);

    // Pick a random starting word from the dictionary
    const dict = DICTIONARIES[selectedCategory];
    const startWord = dict[Math.floor(Math.random() * dict.length)];

    setChain([startWord]);
    setCurrentPlayer(1);
    setScores({ 1: 0, 2: 0 });
    setTurnsPlayed(0);
    setTimeLeft(10);
    setInputValue('');
    setWinner(null);
    setLastAction(null);
    setErrorFeedback(null);
    setGameState('playing');
    clearGameState();
  };

  const finishGame = (finalScores: { 1: number; 2: number }) => {
    if (finalScores[1] > finalScores[2]) setWinner(1);
    else if (finalScores[2] > finalScores[1]) setWinner(2);
    else setWinner('draw');

    setGameState('gameover');
    const totalPoints = finalScores[1] + finalScores[2];
    if (totalPoints > highScore) {
      setHighScore(totalPoints);
      localStorage.setItem('wordchain-highscore', totalPoints.toString());
    }
    clearGameState();
  };

  useEffect(() => {
    if (gameState === 'playing' && timeLeft === 0 && !winner) {
      handleTimeout();
    }
  }, [timeLeft, gameState, winner]);

  useEffect(() => {
    if (gameState === 'playing' && timeLeft > 0 && !winner) {
      const timer = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [gameState, currentPlayer, turnsPlayed, winner]);

  const handleTimeout = () => {
    setLastAction(`Player ${currentPlayer} timed out!`);
    nextTurn(false);
  };

  const nextTurn = (success: boolean) => {
    const newTurns = turnsPlayed + 1;
    const newScores = { ...scores };
    if (success) newScores[currentPlayer]++;

    setScores(newScores);
    setTurnsPlayed(newTurns);

    if (newTurns >= 10) {
      finishGame(newScores);
    } else {
      setCurrentPlayer(currentPlayer === 1 ? 2 : 1);
      setTimeLeft(10);
      setInputValue('');
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const word = inputValue.trim().toLowerCase();
    if (!word) return;

    const lastWord = chain[chain.length - 1];
    const lastLetter = lastWord.charAt(lastWord.length - 1).toLowerCase();
    const firstLetter = word.charAt(0).toLowerCase();

    setErrorFeedback(null);
    let error = null;

    if (word.length < 2) {
      error = gt.wordTooShort;
    } else if (!/^[a-z\s\-]+$/.test(word)) {
      error = gt.onlyLetters;
    } else if (firstLetter !== lastLetter) {
      error = gt.mustStartWith(lastLetter.toUpperCase());
    } else if (chain.some(c => c.toLowerCase() === word)) {
      error = gt.alreadyUsed;
    } else {
      const dictionary = category ? DICTIONARIES[category] : [];
      if (!dictionary.some(d => d.toLowerCase() === word)) {
        const catLabel = category === 'animals' ? gt.catAnimalsW : category === 'countries' ? gt.catCountries : gt.catFoods;
        error = gt.notInList(catLabel);
      }
    }

    if (error) {
      setErrorFeedback(error);
      setLastAction(`Player ${currentPlayer} missed: ${error}`);
      nextTurn(false);
      return;
    }

    // Success!
    setLastAction(`Player ${currentPlayer} got it!`);
    setChain(prev => [...prev, word]);
    nextTurn(true);
  };

  return (
    <div className="absolute inset-0 z-50 flex flex-col" style={{ backgroundColor: theme.background }} dir={dir}>
      <div className="shrink-0 flex items-center justify-between px-8" style={{ height: "88px", backgroundColor: theme.surface, borderBottom: theme.cardBorder, boxShadow: SHADOW.lg }}>
        <div className="flex items-center gap-4">
          <button onClick={onBackToGames} className="flex items-center justify-center cursor-pointer active:scale-95 transition-transform" style={{ width: "56px", height: "56px", backgroundColor: theme.surfaceElevated, borderRadius: theme.radiusMd, border: "none", outline: "none" }}>
            <ArrowLeft size={24} color={theme.textHeading} className={isRTL ? 'rotate-180' : ''} />
          </button>
          <h1 style={{ fontSize: TYPE_SCALE.xl, fontWeight: WEIGHT.bold, color: theme.textHeading }}>{gt.wordChain}</h1>
        </div>

        <div className="flex items-center gap-4">
          <div className="px-4 py-2 font-bold rounded-full flex items-center gap-2" style={{ backgroundColor: theme.primarySubtle, color: theme.primary }}>
            <Trophy size={20} />
            {gt.bestChain}: {highScore}
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
              <h2 className="text-4xl font-black mb-2" style={{ color: theme.primary }}>{gt.wordChain}</h2>
              <p className="text-lg text-gray-600">{gt.wordChainDesc}</p>
              <div className="mt-2 px-4 py-1 rounded-full text-sm font-bold inline-block" style={{ backgroundColor: theme.primarySubtle, color: theme.primary }}>{gt.twoPlayersLocal}</div>
            </div>

            <div className="w-full animate-in fade-in slide-in-from-bottom-4">
              <h3 className="text-xl font-bold mb-4 text-gray-800 text-center">{gt.selectCategory}</h3>
              <div className="grid grid-cols-3 gap-4">
                {(['animals', 'countries', 'foods'] as Category[]).map(cat => (
                  <button
                    key={cat}
                    onClick={() => startGame(cat)}
                    className="p-4 rounded-xl font-bold capitalize text-white active:scale-95 transition-all shadow-md"
                    style={{ backgroundColor: theme.primary }}
                  >
                    {cat === 'animals' ? gt.catAnimalsW : cat === 'countries' ? gt.catCountries : gt.catFoods}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {gameState === 'playing' && (
          <div className="w-full max-w-4xl flex flex-col h-full gap-6 relative">
            <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm">
              <div className={`flex items-center gap-3 transition-all ${currentPlayer === 1 ? 'scale-110' : 'text-gray-400'}`} style={{ color: currentPlayer === 1 ? theme.primary : undefined }}>
                <div className="flex flex-col items-center">
                  <User size={32} />
                  <span className="text-xs font-bold">{gt.player1}</span>
                  <span className="text-xl font-black">{scores[1]} pts</span>
                  {currentPlayer === 1 && (
                    <span className="text-sm font-black mt-2 uppercase animate-pulse" style={{ fontSize: '18px', color: theme.primary }}>
                      {gt.player1Turn}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex flex-col items-center justify-center">
                <div className={`text-5xl font-black ${timeLeft <= 3 ? 'text-red-500 animate-pulse' : ''}`} style={{ color: timeLeft > 3 ? theme.primary : undefined }}>
                  {timeLeft}s
                </div>
                <div className="text-sm font-bold text-gray-400 mt-1 uppercase tracking-wider">
                  {gt.turnOf(turnsPlayed + 1)}
                </div>
              </div>

              <div className={`flex items-center gap-3 transition-all ${currentPlayer === 2 ? 'scale-110' : 'text-gray-400'}`} style={{ color: currentPlayer === 2 ? theme.primary : undefined }}>
                <div className="flex flex-col items-center">
                  <User size={32} />
                  <span className="text-xs font-bold">{gt.player2}</span>
                  <span className="text-xl font-black">{scores[2]} pts</span>
                  {currentPlayer === 2 && (
                    <span className="text-sm font-black mt-2 uppercase animate-pulse" style={{ fontSize: '18px', color: theme.primary }}>
                      {gt.player2Turn}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {lastAction && (
              <div className="text-center animate-in fade-in slide-in-from-top-2">
                <span className="px-4 py-1 rounded-full text-sm font-bold" style={{
                  backgroundColor: lastAction.includes('got it') ? theme.primarySubtle : '#FEE2E2',
                  color: lastAction.includes('got it') ? theme.primary : '#B91C1C'
                }}>
                  {lastAction}
                </span>
              </div>
            )}

            <div className="flex-1 overflow-auto flex flex-col justify-end gap-3 pb-4">
              <div className="flex flex-wrap gap-2 content-end">
                {chain.map((word, i) => (
                  <div key={i} className="flex items-center">
                    <div className="px-4 py-2 font-bold rounded-lg text-lg capitalize border shadow-sm" style={{ backgroundColor: theme.primarySubtle, color: theme.textHeading, borderColor: theme.primary }}>
                      {word.slice(0, -1)}
                      <span className="underline underline-offset-4 decoration-2" style={{ color: theme.primary }}>{word.slice(-1)}</span>
                    </div>
                    {i < chain.length - 1 && (
                      <div className="mx-2 text-gray-400 font-black">→</div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center px-4 h-6">
                {errorFeedback ? (
                  <span className="text-sm font-bold text-red-500 animate-bounce">
                    ❌ {errorFeedback}
                  </span>
                ) : (
                  <span className="text-sm font-bold text-gray-400 uppercase tracking-widest opacity-50">
                    {gt.roundInProgress}
                  </span>
                )}
                <span className="text-sm font-bold uppercase tracking-widest" style={{ color: theme.primary }}>
                  {gt.startWith}: <span className="text-xl underline">{chain[chain.length - 1][chain[chain.length - 1].length - 1].toUpperCase()}</span>
                </span>
              </div>
              <form onSubmit={handleSubmit} className="bg-white p-4 rounded-2xl shadow-lg border border-gray-100 flex flex-col gap-2">
                <div className="flex gap-4">
                  <div className="flex-1 relative flex items-center">
                    <div className="absolute left-6 text-3xl font-black pointer-events-none select-none opacity-20" style={{ color: theme.primary }}>
                      {chain[chain.length - 1][chain[chain.length - 1].length - 1].toUpperCase()}
                    </div>
                    <input
                      ref={inputRef}
                      type="text"
                      autoFocus
                      value={inputValue}
                      onChange={e => setInputValue(e.target.value)}
                      placeholder={gt.typeWordIn(category === 'animals' ? gt.catAnimalsW : category === 'countries' ? gt.catCountries : gt.catFoods)}
                      className="w-full h-16 pl-14 pr-4 text-2xl font-bold bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none transition-colors uppercase"
                      style={{ focusBorderColor: theme.primary } as any}
                    />
                  </div>
                  <button type="submit" className="px-8 h-16 text-white font-bold text-xl rounded-xl active:scale-95 transition-all shadow-md" style={{ backgroundColor: theme.primary }}>
                    {gt.submit}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {gameState === 'gameover' && (
          <div className="w-full max-w-2xl flex flex-col items-center gap-8 bg-white p-10 rounded-3xl shadow-xl animate-in zoom-in-95">
            <Trophy size={80} className="text-yellow-400" />

            <div className="text-center">
              <h2 className="text-5xl font-black mb-2 text-gray-800">
                {winner === 'draw' ? gt.itsADrawW : winner === 1 ? gt.player1Wins : gt.player2Wins}
              </h2>
              <div className="flex justify-center gap-8 mt-6">
                <div className="text-center">
                  <p className="text-sm font-bold text-gray-400 uppercase">{gt.player1}</p>
                  <p className="text-3xl font-black" style={{ color: theme.primary }}>{scores[1]}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm font-bold text-gray-400 uppercase">{gt.player2}</p>
                  <p className="text-3xl font-black" style={{ color: theme.primary }}>{scores[2]}</p>
                </div>
              </div>
            </div>

            <div className="flex flex-col w-full gap-4 mt-4">
              <button onClick={() => setGameState('menu')} className="w-full py-5 text-white font-bold text-xl rounded-2xl shadow-lg active:scale-95 transition-all hover:brightness-110" style={{ backgroundColor: theme.primary }}>
                {gt.playAgain}
              </button>
              <button onClick={onBackToGames} className="w-full py-5 bg-gray-100 text-gray-700 font-bold text-xl rounded-2xl active:scale-95 transition-all hover:bg-gray-200">
                {gt.backToGames}
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
            <div className="w-24 h-24 rounded-full flex items-center justify-center" style={{ backgroundColor: theme.primarySubtle }}>
              <RotateCcw size={48} style={{ color: theme.primary }} />
            </div>

            <div className="text-center gap-2 flex flex-col">
              <h2 style={{ fontSize: TYPE_SCALE["2xl"], fontWeight: WEIGHT.bold, color: theme.textHeading }}>
                {gt.resumeGame}
              </h2>
              <p style={{ fontSize: TYPE_SCALE.md, color: theme.textMuted }}>
                {gt.resumeDesc}
              </p>
            </div>

            <div className="flex flex-col gap-4 w-full">
              <button
                onClick={loadGameState}
                className="w-full py-5 rounded-2xl font-bold flex items-center justify-center gap-3 transition-all hover:brightness-110 active:scale-95 text-white shadow-md"
                style={{ fontSize: TYPE_SCALE.md, backgroundColor: theme.primary }}
              >
                {gt.continuePlaying}
              </button>
              <button
                onClick={handleNewGameFromResume}
                className="w-full py-5 rounded-2xl font-bold transition-all hover:bg-gray-100 active:scale-95 border-2 border-gray-200"
                style={{ backgroundColor: theme.surfaceElevated, color: theme.textHeading, fontSize: TYPE_SCALE.md }}
              >
                {gt.startNewGame}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
