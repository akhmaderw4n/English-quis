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
  id?: string;
  student: StudentInfo;
  lastQuestionIndex: number; // 0 to 9
  answers: Record<number, 'A' | 'B' | 'C' | 'D'>;
  flagged: Record<number, boolean>;
  seconds: number;
  unlockToken?: string;
  violationCount: number;
  violationTime: string;
  reason: string;
}

export interface QuizViolationRecord {
  id: string; // Unique violation ID
  studentName: string;
  studentClass: string;
  studentNumber: string;
  questionNumber: number; // 1-indexed (e.g. Soal 4)
  violationCount: number; // 1st violation, 2nd, etc.
  timestamp: string; // ISO string
  unlockToken?: string;
  reason?: string;
  status: 'locked' | 'unlocked';
  unlockedAt?: string;
}

export type ViewState = 'start' | 'quiz' | 'result' | 'dashboard' | 'violation_locked';

export interface ProcedureTextRecipe {
  id: string;
  title: string;
  category: string; // e.g. "Food Recipe", "Beverage / Drink", "Kitchen Activity"
  servings?: string; // e.g. "3-4 porsi"
  timeMinutes?: string; // e.g. "20 mins"
  difficulty?: 'Mudah' | 'Sedang' | 'Mahir';
  goal: string;
  ingredients: string[];
  tools: string[];
  steps: string[];
  languageNotes?: string;
  audioScript?: string;
  lastUpdated?: string;
}

export interface ProcedureStructureItem {
  id: string;
  title: string;
  desc: string;
}

export interface ProcedureLanguageFeatureItem {
  id: string;
  name: string;
  example: string;
}

export interface ProcedureTextConfig {
  definition: string;
  socialFunction: string;
  genericStructure: ProcedureStructureItem[];
  languageFeatures: ProcedureLanguageFeatureItem[];
  texts: ProcedureTextRecipe[];
  lastUpdated?: string;
}
