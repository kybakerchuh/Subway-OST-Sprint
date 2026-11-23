import { User } from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { HOVERBOARDS } from '../data/topics';
import {
  createFreshWeeklyChallenge,
  getCurrentWeekId,
  WEEKLY_CHALLENGES,
} from '../data/weeklyChallenges';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';
import { LeaderboardEntry, TopicId, UserProgress, WeeklyChallengeState } from '../types/game';

const LOCAL_STORAGE_KEY = 'subway_ost_sprint_progress_v1';
let pendingCloudSave: Promise<void> = Promise.resolve();

export const DEFAULT_PROGRESS: UserProgress = {
  uid: null,
  displayName: 'Guest Runner',
  highScore: 0,
  totalCoins: 0,
  totalRuns: 0,
  totalCorrectOst: 0,
  totalAnsweredOst: 0,
  multiplierLevel: 1,
  ostWordsCompleted: 0,
  missionProgress: [0, 0, 0],
  weeklyChallenge: createFreshWeeklyChallenge(),
  selectedTopic: 'simplifying-expressions',
  selectedBoard: 'metro-amber',
  unlockedBoards: ['metro-amber'],
  topicCorrectCounts: {},
  topicAnsweredCounts: {},
};

function sanitizeNonNegInt(value: unknown, max: number): number {
  const num = typeof value === 'number' && Number.isFinite(value) ? Math.floor(value) : 0;
  return Math.max(0, Math.min(max, num));
}

function sanitizeLevel(value: unknown): number {
  const num = typeof value === 'number' && Number.isFinite(value) ? Math.floor(value) : 1;
  return Math.max(1, Math.min(30, num));
}

function sanitizeMissionProgress(value: unknown): [number, number, number] {
  if (!Array.isArray(value) || value.length !== 3) return [0, 0, 0];
  return [
    sanitizeNonNegInt(value[0], 1000000),
    sanitizeNonNegInt(value[1], 1000000),
    sanitizeNonNegInt(value[2], 1000000),
  ];
}

export function sanitizeWeeklyChallenge(value: unknown): WeeklyChallengeState {
  const currentWeek = getCurrentWeekId();
  if (!value || typeof value !== 'object') {
    return createFreshWeeklyChallenge();
  }
  const obj = value as Partial<WeeklyChallengeState>;
  const weekId = typeof obj.weekId === 'string' ? obj.weekId.slice(0, 16) : '';
  const challengeId = typeof obj.challengeId === 'string' ? obj.challengeId.slice(0, 32) : '';
  const validChallenge = WEEKLY_CHALLENGES.some((c) => c.id === challengeId);
  if (weekId !== currentWeek || !validChallenge) {
    return createFreshWeeklyChallenge();
  }
  return {
    weekId: currentWeek,
    challengeId,
    progress: sanitizeNonNegInt(obj.progress, 1000000),
    completed: Boolean(obj.completed),
    completedCount: sanitizeNonNegInt(obj.completedCount, 10000),
  };
}

export function extractFirstName(
  displayName: string | null | undefined,
  email?: string | null,
): string {
  const raw = (displayName ?? '').trim().replace(/\s+/g, ' ');
  if (raw.length > 0 && raw !== 'Guest Runner' && raw !== 'OST Runner') {
    if (raw.includes(',')) {
      const afterComma = raw.split(',')[1]?.trim().split(/\s+/)[0];
      if (afterComma) return afterComma.slice(0, 60);
    }
    const first = raw.split(/\s+/)[0];
    if (first) return first.slice(0, 60);
  }
  const emailLocal = (email ?? '').split('@')[0]?.trim();
  if (emailLocal) {
    const firstPart = emailLocal.split(/[._-]+/)[0];
    if (firstPart) {
      return (firstPart.charAt(0).toUpperCase() + firstPart.slice(1)).slice(0, 60);
    }
  }
  return 'Runner';
}

function sanitizeDisplayName(name: string | null | undefined, email?: string | null): string {
  return extractFirstName(name, email);
}

