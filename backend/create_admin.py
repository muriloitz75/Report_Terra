from database import SessionLocal, engine
from models import Base, User
from auth import get_password_hash
import sys

def create_admin(email, password, full_name):
    db = SessionLocal()
    try:
        # Check if user exists
        existing_user = db.query(User).filter(User.email == email).first()
        if existing_user:
            print(f"Erro: Usuário {email} já existe.")
            return

        hashed_password = get_password_hash(password)
        new_user = User(
            email=email,
            hashed_password=hashed_password,
            full_name=full_name,
            is_active=True
        )
        db.add(new_user)
        db.commit()
        print(f"Sucesso! Usuário administrador criado: {email}")
        print(f"Senha: {password}")
    except Exception as e:
        print(f"Erro ao criar usuário: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    print("--- Criar Usuário Administrador ---")
    if len(sys.argv) == 4:
        create_admin(sys.argv[1], sys.argv[2], sys.argv[3])
    else:
        email = input("Email: ")
        password = input("Senha: ")
        full_name = input("Nome Completo: ")
        create_admin(email, password, full_name)
