"use client";

import { NativeSelect } from "@/components/ui/native-select";
import { useRouter } from "next/navigation";

export default function JobSelector({
  jobs,
  selectedJobId
}: {
  jobs: { id: string; jobNumber: string; title: string }[];
  selectedJobId: string;
}) {
  const router = useRouter();

  return (
    <NativeSelect
      value={selectedJobId}
      onChange={(e) => {
        const val = e.target.value;
        if (val) {
          router.push(`/communication/drive?jobId=${val}`);
        } else {
          router.push(`/communication/drive`);
        }
      }}
      className="w-full text-xs bg-mono-card border border-mono-border rounded-xl p-2.5 focus:outline-none"
    >
      <option value="">Choose a job...</option>
      {jobs.map((j) => (
        <option key={j.id} value={j.id}>
          {j.jobNumber} - {j.title}
        </option>
      ))}
    </NativeSelect>
  );
}