function sanitizeTopicMap(input: Record<string, number> | undefined): Record<string, number> {
  const out: Record<string, number> = {};
  if (!input) return out;
  const keys = Object.keys(input).slice(0, 15);
  for (const key of keys) {
    if (key.length > 0 && key.length <= 48) {
      out[key] = sanitizeNonNegInt(input[key], 1000000);
    }
  }
  return out;
}

export function sanitizeBoards(boards: string[] | undefined, totalCorrectOst = 0): string[] {
  const base = Array.isArray(boards)
    ? boards.filter((b) => typeof b === 'string' && b.length > 0 && b.length <= 32)
    : [];
  const milestoneUnlocked = HOVERBOARDS.filter(
    (b) => typeof b.requiredCorrectOst === 'number' && totalCorrectOst >= b.requiredCorrectOst,
  ).map((b) => b.id);
  return Array.from(new Set(['metro-amber', ...base, ...milestoneUnlocked])).slice(0, 16);
}

export function loadLocalProgress(): UserProgress {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_PROGRESS, weeklyChallenge: createFreshWeeklyChallenge() };
    const parsed = JSON.parse(raw) as Partial<UserProgress>;
    const totalCorrectOst = sanitizeNonNegInt(parsed.totalCorrectOst, 1000000);
    return {
      ...DEFAULT_PROGRESS,
      ...parsed,
      highScore: sanitizeNonNegInt(parsed.highScore, 100000000),
      totalCoins: sanitizeNonNegInt(parsed.totalCoins, 100000000),
      totalRuns: sanitizeNonNegInt(parsed.totalRuns, 1000000),
      totalCorrectOst,
      totalAnsweredOst: Math.max(totalCorrectOst, sanitizeNonNegInt(parsed.totalAnsweredOst, 1000000)),
      multiplierLevel: sanitizeLevel(parsed.multiplierLevel),
      ostWordsCompleted: sanitizeNonNegInt(parsed.ostWordsCompleted, 1000000),
      missionProgress: sanitizeMissionProgress(parsed.missionProgress),
      weeklyChallenge: sanitizeWeeklyChallenge(parsed.weeklyChallenge),
      unlockedBoards: sanitizeBoards(parsed.unlockedBoards, totalCorrectOst),
      topicCorrectCounts: sanitizeTopicMap(parsed.topicCorrectCounts),
      topicAnsweredCounts: sanitizeTopicMap(parsed.topicAnsweredCounts),
    };
  } catch {
    return { ...DEFAULT_PROGRESS, weeklyChallenge: createFreshWeeklyChallenge() };
  }
}

export function saveLocalProgress(progress: UserProgress): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(progress));
  } catch {
    // Ignore storage quota errors
  }
}

