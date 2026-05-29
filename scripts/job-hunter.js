const Anthropic = require('@anthropic-ai/sdk');
const { Resend } = require('resend');
const PDFDocument = require('pdfkit');
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

// ── Seen Jobs ─────────────────────────────────────────────────────────────────
function loadSeenJobs() {
  try {
    if (!fs.existsSync(CONFIG.seenJobsFile)) return {};
    const seen = JSON.parse(fs.readFileSync(CONFIG.seenJobsFile, 'utf8'));
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
    for (const id of Object.keys(seen)) {
      if (new Date(seen[id]).getTime() < cutoff) delete seen[id];
    }
    return seen;
  } catch { return {}; }
}

function saveSeenJobs(seen) {
  fs.mkdirSync(path.dirname(CONFIG.seenJobsFile), { recursive: true });
  fs.writeFileSync(CONFIG.seenJobsFile, JSON.stringify(seen, null, 2));
}

// ── Job Search ────────────────────────────────────────────────────────────────
async function searchJobs() {
  const appId = process.env.ADZUNA_APP_ID;
  const appKey = process.env.ADZUNA_APP_KEY;
  if (!appId || !appKey) throw new Error('ADZUNA_APP_ID or ADZUNA_APP_KEY secret is missing.');

  const allJobs = [];
  const seenIds = new Set();

  for (const term of CONFIG.searchTerms) {
    const url = `https://api.adzuna.com/v1/api/jobs/us/search/1?app_id=${appId}&app_key=${appKey}&what=${encodeURIComponent(term)}&results_per_page=15&sort_by=date&max_days_old=1&salary_min=${CONFIG.minSalary}&content-type=application/json`;
    try {
      console.log(`Searching: "${term}"...`);
      const res = await fetch(url);
      if (!res.ok) { console.warn(`  Adzuna ${res.status} for "${term}"`); continue; }
      const data = await res.json();
      for (const job of (data.results || [])) {
        if (!seenIds.has(job.id)) {
          seenIds.add(job.id);
          allJobs.push({
            id: String(job.id),
            title: job.title || 'Software Engineer',
            company: job.company?.display_name || 'Unknown Company',
            location: job.location?.display_name || 'Remote / US',
            applyUrl: job.redirect_url || '',
            description: (job.description || '').slice(0, 1800),
            salary: job.salary_min ? `$${Math.round(job.salary_min/1000)}k - $${Math.round((job.salary_max||job.salary_min*1.3)/1000)}k` : 'Competitive',
            postedDate: job.created || new Date().toISOString(),
          });
        }
      }
      console.log(`  Found ${data.results?.length || 0} results`);
    } catch (err) { console.warn(`  Error: ${err.message}`); }
  }

  allJobs.sort((a, b) => new Date(b.postedDate) - new Date(a.postedDate));
  console.log(`Total unique jobs: ${allJobs.length}`);
  return allJobs;
}

// ── Tailor Resume via Claude ──────────────────────────────────────────────────
async function tailorResume(job) {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const prompt = `You are an expert resume writer helping a senior software engineer land interviews at top tech companies.

Tailor the resume below for this specific job. Follow ALL rules strictly:
1. Only use skills and experience already in the resume — never add anything new
2. Write naturally and professionally — must NOT sound AI-generated
3. Naturally weave in keywords from the job description for ATS compatibility
4. Reorder bullet points within each role to highlight most relevant work for THIS job
5. Rewrite the Professional Summary to mirror this company's language and needs
6. Keep all job titles, companies, dates, and metrics exactly as-is (no changes to numbers)
7. Output plain text only — no markdown, no asterisks, no special symbols
8. Focus strictly on Full Stack Developer skills

JOB: ${job.title} at ${job.company}
LOCATION: ${job.location}

JOB DESCRIPTION:
${job.description}

BASE RESUME:
${BASE_RESUME}

Output the complete tailored resume in plain text now:`;

  try {
    const msg = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1500,
      messages: [{ role: 'user', content: prompt }],
    });
    return msg.content[0]?.text || BASE_RESUME;
  } catch (err) {
    console.warn(`  Claude failed for ${job.company}: ${err.message}`);
    return BASE_RESUME;
  }
}

