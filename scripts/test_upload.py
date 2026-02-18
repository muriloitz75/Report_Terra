import requests
import sys
import os

def main():
    if len(sys.argv) < 3:
        print("Usage: python test_upload.py <token> <file_path> [api_url]", file=sys.stderr)
        sys.exit(1)
    token = sys.argv[1]
    file_path = sys.argv[2]
    api_url = sys.argv[3] if len(sys.argv) > 3 else "http://localhost:8000/upload"
    try:
        with open(file_path, "rb") as f:
            files = {"file": f}
            headers = {"Authorization": f"Bearer {token}"}
            resp = requests.post(api_url, headers=headers, files=files, timeout=300)
            print("Status:", resp.status_code)
            print("Body:", resp.text)
    except Exception as e:
        print("Error:", str(e), file=sys.stderr)
        sys.exit(2)

if __name__ == "__main__":
    main()
