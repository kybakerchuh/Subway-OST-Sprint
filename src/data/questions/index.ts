import { OstQuestion, TopicId } from '../../types/game';
import { DATA_ANALYSIS_QUESTIONS } from './dataAnalysis';
import { EQUATIONS_INEQUALITIES_QUESTIONS } from './equationsInequalities';
import { EXPONENTIAL_QUESTIONS } from './exponential';
import { FUNCTIONS_QUESTIONS } from './functions';
import { LAZY_STRATEGIES_QUESTIONS } from './lazyStrategies';
import { LINEAR_PART_1_QUESTIONS } from './linearPart1';
import { LINEAR_PART_2_QUESTIONS } from './linearPart2';
import { POLYNOMIALS_QUESTIONS } from './polynomials';
import { QUADRATICS_QUESTIONS } from './quadratics';
import { SIMPLIFYING_EXPRESSIONS_QUESTIONS } from './simplifyingExpressions';
import { SYSTEMS_QUESTIONS } from './systems';

export const QUESTION_BANKS: Record<Exclude<TopicId, 'mixed'>, OstQuestion[]> = {
  'lazy-strategies': LAZY_STRATEGIES_QUESTIONS,
  'data-analysis': DATA_ANALYSIS_QUESTIONS,
  polynomials: POLYNOMIALS_QUESTIONS,
  functions: FUNCTIONS_QUESTIONS,
  quadratics: QUADRATICS_QUESTIONS,
  exponential: EXPONENTIAL_QUESTIONS,
  'linear-part-1': LINEAR_PART_1_QUESTIONS,
  'linear-part-2': LINEAR_PART_2_QUESTIONS,
  systems: SYSTEMS_QUESTIONS,
  'simplifying-expressions': SIMPLIFYING_EXPRESSIONS_QUESTIONS,
  'equations-inequalities': EQUATIONS_INEQUALITIES_QUESTIONS,
};

export const ALL_QUESTIONS: OstQuestion[] = Object.values(QUESTION_BANKS).flat();

export function getQuestionsForTopic(topicId: TopicId): OstQuestion[] {
  if (topicId === 'mixed') {
    return ALL_QUESTIONS;
  }
  return QUESTION_BANKS[topicId] ?? ALL_QUESTIONS;
}

export function pickNextQuestion(
  topicId: TopicId,
  recentlyAskedIds: Set<string>,
): OstQuestion {
  const pool = getQuestionsForTopic(topicId);
  const unseen = pool.filter((q) => !recentlyAskedIds.has(q.id));
  const candidates = unseen.length > 0 ? unseen : pool;
  if (unseen.length === 0) {
    // Reset cycle for this topic once all questions in the bank were seen
    for (const q of pool) {
      recentlyAskedIds.delete(q.id);
    }
  }
  const chosen = candidates[Math.floor(Math.random() * candidates.length)];
  recentlyAskedIds.add(chosen.id);
  return chosen;
}