// ── Generate PDF Buffer from resume text ──────────────────────────────────────
function generateResumePDF(resumeText, jobTitle, company) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 45, size: 'LETTER' });
    const buffers = [];

    doc.on('data', chunk => buffers.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);

    const BLUE  = '#1D4ED8';
    const DARK  = '#0F172A';
    const MID   = '#374151';
    const LIGHT = '#6B7280';
    const W     = doc.page.width - 90; // usable width

    const lines = resumeText.split('\n');
    let i = 0;

    // ── Header block: name (first non-empty line) ─────────────────────────────
    while (i < lines.length && lines[i].trim() === '') i++;

    const nameLine = lines[i++] || 'SATYA SAI SRIKAR DANGETI';
    doc.font('Helvetica-Bold').fontSize(20).fillColor(DARK).text(nameLine, 45, 45);

    // Second line = job title
    while (i < lines.length && lines[i].trim() === '') i++;
    if (i < lines.length) {
      doc.font('Helvetica').fontSize(11).fillColor(BLUE).text(lines[i++]);
    }

    // Third line = contact
    while (i < lines.length && lines[i].trim() === '') i++;
    if (i < lines.length) {
      doc.font('Helvetica').fontSize(9).fillColor(LIGHT).text(lines[i++]);
    }

    // Blue rule
    doc.moveDown(0.4);
    const ruleY = doc.y;
    doc.moveTo(45, ruleY).lineTo(45 + W, ruleY).lineWidth(1.5).strokeColor(BLUE).stroke();
    doc.moveDown(0.5);

    // ── Remaining lines ───────────────────────────────────────────────────────
    const SECTION_KEYWORDS = [
      'PROFESSIONAL SUMMARY', 'CORE COMPETENCIES', 'PROFESSIONAL EXPERIENCE',
      'PROJECTS', 'TECHNICAL ACHIEVEMENTS', 'EDUCATION', 'SKILLS', 'EXPERIENCE',
      'SUMMARY', 'CERTIFICATIONS'
    ];

    function isSectionHeading(line) {
      const u = line.trim().toUpperCase();
      return SECTION_KEYWORDS.some(k => u.includes(k));
    }

    function isJobHeader(line) {
      // Lines like "Role | Date" or "Role | Company | Date" with a pipe
      return line.includes('|') && !line.startsWith('-') && !line.startsWith('•');
    }

    function isCompanyLine(line) {
      // Lines directly after job header, short, no dash
      return false; // handled inline
    }

    while (i < lines.length) {
      const raw = lines[i];
      const line = raw.trim();
      i++;

      if (line === '') { doc.moveDown(0.25); continue; }

      if (isSectionHeading(line)) {
        // Section heading
        doc.moveDown(0.3);
        doc.font('Helvetica-Bold').fontSize(8.5).fillColor(BLUE)
           .text(line.toUpperCase(), { characterSpacing: 1.1 });
        const sy = doc.y + 2;
        doc.moveTo(45, sy).lineTo(45 + W, sy).lineWidth(0.4).strokeColor('#E2E8F0').stroke();
        doc.moveDown(0.35);

      } else if (line.startsWith('-') || line.startsWith('•')) {
        // Bullet
        const text = line.replace(/^[-•]\s*/, '');
        doc.font('Helvetica').fontSize(9).fillColor(MID)
           .text(`\u2022  ${text}`, { indent: 10, width: W - 10, lineGap: 1.5 });
        doc.moveDown(0.1);

      } else if (isJobHeader(line)) {
        // Job title line — split on last pipe to get date on right
        const parts = line.split('|');
        const dateStr = parts[parts.length - 1].trim();
        const roleStr = parts.slice(0, -1).join('|').trim();

        const dateWidth = 95;
        const roleWidth = W - dateWidth;
        const startY = doc.y;

        doc.font('Helvetica-Bold').fontSize(10).fillColor(DARK)
           .text(roleStr, 45, startY, { width: roleWidth });
        doc.font('Helvetica').fontSize(9).fillColor(LIGHT)
           .text(dateStr, 45 + roleWidth, startY, { width: dateWidth, align: 'right' });
        doc.y = startY + 14;
        doc.moveDown(0.1);

      } else if (line.includes('|') && doc.y < 500) {
        // Company/location line (secondary pipe line)
        doc.font('Helvetica').fontSize(9.5).fillColor(MID).text(line);
        doc.moveDown(0.25);

      } else {
        // Normal paragraph text (summary, competencies, etc.)
        doc.font('Helvetica').fontSize(9.5).fillColor(MID)
           .text(line, { width: W, lineGap: 1.5 });
        doc.moveDown(0.15);
      }
    }

    doc.end();
  });
}

