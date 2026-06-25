"""
Teak AI Server — Flask backend for all AI-powered features.
Supports: Hugging Face open-source models and local Ollama.
The frontend calls these endpoints instead of making direct API calls from the browser.
"""

import os
import json
import re
import requests
from html import unescape
from datetime import datetime, timedelta, timezone
# pyrefly: ignore [missing-import]
from flask import Flask, request, jsonify
from flask_cors import CORS
# pyrefly: ignore [missing-import]
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

app = Flask(__name__)
CORS(app, origins="*")

# ---------------------------------------------------------------------------
# Configuration — loaded from environment variables
# ---------------------------------------------------------------------------
HF_API_TOKEN = os.getenv("HF_API_TOKEN", "")  # Hugging Face token (optional, increases rate limits)
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
HF_MODEL = os.getenv("HF_MODEL", "mistralai/Mistral-7B-Instruct-v0.3")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3")


# ===================================================================
#  LLM Provider Implementations
# ===================================================================

# generate_with_gemini removed because context window is too small


def generate_with_huggingface(prompt: str) -> str:
    """Call Hugging Face OpenAI-compatible Chat Completions API."""
    url = "https://router.huggingface.co/v1/chat/completions"
    headers = {"Content-Type": "application/json"}
    if HF_API_TOKEN:
        headers["Authorization"] = f"Bearer {HF_API_TOKEN}"

    payload = {
        "model": HF_MODEL,
        "messages": [
            {"role": "user", "content": prompt}
        ],
        "max_tokens": 1500,
        "temperature": 0.7,
    }
    resp = requests.post(url, json=payload, headers=headers, timeout=120)

    if not resp.ok:
        raise RuntimeError(f"HuggingFace API {resp.status_code}: {resp.text[:300]}")

    data = resp.json()
    if "choices" in data and len(data["choices"]) > 0:
        text = data["choices"][0]["message"]["content"]
    else:
        raise RuntimeError(f"HuggingFace returned unexpected format: {data}")

    if not text:
        raise RuntimeError("HuggingFace returned empty response")

    return text


def generate_with_ollama(prompt: str) -> str:
    """Call a local Ollama instance for fully offline generation."""
    url = f"{OLLAMA_BASE_URL}/api/generate"
    payload = {
        "model": OLLAMA_MODEL,
        "prompt": prompt,
        "stream": False,
    }
    try:
        resp = requests.post(url, json=payload, timeout=120)
    except requests.ConnectionError:
        raise RuntimeError("Ollama not running — start it with `ollama serve`")

    if not resp.ok:
        raise RuntimeError(f"Ollama {resp.status_code}: {resp.text[:300]}")

    data = resp.json()
    text = data.get("response", "")
    if not text:
        raise RuntimeError("Ollama returned empty response")
    return text


def chat_with_huggingface(messages: list) -> str:
    """Call Hugging Face OpenAI-compatible Chat Completions API with conversational history."""
    url = "https://router.huggingface.co/v1/chat/completions"
    headers = {"Content-Type": "application/json"}
    if HF_API_TOKEN:
        headers["Authorization"] = f"Bearer {HF_API_TOKEN}"

    payload = {
        "model": HF_MODEL,
        "messages": messages,
        "max_tokens": 1500,
        "temperature": 0.7,
    }
    resp = requests.post(url, json=payload, headers=headers, timeout=120)

    if not resp.ok:
        raise RuntimeError(f"HuggingFace API {resp.status_code}: {resp.text[:300]}")

    data = resp.json()
    if "choices" in data and len(data["choices"]) > 0:
        text = data["choices"][0]["message"]["content"]
    else:
        raise RuntimeError(f"HuggingFace returned unexpected format: {data}")

    if not text:
        raise RuntimeError("HuggingFace returned empty response")

    return text


