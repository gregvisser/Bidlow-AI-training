"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { moveLesson, moveLessonResourceLink, moveModule } from "@/app/actions/admin-catalog";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp } from "lucide-react";

export function ModuleReorderButtons({
  courseId,
  moduleId,
  index,
  total,
}: {
  courseId: string;
  moduleId: string;
  index: number;
  total: number;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  function go(dir: "up" | "down") {
    start(async () => {
      await moveModule(courseId, moduleId, dir);
      router.refresh();
    });
  }

  return (
    <div className="flex gap-1">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        disabled={pending || index === 0}
        onClick={() => go("up")}
        aria-label="Move module up"
      >
        <ChevronUp className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        disabled={pending || index === total - 1}
        onClick={() => go("down")}
        aria-label="Move module down"
      >
        <ChevronDown className="h-4 w-4" />
      </Button>
    </div>
  );
}

export function LessonReorderButtons({
  courseId,
  moduleId,
  lessonId,
  index,
  total,
}: {
  courseId: string;
  moduleId: string;
  lessonId: string;
  index: number;
  total: number;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  function go(dir: "up" | "down") {
    start(async () => {
      await moveLesson(courseId, moduleId, lessonId, dir);
      router.refresh();
    });
  }

  return (
    <div className="flex gap-1">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        disabled={pending || index === 0}
        onClick={() => go("up")}
        aria-label="Move lesson up"
      >
        <ChevronUp className="h-3.5 w-3.5" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        disabled={pending || index === total - 1}
        onClick={() => go("down")}
        aria-label="Move lesson down"
      >
        <ChevronDown className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

export function ResourceLinkReorderButtons({
  courseId,
  lessonId,
  linkId,
  index,
  total,
}: {
  courseId: string;
  lessonId: string;
  linkId: string;
  index: number;
  total: number;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  function go(dir: "up" | "down") {
    start(async () => {
      await moveLessonResourceLink(courseId, lessonId, linkId, dir);
      router.refresh();
    });
  }

  return (
    <div className="flex gap-1">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        disabled={pending || index === 0}
        onClick={() => go("up")}
        aria-label="Move link up"
      >
        <ChevronUp className="h-3.5 w-3.5" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        disabled={pending || index === total - 1}
        onClick={() => go("down")}
        aria-label="Move link down"
      >
        <ChevronDown className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
