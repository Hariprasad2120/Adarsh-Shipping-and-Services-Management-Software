"use client";

import React from "react";
import { UsersTable } from "@/components/hrms/users-table";

export function UserControlPage() {
  const handleFetchUsers = async () => {
    const res = await fetch("/api/hrms/employees");
    const json = await res.json();
    return json.ok ? json.data : [];
  };

  const handleBulkAccountStatus = async (
    userIds: string[],
    status: "LOGIN_ENABLED" | "LOGIN_DISABLED",
  ) => {
    const res = await fetch("/api/hrms/employees", {
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
