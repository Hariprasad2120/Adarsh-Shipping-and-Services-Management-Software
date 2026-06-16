"use client";

import React from "react";
import { UsersTable } from "@/components/hrms/peopleplus/users-table";

export default function PeoplePlusUsersPage() {
  const handleFetchUsers = async () => {
    const res = await fetch("/api/hrms/peopleplus/employees");
    const json = await res.json();
    return json.ok ? json.data : [];
  };

  const handleBulkAccountStatus = async (userIds: string[], status: "LOGIN_ENABLED" | "LOGIN_DISABLED") => {
    const res = await fetch("/api/hrms/peopleplus/employees", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userIds, status }),
    });
    return res.json();
  };

  return (
    <UsersTable
      onFetchUsers={handleFetchUsers}
      onBulkAccountStatus={handleBulkAccountStatus}
    />
  );
}