def chat_with_ollama(messages: list) -> str:
    """Call a local Ollama instance for fully offline chat generation."""
    url = f"{OLLAMA_BASE_URL}/api/chat"
    payload = {
        "model": OLLAMA_MODEL,
        "messages": messages,
        "stream": False,
    }
    try:
        resp = requests.post(url, json=payload, timeout=120)
    except requests.ConnectionError:
        raise RuntimeError("Ollama not running — start it with `ollama serve`")

    if not resp.ok:
        raise RuntimeError(f"Ollama {resp.status_code}: {resp.text[:300]}")

    data = resp.json()
    text = data.get("message", {}).get("content", "")
    if not text:
        raise RuntimeError("Ollama returned empty response")
    return text


# ===================================================================
#  Unified generation with automatic provider cascade
# ===================================================================

# Priority order: HuggingFace → Ollama
PROVIDERS = [
    ("huggingface", generate_with_huggingface),
    ("ollama", generate_with_ollama),
]

CHAT_PROVIDERS = [
    ("huggingface", chat_with_huggingface),
    ("ollama", chat_with_ollama),
]


def generate_text(prompt: str, preferred_provider: str | None = None) -> dict:
    """
    Try providers in cascade order. If `preferred_provider` is specified,
    try it first before falling through the default chain.
    Returns {"text": ..., "provider": ...} on success.
    """
    errors = {}

    # Build ordered provider list — preferred one goes first
    ordered = list(PROVIDERS)
    if preferred_provider:
        ordered.sort(key=lambda p: 0 if p[0] == preferred_provider else 1)

    for name, fn in ordered:
        try:
            result = fn(prompt)
            return {"text": result, "provider": name}
        except Exception as e:
            errors[name] = str(e)

    # All providers failed
    raise RuntimeError(json.dumps(errors))


def chat_text(messages: list, preferred_provider: str | None = None) -> dict:
    """
    Try providers in cascade order for conversational chat history.
    Returns {"text": ..., "provider": ...} on success.
    """
    errors = {}

    # Build ordered provider list — preferred one goes first
    ordered = list(CHAT_PROVIDERS)
    if preferred_provider:
        ordered.sort(key=lambda p: 0 if p[0] == preferred_provider else 1)

    for name, fn in ordered:
        try:
            result = fn(messages)
            return {"text": result, "provider": name}
        except Exception as e:
            errors[name] = str(e)

    # All providers failed
    raise RuntimeError(json.dumps(errors))


# ===================================================================
#  Prompt builders
# ===================================================================

def build_tailor_prompt(job: dict, base_resume: str, mode: str) -> str:
    """Build a resume-tailoring or cover-letter prompt."""
    qualifications = "\n".join(f"- {q}" for q in job.get("qualifications", []))
    desired = "\n".join(f"- {d}" for d in job.get("desired", []))

    if mode == "cover_letter":
        return (
            f"Write a highly tailored professional cover letter for a candidate "
            f'applying for the role of "{job["title"]}" at "{job["company"]}".\n\n'
            f"Use the base candidate profile below:\n\n{base_resume}\n\n"
            f"Required qualifications:\n{qualifications}\n\n"
            f"Desired qualifications:\n{desired}\n\n"
            f"Guidelines:\n"
            f"- Address to the hiring manager\n"
            f"- Highlight relevant skills and projects\n"
            f"- Keep it concise (under 350 words)\n"
            f"- Sound authentic, not generic\n"
            f"- IMPORTANT: Output PLAIN TEXT ONLY. Do NOT use any markdown formatting such as asterisks (*), hash symbols (#), bold (**), italic (_), or any other special formatting characters. Use only plain text with line breaks and dashes for lists."
        )
    else:
        return (
            f"Optimize the following resume/profile to perfectly match the ATS "
            f'requirements for "{job["title"]}" at "{job["company"]}".\n\n'
            f"Base resume:\n\n{base_resume}\n\n"
            f"ATS Requirements:\n{qualifications}\n\n"
            f"Desired qualifications:\n{desired}\n\n"
            f"Guidelines:\n"
            f"- Keep it professional and concise\n"
            f"- Rewrite project descriptions to emphasize relevant skills\n"
            f"- Retain education details\n"
            f"- Add missing keywords naturally\n"
            f"- IMPORTANT: Output PLAIN TEXT ONLY. Do NOT use any markdown formatting such as asterisks (*), hash symbols (#), bold (**), italic (_), or any other special formatting characters. Use only plain text with line breaks and dashes for lists."
        )


