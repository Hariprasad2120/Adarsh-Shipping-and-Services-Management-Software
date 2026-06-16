"use client";

import React, { useState, useEffect } from "react";
import { BookOpen, Award, CheckCircle, Play, Sparkles, Loader2, BookOpenCheck } from "lucide-react";
import { toast } from "sonner";

export function LmsView() {
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [actingCourseId, setActingCourseId] = useState<string | null>(null);

  const fetchCourses = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/hrms/peopleplus/lms");
      const json = await res.json();
      if (json.ok) {
        setCourses(json.data);
      }
    } catch (e) {
      toast.error("Failed to load courses");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  const handleEnroll = async (courseId: string) => {
    setActingCourseId(courseId);
    try {
      const res = await fetch("/api/hrms/peopleplus/lms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId }),
      });
      const json = await res.json();
      if (json.ok) {
        toast.success("Enrolled successfully! Start learning now.");
        fetchCourses();
      } else {
        toast.error("Enrollment failed");
      }
    } catch (e) {
      toast.error("Error during enrollment");
    } finally {
      setActingCourseId(null);
    }
  };

  const handleProgressChange = async (courseId: string, value: number) => {
    try {
      const res = await fetch("/api/hrms/peopleplus/lms", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId, progress: value }),
      });
      const json = await res.json();
      if (json.ok) {
        setCourses((prev) =>
          prev.map((c) => {
            if (c.id === courseId) {
              const updatedEnrollments = c.enrollments.map((e: any) => ({
                ...e,
                progress: value,
                status: value >= 100 ? "COMPLETED" : "IN_PROGRESS",
              }));
              return { ...c, enrollments: updatedEnrollments };
            }
            return c;
          })
        );
        if (value >= 100) {
          toast.success("Congratulations! You completed the course.");
        }
      }
    } catch (e) {
      toast.error("Failed to save progress");
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
        <Loader2 className="size-8 animate-spin text-[#00c4b6]" />
        <p className="text-xs font-semibold tracking-wider">Syncing course files...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="relative rounded-3xl border border-slate-800 bg-[#0f121b]/80 p-6 overflow-hidden shadow-2xl backdrop-blur-md">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#00c4b6]/5 rounded-full blur-3xl" />
        <div className="flex items-center gap-4">
          <div className="size-12 rounded-2xl bg-[#00c4b6]/10 border border-[#00c4b6]/35 flex items-center justify-center text-[#00c4b6] shadow-sm">
            <BookOpen className="size-6 animate-pulse" />
          </div>
          <div>
            <h1 className="text-lg font-black text-slate-100 uppercase tracking-widest">LMS TRAINING SYSTEM</h1>
            <p className="text-xs text-slate-500 font-bold mt-0.5 uppercase tracking-wider">Enroll in standard cargo & logistics certification courses</p>
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {courses.map((course) => {
          const enrollment = course.enrollments?.[0] || null;
          const isEnrolled = !!enrollment;
          const isCompleted = enrollment?.status === "COMPLETED" || enrollment?.progress >= 100;
          const progressVal = enrollment?.progress || 0;

          return (
            <div
              key={course.id}
              className={`rounded-3xl border p-5 flex flex-col justify-between transition-all duration-300 relative overflow-hidden backdrop-blur-sm ${
                isCompleted
                  ? "bg-gradient-to-b from-[#0e121b] to-emerald-950/20 border-emerald-500/20"
                  : "bg-[#0e121b]/60 border-slate-900 hover:border-slate-800"
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-1 rounded-xl bg-slate-950 text-slate-400 border border-slate-800/80 text-[9px] font-black uppercase tracking-wider select-none">
                    {course.category}
                  </span>
                  <span className="text-[10px] font-black text-[#00c4b6] tracking-wider uppercase font-mono">
                    {course.duration}
                  </span>
                </div>

                <div className="space-y-1">
                  <h3 className="text-sm font-black text-slate-200 uppercase tracking-wide leading-tight">
                    {course.title}
                  </h3>
                  <p className="text-[11px] text-slate-500 font-bold leading-relaxed line-clamp-3">
                    {course.description}
                  </p>
                </div>
              </div>

              <div className="pt-6 mt-6 border-t border-slate-900 space-y-4">
                {isEnrolled ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      <span>Course Progress</span>
                      <span className="font-mono text-slate-300">{Math.round(progressVal)}%</span>
                    </div>

                    {/* Progress Slider */}
                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min="0"
                        max="100"
                        step="10"
                        value={progressVal}
                        disabled={isCompleted}
                        onChange={(e) => handleProgressChange(course.id, Number(e.target.value))}
                        className="w-full accent-[#00c4b6] bg-slate-950 rounded-full h-1 cursor-pointer"
                      />
                    </div>

                    {isCompleted ? (
                      <div className="flex items-center justify-center gap-2 bg-emerald-500/10 border border-emerald-500/25 py-2.5 rounded-2xl text-[10px] font-black text-emerald-400 select-none uppercase tracking-widest">
                        <BookOpenCheck className="size-4 shrink-0" />
                        <span>Completed & Certified</span>
                      </div>
                    ) : (
                      <div className="text-center text-[9px] font-black text-[#00c4b6] animate-pulse select-none tracking-widest uppercase">
                        Active Study Session
                      </div>
                    )}
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled={actingCourseId !== null}
                    onClick={() => handleEnroll(course.id)}
                    className="w-full inline-flex items-center justify-center gap-2 bg-gradient-to-r from-slate-950 to-slate-900 hover:brightness-110 border border-slate-800 rounded-2xl py-3 text-xs font-black text-slate-200 cursor-pointer shadow-sm transition-all"
                  >
                    {actingCourseId === course.id ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Play className="size-3.5 fill-current" />
                    )}
                    <span>{actingCourseId === course.id ? "Enrolling..." : "ENROLL NOW"}</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
