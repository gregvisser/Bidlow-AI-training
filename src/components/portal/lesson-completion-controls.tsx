"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { setLessonCompletion } from "@/app/actions/lesson-progress";
import { Button } from "@/components/ui/button";

export function LessonCompletionControls(props: {
  courseSlug: string;
  moduleSlug: string;
  lessonSlug: string;
  initialCompleted: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [completed, setCompleted] = useState(props.initialCompleted);
  const [error, setError] = useState<string | null>(null);

  async function toggle(next: boolean) {
    setPending(true);
    setError(null);
    const res = await setLessonCompletion({
      courseSlug: props.courseSlug,
      moduleSlug: props.moduleSlug,
      lessonSlug: props.lessonSlug,
      completed: next,
    });
    setPending(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    setCompleted(next);
    router.refresh();
  }

  return (
    <div className="space-y-3">
      {error && (
        <p className="text-sm text-red-300" role="alert">
          {error}
        </p>
      )}
      <div className="flex flex-wrap gap-3">
        {!completed ? (
          <Button type="button" disabled={pending} onClick={() => toggle(true)}>
            {pending ? "Saving…" : "Mark complete"}
          </Button>
        ) : (
          <Button type="button" variant="secondary" disabled={pending} onClick={() => toggle(false)}>
            {pending ? "Saving…" : "Mark incomplete"}
          </Button>
        )}
      </div>
    </div>
  );
}
