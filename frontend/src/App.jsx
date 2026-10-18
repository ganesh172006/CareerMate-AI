import React, { useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Target, MessageCircle, Mic, BriefcaseBusiness, BookOpen, Map, FileText, Lightbulb, ChartNoAxesCombined, Send, Menu, X, Trash2, Sparkles, LoaderCircle, ExternalLink, ShieldCheck, Volume2 } from "lucide-react";
import "./styles.css";
import MockInterview from "./MockInterview.jsx";

const API = (import.meta.env.VITE_API_URL || "http://localhost:8000").replace(/\/$/, "");
const NAV = [
 ["AI Chat",MessageCircle],["Mock Interview",BriefcaseBusiness],["Voice Fluency",Mic],
 ["Question Bank",BookOpen],["Roadmap",Map],["Resume Builder",FileText],["Projects & Ideas",Lightbulb],["Performance",ChartNoAxesCombined]
];
const starter = [{role:"assistant",content:"Hey! I'm CareerMate AI, your placement preparation companion. Ask me about coding, DSA, interviews, resumes, projects, or career planning."}];
function App(){
 const [page,setPage]=useState("AI Chat"),[mobileNav,setMobileNav]=useState(false);
 const [apiStatus,setApiStatus]=useState("checking"),[providerName,setProviderName]=useState("AI"),[messages,setMessages]=useState(starter),[input,setInput]=useState(""),[busy,setBusy]=useState(false);
 const [models,setModels]=useState([]),[selectedModel,setSelectedModel]=useState("auto"),[modelsError,setModelsError]=useState("");
 const [cid]=useState(()=>localStorage.getItem("cm-cid") || crypto.randomUUID());
 const [questions,setQuestions]=useState({}),[category,setCategory]=useState("Java"),[difficulty,setDifficulty]=useState("Intermediate"),[questionBusy,setQuestionBusy]=useState(false);
 const [questionBank,setQuestionBank]=useState({}),[bankSearch,setBankSearch]=useState(""),[bankDifficulty,setBankDifficulty]=useState("Intermediate"),[bankBusy,setBankBusy]=useState(false),[bankError,setBankError]=useState("");
 const [question,setQuestion]=useState("Tell me about yourself."),[answer,setAnswer]=useState(""),[feedback,setFeedback]=useState(""),[voiceQuestion,setVoiceQuestion]=useState(""),[voiceFeedback,setVoiceFeedback]=useState(""),[voiceCategory,setVoiceCategory]=useState("Java"),[voiceDifficulty,setVoiceDifficulty]=useState("Intermediate"),[voiceQuestionBusy,setVoiceQuestionBusy]=useState(false);
 const [resumeRole,setResumeRole]=useState("Software Engineer Intern"),[skills,setSkills]=useState("Java, Python, DSA, SQL"),[details,setDetails]=useState(""),[resume,setResume]=useState("");
 const [domain,setDomain]=useState("AI/ML"),[ideas,setIdeas]=useState(""),[performance,setPerformance]=useState(null),[roadmap,setRoadmap]=useState([]);
 const [recording,setRecording]=useState(false),[recorded,setRecorded]=useState(null);
 const bottom=useRef(null), recorder=useRef(null), chunks=useRef([]);
 const refreshAIStatus = async () => {
  try {
    const response = await fetch(`${API}/api/health`);
    if (!response.ok) throw new Error("Backend health check failed");
    const data = await response.json();
    const provider = String(data.ai_provider || "gemini").toLowerCase();
    const labels = { gemini: "Gemini AI", openai: "OpenAI", groq: "Groq", ollama: "Ollama (local)" };
    setProviderName(labels[provider] || provider.toUpperCase());
    const configured = provider === "gemini" ? data.gemini_configured
      : provider === "openai" ? data.openai_configured
      : provider === "groq" ? data.groq_configured
      : provider === "ollama" ? data.ollama_available
      : true;
    setApiStatus(configured ? "connected" : "missing-model");
  } catch {
    setApiStatus("offline");
  }
};
useEffect(()=>{
  localStorage.setItem("cm-cid",cid);
  refreshAIStatus();
  fetch(`${API}/api/questions`).then(r=>r.json()).then(setQuestions).catch(()=>{});
  fetch(`${API}/api/question-bank`).then(r=>r.json()).then(setQuestionBank).catch(e=>setBankError(`Question Bank could not load: ${e.message}`));
  fetch(`${API}/api/roadmap`).then(r=>r.json()).then(setRoadmap).catch(()=>{});
},[]);
 useEffect(()=>{bottom.current?.scrollIntoView({behavior:"smooth"});},[messages,busy]);
 const ask=async()=>{
  const text=input.trim(); if(!text||busy)return;
  const next=[...messages,{role:"user",content:text}]; setMessages(next);setInput("");setBusy(true);
  try{const r=await fetch(`${API}/api/chat`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({conversation_id:cid,message:text,history:next.slice(-13,-1),model:selectedModel})});const d=await r.json();if(!r.ok)throw new Error(d.detail||"Request failed");setMessages(m=>[...m,{role:"assistant",content:d.answer}]);}
  catch(e){setMessages(m=>[...m,{role:"assistant",content:`I couldn't reach the AI service: ${e.message}. Check that the backend is running and configured.`}]);}
  finally{setBusy(false);}
 };
 const post=async(path,data)=>{const r=await fetch(`${API}${path}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(data)});const d=await r.json();if(!r.ok)throw new Error(d.detail||"Request failed");return d;};
 const runEvaluate=async()=>{if(!answer.trim())return setFeedback("Please write your answer first.");setBusy(true);setFeedback("");try{setFeedback((await post("/api/evaluate",{question,answer,category,difficulty})).feedback);}catch(e){setFeedback(`Error: ${e.message}`)}finally{setBusy(false)}};
 const runResume=async()=>{setBusy(true);try{setResume((await post("/api/resume",{role:resumeRole,skills,details})).resume)}catch(e){setResume(`Error: ${e.message}`)}finally{setBusy(false)}};
 const runIdeas=async()=>{setBusy(true);try{setIdeas((await post("/api/projects",{domain})).ideas)}catch(e){setIdeas(`Error: ${e.message}`)}finally{setBusy(false)}};
 const chooseQuestion=async()=>{
  if(questionBusy)return;
  setQuestionBusy(true);setFeedback("");
  try{const data=await post("/api/interview-question",{category,difficulty});if(!data.question)throw new Error("The local AI returned no question.");setQuestion(data.question);setAnswer("");}
  catch(e){setFeedback(`Question generation failed: ${e.message}`)}
  finally{setQuestionBusy(false)}
 };
 const generateVoiceQuestion=async()=>{
  if(voiceQuestionBusy||recording)return;
  setVoiceQuestionBusy(true);setVoiceFeedback("");setRecorded(null);
  try{const data=await post("/api/interview-question",{category:voiceCategory,difficulty:voiceDifficulty});if(!data.question)throw new Error("The local AI returned no question.");setVoiceQuestion(data.question);}
  catch(e){setVoiceFeedback(`Question generation failed: ${e.message}`)}
  finally{setVoiceQuestionBusy(false)}
 };
 const generateBankQuestions=async()=>{if(bankBusy)return;setBankBusy(true);setBankError("");try{const data=await post("/api/question-bank/generate",{category,difficulty:bankDifficulty,count:5});setQuestionBank(prev=>({...prev,[data.category]:[...(prev[data.category]||[]),...(data.items||[])]}));}catch(e){setBankError(`Could not generate more questions: ${e.message}`)}finally{setBankBusy(false)}};
 const clearChat=()=>{setMessages(starter);};
 const startRecord=async()=>{if(!voiceQuestion.trim())return setVoiceFeedback("Generate a practice question first.");setVoiceFeedback("");try{const stream=await navigator.mediaDevices.getUserMedia({audio:true});const preferredTypes=["audio/webm;codecs=opus","audio/webm","audio/mp4"];const mimeType=preferredTypes.find(type=>MediaRecorder.isTypeSupported(type));const mr=mimeType?new MediaRecorder(stream,{mimeType}):new MediaRecorder(stream);recorder.current=mr;chunks.current=[];mr.ondataavailable=e=>{if(e.data.size)chunks.current.push(e.data)};mr.onstop=()=>{const blob=new Blob(chunks.current,{type:mr.mimeType||"application/octet-stream"});setRecorded(blob);stream.getTracks().forEach(t=>t.stop())};mr.start();setRecording(true)}catch(e){setVoiceFeedback(`Recording error: ${e.message}`)}};
 const stopRecord=()=>{if(recorder.current?.state==="recording")recorder.current.stop();setRecording(false)};
 const analyzeVoice=async()=>{if(!recorded)return;setBusy(true);setVoiceFeedback("");try{const mime=recorded.type.toLowerCase();const extension=mime.includes("webm")?"webm":mime.includes("mp4")?"mp4":mime.includes("ogg")?"ogg":mime.includes("wav")?"wav":"bin";const form=new FormData();form.append("question",voiceQuestion);form.append("audio",recorded,`answer.${extension}`);const r=await fetch(`${API}/api/voice?question=${encodeURIComponent(voiceQuestion)}`,{method:"POST",body:form});const d=await r.json();if(!r.ok)throw new Error(d.detail||"Analysis failed");setVoiceFeedback(d.feedback)}catch(e){setVoiceFeedback(`Voice analysis error: ${e.message}`)}finally{setBusy(false)}};
 const loadPerformance=async()=>{try{setPerformance(await (await fetch(`${API}/api/performance`)).json())}catch(e){setPerformance({error:e.message})}};
 useEffect(()=>{if(page==="Performance")loadPerformance()},[page]);
 const statusText={checking:"Checking AI connection…",connected:`${providerName} connected`, "missing-model":"AI provider not configured",offline:"Backend offline"}[apiStatus];
 return <div className="app-shell">
  <aside className={`sidebar ${mobileNav?"show":""}`}>
   <div className="brand"><span className="brand-icon"><Target size={22}/></span><div><b>CareerMate AI</b><small>Your Placement Preparation Companion</small></div><button className="icon mobile-close" onClick={()=>setMobileNav(false)}><X/></button></div>
   <div className="nav-label">WORKSPACE</div>
   <nav>{NAV.map(([label,Icon])=><button key={label} className={`nav-item ${page===label?"active":""}`} onClick={()=>{setPage(label);setMobileNav(false)}}><Icon size={18}/><span>{label}</span></button>)}</nav>
   <div className="sidebar-bottom"><div className={`status-dot ${apiStatus}`}></div><div><b>{providerName} connection</b><small>{statusText}</small></div></div>
   <p className="sidebar-foot"><ShieldCheck size={14}/> Your API key stays on the backend.</p>
  </aside>
  {mobileNav&&<div className="scrim" onClick={()=>setMobileNav(false)}/>}
  <main className="main">
   <header className="topbar"><button className="icon menu-button" onClick={()=>setMobileNav(true)}><Menu/></button><div><span className="eyebrow">PLACEMENT PREPARATION</span><h1>{page}</h1></div><div className="top-right"><span className="status-pill"><span className={`status-dot ${apiStatus}`}></span>{statusText}</span></div></header>
   <div className="content">
    {page==="AI Chat"&&<><section className="hero"><div className="hero-kicker"><Sparkles size={15}/> YOUR CAREER, YOUR NEXT STEP</div><h2>Practice smarter.<br/><span>Build confidence.</span></h2><p>Ask questions, rehearse interviews, and get ready for your next opportunity.</p><div className="hero-pills"><span>DSA & Core CS</span><span>Mock interviews</span><span>Resume guidance</span></div></section>
      <div className="section-heading"><div><h2>AI Chat Assistant</h2><p>Career-focused answers powered by your configured AI provider</p></div><button className="btn secondary" onClick={clearChat}><Trash2 size={15}/> Clear chat</button></div>
      <div className="chat-panel"><div className="model-toolbar"><div><b>{providerName} assistant</b><small>{apiStatus === "connected" ? "Using the backend's configured provider and fallback order" : statusText}</small></div><span className="provider-model">Automatic provider selection</span><button className="btn secondary" type="button" onClick={refreshAIStatus}>Refresh status</button></div><div className="messages">{messages.map((m,i)=><div key={i} className={`message ${m.role}`}><div className="avatar">{m.role==="user"?"GA":<Target size={17}/>}</div><div className="bubble"><div className="message-author">{m.role==="user"?"You":"CareerMate AI"}</div><div className="prose"><ReactMarkdown remarkPlugins={[remarkGfm]} components={{ hr: () => null }}>{m.content}</ReactMarkdown></div></div></div>)}{busy&&<div className="message assistant"><div className="avatar"><Target size={17}/></div><div className="bubble"><LoaderCircle className="spin"/> Thinking…</div></div>}<div ref={bottom}/></div>
       <form className="chat-compose" onSubmit={e=>{e.preventDefault();ask()}}><input value={input} onChange={e=>setInput(e.target.value)} placeholder="Ask about DSA, interviews, projects…" maxLength={6000}/><button className="send-button" disabled={busy||!input.trim()}><Send size={18}/></button></form><p className="chat-note">AI can make mistakes. Verify important technical details.</p></div>
      <div className="quick-grid">{[["Explain OOP in Java","Core CS"],["Give me a DSA practice plan","DSA"],["Help me explain my project","Projects"]].map(([q,t])=><button key={q} className="quick-card" onClick={()=>{setInput(q)}}><small>{t}</small><span>{q}</span><ExternalLink size={14}/></button>)}</div>
    </>}
    {page==="Mock Interview"&&<MockInterview categories={Object.keys(questions)} defaultCategory={category} defaultDifficulty={difficulty}/> }
    {page==="Voice Fluency"&&<><div className="page-intro"><span className="round-icon"><Mic/></span><div><h2>Voice Fluency</h2><p>Generate placement questions, record your answer, and track speaking pace, filler words, and pauses. Pronunciation scoring is available when Azure Speech Assessment is configured; all automated scores are estimates.</p></div></div><div className="panel"><div className="form-grid"><label>Question category<select value={voiceCategory} onChange={e=>{setVoiceCategory(e.target.value);setVoiceQuestion("");setRecorded(null);setVoiceFeedback("")}}>{Object.keys(questions).map(k=><option key={k}>{k}</option>)}</select></label><label>Difficulty<select value={voiceDifficulty} onChange={e=>{setVoiceDifficulty(e.target.value);setVoiceQuestion("");setRecorded(null);setVoiceFeedback("")}}>{["Beginner","Intermediate","Advanced"].map(x=><option key={x}>{x}</option>)}</select></label><button className="btn primary" onClick={generateVoiceQuestion} disabled={voiceQuestionBusy||recording}>{voiceQuestionBusy?<><LoaderCircle className="spin"/> Generating…</>:<><Sparkles size={16}/> Generate fresh question</>}</button><div className="full result"><h3>Your practice question</h3><p>{voiceQuestion||"Choose a category and difficulty, then generate a fresh question to begin."}</p></div></div><div className="record-area"><div className={`mic-orb ${recording?"recording":""}`}><Mic size={30}/></div><h3>{recording?"Recording your answer…":recorded?"Recording ready":"Ready when you are"}</h3><p>Allow microphone access. Aim for a 30–90 second response.</p><div className="button-row">{!recording?<button className="btn primary" onClick={startRecord} disabled={!voiceQuestion.trim()||voiceQuestionBusy}><Mic size={16}/> Start recording</button>:<button className="btn danger" onClick={stopRecord}>Stop recording</button>}{recorded&&<button className="btn secondary" onClick={analyzeVoice} disabled={busy}>{busy?<LoaderCircle className="spin"/>:"Analyze my answer"}</button>}</div>{recorded&&<audio controls src={URL.createObjectURL(recorded)}/>}</div>{voiceFeedback&&<div className="result"><h3>Voice feedback</h3><div className="prose"><ReactMarkdown remarkPlugins={[remarkGfm]} components={{ hr: () => null }}>{voiceFeedback}</ReactMarkdown></div></div>}</div></>}
    {page==="Question Bank"&&<><div className="page-intro"><span className="round-icon"><BookOpen/></span><div><h2>Question Bank</h2><p>Study interview questions with clear answers, search by keyword, and generate more practice questions with your configured AI provider.</p></div></div><div className="panel"><div className="form-grid"><label>Subject<select value={category} onChange={e=>setCategory(e.target.value)}>{Object.keys(questions).map(k=><option key={k}>{k}</option>)}</select></label><label>Difficulty for new questions<select value={bankDifficulty} onChange={e=>setBankDifficulty(e.target.value)}>{["Beginner","Intermediate","Advanced"].map(x=><option key={x}>{x}</option>)}</select></label><button className="btn primary" onClick={generateBankQuestions} disabled={bankBusy}>{bankBusy?<><LoaderCircle className="spin"/> Generating…</>:<><Sparkles size={16}/> Generate 5 more questions</>}</button><label className="full">Search this subject<input value={bankSearch} onChange={e=>setBankSearch(e.target.value)} placeholder="Search questions or answers…"/></label></div>{bankError&&<p className="error">{bankError}</p>}<p className="chat-note">{(questionBank[category]||[]).length} questions currently available in {category}. Newly generated questions are added for this session.</p><div className="question-list">{(questionBank[category]||[]).filter(item=>`${item.question} ${item.answer}`.toLowerCase().includes(bankSearch.toLowerCase())).map((item,i)=><details key={`${item.question}-${i}`}><summary><span className="question-number">{String(i+1).padStart(2,"0")}</span>{item.question}</summary><div className="result"><h3>Answer</h3><div className="prose"><ReactMarkdown remarkPlugins={[remarkGfm]}>{item.answer}</ReactMarkdown></div><div className="question-actions"><button className="btn secondary" onClick={()=>{setPage("AI Chat");setInput(`Explain this in an interview-ready way with a simple example: ${item.question}`)}}>Ask AI to explain</button><button className="btn secondary" onClick={()=>{setQuestion(item.question);sessionStorage.setItem("cm-practice-question",item.question);setCategory(category);setAnswer("");setPage("Mock Interview")}}>Practice in mock interview</button></div></div></details>)}</div>{(questionBank[category]||[]).filter(item=>`${item.question} ${item.answer}`.toLowerCase().includes(bankSearch.toLowerCase())).length===0&&<p>No matching questions. Try another search or generate more questions.</p>}</div></>}
    {page==="Roadmap"&&<><div className="page-intro"><span className="round-icon"><Map/></span><div><h2>Placement Roadmap</h2><p>Follow these steps in order and use the learning resources to study each topic.</p></div></div><div className="roadmap">{roadmap.map((x,i)=><div className="roadmap-item" key={x.title}><div className="roadmap-step">{String(i+1).padStart(2,"0")}</div><div className="panel"><h3>{x.title}</h3><p>{x.detail}</p>{Array.isArray(x.resources)&&x.resources.length>0&&<div className="resource-list"><h4>Learning resources</h4>{x.resources.map((resource,j)=><a className="resource-link" key={`${resource.url}-${j}`} href={resource.url.startsWith("/")?`#${resource.url}`:resource.url} onClick={resource.url==="/question-bank"?(e)=>{e.preventDefault();setPage("Question Bank");setMobileNav(false)}:undefined} target={resource.url.startsWith("/")?undefined:"_blank"} rel={resource.url.startsWith("/")?undefined:"noreferrer"}><ExternalLink size={15}/>{resource.label}</a>)}</div>}</div></div>)}</div></>}
    {page==="Resume Builder"&&<><div className="page-intro"><span className="round-icon"><FileText/></span><div><h2>Resume Builder</h2><p>Create truthful, ATS-friendly resume content from your real experience.</p></div></div><div className="panel form-grid"><label className="full">Target role<input value={resumeRole} onChange={e=>setResumeRole(e.target.value)}/></label><label className="full">Skills<input value={skills} onChange={e=>setSkills(e.target.value)}/></label><label className="full">Project details and your contribution<textarea value={details} onChange={e=>setDetails(e.target.value)} rows="5" placeholder="What did you build? What did you personally implement? Include metrics only if you measured them."/></label><button className="btn primary" onClick={runResume} disabled={busy}>{busy?"Generating…":"Draft resume content"}</button>{resume&&<div className="result full"><h3>Resume draft</h3><pre>{resume}</pre><button className="btn secondary" onClick={()=>navigator.clipboard.writeText(resume)}>Copy draft</button></div>}</div></>}
    {page==="Projects & Ideas"&&<><div className="page-intro"><span className="round-icon"><Lightbulb/></span><div><h2>Projects & Ideas</h2><p>Explore realistic student projects with an implementation path.</p></div></div><div className="panel form-grid"><label className="full">Domain<select value={domain} onChange={e=>setDomain(e.target.value)}>{["AI/ML","Web Development","Mobile Apps","Cybersecurity","Data Analytics"].map(x=><option key={x}>{x}</option>)}</select></label><button className="btn primary" onClick={runIdeas} disabled={busy}>{busy?"Generating…":"Suggest project ideas"}</button>{ideas&&<div className="result full"><pre>{ideas}</pre></div>}</div></>}
    {page==="Performance"&&<><div className="page-intro"><span className="round-icon"><ChartNoAxesCombined/></span><div><h2>Performance</h2><p>Usage statistics from the backend database. No made-up scores.</p></div></div><div className="metric-grid">{[
  ["Chat questions", performance?.chat_questions ?? "—"],
  ["Historical average", performance?.average_response_ms != null ? `${(performance.average_response_ms / 1000).toFixed(2)} sec` : "—"],
  ["Latest response", performance?.latest_response_ms != null ? `${(performance.latest_response_ms / 1000).toFixed(2)} sec` : "—"],
  ["Recent average (5)", performance?.recent_average_response_ms != null ? `${(performance.recent_average_response_ms / 1000).toFixed(2)} sec` : "—"],
  ["Fastest response", performance?.fastest_response_ms != null ? `${(performance.fastest_response_ms / 1000).toFixed(2)} sec` : "—"],
  ["Mock interviews", performance?.mock_interviews ?? "—"],
  ["Voice sessions", performance?.voice_sessions ?? "—"],
  ["Average pronunciation score", performance?.average_pronunciation_score != null ? `${performance.average_pronunciation_score}/100` : "Not assessed yet"],
  ["Average speaking rate", performance?.average_words_per_minute != null ? `${performance.average_words_per_minute} WPM` : "Not available yet"],
].map(([k, v]) => <div className="metric panel" key={k}><small>{k}</small><strong>{v}</strong></div>)}</div><button className="btn secondary" onClick={loadPerformance}>Refresh statistics</button>{performance?.error&&<p className="error">{performance.error}</p>}<section className="panel" style={{marginTop:16}}><h3>Voice practice history</h3><p className="chat-note">Your latest 20 saved voice sessions. Pronunciation scores appear only when Azure Speech Assessment is configured; speaking rate and filler/pause indicators are approximate local estimates.</p>{(performance?.voice_history||[]).length===0?<p>No voice sessions saved yet. Complete a recording in Voice Fluency to start tracking progress.</p>:<div className="question-list">{performance.voice_history.map((item)=><details key={item.id}><summary><span className="question-number">{String(item.id).padStart(2,"0")}</span><span>{item.question||"Voice practice session"}<small style={{display:"block",opacity:.7,marginTop:4}}>{item.created_at?new Date(item.created_at).toLocaleString():""}</small></span></summary><div className="metric-grid">{[["Pronunciation",item.pronunciation_assessment!=null?`${item.pronunciation_assessment}/100`:"Not assessed"],["Speaking rate",item.words_per_minute!=null?`${item.words_per_minute} WPM`:"—"],["Filler words",item.filler_count??"—"],["Long pauses",item.pause_count??"—"],["Words detected",item.word_count??"—"]].map(([label,value])=><div className="metric panel" key={label}><small>{label}</small><strong>{value}</strong></div>)}</div></details>)}</div>}</section><div className="privacy-box"><ShieldCheck/> <div><b>Privacy and data</b><p>Chat messages and activity are stored in the backend SQLite database for functionality and evaluation. Do not enter passwords or sensitive personal information. Ask the project administrator before using this demo with real personal data.</p></div></div></>}
   </div>
   <footer className="footer"><span>CareerMate AI</span><span>AI-powered placement prep · FastAPI · Verify important technical details.</span><a href={`${API}/docs`} target="_blank" rel="noreferrer">Backend API docs ↗</a></footer>
  </main>
 </div>
}
export default App;
