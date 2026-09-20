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
  hasAudio?: boolean; // Indicates listening / audio question
  audioTitle?: string; // e.g. "Audio Listening 2.1: Recipe Method"
  audioScript?: string; // Text to be spoken
  listeningInstruction?: string; // Instructions for student
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
  violationsCount?: number; // Count of tab switch violations during test
}

export interface ViolationLockSession {
  student: StudentInfo;
  lastQuestionIndex: number; // 0 to 9
  answers: Record<number, 'A' | 'B' | 'C' | 'D'>;
  flagged: Record<number, boolean>;
  seconds: number;
  unlockToken: string;
  violationCount: number;
  violationTime: string;
  reason: string;
}

export type ViewState = 'start' | 'quiz' | 'result' | 'dashboard' | 'violation_locked';
