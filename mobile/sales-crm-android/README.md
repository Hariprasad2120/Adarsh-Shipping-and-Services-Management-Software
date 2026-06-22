# Monolith Engine CRM Mobile App (Android)

This is the native Android companion app for the Monolith Engine CRM dashboard. It tracks salesperson calls, scans local call recordings on the phone using Android's Storage Access Framework, evaluates files using a confidence-scoring matcher, and uploads matches automatically using WorkManager background uploader.

---

## Technical Specifications & Architecture
- **Language**: Kotlin 1.9.10
- **Framework**: Jetpack Compose (Declarative UI)
- **Architecture**: MVVM (Model-View-ViewModel) + Repository Pattern
- **Local Storage**: Room database (for offline caching of recording uploads)
- **Background Execution**: WorkManager (ensures uploads retry on internet reconnects)
- **File System API**: Storage Access Framework (SAF) trees + `DocumentFile` (complies with Android 11+ storage policies)
- **Authentication**: Bearer tokens verified against active database-backed `UserSession` table records on the server

---

## Onboarding & Compliance Gate
Upon the first launch of the app, the **Employee Consent & Agreement** screen is displayed. 
* The salesperson must read the tracking notice and check the **Terms and Conditions** checkbox.
* The "**I AGREE & PROCEED**" button remains disabled until checked.
* Declining the terms will close the application to enforce data auditing compliance.

---

## Setup & Compilation Instructions

### 1. Requirements
- **JDK Version**: Java 17 (e.g. Eclipse Adoptium Temurin 17)
- **Android SDK**: Android API Level 34
- **Android Studio**: Android Studio Hedgehog (2023.1.1) or higher

### 2. Opening in Android Studio
1. Open Android Studio.
2. Select **File -> New -> Import Project...**
3. Navigate to and select the folder `mobile/sales-crm-android`.
4. Allow Gradle to sync and download all dependencies (Room, WorkManager, OkHttp, Retrofit, Jetpack Compose).

### 3. Build & Package APK
You can generate APKs from the Android Studio **Build** menu or via the command line:
- **Build Debug APK**:
  * Windows:
    ```powershell
    .\gradlew.bat assembleDebug
    ```
  * Linux/macOS:
    ```bash
    ./gradlew assembleDebug
    ```
  * Output Location: `app/build/outputs/apk/debug/app-debug.apk`

- **Build Release APK**:
  * Windows:
    ```powershell
    .\gradlew.bat assembleRelease
    ```
  * Linux/macOS:
    ```bash
    ./gradlew assembleRelease
    ```
  * Output Location: `app/build/outputs/apk/release/app-release-unsigned.apk`

---

## API Configuration for Emulators & Phones
The base API URL is configurable on the **Login Screen** to accommodate different testing environments:
* **Android Emulator Default**: `http://10.0.2.2:3000/` (This points to the local Next.js server running on your host machine).
* **Real Phone / Local Wi-Fi**: Enter the host computer's local network IP address (e.g., `http://192.168.1.100:3000/`). Make sure your server is listening on `0.0.0.0`.

---

## Emulator Mock Call Test Mode

To facilitate rapid testing in Android Emulators without requiring a SIM card or generating real phone calls, the app includes a **Mock Call Test Mode**.

### 1. Enabling Test Mode
- At the top of the **Assigned Leads** screen, toggle the **MOCK CALL TEST MODE** switch to **ON**.

### 2. How it works
- In test mode, tapping **CALL CLIENT** logs a real call attempt (`POST /api/mobile/crm/leads/:leadId/call-attempts`) on the CRM backend but **does not trigger the Android native dialer**.
- Instead, the app stays in the foreground and immediately transitions to the **Scan & Match** loader screen to wait for the recording file.

### 3. Testing Upload Flow on an Emulator
1. Enable **Mock Call Test Mode** on the emulator.
2. Select a folder in the emulator storage (e.g., `Download` or `Documents`) during folder setup.
3. Open an assigned lead and tap **CALL CLIENT**. The app registers a call attempt on the server and loads the Scan screen.
4. **Generate a Dummy Recording**:
   * Get an actual small `.mp3` or `.m4a` file on your computer.
   * Push the file to the emulator's selected folder using `adb`. Make sure to replace the phone number in the destination name with the lead's phone number:
     ```bash
     adb push sample.mp3 /sdcard/Download/call_9876543210.mp3
     ```
   * *Alternatively*, open Chrome inside the emulator, download any test audio file, and use the Files app to place/rename it in your selected folder.
5. Tap **RETRY SCAN** (or let it scan). The engine will match the file using the phone number, timestamp (last modified should be after the mock call start time), and size.
6. The app will upload the file (`POST /api/mobile/crm/call-attempts/:attemptId/recording`) using Room and WorkManager.
7. **Verify in CRM**:
   * Log into the CRM Web UI as a manager or administrator.
   * Open the lead's detail page.
   * Check the **Call Timeline** and play back the audio recording or review the AI-generated transcript and summary.
