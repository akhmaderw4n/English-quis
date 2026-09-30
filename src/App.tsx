/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { ViewState, StudentInfo, QuizSubmission, ViolationLockSession, QuizViolationRecord, Question, ProcedureTextConfig, StudentRestrictionConfig, DashboardBackgroundConfig } from './types';
import { QUIZ_QUESTIONS, QUIZ_METADATA, ALL_CLASS_LIST, INITIAL_STUDENT_SUBMISSIONS, INITIAL_PROCEDURE_TEXT_CONFIG, INITIAL_STUDENT_RESTRICTION_CONFIG, INITIAL_REGISTERED_STUDENTS, getStudentAttemptStatus, normalizeStudentName, normalizeStudentClass, normalizeStudentNumber, isTeacherManualRosterSubmission } from './data/quizData';
import { INITIAL_DASHBOARD_BACKGROUND_CONFIG, resolveActiveBackgroundImageUrl } from './utils/dashboardBackground';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { StartScreen } from './components/StartScreen';
import { QuizScreen } from './components/QuizScreen';
import { ResultScreen } from './components/ResultScreen';
import { TeacherDashboard } from './components/TeacherDashboard';
import { TeacherPinModal } from './components/TeacherPinModal';
import { ViolationScreen } from './components/ViolationScreen';
import { ProcedureTextStudyModal } from './components/ProcedureTextStudyModal';
import { isSoundEnabled, setSoundEnabled, playClickSound, stopSpeech, playViolationAlertSound } from './utils/audio';
import {
  subscribeToSubmissions,
  saveSubmissionToFirebase,
  saveBatchSubmissionsToFirebase,
  deleteSubmissionFromFirebase,
  clearAllSubmissionsFromFirebase,
  subscribeToTeacherPin,
  saveTeacherPinToFirebase,
  subscribeToViolations,
  reportViolationToFirebase,
  updateViolationStatusInFirebase,
  deleteViolationFromFirebase,
  clearAllViolationsFromFirebase,
  subscribeToQuestionBank,
  saveQuestionBankToFirebase,
  resetQuestionBankInFirebase,
  subscribeToProcedureText,
  saveProcedureTextToFirebase,
  resetProcedureTextInFirebase,
  subscribeToStudentRestrictions,
  saveStudentRestrictionsToFirebase,
  subscribeToDashboardBackground,
  saveDashboardBackgroundToFirebase,
  testConnection
} from './services/firebase';

const STORAGE_KEY_SUBMISSIONS = 'en_nusantara_quiz_submissions_v1';
const STORAGE_KEY_PIN = 'en_nusantara_teacher_pin_v1';
const STORAGE_KEY_VIOLATION = 'en_nusantara_active_violation_v1';
const STORAGE_KEY_QUESTIONS = 'en_nusantara_quiz_questions_v1';
const STORAGE_KEY_PROCEDURE_TEXT = 'en_nusantara_learning_material_v2';
const STORAGE_KEY_STUDY_VIEWED_USERS = 'en_nusantara_study_viewed_users_v2';
const STORAGE_KEY_STUDENT_RESTRICTIONS = 'en_nusantara_student_restrictions_v1';
const STORAGE_KEY_DASHBOARD_BACKGROUND = 'en_nusantara_dashboard_bg_v1';

