
import requests

API_URL = "http://localhost:8000"

def test_filter():
    # 1. Upload
    print("Uploading PDF...")
    with open("pdf model/21.pdf", "rb") as f:
        files = {"file": f}
        try:
            r = requests.post(f"{API_URL}/upload", files=files)
            print(f"Upload Status: {r.status_code}")
            print(f"Upload Response: {r.json()}")
        except Exception as e:
            print(f"Upload Failed: {e}")
            return

    # 2. Check Stats (Statuses)
    print("\nChecking /stats for available statuses...")
    try:
        r = requests.get(f"{API_URL}/stats")
        stats = r.json()
        print(f"Stats Status: {r.status_code}")
        print(f"All Statuses: {stats.get('all_statuses')}")
    except Exception as e:
        print(f"Stats Failed: {e}")

if __name__ == "__main__":
    test_filter()
