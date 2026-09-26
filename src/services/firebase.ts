import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { 
  initializeFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  deleteDoc, 
  writeBatch, 
  onSnapshot, 
  query, 
  orderBy 
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { QuizSubmission, QuizViolationRecord, Question, ProcedureTextConfig } from '../types';

// Initialize Firebase App & Services
const app = initializeApp(firebaseConfig);

// Initialize Firestore with forced long polling to ensure bulletproof connectivity across school firewalls, proxies, iframes, and preview sandboxes
export const db = initializeFirestore(
  app,
  {
    experimentalForceLongPolling: true,
  },
  firebaseConfig.firestoreDatabaseId
);
export const auth = getAuth(app);

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

/**
 * Validate connection to Firestore on initial boot.
 * Uses standard getDoc with graceful fallback so temporary network latency or offline mode does not emit uncaught errors.
 */
export async function testConnection(): Promise<boolean> {
  try {
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Connection check timeout')), 3500)
    );
    await Promise.race([
      getDoc(doc(db, 'settings', 'app')),
      timeoutPromise
    ]);
    return true;
  } catch (error) {
    console.warn('Firestore initial connection status:', error instanceof Error ? error.message : String(error));
    return false;
  }
}

const SUBMISSIONS_COLLECTION = 'submissions';
const DELETED_COLLECTION = 'deletedSubmissions';
const SETTINGS_COLLECTION = 'settings';
const VIOLATIONS_COLLECTION = 'violations';

/**
 * Real-time subscription to submissions across all devices with tombstone filtering.
 */
export function subscribeToSubmissions(
  onData: (submissions: QuizSubmission[]) => void,
  onError?: (error: Error) => void
): () => void {
  let deletedIds = new Set<string>();
  let currentSubmissions: QuizSubmission[] = [];

  const emitFiltered = () => {
    const activeSubmissions = currentSubmissions.filter((s) => !deletedIds.has(s.id));
    onData(activeSubmissions);
  };

  // Subscribe to deleted tombstones to ensure deleted submissions never appear
  const unsubDeleted = onSnapshot(
    collection(db, DELETED_COLLECTION),
    (snapshot) => {
      const ids = new Set<string>();
      snapshot.forEach((docSnap) => {
        ids.add(docSnap.id);
      });
      deletedIds = ids;
      emitFiltered();
    },
    (err) => {
      console.warn('Deleted tombstones snapshot warning:', err);
    }
  );

  const q = query(collection(db, SUBMISSIONS_COLLECTION));

  const unsubSubmissions = onSnapshot(
    q,
    (snapshot) => {
      const items: QuizSubmission[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const id = data.id || docSnap.id;
        if (!deletedIds.has(id)) {
          items.push({
            id,
            studentName: data.studentName || '',
            studentClass: data.studentClass || '',
            studentNumber: data.studentNumber || '',
            score: typeof data.score === 'number' ? data.score : 0,
            totalQuestions: typeof data.totalQuestions === 'number' ? data.totalQuestions : 10,
            correctCount: typeof data.correctCount === 'number' ? data.correctCount : 0,
            wrongCount: typeof data.wrongCount === 'number' ? data.wrongCount : 0,
            answers: data.answers || {},
            timeSpentSeconds: typeof data.timeSpentSeconds === 'number' ? data.timeSpentSeconds : 0,
            submittedAt: data.submittedAt || new Date().toISOString(),
            violationsCount: typeof data.violationsCount === 'number' ? data.violationsCount : 0,
          });
        }
      });

      // Sort newest first by submission timestamp
      items.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
      currentSubmissions = items;
      emitFiltered();
    },
    (err) => {
      console.warn('Snapshot subscription notice for submissions (will reconnect automatically):', err?.message || err);
      if (onError) onError(err);
    }
  );

  return () => {
    unsubDeleted();
    unsubSubmissions();
  };
}

/**
 * Save a single submission to Firestore so it syncs immediately across all devices.
 */
