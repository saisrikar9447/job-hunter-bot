const fetch = require('node-fetch');
const Anthropic = require('@anthropic-ai/sdk');
const { Resend } = require('resend');
const fs = require('fs');
const path = require('path');

// ─── Config ──────────────────────────────────────────────────────────────────
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

// ─── Satya's Base Resume ──────────────────────────────────────────────────────
const BASE_RESUME = `
SATYA SAI SRIKAR DANGETI
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
Testing & Practices: JUnit 5, Mockito, Integration Testing, TDD, Agile/Scrum, CI/CD Pipelines, Code Review, SOLID Principles

PROFESSIONAL EXPERIENCE

Software Engineer II, Full Stack | May 2025 – Present
Huntington Bank | Columbus, OH
- Engineer full-stack banking applications serving 5000+ internal users across operations, compliance, and fraud analytics teams using Spring Boot microservices and React SPAs.
- Designed and implemented 12+ RESTful microservices with Spring Security, JWT token validation, and OAuth 2.0 flows for secure transaction processing and account management workflows.
- Built reusable React component library with Redux state management, reducing UI development time by 28% and standardizing design patterns across 6 interconnected applications.
- Optimized Spring Data JPA queries with strategic indexing and N+1 query elimination, improving API response times from 850ms to 280ms on high-traffic endpoints.
- Established automated test coverage to 82% using JUnit 5 and Mockito, preventing 15+ production bugs through comprehensive unit and integration tests in CI/CD pipeline.
- Led effort to integrate role-based access control (RBAC) and field-level encryption for PCI-DSS and SOX compliance across all customer-facing APIs.

Software Engineer, Backend & Frontend | Dec 2023 – May 2025
University of Wisconsin–Milwaukee | Milwaukee, WI
- Built end-to-end institutional reporting platform replacing legacy spreadsheet workflows for 11 academic departments; backend in Spring Boot, frontend in React with 40+ custom components.
- Architected microservices for student enrollment, course management, and budget reporting; each service exposed clean REST endpoints documented via Swagger with OpenAPI 3.0 specs.
- Designed React dashboards with real-time data visualization using Chart.js, enabling department heads to query enrollment trends, spending patterns, and academic metrics without IT intervention.
- Implemented PostgreSQL schemas with proper normalization and indexing; refactored N+1 queries reducing report generation time by 52% while maintaining data integrity across 10M+ student records.
- Secured sensitive PII with Spring Security field-level encryption and AWS KMS key management, ensuring FERPA compliance during external audits.
- Participated in 2-week Agile sprints; delivered 18 features across 3 major releases with zero critical production incidents.

Software Engineer, Distributed Systems | Aug 2021 – Aug 2023
Walmart | Remote
- Developed high-throughput Java microservices on Google Cloud Run handling 2B+ daily events for supply chain visibility, inventory management, and logistics optimization.
- Built stateless Spring Boot services with load balancing across 20+ container instances; consumed Kafka event streams and published state changes through REST APIs to React dashboards.
- Implemented event-driven architecture using Kafka topic subscriptions, enabling real-time supply chain state propagation with <500ms latency during peak Black Friday operations.
- Optimized database queries and implemented Redis caching layer reducing API latency by 41%.
- Containerized services with Docker and orchestrated on Kubernetes (GKE); reduced deployment time from 30 minutes to 4 minutes.
- Wrote 500+ unit and integration tests with JUnit, Mockito, and Testcontainers, maintaining 76% code coverage.

Junior Software Engineer | Jan 2020 – Aug 2021
Unschool (EdTech) | Telangana, India
- Built core features for e-learning platform supporting 65,000+ active students using Spring Boot backend APIs and React frontend components.
- Developed user authentication microservice with JWT tokens and role-based authorization; integrated with MySQL via Spring Data JPA managing 500K+ user profiles.
- Created React pages for course enrollment, progress tracking, and student dashboards; optimized Axios request batching to reduce network overhead by 30%.

PROJECTS & TECHNICAL ACHIEVEMENTS

E-Commerce Microservices Platform | Java, Spring Boot, React, PostgreSQL, Docker, Kubernetes, AWS ECS
- Designed 4-service microservices architecture (User, Product, Order, Payment) with independent codebases and databases; each service exposes well-defined REST APIs.
- Developed React SPA with Redux, React Router, and Axios; implemented cart persistence, checkout workflows, and order tracking.
- Containerized with Docker, deployed to AWS ECS with auto-scaling; GitHub Actions CI/CD pipelines for automated testing and deployment.

Real-Time Notification & Messaging Service | Java, Spring Boot, Kafka, WebSocket, Redis, React, PostgreSQL
- Built event-driven notification microservice consuming Kafka topics; WebSocket endpoints pushed real-time updates to React clients supporting 15K+ concurrent connections.
- Implemented Redis-backed session store for JWT caching; message delivery latency <120ms with 99.8% uptime during production load testing.

EDUCATION
Master of Science, Information Technology | May 2025
University of Wisconsin–Milwaukee | GPA: 3.6/4.0
`.trim();

