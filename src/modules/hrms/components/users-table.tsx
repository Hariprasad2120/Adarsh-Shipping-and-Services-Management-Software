"use client";

import {
  PeopleControlButton as MnxAction,
  PeopleControlInput as MnxInput,
  PeopleControlTable as MnxTable,
} from "@/modules/people/components";

import React, { useState, useEffect } from "react";
import { Users, Search, ShieldAlert, Power, CheckSquare } from "lucide-react";
import { toast } from "sonner";

interface UsersTableProps {
  onFetchUsers: () => Promise<any[]>;
  onBulkAccountStatus: (
    userIds: string[],
    status: "LOGIN_ENABLED" | "LOGIN_DISABLED",
  ) => Promise<any>;
}

export function UsersTable({
  onFetchUsers,
  onBulkAccountStatus,
}: UsersTableProps) {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [actionLoading, setActionLoading] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const list = await onFetchUsers();
      setUsers(list);
    } catch (err: any) {
      toast.error("Failed to load user lists");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(users.map((u) => u.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds((prev) => [...prev, id]);
    } else {
      setSelectedIds((prev) => prev.filter((item) => item !== id));
    }
  };

  const handleBulkAction = async (
    status: "LOGIN_ENABLED" | "LOGIN_DISABLED",
  ) => {
    if (selectedIds.length === 0) {
      toast.error("Please select at least one employee");
      return;
    }

    setActionLoading(true);
    try {
      await onBulkAccountStatus(selectedIds, status);
      toast.success(
        `Login capability successfully updated for ${selectedIds.length} users.`,
      );
      setSelectedIds([]);
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to update bulk status");
    } finally {
      setActionLoading(false);
    }
  };

  const filtered = users.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      u.designation?.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="bg-[var(--mnx-card)] border border-[var(--mnx-border)] rounded-2xl p-6 shadow-sm flex flex-col gap-6 select-none animate-in fade-in duration-200">
      {/* Title */}
      <div className="flex items-center justify-between border-b border-[var(--mnx-border)] pb-4">
        <h3 className="text-sm font-bold text-[var(--mnx-text)] flex items-center gap-2">
          <Users className="size-5 text-[var(--mnx-accent)]" />
          Account Credentials & Profiles Directory
        </h3>

        <div className="flex items-center gap-2">
          <MnxInput
            type="text"
            placeholder="Search employee details..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-4 pr-4 py-1.5 text-xs border border-[var(--mnx-border)] rounded-lg outline-none focus:border-[var(--mnx-accent)] bg-[var(--mnx-card)] focus:bg-[var(--mnx-card)] transition-colors"
          />
        </div>
      </div>

      {/* Bulk action toolbar */}
      {selectedIds.length > 0 && (
        <div className="bg-[var(--mnx-info-bg)]/50 border border-[var(--mnx-info)] rounded-xl px-4 py-3 flex items-center justify-between gap-4 animate-in slide-in-from-top-2 duration-150">
          <span className="text-xs font-bold text-[var(--mnx-info)]">
            {selectedIds.length} profiles selected
          </span>
          <div className="flex gap-2">
            <MnxAction
              type="button"
              disabled={actionLoading}
              onClick={() => handleBulkAction("LOGIN_ENABLED")}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[10.5px] font-bold text-[var(--mnx-text)] bg-[var(--mnx-accent)] hover:bg-[var(--mnx-accent-text)] rounded-lg cursor-pointer transition-colors shadow-sm disabled:opacity-50"
            >
              <Power className="size-3" />
              Enable Login
            </MnxAction>
            <MnxAction
              type="button"
              disabled={actionLoading}
              onClick={() => handleBulkAction("LOGIN_DISABLED")}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[10.5px] font-bold text-[var(--mnx-text)] bg-[var(--mnx-danger-bg)] hover:bg-[var(--mnx-danger-bg)] rounded-lg cursor-pointer transition-colors shadow-sm disabled:opacity-50"
            >
              <ShieldAlert className="size-3" />
              Disable Login
            </MnxAction>
          </div>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="h-64 flex items-center justify-center text-xs text-[var(--mnx-muted)]">
          Syncing users table...
        </div>
      ) : (
        <div className="border border-[var(--mnx-border)] rounded-xl overflow-hidden shadow-sm">
          <MnxTable className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-[var(--mnx-card)] text-[10.5px] uppercase font-bold tracking-wider text-[var(--mnx-muted)] border-b border-[var(--mnx-border)] select-none">
                <th className="w-12 px-4 py-3 text-center">
                  <MnxInput
                    type="checkbox"
                    checked={
                      selectedIds.length === users.length && users.length > 0
                    }
                    onChange={handleSelectAll}
                  />
                </th>
                <th className="px-4 py-3">Employee</th>
                <th className="px-4 py-3">Department</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3 text-right">Login Capability</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--mnx-border)] text-xs text-[var(--mnx-text)]">
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="text-center py-12 text-[var(--mnx-muted)] italic"
                  >
                    No employees matching the search pattern.
                  </td>
                </tr>
              ) : (
                filtered.map((user) => {
                  const isChecked = selectedIds.includes(user.id);
                  return (
                    <tr
                      key={user.id}
                      className={`hover:bg-[var(--mnx-card)]/50 ${isChecked ? "bg-[var(--mnx-info-bg)]/10" : ""}`}
                    >
                      <td className="px-4 py-3.5 text-center">
                        <MnxInput
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) =>
                            handleSelectOne(user.id, e.target.checked)
                          }
                        />
                      </td>
                      <td className="px-4 py-3.5 flex items-center gap-3">
                        <div className="size-9 rounded-full bg-[var(--mnx-accent)]/10 flex items-center justify-center text-[var(--mnx-accent)] font-bold shrink-0">
                          {user.name.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-bold text-[var(--mnx-text)] truncate">
                            {user.name}
                          </h4>
                          <p className="text-[10px] text-[var(--mnx-muted)] truncate mt-0.5">
                            {user.email}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 font-medium">
                        {user.department?.name || "General"}
                      </td>
                      <td className="px-4 py-3.5">
                        {user.designation || "Executive"}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <span
                          className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full select-none ${
                            user.active
                              ? "bg-[var(--mnx-success-bg)] text-[var(--mnx-success)] border border-[var(--mnx-success)]"
                              : "bg-[var(--mnx-danger-bg)] text-[var(--mnx-danger)] border border-[var(--mnx-danger)]"
                          }`}
                        >
                          {user.active ? "Enabled" : "Disabled"}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </MnxTable>
        </div>
      )}
    </div>
  );
}
