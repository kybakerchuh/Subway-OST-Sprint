import { MissionDefinition } from '../types/game';

export const MAX_MULTIPLIER_LEVEL = 30;

/**
 * Generates Subway Surfers style 3-mission sets per Multiplier Level (1x -> 30x).
 * Completing all 3 missions in the current set raises base Score Multiplier by +1x.
 */
export function getMissionSetForLevel(level: number): [MissionDefinition, MissionDefinition, MissionDefinition] {
  const lv = Math.max(1, Math.min(MAX_MULTIPLIER_LEVEL, level));

  const fixedSets: Record<number, [MissionDefinition, MissionDefinition, MissionDefinition]> = {
    1: [
      { id: 'm1-coins', description: 'Collect 25 Coins in one run', stat: 'runCoins', target: 25, isSingleRun: true },
      { id: 'm1-ost', description: 'Answer 1 OST Question correctly', stat: 'ostCorrect', target: 1 },
      { id: 'm1-score', description: 'Score 450 points in one run', stat: 'runScore', target: 450, isSingleRun: true },
    ],
    2: [
      { id: 'm2-jumps', description: 'Jump 10 times in one run', stat: 'runJumps', target: 10, isSingleRun: true },
      { id: 'm2-power', description: 'Pick up 2 Powerups', stat: 'runPowerups', target: 2 },
      { id: 'm2-dist', description: 'Run 450m total', stat: 'totalDistance', target: 450 },
    ],
    3: [
      { id: 'm3-slides', description: 'Roll under barriers 4 times in one run', stat: 'runSlides', target: 4, isSingleRun: true },
      { id: 'm3-word', description: 'Complete the O-S-T Word Hunt', stat: 'ostWords', target: 1 },
      { id: 'm3-ost', description: 'Answer 2 OST Questions correctly', stat: 'ostCorrect', target: 2 },
    ],
    4: [
      { id: 'm4-board', description: 'Use a Hoverboard 2 times', stat: 'runBoards', target: 2 },
      { id: 'm4-roof', description: 'Run atop 3 Train Roofs', stat: 'runTrainRoofs', target: 3 },
      { id: 'm4-coins', description: 'Collect 75 Coins total', stat: 'totalCoins', target: 75 },
    ],
    5: [
      { id: 'm5-coins', description: 'Collect 60 Coins in one run', stat: 'runCoins', target: 60, isSingleRun: true },
      { id: 'm5-ost', description: 'Answer 3 OST Questions correctly', stat: 'ostCorrect', target: 3 },
      { id: 'm5-dist', description: 'Run 650m in one run', stat: 'runDistance', target: 650, isSingleRun: true },
    ],
  };

  if (fixedSets[lv]) {
    return fixedSets[lv];
  }

  // Scaled procedural Subway Surfers mission sets for levels 6..30
  const scale = lv - 4;
  return [
    {
      id: `m${lv}-action`,
      description:
        lv % 2 === 0
          ? `Collect ${50 + scale * 15} Coins in one run`
          : `Run ${600 + scale * 120}m in one run`,
      stat: lv % 2 === 0 ? 'runCoins' : 'runDistance',
      target: lv % 2 === 0 ? 50 + scale * 15 : 600 + scale * 120,
      isSingleRun: true,
    },
    {
      id: `m${lv}-ost`,
      description:
        lv % 3 === 0
          ? `Complete ${1 + Math.floor(scale / 5)} O-S-T Word Hunt`
          : `Answer ${2 + Math.floor(scale / 2)} OST Questions correctly`,
      stat: lv % 3 === 0 ? 'ostWords' : 'ostCorrect',
      target: lv % 3 === 0 ? 1 + Math.floor(scale / 5) : 2 + Math.floor(scale / 2),
    },
    {
      id: `m${lv}-skill`,
      description:
        lv % 3 === 1
          ? `Use Hoverboards ${2 + Math.floor(scale / 3)} times`
          : lv % 3 === 2
            ? `Pick up ${3 + Math.floor(scale / 2)} Powerups`
            : `Jump ${14 + scale * 2} times in one run`,
      stat: lv % 3 === 1 ? 'runBoards' : lv % 3 === 2 ? 'runPowerups' : 'runJumps',
      target:
        lv % 3 === 1
          ? 2 + Math.floor(scale / 3)
          : lv % 3 === 2
            ? 3 + Math.floor(scale / 2)
            : 14 + scale * 2,
      isSingleRun: lv % 3 === 0,
    },
  ];
}
