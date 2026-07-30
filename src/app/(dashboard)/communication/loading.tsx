import { CommunicationLoadingState } from "@/modules/communication/components/workspace/communication-workspace";

export default function CommunicationLoading() {
  return (
    <CommunicationLoadingState description="Loading connected mail, chat, calendar, Drive, and meeting data." />
  );
}
