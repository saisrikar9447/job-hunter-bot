const Anthropic = require('@anthropic-ai/sdk');
const { Resend } = require('resend');
const fs = require('fs');
const path = require('path');

// ── Config ────────────────────────────────────────────────────────────────────
const CONFIG = {
  recipientEmail: 'srikardangeti69@gmail.com',
  maxJobsPerRun: 8,
  searchTerms: [
    'senior full stack developer',
    'senior full stack engineer',
    'staff software engineer full stack',
  ],
  minSalary: 100000,
  seenJobsFile: path.join(__dirname, '..', 'data', 'seen_jobs.json'),
};

// ── Satya's Base Resume ───────────────────────────────────────────────────────
const BASE_RESUME = `SATYA SAI SRIKAR DANGETI
Full Stack Software Engineer
Columbus, OH | (414) 629-0548 | Satya.dangeti24@gmail.com

PROFESSIONAL SUMMARY
Full Stack Software Engineer with 5+ years of production experience building scalable microservices and front-end applications. Deep expertise in Java Spring Boot for backend systems, React with Redux for dynamic UIs, and cloud infrastructure on AWS, Azure, and Google Cloud. Proven track record architecting distributed systems, designing RESTful APIs, and delivering solutions in regulated financial and educational environments.

CORE COMPETENCIES
Java: Spring Boot, Spring MVC, Spring Security, Spring Data JPA, Hibernate, Microservices Architecture
Frontend: React, Redux, React Hooks, Axios, Material UI, Responsive Design, State Management
APIs & Protocols: RESTful API Design, JWT Authentication, OAuth 2.0, Swagger/OpenAPI, API Gateway Patterns
Databases & Caching: PostgreSQL, MySQL, SQL Server, MongoDB, Redis, HikariCP Connection Pooling
Cloud & DevOps: AWS (EC2, Lambda, RDS, API Gateway, S3), Azure (App Services, DevOps), GCP (Cloud Run), Docker, Kubernetes, Jenkins, GitHub Actions, Terraform
Testing & Practices: JUnit 5, Mockito, Integration Testing, TDD, Agile/Scrum, CI/CD Pipelines, SOLID Principles

PROFESSIONAL EXPERIENCE

Software Engineer II, Full Stack | May 2025 - Present
Huntington Bank | Columbus, OH
- Engineer full-stack banking applications serving 5000+ internal users across operations, compliance, and fraud analytics teams using Spring Boot microservices and React SPAs.
- Designed and implemented 12+ RESTful microservices with Spring Security, JWT token validation, and OAuth 2.0 flows for secure transaction processing and account management workflows.
- Built reusable React component library with Redux state management, reducing UI development time by 28% across 6 interconnected applications.
- Optimized Spring Data JPA queries improving API response times from 850ms to 280ms on high-traffic endpoints.
- Established automated test coverage to 82% using JUnit 5 and Mockito, preventing 15+ production bugs.
- Led RBAC and field-level encryption for PCI-DSS and SOX compliance across all customer-facing APIs.

Software Engineer, Backend & Frontend | Dec 2023 - May 2025
University of Wisconsin-Milwaukee | Milwaukee, WI
- Built end-to-end institutional reporting platform for 11 academic departments; Spring Boot backend, React frontend with 40+ custom components.
- Architected microservices for student enrollment, course management, and budget reporting with Swagger/OpenAPI 3.0 documentation.
- Designed React dashboards with real-time data visualization using Chart.js for enrollment trends and academic metrics.
- Refactored N+1 queries reducing report generation time by 52% across 10M+ student records.
- Secured PII with Spring Security field-level encryption and AWS KMS ensuring FERPA compliance.

Software Engineer, Distributed Systems | Aug 2021 - Aug 2023
Walmart | Remote
- Developed high-throughput Java microservices on Google Cloud Run handling 2B+ daily events for supply chain visibility and logistics optimization.
- Built stateless Spring Boot services consuming Kafka event streams with real-time state propagation under 500ms latency during peak Black Friday operations.
- Implemented Redis caching layer reducing API latency by 41% with smart cache invalidation strategies.
- Containerized services with Docker and orchestrated on Kubernetes (GKE); reduced deployment time from 30 to 4 minutes.
- Maintained 76% code coverage with 500+ JUnit, Mockito, and Testcontainers tests.

Junior Software Engineer | Jan 2020 - Aug 2021
Unschool (EdTech) | Telangana, India
- Built core features for e-learning platform supporting 65,000+ active students using Spring Boot and React.
- Developed JWT authentication microservice with role-based authorization managing 500K+ user profiles.
- Optimized Axios request batching reducing network overhead by 30%.

PROJECTS

E-Commerce Microservices Platform | Java, Spring Boot, React, PostgreSQL, Docker, Kubernetes, AWS ECS
- 4-service microservices architecture (User, Product, Order, Payment) with independent Spring Boot codebases.
- React SPA with Redux, React Router, and Axios; cart persistence, checkout workflows, order tracking.
- GitHub Actions CI/CD pipelines with automated testing and Docker deployment to AWS ECS.

Real-Time Notification & Messaging Service | Java, Spring Boot, Kafka, WebSocket, Redis, React
- Event-driven notification microservice with WebSocket endpoints supporting 15K+ concurrent connections.
- Redis-backed JWT session store; message delivery latency under 120ms with 99.8% uptime.

EDUCATION
Master of Science, Information Technology | May 2025
University of Wisconsin-Milwaukee | GPA: 3.6/4.0`;

