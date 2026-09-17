export interface Question {
  id: number;
  question: string;
  contextText?: string;
  contextTitle?: string;
  options: {
    key: 'A' | 'B' | 'C' | 'D';
    text: string;
  }[];
  correctAnswer: 'A' | 'B' | 'C' | 'D';
  explanation: string;
  topic: string;
  unitReference: string; // e.g. "Chapter 2 - Unit 3: A Secret Recipe"
}

export interface StudentInfo {
  name: string;
  studentClass: string;
  studentNumber: string;
}

export interface QuizSubmission {
  id: string;
  studentName: string;
  studentClass: string;
  studentNumber: string;
  score: number; // 0 - 100
  totalQuestions: number;
  correctCount: number;
  wrongCount: number;
  answers: Record<number, 'A' | 'B' | 'C' | 'D'>;
  timeSpentSeconds: number;
  submittedAt: string; // ISO string
}

export type ViewState = 'start' | 'quiz' | 'result' | 'dashboard';
