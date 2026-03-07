import os
import sys

# Add parent dir to path so we can import from backend
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.database import SessionLocal
from backend.models import Process

def normalize_dash(text):
    if not text:
        return text
    return text.replace('\u2013', '-').replace('\u2014', '-')

def run_migration():
    print("Iniciando migração no banco de dados...")
    db = SessionLocal()
    try:
        # 1. Obter todos os processos
        processos = db.query(Process).all()
        atualizados = 0

        for p in processos:
            tipo = p.tipo_solicitacao
            mudou = False

            if tipo:
                # Normaliza traços (caso ainda existam traços bizarros no banco)
                novo_tipo = normalize_dash(tipo)
                
                # Regras de negócio de unificação de Cancelamentos
                if novo_tipo in ["CANCELAMENTO DE NOTAS FISCAIS DE SERVIÇOS", "CANCELAMENTO DE NFS-E", "CANCELAMENTO DE NOTAS"]:
                    novo_tipo = "CANCELAMENTO DE NFS-E (EXTEMPORÂNEO)"
                
                if novo_tipo != tipo:
                    p.tipo_solicitacao = novo_tipo
                    mudou = True

            if mudou:
                atualizados += 1

        db.commit()
        print(f"Sucesso! {atualizados} registros foram atualizados/unificados no banco de dados.")

    except Exception as e:
        db.rollback()
        print(f"Erro detalhado ao rodar migração: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    run_migration()
