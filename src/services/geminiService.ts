import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export enum InterviewRound {
  APTITUDE = "APTITUDE",
  TECHNICAL = "TECHNICAL",
  HR = "HR",
  COMPLETED = "COMPLETED"
}

export interface Question {
  id: number;
  text: string;
  options?: string[];
  correctAnswer?: string;
}

export interface InterviewState {
  role: string;
  resume: string;
  currentRound: InterviewRound;
  currentQuestionIndex: number;
  questions: Question[];
  answers: Record<number, string>;
  scores: {
    aptitude: number;
    technical: number;
    communication: number;
  };
  feedback: {
    aptitude: string;
    technical: string;
    communication: string;
  };
}

export const generateQuestions = async (role: string, resume: string, round: InterviewRound) => {
  const model = "gemini-3-flash-preview";
  
  let prompt = "";
  let responseSchema: any = {};

  if (round === InterviewRound.APTITUDE) {
    prompt = `Generate 10 aptitude and logical reasoning questions for a candidate applying for the role of ${role}. 
    The questions should be multiple choice. 
    Resume context (if any): ${resume}`;
    
    responseSchema = {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.INTEGER },
          text: { type: Type.STRING },
          options: { 
            type: Type.ARRAY, 
            items: { type: Type.STRING } 
          },
          correctAnswer: { type: Type.STRING }
        },
        required: ["id", "text", "options", "correctAnswer"]
      }
    };
  } else if (round === InterviewRound.TECHNICAL) {
    prompt = `Generate 3 role-specific technical/coding questions for a ${role}. 
    The candidate will provide text-based code or explanations.
    Resume context: ${resume}`;
    
    responseSchema = {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.INTEGER },
          text: { type: Type.STRING }
        },
        required: ["id", "text"]
      }
    };
  } else if (round === InterviewRound.HR) {
    prompt = `Generate 3 HR and behavioral questions for a ${role}.
    Resume context: ${resume}`;
    
    responseSchema = {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.INTEGER },
          text: { type: Type.STRING }
        },
        required: ["id", "text"]
      }
    };
  }

  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema
    }
  });

  return JSON.parse(response.text || "[]");
};

export const evaluateRound = async (
  role: string, 
  round: InterviewRound, 
  questions: Question[], 
  answers: Record<number, string>
) => {
  const model = "gemini-3.1-pro-preview";
  
  const prompt = `Evaluate the candidate's performance in the ${round} round for the role of ${role}.
  Questions and Answers:
  ${questions.map(q => `Q: ${q.text}\nA: ${answers[q.id] || "No answer"}`).join("\n\n")}
  
  Provide a score out of 10 and a short feedback summary.
  For Technical round, analyze code quality and logic.
  For HR round, analyze communication clarity, tone, and relevance.`;

  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          score: { type: Type.NUMBER },
          feedback: { type: Type.STRING }
        },
        required: ["score", "feedback"]
      }
    }
  });

  return JSON.parse(response.text || "{}");
};

export const generateFinalReport = async (state: InterviewState) => {
  const model = "gemini-3.1-pro-preview";
  
  const prompt = `Generate a final interview summary report for a ${state.role}.
  Scores:
  Aptitude: ${state.scores.aptitude}/10
  Technical: ${state.scores.technical}/10
  Communication: ${state.scores.communication}/10
  
  Feedback:
  Aptitude: ${state.feedback.aptitude}
  Technical: ${state.feedback.technical}
  Communication: ${state.feedback.communication}
  
  Provide a final combined score out of 10, a summary of strengths and weaknesses, and actionable improvement tips.`;

  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          finalScore: { type: Type.NUMBER },
          summary: { type: Type.STRING },
          strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
          weaknesses: { type: Type.ARRAY, items: { type: Type.STRING } },
          improvementTips: { type: Type.ARRAY, items: { type: Type.STRING } }
        },
        required: ["finalScore", "summary", "strengths", "weaknesses", "improvementTips"]
      }
    }
  });

  return JSON.parse(response.text || "{}");
};
