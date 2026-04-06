import { describe, expect, it } from "vitest";
import {
  canMarkLessonComplete,
  lessonLevelStats,
  overallWeightedPercent,
  percentCompleted,
  sumRemainingMinutes,
} from "./compute";

describe("percentCompleted", () => {
  it("returns 0 for empty total", () => {
    expect(percentCompleted(3, 0)).toBe(0);
  });
  it("rounds to one decimal", () => {
    expect(percentCompleted(1, 3)).toBe(33.3);
    expect(percentCompleted(2, 3)).toBe(66.7);
  });
});

describe("lessonLevelStats", () => {
  it("computes remaining minutes from incomplete lessons only", () => {
    const lessons = [
      {
        lessonId: "a",
        estimatedMinutes: 10,
        completedAt: new Date(),
        timeSpentSeconds: 600,
      },
      {
        lessonId: "b",
        estimatedMinutes: 20,
        completedAt: null,
        timeSpentSeconds: 0,
      },
    ];
    const s = lessonLevelStats(lessons);
    expect(s.completedLessons).toBe(1);
    expect(s.totalLessons).toBe(2);
    expect(s.minutesRemaining).toBe(20);
    expect(s.minutesCompletedEstimate).toBe(10);
    expect(s.percent).toBe(50);
  });
});

describe("overallWeightedPercent", () => {
  it("flattens course lists", () => {
    const p = overallWeightedPercent([
      [
        {
          lessonId: "1",
          estimatedMinutes: 10,
          completedAt: new Date(),
          timeSpentSeconds: 0,
        },
        {
          lessonId: "2",
          estimatedMinutes: 10,
          completedAt: null,
          timeSpentSeconds: 0,
        },
      ],
    ]);
    expect(p).toBe(50);
  });
});

describe("sumRemainingMinutes", () => {
  it("sums only incomplete", () => {
    expect(
      sumRemainingMinutes([
        {
          lessonId: "a",
          estimatedMinutes: 5,
          completedAt: new Date(),
          timeSpentSeconds: 0,
        },
        {
          lessonId: "b",
          estimatedMinutes: 7,
          completedAt: null,
          timeSpentSeconds: 0,
        },
      ]),
    ).toBe(7);
  });
});

describe("canMarkLessonComplete", () => {
  it("requires exercise acknowledgement when flagged", () => {
    expect(
      canMarkLessonComplete(
        { exerciseRequiredForCompletion: true, checkpointRequiredForCompletion: false },
        { exerciseAcknowledgedAt: null, checkpointAcknowledgedAt: null },
      ),
    ).toBe(false);
    expect(
      canMarkLessonComplete(
        { exerciseRequiredForCompletion: true, checkpointRequiredForCompletion: false },
        { exerciseAcknowledgedAt: new Date(), checkpointAcknowledgedAt: null },
      ),
    ).toBe(true);
  });

  it("requires checkpoint acknowledgement when flagged", () => {
    expect(
      canMarkLessonComplete(
        { exerciseRequiredForCompletion: false, checkpointRequiredForCompletion: true },
        { exerciseAcknowledgedAt: null, checkpointAcknowledgedAt: null },
      ),
    ).toBe(false);
    expect(
      canMarkLessonComplete(
        { exerciseRequiredForCompletion: false, checkpointRequiredForCompletion: true },
        { exerciseAcknowledgedAt: null, checkpointAcknowledgedAt: new Date() },
      ),
    ).toBe(true);
  });
});