export async function syncUserOnSignIn(
  user: User,
  localProgress: UserProgress,
): Promise<UserProgress> {
  const userPath = `users/${user.uid}`;
  const userRef = doc(db, 'users', user.uid);
  const displayName = sanitizeDisplayName(user.displayName, user.email);
  // Only merge local stats if they belong to a guest session or this same Google account
  const mergeLocal = !localProgress.uid || localProgress.uid === user.uid;
  const guestProgress: UserProgress = mergeLocal
    ? localProgress
    : { ...DEFAULT_PROGRESS, weeklyChallenge: createFreshWeeklyChallenge() };

  try {
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      const remote = snap.data();
      const mergedCorrect = Math.max(
        sanitizeNonNegInt(remote.totalCorrectOst, 1000000),
        guestProgress.totalCorrectOst,
      );
      const mergedAnswered = Math.max(
        mergedCorrect,
        sanitizeNonNegInt(remote.totalAnsweredOst, 1000000),
        guestProgress.totalAnsweredOst,
      );
      const remoteLevel = sanitizeLevel(remote.multiplierLevel);
      const guestLevel = sanitizeLevel(guestProgress.multiplierLevel);
      const mergedLevel = Math.max(remoteLevel, guestLevel);

      const remoteMissions = sanitizeMissionProgress(remote.missionProgress);
      const guestMissions = sanitizeMissionProgress(guestProgress.missionProgress);
      const mergedMissions: [number, number, number] =
        remoteLevel > guestLevel
          ? remoteMissions
          : guestLevel > remoteLevel
            ? guestMissions
            : [
                Math.max(remoteMissions[0], guestMissions[0]),
                Math.max(remoteMissions[1], guestMissions[1]),
                Math.max(remoteMissions[2], guestMissions[2]),
              ];

      const guestWeekly = sanitizeWeeklyChallenge(guestProgress.weeklyChallenge);
      const hasRemoteWeekly = Boolean(remote.weeklyChallenge && typeof remote.weeklyChallenge === 'object');
      const remoteWeekly = hasRemoteWeekly ? sanitizeWeeklyChallenge(remote.weeklyChallenge) : null;
      let mergedWeekly: WeeklyChallengeState = guestWeekly;
      if (remoteWeekly) {
        if (remoteWeekly.challengeId === guestWeekly.challengeId) {
          mergedWeekly = {
            weekId: remoteWeekly.weekId,
            challengeId: remoteWeekly.challengeId,
            progress: Math.max(remoteWeekly.progress, guestWeekly.progress),
            completed: remoteWeekly.completed || guestWeekly.completed,
            completedCount: Math.max(remoteWeekly.completedCount, guestWeekly.completedCount),
          };
        } else if (
          remoteWeekly.completedCount > guestWeekly.completedCount ||
          (remoteWeekly.completedCount === guestWeekly.completedCount &&
            remoteWeekly.progress >= guestWeekly.progress)
        ) {
          mergedWeekly = remoteWeekly;
        }
      }

      const merged: UserProgress = {
        uid: user.uid,
        displayName,
        highScore: Math.max(
          sanitizeNonNegInt(remote.highScore, 100000000),
          guestProgress.highScore,
        ),
        totalCoins: Math.max(
          sanitizeNonNegInt(remote.totalCoins, 100000000),
          guestProgress.totalCoins,
        ),
        totalRuns: Math.max(
          sanitizeNonNegInt(remote.totalRuns, 1000000),
          guestProgress.totalRuns,
        ),
        totalCorrectOst: mergedCorrect,
        totalAnsweredOst: mergedAnswered,
        multiplierLevel: mergedLevel,
        ostWordsCompleted: Math.max(
          sanitizeNonNegInt(remote.ostWordsCompleted, 1000000),
          guestProgress.ostWordsCompleted,
        ),
        missionProgress: mergedMissions,
        weeklyChallenge: mergedWeekly,
        selectedTopic: (remote.selectedTopic as TopicId) || guestProgress.selectedTopic,
        selectedBoard: (remote.selectedBoard as string) || guestProgress.selectedBoard,
        unlockedBoards: sanitizeBoards(
          [
            ...(Array.isArray(remote.unlockedBoards) ? remote.unlockedBoards : []),
            ...guestProgress.unlockedBoards,
          ],
          mergedCorrect,
        ),
        topicCorrectCounts: mergeTopicMaps(
          remote.topicCorrectCounts as Record<string, number>,
          guestProgress.topicCorrectCounts,
        ),
        topicAnsweredCounts: mergeTopicMaps(
          remote.topicAnsweredCounts as Record<string, number>,
          guestProgress.topicAnsweredCounts,
        ),
      };

      await saveCloudProgress(merged, Math.max(merged.highScore, 0), 0, true);
      return merged;
    }

    const totalCorrect = sanitizeNonNegInt(guestProgress.totalCorrectOst, 1000000);
    const totalAnswered = Math.max(
      totalCorrect,
      sanitizeNonNegInt(guestProgress.totalAnsweredOst, 1000000),
    );
    const initial: UserProgress = {
      ...guestProgress,
      uid: user.uid,
      displayName,
      totalCorrectOst: totalCorrect,
      totalAnsweredOst: totalAnswered,
      multiplierLevel: sanitizeLevel(guestProgress.multiplierLevel),
      ostWordsCompleted: sanitizeNonNegInt(guestProgress.ostWordsCompleted, 1000000),
      missionProgress: sanitizeMissionProgress(guestProgress.missionProgress),
      weeklyChallenge: sanitizeWeeklyChallenge(guestProgress.weeklyChallenge),
      unlockedBoards: sanitizeBoards(guestProgress.unlockedBoards, totalCorrect),
      topicCorrectCounts: sanitizeTopicMap(guestProgress.topicCorrectCounts),
      topicAnsweredCounts: sanitizeTopicMap(guestProgress.topicAnsweredCounts),
    };

    try {
      await setDoc(userRef, {
        uid: user.uid,
        displayName: initial.displayName,
        highScore: initial.highScore,
        totalCoins: initial.totalCoins,
        totalRuns: initial.totalRuns,
        totalCorrectOst: initial.totalCorrectOst,
        totalAnsweredOst: initial.totalAnsweredOst,
        multiplierLevel: initial.multiplierLevel,
        ostWordsCompleted: initial.ostWordsCompleted,
        missionProgress: initial.missionProgress,
        weeklyChallenge: initial.weeklyChallenge,
        selectedTopic: initial.selectedTopic.slice(0, 48),
        selectedBoard: initial.selectedBoard.slice(0, 32),
        unlockedBoards: initial.unlockedBoards,
        topicCorrectCounts: initial.topicCorrectCounts,
        topicAnsweredCounts: initial.topicAnsweredCounts,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, userPath);
    }

    await upsertLeaderboardEntry(initial, 0);
    return initial;
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('{')) {
      throw error;
    }
    handleFirestoreError(error, OperationType.GET, userPath);
  }
}