// ─── Seen Jobs (deduplication) ────────────────────────────────────────────────
function loadSeenJobs() {
  try {
    if (!fs.existsSync(CONFIG.seenJobsFile)) return {};
    const raw = fs.readFileSync(CONFIG.seenJobsFile, 'utf8');
    const seen = JSON.parse(raw);
    // Clean up entries older than 7 days
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
    Object.keys(seen).forEach((id) => {
      if (new Date(seen[id]).getTime() < cutoff) delete seen[id];
    });
    return seen;
  } catch {
    return {};
  }
}

function saveSeenJobs(seen) {
  fs.mkdirSync(path.dirname(CONFIG.seenJobsFile), { recursive: true });
  fs.writeFileSync(CONFIG.seenJobsFile, JSON.stringify(seen, null, 2));
}

// ─── Job Search (Adzuna API) ──────────────────────────────────────────────────
async function searchJobs() {
  const appId = process.env.ADZUNA_APP_ID;
  const appKey = process.env.ADZUNA_APP_KEY;
  if (!appId || !appKey) throw new Error('Missing ADZUNA_APP_ID or ADZUNA_APP_KEY');

  const allJobs = [];
  const seenIds = new Set();

  for (const term of CONFIG.searchTerms) {
    const encoded = encodeURIComponent(term);
    const url = [
      `https://api.adzuna.com/v1/api/jobs/us/search/1`,
      `?app_id=${appId}`,
      `&app_key=${appKey}`,
      `&what=${encoded}`,
      `&results_per_page=20`,
      `&sort_by=date`,
      `&max_days_old=1`,
      `&salary_min=${CONFIG.minSalary}`,
      `&content-type=application/json`,
    ].join('');

    try {
      const res = await fetch(url);
      if (!res.ok) {
        console.warn(`Adzuna search failed for "${term}": ${res.status}`);
        continue;
      }
      const data = await res.json();
      const results = data.results || [];

      for (const job of results) {
        if (!seenIds.has(job.id)) {
          seenIds.add(job.id);
          // Normalize job object
          allJobs.push({
            id: job.id,
            title: job.title || 'Software Engineer',
            company: job.company?.display_name || 'Unknown Company',
            location: job.location?.display_name || 'Remote',
            applyUrl: job.redirect_url || job.adref || '',
            description: (job.description || '').slice(0, 2000),
            salary: job.salary_min
              ? `$${Math.round(job.salary_min / 1000)}k – $${Math.round((job.salary_max || job.salary_min * 1.3) / 1000)}k`
              : 'Competitive',
            postedDate: job.created || new Date().toISOString(),
          });
        }
      }
    } catch (err) {
      console.warn(`Error searching "${term}":`, err.message);
    }
  }

  // Sort by most recent
  allJobs.sort((a, b) => new Date(b.postedDate) - new Date(a.postedDate));
  return allJobs;
}

// ─── Resume Tailoring (Claude) ────────────────────────────────────────────────
async function tailorResume(job) {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const prompt = `You are a professional resume writer with 15 years of experience helping software engineers land senior roles at top tech companies.

Your task: Tailor the resume below for a specific job posting. 

STRICT RULES:
1. Use ONLY skills and experience already in the base resume — never invent or add anything
2. Write in a natural, professional human tone — never sound AI-generated
3. Make it ATS-friendly by naturally weaving in keywords from the job description
4. Focus strictly on Full Stack Developer skills and experience
5. Keep the same resume structure (summary, skills, experience, projects, education)
6. Reorder bullet points within each role to prioritize the most relevant work for THIS job
7. Adjust the Professional Summary to directly mirror this company's language
8. Keep it under 2 pages
9. Output plain text only — no markdown, no asterisks, no special characters except standard punctuation and dashes
10. Do not change any job titles, companies, dates, or measurable achievements (numbers must stay exact)

JOB TITLE: ${job.title}
COMPANY: ${job.company}
LOCATION: ${job.location}

JOB DESCRIPTION:
${job.description}

BASE RESUME:
${BASE_RESUME}

Output the complete tailored resume now. Plain text only, ready to paste into any ATS system.`;

  try {
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1500,
      messages: [{ role: 'user', content: prompt }],
    });
    return message.content[0]?.text || BASE_RESUME;
  } catch (err) {
    console.warn(`Claude tailoring failed for ${job.title} at ${job.company}:`, err.message);
    return BASE_RESUME;
  }
}

