import React, { useState, useEffect, useCallback } from 'react';
import { 
  Brain, 
  Code, 
  MessageSquare, 
  ChevronRight, 
  CheckCircle2, 
  Clock, 
  BarChart3, 
  User, 
  FileText, 
  RefreshCw,
  Trophy,
  ArrowRight,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Radar, 
  RadarChart, 
  PolarGrid, 
  PolarAngleAxis, 
  ResponsiveContainer 
} from 'recharts';
import ReactMarkdown from 'react-markdown';
import { 
  InterviewRound, 
  InterviewState, 
  Question, 
  generateQuestions, 
  evaluateRound, 
  generateFinalReport 
} from './services/geminiService';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function App() {
  const [step, setStep] = useState<'setup' | 'interview' | 'evaluating' | 'report'>('setup');
  const [state, setState] = useState<InterviewState>({
    role: '',
    resume: '',
    currentRound: InterviewRound.APTITUDE,
    currentQuestionIndex: 0,
    questions: [],
    answers: {},
    scores: { aptitude: 0, technical: 0, communication: 0 },
    feedback: { aptitude: '', technical: '', communication: '' }
  });
  const [loading, setLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(600); // 10 minutes for Aptitude
  const [finalReport, setFinalReport] = useState<any>(null);

  // Timer for Aptitude Round
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (step === 'interview' && state.currentRound === InterviewRound.APTITUDE && timeLeft > 0) {
      timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    } else if (timeLeft === 0 && state.currentRound === InterviewRound.APTITUDE) {
      handleRoundComplete();
    }
    return () => clearInterval(timer);
  }, [step, state.currentRound, timeLeft]);

  const startInterview = async () => {
    if (!state.role) return;
    setLoading(true);
    try {
      const questions = await generateQuestions(state.role, state.resume, InterviewRound.APTITUDE);
      setState(prev => ({ ...prev, questions, currentQuestionIndex: 0 }));
      setStep('interview');
    } catch (error) {
      console.error("Failed to start interview:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAnswer = (answer: string) => {
    setState(prev => ({
      ...prev,
      answers: { ...prev.answers, [prev.questions[prev.currentQuestionIndex].id]: answer }
    }));
  };

  const nextQuestion = () => {
    if (state.currentQuestionIndex < state.questions.length - 1) {
      setState(prev => ({ ...prev, currentQuestionIndex: prev.currentQuestionIndex + 1 }));
    } else {
      handleRoundComplete();
    }
  };

  const handleRoundComplete = async () => {
    setStep('evaluating');
    setLoading(true);
    try {
      const evaluation = await evaluateRound(state.role, state.currentRound, state.questions, state.answers);
      
      const newScores = { ...state.scores };
      const newFeedback = { ...state.feedback };

      if (state.currentRound === InterviewRound.APTITUDE) {
        newScores.aptitude = evaluation.score;
        newFeedback.aptitude = evaluation.feedback;
      } else if (state.currentRound === InterviewRound.TECHNICAL) {
        newScores.technical = evaluation.score;
        newFeedback.technical = evaluation.feedback;
      } else if (state.currentRound === InterviewRound.HR) {
        newScores.communication = evaluation.score;
        newFeedback.communication = evaluation.feedback;
      }

      const nextRoundMap: Record<InterviewRound, InterviewRound> = {
        [InterviewRound.APTITUDE]: InterviewRound.TECHNICAL,
        [InterviewRound.TECHNICAL]: InterviewRound.HR,
        [InterviewRound.HR]: InterviewRound.COMPLETED,
        [InterviewRound.COMPLETED]: InterviewRound.COMPLETED
      };

      const nextRound = nextRoundMap[state.currentRound];

      if (nextRound === InterviewRound.COMPLETED) {
        const report = await generateFinalReport({ ...state, scores: newScores, feedback: newFeedback });
        setFinalReport(report);
        setState(prev => ({ ...prev, scores: newScores, feedback: newFeedback, currentRound: nextRound }));
        setStep('report');
      } else {
        const nextQuestions = await generateQuestions(state.role, state.resume, nextRound);
        setState(prev => ({
          ...prev,
          scores: newScores,
          feedback: newFeedback,
          currentRound: nextRound,
          questions: nextQuestions,
          currentQuestionIndex: 0,
          answers: {} // Reset answers for the next round
        }));
        setStep('interview');
      }
    } catch (error) {
      console.error("Evaluation failed:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const radarData = [
    { subject: 'Aptitude', A: state.scores.aptitude, fullMark: 10 },
    { subject: 'Technical', A: state.scores.technical, fullMark: 10 },
    { subject: 'Communication', A: state.scores.communication, fullMark: 10 },
  ];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 md:p-8">
      <div className="w-full max-w-4xl">
        <header className="mb-16 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="inline-block px-3 py-1 border border-black/10 rounded-full mb-6"
          >
            <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-gray-400">Professional Assessment Suite</span>
          </motion.div>
          <motion.h1 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-5xl md:text-7xl font-serif italic mb-4 tracking-tight"
          >
            xcodeez
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-gray-400 text-sm font-light max-w-md mx-auto"
          >
            Advanced AI-driven evaluation system for technical and behavioral excellence.
          </motion.p>
        </header>

        <AnimatePresence mode="wait">
          {step === 'setup' && (
            <motion.div 
              key="setup"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="glass-card p-10 md:p-16 max-w-2xl mx-auto"
            >
              <div className="space-y-10">
                <div>
                  <span className="section-label">01. Position Details</span>
                  <input 
                    type="text" 
                    placeholder="Target Role (e.g. Software Architect)"
                    className="input-field text-lg py-4"
                    value={state.role}
                    onChange={(e) => setState(prev => ({ ...prev, role: e.target.value }))}
                  />
                </div>
                <div>
                  <span className="section-label">02. Contextual Background</span>
                  <textarea 
                    placeholder="Paste resume highlights or specific skills to customize the evaluation..."
                    className="input-field min-h-[120px] resize-none"
                    value={state.resume}
                    onChange={(e) => setState(prev => ({ ...prev, resume: e.target.value }))}
                  />
                </div>
                <button 
                  onClick={startInterview}
                  disabled={!state.role || loading}
                  className="btn-primary w-full flex items-center justify-center gap-3 py-4"
                >
                  {loading ? <Loader2 className="animate-spin" size={18} /> : <ArrowRight size={18} />}
                  Initialize Assessment
                </button>
              </div>
            </motion.div>
          )}

          {step === 'interview' && (
            <motion.div 
              key="interview"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-8"
            >
              {/* Header Info */}
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-gray-100">
                <div className="flex items-center gap-5">
                  <div className={cn(
                    "w-12 h-12 flex items-center justify-center rounded-lg border",
                    state.currentRound === InterviewRound.APTITUDE ? "bg-gray-50 border-gray-200 text-gray-900" :
                    state.currentRound === InterviewRound.TECHNICAL ? "bg-gray-900 border-gray-900 text-white" :
                    "bg-white border-gray-200 text-gray-900"
                  )}>
                    {state.currentRound === InterviewRound.APTITUDE && <Brain size={20} />}
                    {state.currentRound === InterviewRound.TECHNICAL && <Code size={20} />}
                    {state.currentRound === InterviewRound.HR && <MessageSquare size={20} />}
                  </div>
                  <div>
                    <span className="section-label mb-1">Phase {state.currentRound === InterviewRound.APTITUDE ? '01' : state.currentRound === InterviewRound.TECHNICAL ? '02' : '03'}</span>
                    <h2 className="text-xl font-medium tracking-tight">{state.currentRound} ASSESSMENT</h2>
                  </div>
                </div>
                
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <span className="section-label mb-1">Progress</span>
                    <p className="text-sm font-mono">{state.currentQuestionIndex + 1} / {state.questions.length}</p>
                  </div>
                  {state.currentRound === InterviewRound.APTITUDE && (
                    <div className="text-right">
                      <span className="section-label mb-1">Time Remaining</span>
                      <p className={cn("text-sm font-mono", timeLeft < 60 ? "text-red-500 font-bold" : "text-gray-900")}>
                        {formatTime(timeLeft)}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="glass-card p-10 md:p-16 min-h-[450px] flex flex-col">
                <div className="flex-1">
                  <h3 className="text-2xl md:text-3xl font-light mb-12 leading-snug text-gray-800">
                    {state.questions[state.currentQuestionIndex]?.text}
                  </h3>

                  {state.currentRound === InterviewRound.APTITUDE ? (
                    <div className="grid grid-cols-1 gap-3 max-w-2xl">
                      {state.questions[state.currentQuestionIndex]?.options?.map((option, i) => (
                        <button
                          key={i}
                          onClick={() => handleAnswer(option)}
                          className={cn(
                            "p-5 text-left rounded-lg border transition-all text-sm flex items-center gap-4",
                            state.answers[state.questions[state.currentQuestionIndex].id] === option
                              ? "bg-gray-900 text-white border-gray-900"
                              : "bg-white border-gray-200 hover:border-gray-400"
                          )}
                        >
                          <span className={cn(
                            "w-6 h-6 flex items-center justify-center rounded border text-[10px] font-bold",
                            state.answers[state.questions[state.currentQuestionIndex].id] === option
                              ? "border-white/20 bg-white/10"
                              : "border-gray-200 bg-gray-50 text-gray-400"
                          )}>
                            {String.fromCharCode(65 + i)}
                          </span>
                          {option}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="relative">
                      <textarea
                        placeholder={state.currentRound === InterviewRound.TECHNICAL ? "Input your technical solution or detailed explanation..." : "Provide your response..."}
                        className="input-field min-h-[300px] font-mono text-sm leading-relaxed p-6"
                        value={state.answers[state.questions[state.currentQuestionIndex]?.id] || ''}
                        onChange={(e) => handleAnswer(e.target.value)}
                      />
                      <div className="absolute top-4 right-4 opacity-10 pointer-events-none">
                        {state.currentRound === InterviewRound.TECHNICAL ? <Code size={48} /> : <MessageSquare size={48} />}
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-12 pt-8 border-t border-gray-50 flex justify-end">
                  <button 
                    onClick={nextQuestion}
                    disabled={!state.answers[state.questions[state.currentQuestionIndex]?.id]}
                    className="btn-primary flex items-center gap-2 px-8"
                  >
                    {state.currentQuestionIndex === state.questions.length - 1 ? 'Complete Phase' : 'Next Question'}
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {step === 'evaluating' && (
            <motion.div 
              key="evaluating"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-32 space-y-8"
            >
              <div className="w-16 h-16 border-2 border-gray-100 border-t-gray-900 rounded-full animate-spin" />
              <div className="text-center">
                <span className="section-label">System Processing</span>
                <h2 className="text-2xl font-serif italic">Evaluating Performance Metrics</h2>
              </div>
            </motion.div>
          )}

          {step === 'report' && (
            <motion.div 
              key="report"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-10"
            >
              {/* Report Header */}
              <div className="glass-card p-12 md:p-20 overflow-hidden relative">
                <div className="flex flex-col md:flex-row items-center justify-between gap-16">
                  <div className="text-center md:text-left flex-1">
                    <span className="section-label">Final Evaluation Report</span>
                    <h2 className="text-5xl font-serif italic mb-4">Assessment Complete</h2>
                    <p className="text-gray-400 font-light mb-10">Candidate evaluation for <span className="text-gray-900 font-medium">{state.role}</span></p>
                    
                    <div className="inline-flex items-baseline gap-2">
                      <span className="text-8xl font-bold tracking-tighter">{finalReport?.finalScore}</span>
                      <span className="text-2xl text-gray-300 font-light">/ 10.0</span>
                    </div>
                    <p className="section-label mt-4">Composite Score</p>
                  </div>
                  
                  <div className="w-full md:w-80 h-80 bg-gray-50 rounded-2xl p-6 border border-gray-100">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                        <PolarGrid stroke="#E5E7EB" />
                        <PolarAngleAxis dataKey="subject" tick={{ fill: '#9CA3AF', fontSize: 9, fontWeight: 600, letterSpacing: '0.05em' }} />
                        <Radar
                          name="Candidate"
                          dataKey="A"
                          stroke="#111827"
                          fill="#111827"
                          fillOpacity={0.05}
                        />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Score Matrix */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  { title: 'Aptitude', score: state.scores.aptitude, feedback: state.feedback.aptitude, icon: Brain },
                  { title: 'Technical', score: state.scores.technical, feedback: state.feedback.technical, icon: Code },
                  { title: 'Communication', score: state.scores.communication, feedback: state.feedback.communication, icon: MessageSquare },
                ].map((item, i) => (
                  <div key={i} className="glass-card p-8">
                    <div className="flex items-center justify-between mb-6">
                      <item.icon className="text-gray-400" size={20} />
                      <span className="font-mono text-sm font-bold">{item.score.toFixed(1)}</span>
                    </div>
                    <h4 className="section-label mb-3">{item.title}</h4>
                    <p className="text-sm text-gray-500 leading-relaxed font-light">{item.feedback}</p>
                  </div>
                ))}
              </div>

              {/* Analysis */}
              <div className="glass-card p-10 md:p-16 space-y-16">
                <div>
                  <span className="section-label">Executive Summary</span>
                  <div className="markdown-body text-gray-600 leading-relaxed font-light text-lg">
                    <ReactMarkdown>{finalReport?.summary}</ReactMarkdown>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-16 pt-10 border-t border-gray-50">
                  <div>
                    <span className="section-label">Key Strengths</span>
                    <ul className="space-y-5">
                      {finalReport?.strengths?.map((s: string, i: number) => (
                        <li key={i} className="flex items-start gap-4">
                          <div className="w-1.5 h-1.5 rounded-full bg-gray-900 mt-2 shrink-0" />
                          <span className="text-sm text-gray-600 font-light">{s}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <span className="section-label">Development Areas</span>
                    <ul className="space-y-5">
                      {finalReport?.improvementTips?.map((tip: string, i: number) => (
                        <li key={i} className="flex items-start gap-4">
                          <ArrowRight className="text-gray-300 mt-0.5 shrink-0" size={16} />
                          <span className="text-sm text-gray-600 font-light">{tip}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="pt-10 border-t border-gray-50 flex flex-col md:flex-row items-center justify-between gap-8">
                  <div className="flex items-center gap-4">
                    <span className="section-label mb-0">Data Export</span>
                    <code className="text-[10px] font-mono bg-gray-50 px-3 py-1.5 rounded border border-gray-100 text-gray-400">
                      {JSON.stringify({
                        apt: state.scores.aptitude,
                        tech: state.scores.technical,
                        comm: state.scores.communication,
                        final: finalReport?.finalScore
                      })}
                    </code>
                  </div>
                  <button 
                    onClick={() => window.location.reload()}
                    className="btn-secondary flex items-center gap-2"
                  >
                    <RefreshCw size={14} />
                    Reset Session
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <footer className="mt-24 pb-16 text-center">
          <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-gray-300">
            xcodeez Assessment Engine v1.0.4
          </p>
        </footer>
      </div>
    </div>
  );
}
