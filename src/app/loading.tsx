import { LoadingScreen } from "@/components/feedback/loading-screen";

export default function AppLoading() {
  return (
    <LoadingScreen
      message="Preparing Monolith"
      subtitle="Loading the latest workspace shell, session context, and route data."
    />
  );
}
