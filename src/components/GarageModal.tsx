import { Award, Check, Coins, Lock, X } from 'lucide-react';
import React from 'react';
import { HOVERBOARDS } from '../data/topics';
import { UserProgress } from '../types/game';

interface GarageModalProps {
  progress: UserProgress;
  onSelectOrBuyBoard: (boardId: string, cost: number) => void;
  onClose: () => void;
}

export const GarageModal: React.FC<GarageModalProps> = ({
  progress,
  onSelectOrBuyBoard,
  onClose,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-3 sm:p-6">
      <div className="w-full max-w-2xl max-h-[86vh] flex flex-col bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-slate-800 shrink-0">
          <div>
            <h2 className="font-display text-lg sm:text-xl font-bold text-white">
              Hoverboard Garage
            </h2>
            <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm text-slate-400 mt-0.5">
              <span className="inline-flex items-center gap-1.5">
                <Coins className="w-3.5 h-3.5 text-amber-400" />
                <span className="font-mono-num text-amber-300 font-semibold">
                  {progress.totalCoins.toLocaleString()} Coins
                </span>
              </span>
              <span aria-hidden="true">·</span>
              <span className="inline-flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5 text-emerald-400" />
                <span className="font-mono-num text-emerald-300 font-semibold">
                  {progress.totalCorrectOst} OST Correct
                </span>
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close garage"
            className="min-w-[44px] min-h-[44px] rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 sm:p-5 overflow-y-auto space-y-3">
          {HOVERBOARDS.map((board) => {
            const isOstMilestone = typeof board.requiredCorrectOst === 'number';
            const milestoneMet =
              isOstMilestone && progress.totalCorrectOst >= (board.requiredCorrectOst ?? 0);
            const isUnlocked = progress.unlockedBoards.includes(board.id) || milestoneMet;
            const isEquipped = progress.selectedBoard === board.id;
            const canAfford = !isOstMilestone && progress.totalCoins >= board.cost;

            const ostProgressPct = isOstMilestone
              ? Math.min(100, (progress.totalCorrectOst / (board.requiredCorrectOst ?? 1)) * 100)
              : 0;

            return (
              <div
                key={board.id}
                className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  isEquipped
                    ? 'bg-amber-500/15 border-amber-400'
                    : 'bg-slate-800/60 border-slate-700/70'
                }`}
              >
                <div className="flex items-center gap-3.5 min-w-0 flex-1">
                  <div
                    className="w-11 h-11 rounded-xl border border-white/25 shrink-0"
                    style={{ backgroundColor: board.cssSwatch }}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-display font-bold text-base text-white truncate">
                        {board.name}
                      </span>
                      {isOstMilestone && (
                        <span className="text-[11px] font-mono-num font-semibold text-emerald-300 whitespace-nowrap">
                          {board.requiredCorrectOst} OST
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-300">{board.description}</p>
                    {isOstMilestone && !isUnlocked && (
                      <div className="mt-2 space-y-1 max-w-xs">
                        <div className="flex justify-between text-[11px] font-mono-num text-slate-400">
                          <span>OST Progress</span>
                          <span>
                            {progress.totalCorrectOst}/{board.requiredCorrectOst}
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-emerald-400"
                            style={{ width: `${ostProgressPct}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  disabled={!isUnlocked && !canAfford}
                  onClick={() => onSelectOrBuyBoard(board.id, board.cost)}
                  className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold min-h-[44px] whitespace-nowrap shrink-0 flex items-center justify-center gap-1.5 transition-colors ${
                    isEquipped
                      ? 'bg-emerald-500 text-slate-950'
                      : isUnlocked
                        ? 'bg-slate-700 hover:bg-slate-600 text-white'
                        : canAfford
                          ? 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                          : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  {isEquipped ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Equipped</span>
                    </>
                  ) : isUnlocked ? (
                    <span>Equip</span>
                  ) : isOstMilestone ? (
                    <>
                      <Lock className="w-3.5 h-3.5" />
                      <span className="font-mono-num">
                        {board.requiredCorrectOst} Correct OST
                      </span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-3.5 h-3.5" />
                      <span className="font-mono-num">{board.cost} Coins</span>
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
