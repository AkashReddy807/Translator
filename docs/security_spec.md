# Firestore Security Specification — Phase 1 (English to Telugu POC)

## Data Invariants
1. **PII Isolation (`/users/{userId}`)**: Readable only by `request.auth.uid == userId` or verified admin. Self-create enforces `role == 'contributor'`, verified email match, and `createdAt == request.time`.
2. **Private Translation History (`/translations/{translationId}`)**: Strictly owned by `userId == request.auth.uid`. Required keys: `userId`, `englishText` (1..1000), `teluguText` (1..1200), `teluguRomanized` (0..1200), `createdAt == request.time`. Immutable (`allow update: if false`). `allow list` enforces `resource.data.userId == request.auth.uid`.
3. **Admin Registry (`/admins/{adminId}`)**: Read-only by self, zero client writes.
4. **Global Default Deny**: Any unmatched path denies all reads and writes.
