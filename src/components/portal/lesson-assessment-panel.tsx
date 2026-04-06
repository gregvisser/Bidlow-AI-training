"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { setLessonAcknowledgements } from "@/app/actions/lesson-progress";
import { LessonCompletionControls } from "@/components/portal/lesson-completion-controls";
import { ClipboardCheck, ListChecks } from "lucide-react";

type Props = {
  courseSlug: string;
  moduleSlug: string;
  lessonSlug: string;
  exerciseRequired: boolean;
  checkpointRequired: boolean;
  exerciseTaskPresent: boolean;
  checkpointPrompt: string | null;
  initialExerciseAck: boolean;
  initialCheckpointAck: boolean;
  initialCompleted: boolean;
  canMarkComplete: boolean;
};

export function LessonAssessmentPanel(props: Props) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const exercise = props.initialExerciseAck;
  const checkpoint = props.initialCheckpointAck;

  const showExerciseAck = props.exerciseRequired;
  const showCheckpointAck = props.checkpointRequired;
  const showCheckpointCopy =
    !!props.checkpointPrompt?.trim() || props.checkpointRequired;

  async function syncAcks(nextEx: boolean, nextCp: boolean) {
    setPending(true);
    setError(null);
    const res = await setLessonAcknowledgements({
      courseSlug: props.courseSlug,
      moduleSlug: props.moduleSlug,
      lessonSlug: props.lessonSlug,
      exercise: nextEx,
      checkpoint: nextCp,
    });
    setPending(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    router.refresh();
  }

  const needsAckBar =
    !props.initialCompleted && (showExerciseAck || showCheckpointAck) && !props.canMarkComplete;

  return (
    <div className="space-y-6">
      {needsAckBar && (
        <p className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-sm text-amber-100/90">
          Complete the checklist below before marking this lesson done.
        </p>
      )}

      {showCheckpointCopy && (
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--accent)]">
            <ClipboardCheck className="h-4 w-4" aria-hidden />
            Self-check
          </p>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-[var(--muted-foreground)]">
            {props.checkpointPrompt?.trim() ||
              "Take a moment to confirm you worked through the objectives and any exercise for this lesson."}
          </p>
        </div>
      )}

      {(showExerciseAck || showCheckpointAck) && (
        <div className="space-y-4 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
            Completion checklist
          </p>
          {showExerciseAck && (
            <label className="flex cursor-pointer items-start gap-3 text-sm text-[var(--foreground)]">
              <input
                type="checkbox"
                className="mt-1 size-4 shrink-0 rounded border border-white/20 bg-[var(--input-bg)] accent-[var(--accent)]"
                checked={exercise}
                disabled={pending || props.initialCompleted}
                onChange={(e) => syncAcks(e.target.checked, checkpoint)}
              />
              <span>
                <span className="flex items-center gap-2 font-medium">
                  <ListChecks className="h-4 w-4 text-[var(--accent)]" aria-hidden />
                  {props.exerciseTaskPresent
                    ? "I completed the exercise for this lesson"
                    : "I completed the practice for this lesson"}
                </span>
                {props.exerciseRequired && (
                  <span className="mt-1 block text-xs text-[var(--muted-foreground)]">
                    Required to mark complete
                  </span>
                )}
              </span>
            </label>
          )}
          {showCheckpointAck && (
            <label className="flex cursor-pointer items-start gap-3 text-sm text-[var(--foreground)]">
              <input
                type="checkbox"
                className="mt-1 size-4 shrink-0 rounded border border-white/20 bg-[var(--input-bg)] accent-[var(--accent)]"
                checked={checkpoint}
                disabled={pending || props.initialCompleted}
                onChange={(e) => syncAcks(exercise, e.target.checked)}
              />
              <span>
                <span className="font-medium">I confirmed the self-check above</span>
                {props.checkpointRequired && (
                  <span className="mt-1 block text-xs text-[var(--muted-foreground)]">
                    Required to mark complete
                  </span>
                )}
              </span>
            </label>
          )}
        </div>
      )}

      {error && (
        <p className="text-sm text-red-300" role="alert">
          {error}
        </p>
      )}

      <LessonCompletionControls
        courseSlug={props.courseSlug}
        moduleSlug={props.moduleSlug}
        lessonSlug={props.lessonSlug}
        initialCompleted={props.initialCompleted}
        markCompleteDisabled={!props.initialCompleted && !props.canMarkComplete}
        markCompleteHint={
          !props.initialCompleted && !props.canMarkComplete
            ? "Confirm the checklist items first."
            : undefined
        }
      />
    </div>
  );
}
