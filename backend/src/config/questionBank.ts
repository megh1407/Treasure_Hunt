/**
 * Core Quest Finder — Authoritative Server-Side Question Bank & Difficulty Policy
 *
 * Implements server-authoritative question selection, difficulty tiers, flexible
 * answer matching, concurrent question distribution, and pool integrity validation.
 * Correct answers are kept strictly on the backend and NEVER exposed to clients.
 */

import { LEVEL_1_QUESTIONS } from "./questions/level1";
import { LEVEL_2_QUESTIONS } from "./questions/level2";
import { LEVEL_3_QUESTIONS } from "./questions/level3";
import { LEVEL_4_QUESTIONS } from "./questions/level4";
import { LEVEL_5_QUESTIONS } from "./questions/level5";
import { LEVEL_6_QUESTIONS } from "./questions/level6";
import { LEVEL_7_QUESTIONS } from "./questions/level7";
import { LEVEL_8_QUESTIONS } from "./questions/level8";
import { LEVEL_9_QUESTIONS } from "./questions/level9";
import { LEVEL_10_QUESTIONS } from "./questions/level10";

export type DifficultyTier = "EASY" | "MEDIUM" | "HARD" | "EXPERT";

export interface QuestionHint {
  order: number;
  text: string;
  penaltySeconds: number;
}

export interface QuestionDefinition {
  id: string;
  levelId: number;
  difficulty: DifficultyTier;
  type: string;
  category: string;
  question: string;
  answer: string;
  acceptedAnswers: string[];
  hints: Record<number, QuestionHint>;
  penaltySeconds: number;
  isActive: boolean;
}

/**
 * Authoritative level difficulty progression policy.
 * Players on the same level are strictly guaranteed questions of this exact difficulty tier.
 */
export const LEVEL_DIFFICULTY_POLICY: Record<number, DifficultyTier> = {
  1: "EASY",
  2: "EASY",
  3: "MEDIUM",
  4: "MEDIUM",
  5: "MEDIUM",
  6: "HARD",
  7: "HARD",
  8: "HARD",
  9: "EXPERT",
  10: "EXPERT",
};

/**
 * Comprehensive Question Bank defining 20–25 questions per level (23 per level across 10 levels = 230 questions).
 * Canonical questions (e.g. ch-1, ch-2, ... ch-10) are included as active options
 * ensuring backward compatibility with existing automated tests and answer records.
 */
export const QUESTION_BANK: QuestionDefinition[] = [
  ...LEVEL_1_QUESTIONS,
  ...LEVEL_2_QUESTIONS,
  ...LEVEL_3_QUESTIONS,
  ...LEVEL_4_QUESTIONS,
  ...LEVEL_5_QUESTIONS,
  ...LEVEL_6_QUESTIONS,
  ...LEVEL_7_QUESTIONS,
  ...LEVEL_8_QUESTIONS,
  ...LEVEL_9_QUESTIONS,
  ...LEVEL_10_QUESTIONS,
];

/**
 * Validates the internal integrity of the Question Bank at startup.
 * Throws if any configuration errors, missing levels, or difficulty mismatches are found.
 */
export function validateQuestionBank(): {
  total: number;
  byLevel: Record<number, number>;
  byDifficulty: Record<DifficultyTier, number>;
} {
  const byLevel: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0, 10: 0 };
  const byDifficulty: Record<DifficultyTier, number> = { EASY: 0, MEDIUM: 0, HARD: 0, EXPERT: 0 };
  const seenIds = new Set<string>();

  for (const q of QUESTION_BANK) {
    if (seenIds.has(q.id)) {
      throw new Error(`[QuestionBank] Duplicate question ID detected: ${q.id}`);
    }
    seenIds.add(q.id);

    if (q.levelId < 1 || q.levelId > 10) {
      throw new Error(`[QuestionBank] Invalid levelId ${q.levelId} in question ${q.id}`);
    }

    const expectedDifficulty = LEVEL_DIFFICULTY_POLICY[q.levelId];
    if (q.difficulty !== expectedDifficulty) {
      throw new Error(`[QuestionBank] Difficulty mismatch in ${q.id}: expected ${expectedDifficulty}, got ${q.difficulty}`);
    }

    if (!q.question || q.question.trim().length === 0) {
      throw new Error(`[QuestionBank] Empty question prompt in ${q.id}`);
    }

    if (!q.answer || q.answer.trim().length === 0) {
      throw new Error(`[QuestionBank] Empty answer in ${q.id}`);
    }

    if (!q.acceptedAnswers || q.acceptedAnswers.length === 0) {
      throw new Error(`[QuestionBank] No accepted answers in ${q.id}`);
    }

    byLevel[q.levelId]++;
    byDifficulty[q.difficulty]++;
  }

  for (let lvl = 1; lvl <= 10; lvl++) {
    if (byLevel[lvl] === 0) {
      throw new Error(`[QuestionBank] Level ${lvl} has zero active questions!`);
    }
  }

  return { total: QUESTION_BANK.length, byLevel, byDifficulty };
}

