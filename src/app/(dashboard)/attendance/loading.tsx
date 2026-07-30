import { PeopleLoadingState } from "@/modules/people/components/people-workspace";

export default function AttendanceLoading() {
  return (
    <PeopleLoadingState description="Loading attendance calculations and workforce records." />
  );
}
