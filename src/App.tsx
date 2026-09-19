/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { ViewState, StudentInfo, QuizSubmission } from './types';
import { QUIZ_QUESTIONS, QUIZ_METADATA, INITIAL_STUDENT_SUBMISSIONS } from './data/quizData';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { StartScreen } from './components/StartScreen';
import { QuizScreen } from './components/QuizScreen';
import { ResultScreen } from './components/ResultScreen';
import { TeacherDashboard } from './components/TeacherDashboard';
import { TeacherPinModal } from './components/TeacherPinModal';
import { isSoundEnabled, setSoundEnabled, playClickSound, stopSpeech } from './utils/audio';
import {
  subscribeToSubmissions,
  saveSubmissionToFirebase,
  saveBatchSubmissionsToFirebase,
  deleteSubmissionFromFirebase,
  clearAllSubmissionsFromFirebase,
  subscribeToTeacherPin,
  saveTeacherPinToFirebase,
  testConnection
} from './services/firebase';

const STORAGE_KEY_SUBMISSIONS = 'en_nusantara_quiz_submissions_v1';
const STORAGE_KEY_PIN = 'en_nusantara_teacher_pin_v1';

export default function App() {
  const [currentView, setCurrentView] = useState<ViewState>('start');
  const [currentStudent, setCurrentStudent] = useState<StudentInfo | null>(null);
  const [latestSubmission, setLatestSubmission] = useState<QuizSubmission | null>(null);
  const [isTeacherAuthOpen, setIsTeacherAuthOpen] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const [isDbConnected, setIsDbConnected] = useState(true);
  const [isSyncing, setIsSyncing] = useState(true);

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

  // Subscribe to real-time Firestore Submissions for cross-device sync
  useEffect(() => {
    testConnection().then((connected) => {
      setIsDbConnected(connected);
    });

    const unsubscribeSubmissions = subscribeToSubmissions(
      (cloudSubmissions) => {
        setIsDbConnected(true);
        setIsSyncing(false);
        // Cloud Firestore is the definitive single source of truth across all devices
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

    return () => {
      unsubscribeSubmissions();
      unsubscribePin();
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

  // Persist backup PIN to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_PIN, teacherPin);
    } catch (e) {
      console.error('Error saving PIN to localStorage', e);
    }
  }, [teacherPin]);

  // Sound toggle handler
  const handleToggleSound = () => {
    const nextState = !soundOn;
    setSoundOn(nextState);
    setSoundEnabled(nextState);
  };

  // Start Quiz
  const handleStartQuiz = (student: StudentInfo) => {
    setCurrentStudent(student);
    setCurrentView('quiz');
  };

  // Finish Quiz & Record Submission to Cloud Database
  const handleFinishQuiz = async (answers: Record<number, 'A' | 'B' | 'C' | 'D'>, timeSpentSeconds: number) => {
    if (!currentStudent) return;

    let correctCount = 0;
    QUIZ_QUESTIONS.forEach(q => {
      if (answers[q.id] === q.correctAnswer) {
        correctCount += 1;
      }
    });

    const score = correctCount * QUIZ_METADATA.pointsPerQuestion;
    const wrongCount = QUIZ_QUESTIONS.length - correctCount;

    const newSubmission: QuizSubmission = {
      id: `sub-${Date.now()}`,
      studentName: currentStudent.name,
      studentClass: currentStudent.studentClass,
      studentNumber: currentStudent.studentNumber,
      score,
      totalQuestions: QUIZ_QUESTIONS.length,
      correctCount,
      wrongCount,
      answers,
      timeSpentSeconds,
      submittedAt: new Date().toISOString(),
    };

    // Optimistically update local view
    setSubmissions(prev => [newSubmission, ...prev.filter(s => s.id !== newSubmission.id)]);
    setLatestSubmission(newSubmission);
    setCurrentView('result');

    // Persist to Firebase Firestore for cross-device sync
    try {
      await saveSubmissionToFirebase(newSubmission);
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
    setSubmissions(prev => [newSub, ...prev.filter(s => s.id !== newSub.id)]);
    try {
      await saveSubmissionToFirebase(newSub);
    } catch (err) {
      console.error('Error adding submission to Firebase:', err);
    }
  };

  // Add multiple submissions manually by teacher
  const handleAddBatchSubmissions = async (newSubs: QuizSubmission[]) => {
    setSubmissions(prev => [...newSubs, ...prev]);
    try {
      await saveBatchSubmissionsToFirebase(newSubs);
    } catch (err) {
      console.error('Error adding batch submissions to Firebase:', err);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-linear-to-b from-amber-50/40 via-white to-orange-50/20 text-slate-800">
      {/* Navigation */}
      <div className="no-print">
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
        />
      </div>

      {/* Main View Area */}
      <main className="flex-1">
        {currentView === 'start' && (
          <StartScreen
            onStartQuiz={handleStartQuiz}
            onOpenTeacherAuth={() => setIsTeacherAuthOpen(true)}
          />
        )}

        {currentView === 'quiz' && currentStudent && (
          <QuizScreen
            student={currentStudent}
            onFinishQuiz={handleFinishQuiz}
            onExitQuiz={() => {
              stopSpeech();
              setCurrentView('start');
            }}
            soundOn={soundOn}
            onToggleSound={handleToggleSound}
          />
        )}

        {currentView === 'result' && latestSubmission && currentStudent && (
          <ResultScreen
            submission={latestSubmission}
            student={currentStudent}
            onRetakeQuiz={handleRetakeQuiz}
            onGoHome={() => setCurrentView('start')}
            onOpenTeacherAuth={() => setIsTeacherAuthOpen(true)}
          />
        )}

        {currentView === 'dashboard' && (
          <TeacherDashboard
            submissions={submissions}
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

      {/* Teacher Authentication Modal */}
      {isTeacherAuthOpen && (
        <TeacherPinModal
          currentPin={teacherPin}
          onSuccess={handleTeacherPinSuccess}
          onClose={() => setIsTeacherAuthOpen(false)}
        />
      )}

      {/* Footer with Mandatory Branding */}
      <div className="no-print">
        <Footer />
      </div>
    </div>
  );
}
