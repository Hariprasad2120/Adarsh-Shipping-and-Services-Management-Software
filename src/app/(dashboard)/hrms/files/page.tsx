"use client";

import React from "react";
import { FilesView } from "@/components/hrms/peopleplus/files-view";

export default function FilesPage() {
  const handleFetchFiles = async (scope: "personal" | "organization" | "employee") => {
    const res = await fetch(`/api/hrms/peopleplus/files?scope=${scope}`);
    const json = await res.json();
    return json.ok ? json.data : { folders: [], files: [] };
  };

  const handleCreateFolder = async (name: string, scope: string) => {
    const res = await fetch("/api/hrms/peopleplus/files", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, scope, type: "folder" }),
    });
    return res.json();
  };

  const handleUploadFile = async (name: string, fileKey: string, mimeType: string, sizeBytes: number, scope: string) => {
    const res = await fetch("/api/hrms/peopleplus/files", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, fileKey, mimeType, sizeBytes, scope, type: "file" }),
    });
    return res.json();
  };

  return (
    <FilesView
      onFetchFiles={handleFetchFiles}
      onCreateFolder={handleCreateFolder}
      onUploadFile={handleUploadFile}
    />
  );
}
