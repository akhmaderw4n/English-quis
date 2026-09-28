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

export interface RegisteredStudent {
  id: string;
  name: string;
  studentClass: string;
  studentNumber: string;
}

export interface StudentRestrictionConfig {
  maxAttempts: number; // 1 = 1x pengerjaan, 2 = 2x, 3 = 3x, 0 = tanpa batas
  timeLimitMinutes: number; // 0 = tanpa batas waktu, atau 15, 20, 30, 45, 60 menit
  isQuizOpen: boolean; // true = sesi kuis dibuka, false = ditutup sementara
  allowedClasses: string[]; // ['7A', '7B', '7C', '7D', '7E', '7F', '7G', '7H']
  allowRemedialIfBelowKKM: boolean; // +1 kesempatan remedial jika nilai tertinggi < KKM
  allowReviewAfterQuiz: boolean; // izinkan siswa melihat kunci/pembahasan setelah selesai
  studyModuleAccessMode: 'once_per_user' | 'unlimited' | 'locked'; // 1 user 1x lihat, bebas, atau terkunci penuh
  extraAttemptGrants: Record<string, number>; // studentKey -> jumlah ekstra kuota pengerjaan
  shuffleQuestions?: boolean; // true = acak urutan soal untuk setiap siswa
  lockByClassAndNumber?: boolean; // true = kunci kuota berdasarkan Kelas + Nomor Absen (anti manipulasi nama)
  viewedStudyModuleMap?: Record<string, string>; // sinkronisasi cloud 1x lihat modul ajar
  registeredStudents?: RegisteredStudent[]; // Database resmi siswa/guru per kelas
  enforceRegisteredDatabase?: boolean; // true = wajib terdata di database siswa/guru untuk mengerjakan
  updatedAt?: string;
}