function mergeTopicMaps(
  a: Record<string, number> | undefined,
  b: Record<string, number> | undefined,
): Record<string, number> {
  const out: Record<string, number> = sanitizeTopicMap(a);
  const cleanB = sanitizeTopicMap(b);
  for (const [key, val] of Object.entries(cleanB)) {
    out[key] = Math.max(out[key] ?? 0, val);
  }
  return out;
}

export function saveCloudProgress(
  progress: UserProgress,
  runScore = 0,
  runCoins = 0,
  alreadyExists = true,
): Promise<void> {
  const nextSave = pendingCloudSave
    .catch(() => {})
    .then(() => performSaveCloudProgress(progress, runScore, runCoins, alreadyExists));
  pendingCloudSave = nextSave.catch(() => {});
  return nextSave;
}

async function performSaveCloudProgress(
  progress: UserProgress,
  _runScore = 0,
  runCoins = 0,
  _alreadyExists = true,
): Promise<void> {
  const effectiveUid = progress.uid ?? auth.currentUser?.uid ?? null;
  if (!effectiveUid) return;

  const userPath = `users/${effectiveUid}`;
  const userRef = doc(db, 'users', effectiveUid);

  const safeName = sanitizeDisplayName(
    auth.currentUser?.displayName ?? progress.displayName,
    auth.currentUser?.email,
  );
  const safeCorrect = sanitizeNonNegInt(progress.totalCorrectOst, 1000000);
  const safeAnswered = Math.max(
    safeCorrect,
    sanitizeNonNegInt(progress.totalAnsweredOst, 1000000),
  );
  const safeBoard = (progress.selectedBoard || 'metro-amber').slice(0, 32);
  const safeTopic = (progress.selectedTopic || 'simplifying-expressions').slice(0, 48);
  const normalizedProgress: UserProgress = {
    ...progress,
    uid: effectiveUid,
    displayName: safeName,
    totalCorrectOst: safeCorrect,
    totalAnsweredOst: safeAnswered,
    selectedBoard: safeBoard,
    selectedTopic: safeTopic as TopicId,
  };

  let exists = false;
  try {
    const snap = await getDoc(userRef);
    exists = snap.exists();
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, userPath);
  }

  const updateFields = {
    displayName: safeName,
    highScore: sanitizeNonNegInt(normalizedProgress.highScore, 100000000),
    totalCoins: sanitizeNonNegInt(normalizedProgress.totalCoins, 100000000),
    totalRuns: sanitizeNonNegInt(normalizedProgress.totalRuns, 1000000),
    totalCorrectOst: safeCorrect,
    totalAnsweredOst: safeAnswered,
    multiplierLevel: sanitizeLevel(normalizedProgress.multiplierLevel),
    ostWordsCompleted: sanitizeNonNegInt(normalizedProgress.ostWordsCompleted, 1000000),
    missionProgress: sanitizeMissionProgress(normalizedProgress.missionProgress),
    weeklyChallenge: sanitizeWeeklyChallenge(normalizedProgress.weeklyChallenge),
    selectedTopic: safeTopic,
    selectedBoard: safeBoard,
    unlockedBoards: sanitizeBoards(normalizedProgress.unlockedBoards, safeCorrect),
    topicCorrectCounts: sanitizeTopicMap(normalizedProgress.topicCorrectCounts),
    topicAnsweredCounts: sanitizeTopicMap(normalizedProgress.topicAnsweredCounts),
    updatedAt: serverTimestamp(),
  };

  try {
    if (exists) {
      await updateDoc(userRef, updateFields);
    } else {
      await setDoc(userRef, {
        uid: effectiveUid,
        ...updateFields,
        createdAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, exists ? OperationType.UPDATE : OperationType.CREATE, userPath);
  }

  await upsertLeaderboardEntry(normalizedProgress, runCoins);
}

async function upsertLeaderboardEntry(
  progress: UserProgress,
  runCoins: number,
): Promise<void> {
  const effectiveUid = progress.uid ?? auth.currentUser?.uid ?? null;
  if (!effectiveUid) return;
  const lbPath = `leaderboard/${effectiveUid}`;
  const lbRef = doc(db, 'leaderboard', effectiveUid);

  const safeCorrect = sanitizeNonNegInt(progress.totalCorrectOst, 1000000);
  const safeAnswered = Math.max(
    safeCorrect,
    sanitizeNonNegInt(progress.totalAnsweredOst, 1000000),
  );
  const safeName = sanitizeDisplayName(
    auth.currentUser?.displayName ?? progress.displayName,
    auth.currentUser?.email,
  );

  let existingBestCoins = 0;
  let exists = false;
  try {
    const snap = await getDoc(lbRef);
    if (snap.exists()) {
      exists = true;
      existingBestCoins = sanitizeNonNegInt(snap.data().bestCoins, 10000000);
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, lbPath);
  }

  const updatePayload = {
    displayName: safeName,
    highScore: sanitizeNonNegInt(progress.highScore, 100000000),
    totalCorrectOst: safeCorrect,
    totalAnsweredOst: safeAnswered,
    bestCoins: Math.max(existingBestCoins, sanitizeNonNegInt(runCoins, 10000000)),
    favoriteTopic: (progress.selectedTopic || 'simplifying-expressions').slice(0, 48),
    updatedAt: serverTimestamp(),
  };

  try {
    if (exists) {
      await updateDoc(lbRef, updatePayload);
    } else {
      await setDoc(lbRef, {
        uid: effectiveUid,
        ...updatePayload,
      });
    }
  } catch (error) {
    handleFirestoreError(error, exists ? OperationType.UPDATE : OperationType.CREATE, lbPath);
  }
}

export async function fetchLeaderboard(
  sortBy: 'highScore' | 'totalCorrectOst',
): Promise<LeaderboardEntry[]> {
  try {
    await pendingCloudSave;
  } catch {
    // Ignore failed prior save and still fetch current leaderboard
  }
  const path = 'leaderboard';
  try {
    const q = query(
      collection(db, path),
      where(sortBy, '>=', 0),
      orderBy(sortBy, 'desc'),
      limit(25),
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => {
      const data = d.data();
      return {
        uid: String(data.uid ?? d.id),
        displayName: extractFirstName(String(data.displayName ?? 'Runner')),
        highScore: Number(data.highScore ?? 0),
        totalCorrectOst: Number(data.totalCorrectOst ?? 0),
        totalAnsweredOst: Number(data.totalAnsweredOst ?? 0),
        bestCoins: Number(data.bestCoins ?? 0),
        favoriteTopic: String(data.favoriteTopic ?? 'simplifying-expressions'),
        updatedAt: data.updatedAt,
      };
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}
