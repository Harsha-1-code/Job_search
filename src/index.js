/**
 * Teak Job Search & AI Resume Tailor Console - Client Application Logic
 */

// Python AI backend URL — change this if deploying remotely
const AI_SERVER_URL = 'http://localhost:5000';

function escapeHTML(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Initial Seed Jobs database
// Each job includes a careersUrl pointing to the company's real careers page
const SEED_JOBS = [
  {
    id: 1,
    title: "Software Engineer Intern",
    company: "Enterpret",
    location: "Bengaluru, India",
    ats: "greenhouse",
    matchScore: 92,
    type: "intern",
    qualifications: [
      "Pursuing a degree in Computer Science, Engineering, or related field from Tier 1 college",
      "Familiarity with web application development frameworks and modern database architectures",
      "Excellent communication skills and eagerness to pair-program with senior mentors"
    ],
    desired: [
      "Experience with AWS and serverless architectures",
      "Interest in backend systems and scalable infrastructure",
      "Strong problem-solving and systems-thinking skills",
      "Prior hackathon participation or active open-source contribution profile"
    ],
    url: "https://boards.greenhouse.io/enterpret",
    careersUrl: "https://www.enterpret.com/careers"
  },
  {
    id: 2,
    title: "Full Stack Engineer",
    company: "Figma",
    location: "Remote, India",
    ats: "greenhouse",
    matchScore: 88,
    type: "fulltime",
    qualifications: [
      "Strong experience with React, TypeScript, and high-performance Node.js services",
      "Understanding of canvas architectures or WebGL is a huge plus",
      "Strong product sense and ability to design complex interactive user journeys"
    ],
    desired: [
      "Familiarity with collaborative multiplayer architectures (CRDTs / OT)",
      "Excellent visual design craftsmanship and attention to detail",
      "Experience optimizing client-side memory footprint and rendering speed"
    ],
    url: "https://boards.greenhouse.io/figma",
    careersUrl: "https://www.figma.com/careers"
  },
  {
    id: 3,
    title: "Senior Frontend Developer",
    company: "Vercel",
    location: "Remote",
    ats: "greenhouse",
    matchScore: 95,
    type: "fulltime",
    qualifications: [
      "Deep expertise in Next.js, React, and modern web deployment pipelines",
      "Strong profile optimizing Core Web Vitals (LCP, FID, CLS)",
      "5+ years of production experience scaling web applications"
    ],
    desired: [
      "Experience writing Rust-based tooling (SWC, Turbopack) is an advantage",
      "Exceptional communication skills for a globally distributed developer community",
      "Passion for building Developer Tools and UI kits"
    ],
    url: "https://boards.greenhouse.io/vercel",
    careersUrl: "https://vercel.com/careers"
  },
  {
    id: 4,
    title: "Security Analyst",
    company: "Cred",
    location: "Bengaluru",
    ats: "lever",
    matchScore: 84,
    type: "fulltime",
    qualifications: [
      "Experience implementing zero-trust network frameworks and microservice boundaries",
      "Deep understanding of OWASP Top 10 vulnerabilities and modern mitigation strategies",
      "Familiarity with compliance structures (SOC2, ISO 27001)"
    ],
    desired: [
      "Prior experience in fintech or secure payment gateway architectures",
      "Experience conducting automated penetration testing pipelines",
      "Strong analytical mind with quick incident-response execution"
    ],
    url: "https://jobs.lever.co/cred",
    careersUrl: "https://careers.cred.club"
  },
  {
    id: 5,
    title: "Backend Engineer",
    company: "Razorpay",
    location: "Bengaluru, India",
    ats: "greenhouse",
    matchScore: 91,
    type: "fulltime",
    qualifications: [
      "Proficiency in Go, Java, or Python for building high-throughput payment services",
      "Strong understanding of distributed systems and microservice patterns",
      "Experience with SQL/NoSQL databases at scale"
    ],
    desired: [
      "Familiarity with PCI-DSS compliance and payment gateway integrations",
      "Experience with event-driven architectures (Kafka, RabbitMQ)",
      "Prior fintech experience is a strong plus"
    ],
    url: "https://boards.greenhouse.io/razorpay",
    careersUrl: "https://razorpay.com/jobs"
  },
  {
    id: 6,
    title: "Platform Engineer",
    company: "Stripe",
    location: "Remote, India",
    ats: "greenhouse",
    matchScore: 96,
    type: "fulltime",
    qualifications: [
      "Strong experience building platform tools and developer-facing APIs",
      "Proficiency in Ruby, Go, or Java",
      "Deep understanding of cloud-native infrastructure and CI/CD"
    ],
    desired: [
      "Outstanding distributed systems design experience",
      "Passion for developer experience and API ergonomics",
      "Experience with financial infrastructure at scale"
    ],
    url: "https://boards.greenhouse.io/stripe",
    careersUrl: "https://stripe.com/jobs"
  },
  {
    id: 7,
    title: "Frontend Engineer Intern",
    company: "Notion",
    location: "Remote",
    ats: "greenhouse",
    matchScore: 89,
    type: "intern",
    qualifications: [
      "Pursuing BS/MS in Computer Science or equivalent",
      "Strong JavaScript/TypeScript and React fundamentals",
      "Passion for building productivity tools and knowledge management"
    ],
    desired: [
      "Experience with rich text editors or block-based UIs",
      "Interest in collaborative real-time applications",
      "Portfolio of personal projects demonstrating product thinking"
    ],
    url: "https://boards.greenhouse.io/notion",
    careersUrl: "https://www.notion.com/careers"
  },
  {
    id: 8,
    title: "Software Development Engineer",
    company: "Freshworks",
    location: "Bengaluru, India",
    ats: "greenhouse",
    matchScore: 87,
    type: "fulltime",
    qualifications: [
      "2+ years experience in full-stack web development",
      "Strong proficiency in Ruby on Rails or Node.js backend",
      "Experience with React or Angular frontend frameworks"
    ],
    desired: [
      "Experience building SaaS products at scale",
      "Familiarity with AWS/GCP cloud services",
      "Strong communication and collaboration skills"
    ],
    url: "https://boards.greenhouse.io/freshworks",
    careersUrl: "https://www.freshworks.com/company/careers"
  },
  {
    id: 9,
    title: "Mobile Engineer",
    company: "Swiggy",
    location: "Bengaluru, India",
    ats: "lever",
    matchScore: 83,
    type: "fulltime",
    qualifications: [
      "Strong experience in React Native or Flutter for cross-platform mobile apps",
      "Deep understanding of mobile performance optimization",
      "Experience with RESTful APIs and real-time data synchronization"
    ],
    desired: [
      "Knowledge of geolocation services and map integrations",
      "Experience with high-traffic consumer applications",
      "Familiarity with CI/CD for mobile release pipelines"
    ],
    url: "https://jobs.lever.co/swiggy",
    careersUrl: "https://careers.swiggy.com"
  },
  {
    id: 10,
    title: "DevOps Engineer",
    company: "Postman",
    location: "Bengaluru, India",
    ats: "greenhouse",
    matchScore: 86,
    type: "fulltime",
    qualifications: [
      "Strong experience with Kubernetes, Docker, and container orchestration",
      "Proficiency in Infrastructure as Code (Terraform, Pulumi)",
      "Experience with CI/CD pipelines and GitOps workflows"
    ],
    desired: [
      "Familiarity with monitoring stacks (Prometheus, Grafana, Datadog)",
      "Experience with multi-cloud deployments (AWS, GCP)",
      "Strong scripting skills in Python or Bash"
    ],
    url: "https://boards.greenhouse.io/postman",
    careersUrl: "https://www.postman.com/company/careers"
  },
  {
    id: 11,
    title: "Data Engineer",
    company: "PhonePe",
    location: "Bengaluru, India",
    ats: "greenhouse",
    matchScore: 85,
    type: "fulltime",
    qualifications: [
      "Proficiency in Python, Spark, and SQL for large-scale data processing",
      "Experience with data warehousing and ETL pipeline design",
      "Strong understanding of data modeling and schema design"
    ],
    desired: [
      "Experience with real-time streaming (Kafka, Flink)",
      "Familiarity with UPI/payments data infrastructure",
      "Knowledge of data governance and quality frameworks"
    ],
    url: "https://boards.greenhouse.io/phonepe",
    careersUrl: "https://www.phonepe.com/careers"
  },
  {
    id: 12,
    title: "Software Engineer",
    company: "Coinbase",
    location: "Remote",
    ats: "greenhouse",
    matchScore: 90,
    type: "fulltime",
    qualifications: [
      "Strong experience in Go, Python, or Java for backend services",
      "Understanding of blockchain fundamentals and cryptographic principles",
      "Experience with high-availability distributed systems"
    ],
    desired: [
      "Prior experience in Web3 or cryptocurrency platforms",
      "Familiarity with smart contract development (Solidity)",
      "Passion for decentralized finance and open financial systems"
    ],
    url: "https://boards.greenhouse.io/coinbase",
    careersUrl: "https://www.coinbase.com/careers"
  }
];

// Recruiter contacts for Outreach panel
const RECRUITERS = [
  { id: 1, name: "Rohini Sen", role: "Lead Talent Scout", company: "Enterpret", email: "rohini@enterpret.com", linkedin: "linkedin.com/in/rohini-sen-enterpret" },
  { id: 2, name: "David Miller", role: "Engineering Recruiter", company: "Figma", email: "david.m@figma.com", linkedin: "linkedin.com/in/david-figma-recruit" },
  { id: 3, name: "Sarah Jenkins", role: "Director of Talent Acquisition", company: "Vercel", email: "jenkins@vercel.com", linkedin: "linkedin.com/in/sarahj-vercel" },
  { id: 4, name: "Amit Sharma", role: "Talent Operations", company: "Cred", email: "amit.sharma@cred.club", linkedin: "linkedin.com/in/amit-cred-careers" }
];

// Mock inbound emails
const EMAILS_DATABASE = [
  {
    id: 1,
    sender: "Rohini Sen (Enterpret)",
    email: "rohini@enterpret.com",
    subject: "Interview Invitation: Software Engineer Intern",
    preview: "Hi Harsha, thanks for applying. We loved your projects...",
    body: "Hi Harsha,\n\nThanks for applying to the Software Engineer Intern role at Enterpret! We reviewed your profile and projects, and we'd love to schedule a 45-minute technical conversation with one of our lead engineers.\n\nPlease let us know your availability over the next few days.\n\nBest,\nRohini Sen",
    ats: "Greenhouse"
  },
  {
    id: 2,
    sender: "Figma Careers",
    email: "no-reply@figma.com",
    subject: "Application Received: Full Stack Engineer",
    preview: "Thank you for submitting your resume. We are currently...",
    body: "Hi Harsha,\n\nThis is to confirm that we have successfully received your application for the Full Stack Engineer position at Figma.\n\nOur recruiting team is reviewing profiles on a rolling basis. If your qualifications match our needs, we will reach out directly with next steps.\n\nRegards,\nFigma Talent Team",
    ats: "Lever"
  }
];

let activeJobs = [...SEED_JOBS];
let currentJobIndex = 0;
let currentTailoringMode = 'normal';
let selectedContactId = 1;
let selectedEmailId = 1;

// Drag and drop tracking for Swipe cards
let isDragging = false;
let startX = 0;
let currentX = 0;

// Kanban state loaded from localStorage or seeded
let pipeline = JSON.parse(localStorage.getItem('teak_pipeline')) || {
  saved: [SEED_JOBS[1]],
  applied: [SEED_JOBS[0]],
  interviewing: [],
  offer: []
};

// Base Resume Text
let BASE_RESUME = localStorage.getItem('teak_base_resume') || `HARSHA VARDHAN
Bengaluru, India | harsh.v9019@gmail.com

EDUCATION:
BE in Computer Science, NHCE (CGPA: 8.9/10) | Expected 2027

SKILLS:
- Languages: JavaScript, Python, C++, SQL
- Technologies: React.js, Node.js, Express, MongoDB, Git, Tailwind CSS, REST APIs
- Specialties: Software engineering, Web development, Problem solving

PROJECTS:
1. Job Board Web Platform
- Developed a web app using Node.js and React to search jobs.
- Implemented user accounts and saved applications list.
2. AI Document Scanner
- Built a Python script utilizing OCR to parse certificates and catalog them.`;

// Application Initialisation
document.addEventListener("DOMContentLoaded", () => {
  // Set values from localStorage
  document.getElementById("api-key-input").value = localStorage.getItem('teak_gemini_key') || '';
  document.getElementById("prof-resume").value = BASE_RESUME;

  // check active session
  const activeUser = JSON.parse(localStorage.getItem('teak_current_user'));
  if (activeUser) {
    loginUser(activeUser);
  } else {
    document.getElementById("auth-gateway").classList.remove("hidden");
  }

  // Dynamic sync
  renderJobCard();
  setupDragSwipe();
  renderKanban();
  renderOutreach();
  renderEmails();
  setupEventListeners();
  updateSearchFilters();
  setupNavigation();
});

let isSignUpMode = false;
let registeredUsers = JSON.parse(localStorage.getItem('teak_users')) || [
  { name: "Harsha Vardhan", email: "harsh.v9019@gmail.com", password: "password" }
];

function toggleAuthMode() {
  const usernameGroup = document.getElementById("username-group");
  const titleText = document.getElementById("auth-title-text");
  const subtitleText = document.getElementById("auth-subtitle-text");
  const submitBtn = document.getElementById("auth-submit-btn");
  const toggleBtn = document.getElementById("auth-toggle-btn");
  const switchText = document.getElementById("auth-switch-text");

  isSignUpMode = !isSignUpMode;

  if (isSignUpMode) {
    usernameGroup.style.display = "flex";
    titleText.innerText = "Create an account";
    subtitleText.innerText = "Start automating your job applications";
    submitBtn.innerText = "Sign Up";
    toggleBtn.innerText = "Sign In";
    switchText.innerText = "Already have an account?";
  } else {
    usernameGroup.style.display = "none";
    titleText.innerText = "Welcome back";
    subtitleText.innerText = "Log in to your automated AI dashboard";
    submitBtn.innerText = "Sign In";
    toggleBtn.innerText = "Create an account";
    switchText.innerText = "New to Teak?";
  }
}

function handleAuthSubmit() {
  const emailInput = document.getElementById("auth-email").value.trim().toLowerCase();
  const passwordInput = document.getElementById("auth-password").value.trim();
  const nameInput = document.getElementById("auth-username").value.trim() || "Harsha Vardhan";

  if (!emailInput || !passwordInput) {
    showNotification("Please fill in all credentials!");
    return;
  }

  if (isSignUpMode) {
    if (registeredUsers.some(u => u.email === emailInput)) {
      showNotification("Account with this email already exists!");
      return;
    }

    const newUser = { name: nameInput, email: emailInput, password: passwordInput };
    registeredUsers.push(newUser);
    localStorage.setItem('teak_users', JSON.stringify(registeredUsers));

    loginUser(newUser);
    showNotification("Account created successfully! 🌱");
  } else {
    const user = registeredUsers.find(u => u.email === emailInput);
    if (!user || user.password !== passwordInput) {
      showNotification("Invalid email or password!");
      return;
    }

    loginUser(user);
    showNotification("Welcome back!");
  }
}

function loginUser(user) {
  localStorage.setItem('teak_current_user', JSON.stringify(user));

  document.querySelector(".profile-name").innerText = user.name;
  document.querySelector(".profile-email").innerText = user.email;

  const initials = user.name.split(' ').map(n => n.charAt(0)).join('').toUpperCase().substring(0, 2);
  document.getElementById("user-avatar").innerText = initials || "US";

  document.getElementById("prof-name").value = user.name;
  document.getElementById("prof-email").value = user.email;

  document.getElementById("auth-gateway").classList.add("hidden");
}

function handleSignOut() {
  localStorage.removeItem('teak_current_user');
  document.getElementById("auth-gateway").classList.remove("hidden");

  document.getElementById("auth-email").value = "";
  document.getElementById("auth-password").value = "";
  document.getElementById("auth-username").value = "";
  if (isSignUpMode) toggleAuthMode();

  showNotification("Signed out successfully.");
}

// Navigation Controller
function setupNavigation() {
  const navItems = [
    { btn: 'nav-jobs', section: 'section-jobs' },
    { btn: 'nav-applications', section: 'section-applications' },
    { btn: 'nav-outreach', section: 'section-outreach' },
    { btn: 'nav-emails', section: 'section-emails' },
    { btn: 'nav-profile', section: 'section-profile' }
  ];

  navItems.forEach(item => {
    const el = document.getElementById(item.btn);
    if (el) {
      el.addEventListener('click', () => {
        // Toggle Active nav state
        navItems.forEach(n => document.getElementById(n.btn).classList.remove('active'));
        el.classList.add('active');

        // Toggle visibility of panels
        const sections = document.querySelectorAll('.page-section');
        sections.forEach(sec => {
          sec.classList.remove('active');
        });
        document.getElementById(item.section).classList.add('active');
        showNotification(`Switched to ${el.innerText} view`);
      });
    }
  });
}

// Render active card with stacking backdrops
function renderJobCard() {
  const cardContainer = document.getElementById("job-card");
  const emptyState = document.getElementById("empty-state");
  const back1 = document.querySelector(".stacked-card-back-1");
  const back2 = document.querySelector(".stacked-card-back-2");

  if (currentJobIndex >= activeJobs.length) {
    cardContainer.style.display = "none";
    emptyState.style.display = "flex";
    if (back1) back1.style.display = "none";
    if (back2) back2.style.display = "none";
    return;
  }

  cardContainer.style.display = "flex";
  emptyState.style.display = "none";
  if (back1) back1.style.display = "block";
  if (back2) back2.style.display = "block";

  const job = activeJobs[currentJobIndex];

  document.getElementById("company-logo-char").innerText = job.company.charAt(0);
  document.getElementById("job-title-display").innerText = job.title;
  document.getElementById("company-name-display").innerText = job.company;
  document.getElementById("ats-badge").innerText = job.ats;
  document.getElementById("match-score-display").innerText = `${job.matchScore}%`;
  document.getElementById("careers-link-btn").href = job.careersUrl || job.url;

  // Render Required Qualifications
  const reqContainer = document.getElementById("required-qualifications-list");
  reqContainer.innerHTML = "";
  job.qualifications.forEach(q => {
    const li = document.createElement("li");
    li.innerText = q;
    reqContainer.appendChild(li);
  });

  // Render Desired Qualifications
  const desContainer = document.getElementById("desired-qualifications-list");
  desContainer.innerHTML = "";
  job.desired.forEach(d => {
    const li = document.createElement("li");
    li.innerText = d;
    desContainer.appendChild(li);
  });

  // Dynamically update background stacking offset/scale
  cardContainer.style.transform = "none";
  cardContainer.style.opacity = "1";
}

// Drag swipe implementation for deck
function setupDragSwipe() {
  const card = document.getElementById("job-card");
  if (!card) return;

  const handleDragStart = (e) => {
    if (e.target.closest('button') || e.target.closest('a') || e.target.closest('textarea')) return;
    isDragging = true;
    startX = e.type === 'touchstart' ? e.touches[0].clientX : e.clientX;
    card.style.transition = "none";
  };

  const handleDragMove = (e) => {
    if (!isDragging) return;
    currentX = (e.type === 'touchmove' ? e.touches[0].clientX : e.clientX) - startX;

    // Rotate and scale on drag offset
    const rotation = currentX / 15;
    card.style.transform = `translateX(${currentX}px) rotate(${rotation}deg) scale(0.98)`;
  };

  const handleDragEnd = () => {
    if (!isDragging) return;
    isDragging = false;
    card.style.transition = "transform 0.3s ease, opacity 0.3s ease";

    if (currentX > 120) {
      // Right swipe = Apply
      performSwipe("apply");
    } else if (currentX < -120) {
      // Left swipe = Pass
      performSwipe("pass");
    } else {
      // Reset card position
      card.style.transform = "none";
    }
    currentX = 0;
  };

  card.addEventListener("mousedown", handleDragStart);
  document.addEventListener("mousemove", handleDragMove);
  document.addEventListener("mouseup", handleDragEnd);

  card.addEventListener("touchstart", handleDragStart, { passive: true });
  document.addEventListener("touchmove", handleDragMove, { passive: true });
  document.addEventListener("touchend", handleDragEnd);
}

// Swipe Actions Execution
function performSwipe(direction) {
  const card = document.getElementById("job-card");
  if (currentJobIndex >= activeJobs.length) return;
  const currentJob = activeJobs[currentJobIndex];

  if (direction === 'pass') {
    card.style.transform = "translateX(-200px) rotate(-15deg)";
    card.style.opacity = "0";
    showNotification("Job passed 👎");
  } else if (direction === 'apply') {
    card.style.transform = "translateX(200px) rotate(15deg)";
    card.style.opacity = "0";

    // Add to saved pipeline
    if (!pipeline.saved.some(j => j.id === currentJob.id)) {
      pipeline.saved.push(currentJob);
      savePipeline();
    }

    showNotification("Saved to Applications Grid! 👍");
    openAIPanel();
  } else if (direction === 'collapse') {
    card.style.transform = "scale(0.96)";
    setTimeout(() => {
      card.style.transform = "scale(1)";
    }, 150);
    openAIPanel();
    return;
  }

  setTimeout(() => {
    currentJobIndex++;
    renderJobCard();
  }, 250);
}

// Notification trigger
function showNotification(message) {
  const el = document.getElementById("toast-notification");
  el.innerText = message;
  el.classList.add("show");

  setTimeout(() => {
    el.classList.remove("show");
  }, 2000);
}

// Save pipeline state to local database cache
function savePipeline() {
  localStorage.setItem('teak_pipeline', JSON.stringify(pipeline));
  renderKanban();
}

// Render dynamic Kanban pipeline and hook up drag-n-drop API
function renderKanban() {
  const lanes = ['saved', 'applied', 'interviewing', 'offer'];

  lanes.forEach(lane => {
    const container = document.getElementById(`col-${lane}`);
    const badge = document.getElementById(`badge-${lane}`);
    if (!container) return;

    container.innerHTML = "";
    const list = pipeline[lane] || [];
    badge.innerText = list.length;

    list.forEach(job => {
      const card = document.createElement("div");
      card.className = "kanban-card";
      card.draggable = true;
      card.dataset.id = job.id;
      card.dataset.lane = lane;

      card.innerHTML = `
        <div class="kanban-card-title">${escapeHTML(job.title)}</div>
        <div class="kanban-card-company">${escapeHTML(job.company)} • <span style="font-size: 11px; text-transform: uppercase;">${escapeHTML(job.ats)}</span></div>
        <div style="margin-top: 4px; margin-bottom: 8px;">
          <a href="${escapeHTML(job.careersUrl || job.url)}" target="_blank" style="font-size: 11.5px; color: var(--color-accent); text-decoration: none; font-weight: 500;">Apply on Careers Page ↗</a>
        </div>
        <div class="kanban-card-footer">
          <span style="font-size: 11px; color: var(--color-orange); font-weight:600;">${escapeHTML(job.matchScore)}% Match</span>
          <button class="btn-utility tailor-btn" style="padding: 2px 6px; font-size:10.5px;">Tailor</button>
        </div>
      `;

      card.querySelector('.tailor-btn').addEventListener('click', () => {
        triggerDirectAITailor(job.id);
      });

      // Drag/Drop hooks
      card.addEventListener("dragstart", (e) => {
        e.dataTransfer.setData("text/plain", JSON.stringify({ jobId: job.id, fromLane: lane }));
        card.style.opacity = "0.5";
      });

      card.addEventListener("dragend", () => {
        card.style.opacity = "1";
      });

      container.appendChild(card);
    });

    // Hook drop listener
    const colParent = container.closest('.kanban-column');
    colParent.addEventListener("dragover", (e) => {
      e.preventDefault();
    });

    colParent.addEventListener("drop", (e) => {
      e.preventDefault();
      try {
        const { jobId, fromLane } = JSON.parse(e.dataTransfer.getData("text/plain"));
        const targetLane = colParent.dataset.status;

        if (fromLane !== targetLane) {
          // Move items
          const jobIdx = pipeline[fromLane].findIndex(j => j.id == jobId);
          if (jobIdx > -1) {
            const [job] = pipeline[fromLane].splice(jobIdx, 1);
            pipeline[targetLane].push(job);
            savePipeline();
            showNotification(`Job moved to ${targetLane.toUpperCase()}`);
          }
        }
      } catch (err) {
        console.error(err);
      }
    });
  });
}

// Trigger AI Panel from Kanban item directly
window.triggerDirectAITailor = function (jobId) {
  const allJobs = [...SEED_JOBS, ...(activeJobs || [])];
  const found = allJobs.find(j => j.id == jobId);
  if (found) {
    const mockIndex = activeJobs.findIndex(j => j.id == jobId);
    if (mockIndex > -1) currentJobIndex = mockIndex;
    openAIPanel();
  }
};

// Render Outreach lists
function renderOutreach() {
  const container = document.getElementById("contacts-list-container");
  if (!container) return;

  container.innerHTML = "";
  RECRUITERS.forEach(rec => {
    const el = document.createElement("div");
    el.className = `contact-item ${rec.id === selectedContactId ? 'active' : ''}`;
    el.innerHTML = `
      <div class="contact-name">${escapeHTML(rec.name)}</div>
      <div class="contact-role">${escapeHTML(rec.role)}</div>
      <div class="contact-company">${escapeHTML(rec.company)}</div>
    `;

    el.addEventListener("click", () => {
      selectedContactId = rec.id;
      renderOutreach();
      updateOutreachPanel();
    });

    container.appendChild(el);
  });

  updateOutreachPanel();
}

function updateOutreachPanel() {
  const rec = RECRUITERS.find(r => r.id === selectedContactId);
  if (!rec) return;

  document.getElementById("contact-detail-name").innerText = rec.name;
  document.getElementById("contact-detail-role").innerText = rec.role;
  document.getElementById("contact-detail-company").innerText = rec.company;
  document.getElementById("contact-avatar").innerText = rec.name.split(' ').map(n => n.charAt(0)).join('');
  document.getElementById("outreach-message-text").value = "";
}

// Render Emails sections
function renderEmails() {
  const container = document.getElementById("email-inbox-container");
  if (!container) return;

  container.innerHTML = "";
  EMAILS_DATABASE.forEach(mail => {
    const el = document.createElement("div");
    el.className = `email-item ${mail.id === selectedEmailId ? 'active' : ''}`;
    el.innerHTML = `
      <div class="email-sender">
        <span>${escapeHTML(mail.sender)}</span>
        <span style="font-size: 10px; color: var(--text-muted);">Today</span>
      </div>
      <div class="email-subject">${escapeHTML(mail.subject)}</div>
      <div class="email-preview">${escapeHTML(mail.preview)}</div>
    `;

    el.addEventListener("click", () => {
      selectedEmailId = mail.id;
      renderEmails();
      updateEmailPanel();
    });

    container.appendChild(el);
  });

  updateEmailPanel();
}

function updateEmailPanel() {
  const mail = EMAILS_DATABASE.find(m => m.id === selectedEmailId);
  if (!mail) return;

  document.getElementById("email-detail-subject").innerText = mail.subject;
  document.getElementById("email-detail-sender").innerText = mail.email;
  document.getElementById("email-detail-badge").innerText = mail.ats;
  document.getElementById("email-detail-body").innerText = mail.body;
  document.getElementById("email-reply-text").value = "";
}

// Search, query mapping, and Filter matrix calculations
function updateSearchFilters() {
  const titleQuery = document.getElementById("search-role-input").value.toLowerCase();
  const locQuery = document.getElementById("search-location-input").value.toLowerCase();

  const typeF = document.getElementById("filter-job-type").value;
  const atsF = document.getElementById("filter-ats").value;
  const scoreF = parseInt(document.getElementById("filter-match-score").value);
  const locTypeF = document.getElementById("filter-location-type").value;

  activeJobs = SEED_JOBS.filter(job => {
    const matchesTitle = job.title.toLowerCase().includes(titleQuery);
    const matchesLocation = job.location.toLowerCase().includes(locQuery);

    const matchesType = typeF === 'all' || job.type === typeF;
    const matchesAts = atsF === 'all' || job.ats === atsF;
    const matchesScore = job.matchScore >= scoreF;

    let matchesLocType = true;
    if (locTypeF === 'remote') {
      matchesLocType = job.location.toLowerCase().includes('remote');
    } else if (locTypeF === 'bengaluru') {
      matchesLocType = job.location.toLowerCase().includes('bengaluru');
    }

    return matchesTitle && matchesLocation && matchesType && matchesAts && matchesScore && matchesLocType;
  });

  currentJobIndex = 0;
  renderJobCard();

  // Calculate filters active count
  let count = 0;
  if (typeF !== 'all') count++;
  if (atsF !== 'all') count++;
  if (scoreF > 50) count++;
  if (locTypeF !== 'all') count++;

  document.getElementById("filter-badge-count").innerText = count;
}

// Scraper simulation grid loader
function runManualScraper() {
  const overlay = document.getElementById("scraper-log-overlay");
  const logBody = document.getElementById("scraper-log-body");

  overlay.style.display = "flex";
  logBody.innerHTML = "";

  const addLine = (text, type = "info") => {
    const p = document.createElement("p");
    p.className = `terminal-line ${type}`;
    p.innerText = `[${new Date().toLocaleTimeString()}] ${text}`;
    logBody.appendChild(p);
    logBody.scrollTop = logBody.scrollHeight;
  };

  addLine("Initializing Bulk Scraper Core...", "system");
  addLine("Scanning 40 companies from seed database (30-day window)...", "info");

  const targetCompanies = [
    { name: "Canva", ats: "greenhouse", slug: "canva", careersUrl: "https://www.canva.com/careers" },
    { name: "Atlassian", ats: "greenhouse", slug: "atlassian", careersUrl: "https://www.atlassian.com/company/careers" },
    { name: "Shopify", ats: "greenhouse", slug: "shopify", careersUrl: "https://www.shopify.com/careers" },
    { name: "Cloudflare", ats: "greenhouse", slug: "cloudflare", careersUrl: "https://www.cloudflare.com/careers" },
    { name: "MongoDB", ats: "greenhouse", slug: "mongodb", careersUrl: "https://www.mongodb.com/company/careers" },
    { name: "Supabase", ats: "greenhouse", slug: "supabase", careersUrl: "https://supabase.com/careers" },
    { name: "GitLab", ats: "greenhouse", slug: "gitlab", careersUrl: "https://about.gitlab.com/jobs" },
    { name: "Rippling", ats: "greenhouse", slug: "rippling", careersUrl: "https://www.rippling.com/careers" },
    { name: "Datadog", ats: "greenhouse", slug: "datadoghq", careersUrl: "https://careers.datadoghq.com" },
    { name: "Rubrik", ats: "greenhouse", slug: "rubrik", careersUrl: "https://www.rubrik.com/company/careers" }
  ];

  let i = 0;
  const interval = setInterval(() => {
    if (i < targetCompanies.length) {
      const c = targetCompanies[i];
      addLine(`Accessing ${c.name} endpoints via ${c.ats.toUpperCase()} parser...`, "info");
      const found = Math.floor(Math.random() * 3) + 1;
      addLine(`-> Found ${found} tech roles posted within 30 days.`, "system");
      i++;
    } else {
      clearInterval(interval);
      addLine("========================================", "system");
      addLine(`Scraper batch complete! Filtered 8 matching roles from ${targetCompanies.length} companies.`, "system");

      const newJobs = [
        {
          id: 101,
          title: "Product Engineer",
          company: "Canva",
          location: "Bengaluru, India",
          ats: "greenhouse",
          matchScore: 90,
          type: "fulltime",
          qualifications: ["Proficient in frontend systems and design patterns", "Strong React/TypeScript experience"],
          desired: ["Great graphics and design tool experience", "WebGL or Canvas API knowledge"],
          url: "https://boards.greenhouse.io/canva",
          careersUrl: "https://www.canva.com/careers"
        },
        {
          id: 102,
          title: "Senior Site Reliability Engineer",
          company: "Atlassian",
          location: "Bengaluru, India",
          ats: "greenhouse",
          matchScore: 88,
          type: "fulltime",
          qualifications: ["5+ years in SRE or infrastructure roles", "Expert-level Kubernetes and Terraform"],
          desired: ["Experience with Jira/Confluence platform internals"],
          url: "https://boards.greenhouse.io/atlassian",
          careersUrl: "https://www.atlassian.com/company/careers"
        },
        {
          id: 103,
          title: "Full Stack Developer Intern",
          company: "Shopify",
          location: "Remote",
          ats: "greenhouse",
          matchScore: 91,
          type: "intern",
          qualifications: ["Pursuing CS degree", "Familiarity with Ruby on Rails and React"],
          desired: ["Interest in e-commerce and merchant tools"],
          url: "https://boards.greenhouse.io/shopify",
          careersUrl: "https://www.shopify.com/careers"
        },
        {
          id: 104,
          title: "Systems Engineer",
          company: "Cloudflare",
          location: "Remote, India",
          ats: "greenhouse",
          matchScore: 93,
          type: "fulltime",
          qualifications: ["Strong C/C++ or Rust for systems programming", "Networking and HTTP protocol expertise"],
          desired: ["Experience with edge computing or CDN systems"],
          url: "https://boards.greenhouse.io/cloudflare",
          careersUrl: "https://www.cloudflare.com/careers"
        },
        {
          id: 105,
          title: "Database Engineer",
          company: "MongoDB",
          location: "Bengaluru, India",
          ats: "greenhouse",
          matchScore: 87,
          type: "fulltime",
          qualifications: ["Deep expertise in database internals and storage engines", "C++ or Go proficiency"],
          desired: ["Experience with distributed consensus algorithms (Raft, Paxos)"],
          url: "https://boards.greenhouse.io/mongodb",
          careersUrl: "https://www.mongodb.com/company/careers"
        },
        {
          id: 106,
          title: "Backend Developer",
          company: "Supabase",
          location: "Remote",
          ats: "greenhouse",
          matchScore: 94,
          type: "fulltime",
          qualifications: ["Strong PostgreSQL and TypeScript/Node.js skills", "Open-source contribution experience"],
          desired: ["Experience with real-time subscriptions and auth systems"],
          url: "https://boards.greenhouse.io/supabase",
          careersUrl: "https://supabase.com/careers"
        },
        {
          id: 107,
          title: "Frontend Engineer",
          company: "GitLab",
          location: "Remote",
          ats: "greenhouse",
          matchScore: 89,
          type: "fulltime",
          qualifications: ["Vue.js or React expertise", "Experience building developer-facing tools"],
          desired: ["Familiarity with CI/CD pipelines and DevOps workflows"],
          url: "https://boards.greenhouse.io/gitlab",
          careersUrl: "https://about.gitlab.com/jobs"
        },
        {
          id: 108,
          title: "Software Engineer",
          company: "Rippling",
          location: "Bengaluru, India",
          ats: "greenhouse",
          matchScore: 92,
          type: "fulltime",
          qualifications: ["Full-stack proficiency with Python/Django and React", "Strong system design skills"],
          desired: ["Experience with HR/payroll SaaS products", "AWS/GCP cloud experience"],
          url: "https://boards.greenhouse.io/rippling",
          careersUrl: "https://www.rippling.com/careers"
        }
      ];

      activeJobs = [...SEED_JOBS, ...newJobs];
      currentJobIndex = 0;
      renderJobCard();
      updateSearchFilters();

      setTimeout(() => {
        overlay.style.display = "none";
        showNotification(`Refreshed! Deck now has ${activeJobs.length} jobs from ${targetCompanies.length + 10} companies.`);
      }, 1200);
    }
  }, 400);
}

// AI Panel control matrix
function openAIPanel() {
  const panel = document.getElementById("ai-panel");
  panel.classList.add("open");

  const job = activeJobs[currentJobIndex] || SEED_JOBS[0];
  document.getElementById("target-job-label").innerText = `${job.title} at ${job.company}`;
  document.getElementById("base-resume-input").value = BASE_RESUME;

  // Animate ATS Score index
  animateATSScore(job.matchScore);

  // Show keyword gaps
  const keywordGapWrapper = document.getElementById("keyword-gap-wrapper");
  const keywordChipsContainer = document.getElementById("keyword-chips-container");

  keywordGapWrapper.style.display = "flex";
  keywordChipsContainer.innerHTML = "";

  // Render mock comparison chips
  const matched = job.qualifications.map(q => q.split(' ')[0]);
  const missing = job.desired.map(d => d.split(' ')[0]);

  matched.slice(0, 3).forEach(kw => {
    const chip = document.createElement("span");
    chip.className = "keyword-chip matched";
    chip.innerText = `✓ ${kw}`;
    keywordChipsContainer.appendChild(chip);
  });

  missing.slice(0, 3).forEach(kw => {
    const chip = document.createElement("span");
    chip.className = "keyword-chip missing";
    chip.innerText = `✗ ${kw}`;
    keywordChipsContainer.appendChild(chip);
  });
}

function animateATSScore(targetScore) {
  const ringFill = document.getElementById("ats-score-circle");
  const scoreText = document.getElementById("ats-score-text");

  // Radial perimeter = 2 * PI * r = 2 * 3.14159 * 30 = 188.4
  const perimeter = 188.4;
  const offset = perimeter - (targetScore / 100) * perimeter;

  ringFill.style.strokeDashoffset = offset;

  // Count up text
  let count = 0;
  const countInterval = setInterval(() => {
    if (count >= targetScore) {
      clearInterval(countInterval);
      scoreText.innerText = `${targetScore}%`;
    } else {
      count++;
      scoreText.innerText = `${count}%`;
    }
  }, 10);
}

function closeAIPanel() {
  document.getElementById("ai-panel").classList.remove("open");
}

// ============================================================
//  AI Backend Integration — calls Python Flask server
// ============================================================

/**
 * Generic helper to call the Python AI backend.
 * @param {string} endpoint - e.g. '/api/tailor'
 * @param {object} payload  - JSON body to send
 * @returns {Promise<{text: string, provider: string}>}
 */
async function callAIBackend(endpoint, payload) {
  const response = await fetch(`${AI_SERVER_URL}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(errData.error || `Server error ${response.status}`);
  }

  const data = await response.json();
  if (!data.success) throw new Error(data.error || 'AI generation failed');
  return data;
}

/**
 * Check which AI providers are available on the backend.
 */
async function checkAIHealth() {
  try {
    const resp = await fetch(`${AI_SERVER_URL}/api/health`);
    return await resp.json();
  } catch {
    return null;
  }
}

// Trigger tailor sequences — routes through Python AI backend
async function startResumeTailoring() {
  const job = activeJobs[currentJobIndex] || SEED_JOBS[0];
  const consoleEl = document.getElementById("ai-console");
  const baseResume = document.getElementById("base-resume-input").value;

  consoleEl.innerHTML = "";
  const addConsoleLine = (text, type = "system") => {
    const p = document.createElement("p");
    p.className = `terminal-line ${type}`;
    p.innerText = text;
    consoleEl.appendChild(p);
    consoleEl.scrollTop = consoleEl.scrollHeight;
  };

  addConsoleLine("Initializing AI backend connection...", "system");

  const isCoverLetter = currentTailoringMode === 'heavy';
  const mode = isCoverLetter ? 'cover_letter' : 'resume';

  addConsoleLine(`Sending ${mode} tailoring request for ${job.title} at ${job.company}...`, "system");
  addConsoleLine("Provider cascade: Gemini → HuggingFace → Ollama → Simulator", "system");

  try {
    const result = await callAIBackend('/api/tailor', {
      job: {
        title: job.title,
        company: job.company,
        qualifications: job.qualifications,
        desired: job.desired,
      },
      baseResume,
      mode,
    });

    addConsoleLine(`✅ Generation complete via ${result.provider.toUpperCase()}!`, "system");
    document.getElementById("tab-original-content").innerText = baseResume;
    document.getElementById("tab-optimized-content").innerText = result.text;
    showNotification(`Tailoring succeeded via ${result.provider}! 🚀`);
  } catch (err) {
    addConsoleLine(`Backend error: ${err.message}`, "system");
    addConsoleLine("All AI providers failed. Falling back to local simulator...", "system");
    runSimulatorFallback(job, baseResume, isCoverLetter, addConsoleLine);
  }
}

function runSimulatorFallback(job, baseResume, isCoverLetter, addConsoleLine) {
  setTimeout(() => {
    addConsoleLine(`Extracting coordinates matching target ATS: ${job.ats}...`, "system");
    setTimeout(() => {
      addConsoleLine(`Normalizing keyword density filters...`, "system");
      setTimeout(() => {
        addConsoleLine(`Finalizing document formatting matrices...`, "system");

        let output = "";
        if (isCoverLetter) {
          output = `Dear Hiring Manager at ${job.company},

I am writing to express my strong interest in the ${job.title} position at your esteemed organization. With my background pursuing a BE in Computer Science and my skills in JavaScript, React, and Node.js, I am highly confident in my capacity to contribute value immediately.

I have engineered responsive web dashboards and built automated scanners that align well with your tech stack. I look forward to the prospect of meeting with your engineering team.

Sincerely,
Harsha Vardhan`;
        } else {
          output = `HARSHA VARDHAN
Bengaluru, India | harsh.v9019@gmail.com

EDUCATION:
BE in Computer Science, NHCE (CGPA: 8.9/10) | Expected 2027

SKILLSMatrix (Optimized for ${job.company}):
- Languages: JavaScript (ES6+), Python, C++, SQL
- Technologies: React.js, Node.js, Express, MongoDB, Git, Tailwind CSS, REST APIs, AWS Cloud basics
- Methodologies: Pair Programming, Agile Development, SDLC

EXPERIENCE & SELECTED PROJECTS:
1. High-Performance Job Board Dashboard (${job.company} Target Optimized)
- Engineered scalable backend routes in Node.js and interactive client grids using React.
- Designed schema layouts to handle user sessions safely.
2. AI-Powered OCR Scanner
- Programmed high-fidelity Python parsing scripts using OCR classifiers to catalog credentials.`;
        }

        document.getElementById("tab-original-content").innerText = baseResume;
        document.getElementById("tab-optimized-content").innerText = output;
        showNotification("Simulator tailoring completed successfully! ⚡");
      }, 600);
    }, 600);
  }, 600);
}

// Download tailored file
function downloadOptimizedResume() {
  const content = document.getElementById("tab-optimized-content").innerText;
  const fileName = currentTailoringMode === 'heavy' ? 'cover-letter.md' : 'tailored-resume.md';

  const blob = new Blob([content], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  showNotification("Tailored artifact downloaded successfully!");
}

// Setup Event listeners
function setupEventListeners() {
  // Swipe controls
  document.getElementById("swipe-pass").addEventListener("click", () => performSwipe("pass"));
  document.getElementById("swipe-collapse").addEventListener("click", () => performSwipe("collapse"));
  document.getElementById("swipe-apply").addEventListener("click", () => performSwipe("apply"));

  // Search inputs
  document.getElementById("search-role-input").addEventListener("input", updateSearchFilters);
  document.getElementById("search-location-input").addEventListener("input", updateSearchFilters);

  // Scraper manual control
  document.getElementById("trigger-scraper-btn").addEventListener("click", runManualScraper);
  document.getElementById("close-scraper-btn").addEventListener("click", () => {
    document.getElementById("scraper-log-overlay").style.display = "none";
  });

  // AI Panel tabs & control triggers
  document.getElementById("close-ai-panel").addEventListener("click", closeAIPanel);
  document.getElementById("mode-normal").addEventListener("click", () => {
    currentTailoringMode = 'normal';
    document.getElementById("mode-normal").classList.add("active");
    document.getElementById("mode-heavy").classList.remove("active");
  });

  document.getElementById("mode-heavy").addEventListener("click", () => {
    currentTailoringMode = 'heavy';
    document.getElementById("mode-heavy").classList.add("active");
    document.getElementById("mode-normal").classList.remove("active");
  });

  document.getElementById("trigger-tailor-btn").addEventListener("click", startResumeTailoring);
  document.getElementById("download-resume-btn").addEventListener("click", downloadOptimizedResume);

  document.getElementById("tab-orig").addEventListener("click", () => {
    document.getElementById("tab-orig").classList.add("active");
    document.getElementById("tab-opt").classList.remove("active");
    document.getElementById("tab-original-content").style.display = "block";
    document.getElementById("tab-optimized-content").style.display = "none";
  });

  document.getElementById("tab-opt").addEventListener("click", () => {
    document.getElementById("tab-opt").classList.add("active");
    document.getElementById("tab-orig").classList.remove("active");
    document.getElementById("tab-original-content").style.display = "none";
    document.getElementById("tab-optimized-content").style.display = "block";
  });

  // Profiles settings
  document.getElementById("btn-save-profile").addEventListener("click", () => {
    BASE_RESUME = document.getElementById("prof-resume").value;
    localStorage.setItem('teak_base_resume', BASE_RESUME);

    // Save profile metadata
    document.querySelector(".profile-name").innerText = document.getElementById("prof-name").value;
    document.querySelector(".profile-email").innerText = document.getElementById("prof-email").value;

    showNotification("Profile database cached! 🌱");
  });

  // API settings
  document.getElementById("btn-save-api-key").addEventListener("click", () => {
    const key = document.getElementById("api-key-input").value.trim();
    localStorage.setItem('teak_gemini_key', key);
    showNotification("Gemini API key configured successfully!");
  });

  document.getElementById("btn-clear-api-key").addEventListener("click", () => {
    localStorage.removeItem('teak_gemini_key');
    document.getElementById("api-key-input").value = "";
    showNotification("API key cleared.");
  });

  // Filter Modal Controls
  document.getElementById("open-filters-btn").addEventListener("click", () => {
    document.getElementById("filters-modal").classList.add("open");
  });

  document.getElementById("close-filters-btn-modal").addEventListener("click", () => {
    document.getElementById("filters-modal").classList.remove("open");
  });

  document.getElementById("filter-match-score").addEventListener("input", (e) => {
    document.getElementById("filter-match-score-val").innerText = `${e.target.value}%`;
  });

  document.getElementById("btn-reset-filters").addEventListener("click", () => {
    document.getElementById("filter-job-type").value = "all";
    document.getElementById("filter-ats").value = "all";
    document.getElementById("filter-match-score").value = "50";
    document.getElementById("filter-match-score-val").innerText = "50%";
    document.getElementById("filter-location-type").value = "all";
    updateSearchFilters();
    showNotification("Filters cleared.");
  });

  document.getElementById("btn-apply-filters").addEventListener("click", () => {
    updateSearchFilters();
    document.getElementById("filters-modal").classList.remove("open");
    showNotification("Search index filters applied.");
  });

  // Keyboard triggers
  document.addEventListener("keydown", (e) => {
    if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') {
      return;
    }

    if (e.key === "ArrowLeft") {
      performSwipe("pass");
    } else if (e.key === "ArrowRight") {
      performSwipe("apply");
    } else if (e.key === " ") {
      e.preventDefault();
      performSwipe("collapse");
    }
  });

  // Outreach triggers — routed through Python AI backend
  document.getElementById("btn-generate-outreach").addEventListener("click", async () => {
    const rec = RECRUITERS.find(r => r.id === selectedContactId);
    if (!rec) return;
    const txtArea = document.getElementById("outreach-message-text");
    txtArea.value = "Drafting outreach message via AI backend...";

    try {
      const result = await callAIBackend('/api/outreach', {
        recruiter: { name: rec.name, role: rec.role, company: rec.company },
      });
      txtArea.value = result.text;
      showNotification(`LinkedIn DM generated via ${result.provider}!`);
    } catch (err) {
      showNotification("AI backend unavailable. Using simulator template.");
      generateSimulatorOutreach(rec, txtArea);
    }
  });

  document.getElementById("btn-copy-outreach").addEventListener("click", () => {
    const txt = document.getElementById("outreach-message-text").value;
    if (txt) {
      navigator.clipboard.writeText(txt);
      showNotification("Outreach message copied to clipboard!");
    }
  });

  document.getElementById("btn-send-outreach").addEventListener("click", () => {
    const rec = RECRUITERS.find(r => r.id === selectedContactId);
    if (rec) {
      window.open(`https://${rec.linkedin}`, '_blank');
    }
  });

  // Email replies triggers — routed through Python AI backend
  document.getElementById("btn-generate-email-reply").addEventListener("click", async () => {
    const mail = EMAILS_DATABASE.find(m => m.id === selectedEmailId);
    if (!mail) return;
    const intent = document.getElementById("email-reply-intent").value;
    const txtArea = document.getElementById("email-reply-text");
    txtArea.value = "Drafting reply via AI backend...";

    try {
      const result = await callAIBackend('/api/email-reply', {
        email: { sender: mail.sender, body: mail.body, subject: mail.subject },
        intent,
      });
      txtArea.value = result.text;
      showNotification(`Email reply generated via ${result.provider}!`);
    } catch (err) {
      showNotification("AI backend unavailable. Using simulator template.");
      generateSimulatorReply(mail, intent, txtArea);
    }
  });

  document.getElementById("btn-copy-email-reply").addEventListener("click", () => {
    const txt = document.getElementById("email-reply-text").value;
    if (txt) {
      navigator.clipboard.writeText(txt);
      showNotification("Reply copied to clipboard!");
    }
  });

  // Auth gate setup
  document.getElementById("auth-submit-btn").addEventListener("click", handleAuthSubmit);
  document.getElementById("auth-toggle-btn").addEventListener("click", (e) => {
    e.preventDefault();
    toggleAuthMode();
  });
  document.getElementById("nav-logout").addEventListener("click", handleSignOut);
}

