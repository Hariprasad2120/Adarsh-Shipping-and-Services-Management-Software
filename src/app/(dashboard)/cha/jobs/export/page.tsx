import { CustomsJobsPage } from "../customs-jobs-page";

export default function ExportJobsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <CustomsJobsPage direction="EXPORT" searchParams={searchParams} />;
}