// ── Build HTML Email ──────────────────────────────────────────────────────────
function esc(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function buildEmail(jobs) {
  const now = new Date().toLocaleString('en-US', {
    timeZone: 'America/New_York', weekday:'short', month:'short',
    day:'numeric', hour:'2-digit', minute:'2-digit'
  });

  const blocks = jobs.map((job, i) => `
<div style="background:#fff;border:1px solid #e5e7eb;border-radius:10px;padding:24px 28px;margin-bottom:24px;">
  <p style="margin:0 0 3px;font-size:11px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:.08em;">Job ${i+1} of ${jobs.length}</p>
  <h2 style="margin:0 0 2px;font-size:19px;font-weight:700;color:#111827;">${esc(job.title)}</h2>
  <p style="margin:0 0 12px;font-size:14px;color:#374151;">${esc(job.company)} &nbsp;·&nbsp; ${esc(job.location)} &nbsp;·&nbsp; ${esc(job.salary)}</p>
  <a href="${esc(job.applyUrl)}" style="display:inline-block;background:#1d4ed8;color:#fff;text-decoration:none;padding:9px 20px;border-radius:6px;font-size:13px;font-weight:600;margin-bottom:16px;">Apply Now &rarr;</a>
  <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:6px;padding:12px 16px;font-size:13px;color:#0369a1;">
    <strong>📎 Tailored resume attached:</strong> <em>Resume_${esc(job.company.replace(/\s+/g,'_'))}.pdf</em><br>
    <span style="font-size:12px;color:#0284c7;">Open the attachment — it's a PDF resume tailored specifically for this role.</span>
  </div>
</div>`).join('');

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<div style="max-width:680px;margin:0 auto;padding:24px 16px;">
  <div style="background:#1d4ed8;border-radius:10px;padding:22px 28px;margin-bottom:24px;">
    <h1 style="margin:0 0 5px;font-size:21px;font-weight:800;color:#fff;">Job Digest &mdash; ${jobs.length} New Match${jobs.length>1?'es':''}</h1>
    <p style="margin:0;font-size:12px;color:rgba(255,255,255,.8);">Senior Full Stack Developer &nbsp;&middot;&nbsp; Remote + Hybrid &nbsp;&middot;&nbsp; ${now} ET</p>
  </div>
  <p style="font-size:13px;color:#374151;margin:0 0 20px;padding:12px 16px;background:#fff;border-radius:8px;border:1px solid #e5e7eb;">
    Each job below has a <strong>tailored PDF resume attached</strong> — open the PDF attachments to find the resume customized for that specific role.
  </p>
  ${blocks}
  <div style="text-align:center;padding:16px;color:#9ca3af;font-size:11px;">
    <p style="margin:0;">Job Hunter Bot &mdash; powered by Claude AI</p>
  </div>
</div></body></html>`;
}

// ── Send Email with PDF Attachments ───────────────────────────────────────────
async function sendEmail(jobs) {
  const resend = new Resend(process.env.RESEND_API_KEY);
  if (!process.env.RESEND_API_KEY) throw new Error('RESEND_API_KEY secret is missing.');

  const now = new Date().toLocaleString('en-US', { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' });

  // Build PDF attachments — one per job
  console.log('Generating PDF attachments...');
  const attachments = [];
  for (const job of jobs) {
    const pdfBuffer = await generateResumePDF(job.tailoredResume, job.title, job.company);
    const safeName = job.company.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 30);
    attachments.push({
      filename: `Resume_${safeName}_${job.title.replace(/[^a-zA-Z0-9]/g,'_').slice(0,25)}.pdf`,
      content: pdfBuffer.toString('base64'),
    });
    console.log(`  PDF ready: Resume_${safeName}.pdf (${Math.round(pdfBuffer.length/1024)}KB)`);
  }

  const { error } = await resend.emails.send({
    from: 'Job Hunter Bot <onboarding@resend.dev>',
    to: [CONFIG.recipientEmail],
    subject: `${jobs.length} New Senior Full Stack Job${jobs.length>1?'s':''} — ${now} (PDF resumes attached)`,
    html: buildEmail(jobs),
    attachments,
  });

  if (error) throw new Error(`Resend failed: ${JSON.stringify(error)}`);
  console.log(`Email sent with ${attachments.length} PDF attachment(s).`);
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`\n=== Job Hunter Bot started at ${new Date().toISOString()} ===\n`);

  const seen = loadSeenJobs();
  console.log(`Previously seen jobs: ${Object.keys(seen).length}`);

  const allJobs = await searchJobs();
  const newJobs = allJobs.filter(j => !seen[j.id]).slice(0, CONFIG.maxJobsPerRun);
  console.log(`New jobs to process: ${newJobs.length}`);

  if (newJobs.length === 0) {
    console.log('No new jobs this hour. No email sent.');
    return;
  }

  const jobsWithResumes = [];
  for (let i = 0; i < newJobs.length; i++) {
    const job = newJobs[i];
    console.log(`\nTailoring resume ${i+1}/${newJobs.length}: ${job.title} at ${job.company}`);
    const tailoredResume = await tailorResume(job);
    jobsWithResumes.push({ ...job, tailoredResume });
    seen[job.id] = new Date().toISOString();
  }

  console.log('\nSending email with PDF attachments...');
  await sendEmail(jobsWithResumes);

  saveSeenJobs(seen);
  console.log(`\n=== Done. Emailed ${jobsWithResumes.length} jobs to ${CONFIG.recipientEmail} ===`);
}

main().catch(err => {
  console.error('\nFATAL ERROR:', err.message);
  process.exit(1);
});