function generateSimulatorOutreach(rec, txtArea) {
  setTimeout(() => {
    txtArea.value = `Hi ${rec.name.split(' ')[0]},\n\nI noticed you manage hiring at ${rec.company}. I'm pursuing my CS degree with hands-on projects built in React and Node.js. I'd love to connect and share my background for any upcoming Software Engineer opportunities!\n\nBest,\nHarsha Vardhan`;
    showNotification("Simulator outreach template loaded.");
  }, 400);
}

function generateSimulatorReply(mail, intent, txtArea) {
  setTimeout(() => {
    if (intent === 'accept-interview') {
      txtArea.value = `Hi Rohini,\n\nThank you for reaching out! I would love to schedule a technical chat. I am generally free on weekday afternoons (2 PM - 5 PM IST).\n\nBest regards,\nHarsha Vardhan`;
    } else if (intent === 'follow-up-status') {
      txtArea.value = `Hi Team,\n\nI wanted to follow up on the status of my application for the Software Engineer Intern role. Please let me know if you need any additional information.\n\nBest regards,\nHarsha Vardhan`;
    } else {
      txtArea.value = `Hi Rohini,\n\nThank you for the update. I appreciate your team's time in reviewing my profile.\n\nBest regards,\nHarsha Vardhan`;
    }
    showNotification("Simulator reply template loaded.");
  }, 400);
}
