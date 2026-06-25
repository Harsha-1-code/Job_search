import requests

# Try alternate slugs for the companies that returned 404
# Greenhouse companies
gh_alternates = {
    'canva': ['canva', 'canva-2', 'canvaptyltd'],
    'atlassian': ['atlassian', 'atlassianinc'],
    'shopify': ['shopify', 'shopifyinternships', 'shopify-engineering'],
    'supabase': ['supabase', 'supabaseinc'],
    'rippling': ['rippling', 'ripplinginc'],
    'datadoghq': ['datadoghq', 'datadog', 'datadoginc'],
}

print("=== Finding correct Greenhouse slugs ===")
for company, slugs in gh_alternates.items():
    for s in slugs:
        try:
            r = requests.get(f"https://boards-api.greenhouse.io/v1/boards/{s}/jobs", timeout=8)
            if r.ok:
                count = len(r.json().get('jobs', []))
                print(f"  {company} -> FOUND as '{s}' ({count} jobs)")
                break
            else:
                print(f"  {company} -> '{s}' returned {r.status_code}")
        except Exception as e:
            print(f"  {company} -> '{s}' ERROR: {e}")

# Lever companies
lever_alternates = {
    'swiggy': ['swiggy', 'swiggyin', 'swiggy-1'],
    'dream11': ['dream11', 'dreamsports', 'dream11-2'],
}

print("\n=== Finding correct Lever slugs ===")
for company, slugs in lever_alternates.items():
    for s in slugs:
        try:
            r = requests.get(f"https://api.lever.co/v0/postings/{s}?mode=json", timeout=8)
            if r.ok and isinstance(r.json(), list) and len(r.json()) > 0:
                count = len(r.json())
                print(f"  {company} -> FOUND as '{s}' ({count} jobs)")
                break
            else:
                print(f"  {company} -> '{s}' returned {r.status_code} ({len(r.json()) if r.ok else 0} jobs)")
        except Exception as e:
            print(f"  {company} -> '{s}' ERROR: {e}")

# Try more known working slugs
print("\n=== Additional known Greenhouse companies ===")
more_gh = ['figma', 'stripe', 'vercel', 'postman', 'coinbase', 'twilio', 'notionhq', 'databricks', 'raboramp', 'ramp']
for s in more_gh:
    try:
        r = requests.get(f"https://boards-api.greenhouse.io/v1/boards/{s}/jobs", timeout=8)
        count = len(r.json().get('jobs', [])) if r.ok else 0
        print(f"  {s}: HTTP {r.status_code} ({count} jobs)")
    except Exception as e:
        print(f"  {s}: ERROR - {e}")

print("\n=== Additional known Lever companies ===")
more_lever = ['razorpay-software-private-limited', 'zomato', 'ola', 'sliceit', 'jupitermoney', 'credclub']
for s in more_lever:
    try:
        r = requests.get(f"https://api.lever.co/v0/postings/{s}?mode=json", timeout=8)
        count = len(r.json()) if r.ok and isinstance(r.json(), list) else 0
        print(f"  {s}: HTTP {r.status_code} ({count} jobs)")
    except Exception as e:
        print(f"  {s}: ERROR - {e}")
