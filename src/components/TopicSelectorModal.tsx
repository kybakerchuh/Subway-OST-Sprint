import { Check, X } from 'lucide-react';
import React from 'react';
import { getQuestionsForTopic } from '../data/questions';
import { OST_TOPICS } from '../data/topics';
import { TopicId, UserProgress } from '../types/game';

interface TopicSelectorModalProps {
  selectedTopic: TopicId;
  progress: UserProgress;
  onSelect: (topicId: TopicId) => void;
  onClose: () => void;
}

export const TopicSelectorModal: React.FC<TopicSelectorModalProps> = ({
  selectedTopic,
  progress,
  onSelect,
  onClose,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-3 sm:p-6">
      <div className="w-full max-w-3xl max-h-[88vh] flex flex-col bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-slate-800 shrink-0">
          <div>
            <h2 className="font-display text-lg sm:text-xl font-bold text-white">
              Select OST Playbook Topic
            </h2>
            <p className="text-xs sm:text-sm text-slate-400">
              30 questions per Playbook topic · Switch anytime between runs
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close topic selector"
            className="min-w-[44px] min-h-[44px] rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 sm:p-5 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-3">
          {OST_TOPICS.map((topic) => {
            const isSelected = topic.id === selectedTopic;
            const totalQs = getQuestionsForTopic(topic.id).length;
            const correct =
              topic.id === 'mixed'
                ? progress.totalCorrectOst
                : progress.topicCorrectCounts[topic.id] ?? 0;
            const answered =
              topic.id === 'mixed'
                ? progress.totalAnsweredOst
                : progress.topicAnsweredCounts[topic.id] ?? 0;
            const accuracy = answered > 0 ? Math.round((correct / answered) * 100) : null;

            return (
              <button
                key={topic.id}
                type="button"
                onClick={() => {
                  onSelect(topic.id);
                  onClose();
                }}
                className={`text-left p-4 rounded-xl border transition-colors flex flex-col justify-between gap-2 min-h-[104px] ${
                  isSelected
                    ? 'bg-amber-500/15 border-amber-400 text-white'
                    : 'bg-slate-800/60 hover:bg-slate-800 border-slate-700/70 text-slate-100'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-0.5">
                    <div className="text-xs text-slate-400">
                      {topic.playbookSection} · {totalQs} Questions
                    </div>
                    <div className="font-display font-bold text-base leading-tight">
                      {topic.title}
                    </div>
                  </div>
                  {isSelected && (
                    <span className="w-6 h-6 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center shrink-0">
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-300 line-clamp-2">{topic.description}</p>

                <div className="text-xs font-mono-num text-slate-400 pt-1">
                  {answered > 0
                    ? `${correct} correct / ${answered} answered (${accuracy}%)`
                    : 'Not practiced yet'}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
