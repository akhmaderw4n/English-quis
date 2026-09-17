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
import { isSoundEnabled, setSoundEnabled, playClickSound } from './utils/audio';

const STORAGE_KEY_SUBMISSIONS = 'en_nusantara_quiz_submissions_v1';
const STORAGE_KEY_PIN = 'en_nusantara_teacher_pin_v1';

export default function App() {
  const [currentView, setCurrentView] = useState<ViewState>('start');
  const [currentStudent, setCurrentStudent] = useState<StudentInfo | null>(null);
  const [latestSubmission, setLatestSubmission] = useState<QuizSubmission | null>(null);
  const [isTeacherAuthOpen, setIsTeacherAuthOpen] = useState(false);
  const [soundOn, setSoundOn] = useState(true);

  // Load teacher PIN with fallback to default "1234"
  const [teacherPin, setTeacherPin] = useState<string>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY_PIN) || QUIZ_METADATA.defaultTeacherPin;
    } catch {
      return QUIZ_METADATA.defaultTeacherPin;
    }
  });

  // Load submissions with fallback to initial sample data from English for Nusantara characters
  const [submissions, setSubmissions] = useState<QuizSubmission[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_SUBMISSIONS);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error('Error loading submissions from localStorage', e);
    }
    return INITIAL_STUDENT_SUBMISSIONS;
  });

  // Persist submissions
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_SUBMISSIONS, JSON.stringify(submissions));
    } catch (e) {
      console.error('Error saving submissions to localStorage', e);
    }
  }, [submissions]);

  // Persist PIN
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

  // Finish Quiz & Record Submission
  const handleFinishQuiz = (answers: Record<number, 'A' | 'B' | 'C' | 'D'>, timeSpentSeconds: number) => {
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

    setSubmissions(prev => [newSubmission, ...prev]);
    setLatestSubmission(newSubmission);
    setCurrentView('result');
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

  // Change PIN
  const handleChangePin = (newPin: string) => {
    setTeacherPin(newPin);
  };

  // Delete individual submission
  const handleDeleteSubmission = (id: string) => {
    setSubmissions(prev => prev.filter(s => s.id !== id));
  };

  // Clear all submissions
  const handleClearSubmissions = () => {
    setSubmissions([]);
  };

  // Re-seed sample data
  const handleSeedSampleData = () => {
    setSubmissions(INITIAL_STUDENT_SUBMISSIONS);
  };

  return (
    <div className="min-h-screen flex flex-col bg-linear-to-b from-amber-50/40 via-white to-orange-50/20 text-slate-800">
      {/* Navigation */}
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
      />

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
            onExitQuiz={() => setCurrentView('start')}
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
      <Footer />
    </div>
  );
}
