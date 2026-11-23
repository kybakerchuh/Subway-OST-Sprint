export type TopicId =
  | 'lazy-strategies'
  | 'data-analysis'
  | 'polynomials'
  | 'functions'
  | 'quadratics'
  | 'exponential'
  | 'linear-part-1'
  | 'linear-part-2'
  | 'systems'
  | 'simplifying-expressions'
  | 'equations-inequalities'
  | 'mixed';

export interface TopicInfo {
  id: TopicId;
  title: string;
  shortTitle: string;
  playbookSection: string;
  description: string;
  accentColor: string;
}

export type QuestionVisual =
  | {
      type: 'table';
      title?: string;
      headers: string[];
      rows: (string | number)[][];
    }
  | {
      type: 'boxPlot';
      title?: string;
      minAxis: number;
      maxAxis: number;
      step: number;
      plots: {
        label: string;
        min: number;
        q1: number;
        median: number;
        q3: number;
        max: number;
      }[];
    }
  | {
      type: 'dotPlot';
      title?: string;
      minAxis: number;
      maxAxis: number;
      plots: {
        label: string;
        values: { x: number; count: number }[];
      }[];
    }
  | {
      type: 'scatter';
      title?: string;
      xLabel: string;
      yLabel: string;
      maxX: number;
      maxY: number;
      points: [number, number][];
      line?: { m: number; b: number };
    }
  | {
      type: 'lineGraph';
      title?: string;
      m: number;
      b: number;
      xMin?: number;
      xMax?: number;
      yMin?: number;
      yMax?: number;
    }
  | {
      type: 'parabola';
      title?: string;
      a: number;
      h: number;
      k: number;
      xLabel?: string;
      yLabel?: string;
      xMin?: number;
      xMax?: number;
      yMin?: number;
      yMax?: number;
    }
  | {
      type: 'steps';
      title: string;
      steps: string[];
    };

export interface OstQuestion {
  id: string;
  topicId: Exclude<TopicId, 'mixed'>;
  prompt: string;
  options: [string, string, string, string];
  correctIndex: 0 | 1 | 2 | 3;
  hint: string;
  explanation: string;
  visual?: QuestionVisual;
}

export interface HoverboardSkin {
  id: string;
  name: string;
  cost: number;
  requiredCorrectOst?: number;
  primaryColor: number;
  accentColor: number;
  cssSwatch: string;
  description: string;
}

export type WorldTourId = 'metro' | 'sunset' | 'neon' | 'alpine';

export interface WorldTourTheme {
  id: WorldTourId;
  name: string;
  subtitle: string;
  skyTint: number;
  fogColor: number;
  hemiSky: number;
  hemiGround: number;
  sunColor: number;
  swatch: string;
}

export type MissionStatKey =
  | 'runCoins'
  | 'totalCoins'
  | 'runDistance'
  | 'totalDistance'
  | 'runScore'
  | 'runJumps'
  | 'runSlides'
  | 'runPowerups'
  | 'runTrainRoofs'
  | 'runBoards'
  | 'ostCorrect'
  | 'ostWords';

export interface MissionDefinition {
  id: string;
  description: string;
  stat: MissionStatKey;
  target: number;
  isSingleRun?: boolean;
}

export type WeeklyChallengeCategory = 'ost_correct' | 'ost_answered' | 'coins';

export interface WeeklyChallengeDefinition {
  id: string;
  category: WeeklyChallengeCategory;
  title: string;
  description: string;
  target: number;
  rewardCoins: number;
}

export interface WeeklyChallengeState {
  weekId: string;
  challengeId: string;
  progress: number;
  completed: boolean;
  completedCount: number;
}

export interface UserProgress {
  uid: string | null;
  displayName: string;
  highScore: number;
  totalCoins: number;
  totalRuns: number;
  totalCorrectOst: number;
  totalAnsweredOst: number;
  multiplierLevel: number;
  ostWordsCompleted: number;
  missionProgress: [number, number, number];
  weeklyChallenge: WeeklyChallengeState;
  selectedTopic: TopicId;
  selectedBoard: string;
  unlockedBoards: string[];
  topicCorrectCounts: Record<string, number>;
  topicAnsweredCounts: Record<string, number>;
}

export interface LeaderboardEntry {
  uid: string;
  displayName: string;
  highScore: number;
  totalCorrectOst: number;
  totalAnsweredOst: number;
  bestCoins: number;
  favoriteTopic: string;
  updatedAt?: unknown;
}

export type GamePhase = 'menu' | 'running' | 'paused' | 'quiz' | 'gameover';
export type QuizTriggerReason = 'timer' | 'crash' | 'wordhunt';
export type OstLetter = 'O' | 'S' | 'T';

export interface RunStatsSnapshot {
  coins: number;
  distance: number;
  score: number;
  jumps: number;
  slides: number;
  powerups: number;
  trainRoofs: number;
  boardsUsed: number;
}

export interface HudSnapshot {
  score: number;
  distance: number;
  coins: number;
  baseMultiplier: number;
  multiplier: number;
  speed: number;
  quizTimerRemaining: number;
  magnetRemaining: number;
  doubleScoreRemaining: number;
  superSneakersRemaining: number;
  jetpackRemaining: number;
  boardActive: boolean;
  boardCooldown: number;
  chaserAlert: boolean;
  collectedOstLetters: OstLetter[];
  runStats: RunStatsSnapshot;
}
