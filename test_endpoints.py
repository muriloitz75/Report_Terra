import requests
import json

BASE_URL = "http://localhost:8000"

# First, get a token
def get_token():
    response = requests.post(
        f"{BASE_URL}/token",
        data={"username": "admin@reportterra.com", "password": "admin123"}
    )
    if response.status_code == 200:
        return response.json()["access_token"]
    else:
        print(f"Login failed: {response.status_code} - {response.text}")
        return None

def test_stats(token):
    print("\n=== Testing /stats endpoint ===")
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(f"{BASE_URL}/stats", headers=headers)
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"Total: {data.get('total')}")
        print(f"Encerrados: {data.get('encerrados')}")
        print(f"Andamento: {data.get('andamento')}")
        print(f"Atrasados: {data.get('atrasados')}")
    else:
        print(f"Error: {response.text}")

def test_processes(token):
    print("\n=== Testing /processes endpoint ===")
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(f"{BASE_URL}/processes", headers=headers)
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"Total: {data.get('total')}")
        print(f"Pages: {data.get('pages')}")
        if data.get('data'):
            print(f"First process: {data['data'][0]['id']}")
    else:
        print(f"Error: {response.text}")

if __name__ == "__main__":
    token = get_token()
    if token:
        print(f"Token obtained: {token[:50]}...")
        test_stats(token)
        test_processes(token)
