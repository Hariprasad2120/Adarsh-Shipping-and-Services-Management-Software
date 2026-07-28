import { PeopleLoadingState } from "@/components/monolith/people-workspace";

export default function AttendanceLoading() {
  return (
    <PeopleLoadingState description="Loading attendance calculations and workforce records." />
  );
}
