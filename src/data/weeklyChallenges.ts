import { WeeklyChallengeCategory, WeeklyChallengeDefinition, WeeklyChallengeState } from '../types/game';

export const WEEKLY_CHALLENGES: WeeklyChallengeDefinition[] = [
  {
    id: 'wc-ost-10',
    category: 'ost_correct',
    title: 'Playbook Sharpshooter',
    description: 'Answer 10 OST questions correctly',
    target: 10,
    rewardCoins: 80,
  },
  {
    id: 'wc-coins-250',
    category: 'coins',
    title: 'Subway Coin Sprint',
    description: 'Collect 250 coins on the tracks',
    target: 250,
    rewardCoins: 80,
  },
  {
    id: 'wc-ost-15',
    category: 'ost_answered',
    title: 'Algebra Marathon',
    description: 'Complete 15 OST questions',
    target: 15,
    rewardCoins: 100,
  },
  {
    id: 'wc-coins-500',
    category: 'coins',
    title: 'Golden Express',
    description: 'Collect 500 coins on the tracks',
    target: 500,
    rewardCoins: 130,
  },
  {
    id: 'wc-ost-20',
    category: 'ost_correct',
    title: 'OST Mastery Streak',
    description: 'Answer 20 OST questions correctly',
    target: 20,
    rewardCoins: 150,
  },
  {
    id: 'wc-coins-750',
    category: 'coins',
    title: 'Vault Runner',
    description: 'Collect 750 coins on the tracks',
    target: 750,
    rewardCoins: 175,
  },
  {
    id: 'wc-ost-30',
    category: 'ost_answered',
    title: 'Playbook Grinder',
    description: 'Complete 30 OST questions',
    target: 30,
    rewardCoins: 200,
  },
  {
    id: 'wc-coins-1000',
    category: 'coins',
    title: 'Metro Jackpot',
    description: 'Collect 1,000 coins on the tracks',
    target: 1000,
    rewardCoins: 225,
  },
];

export function getCurrentWeekId(date = new Date()): string {
  // Compute ISO week year & week number (e.g. "2026-W47")
  const utc = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = utc.getUTCDay() || 7;
  utc.setUTCDate(utc.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((utc.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${utc.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

export function getWeeklyChallengeById(id: string): WeeklyChallengeDefinition {
  return WEEKLY_CHALLENGES.find((c) => c.id === id) ?? WEEKLY_CHALLENGES[0];
}

export function pickRandomWeeklyChallenge(
  excludeId?: string,
  previousCategory?: WeeklyChallengeCategory,
): WeeklyChallengeDefinition {
  let pool = WEEKLY_CHALLENGES.filter((c) => c.id !== excludeId);

  // Alternate / shuffle across OST question challenges and Coin challenges
  if (previousCategory === 'coins') {
    const ostPool = pool.filter((c) => c.category !== 'coins');
    if (ostPool.length > 0) pool = ostPool;
  } else if (previousCategory === 'ost_correct' || previousCategory === 'ost_answered') {
    const coinPool = pool.filter((c) => c.category === 'coins');
    if (coinPool.length > 0) pool = coinPool;
  }

  return pool[Math.floor(Math.random() * pool.length)] ?? WEEKLY_CHALLENGES[0];
}

export function createFreshWeeklyChallenge(
  excludeId?: string,
  previousCategory?: WeeklyChallengeCategory,
  completedCount = 0,
): WeeklyChallengeState {
  const picked = pickRandomWeeklyChallenge(excludeId, previousCategory);
  return {
    weekId: getCurrentWeekId(),
    challengeId: picked.id,
    progress: 0,
    completed: false,
    completedCount,
  };
}
