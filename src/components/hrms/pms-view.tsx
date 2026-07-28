"use client";

import { useEffect, useState, type FormEvent } from "react";
import {
  Award,
  Calendar,
  CheckCircle2,
  Heart,
  MessageSquare,
  Plus,
  Target,
} from "lucide-react";
import { toast } from "sonner";
import {
  PerformanceCard,
  PerformanceControlButton,
  PerformanceControlInput,
  PerformanceControlSelect,
  PerformanceControlTextarea,
  PerformanceField,
  PerformanceGrid,
  PerformanceLoadingState,
  PerformanceProgress,
  PerformanceSection,
  PerformanceSectionHeader,
  PerformanceStatus,
  PerformanceSummary,
  PerformanceSummaryGrid,
  PerformanceTabs,
} from "@/components/monolith/performance-workspace";
import { WorkspaceEmptyState } from "@/components/monolith/workspace-states";

type Goal = {
  dueDate: string;
  id: string;
  progress: number;
  status: string;
  target: string;
  title: string;
};

type Skill = {
  id: string;
  proficiency: string;
  skill: { name: string };
};

type Feedback = {
  content: string;
  createdAt: string;
  feedbackType: string;
  fromUser: { name: string };
  id: string;
  toUser: { name: string };
};

type PerformanceData = {
  feedbacks: Feedback[];
  goals: Goal[];
  skills: Skill[];
};

type Colleague = {
  employeeNo: string;
  id: string;
  name: string;
};

