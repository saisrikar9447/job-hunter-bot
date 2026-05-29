# 🎯 Job Hunter Bot — Satya's Automated Job Search

Searches for **Senior Full Stack Developer** jobs every hour and emails tailored resumes directly to your inbox.

**What it does every hour:**
- Searches for new Senior Full Stack Developer jobs (Remote + Hybrid)
- Skips jobs you've already seen
- Uses Claude AI to tailor your resume to each job description
- Emails you a digest with: job title, company, apply link, and tailored resume

---

## ⚙️ Setup (One-time — takes about 10 minutes)

### Step 1 — Get your free Adzuna API keys (job search)

1. Go to **https://developer.adzuna.com**
2. Click "Register" → create a free account
3. After logging in, go to **"Access Details"**
4. Copy your **App ID** and **App Key**

---

### Step 2 — Get your Anthropic API key (resume tailoring)

1. Go to **https://platform.anthropic.com/api-keys**
2. Sign in or create an account
3. Click **"Create Key"** → give it a name like "job-hunter"
4. Copy the key (starts with `sk-ant-...`)
5. Add a small credit ($5–$10) — the bot costs roughly **$0.50–$1.50/month** to run

---

### Step 3 — Get your free Resend API key (email sending)

1. Go to **https://resend.com** → Sign up free
2. Go to **API Keys** → click **"Create API Key"**
3. Copy the key (starts with `re_...`)

> **Note:** On the free tier, emails come from `onboarding@resend.dev`.  
> To send from your own address, verify your domain in Resend's dashboard.

---

### Step 4 — Add secrets to your GitHub repo

1. Go to your GitHub repo
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **"New repository secret"** and add all four:

| Secret Name        | Value                         |
|--------------------|-------------------------------|
| `ADZUNA_APP_ID`    | Your Adzuna App ID            |
| `ADZUNA_APP_KEY`   | Your Adzuna App Key           |
| `ANTHROPIC_API_KEY`| Your Anthropic key (sk-ant-…) |
| `RESEND_API_KEY`   | Your Resend key (re_…)        |

---

### Step 5 — Enable GitHub Actions

1. In your repo, click the **Actions** tab
2. If prompted, click **"I understand my workflows, go ahead and enable them"**
3. Done! The bot runs automatically every hour.

---

## 🧪 Test it immediately (don't wait an hour)

1. Go to **Actions** tab in your repo
2. Click **"Job Hunter Bot"** on the left
3. Click **"Run workflow"** → **"Run workflow"** (green button)
4. Watch it run live — check your inbox in ~2 minutes

---

## 📧 What the email looks like

```
Subject: 🎯 5 New Senior Full Stack Jobs — Jun 3, 09:00 AM

JOB 1
Senior Full Stack Engineer (Stripe)
📍 Remote | 💰 $150k – $195k
[Apply Now →]

✦ Tailored Resume for This Role
SATYA SAI SRIKAR DANGETI
... (resume tailored to Stripe's job description) ...

──────────────────────────────

JOB 2
Staff Software Engineer (Airbnb)
📍 Hybrid – San Francisco | 💰 $180k – $220k
[Apply Now →]

✦ Tailored Resume for This Role
...
```

---

## 💰 Estimated monthly cost

| Service     | Cost         |
|-------------|--------------|
| Adzuna API  | Free         |
| GitHub Actions | Free      |
| Resend      | Free (100 emails/day) |
| Anthropic (Claude) | ~$0.50–$2.00/month |

---

## 🔧 Customization

Edit `scripts/job-hunter.js` to change:

```js
const CONFIG = {
  recipientEmail: 'srikardangeti69@gmail.com',  // your email
  maxJobsPerRun: 8,                              // max jobs per hour
  searchTerms: [                                 // job search keywords
    'senior full stack developer',
    'senior full stack engineer',
    'staff software engineer full stack',
  ],
  minSalary: 100000,                             // minimum salary filter
};
```

---

## 📁 File structure

```
job-hunter/
├── .github/
│   └── workflows/
│       └── job-hunter.yml    ← Schedule & automation
├── scripts/
│   └── job-hunter.js         ← Main bot logic
├── data/
│   └── seen_jobs.json        ← Tracks jobs already emailed (auto-updated)
├── package.json
└── README.md
```
