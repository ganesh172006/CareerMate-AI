# CareerMate AI — Free Local Edition

A React + Vite frontend with a FastAPI backend and SQLite storage, configured to use **Ollama local AI by default**. No cloud API key or paid API credit is required for chat, mock interview feedback, question-bank generation, resume drafts, or project ideas.

## Included features
- Minimal dark, ChatGPT-inspired dashboard
- AI chat with conversation context
- Mock interview question selection and answer evaluation
- Expanded question bank across Java, Python, DSA, DBMS, Operating Systems, Computer Networks, AI, Projects, Aptitude, HR, and System Design
- Voice Fluency page with recording and feedback; optional offline Whisper transcription
- Placement roadmap
- Resume content builder
- Project idea generator
- SQLite activity/performance statistics
- Optional cloud providers exist in the code only for explicitly configured `AI_PROVIDER=auto`; default is local Ollama and OpenAI is never automatically called

## Quick start (Windows)
1. Install Python 3.11/3.12, Node.js LTS, and Ollama from https://ollama.com.
2. In Command Prompt run `ollama run llama3.2:3b` and wait for the model download. Type `/bye` to exit.
3. Open one terminal in `backend/`: `python -m pip install -r requirements.txt`, then `python -m uvicorn main:app --reload`.
4. Open a second terminal in `frontend/`: `npm install`, then `npm run dev`.
5. Open the localhost URL printed by Vite, usually `http://localhost:5173`.

See `SETUP_WINDOWS.txt` for voice setup and troubleshooting. API docs: `http://127.0.0.1:8000/docs`.

## Voice transcription
Install the optional package from `backend/` with `python -m pip install -r requirements-voice.txt`. The Whisper model downloads on first use. Transcript feedback evaluates content, not pronunciation or audible pacing. Recording playback remains available in the UI.

## Notes
- The included `.env.example` has no secrets. Copy it to `.env` only if you want to customize settings.
- No API keys are included. Never share `.env` or paste API keys into chat.
- Local model speed depends on your computer and the model loaded in Ollama.
- The project files are bundled; your local dependencies and model weights must be installed separately.
