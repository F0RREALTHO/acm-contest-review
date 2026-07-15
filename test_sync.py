import time
import requests

URL = "https://review-acm-svnit.vercel.app"
CONTEST = "acm-summer-challenge-2026"

print("Starting sync on Vercel...")
start_resp = requests.post(f"{URL}/api/sync", json={"contestSlug": CONTEST, "fullSync": True})
print(start_resp.json())

print("Polling status...")
for _ in range(20):
    status_resp = requests.get(f"{URL}/api/sync/status?contestSlug={CONTEST}")
    data = status_resp.json()
    print(data.get("stage"), data.get("processed"), "/", data.get("total"))
    
    if data.get("status") in ["synced", "failed"]:
        print("Final Status:", data.get("status"))
        break
        
    time.sleep(2)
