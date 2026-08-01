"use client";

import { useEffect, useState } from "react";
import {
  BookOpen,
  BookOpenCheck,
  Clock3,
  GraduationCap,
  Loader2,
  Play,
} from "lucide-react";
import { toast } from "sonner";
import {
  PerformanceCard,
  PerformanceControlButton,
  PerformanceControlInput,
  PerformanceGrid,
  PerformanceLoadingState,
  PerformanceProgress,
  PerformanceSection,
  PerformanceSectionHeader,
  PerformanceStatus,
  PerformanceSummary,
  PerformanceSummaryGrid,
} from "@/modules/performance/components";
import { WorkspaceEmptyState } from "@/components/feedback/workspace-states";

type Enrollment = {
  progress: number;
  status: string;
};

type Course = {
  id: string;
  category: string;
  description: string;
  duration: string;
  enrollments?: Enrollment[];
  title: string;
};

export function LmsView() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(false);
  const [actingCourseId, setActingCourseId] = useState<string | null>(null);

  const fetchCourses = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/hrms/lms");
      const json = await res.json();
      if (json.ok) {
        setCourses(json.data);
      }
    } catch {
      toast.error("Failed to load courses");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // The catalogue is an external API snapshot loaded on mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchCourses();
  }, []);

  const handleEnroll = async (courseId: string) => {
    setActingCourseId(courseId);
    try {
      const res = await fetch("/api/hrms/lms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId }),
      });
      const json = await res.json();
      if (json.ok) {
        toast.success("Enrolled successfully! Start learning now.");
        await fetchCourses();
      } else {
        toast.error("Enrollment failed");
      }
    } catch {
      toast.error("Error during enrollment");
    } finally {
      setActingCourseId(null);
    }
  };

  const handleProgressChange = async (courseId: string, value: number) => {
    try {
      const res = await fetch("/api/hrms/lms", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId, progress: value }),
      });
      const json = await res.json();
      if (json.ok) {
        setCourses((previous) =>
          previous.map((course) => {
            if (course.id !== courseId) return course;
            return {
              ...course,
              enrollments: course.enrollments?.map((enrollment) => ({
                ...enrollment,
                progress: value,
                status: value >= 100 ? "COMPLETED" : "IN_PROGRESS",
              })),
            };
          }),
        );
        if (value >= 100) {
          toast.success("Congratulations! You completed the course.");
        }
      }
    } catch {
      toast.error("Failed to save progress");
    }
  };

  if (loading) {
    return (
      <PerformanceLoadingState description="Synchronising the learning catalogue and your enrolments." />
    );
  }

  const enrolledCount = courses.filter(
    (course) => course.enrollments?.length,
  ).length;
  const completedCount = courses.filter((course) => {
    const enrollment = course.enrollments?.[0];
    return (
      enrollment?.status === "COMPLETED" || (enrollment?.progress ?? 0) >= 100
    );
  }).length;

  return (
    <>
      <PerformanceSummaryGrid>
        <PerformanceSummary
          icon={<BookOpen aria-hidden="true" />}
          label="Available courses"
          value={courses.length}
          detail="Current learning catalogue"
        />
        <PerformanceSummary
          icon={<GraduationCap aria-hidden="true" />}
          label="Enrolled"
          value={enrolledCount}
          detail="Courses in your learning plan"
        />
        <PerformanceSummary
          icon={<BookOpenCheck aria-hidden="true" />}
          label="Completed"
          value={completedCount}
          detail="Courses completed and certified"
        />
        <PerformanceSummary
          icon={<Clock3 aria-hidden="true" />}
          label="In progress"
          value={Math.max(0, enrolledCount - completedCount)}
          detail="Courses awaiting completion"
        />
      </PerformanceSummaryGrid>

      <PerformanceSection>
        <PerformanceSectionHeader
          eyebrow="Learning catalogue"
          title="Cargo and logistics training"
          description="Enrol in available courses and keep progress current as you complete each learning unit."
        />
        {courses.length === 0 ? (
          <WorkspaceEmptyState
            title="No courses are available"
            description="Published learning courses will appear here when they are available to your organisation."
          />
        ) : (
          <PerformanceGrid className="p-5">
            {courses.map((course) => {
              const enrollment = course.enrollments?.[0] ?? null;
              const isEnrolled = Boolean(enrollment);
              const progress = enrollment?.progress ?? 0;
              const isCompleted =
                enrollment?.status === "COMPLETED" || progress >= 100;

              return (
                <PerformanceCard
                  key={course.id}
                  className="flex min-h-72 flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between gap-3">
                      <PerformanceStatus variant="neutral">
                        {course.category}
                      </PerformanceStatus>
                      <span className="mnx-text-muted font-mono text-xs">
                        {course.duration}
                      </span>
                    </div>
                    <h3 className="mnx-title-3 mt-5">{course.title}</h3>
                    <p className="mnx-text-muted mt-2 line-clamp-3 text-sm leading-6">
                      {course.description}
                    </p>
                  </div>

                  <div className="mt-6 border-t border-mono-border pt-5">
                    {isEnrolled ? (
                      <div className="grid gap-3">
                        <div className="flex items-center justify-between text-xs">
                          <span className="mnx-text-muted font-semibold uppercase tracking-wider">
                            Course progress
                          </span>
                          <span className="mnx-text-strong font-mono">
                            {Math.round(progress)}%
                          </span>
                        </div>
                        <PerformanceProgress
                          label={`${course.title} progress`}
                          value={progress}
                        />
                        <PerformanceControlInput
                          type="range"
                          min="0"
                          max="100"
                          step="10"
                          value={progress}
                          disabled={isCompleted}
                          aria-label={`Update ${course.title} progress`}
                          onChange={(event) =>
                            void handleProgressChange(
                              course.id,
                              Number(event.target.value),
                            )
                          }
                        />
                        <PerformanceStatus
                          variant={isCompleted ? "success" : "accent"}
                        >
                          {isCompleted
                            ? "Completed and certified"
                            : "Active study"}
                        </PerformanceStatus>
                      </div>
                    ) : (
                      <PerformanceControlButton
                        className="w-full"
                        disabled={actingCourseId !== null}
                        onClick={() => void handleEnroll(course.id)}
                      >
                        {actingCourseId === course.id ? (
                          <Loader2
                            className="mnx-state-spinner"
                            aria-hidden="true"
                          />
                        ) : (
                          <Play aria-hidden="true" />
                        )}
                        {actingCourseId === course.id
                          ? "Enrolling…"
                          : "Enrol now"}
                      </PerformanceControlButton>
                    )}
                  </div>
                </PerformanceCard>
              );
            })}
          </PerformanceGrid>
        )}
      </PerformanceSection>
    </>
  );
}
