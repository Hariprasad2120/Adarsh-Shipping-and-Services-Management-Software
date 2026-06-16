"use client";

import React from "react";
import { SettingsServices } from "@/components/hrms/peopleplus/settings-services";

export default function PeoplePlusSettingsPage() {
  const handleFetchServices = async () => {
    const res = await fetch("/api/hrms/peopleplus/settings/services");
    const json = await res.json();
    return json.ok ? json.data : [];
  };

  const handleUpdateServices = async (services: any[]) => {
    const res = await fetch("/api/hrms/peopleplus/settings/services", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ services }),
    });
    return res.json();
  };

  return (
    <SettingsServices
      onFetchServices={handleFetchServices}
      onUpdateServices={handleUpdateServices}
    />
  );
}