export default function App() {
  const [currentView, setCurrentView] = useState<ViewState>('start');
  const [currentStudent, setCurrentStudent] = useState<StudentInfo | null>(null);
  const [latestSubmission, setLatestSubmission] = useState<QuizSubmission | null>(null);
  const [isTeacherAuthOpen, setIsTeacherAuthOpen] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const [isDbConnected, setIsDbConnected] = useState(true);
  const [isSyncing, setIsSyncing] = useState(true);

  // Dynamic Question Bank state (defaults to 10 standard questions, supports Word imports)
  const [questions, setQuestions] = useState<Question[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_QUESTIONS);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Error loading cached questions from localStorage', e);
    }
    return QUIZ_QUESTIONS;
  });

  // Real-time violations list for teacher dashboard monitoring
  const [violations, setViolations] = useState<QuizViolationRecord[]>([]);

  // Active Violation Lockout state
  const [violationSession, setViolationSession] = useState<ViolationLockSession | null>(null);
  const [resumedFromViolation, setResumedFromViolation] = useState(false);

  // Dynamic Procedure Text Material & Recipe Database state
  const [procedureTextConfig, setProcedureTextConfig] = useState<ProcedureTextConfig>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_PROCEDURE_TEXT);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && typeof parsed === 'object') {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Error loading cached procedure text from localStorage', e);
    }
    return INITIAL_PROCEDURE_TEXT_CONFIG;
  });

  const ensureAllClassesInRestrictions = (cfg: StudentRestrictionConfig): StudentRestrictionConfig => {
    const rawAllowed = Array.isArray(cfg.allowedClasses) ? cfg.allowedClasses : ALL_CLASS_LIST;
    const normAllowed = Array.from(new Set(rawAllowed.map(c => normalizeStudentClass(c)).filter(Boolean)));
    // If legacy 6-class default (7A-7F) was stored before 7G and 7H were added, automatically include 7G and 7H
    const has7Ato7F = ['7A', '7B', '7C', '7D', '7E', '7F'].every(c => normAllowed.includes(c));
    const finalAllowed = has7Ato7F
      ? Array.from(new Set([...normAllowed, '7G', '7H']))
      : normAllowed.length > 0
      ? normAllowed
      : [...ALL_CLASS_LIST];
    return {
      ...cfg,
      allowedClasses: finalAllowed,
    };
  };

  // Student study modal state & "1 User 1 Kali Lihat" tracking
  const [isProcedureStudyOpen, setIsProcedureStudyOpen] = useState(false);
  const [studentRestrictions, setStudentRestrictions] = useState<StudentRestrictionConfig>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_STUDENT_RESTRICTIONS);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          return ensureAllClassesInRestrictions({ ...INITIAL_STUDENT_RESTRICTION_CONFIG, ...parsed });
        }
      }
    } catch {}
    return INITIAL_STUDENT_RESTRICTION_CONFIG;
  });
  const [dashboardBackground, setDashboardBackground] = useState<DashboardBackgroundConfig>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_DASHBOARD_BACKGROUND);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          return { ...INITIAL_DASHBOARD_BACKGROUND_CONFIG, ...parsed };
        }
      }
    } catch {}
    return INITIAL_DASHBOARD_BACKGROUND_CONFIG;
  });
  const [draftStudent, setDraftStudent] = useState<StudentInfo>({
    name: '',
    studentClass: '7A',
    studentNumber: '',
  });

  // Map of user keys who have already used their 1x view of the study module
  // Special key '__unassigned_anonymous_view__' tracks if the current user viewed before typing their name
  // Special key '__bound_anonymous_user__' stores the first user identity bound to that anonymous view
  const [viewedStudyUsers, setViewedStudyUsers] = useState<Record<string, string>>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_STUDY_VIEWED_USERS);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          return parsed;
        }
      }
    } catch {}
    return {};
  });

  const buildStudentUserKey = (info: { name: string; studentClass: string; studentNumber: string }) => {
    const cleanName = info.name.trim().toLowerCase();
    const cleanClass = info.studentClass.trim().toUpperCase();
    const cleanNum = info.studentNumber.trim();
    if (!cleanName || !cleanNum) return '';
    return `${cleanClass}_${cleanNum}_${cleanName}`;
  };

  // Check if the active user (draftStudent on StartScreen, or currentStudent in quiz/result) has already viewed the module 1 time
  const activeUserInfo = currentView === 'start' ? draftStudent : (currentStudent || draftStudent);
  const activeUserKey = buildStudentUserKey(activeUserInfo);

  const isStudyModuleViewedByCurrentUser = (() => {
    if (studentRestrictions.studyModuleAccessMode === 'locked') {
      return true;
    }
    if (studentRestrictions.studyModuleAccessMode === 'unlimited') {
      return false;
    }
    if (viewedStudyUsers['__unassigned_anonymous_view__']) {
      return true;
    }
    if (activeUserKey) {
      return Boolean(viewedStudyUsers[activeUserKey]);
    }
    // No complete student identity typed yet: if any user on this session already viewed without a new identity entered, keep locked
    return Object.keys(viewedStudyUsers).length > 0;
  })();

  const handleResetStudyModuleViews = () => {
    setViewedStudyUsers({});
    try {
      localStorage.removeItem(STORAGE_KEY_STUDY_VIEWED_USERS);
    } catch {}
  };

  // Handler to open the study module (strictly 1 user = 1 kali lihat)
  const handleOpenProcedureStudy = () => {
    playClickSound();
    if (isStudyModuleViewedByCurrentUser) {
      return;
    }

    const nextMap = { ...viewedStudyUsers };
    const nowIso = new Date().toISOString();

    if (activeUserKey) {
      nextMap[activeUserKey] = nowIso;
    } else {
      nextMap['__unassigned_anonymous_view__'] = nowIso;
    }

    setViewedStudyUsers(nextMap);
    try {
      localStorage.setItem(STORAGE_KEY_STUDY_VIEWED_USERS, JSON.stringify(nextMap));
    } catch {}
    setIsProcedureStudyOpen(true);
  };

  // Update draft student identity from StartScreen form
  const handleUpdateDraftStudent = (info: StudentInfo) => {
    setDraftStudent(info);
  };

  // Ensure normal screen view on mount (clear any stuck lockouts and exit fullscreen)
  useEffect(() => {
    try {
      localStorage.removeItem(STORAGE_KEY_VIOLATION);
    } catch {}
    if (typeof document !== 'undefined' && document.fullscreenElement) {
      document.exitFullscreen?.().catch(() => {});
    }
  }, []);

  // Load teacher PIN with fallback to default "1234"
  const [teacherPin, setTeacherPin] = useState<string>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY_PIN) || QUIZ_METADATA.defaultTeacherPin;
    } catch {
      return QUIZ_METADATA.defaultTeacherPin;
    }
  });

  // Load submissions with fallback to empty array or stored cache
  const [submissions, setSubmissions] = useState<QuizSubmission[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_SUBMISSIONS);
      if (stored !== null) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error('Error loading submissions from localStorage', e);
    }
    return [];
  });

  // Subscribe to real-time Firestore Submissions, PIN, Questions, and Violations
  useEffect(() => {
    testConnection().then((connected) => {
      setIsDbConnected(connected);
    });

    const unsubscribeSubmissions = subscribeToSubmissions(
      (cloudSubmissions) => {
        setIsDbConnected(true);
        setIsSyncing(false);
        setSubmissions(cloudSubmissions);
        try {
          localStorage.setItem(STORAGE_KEY_SUBMISSIONS, JSON.stringify(cloudSubmissions));
        } catch {}
      },
      (err) => {
        console.warn('Submissions real-time sync warning:', err);
        setIsSyncing(false);
      }
    );

    const unsubscribePin = subscribeToTeacherPin((cloudPin) => {
      if (cloudPin) {
        setTeacherPin(cloudPin);
        try {
          localStorage.setItem(STORAGE_KEY_PIN, cloudPin);
        } catch {}
      }
    }, QUIZ_METADATA.defaultTeacherPin);

    const unsubscribeQuestions = subscribeToQuestionBank((cloudQuestions) => {
      if (cloudQuestions && cloudQuestions.length > 0) {
        setQuestions(cloudQuestions);
        try {
          localStorage.setItem(STORAGE_KEY_QUESTIONS, JSON.stringify(cloudQuestions));
        } catch {}
      }
    });

    const unsubscribeViolations = subscribeToViolations((cloudViolations) => {
      setViolations(cloudViolations);
    });

    const unsubscribeProcedureText = subscribeToProcedureText((cloudConfig) => {
      if (cloudConfig) {
        const isLegacyProcedure =
          cloudConfig.definition?.toLowerCase().includes('procedure text is a text') ||
          cloudConfig.texts?.[0]?.title?.includes('Sweet Potato Fritters');
        if (isLegacyProcedure) {
          setProcedureTextConfig(INITIAL_PROCEDURE_TEXT_CONFIG);
          try {
            localStorage.setItem(STORAGE_KEY_PROCEDURE_TEXT, JSON.stringify(INITIAL_PROCEDURE_TEXT_CONFIG));
          } catch {}
          saveProcedureTextToFirebase(INITIAL_PROCEDURE_TEXT_CONFIG).catch(() => {});
        } else {
          setProcedureTextConfig(cloudConfig);
          try {
            localStorage.setItem(STORAGE_KEY_PROCEDURE_TEXT, JSON.stringify(cloudConfig));
          } catch {}
        }
      }
    });

    const unsubscribeRestrictions = subscribeToStudentRestrictions((cloudRestrictions) => {
      if (cloudRestrictions) {
        const merged = ensureAllClassesInRestrictions({
          ...INITIAL_STUDENT_RESTRICTION_CONFIG,
          ...cloudRestrictions,
        });
        setStudentRestrictions(merged);
        try {
          localStorage.setItem(STORAGE_KEY_STUDENT_RESTRICTIONS, JSON.stringify(merged));
        } catch {}
      }
    });

    const unsubscribeBackground = subscribeToDashboardBackground((cloudBg) => {
      if (cloudBg) {
        setDashboardBackground((prev) => {
          // Preserve full local savedCustomImages if cloud had truncated history
          const mergedSaved =
            Array.isArray(cloudBg.savedCustomImages) && cloudBg.savedCustomImages.length >= (prev.savedCustomImages?.length || 0)
              ? cloudBg.savedCustomImages
              : prev.savedCustomImages || cloudBg.savedCustomImages || [];
          const merged = {
            ...INITIAL_DASHBOARD_BACKGROUND_CONFIG,
            ...cloudBg,
            savedCustomImages: mergedSaved,
          };
          try {
            localStorage.setItem(STORAGE_KEY_DASHBOARD_BACKGROUND, JSON.stringify(merged));
          } catch {}
          return merged;
        });
      }
    });

    return () => {
      unsubscribeSubmissions();
      unsubscribePin();
      unsubscribeQuestions();
      unsubscribeViolations();
      unsubscribeProcedureText();
      unsubscribeRestrictions();
      unsubscribeBackground();
    };
  }, []);

  // Persist backup to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_SUBMISSIONS, JSON.stringify(submissions));
    } catch (e) {
      console.error('Error saving submissions to localStorage', e);
    }
  }, [submissions]);

  // Persist backup questions to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_QUESTIONS, JSON.stringify(questions));
    } catch (e) {
      console.error('Error saving questions to localStorage', e);
    }
  }, [questions]);

  // Persist backup PIN to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_PIN, teacherPin);
    } catch (e) {
      console.error('Error saving PIN to localStorage', e);
    }
  }, [teacherPin]);

  // Persist backup procedure text to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_PROCEDURE_TEXT, JSON.stringify(procedureTextConfig));
    } catch (e) {
      console.error('Error saving procedure text to localStorage', e);
    }
  }, [procedureTextConfig]);

  // Update procedure text in memory, local storage, and Firestore
  const handleUpdateProcedureText = async (newConfig: ProcedureTextConfig) => {
    setProcedureTextConfig(newConfig);
    try {
      localStorage.setItem(STORAGE_KEY_PROCEDURE_TEXT, JSON.stringify(newConfig));
    } catch {}
    try {
      await saveProcedureTextToFirebase(newConfig);
    } catch (err) {
      console.warn('Notice: Could not sync procedure text to Firestore:', err);
    }
  };

  // Reset procedure text to default English for Nusantara
  const handleResetProcedureText = async () => {
    setProcedureTextConfig(INITIAL_PROCEDURE_TEXT_CONFIG);
    try {
      localStorage.setItem(STORAGE_KEY_PROCEDURE_TEXT, JSON.stringify(INITIAL_PROCEDURE_TEXT_CONFIG));
    } catch {}
    try {
      await saveProcedureTextToFirebase(INITIAL_PROCEDURE_TEXT_CONFIG);
    } catch (err) {
      console.warn('Notice: Could not reset procedure text in Firestore:', err);
    }
  };

  // Update student attempt restrictions in memory, local storage, and Firestore
  const handleUpdateStudentRestrictions = async (newConfig: StudentRestrictionConfig) => {
    setStudentRestrictions(newConfig);
    try {
      localStorage.setItem(STORAGE_KEY_STUDENT_RESTRICTIONS, JSON.stringify(newConfig));
    } catch {}
    try {
      await saveStudentRestrictionsToFirebase(newConfig);
    } catch (err) {
      console.warn('Notice: Could not sync student restrictions to Firestore:', err);
    }
  };

  // Update dashboard background in memory, local storage, and Firestore
  const handleUpdateDashboardBackground = async (newConfig: DashboardBackgroundConfig) => {
    setDashboardBackground(newConfig);
    try {
      localStorage.setItem(STORAGE_KEY_DASHBOARD_BACKGROUND, JSON.stringify(newConfig));
    } catch {}
    try {
      await saveDashboardBackgroundToFirebase(newConfig);
    } catch (err) {
      console.warn('Notice: Could not sync dashboard background to Firestore:', err);
    }
  };

  // Sound toggle handler
  const handleToggleSound = () => {
    const nextState = !soundOn;
    setSoundOn(nextState);
    setSoundEnabled(nextState);
  };

  // Start Quiz
  const handleStartQuiz = (student: StudentInfo) => {
    setCurrentStudent(student);
    setDraftStudent(student);
    const key = buildStudentUserKey(student);
    if (key && viewedStudyUsers['__unassigned_anonymous_view__']) {
      const nextMap = { ...viewedStudyUsers, [key]: viewedStudyUsers['__unassigned_anonymous_view__'] };
      delete nextMap['__unassigned_anonymous_view__'];
      setViewedStudyUsers(nextMap);
      try {
        localStorage.setItem(STORAGE_KEY_STUDY_VIEWED_USERS, JSON.stringify(nextMap));
      } catch {}
    }
    setViolationSession(null);
    try {
      localStorage.removeItem(STORAGE_KEY_VIOLATION);
    } catch {}
    setResumedFromViolation(false);
    setCurrentView('quiz');
  };

  // Triggered when a student switches tabs or minimizes the window during test
  // Sends a real-time notification to the Teacher Dashboard without locking the student's screen or requiring a token
  const handleViolationOccurred = async (violationData: {
    lastQuestionIndex: number;
    answers: Record<number, 'A' | 'B' | 'C' | 'D'>;
    flagged: Record<number, boolean>;
    seconds: number;
    reason: string;
  }) => {
    if (!currentStudent) return;

    const randomCode = Math.floor(1000 + Math.random() * 9000);
    const prevCount = violationSession ? violationSession.violationCount : 0;
    const violationId = `viol-${Date.now()}-${randomCode}`;

    const session: ViolationLockSession = {
      id: violationId,
      student: currentStudent,
      lastQuestionIndex: violationData.lastQuestionIndex,
      answers: violationData.answers,
      flagged: violationData.flagged,
      seconds: violationData.seconds,
      violationCount: prevCount + 1,
      violationTime: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      reason: violationData.reason,
    };

    setViolationSession(session);

    // Report violation to Firestore immediately so teacher dashboard receives instant notification
    const violationRecord: QuizViolationRecord = {
      id: violationId,
      studentName: currentStudent.name,
      studentClass: currentStudent.studentClass,
      studentNumber: currentStudent.studentNumber,
      questionNumber: violationData.lastQuestionIndex + 1,
      violationCount: prevCount + 1,
      timestamp: new Date().toISOString(),
      unlockToken: '-',
      reason: violationData.reason,
      status: 'locked', // 'locked' represents unread notification in Teacher Dashboard
    };

    try {
      await reportViolationToFirebase(violationRecord);
    } catch (err) {
      console.warn('Could not report violation to Firebase:', err);
    }
  };

  // Remote violation management handlers for Teacher Dashboard
  const handleRemoteUnlockViolation = async (violationId: string) => {
    try {
      await updateViolationStatusInFirebase(violationId, 'unlocked');
    } catch (err) {
      console.error('Error unlocking violation remotely:', err);
    }
  };

  const handleDeleteViolation = async (violationId: string) => {
    try {
      await deleteViolationFromFirebase(violationId);
    } catch (err) {
      console.error('Error deleting violation:', err);
    }
  };

  const handleClearAllViolations = async () => {
    try {
      await clearAllViolationsFromFirebase();
    } catch (err) {
      console.error('Error clearing all violations:', err);
    }
  };

  // Question bank management handlers (Word import & reset)
  const handleUpdateQuestions = async (newQuestions: Question[], mode: 'replace' | 'append') => {
    let updated: Question[];
    if (mode === 'append') {
      const maxId = questions.reduce((max, q) => Math.max(max, q.id), 0);
      const reindexed = newQuestions.map((q, idx) => ({
        ...q,
        id: maxId + idx + 1
      }));
      updated = [...questions, ...reindexed];
    } else {
      updated = newQuestions.map((q, idx) => ({ ...q, id: idx + 1 }));
    }

    setQuestions(updated);
    try {
      localStorage.setItem(STORAGE_KEY_QUESTIONS, JSON.stringify(updated));
    } catch {}

    try {
      await saveQuestionBankToFirebase(updated);
    } catch (err) {
      console.warn('Could not sync question bank to Firebase:', err);
    }
  };

  const handleResetQuestions = async () => {
    setQuestions(QUIZ_QUESTIONS);
    try {
      localStorage.removeItem(STORAGE_KEY_QUESTIONS);
    } catch {}

    try {
      await resetQuestionBankInFirebase();
    } catch (err) {
      console.warn('Could not reset question bank in Firebase:', err);
    }
  };

  // Unlocks the exam and returns student directly to their last question number
  const handleUnlockViolation = () => {
    try {
      localStorage.removeItem(STORAGE_KEY_VIOLATION);
    } catch {}

    setResumedFromViolation(true);
    setCurrentView('quiz');
  };

  // Restore screen display to normal state (exits fullscreen, clears locks, returns to home)
  const handleNormalizeScreen = () => {
    if (typeof document !== 'undefined' && document.fullscreenElement) {
      document.exitFullscreen?.().catch(() => {});
    }
    stopSpeech();
    setViolationSession(null);
    setResumedFromViolation(false);
    try {
      localStorage.removeItem(STORAGE_KEY_VIOLATION);
    } catch {}
    setCurrentView('start');
  };

  // Finish Quiz & Record Submission to Cloud Database
  const handleFinishQuiz = async (
    answers: Record<number, 'A' | 'B' | 'C' | 'D'>, 
    timeSpentSeconds: number,
    violationsCount?: number
  ) => {
    if (!currentStudent) return;

    let correctCount = 0;
    questions.forEach(q => {
      if (answers[q.id] === q.correctAnswer) {
        correctCount += 1;
      }
    });

    const score = questions.length > 0
      ? Math.min(100, Math.round((correctCount / questions.length) * 100))
      : 0;
    const wrongCount = Math.max(0, questions.length - correctCount);

    const actualViolations = violationsCount ?? (violationSession ? violationSession.violationCount : 0);

    const cleanStudentName = (currentStudent.name || 'Siswa').trim().slice(0, 110) || 'Siswa';
    const cleanStudentClass = (normalizeStudentClass(currentStudent.studentClass) || '7A').slice(0, 25);
    const cleanStudentNumber = (normalizeStudentNumber(currentStudent.studentNumber) || '1').slice(0, 14);

    const newSubmission: QuizSubmission = {
      id: `sub-${Date.now()}`,
      studentName: cleanStudentName,
      studentClass: cleanStudentClass,
      studentNumber: cleanStudentNumber,
      score,
      totalQuestions: questions.length,
      correctCount,
      wrongCount,
      answers: answers || {},
      timeSpentSeconds: Math.max(0, Math.round(timeSpentSeconds || 0)),
      submittedAt: new Date().toISOString(),
      violationsCount: Math.max(0, actualViolations || 0),
      hasSubmitted: true,
    };

    // Clean up violation lockout data
    setViolationSession(null);
    try {
      localStorage.removeItem(STORAGE_KEY_VIOLATION);
    } catch {}
    setResumedFromViolation(false);

    // Identify any pre-input teacher roster placeholders for this student so real exam score replaces them
    const normCurrentName = normalizeStudentName(cleanStudentName);
    const preInputIdsToRemove = submissions
      .filter(
        s =>
          isTeacherManualRosterSubmission(s) &&
          !s.id.match(/^sub-[1-5]$/) &&
          normalizeStudentName(s.studentName) === normCurrentName &&
          normalizeStudentClass(s.studentClass) === cleanStudentClass
      )
      .map(s => s.id);

    // Optimistically update local view
    setSubmissions(prev => [
      newSubmission,
      ...prev.filter(s => s.id !== newSubmission.id && !preInputIdsToRemove.includes(s.id)),
    ]);
    setLatestSubmission(newSubmission);
    setCurrentView('result');

    // Automatically register this student in Database Siswa/Guru if not yet registered
    const currentRoster = studentRestrictions.registeredStudents ?? INITIAL_REGISTERED_STUDENTS;
    if (
      normCurrentName &&
      !currentRoster.some(
        r =>
          normalizeStudentName(r.name) === normCurrentName &&
          normalizeStudentClass(r.studentClass) === cleanStudentClass
      )
    ) {
      const updatedRestrictions: StudentRestrictionConfig = {
        ...studentRestrictions,
        registeredStudents: [
          ...currentRoster,
          {
            id: `reg-auto-${Date.now()}`,
            name: cleanStudentName,
            studentClass: cleanStudentClass,
            studentNumber: cleanStudentNumber,
          },
        ],
        updatedAt: new Date().toISOString(),
      };
      handleUpdateStudentRestrictions(updatedRestrictions).catch(() => {});
    }

    // Persist to Firebase Firestore for cross-device sync
    try {
      await saveSubmissionToFirebase(newSubmission);
      for (const oldId of preInputIdsToRemove) {
        await deleteSubmissionFromFirebase(oldId).catch(() => {});
      }
    } catch (err) {
      console.error('Error saving submission to Firebase:', err);
    }
  };

  // Retake Quiz
  const handleRetakeQuiz = () => {
    if (currentStudent) {
      setCurrentView('quiz');
    } else {
      setCurrentView('start');
    }
  };

  // PIN Authentication Success
  const handleTeacherPinSuccess = () => {
    setIsTeacherAuthOpen(false);
    setCurrentView('dashboard');
  };

  // Change PIN across devices
  const handleChangePin = async (newPin: string) => {
    setTeacherPin(newPin);
    try {
      await saveTeacherPinToFirebase(newPin);
    } catch (err) {
      console.error('Error saving PIN to Firebase:', err);
    }
  };

  // Delete individual submission permanently across devices
  const handleDeleteSubmission = async (id: string): Promise<void> => {
    // 1. Optimistically update state
    setSubmissions(prev => prev.filter(s => s.id !== id));
    // 2. Immediately purge from localStorage
    try {
      const stored = localStorage.getItem(STORAGE_KEY_SUBMISSIONS);
      if (stored) {
        const parsed: QuizSubmission[] = JSON.parse(stored);
        const filtered = parsed.filter(s => s.id !== id);
        localStorage.setItem(STORAGE_KEY_SUBMISSIONS, JSON.stringify(filtered));
      }
    } catch (e) {
      console.warn('LocalStorage purge error:', e);
    }

    // 3. Delete permanently from Firestore and record tombstone
    try {
      await deleteSubmissionFromFirebase(id);
    } catch (err) {
      console.error('Error permanently deleting submission from Firebase:', err);
      throw err;
    }
  };

  // Clear all submissions permanently across devices
  const handleClearSubmissions = async (): Promise<void> => {
    setSubmissions([]);
    try {
      localStorage.setItem(STORAGE_KEY_SUBMISSIONS, '[]');
    } catch {}

    try {
      await clearAllSubmissionsFromFirebase();
    } catch (err) {
      console.error('Error clearing submissions in Firebase:', err);
      throw err;
    }
  };

  // Re-seed sample data to cloud database
  const handleSeedSampleData = async () => {
    setSubmissions(INITIAL_STUDENT_SUBMISSIONS);
    try {
      await saveBatchSubmissionsToFirebase(INITIAL_STUDENT_SUBMISSIONS);
    } catch (err) {
      console.error('Error seeding data to Firebase:', err);
    }
  };

  // Add new submission manually by teacher
  const handleAddSubmission = async (newSub: QuizSubmission) => {
    const statusCheck = getStudentAttemptStatus(
      { name: newSub.studentName, studentClass: newSub.studentClass, studentNumber: newSub.studentNumber },
      submissions,
      studentRestrictions
    );
    if (statusCheck.isCrossClassConflict) {
      return;
    }

    setSubmissions(prev => [newSub, ...prev.filter(s => s.id !== newSub.id)]);

    // Register into Database Siswa/Guru if not already present
    const currentRoster = studentRestrictions.registeredStudents ?? INITIAL_REGISTERED_STUDENTS;
    const normName = normalizeStudentName(newSub.studentName);
    if (normName && !currentRoster.some(r => normalizeStudentName(r.name) === normName)) {
      handleUpdateStudentRestrictions({
        ...studentRestrictions,
        registeredStudents: [
          ...currentRoster,
          {
            id: `reg-t-${Date.now()}`,
            name: newSub.studentName.trim(),
            studentClass: newSub.studentClass.trim().toUpperCase(),
            studentNumber: normalizeStudentNumber(newSub.studentNumber) || '1',
          },
        ],
        updatedAt: new Date().toISOString(),
      });
    }

    try {
      await saveSubmissionToFirebase(newSub);
    } catch (err) {
      console.error('Error adding submission to Firebase:', err);
    }
  };

  // Add multiple submissions manually by teacher
  const handleAddBatchSubmissions = async (newSubs: QuizSubmission[]) => {
    const validSubs = newSubs.filter(sub => {
      const check = getStudentAttemptStatus(
        { name: sub.studentName, studentClass: sub.studentClass, studentNumber: sub.studentNumber },
        submissions,
        studentRestrictions
      );
      return !check.isCrossClassConflict;
    });
    if (validSubs.length === 0) return;

    setSubmissions(prev => [...validSubs, ...prev]);

    // Also sync these students into Database Siswa/Guru (registeredStudents)
    const currentRoster = studentRestrictions.registeredStudents ?? INITIAL_REGISTERED_STUDENTS;
    const rosterMap = new Map(currentRoster.map(r => [normalizeStudentName(r.name), r]));
    let rosterChanged = false;
    validSubs.forEach((sub, idx) => {
      const norm = normalizeStudentName(sub.studentName);
      if (norm && !rosterMap.has(norm)) {
        rosterMap.set(norm, {
          id: `reg-batch-${Date.now()}-${idx}`,
          name: sub.studentName.trim(),
          studentClass: normalizeStudentClass(sub.studentClass) || '7A',
          studentNumber: normalizeStudentNumber(sub.studentNumber) || String(idx + 1),
        });
        rosterChanged = true;
      }
    });
    if (rosterChanged) {
      handleUpdateStudentRestrictions({
        ...studentRestrictions,
        registeredStudents: Array.from(rosterMap.values()),
        updatedAt: new Date().toISOString(),
      });
    }

    try {
      await saveBatchSubmissionsToFirebase(validSubs);
    } catch (err) {
      console.error('Error adding batch submissions to Firebase:', err);
    }
  };

  const activeBgImageUrl = resolveActiveBackgroundImageUrl(dashboardBackground);
  const shouldShowCustomBg =
    Boolean(activeBgImageUrl) &&
    (dashboardBackground.applyScope === 'all' ||
      (dashboardBackground.applyScope === 'dashboard_only' && currentView === 'dashboard') ||
      (dashboardBackground.applyScope === 'student_only' && currentView !== 'dashboard'));

  const getOverlayRgba = () => {
    const alpha = Math.max(0, Math.min(0.95, (dashboardBackground.overlayOpacity ?? 60) / 100));
    if (dashboardBackground.overlayColor === 'dark') {
      return `rgba(15, 23, 42, ${alpha})`;
    }
    if (dashboardBackground.overlayColor === 'warm') {
      return `rgba(255, 251, 235, ${alpha})`;
    }
    return `rgba(255, 255, 255, ${alpha})`;
  };

  return (
    <div className="min-h-screen flex flex-col bg-linear-to-b from-amber-50/40 via-white to-orange-50/20 text-slate-800 relative">
      {/* Dynamic Customizable Dashboard / App Background Layer */}
      {shouldShowCustomBg && (
        <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden no-print">
          <div
            className="absolute inset-0 transition-all duration-300"
            style={{
              backgroundImage: `url("${activeBgImageUrl}")`,
              backgroundSize:
                dashboardBackground.bgSize === 'repeat'
                  ? '320px auto'
                  : dashboardBackground.bgSize === 'contain'
                  ? 'contain'
                  : 'cover',
              backgroundRepeat: dashboardBackground.bgSize === 'repeat' ? 'repeat' : 'no-repeat',
              backgroundPosition: 'center',
              filter:
                (dashboardBackground.blurPx || 0) > 0
                  ? `blur(${dashboardBackground.blurPx}px)`
                  : 'none',
              transform: (dashboardBackground.blurPx || 0) > 0 ? 'scale(1.04)' : 'scale(1)',
            }}
          />
          <div
            className="absolute inset-0 transition-all duration-300"
            style={{
              backgroundColor: getOverlayRgba(),
            }}
          />
        </div>
      )}

      {/* Navigation (Always visible) */}
      <div className="no-print relative z-10">
        <Navbar
          currentView={currentView}
          onNavigate={(view) => {
            playClickSound();
            setCurrentView(view);
          }}
          onOpenTeacherAuth={() => {
            playClickSound();
            setIsTeacherAuthOpen(true);
          }}
          soundOn={soundOn}
          onToggleSound={handleToggleSound}
          studentName={currentStudent?.name}
          isDbConnected={isDbConnected}
          onOpenProcedureStudy={handleOpenProcedureStudy}
          isStudyLocked={isStudyModuleViewedByCurrentUser}
          onNormalizeScreen={handleNormalizeScreen}
        />
      </div>

      {/* Main View Area */}
      <main className="flex-1 relative z-10">
        {currentView === 'start' && (
          <StartScreen
            onStartQuiz={handleStartQuiz}
            onOpenTeacherAuth={() => setIsTeacherAuthOpen(true)}
            onOpenProcedureStudy={handleOpenProcedureStudy}
            isStudyLocked={isStudyModuleViewedByCurrentUser}
            onStudentDraftChange={handleUpdateDraftStudent}
            totalQuestions={questions.length}
            restrictions={studentRestrictions}
            submissions={submissions}
          />
        )}

        {currentView === 'quiz' && currentStudent && (
          <QuizScreen
            questions={questions}
            student={currentStudent}
            onFinishQuiz={handleFinishQuiz}
            onExitQuiz={() => {
              stopSpeech();
              setCurrentView('start');
            }}
            soundOn={soundOn}
            onToggleSound={handleToggleSound}
            initialIndex={violationSession ? violationSession.lastQuestionIndex : 0}
            initialAnswers={violationSession ? violationSession.answers : {}}
            initialFlagged={violationSession ? violationSession.flagged : {}}
            initialSeconds={violationSession ? violationSession.seconds : 0}
            initialViolationsCount={violationSession ? violationSession.violationCount : 0}
            onViolationOccurred={handleViolationOccurred}
            resumedBannerNotice={resumedFromViolation}
            timeLimitMinutes={studentRestrictions.timeLimitMinutes}
            shuffleQuestions={studentRestrictions.shuffleQuestions !== false}
            antiScreenshotMode={studentRestrictions.antiScreenshotMode ?? 'touch_hold'}
          />
        )}

        {currentView === 'violation_locked' && violationSession && (
          <ViolationScreen
            session={violationSession}
            teacherPin={teacherPin}
            onUnlock={handleUnlockViolation}
            onNormalizeScreen={handleNormalizeScreen}
          />
        )}

        {currentView === 'result' && latestSubmission && currentStudent && (
          <ResultScreen
            questions={questions}
            submission={latestSubmission}
            student={currentStudent}
            onRetakeQuiz={handleRetakeQuiz}
            onGoHome={() => setCurrentView('start')}
            onOpenTeacherAuth={() => setIsTeacherAuthOpen(true)}
            restrictions={studentRestrictions}
            submissions={submissions}
          />
        )}

        {currentView === 'dashboard' && (
          <TeacherDashboard
            submissions={submissions}
            violations={violations}
            onUnlockViolationRemotely={handleRemoteUnlockViolation}
            onDeleteViolation={handleDeleteViolation}
            onClearAllViolations={handleClearAllViolations}
            questions={questions}
            onUpdateQuestions={handleUpdateQuestions}
            onResetQuestions={handleResetQuestions}
            procedureTextConfig={procedureTextConfig}
            onUpdateProcedureText={handleUpdateProcedureText}
            onResetProcedureText={handleResetProcedureText}
            studentRestrictions={studentRestrictions}
            onUpdateStudentRestrictions={handleUpdateStudentRestrictions}
            onResetStudyModuleViews={handleResetStudyModuleViews}
            dashboardBackground={dashboardBackground}
            onUpdateDashboardBackground={handleUpdateDashboardBackground}
            currentPin={teacherPin}
            onChangePin={handleChangePin}
            onClearSubmissions={handleClearSubmissions}
            onSeedSampleData={handleSeedSampleData}
            onDeleteSubmission={handleDeleteSubmission}
            onBackToQuiz={() => setCurrentView('start')}
            onAddSubmission={handleAddSubmission}
            onAddBatchSubmissions={handleAddBatchSubmissions}
            isDbConnected={isDbConnected}
            isSyncing={isSyncing}
          />
        )}
      </main>

      {/* Student Procedure Text Study Material Modal */}
      <ProcedureTextStudyModal
        config={procedureTextConfig}
        isOpen={isProcedureStudyOpen}
        onClose={() => setIsProcedureStudyOpen(false)}
      />

      {/* Teacher Authentication Modal */}
      {isTeacherAuthOpen && (
        <TeacherPinModal
          currentPin={teacherPin}
          onSuccess={handleTeacherPinSuccess}
          onClose={() => setIsTeacherAuthOpen(false)}
        />
      )}

      {/* Footer with Mandatory Branding */}
      <div className="no-print relative z-10">
        <Footer />
      </div>
    </div>
  );
}
