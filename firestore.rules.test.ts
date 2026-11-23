// Adversarial security test suite specification for Firestore rules
// Validates that all Dirty Dozen payloads are rejected by firestore.rules.

export interface SecurityTestCase {
  name: string;
  collection: 'users' | 'leaderboard';
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  authUid: string | null;
  emailVerified: boolean;
  docId: string;
  payload?: Record<string, unknown>;
  expected: 'ALLOW' | 'PERMISSION_DENIED';
}

export const DIRTY_DOZEN_TESTS: SecurityTestCase[] = [
  {
    name: '1. Unauthenticated write to users',
    collection: 'users',
    operation: 'create',
    authUid: null,
    emailVerified: false,
    docId: 'userA',
    payload: { uid: 'userA', highScore: 100 },
    expected: 'PERMISSION_DENIED',
  },
  {
    name: '2. Cross-user profile read',
    collection: 'users',
    operation: 'get',
    authUid: 'userA',
    emailVerified: true,
    docId: 'userB',
    expected: 'PERMISSION_DENIED',
  },
  {
    name: '3. Cross-user leaderboard overwrite',
    collection: 'leaderboard',
    operation: 'update',
    authUid: 'userA',
    emailVerified: true,
    docId: 'userB',
    payload: { uid: 'userB', highScore: 999999 },
    expected: 'PERMISSION_DENIED',
  },
  {
    name: '4. UID spoofing on create',
    collection: 'users',
    operation: 'create',
    authUid: 'userA',
    emailVerified: true,
    docId: 'userA',
    payload: { uid: 'userB', displayName: 'Spoofer' },
    expected: 'PERMISSION_DENIED',
  },
  {
    name: '5. Ghost field injection (isAdmin)',
    collection: 'leaderboard',
    operation: 'create',
    authUid: 'userA',
    emailVerified: true,
    docId: 'userA',
    payload: { uid: 'userA', displayName: 'Player', isAdmin: true },
    expected: 'PERMISSION_DENIED',
  },
  {
    name: '6. Unverified email write attempt',
    collection: 'users',
    operation: 'create',
    authUid: 'userA',
    emailVerified: false,
    docId: 'userA',
    payload: { uid: 'userA', displayName: 'Unverified' },
    expected: 'PERMISSION_DENIED',
  },
  {
    name: '7. Forged timestamp outside request.time',
    collection: 'leaderboard',
    operation: 'create',
    authUid: 'userA',
    emailVerified: true,
    docId: 'userA',
    payload: { uid: 'userA', updatedAt: '2020-01-01T00:00:00Z' },
    expected: 'PERMISSION_DENIED',
  },
  {
    name: '8. Immutable createdAt mutation on update',
    collection: 'users',
    operation: 'update',
    authUid: 'userA',
    emailVerified: true,
    docId: 'userA',
    payload: { createdAt: 'request.time' },
    expected: 'PERMISSION_DENIED',
  },
  {
    name: '9. Invalid document ID poisoning',
    collection: 'users',
    operation: 'create',
    authUid: 'user$bad',
    emailVerified: true,
    docId: 'user$bad',
    payload: { uid: 'user$bad' },
    expected: 'PERMISSION_DENIED',
  },
  {
    name: '10. Array exhaustion on unlockedBoards',
    collection: 'users',
    operation: 'update',
    authUid: 'userA',
    emailVerified: true,
    docId: 'userA',
    payload: { unlockedBoards: ['1','2','3','4','5','6','7','8','9','10','11','12','13','14','15','16','17'] },
    expected: 'PERMISSION_DENIED',
  },
  {
    name: '11. Negative score poisoning',
    collection: 'leaderboard',
    operation: 'create',
    authUid: 'userA',
    emailVerified: true,
    docId: 'userA',
    payload: { uid: 'userA', highScore: -100 },
    expected: 'PERMISSION_DENIED',
  },
  {
    name: '12. Blanket users collection list query',
    collection: 'users',
    operation: 'list',
    authUid: 'userA',
    emailVerified: true,
    docId: '',
    expected: 'PERMISSION_DENIED',
  },
];
