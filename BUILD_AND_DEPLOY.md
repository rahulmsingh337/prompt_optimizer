# NEXA Prompt Agent — Deploy & APK Guide

---

## Part 1: Deploy to Vercel

### Prerequisites
- Node.js 20+
- Vercel account at vercel.com
- Vercel CLI: `npm i -g vercel`

### Step 1 — Clone and install
```bash
git clone https://github.com/rahulmsingh337/prompt_optimizer.git
cd prompt_optimizer
npm ci
```

### Step 2 — Login to Vercel
```bash
vercel login
```

### Step 3 — Deploy (first time, interactive)
```bash
vercel
```
Answer the prompts:
- **Set up and deploy?** → `Y`
- **Which scope?** → your account
- **Link to existing project?** → `N`
- **Project name?** → `nexa-prompt-agent` (or any name)
- **Which directory?** → `.` (current)
- **Override settings?** → `N`

Vercel will give you a preview URL like `https://nexa-prompt-agent-xyz.vercel.app`.

### Step 4 — Set environment variables
```bash
vercel env add GEMINI_API_KEY production
# paste your key when prompted

vercel env add APP_URL production
# paste your Vercel domain: https://nexa-prompt-agent-xyz.vercel.app

vercel env add AUTH_SECRET production
# paste a random 32-char string

vercel env add AUTH_GITHUB_ID production
# paste your GitHub OAuth client ID

vercel env add AUTH_GITHUB_SECRET production
# paste your GitHub OAuth secret

vercel env add OWNER_EMAIL production
# paste rs826748@gmail.com
```

### Step 5 — Deploy to production
```bash
vercel --prod
```

Your live URL will be printed. Update `APP_URL` if the production domain differs from preview.

### Step 6 — Update GitHub OAuth callback
Go to GitHub → Settings → Developer Settings → OAuth Apps → your app.
Set **Authorization callback URL** to:
```
https://YOUR_PROD_DOMAIN.vercel.app/api/auth/callback/github
```

### Re-deploying after code changes
```bash
git push origin main   # Vercel auto-deploys on push if connected
# or manually:
vercel --prod
```

---

## Part 2: Build Android APK

### Prerequisites
- Android Studio (https://developer.android.com/studio)
- Java 17+ (`java -version`)
- Android SDK with API level 34+
- Node.js 20+

### Step 1 — Install dependencies (includes Capacitor)
```bash
npm ci
```

### Step 2 — Build the web app
```bash
npm run build
```
This outputs to `dist/`.

### Step 3 — Update capacitor.config.ts
Open `capacitor.config.ts` and replace `YOUR_VERCEL_DOMAIN` with your actual deployed URL:
```ts
server: {
  url: 'https://nexa-prompt-agent-xyz.vercel.app',
  cleartext: false,
},
```
> The Android app loads your live site inside a native WebView. This means you only need
> to deploy the web app once — APK updates are only needed for native feature changes.

### Step 4 — Add Android platform
```bash
npx cap add android
npx cap sync android
```
This generates the `android/` folder with a full Gradle project.

### Step 5 — Open in Android Studio
```bash
npx cap open android
```
Android Studio will open. Wait for Gradle sync to finish.

### Step 6 — Generate a release keystore (one-time)
```bash
keytool -genkey -v \
  -keystore nexa-release.keystore \
  -alias nexa \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000
```
Fill in the prompts. **Keep this keystore file safe — you need it for every future release.**

### Step 7 — Build signed APK in Android Studio
1. Menu → **Build** → **Generate Signed Bundle / APK**
2. Choose **APK**
3. Select your `nexa-release.keystore`, enter alias `nexa` and passwords
4. Choose **release** build variant
5. Click **Finish**

APK will be at:
```
android/app/build/outputs/apk/release/app-release.apk
```

### Step 8 — Install on device (optional)
```bash
adb install android/app/build/outputs/apk/release/app-release.apk
```

### After web app updates
When you update the web app and redeploy to Vercel, no APK rebuild is needed — the WebView
loads the live URL. Only rebuild the APK if you change native config (plugins, permissions, icons).

---

## Troubleshooting

| Problem | Fix |
|---|---|
| Vercel build fails | Run `npm run build` locally first to catch errors |
| `GEMINI_API_KEY` error on Vercel | Check env vars in Vercel dashboard → Settings → Environment Variables |
| APK crashes on launch | Make sure `server.url` in `capacitor.config.ts` is your live Vercel URL |
| Gradle sync fails | File → Invalidate Caches in Android Studio, or update Android Studio |
| White screen in APK | Vercel URL may be wrong or site hasn't deployed yet |

