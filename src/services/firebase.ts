import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocFromServer,
  getDocs, 
  deleteDoc, 
  writeBatch, 
  onSnapshot, 
  query, 
  orderBy 
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { QuizSubmission } from '../types';

// Initialize Firebase App & Services
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
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
 */
export async function testConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'settings', 'app'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firestore is currently operating in offline/cached mode.');
    }
    return false;
  }
}

const SUBMISSIONS_COLLECTION = 'submissions';
const SETTINGS_COLLECTION = 'settings';

/**
 * Real-time subscription to submissions across all devices.
 */
export function subscribeToSubmissions(
  onData: (submissions: QuizSubmission[]) => void,
  onError?: (error: Error) => void
): () => void {
  const q = query(collection(db, SUBMISSIONS_COLLECTION));

  return onSnapshot(
    q,
    (snapshot) => {
      const items: QuizSubmission[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        items.push({
          id: data.id || docSnap.id,
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
        });
      });

      // Sort newest first by submission timestamp
      items.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
      onData(items);
    },
    (err) => {
      console.error('Snapshot error for submissions:', err);
      if (onError) onError(err);
      handleFirestoreError(err, OperationType.LIST, SUBMISSIONS_COLLECTION);
    }
  );
}

/**
 * Save a single submission to Firestore so it syncs immediately across all devices.
 */
export async function saveSubmissionToFirebase(submission: QuizSubmission): Promise<void> {
  const docRef = doc(db, SUBMISSIONS_COLLECTION, submission.id);
  try {
    await setDoc(docRef, {
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
    });
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
      });
    });
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, SUBMISSIONS_COLLECTION);
  }
}

/**
 * Delete a submission from Firestore.
 */
export async function deleteSubmissionFromFirebase(submissionId: string): Promise<void> {
  const docRef = doc(db, SUBMISSIONS_COLLECTION, submissionId);
  try {
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${SUBMISSIONS_COLLECTION}/${submissionId}`);
  }
}

/**
 * Clear all submissions in Firestore.
 */
export async function clearAllSubmissionsFromFirebase(): Promise<void> {
  try {
    const querySnapshot = await getDocs(collection(db, SUBMISSIONS_COLLECTION));
    const batch = writeBatch(db);
    querySnapshot.forEach((docSnap) => {
      batch.delete(docSnap.ref);
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
