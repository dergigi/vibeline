import logging
import os
from abc import ABC, abstractmethod
from typing import Dict, List, Optional

import ollama
import openai
from dotenv import load_dotenv

# Load environment variables
load_dotenv(override=True)

logger = logging.getLogger(__name__)


class LLMClient(ABC):
    """Abstract base class for LLM clients."""

    @abstractmethod
    def chat(self, model: str, messages: List[Dict[str, str]]) -> str:
        """Send a chat request and return the response content."""
        pass

    @abstractmethod
    def ensure_model_exists(self, model_name: str) -> None:
        """Ensure the specified model is available."""
        pass


class OllamaClient(LLMClient):
    """Ollama LLM client."""

    def __init__(self, host: Optional[str] = None):
        self.host = host or os.getenv("OLLAMA_HOST", "http://localhost:11434")
        ollama.host = self.host  # type: ignore

    def chat(self, model: str, messages: List[Dict[str, str]]) -> str:
        """Send a chat request to Ollama and return the response content."""
        response = ollama.chat(model=model, messages=messages)
        return str(response["message"]["content"]).strip()

    def ensure_model_exists(self, model_name: str) -> None:
        """Ensure the specified Ollama model is available locally."""
        try:
            ollama.show(model=model_name)
        except Exception:
            logger.info(f"Ollama model {model_name} not found locally. Pulling model...")
            try:
                ollama.pull(model=model_name)
                logger.info(f"Successfully pulled Ollama model {model_name}")
            except Exception as e:
                logger.error(f"Error pulling Ollama model {model_name}: {e}")
                raise


class OpenAIClient(LLMClient):
    """OpenAI-compatible API client."""

    def __init__(self, api_key: Optional[str] = None, base_url: Optional[str] = None):
        self.api_key = api_key or os.getenv("OPENAI_API_KEY")
        self.base_url = base_url or os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1")

        if not self.api_key:
            raise ValueError("OpenAI API key is required. Set OPENAI_API_KEY environment variable.")

        self.client = openai.OpenAI(api_key=self.api_key, base_url=self.base_url)

    def chat(self, model: str, messages: List[Dict[str, str]]) -> str:
        """Send a chat request to OpenAI-compatible API and return the response content."""
        try:
            response = self.client.chat.completions.create(
                model=model, messages=messages, temperature=0.7, max_tokens=4000
            )
            return response.choices[0].message.content.strip()
        except Exception as e:
            logger.error(f"Error calling OpenAI-compatible API: {e}")
            raise

    def ensure_model_exists(self, model_name: str) -> None:
        """For OpenAI-compatible APIs, we assume the model exists on the server."""
        # Most OpenAI-compatible APIs don't provide model availability checking
        # The model will be validated when we make the actual request
        logger.debug(f"Assuming OpenAI-compatible model {model_name} is available on server")


class LLMClientFactory:
    """Factory for creating LLM clients based on configuration."""

    @staticmethod
    def create_client() -> LLMClient:
        """Create an LLM client based on environment configuration."""
        llm_provider = os.getenv("LLM_PROVIDER", "ollama").lower()

        if llm_provider == "openai":
            return OpenAIClient()
        elif llm_provider == "ollama":
            return OllamaClient()
        else:
            raise ValueError(f"Unsupported LLM provider: {llm_provider}. Use 'ollama' or 'openai'.")


# Global client instance
_llm_client: Optional[LLMClient] = None


def get_llm_client() -> LLMClient:
    """Get the global LLM client instance."""
    global _llm_client
    if _llm_client is None:
        _llm_client = LLMClientFactory.create_client()
    return _llm_client


def reset_llm_client() -> None:
    """Reset the global LLM client instance. Useful for testing or configuration changes."""
    global _llm_client
    _llm_client = None


def generate_content(model: str, messages: List[Dict[str, str]]) -> str:
    """Generate content using the configured LLM client."""
    client = get_llm_client()
    return client.chat(model=model, messages=messages)


def ensure_model_exists(model_name: str) -> None:
    """Ensure the specified model is available."""
    client = get_llm_client()
    client.ensure_model_exists(model_name)
