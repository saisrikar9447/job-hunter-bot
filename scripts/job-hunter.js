const Anthropic = require('@anthropic-ai/sdk');
const { Resend } = require('resend');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const CONFIG = {
  recipientEmail: 'srikardangeti69@gmail.com',
  maxJobsPerRun: 10,
  searchTerms: [
    'senior full stack developer',
    'senior full stack engineer',
    'staff software engineer full stack',
    'software engineer full stack',
    'senior software engineer',
    'software engineer java react',
  ],
  minSalary: 100000,
  seenJobsFile: path.join(__dirname, '..', 'data', 'seen_jobs.json'),
};

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
- Engineer full-stack banking applications serving 5,000+ internal users across operations, compliance, and fraud analytics teams using Spring Boot microservices and React SPAs.
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
- Delivered 18 features across 3 major releases in 2-week Agile sprints with zero critical production incidents.

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
      if (!res.ok) { console.warn(`  Adzuna ${res.status}`); continue; }
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
      console.log(`  ${data.results?.length || 0} results`);
    } catch (err) { console.warn(`  Error: ${err.message}`); }
  }

  allJobs.sort((a, b) => new Date(b.postedDate) - new Date(a.postedDate));
  console.log(`Total unique jobs: ${allJobs.length}`);
  return allJobs;
}

async function tailorResume(job) {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const prompt = `You are an expert resume writer. Tailor the resume below for this specific job.

STRICT RULES — follow every single one:
1. Output ONLY the resume text. No commentary, no intro, no explanation.
2. Use normal sentence case throughout — absolutely NO ALL CAPS anywhere in the resume body (section headings are the only exception, keep them as-is).
3. Every bullet point must be a COMPLETE sentence — never cut off or truncate mid-sentence.
4. Keep every bullet point to ONE line of thought — do not split a bullet across unrelated ideas.
5. Only use skills and experience already in the resume — never invent anything new.
6. Rewrite the Professional Summary in 3-4 complete sentences that mirror this company's language.
7. Reorder bullet points within each role so the most relevant ones appear first.
8. Keep all job titles, companies, dates, and metrics exactly as-is.
9. Plain text only — no markdown, no asterisks, no special symbols except standard dashes and pipes.
10. Weave in keywords from the job description naturally for ATS compatibility.
11. Focus strictly on Full Stack Developer skills.

JOB: ${job.title} at ${job.company}
LOCATION: ${job.location}

JOB DESCRIPTION:
${job.description}

BASE RESUME:
${BASE_RESUME}

Output the tailored resume now (plain text, complete sentences, normal case):`;

  try {
    const msg = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1800,
      messages: [{ role: 'user', content: prompt }],
    });
    return msg.content[0]?.text || BASE_RESUME;
  } catch (err) {
    console.warn(`  Claude failed for ${job.company}: ${err.message}`);
    return BASE_RESUME;
  }
}

