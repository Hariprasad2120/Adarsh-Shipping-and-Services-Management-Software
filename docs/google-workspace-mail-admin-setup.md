# Google Workspace Integration: Admin Setup Runbook

This guide details the Google Cloud Console configuration and Pub/Sub setup required to enable the Monolith Gmail ecosystem.

---

## 1. Google Cloud Project Setup

1. Open the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project named `Monolith Engine` or select an existing workspace project.
3. Navigate to **APIs & Services > Library** and enable the following APIs:
   - **Gmail API**
   - **Google Calendar API**
   - **People API**
   - **Google Tasks API**
   - **Google Drive API**

---

## 2. OAuth Consent Screen Configuration

1. In the sidebar, click **OAuth consent screen**.
2. Select **User Type**:
   - **Internal**: If you are using a Google Workspace organization and only want users under your company domain (e.g. `@adarshshipping.in`) to link their accounts.
   - **External**: If you want to connect external test accounts. Set the publishing status to **Testing** and add your Gmail emails as test users.
3. Fill out the application details:
   - **App name**: `Monolith Engine`
   - **User support email**: Your admin email address.
   - **Developer contact information**: Your developer email address.
4. Click **Save and Continue**.
5. Add the following scopes:
   - `.../auth/userinfo.email`
   - `.../auth/userinfo.profile`
   - `.../auth/gmail.modify`
   - `.../auth/gmail.send`
   - `.../auth/calendar`
   - `.../auth/contacts.readonly`
   - `.../auth/tasks`
6. Click **Save and Continue**.

---

## 3. Credentials Configuration

1. Navigate to **APIs & Services > Credentials**.
2. Click **Create Credentials > OAuth client ID**.
3. Select **Web Application** as the application type.
4. Name the client: `Monolith Engine Web Client`.
5. Under **Authorized JavaScript origins**, click **Add URI** and enter:
   - `http://localhost:3000`
6. Under **Authorized redirect URIs**, click **Add URI** and enter:
   - `http://localhost:3000/api/auth/callback/google`
7. Click **Create**.
8. Download the JSON credentials file and keep it secure. Set the parameters in your `.env` file:
   ```env
   AUTH_GOOGLE_ID="your-client-id"
   AUTH_GOOGLE_SECRET="your-client-secret"
   ```

---

## 4. Pub/Sub Setup for Gmail Push Notifications

To enable real-time message sync, we need a Pub/Sub topic and subscription that calls the Monolith webhook.

1. Open **Google Cloud Pub/Sub > Topics**.
2. Click **Create Topic** and name it `gmail-notifications`.
3. Under the **Permissions** tab of the newly created topic, add `gmail-api-push@system.gserviceaccount.com` as a principal and grant the **Pub/Sub Publisher** role. This allows Gmail to publish notifications to your topic.
4. Go to **Subscriptions** and click **Create Subscription**.
5. Configure the subscription:
   - **Delivery Type**: **Push**
   - **Endpoint URL**: `https://<your-public-monolith-url>/api/communication/gmail-webhook` (For local testing, use a tunneling tool like ngrok to forward traffic to `http://localhost:3000/api/communication/gmail-webhook`).
6. Save the topic path in your environment configurations:
   - Topic path format: `projects/YOUR_PROJECT_ID/topics/gmail-notifications`
