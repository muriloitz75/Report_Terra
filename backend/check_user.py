from database import SessionLocal
from models import User
from auth import verify_password, get_password_hash
import sys

def check_admin(email, password):
    db = SessionLocal()
    try:
        # Check if user exists
        user = db.query(User).filter(User.email == email).first()
        if not user:
            print(f"❌ Usuário NÃO encontrado: {email}")
            return

        print(f"✅ Usuário encontrado: {user.email}")
        print(f"   ID: {user.id}")
        print(f"   Hash no Banco: {user.hashed_password}")
        
        # Verify password
        is_valid = verify_password(password, user.hashed_password)
        if is_valid:
            print(f"✅ Senha CORRETA para '{password}'")
        else:
            print(f"❌ Senha INCORRETA para '{password}'")
            
            # Debug hash mismatch
            new_hash = get_password_hash(password)
            print(f"   Novo hash gerado para comparação: {new_hash}")

    except Exception as e:
        print(f"Erro ao verificar: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    if len(sys.argv) == 3:
        check_admin(sys.argv[1], sys.argv[2])
    else:
        check_admin("admin@reportterra.com", "admin123")