// ── Clean PDF Generator ───────────────────────────────────────────────────────
function generateResumePDF(resumeText) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      margin: 0,
      size: 'LETTER',
      bufferPages: true,
    });

    const buffers = [];
    doc.on('data', c => buffers.push(c));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);

    // Layout constants
    const ML = 50;          // margin left
    const MT = 46;          // margin top
    const MR = 50;          // margin right
    const PW = 612;         // page width
    const TW = PW - ML - MR; // text width = 512

    // Colors
    const C_DARK  = '#0F172A';
    const C_BLUE  = '#1D4ED8';
    const C_MID   = '#374151';
    const C_LIGHT = '#94A3B8';
    const C_RULE  = '#E2E8F0';

    let y = MT;

    // Helper: advance y, add new page if needed
    function checkPage(needed = 14) {
      if (y + needed > 755) {
        doc.addPage();
        y = MT;
      }
    }

    // Helper: draw a full-width horizontal rule
    function drawRule(color = C_RULE, thickness = 0.5) {
      doc.moveTo(ML, y).lineTo(ML + TW, y).lineWidth(thickness).strokeColor(color).stroke();
    }

    // Helper: write a line of text and return its rendered height
    function writeLine(text, opts = {}) {
      const {
        font = 'Helvetica',
        size = 9.5,
        color = C_MID,
        align = 'left',
        indent = 0,
        maxWidth = TW,
      } = opts;

      const x = ML + indent;
      const w = maxWidth - indent;

      doc.font(font).fontSize(size).fillColor(color);
      const h = doc.heightOfString(text, { width: w, lineGap: 2 });
      checkPage(h + 2);
      doc.text(text, x, y, { width: w, align, lineGap: 2 });
      y += h + 2;
      return h;
    }

    // ── Parse and render ────────────────────────────────────────────────────
    const SECTION_HEADS = [
      'PROFESSIONAL SUMMARY', 'CORE COMPETENCIES', 'PROFESSIONAL EXPERIENCE',
      'PROJECTS', 'TECHNICAL ACHIEVEMENTS', 'EDUCATION', 'SKILLS', 'CERTIFICATIONS',
      'EXPERIENCE', 'SUMMARY',
    ];

    function isSectionHead(line) {
      const u = line.trim().toUpperCase();
      return SECTION_HEADS.some(k => u === k || u.startsWith(k));
    }

    // Lines with a pipe that are NOT bullets — job header or company line
    function isPipeHeader(line) {
      return line.includes('|') && !line.trim().startsWith('-') && !line.trim().startsWith('•');
    }

    const lines = resumeText.split('\n');
    let i = 0;

    // Skip leading blank lines
    while (i < lines.length && lines[i].trim() === '') i++;

    // ── Name ──────────────────────────────────────────────────────────────
    if (i < lines.length) {
      const name = lines[i++].trim();
      checkPage(30);
      doc.font('Helvetica-Bold').fontSize(21).fillColor(C_DARK).text(name, ML, y, { width: TW });
      y += 26;
    }

    // ── Title (second non-empty line) ─────────────────────────────────────
    while (i < lines.length && lines[i].trim() === '') i++;
    if (i < lines.length) {
      const title = lines[i++].trim();
      checkPage(16);
      doc.font('Helvetica').fontSize(11).fillColor(C_BLUE).text(title, ML, y, { width: TW });
      y += 16;
    }

    // ── Contact (third non-empty line) ────────────────────────────────────
    while (i < lines.length && lines[i].trim() === '') i++;
    if (i < lines.length) {
      const contact = lines[i++].trim();
      checkPage(14);
      doc.font('Helvetica').fontSize(9).fillColor(C_LIGHT).text(contact, ML, y, { width: TW });
      y += 13;
    }

    // Blue divider under header
    y += 4;
    checkPage(4);
    drawRule(C_BLUE, 1.5);
    y += 8;

    // ── Rest of resume ────────────────────────────────────────────────────
    while (i < lines.length) {
      const raw = lines[i++];
      const line = raw.trim();

      if (line === '') {
        y += 3;
        continue;
      }

      // Section heading
      if (isSectionHead(line)) {
        y += 6;
        checkPage(22);
        doc.font('Helvetica-Bold').fontSize(8).fillColor(C_BLUE)
           .text(line.toUpperCase(), ML, y, { width: TW, characterSpacing: 1.0 });
        y += 12;
        drawRule(C_RULE, 0.4);
        y += 5;
        continue;
      }

      // Bullet point
      if (line.startsWith('-') || line.startsWith('•')) {
        const text = line.replace(/^[-•]\s*/, '').trim();
        if (!text) continue;

        const bulletX = ML + 2;
        const textX   = ML + 12;
        const textW   = TW - 12;

        const h = doc.font('Helvetica').fontSize(9.2)
                     .heightOfString(text, { width: textW, lineGap: 1.5 });
        checkPage(h + 3);

        // bullet dot
        doc.font('Helvetica').fontSize(9.2).fillColor(C_MID)
           .text('\u2022', bulletX, y, { width: 8 });
        // bullet text — starts on same line as dot
        doc.font('Helvetica').fontSize(9.2).fillColor(C_MID)
           .text(text, textX, y, { width: textW, lineGap: 1.5 });

        y += h + 3;
        continue;
      }

      // Pipe header line (job role + date, or company + location)
      if (isPipeHeader(line)) {
        const parts = line.split('|').map(p => p.trim());

        if (parts.length >= 2) {
          const last   = parts[parts.length - 1];
          const first  = parts.slice(0, -1).join(' | ');
          const dateW  = 100;
          const roleW  = TW - dateW;

          // Check if this looks like a "Role | Date" (job title line) vs "Company | City"
          const isDateLine = /\d{4}/.test(last) || last.includes('Present') || last.includes('Remote');

          if (isDateLine) {
            // Bold role on left, light date on right
            const h = Math.max(
              doc.font('Helvetica-Bold').fontSize(10).heightOfString(first, { width: roleW }),
              14
            );
            checkPage(h + 4);
            y += 6; // extra spacing before each job
            doc.font('Helvetica-Bold').fontSize(10).fillColor(C_DARK)
               .text(first, ML, y, { width: roleW });
            doc.font('Helvetica').fontSize(9).fillColor(C_LIGHT)
               .text(last, ML + roleW, y, { width: dateW, align: 'right' });
            y += h + 3;
          } else {
            // Company / location line
            checkPage(14);
            doc.font('Helvetica').fontSize(9.5).fillColor(C_MID)
               .text(parts.join('  \u00B7  '), ML, y, { width: TW });
            y += 13;
          }
        }
        continue;
      }

      // Generic text (summary paragraphs, competency lines, etc.)
      const h = doc.font('Helvetica').fontSize(9.5)
                   .heightOfString(line, { width: TW, lineGap: 1.5 });
      checkPage(h + 3);
      doc.font('Helvetica').fontSize(9.5).fillColor(C_MID)
         .text(line, ML, y, { width: TW, lineGap: 1.5 });
      y += h + 3;
    }

    doc.end();
  });
}

