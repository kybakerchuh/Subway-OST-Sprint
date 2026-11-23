import { Award, Medal, RefreshCw, Trophy, X } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { getTopicById } from '../data/topics';
import { fetchLeaderboard } from '../services/progressService';
import { LeaderboardEntry } from '../types/game';

interface LeaderboardModalProps {
  currentUid: string | null;
  onClose: () => void;
}

export const LeaderboardModal: React.FC<LeaderboardModalProps> = ({
  currentUid,
  onClose,
}) => {
  const [tab, setTab] = useState<'highScore' | 'totalCorrectOst'>('highScore');
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async (mode: 'highScore' | 'totalCorrectOst') => {
    setLoading(true);
    setError(null);
    try {
      const rows = await fetchLeaderboard(mode);
      setEntries(rows);
    } catch (err) {
      setError(
        err instanceof Error
          ? 'Could not load leaderboard right now. Try refreshing.'
          : 'Could not load leaderboard.',
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load(tab);
  }, [tab]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-3 sm:p-6">
      <div className="w-full max-w-2xl max-h-[86vh] flex flex-col bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-slate-800 shrink-0">
          <div>
            <h2 className="font-display text-lg sm:text-xl font-bold text-white">
              Global Top 10 Leaderboard
            </h2>
            <p className="text-xs sm:text-sm text-slate-400">
              Sign in with Google to post your High Score and OST Mastery
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void load(tab)}
              aria-label="Refresh leaderboard"
              className="min-w-[44px] min-h-[44px] rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center justify-center transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close leaderboard"
              className="min-w-[44px] min-h-[44px] rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center justify-center transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="px-5 pt-3 pb-2 border-b border-slate-800/80 shrink-0">
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-950 rounded-xl">
            <button
              type="button"
              onClick={() => setTab('highScore')}
              className={`min-h-[44px] px-3 py-2 rounded-lg text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-colors whitespace-nowrap ${
                tab === 'highScore'
                  ? 'bg-amber-500 text-slate-950'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Trophy className="w-4 h-4 shrink-0" />
              <span>High Score</span>
            </button>
            <button
              type="button"
              onClick={() => setTab('totalCorrectOst')}
              className={`min-h-[44px] px-3 py-2 rounded-lg text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-colors whitespace-nowrap ${
                tab === 'totalCorrectOst'
                  ? 'bg-sky-500 text-slate-950'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Award className="w-4 h-4 shrink-0" />
              <span>OST Questions Correct</span>
            </button>
          </div>
        </div>

        <div className="p-4 sm:p-5 overflow-y-auto flex-1">
          {loading ? (
            <div className="py-12 text-center text-sm text-slate-400">
              Loading leaderboard rankings...
            </div>
          ) : error ? (
            <div className="py-10 text-center space-y-3">
              <p className="text-sm text-rose-300">{error}</p>
              <button
                type="button"
                onClick={() => void load(tab)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-sm font-medium text-white min-h-[44px]"
              >
                Retry
              </button>
            </div>
          ) : entries.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-400">
              No scores posted yet. Sign in with Google and finish a run to claim #1!
            </div>
          ) : (
            <div className="divide-y divide-slate-800/80">
              {entries.slice(0, 10).map((entry, idx) => {
                const isMe = currentUid && entry.uid === currentUid;
                const accuracy =
                  entry.totalAnsweredOst > 0
                    ? Math.round((entry.totalCorrectOst / entry.totalAnsweredOst) * 100)
                    : 0;
                const topicTitle = getTopicById(entry.favoriteTopic).shortTitle;
                const hasMedal = idx < 3;

                return (
                  <div
                    key={entry.uid}
                    className={`py-3 px-3 rounded-xl flex items-center justify-between gap-3 ${
                      isMe ? 'bg-amber-500/15' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-12 h-8 rounded-lg font-mono-num text-sm font-bold flex items-center justify-center gap-1 shrink-0 ${
                          idx === 0
                            ? 'bg-amber-400 text-slate-950'
                            : idx === 1
                              ? 'bg-slate-200 text-slate-950'
                              : idx === 2
                                ? 'bg-amber-700 text-amber-100'
                                : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        <span>{idx + 1}</span>
                        {hasMedal && (
                          <Medal
                            className={`w-3.5 h-3.5 shrink-0 ${
                              idx === 0
                                ? 'text-amber-900'
                                : idx === 1
                                  ? 'text-slate-700'
                                  : 'text-amber-200'
                            }`}
                          />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-sm text-white truncate">
                          {entry.displayName} {isMe ? '(You)' : ''}
                        </div>
                        <div className="text-xs text-slate-400 truncate">
                          {topicTitle} · {accuracy}% OST accuracy · Best {entry.bestCoins} coins
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="font-mono-num text-base font-bold text-white">
                        {tab === 'highScore'
                          ? entry.highScore.toLocaleString()
                          : `${entry.totalCorrectOst.toLocaleString()} Qs`}
                      </div>
                      <div className="font-mono-num text-xs text-slate-400">
                        {tab === 'highScore'
                          ? `${entry.totalCorrectOst} OST correct`
                          : `Best ${entry.highScore.toLocaleString()} pts`}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
