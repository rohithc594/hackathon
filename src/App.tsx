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
        <header className="mb-12 text-center">
          <motion.h1 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-6xl font-serif italic mb-4"
          >
            AI Interview Pro
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-muted-foreground uppercase tracking-widest text-xs font-mono"
          >
            Powered by Gemini 3.1 Pro • Real-time Evaluation
          </motion.p>
        </header>

        <AnimatePresence mode="wait">
          {step === 'setup' && (
            <motion.div 
              key="setup"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass-card p-8 md:p-12"
            >
              <div className="space-y-8">
                <div>
                  <label className="block text-xs font-mono uppercase mb-2 opacity-50">Target Job Role</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Senior Frontend Engineer"
                    className="input-field text-xl"
                    value={state.role}
                    onChange={(e) => setState(prev => ({ ...prev, role: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono uppercase mb-2 opacity-50">Resume / Skills (Optional)</label>
                  <textarea 
                    placeholder="Paste your resume or key skills here for a more tailored experience..."
                    className="input-field min-h-[150px] resize-none"
                    value={state.resume}
                    onChange={(e) => setState(prev => ({ ...prev, resume: e.target.value }))}
                  />
                </div>
                <button 
                  onClick={startInterview}
                  disabled={!state.role || loading}
                  className="btn-primary w-full flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 className="animate-spin" /> : <Brain size={20} />}
                  Start Interview Process
                </button>
              </div>
            </motion.div>
          )}

          {step === 'interview' && (
            <motion.div 
              key="interview"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              {/* Progress Bar */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "p-2 rounded-lg",
                    state.currentRound === InterviewRound.APTITUDE ? "bg-blue-100 text-blue-600" :
                    state.currentRound === InterviewRound.TECHNICAL ? "bg-purple-100 text-purple-600" :
                    "bg-emerald-100 text-emerald-600"
                  )}>
                    {state.currentRound === InterviewRound.APTITUDE && <Brain size={20} />}
                    {state.currentRound === InterviewRound.TECHNICAL && <Code size={20} />}
                    {state.currentRound === InterviewRound.HR && <MessageSquare size={20} />}
                  </div>
                  <div>
                    <h2 className="font-medium">{state.currentRound} ROUND</h2>
                    <p className="text-xs text-muted-foreground font-mono">
                      Question {state.currentQuestionIndex + 1} of {state.questions.length}
                    </p>
                  </div>
                </div>
                {state.currentRound === InterviewRound.APTITUDE && (
                  <div className="flex items-center gap-2 font-mono text-sm bg-red-50 text-red-600 px-3 py-1 rounded-full">
                    <Clock size={14} />
                    {formatTime(timeLeft)}
                  </div>
                )}
              </div>

              <div className="glass-card p-8 min-h-[400px] flex flex-col">
                <div className="flex-1">
                  <h3 className="text-2xl font-medium mb-8 leading-tight">
                    {state.questions[state.currentQuestionIndex]?.text}
                  </h3>

                  {state.currentRound === InterviewRound.APTITUDE ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {state.questions[state.currentQuestionIndex]?.options?.map((option, i) => (
                        <button
                          key={i}
                          onClick={() => handleAnswer(option)}
                          className={cn(
                            "p-4 text-left rounded-xl border transition-all",
                            state.answers[state.questions[state.currentQuestionIndex].id] === option
                              ? "bg-[#1A1A1A] text-white border-[#1A1A1A]"
                              : "bg-white border-[#E5E7EB] hover:border-[#1A1A1A]"
                          )}
                        >
                          <span className="font-mono mr-3 opacity-50">{String.fromCharCode(65 + i)}.</span>
                          {option}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <textarea
                      placeholder={state.currentRound === InterviewRound.TECHNICAL ? "Write your code or explanation here..." : "Type your response here..."}
                      className="input-field min-h-[250px] font-mono text-sm"
                      value={state.answers[state.questions[state.currentQuestionIndex]?.id] || ''}
                      onChange={(e) => handleAnswer(e.target.value)}
                    />
                  )}
                </div>

                <div className="mt-8 flex justify-end">
                  <button 
                    onClick={nextQuestion}
                    disabled={!state.answers[state.questions[state.currentQuestionIndex]?.id]}
                    className="btn-primary flex items-center gap-2"
                  >
                    {state.currentQuestionIndex === state.questions.length - 1 ? 'Finish Round' : 'Next Question'}
                    <ChevronRight size={18} />
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
              className="flex flex-col items-center justify-center py-20 space-y-6"
            >
              <div className="relative">
                <div className="w-24 h-24 border-4 border-[#1A1A1A]/10 border-t-[#1A1A1A] rounded-full animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Brain className="text-[#1A1A1A]" size={32} />
                </div>
              </div>
              <div className="text-center">
                <h2 className="text-2xl font-serif italic mb-2">Analyzing Performance...</h2>
                <p className="text-muted-foreground font-mono text-xs uppercase tracking-widest">
                  Gemini is evaluating your responses for the {state.currentRound} round
                </p>
              </div>
            </motion.div>
          )}

          {step === 'report' && (
            <motion.div 
              key="report"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-8"
            >
              {/* Final Score Hero */}
              <div className="glass-card p-12 text-center relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-emerald-500" />
                <Trophy className="mx-auto mb-6 text-yellow-500" size={64} />
                <h2 className="text-5xl font-serif italic mb-2">Interview Complete</h2>
                <p className="text-muted-foreground mb-8">Role: {state.role}</p>
                
                <div className="flex flex-col md:flex-row items-center justify-center gap-12">
                  <div className="text-center">
                    <div className="text-7xl font-bold mb-2">{finalReport?.finalScore}<span className="text-2xl text-muted-foreground">/10</span></div>
                    <p className="font-mono text-xs uppercase tracking-widest opacity-50">Overall Score</p>
                  </div>
                  
                  <div className="w-full md:w-64 h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                        <PolarGrid stroke="#E5E7EB" />
                        <PolarAngleAxis dataKey="subject" tick={{ fill: '#6B7280', fontSize: 10, fontWeight: 500 }} />
                        <Radar
                          name="Candidate"
                          dataKey="A"
                          stroke="#1A1A1A"
                          fill="#1A1A1A"
                          fillOpacity={0.1}
                        />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Detailed Breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  { title: 'Aptitude', score: state.scores.aptitude, feedback: state.feedback.aptitude, icon: Brain, color: 'text-blue-600' },
                  { title: 'Technical', score: state.scores.technical, feedback: state.feedback.technical, icon: Code, color: 'text-purple-600' },
                  { title: 'HR / Comm', score: state.scores.communication, feedback: state.feedback.communication, icon: MessageSquare, color: 'text-emerald-600' },
                ].map((item, i) => (
                  <div key={i} className="glass-card p-6">
                    <div className="flex items-center justify-between mb-4">
                      <item.icon className={item.color} size={24} />
                      <div className="font-bold text-xl">{item.score}/10</div>
                    </div>
                    <h4 className="font-medium mb-2">{item.title} Round</h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">{item.feedback}</p>
                  </div>
                ))}
              </div>

              {/* Summary & Tips */}
              <div className="glass-card p-8 md:p-12 space-y-12">
                <div>
                  <h3 className="text-2xl font-serif italic mb-6 flex items-center gap-3">
                    <BarChart3 size={24} />
                    Executive Summary
                  </h3>
                  <div className="markdown-body text-[#4B5563] leading-relaxed">
                    <ReactMarkdown>{finalReport?.summary}</ReactMarkdown>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                  <div>
                    <h4 className="text-xs font-mono uppercase tracking-widest mb-6 opacity-50">Strengths</h4>
                    <ul className="space-y-4">
                      {finalReport?.strengths?.map((s: string, i: number) => (
                        <li key={i} className="flex items-start gap-3">
                          <CheckCircle2 className="text-emerald-500 mt-1 shrink-0" size={18} />
                          <span className="text-sm">{s}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4 className="text-xs font-mono uppercase tracking-widest mb-6 opacity-50">Actionable Tips</h4>
                    <ul className="space-y-4">
                      {finalReport?.improvementTips?.map((tip: string, i: number) => (
                        <li key={i} className="flex items-start gap-3">
                          <ArrowRight className="text-blue-500 mt-1 shrink-0" size={18} />
                          <span className="text-sm">{tip}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="pt-8 border-t border-[#E5E7EB] flex flex-col md:flex-row items-center justify-between gap-6">
                  <div className="text-xs font-mono opacity-50">
                    Skill Analysis JSON: <code className="bg-[#F3F4F6] px-2 py-1 rounded">{JSON.stringify({
                      aptitude: state.scores.aptitude,
                      technical: state.scores.technical,
                      communication: state.scores.communication,
                      total: finalReport?.finalScore
                    })}</code>
                  </div>
                  <button 
                    onClick={() => window.location.reload()}
                    className="btn-secondary flex items-center gap-2"
                  >
                    <RefreshCw size={18} />
                    Retry Interview
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <footer className="mt-20 pb-12 text-center">
          <p className="text-xs font-mono opacity-30">
            © 2026 AI Interview Pro • Built with Google Gemini
          </p>
        </footer>
      </div>
    </div>
  );
}
