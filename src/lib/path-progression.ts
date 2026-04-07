export type PathProgressionVm = {
  startHref: string;
  startTitle: string;
  resumeHref: string | null;
  resumeLabel: string | null;
  nextCourseTitle: string | null;
  nextCourseHref: string | null;
  pathComplete: boolean;
  /** Incomplete lessons exist only in the last course of the path (no following course to show). */
  inLastIncompleteCourse: boolean;
  /** Shown when `pathComplete` — browse other tracks. */
  moreTracksHref: string | null;
};