/**
 * Finds a specific question by ID.
 */
export function getQuestionById(id: string): QuestionDefinition | null {
  return QUESTION_BANK.find((q) => q.id === id) || null;
}

/**
 * Returns all active questions for a specific level.
 */
export function getQuestionsForLevel(levelId: number): QuestionDefinition[] {
  const expectedDifficulty = LEVEL_DIFFICULTY_POLICY[levelId];
  return QUESTION_BANK.filter(
    (q) => q.levelId === levelId && q.difficulty === expectedDifficulty && q.isActive
  );
}

/**
 * Selects a question for a player from the required level and difficulty.
 * If excludeIds is provided (e.g. questions currently occupied by other active players),
 * attempts to select a question not in excludeIds.
 * If all questions are currently occupied, gracefully falls back to a random question from
 * the full pool for that level (never returns null or blocks gameplay).
 */
export function selectQuestionForPlayer(
  playerOrLevel: string | number,
  levelOrExclude?: number | string[] | Set<string>
): QuestionDefinition {
  let levelId: number;
  let excludeIds: string[] = [];

  if (typeof playerOrLevel === "number") {
    levelId = playerOrLevel;
    if (Array.isArray(levelOrExclude)) {
      excludeIds = levelOrExclude;
    } else if (levelOrExclude instanceof Set) {
      excludeIds = Array.from(levelOrExclude);
    }
  } else {
    levelId = typeof levelOrExclude === "number" ? levelOrExclude : 1;
  }

  const pool = getQuestionsForLevel(levelId);
  if (pool.length === 0) {
    throw new Error(`[QuestionBank] No active questions found for Level ${levelId}`);
  }

  // Filter out questions currently occupied by other active players
  const eligible = pool.filter((q) => !excludeIds.includes(q.id));

  // If unassigned questions exist, select from them; otherwise, safely fall back to the full pool
  const candidatePool = eligible.length > 0 ? eligible : pool;

  const randomIndex = Math.floor(Math.random() * candidatePool.length);
  return candidatePool[randomIndex];
}

/**
 * Normalizes and checks if a submitted answer matches the accepted answers for a question.
 * Supports passing either a QuestionDefinition or a question ID string.
 */
export function isAnswerCorrect(
  questionOrId: QuestionDefinition | string,
  submittedAnswer: string
): boolean {
  if (!submittedAnswer || typeof submittedAnswer !== "string") return false;
  const cleanSubmitted = submittedAnswer.trim().toLowerCase();
  if (!cleanSubmitted) return false;

  const question = typeof questionOrId === "string" ? getQuestionById(questionOrId) : questionOrId;
  if (!question) return false;

  return question.acceptedAnswers.some((accepted) => {
    const cleanAccepted = accepted.trim().toLowerCase();
    if (cleanSubmitted === cleanAccepted) {
      return true;
    }

    // Numeric comparison: if both are valid finite numbers, compare numerically
    const numSubmitted = Number(cleanSubmitted);
    const numAccepted = Number(cleanAccepted);
    if (
      cleanSubmitted !== "" &&
      cleanAccepted !== "" &&
      Number.isFinite(numSubmitted) &&
      Number.isFinite(numAccepted) &&
      numSubmitted === numAccepted
    ) {
      return true;
    }

    return false;
  });
}

/**
 * Summarizes the Question Bank distribution and validation state for administrative dashboards.
 */
export function getQuestionBankSummary() {
  let valid = true;
  const errors: string[] = [];
  try {
    validateQuestionBank();
  } catch (err) {
    valid = false;
    errors.push(err instanceof Error ? err.message : String(err));
  }
  const levelsSummary: Record<number, { count: number; difficulty: string; questions: { id: string; type: string }[] }> = {};

  for (let l = 1; l <= 10; l++) {
    const qs = getQuestionsForLevel(l);
    levelsSummary[l] = {
      count: qs.length,
      difficulty: LEVEL_DIFFICULTY_POLICY[l as keyof typeof LEVEL_DIFFICULTY_POLICY],
      questions: qs.map((q) => ({ id: q.id, type: q.type })),
    };
  }

  return {
    valid,
    totalQuestions: QUESTION_BANK.length,
    validationErrors: errors,
    levels: levelsSummary,
  };
}