// ── Seen Jobs (deduplication) ─────────────────────────────────────────────────
function loadSeenJobs() {
  try {
    if (!fs.existsSync(CONFIG.seenJobsFile)) return {};
    const seen = JSON.parse(fs.readFileSync(CONFIG.seenJobsFile, 'utf8'));
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
    for (const id of Object.keys(seen)) {
      if (new Date(seen[id]).getTime() < cutoff) delete seen[id];
    }
    return seen;
  } catch {
    return {};
  }
}

function saveSeenJobs(seen) {
  fs.mkdirSync(path.dirname(CONFIG.seenJobsFile), { recursive: true });
  fs.writeFileSync(CONFIG.seenJobsFile, JSON.stringify(seen, null, 2));
}

// ── Job Search via Adzuna ─────────────────────────────────────────────────────
async function searchJobs() {
  const appId = process.env.ADZUNA_APP_ID;
  const appKey = process.env.ADZUNA_APP_KEY;

  if (!appId || !appKey) {
    throw new Error('ADZUNA_APP_ID or ADZUNA_APP_KEY secret is missing in GitHub repo settings.');
  }

  const allJobs = [];
  const seenIds = new Set();

  for (const term of CONFIG.searchTerms) {
    const encoded = encodeURIComponent(term);
    const url = `https://api.adzuna.com/v1/api/jobs/us/search/1?app_id=${appId}&app_key=${appKey}&what=${encoded}&results_per_page=15&sort_by=date&max_days_old=1&salary_min=${CONFIG.minSalary}&content-type=application/json`;

    try {
      console.log(`Searching: "${term}"...`);
      const res = await fetch(url);
      if (!res.ok) {
        console.warn(`  Adzuna returned ${res.status} for "${term}"`);
        continue;
      }
      const data = await res.json();
      const results = data.results || [];
      console.log(`  Found ${results.length} results`);

      for (const job of results) {
        if (!seenIds.has(job.id)) {
          seenIds.add(job.id);
          allJobs.push({
            id: String(job.id),
            title: job.title || 'Software Engineer',
            company: job.company?.display_name || 'Unknown Company',
            location: job.location?.display_name || 'Remote / US',
            applyUrl: job.redirect_url || '',
            description: (job.description || '').slice(0, 1800),
            salary: job.salary_min
              ? `$${Math.round(job.salary_min / 1000)}k - $${Math.round((job.salary_max || job.salary_min * 1.3) / 1000)}k`
              : 'Competitive',
            postedDate: job.created || new Date().toISOString(),
          });
        }
      }
    } catch (err) {
      console.warn(`  Error fetching "${term}": ${err.message}`);
    }
  }

  allJobs.sort((a, b) => new Date(b.postedDate) - new Date(a.postedDate));
  console.log(`Total unique jobs found: ${allJobs.length}`);
  return allJobs;
}

// ── Resume Tailoring via Claude ───────────────────────────────────────────────
async function tailorResume(job) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY secret is missing.');

  const client = new Anthropic({ apiKey });

  const prompt = `You are an expert resume writer helping a senior software engineer land interviews at top tech companies.

Tailor the resume below for this specific job. Follow all rules strictly:

RULES:
1. Only use skills and experience already in the resume — never add anything new
2. Write naturally and professionally — must NOT sound AI-generated
3. Naturally weave in keywords from the job description for ATS compatibility
4. Reorder bullet points within each role to highlight most relevant work for THIS job
5. Rewrite the Professional Summary to mirror this company's language and needs
6. Keep all job titles, companies, dates, and metrics exactly as-is
7. Output plain text only — no markdown, no asterisks, no special formatting
8. Stay strictly focused on Full Stack Developer skills

JOB: ${job.title} at ${job.company}
LOCATION: ${job.location}

JOB DESCRIPTION:
${job.description}

BASE RESUME:
${BASE_RESUME}

Output the complete tailored resume in plain text now:`;

  try {
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1500,
      messages: [{ role: 'user', content: prompt }],
    });
    return message.content[0]?.text || BASE_RESUME;
  } catch (err) {
    console.warn(`  Claude tailoring failed for ${job.company}: ${err.message}`);
    return BASE_RESUME;
  }
}

