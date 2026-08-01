import { PeopleLoadingState } from "@/modules/people/components/people-workspace";

export default function HrmsLoading() {
  return (
    <PeopleLoadingState description="Loading HRMS records and permissions." />
  );
}
