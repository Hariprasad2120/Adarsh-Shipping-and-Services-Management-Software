import { notFound } from "next/navigation";
import { isRecruitEnabled } from "@/lib/recruit-flag";

export default function RecruitLayout({ children }: { children: React.ReactNode }) {
  if (!isRecruitEnabled()) notFound();
  return <>{children}</>;
}
