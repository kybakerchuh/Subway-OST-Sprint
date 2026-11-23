import { onAuthStateChanged, signInWithPopup, signOut, User } from 'firebase/auth';
import {
  Award,
  BookOpen,
  Calendar,
  Coins,
  Flame,
  LogIn,
  LogOut,
  MapPin,
  Pause,
  Play,
  RefreshCw,
  RotateCcw,
  Shield,
  SlidersHorizontal,
  Trophy,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { soundEngine } from './audio/soundEngine';
import { ErrorBoundary } from './components/ErrorBoundary';
import { GarageModal } from './components/GarageModal';
import { LeaderboardModal } from './components/LeaderboardModal';
import { MissionsModal } from './components/MissionsModal';
import { QuestionModal } from './components/QuestionModal';
import { TopicSelectorModal } from './components/TopicSelectorModal';
import { getMissionSetForLevel, MAX_MULTIPLIER_LEVEL } from './data/missions';
import { pickNextQuestion } from './data/questions';
import { getTopicById, HOVERBOARDS, WORLD_TOURS } from './data/topics';
import {
  createFreshWeeklyChallenge,
  getCurrentWeekId,
  getWeeklyChallengeById,
} from './data/weeklyChallenges';
import { auth, googleProvider } from './firebase';
import { SubwayRunnerEngine } from './game/SubwayRunnerEngine';
import {
  DEFAULT_PROGRESS,
  extractFirstName,
  loadLocalProgress,
  sanitizeBoards,
  saveCloudProgress,
  saveLocalProgress,
  syncUserOnSignIn,
} from './services/progressService';
import {
  GamePhase,
  HudSnapshot,
  MissionStatKey,
  OstLetter,
  OstQuestion,
  QuizTriggerReason,
  RunStatsSnapshot,
  TopicId,
  UserProgress,
  WeeklyChallengeDefinition,
  WorldTourId,
} from './types/game';

const INITIAL_RUN_STATS: RunStatsSnapshot = {
  coins: 0,
  distance: 0,
  score: 0,
  jumps: 0,
  slides: 0,
  powerups: 0,
  trainRoofs: 0,
  boardsUsed: 0,
};

const INITIAL_HUD: HudSnapshot = {
  score: 0,
  distance: 0,
  coins: 0,
  baseMultiplier: 1,
  multiplier: 1,
  speed: 19,
  quizTimerRemaining: 30,
  magnetRemaining: 0,
  doubleScoreRemaining: 0,
  superSneakersRemaining: 0,
  jetpackRemaining: 0,
  boardActive: false,
  boardCooldown: 0,
  chaserAlert: false,
  collectedOstLetters: [],
  runStats: INITIAL_RUN_STATS,
};

const OST_WORD_SLOTS: OstLetter[] = ['O', 'S', 'T'];

function advanceMissions(
  prev: UserProgress,
  deltas: Partial<Record<MissionStatKey, number>>,
  singleRun: Partial<Record<MissionStatKey, number>>,
): {
  next: UserProgress;
  changed: boolean;
  completedNewMission: boolean;
  leveledUpTo: number | null;
} {
  const level = Math.max(1, Math.min(MAX_MULTIPLIER_LEVEL, prev.multiplierLevel));
  const missions = getMissionSetForLevel(level);
  const nextArr: [number, number, number] = [...prev.missionProgress];
  let changed = false;
  let completedNewMission = false;

  for (let i = 0; i < 3; i++) {
    const m = missions[i];
    const oldVal = nextArr[i];
    if (oldVal >= m.target) continue;

    let updatedVal = oldVal;
    if (m.isSingleRun) {
      const candidate = Math.floor(singleRun[m.stat] ?? 0);
      if (candidate > oldVal) {
        updatedVal = Math.min(m.target, candidate);
      }
    } else {
      const delta = Math.floor(deltas[m.stat] ?? 0);
      if (delta > 0) {
        updatedVal = Math.min(m.target, oldVal + delta);
      }
    }

    if (updatedVal !== oldVal) {
      nextArr[i] = updatedVal;
      changed = true;
      if (updatedVal >= m.target) {
        completedNewMission = true;
      }
    }
  }

  if (!changed) {
    return { next: prev, changed: false, completedNewMission: false, leveledUpTo: null };
  }

  const allComplete =
    nextArr[0] >= missions[0].target &&
    nextArr[1] >= missions[1].target &&
    nextArr[2] >= missions[2].target;

  if (allComplete && level < MAX_MULTIPLIER_LEVEL) {
    const nextLevel = level + 1;
    return {
      next: {
        ...prev,
        multiplierLevel: nextLevel,
        missionProgress: [0, 0, 0],
        totalCoins: prev.totalCoins + 25,
      },
      changed: true,
      completedNewMission: true,
      leveledUpTo: nextLevel,
    };
  }

  return {
    next: {
      ...prev,
      missionProgress: nextArr,
    },
    changed: true,
    completedNewMission,
    leveledUpTo: null,
  };
}

function advanceWeeklyChallenge(
  prev: UserProgress,
  deltaCoins: number,
  ostAnsweredDelta: number,
  ostCorrectDelta: number,
): {
  next: UserProgress;
  changed: boolean;
  completedChallenge: WeeklyChallengeDefinition | null;
} {
  const currentWeek = getCurrentWeekId();
  const baseState =
    prev.weeklyChallenge && prev.weeklyChallenge.weekId === currentWeek
      ? prev.weeklyChallenge
      : createFreshWeeklyChallenge();

  if (baseState.completed) {
    if (baseState !== prev.weeklyChallenge) {
      return {
        next: { ...prev, weeklyChallenge: baseState },
        changed: true,
        completedChallenge: null,
      };
    }
    return { next: prev, changed: false, completedChallenge: null };
  }

  const def = getWeeklyChallengeById(baseState.challengeId);
  let delta = 0;
  if (def.category === 'coins') delta = deltaCoins;
  else if (def.category === 'ost_answered') delta = ostAnsweredDelta;
  else if (def.category === 'ost_correct') delta = ostCorrectDelta;

  if (delta <= 0) {
    if (baseState !== prev.weeklyChallenge) {
      return {
        next: { ...prev, weeklyChallenge: baseState },
        changed: true,
        completedChallenge: null,
      };
    }
    return { next: prev, changed: false, completedChallenge: null };
  }

  const nextVal = Math.min(def.target, baseState.progress + delta);
  const justCompleted = nextVal >= def.target;

  return {
    next: {
      ...prev,
      totalCoins: justCompleted ? prev.totalCoins + def.rewardCoins : prev.totalCoins,
      weeklyChallenge: {
        ...baseState,
        progress: nextVal,
        completed: justCompleted,
        completedCount: justCompleted ? baseState.completedCount + 1 : baseState.completedCount,
      },
    },
    changed: true,
    completedChallenge: justCompleted ? def : null,
  };
}

function AppContent() {
  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<SubwayRunnerEngine | null>(null);
  const recentQuestionIdsRef = useRef<Set<string>>(new Set());
  const prevRunStatsRef = useRef<RunStatsSnapshot>(INITIAL_RUN_STATS);

  const [authUser, setAuthUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [progress, setProgress] = useState<UserProgress>(() => loadLocalProgress());
  const progressRef = useRef<UserProgress>(progress);
  progressRef.current = progress;

  const [phase, setPhase] = useState<GamePhase>('menu');
  const [hud, setHud] = useState<HudSnapshot>(INITIAL_HUD);
  const [muted, setMuted] = useState(false);

  const [activeQuestion, setActiveQuestion] = useState<OstQuestion | null>(null);
  const [quizReason, setQuizReason] = useState<QuizTriggerReason>('timer');
  const [bonusScore, setBonusScore] = useState(0);
  const [bonusCoins, setBonusCoins] = useState(0);
  const [runCorrectCount, setRunCorrectCount] = useState(0);
  const [runAnsweredCount, setRunAnsweredCount] = useState(0);
  const [isNewHighScore, setIsNewHighScore] = useState(false);

  const [showTopics, setShowTopics] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showGarage, setShowGarage] = useState(false);
  const [showMissions, setShowMissions] = useState(false);
  const [worldId, setWorldId] = useState<WorldTourId>('metro');
  const [eventToast, setEventToast] = useState<string | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  const cycleWorldTour = () => {
    const idx = WORLD_TOURS.findIndex((w) => w.id === worldId);
    const next = WORLD_TOURS[(idx + 1) % WORLD_TOURS.length];
    setWorldId(next.id);
    engineRef.current?.setWorldTheme(next.id);
  };

  const showToast = useCallback((message: string) => {
    setEventToast(message);
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => {
      setEventToast(null);
    }, 2200);
  }, []);

  const persistProgress = useCallback(
    (next: UserProgress, runScore = 0, runCoins = 0, syncCloud = true) => {
      const activeUser = auth.currentUser;
      const normalized: UserProgress = activeUser
        ? {
            ...next,
            uid: activeUser.uid,
            displayName: extractFirstName(activeUser.displayName, activeUser.email),
          }
        : next;
      progressRef.current = normalized;
      setProgress(normalized);
      saveLocalProgress(normalized);
      if (syncCloud && normalized.uid) {
        void saveCloudProgress(normalized, runScore, runCoins, true).catch((err) => {
          console.error('Cloud save error:', err);
        });
      }
    },
    [],
  );

  // Firebase Auth listener
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setAuthUser(user);
      if (user) {
        setAuthError(null);
        const firstName = extractFirstName(user.displayName, user.email);
        const sameAccount = !progressRef.current.uid || progressRef.current.uid === user.uid;
        const baseLocal: UserProgress = sameAccount
          ? progressRef.current
          : { ...DEFAULT_PROGRESS, weeklyChallenge: createFreshWeeklyChallenge() };
        const immediate: UserProgress = {
          ...baseLocal,
          uid: user.uid,
          displayName: firstName,
        };
        progressRef.current = immediate;
        setProgress(immediate);
        saveLocalProgress(immediate);

        void syncUserOnSignIn(user, immediate)
          .then((merged) => {
            const live = progressRef.current;
            const liveCorrect = Math.max(merged.totalCorrectOst, live.totalCorrectOst);
            const liveAnswered = Math.max(liveCorrect, merged.totalAnsweredOst, live.totalAnsweredOst);
            const reconciled: UserProgress = {
              ...merged,
              uid: user.uid,
              displayName: firstName,
              highScore: Math.max(merged.highScore, live.highScore),
              totalCoins: Math.max(merged.totalCoins, live.totalCoins),
              totalRuns: Math.max(merged.totalRuns, live.totalRuns),
              totalCorrectOst: liveCorrect,
              totalAnsweredOst: liveAnswered,
              multiplierLevel: Math.max(merged.multiplierLevel, live.multiplierLevel),
              ostWordsCompleted: Math.max(merged.ostWordsCompleted, live.ostWordsCompleted),
            };
            progressRef.current = reconciled;
            setProgress(reconciled);
            saveLocalProgress(reconciled);
            engineRef.current?.setBoardSkin(reconciled.selectedBoard);
            engineRef.current?.setBaseMultiplier(reconciled.multiplierLevel);
          })
          .catch((err) => {
            console.error('Sign-in sync error:', err);
            setAuthError('Signed in, but cloud leaderboard sync hit a snag. Progress saved locally.');
          });
      }
    });
    return () => unsub();
  }, []);

  const applyRunMissionProgress = useCallback(
    (snap: HudSnapshot) => {
      const prevStats = prevRunStatsRef.current;
      const cur = snap.runStats;
      const deltaCoins = Math.max(0, cur.coins - prevStats.coins);
      const deltaDist = Math.max(0, cur.distance - prevStats.distance);
      const deltaPower = Math.max(0, cur.powerups - prevStats.powerups);
      const deltaRoofs = Math.max(0, cur.trainRoofs - prevStats.trainRoofs);
      const deltaBoards = Math.max(0, cur.boardsUsed - prevStats.boardsUsed);
      const deltaJumps = Math.max(0, cur.jumps - prevStats.jumps);
      const deltaSlides = Math.max(0, cur.slides - prevStats.slides);

      if (
        deltaCoins === 0 &&
        deltaDist === 0 &&
        deltaPower === 0 &&
        deltaRoofs === 0 &&
        deltaBoards === 0 &&
        deltaJumps === 0 &&
        deltaSlides === 0 &&
        cur.score === prevStats.score
      ) {
        return;
      }

      prevRunStatsRef.current = cur;

      const missionEval = advanceMissions(
        progressRef.current,
        {
          totalCoins: deltaCoins,
          totalDistance: deltaDist,
          runPowerups: deltaPower,
          runTrainRoofs: deltaRoofs,
          runBoards: deltaBoards,
        },
        {
          runCoins: cur.coins,
          runDistance: cur.distance,
          runScore: cur.score,
          runJumps: cur.jumps,
          runSlides: cur.slides,
          runPowerups: cur.powerups,
          runTrainRoofs: cur.trainRoofs,
          runBoards: cur.boardsUsed,
        },
      );

      const weeklyEval = advanceWeeklyChallenge(missionEval.next, deltaCoins, 0, 0);
      const next = weeklyEval.next;
      const shouldSyncCloud =
        missionEval.leveledUpTo !== null || weeklyEval.completedChallenge !== null;

      if (missionEval.changed || weeklyEval.changed) {
        if (missionEval.leveledUpTo !== null) {
          engineRef.current?.setBaseMultiplier(missionEval.leveledUpTo);
          soundEngine.playQuizCorrect();
          showToast(`Level Up! Score Multiplier ${missionEval.leveledUpTo}x (+25 Coins)`);
        } else if (weeklyEval.completedChallenge) {
          soundEngine.playQuizCorrect();
          showToast(
            `Weekly Challenge Complete! +${weeklyEval.completedChallenge.rewardCoins} Coins`,
          );
        } else if (missionEval.completedNewMission) {
          showToast('Mission Complete!');
        }
        persistProgress(next, 0, 0, shouldSyncCloud);
      }
    },
    [persistProgress, showToast],
  );

  // Mount Three.js 3D Engine once
  useEffect(() => {
    const mount = canvasMountRef.current;
    if (!mount) return;

    const engine = new SubwayRunnerEngine(
      mount,
      {
        onHudUpdate: (snap) => {
          setHud(snap);
          applyRunMissionProgress(snap);
        },
        onQuizTrigger: (reason, snap) => {
          setHud(snap);
          applyRunMissionProgress(snap);
          const q = pickNextQuestion(
            progressRef.current.selectedTopic,
            recentQuestionIdsRef.current,
          );
          setActiveQuestion(q);
          setQuizReason(reason);
          setPhase('quiz');
        },
        onEventToast: (message) => {
          showToast(message);
        },
      },
      progressRef.current.selectedBoard,
      progressRef.current.multiplierLevel,
      'metro',
    );

    engineRef.current = engine;
    return () => {
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
      engine.dispose();
      engineRef.current = null;
    };
  }, [applyRunMissionProgress, showToast]);

  // Escape / P shortcut for smooth pause & resume
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (showTopics || showLeaderboard || showGarage || showMissions) return;
      if (e.code === 'Escape' || e.code === 'KeyP') {
        if (phase === 'running') {
          e.preventDefault();
          engineRef.current?.pause();
          setPhase('paused');
        } else if (phase === 'paused') {
          e.preventDefault();
          setPhase('running');
          engineRef.current?.resume();
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase, showTopics, showLeaderboard, showGarage, showMissions]);

  const handleGoogleSignIn = async () => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      const code =
        typeof err === 'object' && err !== null && 'code' in err
          ? String((err as { code?: unknown }).code)
          : '';
      if (code === 'auth/unauthorized-domain') {
        const host = typeof window !== 'undefined' ? window.location.hostname : 'this domain';
        setAuthError(
          `Add "${host}" under Firebase Console → Authentication → Settings → Authorized domains to enable Google Sign-In here. Local progress still saves automatically.`,
        );
      } else {
        setAuthError(
          err instanceof Error
            ? err.message
            : 'Google sign-in popup was closed or blocked.',
        );
      }
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
    const guest: UserProgress = {
      ...DEFAULT_PROGRESS,
      weeklyChallenge: createFreshWeeklyChallenge(),
      selectedTopic: progress.selectedTopic,
    };
    progressRef.current = guest;
    setProgress(guest);
    saveLocalProgress(guest);
    engineRef.current?.setBaseMultiplier(1);
    engineRef.current?.setBoardSkin('metro-amber');
  };

  const startRun = () => {
    prevRunStatsRef.current = INITIAL_RUN_STATS;
    setBonusScore(0);
    setBonusCoins(0);
    setRunCorrectCount(0);
    setRunAnsweredCount(0);
    setIsNewHighScore(false);
    setActiveQuestion(null);
    setPhase('running');
    engineRef.current?.setBaseMultiplier(progressRef.current.multiplierLevel);
    engineRef.current?.setBoardSkin(progressRef.current.selectedBoard);
    engineRef.current?.startNewRun();
  };

  const finalizeRun = (snap: HudSnapshot, extraScore = bonusScore, extraCoins = bonusCoins) => {
    const finalScore = snap.score + extraScore;
    const totalRunCoins = snap.coins + extraCoins;
    const prev = progressRef.current;
    const beatHigh = finalScore > prev.highScore;
    setIsNewHighScore(beatHigh);

    const updated: UserProgress = {
      ...prev,
      highScore: Math.max(prev.highScore, finalScore),
      totalCoins: prev.totalCoins + totalRunCoins,
      totalRuns: prev.totalRuns + 1,
    };
    persistProgress(updated, finalScore, totalRunCoins, true);
    setPhase('gameover');
  };

  const handleQuizAnswer = (isCorrect: boolean) => {
    if (!activeQuestion) return;
    if (isCorrect) {
      soundEngine.playQuizCorrect();
    } else {
      soundEngine.playQuizWrong();
    }

    const prev = progressRef.current;
    const multLv = Math.max(1, prev.multiplierLevel);

    setRunAnsweredCount((c) => c + 1);
    if (isCorrect) {
      setRunCorrectCount((c) => c + 1);
      if (quizReason === 'wordhunt') {
        const pts = 500 * multLv;
        setBonusScore((s) => s + pts);
        setBonusCoins((c) => c + 25);
        showToast(`+${pts.toLocaleString()} pts · +25 Coins!`);
      } else if (quizReason === 'timer') {
        const pts = 250 * multLv;
        setBonusScore((s) => s + pts);
        setBonusCoins((c) => c + 10);
        showToast(`+${pts.toLocaleString()} pts · +10 Coins`);
      }
    }

    const nextCorrectTotal = prev.totalCorrectOst + (isCorrect ? 1 : 0);
    const nextWordsCompleted = prev.ostWordsCompleted + (quizReason === 'wordhunt' ? 1 : 0);
    const prevBoards = new Set(prev.unlockedBoards);
    const nextBoards = sanitizeBoards(prev.unlockedBoards, nextCorrectTotal);

    // Notify if a new OST mastery hoverboard just unlocked
    for (const bId of nextBoards) {
      if (!prevBoards.has(bId)) {
        const unlockedSkin = HOVERBOARDS.find((b) => b.id === bId);
        if (unlockedSkin) {
          showToast(`New Hoverboard Unlocked: ${unlockedSkin.name}!`);
        }
      }
    }

    const topicKey = activeQuestion.topicId;
    let updated: UserProgress = {
      ...prev,
      totalCorrectOst: nextCorrectTotal,
      totalAnsweredOst: prev.totalAnsweredOst + 1,
      ostWordsCompleted: nextWordsCompleted,
      unlockedBoards: nextBoards,
      topicCorrectCounts: {
        ...prev.topicCorrectCounts,
        [topicKey]: (prev.topicCorrectCounts[topicKey] ?? 0) + (isCorrect ? 1 : 0),
      },
      topicAnsweredCounts: {
        ...prev.topicAnsweredCounts,
        [topicKey]: (prev.topicAnsweredCounts[topicKey] ?? 0) + 1,
      },
    };

    const missionEval = advanceMissions(
      updated,
      {
        ostCorrect: isCorrect ? 1 : 0,
        ostWords: quizReason === 'wordhunt' ? 1 : 0,
      },
      {},
    );
    updated = missionEval.next;
    if (missionEval.leveledUpTo !== null) {
      engineRef.current?.setBaseMultiplier(missionEval.leveledUpTo);
      showToast(`Level Up! Score Multiplier ${missionEval.leveledUpTo}x (+25 Coins)`);
    }

    const weeklyEval = advanceWeeklyChallenge(updated, 0, 1, isCorrect ? 1 : 0);
    updated = weeklyEval.next;
    if (weeklyEval.completedChallenge) {
      soundEngine.playQuizCorrect();
      showToast(
        `Weekly Challenge Complete! +${weeklyEval.completedChallenge.rewardCoins} Coins`,
      );
    }

    persistProgress(updated, 0, 0, true);
  };

  const handleQuizContinue = (wasCorrect: boolean) => {
    const snap = engineRef.current?.getSnapshot() ?? hud;
    const prevReason = quizReason;
    setActiveQuestion(null);

    if (prevReason === 'crash' && !wasCorrect) {
      finalizeRun(snap);
      return;
    }

    setPhase('running');
    engineRef.current?.resume({
      resetQuizTimer: prevReason === 'timer',
      grantGraceShield: prevReason === 'crash' && wasCorrect,
      resetOstWord: prevReason === 'wordhunt',
    });
  };

  const handleSelectTopic = (topicId: TopicId) => {
    const updated: UserProgress = {
      ...progressRef.current,
      selectedTopic: topicId,
    };
    persistProgress(updated, 0, 0, true);
  };

  const handleShuffleWeeklyChallenge = () => {
    const prev = progressRef.current;
    const curState = prev.weeklyChallenge;
    const curDef = getWeeklyChallengeById(curState.challengeId);
    const nextState = createFreshWeeklyChallenge(
      curState.challengeId,
      curDef.category,
      curState.completedCount,
    );
    const nextDef = getWeeklyChallengeById(nextState.challengeId);
    persistProgress(
      {
        ...prev,
        weeklyChallenge: nextState,
      },
      0,
      0,
      true,
    );
    showToast(`Weekly Challenge: ${nextDef.title}`);
  };

  const handleSelectOrBuyBoard = (boardId: string, cost: number) => {
    const prev = progressRef.current;
    const board = HOVERBOARDS.find((b) => b.id === boardId);
    const milestoneMet =
      typeof board?.requiredCorrectOst === 'number' &&
      prev.totalCorrectOst >= board.requiredCorrectOst;
    const alreadyOwned = prev.unlockedBoards.includes(boardId) || milestoneMet;

    if (!alreadyOwned && (typeof board?.requiredCorrectOst === 'number' || prev.totalCoins < cost)) {
      return;
    }

    const updated: UserProgress = {
      ...prev,
      totalCoins: alreadyOwned ? prev.totalCoins : prev.totalCoins - cost,
      unlockedBoards: sanitizeBoards([...prev.unlockedBoards, boardId], prev.totalCorrectOst),
      selectedBoard: boardId,
    };
    persistProgress(updated, 0, 0, true);
    engineRef.current?.setBoardSkin(boardId);
  };

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    soundEngine.setMuted(next);
  };

  const handlePause = () => {
    if (phase !== 'running') return;
    engineRef.current?.pause();
    setPhase('paused');
  };

  const handleResumeFromPause = () => {
    if (phase !== 'paused') return;
    setPhase('running');
    engineRef.current?.resume();
  };

  const handleQuitToMenu = () => {
    const snap = engineRef.current?.getSnapshot() ?? hud;
    if (snap.score > 0 || snap.coins > 0 || runAnsweredCount > 0) {
      const prev = progressRef.current;
      const finalScore = snap.score + bonusScore;
      const totalRunCoins = snap.coins + bonusCoins;
      persistProgress(
        {
          ...prev,
          highScore: Math.max(prev.highScore, finalScore),
          totalCoins: prev.totalCoins + totalRunCoins,
          totalRuns: prev.totalRuns + 1,
        },
        finalScore,
        totalRunCoins,
        true,
      );
    }
    engineRef.current?.returnToMenu();
    setPhase('menu');
  };

  const activeDisplayName = authUser
    ? extractFirstName(authUser.displayName, authUser.email)
    : progress.displayName;
  const currentTopic = getTopicById(progress.selectedTopic);
  const weeklyDef = getWeeklyChallengeById(progress.weeklyChallenge.challengeId);
  const weeklyCurrent = Math.min(weeklyDef.target, progress.weeklyChallenge.progress);
  const weeklyPct = Math.min(100, (weeklyCurrent / weeklyDef.target) * 100);
  const displayScore = hud.score + bonusScore;
  const displayCoins = hud.coins + bonusCoins;
  const timerPct = Math.max(0, Math.min(100, (hud.quizTimerRemaining / 30) * 100));

  return (
    <div className="relative w-full h-full overflow-hidden select-none bg-slate-950">
      {/* Dedicated Three.js WebGL Mount Container */}
      <div ref={canvasMountRef} className="fixed inset-0 z-0" />

      {/* RUNNING HUD */}
      {phase === 'running' && (
        <>
          <div className="fixed top-3 left-3 right-3 z-20 flex items-start justify-between gap-2 pointer-events-none">
            <div className="bg-slate-950/82 border border-white/15 rounded-2xl px-3.5 py-2.5 space-y-1.5 pointer-events-auto min-w-[180px] sm:min-w-[224px]">
              <div className="flex items-baseline justify-between gap-3">
                <span className="font-mono-num text-xl sm:text-2xl font-bold text-white leading-none">
                  {displayScore.toLocaleString()}
                </span>
                <span
                  className={`font-mono-num text-xs sm:text-sm font-extrabold px-2 py-0.5 rounded-md ${
                    hud.doubleScoreRemaining > 0
                      ? 'bg-sky-500 text-slate-950'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-400/40'
                  }`}
                >
                  {hud.multiplier}x
                </span>
              </div>

              <div className="flex items-center justify-between gap-2 text-xs text-slate-300">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 font-mono-num font-semibold text-amber-300">
                    <Coins className="w-3.5 h-3.5" />
                    {displayCoins}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono-num">{hud.distance}m</span>
                </div>

                {/* O-S-T Word Hunt Slots */}
                <div className="flex items-center gap-1" aria-label="OST Word Hunt Progress">
                  {OST_WORD_SLOTS.map((letter) => {
                    const collected = hud.collectedOstLetters.includes(letter);
                    return (
                      <span
                        key={letter}
                        className={`w-5 h-5 rounded font-mono-num text-[11px] font-extrabold flex items-center justify-center border ${
                          collected
                            ? 'bg-emerald-400 border-emerald-200 text-slate-950'
                            : 'bg-slate-900/90 border-slate-700 text-slate-500'
                        }`}
                      >
                        {letter}
                      </span>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-1 pt-0.5">
                <div className="flex items-center justify-between text-[11px] text-slate-300 font-mono-num">
                  <span>OST Quiz</span>
                  <span>{Math.ceil(hud.quizTimerRemaining)}s</span>
                </div>
                <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-400 transition-[width] duration-100"
                    style={{ width: `${timerPct}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 pointer-events-auto">
              <div className="hidden sm:block bg-slate-950/80 border border-white/15 rounded-xl px-3 py-2 text-xs font-medium text-slate-200 whitespace-nowrap">
                {currentTopic.shortTitle}
              </div>

              <button
                type="button"
                onClick={toggleMute}
                aria-label={muted ? 'Unmute audio' : 'Mute audio'}
                className="min-w-[44px] min-h-[44px] rounded-xl bg-slate-950/80 hover:bg-slate-900 border border-white/15 text-white flex items-center justify-center transition-colors"
              >
                {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>

              <button
                type="button"
                onClick={handlePause}
                aria-label="Pause run"
                className="min-w-[44px] min-h-[44px] rounded-xl bg-slate-950/80 hover:bg-slate-900 border border-white/15 text-white flex items-center justify-center transition-colors"
              >
                <Pause className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Active Powerups & Hoverboard Shield Trigger */}
          <div className="fixed bottom-4 left-3 right-3 z-20 flex items-end justify-between pointer-events-none">
            <div className="flex flex-col gap-1.5">
              {hud.chaserAlert && (
                <div className="bg-rose-950/90 border border-rose-400/60 rounded-xl px-3 py-1.5 text-xs font-semibold text-rose-200">
                  Inspector Chasing! Avoid Stumbles
                </div>
              )}
              {hud.jetpackRemaining > 0 && (
                <div className="bg-slate-950/85 border border-pink-400/50 rounded-xl px-3 py-1.5 text-xs font-mono-num text-pink-200">
                  Paint Jetpack · {Math.ceil(hud.jetpackRemaining)}s
                </div>
              )}
              {hud.superSneakersRemaining > 0 && (
                <div className="bg-slate-950/85 border border-orange-400/50 rounded-xl px-3 py-1.5 text-xs font-mono-num text-orange-200">
                  Super Sneakers · {Math.ceil(hud.superSneakersRemaining)}s
                </div>
              )}
              {hud.magnetRemaining > 0 && (
                <div className="bg-slate-950/85 border border-rose-400/50 rounded-xl px-3 py-1.5 text-xs font-mono-num text-rose-200">
                  Coin Magnet · {Math.ceil(hud.magnetRemaining)}s
                </div>
              )}
              {hud.doubleScoreRemaining > 0 && (
                <div className="bg-slate-950/85 border border-sky-400/50 rounded-xl px-3 py-1.5 text-xs font-mono-num text-sky-200">
                  2x Multiplier · {Math.ceil(hud.doubleScoreRemaining)}s
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => engineRef.current?.activateHoverboard()}
              disabled={hud.boardActive || hud.boardCooldown > 0 || hud.jetpackRemaining > 0}
              className={`pointer-events-auto min-h-[48px] px-4 py-2.5 rounded-2xl border font-semibold text-xs sm:text-sm flex items-center gap-2 transition-colors ${
                hud.boardActive
                  ? 'bg-amber-500 border-amber-300 text-slate-950'
                  : hud.boardCooldown > 0 || hud.jetpackRemaining > 0
                    ? 'bg-slate-950/75 border-slate-700 text-slate-400'
                    : 'bg-slate-950/85 hover:bg-slate-900 border-amber-400/60 text-amber-300'
              }`}
            >
              <Shield className="w-4 h-4 shrink-0" />
              <span className="font-mono-num whitespace-nowrap">
                {hud.boardActive
                  ? 'Board Shield Active'
                  : hud.boardCooldown > 0
                    ? `Board ${Math.ceil(hud.boardCooldown)}s`
                    : 'Hoverboard (H / 2x Tap)'}
              </span>
            </button>
          </div>
        </>
      )}

      {/* TITLE / MENU OVERLAY */}
      {phase === 'menu' && (
        <div className="fixed inset-0 z-20 flex flex-col justify-between p-3 sm:p-6 pointer-events-none">
          {/* Top Bar */}
          <header className="w-full max-w-6xl mx-auto bg-slate-950/85 border border-white/15 rounded-2xl px-4 py-2.5 pointer-events-auto space-y-2">
            <div className="flex items-center justify-between gap-4">
              <div className="font-display text-lg sm:text-xl font-extrabold tracking-tight text-white whitespace-nowrap shrink-0">
                Subway OST Sprint
              </div>

              <div className="hidden md:flex items-center gap-4 text-xs font-mono-num text-slate-300 whitespace-nowrap">
                <span className="text-amber-400 font-bold">Mult {progress.multiplierLevel}x</span>
                <span aria-hidden="true">·</span>
                <span>Best {progress.highScore.toLocaleString()}</span>
                <span aria-hidden="true">·</span>
                <span>{progress.totalCorrectOst} OST Correct</span>
                <span aria-hidden="true">·</span>
                <span className="text-amber-300">{progress.totalCoins.toLocaleString()} Coins</span>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={toggleMute}
                  aria-label={muted ? 'Unmute audio' : 'Mute audio'}
                  className="min-w-[44px] min-h-[44px] rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 flex items-center justify-center transition-colors"
                >
                  {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </button>

                {authUser ? (
                  <button
                    type="button"
                    onClick={() => void handleSignOut()}
                    aria-label="Sign out of Google account"
                    className="min-h-[44px] px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs font-semibold flex items-center gap-2 transition-colors whitespace-nowrap shrink-0"
                  >
                    <span className="max-w-[110px] truncate">{activeDisplayName}</span>
                    <LogOut className="w-3.5 h-3.5 text-slate-400" />
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={authLoading}
                    onClick={() => void handleGoogleSignIn()}
                    className="min-h-[44px] px-4 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-950 text-xs sm:text-sm font-bold flex items-center gap-2 transition-colors whitespace-nowrap shrink-0"
                  >
                    <LogIn className="w-4 h-4" />
                    <span>{authLoading ? 'Signing in...' : 'Sign in with Google'}</span>
                  </button>
                )}
              </div>
            </div>

            <div className="flex md:hidden items-center justify-between gap-2 text-[11px] font-mono-num text-slate-300 border-t border-white/10 pt-1.5">
              <span className="text-amber-400 font-bold">{progress.multiplierLevel}x</span>
              <span>Best {progress.highScore.toLocaleString()}</span>
              <span>{progress.totalCorrectOst} OST</span>
              <span className="text-amber-300">{progress.totalCoins.toLocaleString()} Coins</span>
            </div>
          </header>

          {authError && (
            <div className="max-w-md mx-auto bg-rose-950/90 border border-rose-500/50 text-rose-100 text-xs rounded-xl px-4 py-2 pointer-events-auto">
              {authError}
            </div>
          )}

          {/* Bottom Thumb-Zone Action Dock */}
          <div className="w-full max-w-4xl mx-auto bg-slate-950/88 border border-white/15 rounded-2xl p-4 sm:p-5 pointer-events-auto space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-0.5 min-w-0">
                <div className="text-xs text-amber-400 font-semibold">
                  Algebra 1 OST Playbook · {currentTopic.playbookSection}
                </div>
                <div className="font-display text-lg sm:text-xl font-bold text-white truncate">
                  {currentTopic.title}
                </div>
                <p className="text-xs text-slate-300 truncate">{currentTopic.description}</p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={cycleWorldTour}
                  className="min-h-[44px] px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-100 text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-colors whitespace-nowrap shrink-0"
                >
                  <MapPin className="w-4 h-4 text-sky-400" />
                  <span>{(WORLD_TOURS.find((w) => w.id === worldId) ?? WORLD_TOURS[0]).name}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowTopics(true)}
                  className="min-h-[44px] px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-100 text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-colors whitespace-nowrap shrink-0"
                >
                  <BookOpen className="w-4 h-4 text-amber-400" />
                  <span>Change Topic</span>
                </button>
              </div>
            </div>

            {/* Compact Weekly Challenge Bar */}
            <div className="rounded-xl bg-slate-900/90 border border-sky-500/30 px-3.5 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="inline-flex items-center gap-1.5 font-semibold text-sky-300">
                    <Calendar className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">
                      Weekly: {weeklyDef.description}
                    </span>
                  </span>
                  <span className="font-mono-num text-[11px] font-bold text-amber-300 whitespace-nowrap">
                    {progress.weeklyChallenge.completed
                      ? 'Completed!'
                      : `${weeklyCurrent} / ${weeklyDef.target}`}{' '}
                    · +{weeklyDef.rewardCoins} Coins
                  </span>
                </div>
                <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-[width] duration-200 ${
                      progress.weeklyChallenge.completed ? 'bg-emerald-400' : 'bg-sky-400'
                    }`}
                    style={{ width: `${weeklyPct}%` }}
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={handleShuffleWeeklyChallenge}
                className="min-h-[44px] px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-100 inline-flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
              >
                <RefreshCw className="w-3.5 h-3.5 text-sky-400" />
                <span>{progress.weeklyChallenge.completed ? 'Next Challenge' : 'Shuffle'}</span>
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <button
                type="button"
                onClick={startRun}
                className="col-span-2 sm:col-span-1 h-12 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-display font-extrabold text-base flex items-center justify-center gap-2 transition-colors"
              >
                <Play className="w-5 h-5 fill-current" />
                <span>Start Run</span>
              </button>

              <button
                type="button"
                onClick={() => setShowMissions(true)}
                className="h-12 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-sm flex items-center justify-center gap-2 transition-colors whitespace-nowrap"
              >
                <Flame className="w-4 h-4 text-amber-400" />
                <span>Missions ({progress.multiplierLevel}x)</span>
              </button>

              <button
                type="button"
                onClick={() => setShowLeaderboard(true)}
                className="h-12 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-sm flex items-center justify-center gap-2 transition-colors whitespace-nowrap"
              >
                <Trophy className="w-4 h-4 text-amber-400" />
                <span>Leaderboard</span>
              </button>

              <button
                type="button"
                onClick={() => setShowGarage(true)}
                className="h-12 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-sm flex items-center justify-center gap-2 transition-colors whitespace-nowrap"
              >
                <SlidersHorizontal className="w-4 h-4 text-sky-400" />
                <span>Hoverboards</span>
              </button>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400 pt-1 border-t border-slate-800/80">
              <span>
                Controls: Swipe or Arrow Keys / WASD · Space/Up jump · S/Down roll · Double-tap or H board
              </span>
              <span className="font-mono-num text-slate-300">
                Collect O-S-T or survive 30s for Bonus Quizzes
              </span>
            </div>
          </div>
        </div>
      )}

      {/* PAUSED MODAL */}
      {phase === 'paused' && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-950/80 p-4">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-700 rounded-2xl p-6 space-y-4 text-center">
            <h2 className="font-display text-2xl font-bold text-white">Run Paused</h2>
            <p className="text-xs text-slate-400">
              {activeDisplayName} · Multiplier {progress.multiplierLevel}x · {currentTopic.shortTitle}
            </p>
            <div className="space-y-2.5 pt-2">
              <button
                type="button"
                onClick={handleResumeFromPause}
                className="w-full h-12 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 transition-colors"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Resume Run</span>
              </button>
              <button
                type="button"
                onClick={() => setShowMissions(true)}
                className="w-full h-12 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-sm transition-colors"
              >
                View Missions ({progress.multiplierLevel}x)
              </button>
              <button
                type="button"
                onClick={() => setShowTopics(true)}
                className="w-full h-12 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-sm transition-colors"
              >
                Switch OST Topic
              </button>
              <button
                type="button"
                onClick={handleQuitToMenu}
                className="w-full h-12 rounded-xl bg-slate-800/60 hover:bg-slate-800 text-slate-300 font-semibold text-sm transition-colors"
              >
                End & Return to Menu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GAME OVER SUMMARY MODAL */}
      {phase === 'gameover' && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-950/85 p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl p-6 space-y-5">
            <div className="text-center space-y-1">
              {isNewHighScore && (
                <div className="text-xs font-bold text-amber-400">New Personal Best!</div>
              )}
              <h2 className="font-display text-2xl font-extrabold text-white">Run Complete</h2>
              <p className="text-xs text-slate-400">
                {authUser
                  ? `${activeDisplayName} · Saved to profile & leaderboard`
                  : 'Sign in with Google to save to the global leaderboard'}
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2.5 text-center">
              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3">
                <div className="text-[11px] text-slate-400">Run Score</div>
                <div className="font-mono-num text-lg font-bold text-white mt-0.5">
                  {displayScore.toLocaleString()}
                </div>
              </div>
              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3">
                <div className="text-[11px] text-slate-400">Coins</div>
                <div className="font-mono-num text-lg font-bold text-amber-300 mt-0.5">
                  +{displayCoins}
                </div>
              </div>
              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3">
                <div className="text-[11px] text-slate-400">OST Correct</div>
                <div className="font-mono-num text-lg font-bold text-sky-300 mt-0.5">
                  {runCorrectCount}/{runAnsweredCount}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 bg-slate-950/70 border border-slate-800/80 rounded-xl px-3.5 py-2.5 text-xs font-mono-num">
              <span className="text-slate-300">
                High Score: <strong className="text-amber-300">{progress.highScore.toLocaleString()}</strong>
              </span>
              <span className="text-slate-300">
                Total OST: <strong className="text-sky-300">{progress.totalCorrectOst}/{progress.totalAnsweredOst}</strong>
              </span>
            </div>

            {!authUser && (
              <button
                type="button"
                onClick={() => void handleGoogleSignIn()}
                className="w-full h-11 rounded-xl bg-white hover:bg-slate-100 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 transition-colors"
              >
                <LogIn className="w-4 h-4" />
                <span>Sign in with Google to Save Score</span>
              </button>
            )}

            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={startRun}
                className="col-span-2 h-12 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-display font-extrabold text-base flex items-center justify-center gap-2 transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Run Again</span>
              </button>
              <button
                type="button"
                onClick={() => setShowGarage(true)}
                className="h-11 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-colors"
              >
                <SlidersHorizontal className="w-4 h-4 text-sky-400" />
                <span>Hoverboards</span>
              </button>
              <button
                type="button"
                onClick={() => setShowLeaderboard(true)}
                className="h-11 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-colors"
              >
                <Award className="w-4 h-4 text-amber-400" />
                <span>Leaderboard</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                engineRef.current?.returnToMenu();
                setPhase('menu');
              }}
              className="w-full py-2 text-xs text-slate-400 hover:text-white transition-colors"
            >
              Return to Main Menu
            </button>
          </div>
        </div>
      )}

      {/* OST QUESTION MODAL (30s Timer, Crash, or O-S-T Word Hunt) */}
      {phase === 'quiz' && activeQuestion && (
        <QuestionModal
          question={activeQuestion}
          reason={quizReason}
          multiplierLevel={progress.multiplierLevel}
          onAnswer={handleQuizAnswer}
          onContinue={handleQuizContinue}
        />
      )}

      {/* MODALS */}
      {showTopics && (
        <TopicSelectorModal
          selectedTopic={progress.selectedTopic}
          progress={progress}
          onSelect={handleSelectTopic}
          onClose={() => setShowTopics(false)}
        />
      )}

      {showMissions && (
        <MissionsModal
          progress={progress}
          onShuffleWeekly={handleShuffleWeeklyChallenge}
          onClose={() => setShowMissions(false)}
        />
      )}

      {showLeaderboard && (
        <LeaderboardModal
          currentUid={authUser?.uid ?? progress.uid}
          onClose={() => setShowLeaderboard(false)}
        />
      )}

      {showGarage && (
        <GarageModal
          progress={progress}
          onSelectOrBuyBoard={handleSelectOrBuyBoard}
          onClose={() => setShowGarage(false)}
        />
      )}

      {eventToast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[60] pointer-events-none bg-slate-950/95 border border-amber-400/50 rounded-xl px-4 py-2 text-xs sm:text-sm font-bold text-amber-300 shadow-lg whitespace-nowrap">
          {eventToast}
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
}
