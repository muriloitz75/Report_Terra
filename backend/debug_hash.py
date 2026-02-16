from auth import get_password_hash, verify_password, pwd_context
import sys

try:
    print("Testing with string 'test'")
    h = get_password_hash("test")
    print(f"Hash success: {h}")
except Exception as e:
    print(f"Hash string failed: {e}")

try:
    print("Testing with bytes b'test'")
    h = get_password_hash(b"test")
    print(f"Hash bytes success: {h}")
except Exception as e:
    print(f"Hash bytes failed: {e}")

print("Schemes:", pwd_context.schemes())
