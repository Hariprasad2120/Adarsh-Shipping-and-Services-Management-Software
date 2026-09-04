"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "@/modules/notifications/client";
import { useCan } from "@/lib/caps-context";
import { PeopleToggleButton } from "@/modules/people/components/people-controls";

export function EmployeeAccountActions({
  active,
  employeeId,
  employeeName,
  invitationPending,
  isCurrentUser,
}: {
  active: boolean;
  employeeId: string;
  employeeName: string;
  invitationPending: boolean;
  isCurrentUser: boolean;
}) {
  const router = useRouter();
  const canManageLogin =
    useCan("hrms.employee.deactivate") &&
    !isCurrentUser &&
    !invitationPending;
  const [updating, setUpdating] = useState(false);

  async function toggleLogin() {
    const nextActive = !active;
    setUpdating(true);
    try {
      const response = await fetch("/api/hrms/employees", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userIds: [employeeId],
          status: nextActive ? "LOGIN_ENABLED" : "LOGIN_DISABLED",
        }),
      });
      const result = await response.json();
      if (!response.ok || !result.ok) {
        throw new Error(
          result.error?.message ?? "Unable to update login access",
        );
      }
      toast.success(
        `${employeeName} login ${nextActive ? "enabled" : "disabled"}.`,
      );
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to update login access",
      );
    } finally {
      setUpdating(false);
    }
  }

  return (
    <div className="flex items-center justify-end gap-2">
      {canManageLogin ? (
        <PeopleToggleButton
          aria-label={`${active ? "Disable" : "Enable"} login for ${employeeName}`}
          active={active}
          disabled={updating}
          onClick={toggleLogin}
          title={`${active ? "Disable" : "Enable"} login`}
        />
      ) : null}

      <Link
        aria-label={`Open ${employeeName} profile`}
        className="inline-flex size-8 items-center justify-center rounded-lg text-mono-muted transition hover:bg-mono-soft hover:text-mono-text"
        href={`/hrms/employees/${employeeId}`}
        title="Open employee profile"
      >
        <ChevronRight className="size-4" />
      </Link>
    </div>
  );
}