def build_outreach_prompt(recruiter: dict) -> str:
    """Build a LinkedIn outreach message prompt."""
    return (
        f'Draft a concise, high-converting LinkedIn message from a software '
        f'engineering candidate to {recruiter["name"]}, who is the '
        f'{recruiter["role"]} at {recruiter["company"]}.\n\n'
        f"Context:\n"
        f"- The candidate is Harsha Vardhan, a CS student with skills in "
        f"JavaScript, React, Node.js, Python, and full-stack development.\n"
        f"- The message should express genuine interest in engineering roles.\n"
        f"- Keep it under 100 words, warm but professional.\n"
        f"- Don't be generic — reference the company specifically."
    )


def build_email_reply_prompt(email: dict, intent: str) -> str:
    """Build an email reply prompt."""
    intent_descriptions = {
        "accept-interview": "Accept the interview invitation and propose available time slots",
        "follow-up-status": "Politely follow up on the application status",
        "thank-you": "Send a sincere thank-you note",
    }
    intent_text = intent_descriptions.get(intent, intent)

    return (
        f'Draft a professional email reply to {email["sender"]} '
        f"responding to their message:\n\n"
        f'"{email["body"]}"\n\n'
        f"Intent: {intent_text}\n"
        f"Sign off as Harsha Vardhan.\n"
        f"Keep the tone professional but warm. Be concise."
    )


# ===================================================================
#  API Endpoints
# ===================================================================

@app.route("/api/health", methods=["GET"])
def health_check():
    """Health check — also reports which providers are configured."""
    providers_status = {
        "huggingface": True,  # works without token (lower rate limit)
        "ollama": False,
    }
    # Quick-check Ollama availability
    try:
        r = requests.get(f"{OLLAMA_BASE_URL}/api/tags", timeout=2)
        providers_status["ollama"] = r.ok
    except Exception:
        pass

    return jsonify({
        "status": "ok",
        "providers": providers_status,
        "hf_model": HF_MODEL,
        "ollama_model": OLLAMA_MODEL,
    })


@app.route("/api/tailor", methods=["POST"])
def tailor_resume():
    """Tailor a resume or generate a cover letter for a specific job."""
    data = request.get_json(force=True)
    job = data.get("job", {})
    base_resume = data.get("baseResume", "")
    mode = data.get("mode", "resume")  # "resume" or "cover_letter"
    provider = data.get("provider")  # optional preferred provider

    if not job or not base_resume:
        return jsonify({"error": "Missing job or baseResume"}), 400

    prompt = build_tailor_prompt(job, base_resume, mode)

    try:
        result = generate_text(prompt, preferred_provider=provider)
        return jsonify({"success": True, **result})
    except RuntimeError as e:
        return jsonify({"success": False, "error": str(e)}), 502


@app.route("/api/outreach", methods=["POST"])
def generate_outreach():
    """Generate a LinkedIn outreach message for a recruiter."""
    data = request.get_json(force=True)
    recruiter = data.get("recruiter", {})
    provider = data.get("provider")

    if not recruiter.get("name"):
        return jsonify({"error": "Missing recruiter data"}), 400

    prompt = build_outreach_prompt(recruiter)

    try:
        result = generate_text(prompt, preferred_provider=provider)
        return jsonify({"success": True, **result})
    except RuntimeError as e:
        return jsonify({"success": False, "error": str(e)}), 502


