import { mobileJson, mobileOptions } from "@/lib/mobile-cors";

export async function OPTIONS() {
  return mobileOptions();
}

export async function GET() {
  return mobileJson({
    versionCode: 2,
    versionName: "1.1",
    apkUrl: "/app-release.apk",
    changelog: [
      "Added Remember Me option to save login credentials securely.",
      "Integrated beautiful 3D rotating prism Monolith logo animation.",
      "Added in-app self-updater checks and automated updates.",
      "Repositioned debug overlay FAB to avoid overlapping chat inputs.",
      "Added URL updates directly from the debug overlay panel.",
      "Dynamic CRM runtime permissions requested on terms acceptance."
    ]
  });
}
