"""Offline static checks for the CareerMate AI student project."""
from __future__ import annotations
import ast
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
errors: list[str] = []
checks: list[str] = []

def require(condition: bool, message: str) -> None:
    if condition:
        checks.append(message)
    else:
        errors.append(message)

backend = ROOT / "backend" / "main.py"
frontend = ROOT / "frontend" / "src" / "main.jsx"
styles = ROOT / "frontend" / "src" / "styles.css"
mock_component = ROOT / "frontend" / "src" / "MockInterview.jsx"
mock_styles = ROOT / "frontend" / "src" / "mock-interview.css"
knowledge = ROOT / "backend" / "knowledge.json"
package = ROOT / "frontend" / "package.json"

require(backend.is_file(), "backend/main.py exists")
require(frontend.is_file(), "frontend/src/main.jsx exists")
require(styles.is_file(), "frontend/src/styles.css exists")
require(mock_component.is_file(), "frontend/src/MockInterview.jsx exists")
require(mock_styles.is_file(), "frontend/src/mock-interview.css exists")
require(knowledge.is_file(), "backend/knowledge.json exists")
require(package.is_file(), "frontend/package.json exists")

if backend.is_file():
    source = backend.read_text(encoding="utf-8")
    try:
        ast.parse(source)
        checks.append("backend/main.py Python syntax is valid")
    except SyntaxError as exc:
        errors.append(f"backend/main.py syntax error at line {exc.lineno}: {exc.msg}")
    for route in [
        "/api/health", "/api/models", "/api/chat", "/api/evaluate",
        "/api/questions", "/api/question-bank", "/api/question-bank/generate",
        "/api/interview-question", "/api/mock-interview/turn", "/api/roadmap", "/api/voice",
        "/api/performance", "/api/resume", "/api/projects", "/api/feedback",
    ]:
        require(route in source, f"backend defines {route}")

if frontend.is_file():
    source = frontend.read_text(encoding="utf-8")
    for route in ["/api/health", "/api/questions", "/api/question-bank", "/api/question-bank/generate", "/api/roadmap"]:
        require(route in source, f"frontend references {route}")
    require("Question Bank" in source, "Question Bank UI text exists")
    require('import MockInterview from "./MockInterview.jsx";' in source, "interactive Mock Interview component is connected")

if mock_component.is_file():
    mock_source = mock_component.read_text(encoding="utf-8")
    require("handsfree" in mock_source and "push" in mock_source, "hands-free and push-to-talk modes exist")
    require("/api/mock-interview/turn" in mock_source, "Mock Interview sends answers for evaluation")
    require("SpeechRecognition" in mock_source and "SpeechSynthesisUtterance" in mock_source, "browser speech input and spoken questions exist")

if knowledge.is_file():
    try:
        json.loads(knowledge.read_text(encoding="utf-8"))
        checks.append("backend/knowledge.json is valid JSON")
    except json.JSONDecodeError as exc:
        errors.append(f"backend/knowledge.json JSON error at line {exc.lineno}: {exc.msg}")

if package.is_file():
    try:
        data = json.loads(package.read_text(encoding="utf-8"))
        require("build" in data.get("scripts", {}), "frontend package has a build script")
        require("react" in data.get("dependencies", {}), "React dependency is declared")
        require("vite" in data.get("dependencies", {}), "Vite dependency is declared")
    except json.JSONDecodeError as exc:
        errors.append(f"frontend/package.json JSON error at line {exc.lineno}: {exc.msg}")

print("CareerMate AI source verification")
print("=================================")
for item in checks:
    print(f"PASS  {item}")
for item in errors:
    print(f"FAIL  {item}")
print(f"\nPassed: {len(checks)} | Failed: {len(errors)}")
if errors:
    print("Static checks failed. Fix the listed issue(s) before running the app.")
    sys.exit(1)
print("All offline static checks passed. Gemini credentials/network and the browser build require separate runtime checks.")
