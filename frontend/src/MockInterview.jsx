import React, { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Mic, MicOff, Volume2, VolumeX, Play, Square, RotateCcw, Send, LoaderCircle, CheckCircle2, Headphones, MessageSquare, Award } from "lucide-react";
import "./mock-interview.css";

const API = (import.meta.env.VITE_API_URL || "http://localhost:8000").replace(/\/$/, "");
const TOTAL_QUESTIONS = 6;
const MODES = [
  { value: "handsfree", label: "Hands-free", detail: "AI speaks, then listens automatically." },
  { value: "push", label: "Push-to-talk", detail: "Press the microphone button for each answer." },
];

async function post(path, payload) {
  const response = await fetch(`${API}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.detail || `Request failed (${response.status})`);
  return data;
}

export default function MockInterview({ categories = [], defaultCategory = "HR Interview", defaultDifficulty = "Intermediate" }) {
  const [category, setCategory] = useState(categories.includes(defaultCategory) ? defaultCategory : (categories[0] || "HR Interview"));
  const [difficulty, setDifficulty] = useState(defaultDifficulty);
  const [mode, setMode] = useState("handsfree");
  const [speakAnswers, setSpeakAnswers] = useState(true);
  const [active, setActive] = useState(false);
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [question, setQuestion] = useState("");
  const [draft, setDraft] = useState("");
  const [status, setStatus] = useState("Choose your interview settings and start when you're ready.");
  const [error, setError] = useState("");
  const [turns, setTurns] = useState([]);
  const [report, setReport] = useState(null);
  const recognitionRef = useRef(null);
  const transcriptRef = useRef("");
  const activeRef = useRef(false);
  const modeRef = useRef(mode);
  const questionRef = useRef(question);
  const turnsRef = useRef(turns);
  const speakAnswersRef = useRef(speakAnswers);
  const submittingRef = useRef(false);
  const retryListeningRef = useRef(true);

  useEffect(() => { modeRef.current = mode; }, [mode]);
  useEffect(() => { questionRef.current = question; }, [question]);
  useEffect(() => { turnsRef.current = turns; }, [turns]);
  useEffect(() => { speakAnswersRef.current = speakAnswers; }, [speakAnswers]);
  useEffect(() => () => {
    activeRef.current = false;
    try { recognitionRef.current?.abort(); } catch {}
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
  }, []);

  const speak = (text, after) => {
    if (!speakAnswersRef.current) {
      setSpeaking(false);
      after?.();
      return;
    }
    if (!("speechSynthesis" in window)) {
      setSpeaking(false);
      setStatus("Text-to-speech isn't supported in this browser. You can still read the question and answer by typing.");
      after?.();
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-IN";
    utterance.rate = 0.96;
    utterance.pitch = 1;
    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => { setSpeaking(false); after?.(); };
    utterance.onerror = () => { setSpeaking(false); after?.(); };
    window.speechSynthesis.speak(utterance);
  };

  const finishInterview = (allTurns) => {
    activeRef.current = false;
    setActive(false);
    setListening(false);
    setSpeaking(false);
    try { recognitionRef.current?.abort(); } catch {}
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    const avg = allTurns.length ? allTurns.reduce((sum, item) => sum + (Number(item.score) || 0), 0) / allTurns.length : 0;
    setReport({ average: avg, count: allTurns.length, turns: allTurns });
    setStatus("Interview complete. Review your report below.");
  };

  const listen = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError("Speech recognition isn't available in this browser. Try the latest Google Chrome, or type your answer below.");
      setStatus("Microphone transcription unavailable; typed answers still work.");
      return;
    }
    try { recognitionRef.current?.abort(); } catch {}
    retryListeningRef.current = true;
    transcriptRef.current = "";
    const recognition = new SpeechRecognition();
    recognition.lang = "en-IN";
    recognition.continuous = modeRef.current !== "handsfree";
    recognition.interimResults = true;
    recognitionRef.current = recognition;
    recognition.onstart = () => { setListening(true); setStatus("Listening to your answer… Speak naturally, then pause or press Stop listening."); };
    recognition.onresult = (event) => {
      let finalText = "";
      let interimText = "";
      for (let i = event.resultIndex || 0; i < event.results.length; i++) {
        const text = event.results[i][0]?.transcript || "";
        if (event.results[i].isFinal) finalText += `${text} `;
        else interimText += `${text} `;
      }
      transcriptRef.current = `${transcriptRef.current} ${finalText}`.trim();
      setDraft(`${transcriptRef.current} ${interimText}`.trim());
    };
    recognition.onerror = (event) => {
      if (event.error !== "aborted" && event.error !== "no-speech") {
        setError(`Microphone issue: ${event.error}. You can type your answer instead.`);
        if (["not-allowed", "service-not-allowed", "audio-capture", "language-not-supported"].includes(event.error)) retryListeningRef.current = false;
      }
    };
    recognition.onend = () => {
      setListening(false);
      const transcript = transcriptRef.current.trim();
      if (transcript && activeRef.current) submitAnswer(transcript);
      else if (activeRef.current && modeRef.current === "handsfree" && retryListeningRef.current) {
        setStatus("I didn't catch that. Listening again in a moment, or type your answer below.");
        window.setTimeout(() => { if (activeRef.current && !busy) listen(); }, 700);
      } else if (!transcript) setStatus("No speech captured. Try again or type your answer below.");
    };
    try { recognition.start(); } catch (e) { setError(`Couldn't start microphone: ${e.message}`); }
  };

  const startInterview = async () => {
    if (busy) return;
    setError(""); setReport(null); setTurns([]); turnsRef.current = []; setDraft(""); setQuestion("");
    setBusy(true); setStatus("Preparing your interview question…");
    try {
      const queuedQuestion = sessionStorage.getItem("cm-practice-question");
      let firstQuestion = queuedQuestion || "";
      if (queuedQuestion) sessionStorage.removeItem("cm-practice-question");
      else firstQuestion = (await post("/api/interview-question", { category, difficulty })).question;
      setQuestion(firstQuestion); questionRef.current = firstQuestion;
      activeRef.current = true; setActive(true);
      setStatus("Your interviewer is asking the first question.");
      speak(firstQuestion, () => { if (activeRef.current && modeRef.current === "handsfree") listen(); else if (activeRef.current) setStatus("Your turn. Press the microphone button or type your answer."); });
    } catch (e) { setError(`Couldn't start the interview: ${e.message}`); setStatus("Check that the backend is running and Gemini is configured, then try again."); }
    finally { setBusy(false); }
  };

  async function submitAnswer(answerText) {
    const clean = String(answerText || "").trim();
    if (!clean || submittingRef.current || !activeRef.current) return;
    submittingRef.current = true;
    setBusy(true); setError(""); setListening(false);
    try { recognitionRef.current?.abort(); } catch {}
    setStatus("Reviewing your answer and preparing the next question…");
    const previousTurns = turnsRef.current;
    try {
      const data = await post("/api/mock-interview/turn", {
        category, difficulty, question: questionRef.current, answer: clean,
        turn_number: previousTurns.length + 1, total_questions: TOTAL_QUESTIONS,
        history: previousTurns.slice(-5).map(t => ({ question: t.question, answer: t.answer, score: t.score })),
      });
      const item = { question: questionRef.current, answer: clean, score: Number(data.score) || 0, feedback: data.feedback || "No feedback was returned." };
      const updated = [...previousTurns, item];
      turnsRef.current = updated; setTurns(updated); setDraft("");
      if (updated.length >= TOTAL_QUESTIONS || data.is_complete || !data.next_question) {
        finishInterview(updated);
      } else {
        setQuestion(data.next_question); questionRef.current = data.next_question;
        setStatus(`Question ${updated.length + 1} of ${TOTAL_QUESTIONS}.`);
        speak(data.next_question, () => {
          if (!activeRef.current) return;
          if (modeRef.current === "handsfree") listen();
          else setStatus("Your turn. Press the microphone button or type your answer.");
        });
      }
    } catch (e) {
      setError(`Couldn't evaluate this answer: ${e.message}. Your answer is still in the box so you can retry.`);
      setDraft(clean); setStatus("Please retry sending your answer, or check the backend connection.");
    } finally { submittingRef.current = false; setBusy(false); }
  }

  const stopInterview = () => {
    activeRef.current = false;
    try { recognitionRef.current?.abort(); } catch {}
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    setActive(false); setListening(false); setSpeaking(false); setStatus("Interview stopped. Start a new session whenever you're ready.");
    if (turnsRef.current.length) {
      const avg = turnsRef.current.reduce((sum, item) => sum + item.score, 0) / turnsRef.current.length;
      setReport({ average: avg, count: turnsRef.current.length, turns: turnsRef.current });
    }
  };

  const stopListening = () => { try { recognitionRef.current?.stop(); } catch {} };
  const handleTypedSubmit = (event) => { event.preventDefault(); if (draft.trim()) submitAnswer(draft); };
  const restart = () => { stopInterview(); setQuestion(""); setDraft(""); setTurns([]); turnsRef.current = []; setReport(null); setError(""); setStatus("Choose your interview settings and start when you're ready."); };

  return <div className="mock-wrap">
    <div className="page-intro"><span className="round-icon"><Headphones size={22}/></span><div><h2>AI Mock Interview</h2><p>A placement-style interview with spoken questions, answer feedback, follow-ups and a final score.</p></div></div>
    <section className="panel mock-setup">
      <div className="mock-setup-head"><div><span className="mock-kicker">INTERVIEW ROOM</span><h3>Practice with CareerMate</h3><p>Choose a round and speaking mode. Your Gemini API key remains on the backend.</p></div><div className={`mock-live ${active ? "is-live" : ""}`}><span/> {active ? "SESSION LIVE" : "READY"}</div></div>
      <div className="mock-settings">
        <label>Interview round<select value={category} disabled={active || busy} onChange={e => setCategory(e.target.value)}>{(categories.length ? categories : ["HR Interview", "Java", "Python", "DSA", "DBMS", "Operating Systems", "Computer Networks", "Artificial Intelligence", "Projects", "Aptitude", "System Design"]).map(c => <option key={c}>{c}</option>)}</select></label>
        <label>Difficulty<select value={difficulty} disabled={active || busy} onChange={e => setDifficulty(e.target.value)}>{["Beginner", "Intermediate", "Advanced"].map(x => <option key={x}>{x}</option>)}</select></label>
        <label>Conversation mode<select value={mode} disabled={active || busy} onChange={e => setMode(e.target.value)}>{MODES.map(x => <option key={x.value} value={x.value}>{x.label}</option>)}</select></label>
      </div>
      <div className="mock-mode-note"><span>{mode === "handsfree" ? <Headphones size={17}/> : <Mic size={17}/>}</span><div><b>{MODES.find(x => x.value === mode)?.label}</b><p>{MODES.find(x => x.value === mode)?.detail} You can also type an answer if your browser doesn't support speech recognition.</p></div></div>
      <div className="mock-options"><label className="mock-check"><input type="checkbox" checked={speakAnswers} onChange={e => setSpeakAnswers(e.target.checked)} /> Read questions aloud</label><span>About {TOTAL_QUESTIONS} questions · Browser microphone permission required for speech input</span></div>
      <div className="mock-action-row">{!active ? <button className="btn primary" onClick={startInterview} disabled={busy}><Play size={16}/>{busy ? "Preparing…" : report ? "Start new interview" : "Start interview"}</button> : <button className="btn danger" onClick={stopInterview}><Square size={15}/> End interview</button>}{report && <button className="btn secondary" onClick={restart}><RotateCcw size={15}/> Reset session</button>}</div>
    </section>

    {(active || turns.length > 0 || report) && <section className="mock-session panel">
      <div className="mock-session-top"><div><span className="mock-kicker">LIVE SESSION</span><h3>{report ? "Interview report" : `Question ${Math.min(turns.length + 1, TOTAL_QUESTIONS)} of ${TOTAL_QUESTIONS}`}</h3></div><div className="mock-progress"><span style={{ width: `${Math.min(100, turns.length / TOTAL_QUESTIONS * 100)}%` }}/></div></div>
      {!report && <><div className={`mock-avatar ${speaking ? "speaking" : listening ? "listening" : ""}`}><div className="mock-avatar-ring"/><Headphones size={30}/></div><p className="mock-status">{speaking ? "CareerMate is speaking…" : listening ? "Listening to you…" : busy ? "Thinking about your answer…" : status}</p><div className="mock-question"><span>INTERVIEWER</span><p>{question}</p></div>
      <div className="mock-controls">{!listening ? <button className="btn primary" onClick={listen} disabled={!active || busy || speaking}><Mic size={16}/> {mode === "handsfree" ? "Start / retry microphone" : "Answer with microphone"}</button> : <button className="btn danger" onClick={stopListening}><MicOff size={16}/> Stop listening</button>}
      <button className="btn secondary" onClick={() => { if (question) speak(question); }} disabled={!question || speaking}><Volume2 size={16}/> Repeat question</button>
      <button className="btn secondary" onClick={() => { if ("speechSynthesis" in window) window.speechSynthesis.cancel(); setSpeaking(false); }} disabled={!speaking}><VolumeX size={16}/> Stop voice</button></div>
      <form className="mock-answer-form" onSubmit={handleTypedSubmit}><label htmlFor="mock-answer"><MessageSquare size={15}/> Your answer / speech transcript</label><textarea id="mock-answer" value={draft} onChange={e => setDraft(e.target.value)} rows={4} placeholder="Speak into your microphone or type your answer here…" disabled={busy}/><div className="mock-answer-bottom"><span>Tip: explain your reasoning and give a short example.</span><button className="btn primary" type="submit" disabled={busy || !draft.trim()}><Send size={15}/>{busy ? "Evaluating…" : "Submit answer"}</button></div></form></>}
      {error && <div className="mock-error">{error}</div>}
      {turns.length > 0 && <div className="mock-turn-list"><h4><CheckCircle2 size={16}/> Answer feedback</h4>{turns.map((turn, i) => <details className="mock-turn" key={`${i}-${turn.question}`} open={i === turns.length - 1 && !report}><summary><span>Q{i + 1}</span><b>{turn.question}</b><strong>{turn.score}/10</strong></summary><div className="mock-turn-content"><p><b>Your answer:</b> {turn.answer}</p><div className="prose"><ReactMarkdown remarkPlugins={[remarkGfm]}>{turn.feedback}</ReactMarkdown></div></div></details>)}</div>}
      {report && <div className="mock-report"><div className="mock-report-score"><Award size={23}/><div><span>OVERALL SCORE</span><strong>{report.average.toFixed(1)}<small>/10</small></strong></div></div><div className="mock-report-grid"><div><small>Questions answered</small><b>{report.count}</b></div><div><small>Completion</small><b>{Math.round(report.count / TOTAL_QUESTIONS * 100)}%</b></div><div><small>Performance band</small><b>{report.average >= 8 ? "Strong" : report.average >= 6 ? "Developing" : "Needs practice"}</b></div></div><p>Scores are AI-generated coaching estimates, not an official hiring decision. Review the feedback for specific next steps.</p><button className="btn primary" onClick={restart}><RotateCcw size={15}/> Practice again</button></div>}
    </section>}
    <div className="mock-footnote"><Mic size={15}/><p><b>Browser compatibility:</b> Voice input works best in current Google Chrome on localhost or HTTPS. Speech recognition support varies by browser and language. If unavailable, use the answer box; the AI evaluation and report still work.</p></div>
  </div>;
}
