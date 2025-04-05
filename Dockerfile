FROM python:3.10-slim

WORKDIR /app

# Install ffmpeg
RUN apt-get update && apt-get install -y \
    ffmpeg bc \
    && rm -rf /var/lib/apt/lists/*

# Install dependencies first
COPY requirements.txt .

# Install dependencies
RUN pip install -r requirements.txt

# Copy app files
COPY . .

# Setup environment variables
ENV OLLAMA_EXTRACT_MODEL=llama2
ENV OLLAMA_SUMMARIZE_MODEL=llama2
ENV OLLAMA_DEFAULT_MODEL=llama2
ENV WHISPER_MODEL=base.en
ENV VOICE_MEMOS_DIR=/app/VoiceMemos

VOLUME [ "/app/VoiceMemos" ]

CMD ["python", "src/watch_voice_memos.py"]