// ─── Email Builder ────────────────────────────────────────────────────────────
function buildEmailHtml(jobs) {
  const now = new Date().toLocaleString('en-US', {
    timeZone: 'America/New_York',
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const jobBlocks = jobs
    .map(
      (job, i) => `
    <div style="background:#ffffff;border:1px solid #e5e7eb;border-radius:10px;padding:28px 32px;margin-bottom:32px;">
      
      <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:16px;">
        <div>
          <p style="margin:0 0 4px;font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;">Job ${i + 1}</p>
          <h2 style="margin:0 0 4px;font-size:20px;font-weight:700;color:#111827;">${job.title}</h2>
          <p style="margin:0;font-size:15px;color:#374151;font-weight:500;">${job.company}</p>
        </div>
        <div style="text-align:right;flex-shrink:0;margin-left:20px;">
          <p style="margin:0 0 4px;font-size:13px;color:#6b7280;">📍 ${job.location}</p>
          <p style="margin:0;font-size:13px;color:#6b7280;">💰 ${job.salary}</p>
        </div>
      </div>

      <a href="${job.applyUrl}"
         style="display:inline-block;background:#1d4ed8;color:#ffffff;text-decoration:none;padding:10px 24px;border-radius:6px;font-size:14px;font-weight:600;margin-bottom:24px;">
        Apply Now →
      </a>

      <div style="border-top:1px solid #e5e7eb;padding-top:20px;margin-top:8px;">
        <p style="margin:0 0 12px;font-size:14px;font-weight:700;color:#111827;text-transform:uppercase;letter-spacing:0.05em;">
          ✦ Tailored Resume for This Role
        </p>
        <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;padding:20px;">
          <pre style="margin:0;font-family:'Courier New',Courier,monospace;font-size:12px;line-height:1.6;color:#1f2937;white-space:pre-wrap;word-wrap:break-word;">${escapeHtml(job.tailoredResume)}</pre>
        </div>
      </div>
    </div>
  `
    )
    .join('');

  return `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:760px;margin:0 auto;padding:32px 16px;">
    
    <div style="background:#1d4ed8;border-radius:10px;padding:28px 32px;margin-bottom:32px;color:#ffffff;">
      <h1 style="margin:0 0 8px;font-size:24px;font-weight:800;">🎯 Job Digest — ${jobs.length} New Match${jobs.length > 1 ? 'es' : ''}</h1>
      <p style="margin:0;font-size:14px;opacity:0.85;">Senior Full Stack Developer · Remote + Hybrid · ${now} ET</p>
    </div>

    ${jobBlocks}

    <div style="text-align:center;padding:24px;color:#9ca3af;font-size:12px;">
      <p style="margin:0;">Automated by your Job Hunter Bot · Powered by Claude AI</p>
      <p style="margin:4px 0 0;">Each resume is tailored to match the specific job description.</p>
    </div>

  </div>
</body>
</html>
  `.trim();
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ─── Send Email ───────────────────────────────────────────────────────────────
async function sendEmail(jobs) {
  const resend = new Resend(process.env.RESEND_API_KEY);
  const now = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

  const { data, error } = await resend.emails.send({
    from: 'Job Hunter Bot <onboarding@resend.dev>',
    to: [CONFIG.recipientEmail],
    subject: `🎯 ${jobs.length} New Senior Full Stack Job${jobs.length > 1 ? 's' : ''} — ${now}`,
    html: buildEmailHtml(jobs),
  });

  if (error) throw new Error(`Email failed: ${JSON.stringify(error)}`);
  console.log(`Email sent successfully. ID: ${data?.id}`);
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`[${new Date().toISOString()}] Job Hunter Bot starting...`);

  const seen = loadSeenJobs();
  console.log(`Loaded ${Object.keys(seen).length} previously seen jobs.`);

  const allJobs = await searchJobs();
  console.log(`Found ${allJobs.length} total jobs from API.`);

  const newJobs = allJobs.filter((j) => !seen[j.id]).slice(0, CONFIG.maxJobsPerRun);
  console.log(`${newJobs.length} new jobs to process.`);

  if (newJobs.length === 0) {
    console.log('No new jobs this hour. Skipping email.');
    return;
  }

  // Tailor resumes
  const jobsWithResumes = [];
  for (let i = 0; i < newJobs.length; i++) {
    const job = newJobs[i];
    console.log(`Tailoring resume ${i + 1}/${newJobs.length}: ${job.title} at ${job.company}...`);
    const tailoredResume = await tailorResume(job);
    jobsWithResumes.push({ ...job, tailoredResume });
    seen[job.id] = new Date().toISOString();
  }

  // Send digest email
  await sendEmail(jobsWithResumes);

  // Save updated seen list
  saveSeenJobs(seen);
  console.log(`Done. Processed ${jobsWithResumes.length} jobs.`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
