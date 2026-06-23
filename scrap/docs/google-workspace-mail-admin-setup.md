# Google Workspace Integration Setup Guide

This guide details the steps required to configure the Google Cloud Platform Console for the Monolith Workspace communication module.

## 1. Google Cloud Project Setup
1. Open the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project or select an existing one (e.g., `monolith-engine`).
3. Enable the following APIs:
   - Gmail API
   - Google Calendar API
   - People API
   - Google Tasks API
   - Google Drive API
   - Google Chat API

## 2. OAuth Consent Screen Configuration
1. Select **OAuth consent screen** in the API & Services sidebar.
2. Select User Type: **Internal** (if deploying purely within Adarsh Shipping's Google Workspace domain) or **External** (if allowing testing with other test accounts).
3. Add App name (e.g., "Monolith Workspace Portal"), developer contact email, and support email.
4. Add the requested scopes:
   - `email`, `profile`, `openid`
   - `gmail.modify`
   - `calendar.events`
   - `contacts.readonly`
   - `tasks`
   - `drive.readonly`

## 3. Creating OAuth Credentials
1. Click **Credentials** -> **Create Credentials** -> **OAuth client ID**.
2. Select Application Type: **Web application**.
3. Add Authorized JavaScript origins:
   - `http://localhost:3000` (Local development)
4. Add Authorized redirect URIs:
   - `http://localhost:3000/api/auth/callback/google`
5. Click **Create** and save the Client ID and Client Secret safely.

## 4. Setting up GCP Pub/Sub for Webhooks
1. Open **Pub/Sub** -> **Topics** in the GCP Console.
2. Click **Create Topic** and name it (e.g., `gmail-notifications`).
3. Grant permission to Gmail to publish to this topic:
   - Add service account `gmail-api-push@system.gserviceaccount.com` as a principal.
   - Assign the Role: **Pub/Sub Publisher**.
4. Create a **Push Subscription**:
   - Set Delivery Type to **Push**.
   - Endpoint URL: `https://your-domain.com/api/communication/gmail-webhook` (In production).
   - For local development, use an ngrok tunnel (e.g., `https://xxxx.ngrok-free.app/api/communication/gmail-webhook`).

## 5. Environment Variables Checklist
Add these values to your `.env` file:
```env
AUTH_GOOGLE_ID="your-client-id-here"
AUTH_GOOGLE_SECRET="your-client-secret-here"
GCP_PUBSUB_TOPIC="projects/your-project-id/topics/gmail-notifications"
CRON_SECRET="your-cron-security-token"
```