@app.route("/api/email-reply", methods=["POST"])
def generate_email_reply():
    """Generate a contextual email reply."""
    data = request.get_json(force=True)
    email = data.get("email", {})
    intent = data.get("intent", "follow-up-status")
    provider = data.get("provider")

    if not email.get("body"):
        return jsonify({"error": "Missing email data"}), 400

    prompt = build_email_reply_prompt(email, intent)

    try:
        result = generate_text(prompt, preferred_provider=provider)
        return jsonify({"success": True, **result})
    except RuntimeError as e:
        return jsonify({"success": False, "error": str(e)}), 502


@app.route("/api/generate", methods=["POST"])
def raw_generate():
    """Generic text generation — send any prompt to the AI cascade."""
    data = request.get_json(force=True)
    prompt = data.get("prompt", "")
    provider = data.get("provider")

    if not prompt:
        return jsonify({"error": "Missing prompt"}), 400

    try:
        result = generate_text(prompt, preferred_provider=provider)
        return jsonify({"success": True, **result})
    except RuntimeError as e:
        return jsonify({"success": False, "error": str(e)}), 502


@app.route("/api/chat", methods=["POST"])
def chat_generate():
    """Conversational text generation — send a history of messages."""
    data = request.get_json(force=True)
    messages = data.get("messages", [])
    provider = data.get("provider")

    if not messages:
        return jsonify({"error": "Missing messages"}), 400

    try:
        result = chat_text(messages, preferred_provider=provider)
        return jsonify({"success": True, **result})
    except RuntimeError as e:
        return jsonify({"success": False, "error": str(e)}), 502


SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")


@app.route("/api/jobs", methods=["GET"])
def get_jobs():
    """Fetch jobs from Supabase database."""
    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        return jsonify({"error": "Supabase URL and Service Role Key must be configured in environment."}), 500

    headers = {
        "apikey": SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}"
    }
    url = f"{SUPABASE_URL}/rest/v1/jobs?select=*"
    try:
        resp = requests.get(url, headers=headers, timeout=10)
        if not resp.ok:
            return jsonify({"error": f"Supabase error: {resp.text}"}), resp.status_code
        return jsonify(resp.json())
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ===================================================================
#  Real Job Scraping — Greenhouse & Lever public APIs
# ===================================================================

def classify_experience_level(title: str) -> str:
    """Classify experience level from job title keywords."""
    t = title.lower()
    if re.search(r'\b(manager|director|vp|vice president|head of|chief|cto|cfo|coo|cxo)\b', t):
        return 'manager'
    if re.search(r'\b(senior|sr\.?|staff|principal|lead|architect|distinguished)\b', t):
        return 'senior'
    if re.search(r'\b(intern|junior|jr\.?|graduate|entry|trainee|associate|new grad|fresher|apprentice)\b', t):
        return 'fresher'
    return 'mid'


