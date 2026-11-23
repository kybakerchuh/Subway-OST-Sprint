import { CheckCircle2, HelpCircle, Play, RotateCcw, XCircle } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { getTopicById } from '../data/topics';
import { OstQuestion, QuizTriggerReason } from '../types/game';
import { MathText } from './MathText';
import { QuestionVisualView } from './QuestionVisualView';

interface QuestionModalProps {
  question: OstQuestion;
  reason: QuizTriggerReason;
  multiplierLevel: number;
  onAnswer: (isCorrect: boolean) => void;
  onContinue: (wasCorrect: boolean) => void;
}

const CHOICE_LETTERS = ['A', 'B', 'C', 'D'] as const;

export const QuestionModal: React.FC<QuestionModalProps> = ({
  question,
  reason,
  multiplierLevel,
  onAnswer,
  onContinue,
}) => {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [showHint, setShowHint] = useState(false);

  const isAnswered = selectedIndex !== null;
  const isCorrect = selectedIndex === question.correctIndex;
  const topic = getTopicById(question.topicId);

  const wordHuntBonusPts = 500 * Math.max(1, multiplierLevel);
  const timerBonusPts = 250 * Math.max(1, multiplierLevel);

  const handleSelect = (idx: number) => {
    if (isAnswered) return;
    setSelectedIndex(idx);
    onAnswer(idx === question.correctIndex);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!isAnswered) {
        if (e.key === '1') handleSelect(0);
        else if (e.key === '2') handleSelect(1);
        else if (e.key === '3') handleSelect(2);
        else if (e.key === '4') handleSelect(3);
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onContinue(isCorrect);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isAnswered, isCorrect, onContinue]);

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/85 p-3 sm:p-6 overflow-y-auto">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-2xl p-4 sm:p-6 shadow-2xl my-auto">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-800">
          <div className="space-y-0.5">
            <div className="text-xs font-semibold text-amber-400">
              {reason === 'crash'
                ? 'Wipeout Checkpoint · Answer Correctly to Revive'
                : reason === 'wordhunt'
                  ? `O-S-T Word Hunt Complete! · +${wordHuntBonusPts.toLocaleString()} pts & +25 Coins Bonus`
                  : `30-Second OST Checkpoint · +${timerBonusPts.toLocaleString()} pts & +10 Coins`}
            </div>
            <div className="text-xs text-slate-400">
              {topic.title} · {topic.playbookSection}
            </div>
          </div>

          {!isAnswered && (
            <button
              type="button"
              onClick={() => setShowHint((v) => !v)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors min-h-[40px]"
            >
              <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
              <span>{showHint ? 'Hide Hint' : 'Playbook Hint'}</span>
            </button>
          )}
        </div>

        <div className="mt-4 space-y-4">
          <h2 className="text-base sm:text-lg font-semibold text-white leading-relaxed">
            <MathText text={question.prompt} />
          </h2>

          {question.visual && <QuestionVisualView visual={question.visual} />}

          {showHint && !isAnswered && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-amber-200 leading-relaxed">
              <MathText text={question.hint} />
            </div>
          )}

          <div className="grid grid-cols-1 gap-2.5">
            {question.options.map((opt, idx) => {
              const isThisSelected = selectedIndex === idx;
              const isThisCorrect = idx === question.correctIndex;

              let btnStyle =
                'bg-slate-800/80 hover:bg-slate-700/90 border-slate-700 text-slate-100';
              if (isAnswered) {
                if (isThisCorrect) {
                  btnStyle = 'bg-emerald-500/20 border-emerald-400 text-emerald-100';
                } else if (isThisSelected) {
                  btnStyle = 'bg-rose-500/20 border-rose-400 text-rose-100';
                } else {
                  btnStyle = 'bg-slate-800/40 border-slate-800 text-slate-400';
                }
              }

              return (
                <button
                  key={idx}
                  type="button"
                  disabled={isAnswered}
                  onClick={() => handleSelect(idx)}
                  className={`w-full text-left px-4 py-3 rounded-xl border transition-colors flex items-center justify-between gap-3 min-h-[48px] ${btnStyle}`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="font-mono-num text-xs font-bold w-6 h-6 rounded-md bg-slate-950/60 flex items-center justify-center shrink-0">
                      {CHOICE_LETTERS[idx]}
                    </span>
                    <span className="text-sm sm:text-base font-medium break-words leading-relaxed">
                      <MathText text={opt} />
                    </span>
                  </div>
                  {isAnswered && isThisCorrect && (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  )}
                  {isAnswered && isThisSelected && !isThisCorrect && (
                    <XCircle className="w-5 h-5 text-rose-400 shrink-0" />
                  )}
                </button>
              );
            })}
          </div>

          {isAnswered && (
            <div className="pt-2 space-y-3">
              <div
                className={`rounded-xl px-4 py-3 border text-sm ${
                  isCorrect
                    ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-100'
                    : 'bg-rose-500/15 border-rose-500/40 text-rose-100'
                }`}
              >
                <div className="font-semibold mb-1">
                  {isCorrect
                    ? reason === 'crash'
                      ? 'Correct! Shield restored — ready to revive!'
                      : reason === 'wordhunt'
                        ? `Correct! +${wordHuntBonusPts.toLocaleString()} pts & +25 Coins Word Hunt Bonus!`
                        : `Correct! +${timerBonusPts.toLocaleString()} pts & +10 Coins awarded!`
                    : reason === 'crash'
                      ? 'Incorrect — run ended.'
                      : 'Not quite — review the solution and keep running!'}
                </div>
                <p className="text-xs sm:text-sm opacity-90 leading-relaxed">
                  <MathText text={question.explanation} />
                </p>
              </div>

              <button
                type="button"
                onClick={() => onContinue(isCorrect)}
                className="w-full h-12 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm sm:text-base flex items-center justify-center gap-2 transition-colors"
              >
                {reason === 'crash' && !isCorrect ? (
                  <>
                    <RotateCcw className="w-4 h-4" />
                    <span>View Run Summary</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-current" />
                    <span>{reason === 'crash' ? 'Revive & Continue Run' : 'Resume Run'}</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
