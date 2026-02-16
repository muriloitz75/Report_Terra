import os
import pandas as pd
from typing import List, Dict, Any, Generator
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate

from langchain_core.outputs import LLMResult
from langchain_core.output_parsers import StrOutputParser
import json
import random

# Optional imports for other providers
try:
    from langchain_anthropic import ChatAnthropic
except ImportError:
    ChatAnthropic = None

try:
    from langchain_google_genai import ChatGoogleGenerativeAI
except ImportError:
    ChatGoogleGenerativeAI = None

try:
    from langchain_huggingface import HuggingFaceEndpoint
except ImportError:
    HuggingFaceEndpoint = None

def summarize_data(df: pd.DataFrame) -> str:
    """
    Summarizes the dataframe to reduce token usage.
    Instead of sending raw rows, we send aggregated statistics.
    """
    if df.empty:
        return "Nenhum dado encontrado com os filtros atuais."

    total = len(df)
    
    # Status breakdown
    if 'status' in df.columns:
        status_counts = df['status'].value_counts().to_dict()
        status_summary = ", ".join([f"{k}: {v}" for k, v in status_counts.items()])
    else:
        status_summary = "N/A"

    # Type breakdown (Top 5)
    if 'tipo_solicitacao' in df.columns:
        type_counts = df['tipo_solicitacao'].value_counts().head(5).to_dict()
        type_summary = ", ".join([f"{k}: {v}" for k, v in type_counts.items()])
    else:
        type_summary = "N/A"

    # Delays
    delayed_count = 0
    avg_delay = 0
    max_delay = 0
    if 'is_atrasado' in df.columns and 'dias_atraso_calc' in df.columns:
        delayed_df = df[df['is_atrasado'] == True]
        delayed_count = len(delayed_df)
        if not delayed_df.empty:
            avg_delay = int(delayed_df['dias_atraso_calc'].mean())
            max_delay = int(delayed_df['dias_atraso_calc'].max())

    # Recent items (Last 3)
    recent_items = []
    if 'id' in df.columns and 'contribuinte' in df.columns:
        # Sort by date if available, else take existing order
        # Assuming df is already sorted or we just take top 3
        top_3 = df.head(3)
        for _, row in top_3.iterrows():
            recent_items.append(f"- ID {row.get('id', '?')} ({row.get('contribuinte', '?')}): {row.get('status', '?')}")
    
    recent_summary = "\n".join(recent_items)

    summary = f"""
    Total de Processos Listados: {total}
    
    Distribuição por Situação:
    {status_summary}
    
    Principais Tipos de Solicitação (Top 5):
    {type_summary}
    
    Métricas de Atraso:
    - Processos Atrasados: {delayed_count}
    - Média de Dias de Atraso: {avg_delay}
    - Maior Atraso Registrado: {max_delay} dias
    
    Exemplos Recentes (Amostra):
    {recent_summary}
    """
    return summary

def get_llm_model():
    provider = os.getenv("LLM_PROVIDER", "openai").lower()
    
    if provider == "anthropic":
        if not ChatAnthropic:
            raise ImportError("Pacote langchain-anthropic não instalado.")
        api_key = os.getenv("ANTHROPIC_API_KEY")
        if not api_key:
             raise ValueError("Chave ANTHROPIC_API_KEY não configurada.")
        return ChatAnthropic(model="claude-3-haiku-20240307", temperature=0.7, streaming=True, api_key=api_key)
        
    elif provider == "google":
        if not ChatGoogleGenerativeAI:
             raise ImportError("Pacote langchain-google-genai não instalado.")
        api_key = os.getenv("GOOGLE_API_KEY")
        if not api_key:
             raise ValueError("Chave GOOGLE_API_KEY não configurada.")
        return ChatGoogleGenerativeAI(model="gemini-1.5-flash", temperature=0.7, streaming=True, google_api_key=api_key)

    elif provider == "huggingface":
        if not HuggingFaceEndpoint:
             raise ImportError("Pacote langchain-huggingface não instalado.")
        api_key = os.getenv("HUGGINGFACEHUB_API_TOKEN")
        if not api_key:
             raise ValueError("Chave HUGGINGFACEHUB_API_TOKEN não configurada.")
        # Using Hugging Face Inference API with repo_id parameter
        return HuggingFaceEndpoint(
            repo_id="google/flan-t5-large",
            max_new_tokens=1024,
            top_k=50,
            temperature=0.7,
            huggingfacehub_api_token=api_key
        )

    elif provider == "lmstudio":
        # LM Studio mimics OpenAI API
        base_url = os.getenv("LM_STUDIO_URL", "http://localhost:1234/v1")
        return ChatOpenAI(
            base_url=base_url,
            api_key="lm-studio", # Key is ignored by LM Studio usually
            model="local-model", # Model is determined by what is loaded in LM Studio
            temperature=0.7,
            streaming=True
        )
        
    else: # Default strictly to OpenAI
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
             raise ValueError("Chave OPENAI_API_KEY não configurada.")
        return ChatOpenAI(model="gpt-3.5-turbo", temperature=0.7, streaming=True, api_key=api_key)