export async function saveSubmissionToFirebase(submission: QuizSubmission): Promise<void> {
  const docRef = doc(db, SUBMISSIONS_COLLECTION, submission.id);
  const delRef = doc(db, DELETED_COLLECTION, submission.id);
  try {
    const batch = writeBatch(db);
    batch.set(docRef, {
      id: submission.id,
      studentName: submission.studentName,
      studentClass: submission.studentClass,
      studentNumber: submission.studentNumber,
      score: submission.score,
      totalQuestions: submission.totalQuestions,
      correctCount: submission.correctCount,
      wrongCount: submission.wrongCount,
      answers: submission.answers,
      timeSpentSeconds: submission.timeSpentSeconds,
      submittedAt: submission.submittedAt,
      violationsCount: submission.violationsCount || 0,
    });
    // Remove from tombstone if re-created
    batch.delete(delRef);
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `${SUBMISSIONS_COLLECTION}/${submission.id}`);
  }
}

/**
 * Batch save multiple submissions (e.g. from sample data or excel import).
 */
export async function saveBatchSubmissionsToFirebase(submissions: QuizSubmission[]): Promise<void> {
  try {
    const batch = writeBatch(db);
    submissions.forEach((sub) => {
      const docRef = doc(db, SUBMISSIONS_COLLECTION, sub.id);
      const delRef = doc(db, DELETED_COLLECTION, sub.id);
      batch.set(docRef, {
        id: sub.id,
        studentName: sub.studentName,
        studentClass: sub.studentClass,
        studentNumber: sub.studentNumber,
        score: sub.score,
        totalQuestions: sub.totalQuestions,
        correctCount: sub.correctCount,
        wrongCount: sub.wrongCount,
        answers: sub.answers,
        timeSpentSeconds: sub.timeSpentSeconds,
        submittedAt: sub.submittedAt,
        violationsCount: sub.violationsCount || 0,
      });
      // Clear tombstone
      batch.delete(delRef);
    });
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, SUBMISSIONS_COLLECTION);
  }
}

/**
 * Delete a submission from Firestore PERMANENTLY.
 * Both deletes the document from submissions AND writes a tombstone in deletedSubmissions
 * to guarantee it cannot be restored by stale caches on other devices.
 */
export async function deleteSubmissionFromFirebase(submissionId: string): Promise<void> {
  const subDocRef = doc(db, SUBMISSIONS_COLLECTION, submissionId);
  const delDocRef = doc(db, DELETED_COLLECTION, submissionId);
  try {
    const batch = writeBatch(db);
    batch.delete(subDocRef);
    batch.set(delDocRef, {
      deletedId: submissionId,
      deletedAt: new Date().toISOString(),
    });
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${SUBMISSIONS_COLLECTION}/${submissionId}`);
  }
}

/**
 * Clear all submissions in Firestore PERMANENTLY across all devices.
 */
export async function clearAllSubmissionsFromFirebase(): Promise<void> {
  try {
    const querySnapshot = await getDocs(collection(db, SUBMISSIONS_COLLECTION));
    const batch = writeBatch(db);
    querySnapshot.forEach((docSnap) => {
      batch.delete(docSnap.ref);
      const delDocRef = doc(db, DELETED_COLLECTION, docSnap.id);
      batch.set(delDocRef, {
        deletedId: docSnap.id,
        deletedAt: new Date().toISOString(),
      });
    });
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, SUBMISSIONS_COLLECTION);
  }
}

/**
 * Real-time subscription to Teacher PIN so changing PIN on one device updates all devices.
 */
export function subscribeToTeacherPin(
  onPin: (pin: string) => void,
  defaultPin: string = '1234'
): () => void {
  const docRef = doc(db, SETTINGS_COLLECTION, 'app');

  return onSnapshot(
    docRef,
    (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.teacherPin) {
          onPin(data.teacherPin);
          return;
        }
      }
      // If not yet created in Firestore, keep defaultPin
      onPin(defaultPin);
    },
    (err) => {
      console.warn('Teacher PIN snapshot warning (falling back to local):', err);
    }
  );
}

/**
 * Save new teacher PIN to Firestore.
 */
export async function saveTeacherPinToFirebase(newPin: string): Promise<void> {
  const docRef = doc(db, SETTINGS_COLLECTION, 'app');
  try {
    await setDoc(docRef, {
      teacherPin: newPin,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${SETTINGS_COLLECTION}/app`);
  }
}

