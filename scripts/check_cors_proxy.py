import requests

url = 'http://localhost:8080/https://lite.duckduckgo.com/lite?q=test'
try:
    resp = requests.get(url, timeout=10)
    print(f"Status code: {resp.status_code}")
    print(f"Content (first 200 chars):\n{resp.text[:200]}")
except Exception as e:
    print(f"Error: {e}")
