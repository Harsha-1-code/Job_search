"""
Teak AI Server — Flask backend for all AI-powered features.
Supports: Hugging Face open-source models and local Ollama.
The frontend calls these endpoints instead of making direct API calls from the browser.
"""

import os
import json
import requests
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

app = Flask(__name__)
CORS(app)

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


# ===================================================================
#  Unified generation with automatic provider cascade
# ===================================================================

# Priority order: HuggingFace → Ollama
PROVIDERS = [
    ("huggingface", generate_with_huggingface),
    ("ollama", generate_with_ollama),
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
            f"- Sound authentic, not generic"
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
            f"- Output in clean markdown format"
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
