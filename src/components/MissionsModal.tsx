import { Calendar, CheckCircle2, Coins, Flame, RefreshCw, X } from 'lucide-react';
import React from 'react';
import { getMissionSetForLevel, MAX_MULTIPLIER_LEVEL } from '../data/missions';
import { getWeeklyChallengeById } from '../data/weeklyChallenges';
import { UserProgress } from '../types/game';

interface MissionsModalProps {
  progress: UserProgress;
  onShuffleWeekly: () => void;
  onClose: () => void;
}

export const MissionsModal: React.FC<MissionsModalProps> = ({
  progress,
  onShuffleWeekly,
  onClose,
}) => {
  const level = Math.max(1, Math.min(MAX_MULTIPLIER_LEVEL, progress.multiplierLevel));
  const missions = getMissionSetForLevel(level);
  const isMax = level >= MAX_MULTIPLIER_LEVEL;

  const wcState = progress.weeklyChallenge;
  const wcDef = getWeeklyChallengeById(wcState.challengeId);
  const wcCurrent = Math.min(wcDef.target, wcState.progress);
  const wcPct = Math.min(100, (wcCurrent / wcDef.target) * 100);
  const wcIsCoins = wcDef.category === 'coins';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-3 sm:p-6">
      <div className="w-full max-w-lg max-h-[90vh] flex flex-col bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-slate-800 shrink-0">
          <div>
            <h2 className="font-display text-lg sm:text-xl font-bold text-white">
              Missions & Weekly Challenge
            </h2>
            <p className="text-xs sm:text-sm text-slate-400">
              Complete weekly goals & rank up your Score Multiplier
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close missions"
            className="min-w-[44px] min-h-[44px] rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-5 overflow-y-auto">
          {/* Weekly Challenge Section */}
          <div
            className={`rounded-2xl border p-4 space-y-3 ${
              wcState.completed
                ? 'bg-emerald-500/12 border-emerald-400/50'
                : 'bg-slate-950/80 border-sky-500/35'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold">
                  <span className="inline-flex items-center gap-1 text-sky-300">
                    <Calendar className="w-3.5 h-3.5" />
                    Weekly Challenge · {wcState.weekId}
                  </span>
                  <span className="text-slate-400">
                    ({wcIsCoins ? 'Coins' : 'OST Questions'})
                  </span>
                </div>
                <div className="font-display text-base font-bold text-white">
                  {wcDef.title}
                </div>
                <p className="text-xs text-slate-300">{wcDef.description}</p>
              </div>

              <div className="shrink-0 flex flex-col items-end gap-1">
                <span className="inline-flex items-center gap-1 rounded-lg bg-amber-500/20 border border-amber-400/40 px-2.5 py-1 font-mono-num text-xs font-bold text-amber-300 whitespace-nowrap">
                  <Coins className="w-3.5 h-3.5" />
                  +{wcDef.rewardCoins}
                </span>
                {wcState.completedCount > 0 && (
                  <span className="text-[11px] font-mono-num text-emerald-300">
                    {wcState.completedCount} cleared
                  </span>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-mono-num">
                <span className={wcState.completed ? 'text-emerald-300 font-bold' : 'text-slate-300'}>
                  {wcState.completed ? 'Challenge Completed!' : 'Progress'}
                </span>
                <span className={wcState.completed ? 'text-emerald-300 font-bold' : 'text-sky-300 font-bold'}>
                  {wcCurrent} / {wcDef.target}
                </span>
              </div>
              <div className="w-full h-2.5 bg-slate-900 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-[width] duration-200 ${
                    wcState.completed ? 'bg-emerald-400' : 'bg-sky-400'
                  }`}
                  style={{ width: `${wcPct}%` }}
                />
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 pt-1">
              <span className="text-[11px] text-slate-400">
                Shuffles between OST questions & coin goals
              </span>
              <button
                type="button"
                onClick={onShuffleWeekly}
                className="min-h-[44px] px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600/80 text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
              >
                <RefreshCw className="w-3.5 h-3.5 text-sky-400" />
                <span>{wcState.completed ? 'Next Challenge' : 'Shuffle Challenge'}</span>
              </button>
            </div>
          </div>

          {/* Score Multiplier Missions */}
          <div className="space-y-3">
            <div className="bg-slate-950/80 border border-amber-500/30 rounded-xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-amber-500 text-slate-950 font-mono-num font-extrabold text-xl flex items-center justify-center">
                  {level}x
                </div>
                <div>
                  <div className="font-display font-bold text-white text-base">
                    Multiplier Level {level}
                  </div>
                  <div className="text-xs text-slate-400">
                    {isMax ? 'Maximum 30x Multiplier reached!' : `Complete all 3 to unlock ${level + 1}x (+25 Coins)`}
                  </div>
                </div>
              </div>
              <Flame className="w-6 h-6 text-amber-400" />
            </div>

            <div className="space-y-2.5">
              {missions.map((mission, idx) => {
                const current = Math.min(mission.target, progress.missionProgress[idx] ?? 0);
                const done = current >= mission.target;
                const pct = Math.min(100, (current / mission.target) * 100);

                return (
                  <div
                    key={mission.id}
                    className={`p-3.5 rounded-xl border ${
                      done
                        ? 'bg-emerald-500/15 border-emerald-400/50'
                        : 'bg-slate-800/60 border-slate-700/70'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <span className="text-sm font-semibold text-white">
                        {mission.description}
                      </span>
                      {done ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                      ) : (
                        <span className="font-mono-num text-xs font-bold text-amber-300 whitespace-nowrap">
                          {current} / {mission.target}
                        </span>
                      )}
                    </div>
                    <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-[width] duration-200 ${
                          done ? 'bg-emerald-400' : 'bg-amber-400'
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