function esc(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function buildEmail(jobs) {
  const now = new Date().toLocaleString('en-US', {
    timeZone: 'America/New_York', weekday:'short', month:'short',
    day:'numeric', hour:'2-digit', minute:'2-digit',
  });

  const blocks = jobs.map((job, i) => `
<div style="background:#fff;border:1px solid #e5e7eb;border-radius:10px;padding:24px 28px;margin-bottom:20px;">
  <p style="margin:0 0 3px;font-size:11px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:.08em;">Job ${i+1} of ${jobs.length}</p>
  <h2 style="margin:0 0 2px;font-size:19px;font-weight:700;color:#111827;">${esc(job.title)}</h2>
  <p style="margin:0 0 14px;font-size:13px;color:#374151;">${esc(job.company)} &nbsp;&middot;&nbsp; ${esc(job.location)} &nbsp;&middot;&nbsp; ${esc(job.salary)}</p>
  <a href="${esc(job.applyUrl)}" style="display:inline-block;background:#1d4ed8;color:#fff;text-decoration:none;padding:9px 20px;border-radius:6px;font-size:13px;font-weight:600;margin-bottom:16px;">Apply Now &rarr;</a>
  <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:6px;padding:11px 15px;font-size:13px;color:#0369a1;">
    <strong>&#128206; PDF attached:</strong> <em>Resume_${esc(job.company.replace(/\s+/g,'_').slice(0,25))}.pdf</em><br>
    <span style="font-size:12px;color:#0284c7;">Scroll to the bottom of this email to open your tailored PDF resume for this role.</span>
  </div>
</div>`).join('');

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<div style="max-width:680px;margin:0 auto;padding:24px 16px;">
  <div style="background:#1d4ed8;border-radius:10px;padding:20px 28px;margin-bottom:20px;">
    <h1 style="margin:0 0 4px;font-size:20px;font-weight:800;color:#fff;">&#127919; ${jobs.length} New Senior Full Stack Job${jobs.length>1?'s':''}</h1>
    <p style="margin:0;font-size:12px;color:rgba(255,255,255,.8);">Remote + Hybrid &nbsp;&middot;&nbsp; ${now} ET</p>
  </div>
  ${blocks}
  <p style="text-align:center;font-size:11px;color:#9ca3af;margin-top:8px;">Job Hunter Bot &mdash; powered by Claude AI</p>
</div></body></html>`;
}

async function sendEmail(jobs) {
  if (!process.env.RESEND_API_KEY) throw new Error('RESEND_API_KEY secret is missing.');
  const resend = new Resend(process.env.RESEND_API_KEY);
  const now = new Date().toLocaleString('en-US', { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' });

  console.log('Generating PDF attachments...');
  const attachments = [];
  for (const job of jobs) {
    const pdf = await generateResumePDF(job.tailoredResume);
    const safe = job.company.replace(/[^a-zA-Z0-9]/g,'_').slice(0,28);
    const filename = `Resume_${safe}.pdf`;
    attachments.push({ filename, content: pdf.toString('base64') });
    console.log(`  ${filename} — ${Math.round(pdf.length/1024)}KB`);
  }

  const { error } = await resend.emails.send({
    from: 'Job Hunter Bot <onboarding@resend.dev>',
    to: [CONFIG.recipientEmail],
    subject: `${jobs.length} New Senior Full Stack Job${jobs.length>1?'s':''} — ${now} (PDF resumes attached)`,
    html: buildEmail(jobs),
    attachments,
  });

  if (error) throw new Error(`Resend failed: ${JSON.stringify(error)}`);
  console.log(`Email sent with ${attachments.length} PDF(s).`);
}

async function main() {
  console.log(`\n=== Job Hunter Bot ${new Date().toISOString()} ===\n`);

  const seen = loadSeenJobs();
  console.log(`Previously seen: ${Object.keys(seen).length} jobs`);

  const allJobs = await searchJobs();
  const newJobs = allJobs.filter(j => !seen[j.id]).slice(0, CONFIG.maxJobsPerRun);
  console.log(`New jobs: ${newJobs.length}`);

  if (newJobs.length === 0) { console.log('No new jobs this hour.'); return; }

  const jobsWithResumes = [];
  for (let i = 0; i < newJobs.length; i++) {
    const job = newJobs[i];
    console.log(`\nTailoring ${i+1}/${newJobs.length}: ${job.title} at ${job.company}`);
    jobsWithResumes.push({ ...job, tailoredResume: await tailorResume(job) });
    seen[job.id] = new Date().toISOString();
  }

  await sendEmail(jobsWithResumes);
  saveSeenJobs(seen);
  console.log(`\n=== Done. Emailed ${jobsWithResumes.length} jobs ===`);
}

main().catch(err => { console.error('\nFATAL ERROR:', err.message); process.exit(1); });
