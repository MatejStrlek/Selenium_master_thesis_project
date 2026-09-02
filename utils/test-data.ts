export const SEED_PASSWORD = 'password';

export const primaryUsers = {
  admin: { username: 'admin', password: SEED_PASSWORD },
  professor: { username: 'mkrmpotic', password: SEED_PASSWORD },
  student: { username: 'sivanovic', password: SEED_PASSWORD },
};

/**
 * Seeded course codes (data.sql) referenced by more than one spec — named
 * here instead of as bare string literals, mirroring the Playwright suite's
 * own utils/test-data.ts (same seed data, same app).
 */
export const course = {
  /** Introduction to Computer Science — owned by mkrmpotic (primaryUsers.professor). */
  cs101: 'CS101',
  /** Owned by aradovan, not mkrmpotic — used to prove professor course-list scoping. */
  bio101: 'BIO101',
  /** Electromagnetism — not in primaryUsers.student's (sivanovic) existing enrollments; used for enroll/drop. */
  phy201: 'PHY201',
  /** Creative Writing — likewise not pre-enrolled; used for a second, independent enroll/drop test. */
  eng201: 'ENG201',
  /**
   * Calculus I — owned by mkrmpotic, with its own pre-seeded graded
   * enrollments, deliberately separate from CS101's. See the Playwright
   * repo's README Suite Health note for why sharing one course between "reads
   * a pre-seeded grade" and "grades away the first available student" caused
   * real, repeated failures.
   */
  math201: 'MATH201',
} as const;

/** Numeric primary keys for the same seeded courses (course-content routes need an id, not a code). */
export const courseId = {
  cs101: 1,
  /** BIO101, owned by aradovan — used to prove a professor can't grade another professor's roster. */
  bio101: 6,
  /** Linear Algebra — no other spec manages content on it, so the shared student-content spec is collision-free. */
  math301: 12,
} as const;
