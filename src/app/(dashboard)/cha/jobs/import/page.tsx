import { CustomsJobsPage } from "../customs-jobs-page";

export default function ImportJobsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <CustomsJobsPage direction="IMPORT" searchParams={searchParams} />;
}