/**
 * Real-time subscription to violations for the teacher dashboard.
 */
export function subscribeToViolations(
  onData: (violations: QuizViolationRecord[]) => void,
  onError?: (error: Error) => void
): () => void {
  const q = query(collection(db, VIOLATIONS_COLLECTION));

  return onSnapshot(
    q,
    (snapshot) => {
      const items: QuizViolationRecord[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        items.push({
          id: data.id || docSnap.id,
          studentName: data.studentName || '',
          studentClass: data.studentClass || '',
          studentNumber: data.studentNumber || '',
          questionNumber: typeof data.questionNumber === 'number' ? data.questionNumber : 1,
          violationCount: typeof data.violationCount === 'number' ? data.violationCount : 1,
          timestamp: data.timestamp || new Date().toISOString(),
          unlockToken: data.unlockToken || '',
          reason: data.reason || 'Terdeteksi membuka tab lain atau meminimalkan browser',
          status: data.status === 'unlocked' ? 'unlocked' : 'locked',
          unlockedAt: data.unlockedAt,
        });
      });
      // Sort newest first
      items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      onData(items);
    },
    (err) => {
      console.warn('Violations subscription notice:', err?.message || err);
      if (onError) onError(err);
    }
  );
}

/**
 * Report a new student violation to Firestore so it immediately notifies teacher dashboards in real-time.
 */
export async function reportViolationToFirebase(violation: QuizViolationRecord): Promise<void> {
  const docRef = doc(db, VIOLATIONS_COLLECTION, violation.id);
  try {
    await setDoc(docRef, {
      id: violation.id,
      studentName: violation.studentName,
      studentClass: violation.studentClass,
      studentNumber: violation.studentNumber,
      questionNumber: violation.questionNumber,
      violationCount: violation.violationCount,
      timestamp: violation.timestamp,
      unlockToken: violation.unlockToken || '-',
      reason: violation.reason || 'Terdeteksi membuka tab lain atau meminimalkan browser',
      status: violation.status,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `${VIOLATIONS_COLLECTION}/${violation.id}`);
  }
}

/**
 * Update violation status (e.g. unlocked by student or remotely by teacher).
 */
export async function updateViolationStatusInFirebase(
  violationId: string, 
  status: 'locked' | 'unlocked'
): Promise<void> {
  const docRef = doc(db, VIOLATIONS_COLLECTION, violationId);
  try {
    await setDoc(
      docRef,
      {
        status,
        unlockedAt: status === 'unlocked' ? new Date().toISOString() : undefined,
      },
      { merge: true }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${VIOLATIONS_COLLECTION}/${violationId}`);
  }
}

/**
 * Delete a single violation log entry from Firestore.
 */
export async function deleteViolationFromFirebase(violationId: string): Promise<void> {
  const docRef = doc(db, VIOLATIONS_COLLECTION, violationId);
  try {
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${VIOLATIONS_COLLECTION}/${violationId}`);
  }
}

/**
 * Clear all violation history from Firestore.
 */
export async function clearAllViolationsFromFirebase(): Promise<void> {
  try {
    const snapshot = await getDocs(collection(db, VIOLATIONS_COLLECTION));
    const batch = writeBatch(db);
    snapshot.forEach((docSnap) => {
      batch.delete(docSnap.ref);
    });
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, VIOLATIONS_COLLECTION);
  }
}

/**
 * Listen to a specific violation's status in real-time (e.g. on student ViolationScreen for remote unlock).
 */