def get_few_shot_examples() -> str:
    """
    Retrieves positive feedback examples to guide the AI.
    """
    feedback_file = os.path.join(os.path.dirname(__file__), "data", "feedback_log.json")
    if not os.path.exists(feedback_file):
        return ""

    try:
        with open(feedback_file, "r", encoding="utf-8") as f:
            feedbacks = json.load(f)
        
        # Filter for positive ratings
        positives = [f["report_content"] for f in feedbacks if f.get("rating") == "positive"]
        
        if not positives:
            return ""

        # Select 1 random example to keep context short
        example = random.choice(positives)
        return f"\n\nEXEMPLO DE ESTILO APROVADO (Use como referência de tom e formatação):\n---\n{example[:4000]}...\n---\n"
        
    except Exception as e:
        print(f"Error loading few-shot examples: {e}")
        return ""

async def generate_analysis_stream(df: pd.DataFrame, user_prompt: str = "") -> Generator[str, None, None]:
    """
    Generates an AI analysis of the data using the configured LLM provider.
    """
    
    data_summary = summarize_data(df)
    few_shot_context = get_few_shot_examples()
    
    try:
        llm = get_llm_model()
        
        system_prompt = f"""Você é um analista de dados especialista em processos governamentais (prefeitura/urbanismo).
        Sua tarefa é analisar o resumo dos dados de processos fornecido e gerar um relatório executivo em Markdown.
        
        Diretrizes:
        1. Comece com uma "Visão Geral" rápida.
        2. Destaque pontos de atenção (ex: muitos processos atrasados, gargalos em um tipo específico).
        3. Se houver atrasos, sugira ações corretivas genéricas.
        4. Seja conciso e profissional. Use tópicos (bullet points) para facilitar a leitura.
        5. Responda DIRETAMENTE à pergunta do usuário se houver uma.
        
        {few_shot_context}
        
        O formato da resposta deve ser Markdown válido.
        """
        
        prompt = ChatPromptTemplate.from_messages([
            ("system", system_prompt),
            ("user", "Resumo dos Dados:\n{data_summary}\n\nInstrução do Usuário: {user_prompt}")
        ])
        
        chain = prompt | llm | StrOutputParser()
        
        async for chunk in chain.astream({"data_summary": data_summary, "user_prompt": user_prompt}):
            yield chunk
            
    except Exception as e:
        error_msg = str(e)
        if "insufficient_quota" in error_msg or "429" in error_msg:
             yield "\n\n**Erro de Cota OpenAI (429):**\n\nSeus créditos ou cota de uso da API da OpenAI acabaram.\n\n**Solução:**\n1. Verifique billing na OpenAI.\n2. Ou mude para o Google Gemini (grátis) no arquivo `backend/.env` definindo `LLM_PROVIDER=google` e `GOOGLE_API_KEY=...`."
        elif "AuthenticationError" in error_msg or "401" in error_msg:
             yield f"\n\n**Erro de Autenticação (401):**\n\nA chave da API configurada ({os.getenv('LLM_PROVIDER', 'openai')}) parece inválida. Verifique o arquivo `backend/.env`."
        elif "404" in error_msg and "gemini" in error_msg.lower():
             yield "\n\n**Erro de Modelo Google (404):**\n\nO modelo configurado não foi encontrado. Isso pode ser um problema de região ou versão da API. Tente usar `gemini-1.5-flash`."
        elif "Value" in error_msg or "Import" in error_msg: # Catch our own validation errors
             yield f"\n\n**Erro de Configuração:**\n\n{error_msg}"
        else:
             yield f"\n\n**Erro ao gerar análise:** {error_msg}"