// ── Email HTML Builder ────────────────────────────────────────────────────────
function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildEmail(jobs) {
  const now = new Date().toLocaleString('en-US', {
    timeZone: 'America/New_York',
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const blocks = jobs.map((job, i) => `
<div style="background:#ffffff;border:1px solid #e5e7eb;border-radius:10px;padding:28px 32px;margin-bottom:28px;">
  <p style="margin:0 0 4px;font-size:11px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.08em;">Job ${i + 1} of ${jobs.length}</p>
  <h2 style="margin:0 0 2px;font-size:20px;font-weight:700;color:#111827;">${esc(job.title)}</h2>
  <p style="margin:0 0 12px;font-size:15px;color:#374151;font-weight:500;">${esc(job.company)} &nbsp;·&nbsp; ${esc(job.location)} &nbsp;·&nbsp; ${esc(job.salary)}</p>
  <a href="${esc(job.applyUrl)}" style="display:inline-block;background:#1d4ed8;color:#ffffff;text-decoration:none;padding:10px 22px;border-radius:6px;font-size:14px;font-weight:600;margin-bottom:24px;">Apply Now &rarr;</a>
  <div style="border-top:1px solid #e5e7eb;padding-top:20px;">
    <p style="margin:0 0 12px;font-size:13px;font-weight:700;color:#111827;text-transform:uppercase;letter-spacing:0.06em;">Tailored Resume for This Role</p>
    <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;padding:18px;">
      <pre style="margin:0;font-family:'Courier New',monospace;font-size:11.5px;line-height:1.65;color:#1f2937;white-space:pre-wrap;word-wrap:break-word;">${esc(job.tailoredResume)}</pre>
    </div>
  </div>
</div>`).join('');

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<div style="max-width:760px;margin:0 auto;padding:28px 16px;">
  <div style="background:#1d4ed8;border-radius:10px;padding:24px 32px;margin-bottom:28px;">
    <h1 style="margin:0 0 6px;font-size:22px;font-weight:800;color:#ffffff;">Job Digest &mdash; ${jobs.length} New Match${jobs.length > 1 ? 'es' : ''}</h1>
    <p style="margin:0;font-size:13px;color:rgba(255,255,255,0.8);">Senior Full Stack Developer &nbsp;&middot;&nbsp; Remote + Hybrid &nbsp;&middot;&nbsp; ${now} ET</p>
  </div>
  ${blocks}
  <div style="text-align:center;padding:20px;color:#9ca3af;font-size:12px;">
    <p style="margin:0;">Job Hunter Bot &mdash; powered by Claude AI</p>
  </div>
</div>
</body></html>`;
}

// ── Send Email ────────────────────────────────────────────────────────────────
async function sendEmail(jobs) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error('RESEND_API_KEY secret is missing.');

  const resend = new Resend(apiKey);
  const now = new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

  const { error } = await resend.emails.send({
    from: 'Job Hunter Bot <onboarding@resend.dev>',
    to: [CONFIG.recipientEmail],
    subject: `${jobs.length} New Senior Full Stack Job${jobs.length > 1 ? 's' : ''} — ${now}`,
    html: buildEmail(jobs),
  });

  if (error) throw new Error(`Resend failed: ${JSON.stringify(error)}`);
  console.log('Email sent successfully.');
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`\n=== Job Hunter Bot started at ${new Date().toISOString()} ===\n`);

  const seen = loadSeenJobs();
  console.log(`Previously seen jobs: ${Object.keys(seen).length}`);

  const allJobs = await searchJobs();
  const newJobs = allJobs.filter((j) => !seen[j.id]).slice(0, CONFIG.maxJobsPerRun);
  console.log(`New jobs to process: ${newJobs.length}`);

  if (newJobs.length === 0) {
    console.log('No new jobs this hour. No email sent.');
    return;
  }

  const jobsWithResumes = [];
  for (let i = 0; i < newJobs.length; i++) {
    const job = newJobs[i];
    console.log(`\nTailoring resume ${i + 1}/${newJobs.length}: ${job.title} at ${job.company}`);
    const tailoredResume = await tailorResume(job);
    jobsWithResumes.push({ ...job, tailoredResume });
    seen[job.id] = new Date().toISOString();
  }

  console.log('\nSending email...');
  await sendEmail(jobsWithResumes);

  saveSeenJobs(seen);
  console.log(`\n=== Done. Emailed ${jobsWithResumes.length} jobs to ${CONFIG.recipientEmail} ===`);
}

main().catch((err) => {
  console.error('\nFATAL ERROR:', err.message);
  process.exit(1);
});
