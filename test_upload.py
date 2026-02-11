
import requests

try:
    with open("pdf model/21.pdf", "rb") as f:
        response = requests.post(
            "http://localhost:8000/upload",
            files={"file": f}
        )
    print(response.json())
except Exception as e:
    print(e)