export function listenToViolationStatus(
  violationId: string,
  onStatusChange: (status: 'locked' | 'unlocked') => void
): () => void {
  const docRef = doc(db, VIOLATIONS_COLLECTION, violationId);
  return onSnapshot(
    docRef,
    (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.status) {
          onStatusChange(data.status);
        }
      }
    },
    (err) => {
      console.warn('Violation status listener notice:', err?.message || err);
    }
  );
}

const QUESTION_BANK_DOC = 'questionBank';

/**
 * Subscribe to custom question bank synced across teacher and student devices.
 */
export function subscribeToQuestionBank(
  onData: (questions: Question[] | null) => void,
  onError?: (error: Error) => void
): () => void {
  const docRef = doc(db, SETTINGS_COLLECTION, QUESTION_BANK_DOC);
  return onSnapshot(
    docRef,
    (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.questionsJson) {
          try {
            const parsed = JSON.parse(data.questionsJson);
            if (Array.isArray(parsed) && parsed.length > 0) {
              onData(parsed);
              return;
            }
          } catch (e) {
            console.warn('Failed to parse synchronized questionBank:', e);
          }
        }
      }
      onData(null);
    },
    (err) => {
      console.warn('Question bank subscription notice:', err?.message || err);
      onError?.(err);
    }
  );
}

/**
 * Save updated question bank (from Word import) to Firebase so all devices receive it.
 */
export async function saveQuestionBankToFirebase(questions: Question[]): Promise<void> {
  const docRef = doc(db, SETTINGS_COLLECTION, QUESTION_BANK_DOC);
  try {
    await setDoc(
      docRef,
      {
        questionsJson: JSON.stringify(questions),
        totalQuestions: questions.length,
        updatedAt: new Date().toISOString()
      },
      { merge: true }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${SETTINGS_COLLECTION}/${QUESTION_BANK_DOC}`);
  }
}

/**
 * Reset question bank in Firebase back to default.
 */
export async function resetQuestionBankInFirebase(): Promise<void> {
  const docRef = doc(db, SETTINGS_COLLECTION, QUESTION_BANK_DOC);
  try {
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${SETTINGS_COLLECTION}/${QUESTION_BANK_DOC}`);
  }
}

const PROCEDURE_TEXT_DOC = 'procedureText';

/**
 * Subscribe to synchronized Procedure Text material & recipe database.
 */
export function subscribeToProcedureText(
  onData: (material: ProcedureTextConfig | null) => void,
  onError?: (error: Error) => void
): () => void {
  const docRef = doc(db, SETTINGS_COLLECTION, PROCEDURE_TEXT_DOC);
  return onSnapshot(
    docRef,
    (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.procedureTextJson) {
          try {
            const parsed = JSON.parse(data.procedureTextJson);
            if (parsed && typeof parsed === 'object') {
              onData(parsed);
              return;
            }
          } catch (e) {
            console.warn('Failed to parse synchronized procedureText:', e);
          }
        }
      }
      onData(null);
    },
    (err) => {
      console.warn('Procedure text subscription notice:', err?.message || err);
      onError?.(err);
    }
  );
}

/**
 * Save updated Procedure Text material & recipes to Firebase Firestore.
 */
export async function saveProcedureTextToFirebase(config: ProcedureTextConfig): Promise<void> {
  const docRef = doc(db, SETTINGS_COLLECTION, PROCEDURE_TEXT_DOC);
  try {
    await setDoc(
      docRef,
      {
        procedureTextJson: JSON.stringify(config),
        totalTexts: config.texts?.length || 0,
        updatedAt: new Date().toISOString()
      },
      { merge: true }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${SETTINGS_COLLECTION}/${PROCEDURE_TEXT_DOC}`);
  }
}

/**
 * Reset Procedure Text material in Firebase back to default.
 */
export async function resetProcedureTextInFirebase(): Promise<void> {
  const docRef = doc(db, SETTINGS_COLLECTION, PROCEDURE_TEXT_DOC);
  try {
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${SETTINGS_COLLECTION}/${PROCEDURE_TEXT_DOC}`);
  }
}

