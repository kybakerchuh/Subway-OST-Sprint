# Security Specification & Payload-First TDD

## Data Invariants
1. A `/users/{userId}` document can only be read, created, or updated by the authenticated, email-verified user whose `request.auth.uid == userId`.
2. A `/users/{userId}` document never contains PII such as email, phone, or physical address, and `list` queries on `/users` are strictly forbidden.
3. A `/leaderboard/{userId}` document contains zero PII and can only be created or updated by the authenticated, email-verified owner (`request.auth.uid == userId`).
4. Both `createdAt` and `updatedAt` timestamps must match `request.time`; `createdAt` and `uid` are immutable after creation.
5. Numeric counters (`highScore`, `totalCoins`, `totalRuns`, `totalCorrectOst`, `totalAnsweredOst`, `bestCoins`) must be non-negative integers within bounded sane limits, and strings/arrays/maps have strict `.size()` bounds.

## Dirty Dozen Adversarial Payloads
1. **Unauthenticated Write to `/users/userA`**: Unauthenticated request attempts `setDoc` -> `PERMISSION_DENIED`.
2. **Cross-User Profile Read (`/users/userB` by `userA`)**: Authenticated `userA` attempts `getDoc` on `userB` -> `PERMISSION_DENIED`.
3. **Cross-User Profile Write (`/users/userB` by `userA`)**: Authenticated `userA` attempts `updateDoc` on `userB` -> `PERMISSION_DENIED`.
4. **UID Spoofing on Create (`/users/userA` with `uid: "userB"`)**: `userA` sets `uid: "userB"` in payload -> `PERMISSION_DENIED`.
5. **Shadow / Ghost Field Injection (`isAdmin: true`)**: `userA` adds `isAdmin: true` to `/users/userA` or `/leaderboard/userA` -> `PERMISSION_DENIED`.
6. **Unverified Email Spoof**: User with `email_verified: false` attempts write -> `PERMISSION_DENIED`.
7. **Timestamp Forgery**: Payload sends a hardcoded past timestamp instead of `serverTimestamp()` -> `PERMISSION_DENIED`.
8. **Immutable Field Mutation**: Update attempts to change `createdAt` or `uid` on `/users/userA` -> `PERMISSION_DENIED`.
9. **ID Poisoning**: Document ID exceeds 128 chars or contains `/`, `.`, or spaces -> `PERMISSION_DENIED`.
10. **Array Exhaustion**: `unlockedBoards` array exceeds max size (16) or contains non-string element -> `PERMISSION_DENIED`.
11. **Negative Score / Counter Poisoning**: `highScore: -500` or `totalCorrectOst: -1` -> `PERMISSION_DENIED`.
12. **Blanket User Listing**: Authenticated user attempts `getDocs(collection(db, 'users'))` -> `PERMISSION_DENIED`.