def parse_greenhouse_content(html_content: str) -> tuple[list, list]:
    """
    Parse Greenhouse HTML job description into qualifications and desired lists.
    Looks for section headers (h2/h3/h4/strong) to identify required vs. nice-to-have sections,
    then extracts <li> items from each.
    """
    if not html_content:
        return [], []

    html_content = unescape(html_content)

    required_keywords = ['require', 'qualif', 'must', 'need', 'looking for',
                         'what you', 'responsib', 'who you are', 'about you',
                         'minimum', 'basic', 'what we expect', 'skills']
    desired_keywords = ['nice to have', 'prefer', 'bonus', 'plus', 'ideal',
                        'additional', 'desired', 'great to have', 'assets']

    qualifications: list[str] = []
    desired: list[str] = []

    # Split by section headers
    parts = re.split(
        r'<(?:h[2-4]|strong)[^>]*>(.*?)</(?:h[2-4]|strong)>',
        html_content, flags=re.DOTALL | re.IGNORECASE
    )

    if len(parts) > 2:
        # Walk header/content pairs
        idx = 1
        while idx < len(parts) - 1:
            header_text = re.sub(r'<[^>]+>', '', parts[idx]).strip().lower()
            body_html = parts[idx + 1] if idx + 1 < len(parts) else ''
            idx += 2

            items = re.findall(r'<li[^>]*>(.*?)</li>', body_html,
                               re.DOTALL | re.IGNORECASE)
            clean = [re.sub(r'<[^>]+>', '', it).strip() for it in items]
            clean = [it for it in clean if len(it) > 10]

            if any(kw in header_text for kw in desired_keywords):
                desired.extend(clean[:4])
            elif any(kw in header_text for kw in required_keywords):
                qualifications.extend(clean[:5])
            elif not qualifications:
                qualifications.extend(clean[:5])
            elif not desired:
                desired.extend(clean[:4])

    # Fallback — just extract all <li> and split in half
    if not qualifications:
        all_items = re.findall(r'<li[^>]*>(.*?)</li>', html_content,
                               re.DOTALL | re.IGNORECASE)
        clean = [re.sub(r'<[^>]+>', '', it).strip() for it in all_items]
        clean = [it for it in clean if len(it) > 10]
        if clean:
            mid = max(len(clean) // 2, 1)
            qualifications = clean[:mid][:5]
            desired = clean[mid:][:4]

    # Last-resort — extract paragraphs
    if not qualifications:
        paras = re.findall(r'<p[^>]*>(.*?)</p>', html_content, re.DOTALL)
        clean_p = [re.sub(r'<[^>]+>', '', p).strip()
                   for p in paras if len(re.sub(r'<[^>]+>', '', p).strip()) > 25]
        qualifications = clean_p[:3] or ['See full description on company career portal']
        desired = clean_p[3:6] or ['Visit career portal for complete requirements']

    return qualifications[:5], desired[:4]


def parse_lever_lists(lists_data: list) -> tuple[list, list]:
    """Parse Lever structured 'lists' array into qualifications and desired."""
    required_keywords = ['require', 'qualif', 'must', 'need', 'looking for',
                         'responsib', 'who you are', 'about you', 'skills']
    desired_keywords = ['nice', 'prefer', 'bonus', 'plus', 'ideal',
                        'additional', 'desired']

    qualifications: list[str] = []
    desired: list[str] = []

    for lst in (lists_data or []):
        header = lst.get('text', '').lower()
        content = lst.get('content', '')

        items = re.findall(r'<li[^>]*>(.*?)</li>', content,
                           re.DOTALL | re.IGNORECASE)
        clean = [re.sub(r'<[^>]+>', '', it).strip() for it in items]
        clean = [it for it in clean if len(it) > 10]

        if any(kw in header for kw in desired_keywords):
            desired.extend(clean[:4])
        elif any(kw in header for kw in required_keywords):
            qualifications.extend(clean[:5])
        elif not qualifications:
            qualifications.extend(clean[:5])
        elif not desired:
            desired.extend(clean[:4])

    return qualifications[:5], desired[:4]


@app.route("/api/scrape-company", methods=["POST"])
def scrape_company():
    """
    Fetch real job listings from Greenhouse / Lever public APIs,
    parse HTML descriptions, and return structured job objects.
    Filters: location contains India / Bengaluru / Bangalore / Remote,
    posted within 30 days.
    """
    data = request.get_json(force=True)
    slug = data.get("slug", "")
    ats = data.get("ats", "greenhouse")
    careers_url = data.get("careersUrl", "")
    company_name = data.get("name", slug.title())

    if not slug:
        return jsonify({"error": "Missing company slug"}), 400

    cutoff = datetime.now(timezone.utc) - timedelta(days=30)
    location_keywords = ['bengaluru', 'bangalore', 'india', 'remote']
    jobs: list[dict] = []

    try:
        if ats == 'greenhouse':
            api_url = f"https://boards-api.greenhouse.io/v1/boards/{slug}/jobs?content=true"
            resp = requests.get(api_url, timeout=15)
            if not resp.ok:
                return jsonify({"success": True, "jobs": [],
                                "message": f"Greenhouse returned {resp.status_code}"})

            for jd in resp.json().get('jobs', []):
                location = jd.get('location', {}).get('name', '')
                if not any(kw in location.lower() for kw in location_keywords):
                    continue

                updated = jd.get('updated_at', '')
                try:
                    job_date = datetime.fromisoformat(updated.replace('Z', '+00:00'))
                    if job_date < cutoff:
                        continue
                except Exception:
                    pass  # keep the job if date can't be parsed

                content = jd.get('content', '')
                quals, des = parse_greenhouse_content(content)
                title = jd.get('title', '')

                jobs.append({
                    'id': jd.get('id'),
                    'title': title,
                    'company': company_name,
                    'location': location,
                    'ats': 'greenhouse',
                    'url': jd.get('absolute_url', ''),
                    'careersUrl': careers_url,
                    'posted_at': updated,
                    'qualifications': quals,
                    'desired': des,
                    'experienceLevel': classify_experience_level(title),
                })

        elif ats == 'lever':
            api_url = f"https://api.lever.co/v0/postings/{slug}?mode=json"
            resp = requests.get(api_url, timeout=15)
            if not resp.ok:
                return jsonify({"success": True, "jobs": [],
                                "message": f"Lever returned {resp.status_code}"})

            for posting in resp.json():
                location = posting.get('categories', {}).get('location', '')
                if not any(kw in location.lower() for kw in location_keywords):
                    continue

                created_ms = posting.get('createdAt', 0)
                try:
                    job_date = datetime.fromtimestamp(created_ms / 1000, tz=timezone.utc)
                    if job_date < cutoff:
                        continue
                except Exception:
                    pass

                quals, des = parse_lever_lists(posting.get('lists', []))
                title = posting.get('text', '')

                jobs.append({
                    'id': posting.get('id', ''),
                    'title': title,
                    'company': company_name,
                    'location': location,
                    'ats': 'lever',
                    'url': posting.get('hostedUrl', ''),
                    'careersUrl': careers_url,
                    'posted_at': datetime.fromtimestamp(
                        created_ms / 1000, tz=timezone.utc
                    ).isoformat() if created_ms else '',
                    'qualifications': quals,
                    'desired': des,
                    'experienceLevel': classify_experience_level(title),
                })

        else:
            return jsonify({"error": f"Unknown ATS type: {ats}"}), 400

        return jsonify({"success": True, "jobs": jobs, "count": len(jobs)})

    except requests.Timeout:
        return jsonify({"success": True, "jobs": [], "message": "API request timed out"})
    except Exception as e:
        return jsonify({"success": False, "error": str(e), "jobs": []}), 500


@app.route("/api/profile", methods=["POST"])
def parse_and_save_profile():
    """Parse raw resume text using Hugging Face model and save to Supabase."""
    data = request.get_json(force=True)
    email = data.get("email", "").strip().lower()
    raw_resume = data.get("rawResume", "").strip()

    if not email or not raw_resume:
        return jsonify({"error": "Email and rawResume are required fields."}), 400

    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        return jsonify({"error": "Supabase credentials are not configured on the server."}), 500

    prompt = (
        "You are an expert ATS resume parser. Extract the candidate's personal details, education details, and skills from their resume text.\n"
        "Return the output as a valid JSON object ONLY, with the following keys and no extra formatting or markdown code blocks:\n"
        "- full_name (string)\n"
        "- education (string)\n"
        "- skills (comma-separated list of skills)\n\n"
        f"Resume text:\n{raw_resume}"
    )

    try:
        llm_response = generate_text(prompt)
        text = llm_response.get("text", "").strip()
        
        # Clean up any potential markdown formatting from LLM (e.g. ```json ... ```)
        if text.startswith("```"):
            lines = text.split("\n")
            if lines[0].startswith("```"):
                lines = lines[1:]
            if lines[-1].startswith("```"):
                lines = lines[:-1]
            text = "\n".join(lines).strip()

        parsed_data = json.loads(text)
    except Exception as e:
        print(f"Extraction failed: {str(e)}")
        parsed_data = {
            "full_name": email.split("@")[0].title(),
            "education": "Not parsed. Click Edit to update.",
            "skills": "Not parsed. Click Edit to update."
        }

    # Write to Supabase table `user_profiles`
    headers = {
        "apikey": SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates"
    }
    url = f"{SUPABASE_URL}/rest/v1/user_profiles"
    payload = {
        "email": email,
        "full_name": parsed_data.get("full_name", email.split("@")[0].title()),
        "education": parsed_data.get("education", ""),
        "skills": parsed_data.get("skills", ""),
        "raw_resume": raw_resume
    }

    try:
        resp = requests.post(url, headers=headers, json=payload, timeout=10)
        if not resp.ok:
            return jsonify({"error": f"Supabase error: {resp.text}"}), resp.status_code
        return jsonify({"success": True, "profile": payload})
    except Exception as e:
        return jsonify({"error": f"Failed to save profile: {str(e)}"}), 500


@app.route("/api/profile/<email>", methods=["GET"])
def get_profile(email):
    """Retrieve user profile from Supabase."""
    email = email.strip().lower()
    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        return jsonify({"error": "Supabase credentials are not configured on the server."}), 500

    headers = {
        "apikey": SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}"
    }
    url = f"{SUPABASE_URL}/rest/v1/user_profiles?email=eq.{email}"
    try:
        resp = requests.get(url, headers=headers, timeout=10)
        if not resp.ok:
            return jsonify({"error": f"Supabase error: {resp.text}"}), resp.status_code
        profiles = resp.json()
        if not profiles:
            return jsonify({"success": False, "message": "Profile not found"}), 404
        return jsonify({"success": True, "profile": profiles[0]})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/profile/<email>", methods=["PUT"])
