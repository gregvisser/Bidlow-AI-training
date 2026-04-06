/**
 * Pure progress math for lessons/modules/courses — unit-tested, DB-agnostic.
 */

export type LessonMetric = {
  lessonId: string;
  estimatedMinutes: number;
  completedAt: Date | null;
  timeSpentSeconds: number;
};

/** Whether acknowledgements allow marking a lesson complete (server enforces before setting completedAt). */
export function canMarkLessonComplete(
  lesson: {
    exerciseRequiredForCompletion: boolean;
    checkpointRequiredForCompletion: boolean;
  },
  progress: {
    exerciseAcknowledgedAt: Date | null;
    checkpointAcknowledgedAt: Date | null;
  } | null,
): boolean {
  if (lesson.exerciseRequiredForCompletion && !progress?.exerciseAcknowledgedAt) {
    return false;
  }
  if (lesson.checkpointRequiredForCompletion && !progress?.checkpointAcknowledgedAt) {
    return false;
  }
  return true;
}

export function percentCompleted(completed: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((completed / total) * 1000) / 10;
}

/** Sum estimated minutes for incomplete lessons (time remaining estimate). */
export function sumRemainingMinutes(lessons: LessonMetric[]): number {
  return lessons
    .filter((l) => !l.completedAt)
    .reduce((s, l) => s + l.estimatedMinutes, 0);
}

/** Sum estimated minutes for completed lessons. */
export function sumCompletedEstimateMinutes(lessons: LessonMetric[]): number {
  return lessons
    .filter((l) => l.completedAt)
    .reduce((s, l) => s + l.estimatedMinutes, 0);
}

export function sumTotalEstimateMinutes(lessons: LessonMetric[]): number {
  return lessons.reduce((s, l) => s + l.estimatedMinutes, 0);
}

export function totalTimeSpentHours(lessons: LessonMetric[]): number {
  const sec = lessons.reduce((s, l) => s + l.timeSpentSeconds, 0);
  return Math.round((sec / 3600) * 100) / 100;
}

export function lessonLevelStats(lessons: LessonMetric[]) {
  const total = lessons.length;
  const completed = lessons.filter((l) => l.completedAt).length;
  return {
    totalLessons: total,
    completedLessons: completed,
    percent: percentCompleted(completed, total),
    minutesRemaining: sumRemainingMinutes(lessons),
    minutesCompletedEstimate: sumCompletedEstimateMinutes(lessons),
    minutesTotalEstimate: sumTotalEstimateMinutes(lessons),
    hoursLogged: totalTimeSpentHours(lessons),
  };
}

export function moduleLevelStats(
  lessons: LessonMetric[],
): ReturnType<typeof lessonLevelStats> {
  return lessonLevelStats(lessons);
}

/** Aggregate multiple courses' lesson lists into one overall % (all lessons weighted equally). */
export function overallWeightedPercent(courseLessonLists: LessonMetric[][]): number {
  const flat = courseLessonLists.flat();
  return lessonLevelStats(flat).percent;
}
