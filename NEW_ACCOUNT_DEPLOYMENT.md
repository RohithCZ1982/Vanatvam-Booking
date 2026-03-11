# 🚀 Deploying to a New GCP Account (Client Handoff)

This guide explains how to use the **GCP Setup Wizard** (`gcp-setup-wizard.html`) to deploy the entire Vanatvam Booking application to a completely new, independent Google Cloud Platform account.

## 🎯 What is the GCP Setup Wizard?

When you need to deploy this application for a different client or in a brand new Google Workspace, you cannot simply run your existing deployment scripts, because they are hardcoded to your current project (`vanatvam-booking-app`).

Instead of manually rewriting all the terminal commands, we created an independent, standalone web wizard: `gcp-setup-wizard.html`.

### Key Features:
* **Generates exact Terminal Scripts:** It takes in the new client's database password, project ID, and JWT secret, and generates the exact `gcloud` and `firebase` commands needed to build the infrastructure from scratch.
* **Does NOT Auto-Deploy:** Browsers cannot run terminal commands for security reasons. The wizard is essentially a highly-advanced "copy-paste script generator".

---

## 🛠️ Step-by-Step Instructions

To successfully deploy the application to a new Google Cloud account, follow these exact steps:

### Phase 1: Authentication
Before opening the wizard, you must tell your local terminal to switch from your Google account to the new client's Google account.

1. Open your terminal.
2. Run the login command:
   ```bash
   gcloud auth login
   ```
3. A browser window will pop up. Log in using the **new Google Account** (the account where the new GCP project will live).
4. Do the same for Firebase:
   ```bash
   firebase login --reauth
   ```

### Phase 2: Create the GCP Project
You must create an empty "Project Box" in Google Cloud first.

1. Go to [console.cloud.google.com](https://console.cloud.google.com) (make sure you are logged into the new account).
2. Click **New Project** and create one (e.g., `client-vanatvam-prod`).
3. Note down the **Project ID** it gives you.
4. **CRITICAL:** You must link a Billing Account to this new project, otherwise the automated script will fail when it tries to use Secret Manager.

### Phase 3: The Setup Wizard
Now we generate the exact automated script for the new infrastructure.

1. Open the `gcp-setup-wizard.html` file in your web browser.
2. Fill in the details:
   * **GCP Project ID:** *Enter the exact Project ID from Phase 2.*
   * **Database Password:** *Create a strong password for the new Cloud SQL Postgres database.*
   * **JWT Secret Key:** *Click "Regenerate" or type a secure random string.*
3. Stay on the **1. Backend Deployment** tab.
4. Click **Copy Script**.

### Phase 4: Execute Backend Automation
This is where the semi-automatic deployment happens.

1. Go back to your terminal window.
2. Ensure you are in the root directory (`/Users/rohithkumar/Documents/MySites/Vanatvam-Booking`).
3. **Paste** the copied script into the terminal and press **Enter**.
4. *Wait 10-15 minutes.* The automation will now:
   * Enable all required GCP APIs
   * Create the PostgreSQL database and user
   * Store passwords securely in Secret Manager
   * Create the Artifact Registry Docker repository
   * Build the Python Backend image
   * Push the image and deploy it to Cloud Run

At the very end of the terminal output, it will print the **New Backend API URL** (something like `https://client-vanatvam-prod-xxxxxxxx-el.a.run.app`).

### Phase 5: Execute Frontend Automation
Now you must deploy the React frontend so it talks to the *new* backend.

1. Go back to the browser tab with `gcp-setup-wizard.html`.
2. Switch to the **2. Frontend Deployment** tab.
3. Click **Copy Script**.
4. Paste it into your terminal and press **Enter**.
5. This script will automatically:
   * Fetch the new backend URL generated in Phase 4.
   * Update the local `.env.production` file to use it.
   * Run `npm run build` to compile the React code.
   * Run `firebase deploy` to push the static website to the new Google Account.

---

## ✅ Final Verification

Once Phase 5 completes, your terminal will output the frontend URL (e.g., `https://client-vanatvam-prod.web.app`).

1. Open that URL in your browser.
2. Attempt to register an admin account to ensure the PostgreSQL connection is working.
3. Your fully independent, separate instance of Vanatvam Booking is now live!