def update_profile(email):
    """Update user profile in Supabase."""
    email = email.strip().lower()
    data = request.get_json(force=True)

    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        return jsonify({"error": "Supabase credentials are not configured on the server."}), 500

    headers = {
        "apikey": SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
        "Content-Type": "application/json"
    }
    url = f"{SUPABASE_URL}/rest/v1/user_profiles?email=eq.{email}"
    payload = {
        "full_name": data.get("full_name"),
        "education": data.get("education"),
        "skills": data.get("skills"),
        "raw_resume": data.get("raw_resume")
    }
    try:
        resp = requests.patch(url, headers=headers, json=payload, timeout=10)
        if not resp.ok:
            return jsonify({"error": f"Supabase error: {resp.text}"}), resp.status_code
        return jsonify({"success": True, "profile": payload})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/profile/<email>", methods=["DELETE"])
def delete_profile(email):
    """Delete user profile from Supabase."""
    email = email.strip().lower()
    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        return jsonify({"error": "Supabase credentials are not configured on the server."}), 500

    headers = {
        "apikey": SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}"
    }
    url = f"{SUPABASE_URL}/rest/v1/user_profiles?email=eq.{email}"
    try:
        resp = requests.delete(url, headers=headers, timeout=10)
        if not resp.ok:
            return jsonify({"error": f"Supabase error: {resp.text}"}), resp.status_code
        return jsonify({"success": True, "message": "Profile deleted successfully"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ===================================================================
#  Entry point
# ===================================================================

if __name__ == "__main__":
    port = int(os.getenv("PORT", 5000))
    debug = os.getenv("FLASK_DEBUG", "true").lower() == "true"

    print(f"\nTeak AI Server starting on http://localhost:{port}")
    print(f"   HF Model: {HF_MODEL} {'(authenticated)' if HF_API_TOKEN else '(anonymous – lower rate limit)'}")
    print(f"   Ollama  : {OLLAMA_BASE_URL} -> {OLLAMA_MODEL}\n")

    app.run(host="0.0.0.0", port=port, debug=debug)
