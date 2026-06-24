import { mobileJson, mobileOptions } from "@/lib/mobile-cors";

export async function OPTIONS() {
  return mobileOptions();
}

export async function GET() {
  return mobileJson({
    versionCode: 4,
    versionName: "3.0",
    apkUrl: "/app-release.apk",
    changelog: [
      "HRMS Mobile Module - Face Recognition Check-In/Check-Out",
      "GPS location capture on attendance (working hours + on-duty)",
      "On-Duty trip tracking with live GPS and fuel reimbursement",
      "Face enrollment with liveness verification",
      "User agreement acceptance and compliance tracking",
      "Back button navigation fixed across all screens",
      "Remember Me with auto-login and module persistence",
      "Location permission request flow before GPS operations",
      "Module switcher (CRM / HRMS) with saved state",
      "Attendance history with detailed session records",
      "Auto-update: check for updates and install from server"
    ]
  });
}