export function PmsView() {
  const [activeTab, setActiveTab] = useState<"goals" | "skills" | "feedback">(
    "goals",
  );
  const [data, setData] = useState<PerformanceData | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [newGoalTitle, setNewGoalTitle] = useState("");
  const [newGoalTarget, setNewGoalTarget] = useState("");
  const [newGoalDueDate, setNewGoalDueDate] = useState("");
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [feedbackTo, setFeedbackTo] = useState("");
  const [feedbackContent, setFeedbackContent] = useState("");
  const [feedbackType, setFeedbackType] = useState("PEER_TO_PEER");
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);
  const [colleagues, setColleagues] = useState<Colleague[]>([]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/hrms/performance");
      const json = await response.json();
      if (json.ok) setData(json.data);
    } catch {
      toast.error("Failed to load PMS details");
    } finally {
      setLoading(false);
    }
  };

  const fetchColleagues = async () => {
    try {
      const response = await fetch("/api/hrms/employees");
      const json = await response.json();
      if (json.ok) {
        setColleagues(json.data);
        if (json.data.length > 0) setFeedbackTo(json.data[0].id);
      }
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    // Performance data is an external API snapshot loaded on mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchData();
    void fetchColleagues();
  }, []);

  const handleCreateGoal = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      const response = await fetch("/api/hrms/performance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_goal",
          title: newGoalTitle,
          target: newGoalTarget,
          dueDate: newGoalDueDate,
        }),
      });
      const json = await response.json();
      if (json.ok) {
        toast.success("OKR/Goal created successfully!");
        setNewGoalTitle("");
        setNewGoalTarget("");
        setNewGoalDueDate("");
        setShowGoalForm(false);
        await fetchData();
      }
    } catch {
      toast.error("Failed to create Goal");
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoalProgress = async (goalId: string, value: number) => {
    try {
      const response = await fetch("/api/hrms/performance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_goal_progress",
          goalId,
          progress: value,
        }),
      });
      const json = await response.json();
      if (json.ok) {
        setData((previous) =>
          previous
            ? {
                ...previous,
                goals: previous.goals.map((goal) =>
                  goal.id === goalId
                    ? {
                        ...goal,
                        progress: value,
                        status: value >= 100 ? "COMPLETED" : "IN_PROGRESS",
                      }
                    : goal,
                ),
              }
            : previous,
        );
      }
    } catch {
      toast.error("Failed to update goal progress");
    }
  };

  const handleCreateFeedback = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      const response = await fetch("/api/hrms/performance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "submit_feedback",
          toUserId: feedbackTo,
          content: feedbackContent,
          feedbackType,
        }),
      });
      const json = await response.json();
      if (json.ok) {
        toast.success("Feedback submitted!");
        setFeedbackContent("");
        setShowFeedbackForm(false);
        await fetchData();
      }
    } catch {
      toast.error("Failed to submit feedback");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <PerformanceLoadingState description="Synchronising goals, skills, and feedback records." />
    );
  }

  const goals = data?.goals ?? [];
  const skills = data?.skills ?? [];
  const feedbacks = data?.feedbacks ?? [];
  const completedGoals = goals.filter(
    (goal) => goal.status === "COMPLETED" || goal.progress >= 100,
  ).length;

  return (
    <>
      <PerformanceSummaryGrid>
        <PerformanceSummary
          icon={<Target aria-hidden="true" />}
          label="Active goals"
          value={goals.length - completedGoals}
          detail="Goals still in progress"
        />
        <PerformanceSummary
          icon={<CheckCircle2 aria-hidden="true" />}
          label="Completed goals"
          value={completedGoals}
          detail="Goals at full completion"
        />
        <PerformanceSummary
          icon={<Award aria-hidden="true" />}
          label="Skills"
          value={skills.length}
          detail="Skills recorded on your profile"
        />
        <PerformanceSummary
          icon={<MessageSquare aria-hidden="true" />}
          label="Feedback entries"
          value={feedbacks.length}
          detail="Performance feedback journal"
        />
      </PerformanceSummaryGrid>

      <PerformanceSection>
        <PerformanceSectionHeader
          eyebrow="Continuous performance"
          title="Goals, skills, and feedback"
          description="Keep performance evidence current between formal appraisal cycles."
          actions={
            activeTab === "goals" ? (
              <PerformanceControlButton
                onClick={() => setShowGoalForm((visible) => !visible)}
              >
                <Plus aria-hidden="true" /> Add goal
              </PerformanceControlButton>
            ) : activeTab === "feedback" ? (
              <PerformanceControlButton
                onClick={() => setShowFeedbackForm((visible) => !visible)}
              >
                <Plus aria-hidden="true" /> Give feedback
              </PerformanceControlButton>
            ) : null
          }
        />

        <div className="grid gap-5 p-5">
          <PerformanceTabs aria-label="Performance views">
            {(["goals", "skills", "feedback"] as const).map((tab) => (
              <PerformanceControlButton
                key={tab}
                role="tab"
                aria-selected={activeTab === tab}
                variant={activeTab === tab ? "primary" : "secondary"}
                onClick={() => setActiveTab(tab)}
              >
                {tab === "goals"
                  ? "OKR and goals"
                  : tab === "skills"
                    ? "Skills matrix"
                    : "Feedback journal"}
              </PerformanceControlButton>
            ))}
          </PerformanceTabs>

          {showGoalForm ? (
            <form
              className="mnx-performance-card grid max-w-3xl gap-4"
              onSubmit={handleCreateGoal}
            >
              <h3 className="mnx-title-3">Create target goal or OKR</h3>
              <PerformanceField
                label="Goal title"
                htmlFor="pms-goal-title"
                required
              >
                <PerformanceControlInput
                  id="pms-goal-title"
                  value={newGoalTitle}
                  onChange={(event) => setNewGoalTitle(event.target.value)}
                  required
                  placeholder="Reduce booking delays by 15%"
                />
              </PerformanceField>
              <div className="grid gap-4 md:grid-cols-2">
                <PerformanceField
                  label="Target key metric"
                  htmlFor="pms-goal-target"
                  required
                >
                  <PerformanceControlInput
                    id="pms-goal-target"
                    value={newGoalTarget}
                    onChange={(event) => setNewGoalTarget(event.target.value)}
                    required
                    placeholder="15% reduction"
                  />
                </PerformanceField>
                <PerformanceField
                  label="Target due date"
                  htmlFor="pms-goal-due"
                  required
                >
                  <PerformanceControlInput
                    id="pms-goal-due"
                    type="date"
                    value={newGoalDueDate}
                    onChange={(event) => setNewGoalDueDate(event.target.value)}
                    required
                  />
                </PerformanceField>
              </div>
              <div className="flex flex-wrap justify-end gap-3">
                <PerformanceControlButton
                  variant="secondary"
                  onClick={() => setShowGoalForm(false)}
                >
                  Cancel
                </PerformanceControlButton>
                <PerformanceControlButton type="submit" disabled={submitting}>
                  {submitting ? "Saving…" : "Create goal"}
                </PerformanceControlButton>
              </div>
            </form>
          ) : null}

          {showFeedbackForm ? (
            <form
              className="mnx-performance-card grid max-w-3xl gap-4"
              onSubmit={handleCreateFeedback}
            >
              <h3 className="mnx-title-3">Submit performance feedback</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <PerformanceField
                  label="Feedback recipient"
                  htmlFor="pms-feedback-recipient"
                  required
                >
                  <PerformanceControlSelect
                    id="pms-feedback-recipient"
                    value={feedbackTo}
                    onChange={(event) => setFeedbackTo(event.target.value)}
                  >
                    {colleagues.map((colleague) => (
                      <option key={colleague.id} value={colleague.id}>
                        {colleague.name} ({colleague.employeeNo})
                      </option>
                    ))}
                  </PerformanceControlSelect>
                </PerformanceField>
                <PerformanceField
                  label="Feedback type"
                  htmlFor="pms-feedback-type"
                >
                  <PerformanceControlSelect
                    id="pms-feedback-type"
                    value={feedbackType}
                    onChange={(event) => setFeedbackType(event.target.value)}
                  >
                    <option value="PEER_TO_PEER">Peer to peer</option>
                    <option value="MANAGER_REVIEW">Manager review</option>
                    <option value="SELF_REVIEW">Self review</option>
                  </PerformanceControlSelect>
                </PerformanceField>
              </div>
              <PerformanceField
                label="Remarks or comments"
                htmlFor="pms-feedback-content"
                required
              >
                <PerformanceControlTextarea
                  id="pms-feedback-content"
                  rows={4}
                  value={feedbackContent}
                  onChange={(event) => setFeedbackContent(event.target.value)}
                  required
                  placeholder="Provide constructive feedback about goals, deadlines, and ownership."
                />
              </PerformanceField>
              <div className="flex flex-wrap justify-end gap-3">
                <PerformanceControlButton
                  variant="secondary"
                  onClick={() => setShowFeedbackForm(false)}
                >
                  Cancel
                </PerformanceControlButton>
                <PerformanceControlButton type="submit" disabled={submitting}>
                  {submitting ? "Submitting…" : "Submit feedback"}
                </PerformanceControlButton>
              </div>
            </form>
          ) : null}

          {activeTab === "goals" ? (
            goals.length === 0 ? (
              <WorkspaceEmptyState
                title="No active goals"
                description="Create an OKR or target to begin tracking performance."
              />
            ) : (
              <PerformanceGrid>
                {goals.map((goal) => {
                  const completed =
                    goal.status === "COMPLETED" || goal.progress >= 100;
                  return (
                    <PerformanceCard key={goal.id}>
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="mnx-title-3">{goal.title}</h3>
                          <p className="mnx-text-muted mt-2 text-sm">
                            Target: {goal.target}
                          </p>
                        </div>
                        <PerformanceStatus
                          variant={completed ? "success" : "warning"}
                        >
                          {goal.status.replace(/_/g, " ")}
                        </PerformanceStatus>
                      </div>
                      <div className="mt-6 grid gap-3">
                        <div className="flex items-center justify-between gap-3 text-xs">
                          <span className="mnx-text-muted inline-flex items-center gap-2">
                            <Calendar aria-hidden="true" size={14} />
                            Due {new Date(goal.dueDate).toLocaleDateString()}
                          </span>
                          <span className="mnx-text-strong font-mono">
                            {Math.round(goal.progress)}%
                          </span>
                        </div>
                        <PerformanceProgress
                          label={`${goal.title} progress`}
                          value={goal.progress}
                        />
                        <PerformanceControlInput
                          type="range"
                          min="0"
                          max="100"
                          step="5"
                          value={goal.progress}
                          aria-label={`Update ${goal.title} progress`}
                          onChange={(event) =>
                            void handleGoalProgress(
                              goal.id,
                              Number(event.target.value),
                            )
                          }
                        />
                      </div>
                    </PerformanceCard>
                  );
                })}
              </PerformanceGrid>
            )
          ) : null}

          {activeTab === "skills" ? (
            skills.length === 0 ? (
              <WorkspaceEmptyState
                title="No skills listed"
                description="Skills recorded on your employee profile will appear here."
              />
            ) : (
              <PerformanceGrid>
                {skills.map((item) => (
                  <PerformanceCard key={item.id}>
                    <span className="mnx-icon-badge">
                      <Award aria-hidden="true" />
                    </span>
                    <h3 className="mnx-title-3 mt-5">{item.skill.name}</h3>
                    <PerformanceStatus
                      className="mt-3"
                      variant={
                        item.proficiency === "EXPERT"
                          ? "accent"
                          : item.proficiency === "ADVANCED"
                            ? "success"
                            : "neutral"
                      }
                    >
                      {item.proficiency}
                    </PerformanceStatus>
                  </PerformanceCard>
                ))}
              </PerformanceGrid>
            )
          ) : null}

          {activeTab === "feedback" ? (
            feedbacks.length === 0 ? (
              <WorkspaceEmptyState
                title="No feedback entries"
                description="Submitted performance feedback will appear in this private journal."
              />
            ) : (
              <div className="grid gap-4">
                {feedbacks.map((feedback) => (
                  <PerformanceCard key={feedback.id}>
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <span className="mnx-icon-badge">
                          <Heart aria-hidden="true" />
                        </span>
                        <div>
                          <h3 className="mnx-title-3">
                            {feedback.fromUser.name}
                          </h3>
                          <p className="mnx-text-muted mt-1 text-xs">
                            To {feedback.toUser.name}
                          </p>
                        </div>
                      </div>
                      <PerformanceStatus variant="neutral">
                        {feedback.feedbackType.replace(/_/g, " ")}
                      </PerformanceStatus>
                    </div>
                    <p className="mt-5 text-sm leading-6">{feedback.content}</p>
                    <p className="mnx-text-muted mt-4 text-right text-xs">
                      {new Date(feedback.createdAt).toLocaleString()}
                    </p>
                  </PerformanceCard>
                ))}
              </div>
            )
          ) : null}
        </div>
      </PerformanceSection>
    </>
  );
}
