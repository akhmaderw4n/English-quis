import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { 
  initializeFirestore, 
  setLogLevel,
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  deleteDoc, 
  writeBatch, 
  onSnapshot, 
  query, 
  DocumentData
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { QuizSubmission, QuizViolationRecord, Question, ProcedureTextConfig, StudentRestrictionConfig, DashboardBackgroundConfig } from '../types';

// Silence internal Firestore 10s offline-fallback console.error noise on high-latency school networks
try {
  setLogLevel('silent');
} catch {
  // Ignore if setLogLevel is unavailable in environment
}

// Initialize Firebase App & Services
const app = initializeApp(firebaseConfig);

// Use auto-detect long polling so standard fast WebChannel is used by default and long-polling only activates if a firewall blocks streams
export const db = initializeFirestore(
  app,
  {
    experimentalAutoDetectLongPolling: true,
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
  const errMsg = error instanceof Error ? error.message : String(error);
  const errInfo: FirestoreErrorInfo = {
    error: errMsg,
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
  if (errMsg.toLowerCase().includes('permission') || errMsg.toLowerCase().includes('insufficient')) {
    console.error('Firestore Error: ', JSON.stringify(errInfo));
  } else {
    console.warn('Firestore operation notice:', errMsg);
  }
  throw new Error(JSON.stringify(errInfo));
}

const SUBMISSIONS_COLLECTION = 'submissions';
const DELETED_COLLECTION = 'deletedSubmissions';
const SETTINGS_COLLECTION = 'settings';
const VIOLATIONS_COLLECTION = 'violations';

// Shared multiplexer for `/settings` collection so all 5 settings docs share 1 Firestore stream instead of 5 separate listeners
type SettingsCacheMap = Record<string, DocumentData>;
let latestSettingsMap: SettingsCacheMap = {};
let hasSettingsSnapshotLoaded = false;
const settingsSubscribers = new Set<(map: SettingsCacheMap) => void>();
let sharedSettingsUnsubscribe: (() => void) | null = null;

function subscribeToSharedSettings(listener: (map: SettingsCacheMap) => void): () => void {
  settingsSubscribers.add(listener);
  if (hasSettingsSnapshotLoaded) {
    listener(latestSettingsMap);
  }

  if (!sharedSettingsUnsubscribe) {
    sharedSettingsUnsubscribe = onSnapshot(
      collection(db, SETTINGS_COLLECTION),
      (snapshot) => {
        const nextMap: SettingsCacheMap = {};
        snapshot.forEach((docSnap) => {
          nextMap[docSnap.id] = docSnap.data();
        });
        latestSettingsMap = nextMap;
        hasSettingsSnapshotLoaded = true;
        settingsSubscribers.forEach((cb) => {
          try {
            cb(latestSettingsMap);
          } catch (e) {
            console.warn('Settings subscriber callback warning:', e);
          }
        });
      },
      (err) => {
        console.warn('Shared settings snapshot notice (operating with local cache):', err?.message || err);
      }
    );
  }

  return () => {
    settingsSubscribers.delete(listener);
    if (settingsSubscribers.size === 0 && sharedSettingsUnsubscribe) {
      sharedSettingsUnsubscribe();
      sharedSettingsUnsubscribe = null;
      hasSettingsSnapshotLoaded = false;
    }
  };
}

/**
 * Validate connection to Firestore on initial boot without opening redundant competing RPC streams.
 */
export async function testConnection(): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return false;
  }
  if (hasSettingsSnapshotLoaded) {
    return true;
  }
  return new Promise<boolean>((resolve) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        unsub();
        // Resolve true if browser is online (Firestore offline persistence handles syncing seamlessly)
        resolve(typeof navigator !== 'undefined' ? navigator.onLine !== false : true);
      }
    }, 4000);

    const unsub = subscribeToSharedSettings(() => {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        unsub();
        resolve(true);
      }
    });
  });
}

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
            ...(typeof data.hasSubmitted === 'boolean' ? { hasSubmitted: data.hasSubmitted } : {}),
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
  const safeId = String(submission.id || `sub-${Date.now()}`).replace(/[^a-zA-Z0-9_\-]/g, '-').slice(0, 120);
  const docRef = doc(db, SUBMISSIONS_COLLECTION, safeId);
  const delRef = doc(db, DELETED_COLLECTION, safeId);
  try {
    const batch = writeBatch(db);
    batch.set(docRef, {
      id: safeId,
      studentName: (submission.studentName || 'Siswa').trim().slice(0, 115) || 'Siswa',
      studentClass: (submission.studentClass || '7A').trim().slice(0, 25) || '7A',
      studentNumber: (submission.studentNumber || '1').trim().slice(0, 14) || '1',
      score: Math.min(100, Math.max(0, Number(submission.score) || 0)),
      totalQuestions: Math.min(100, Math.max(0, Number(submission.totalQuestions) || 10)),
      correctCount: Math.min(100, Math.max(0, Number(submission.correctCount) || 0)),
      wrongCount: Math.min(100, Math.max(0, Number(submission.wrongCount) || 0)),
      answers: submission.answers || {},
      timeSpentSeconds: Math.max(0, Math.round(Number(submission.timeSpentSeconds) || 0)),
      submittedAt: (submission.submittedAt || new Date().toISOString()).slice(0, 45),
      violationsCount: Math.max(0, Number(submission.violationsCount) || 0),
      ...(typeof submission.hasSubmitted === 'boolean' ? { hasSubmitted: submission.hasSubmitted } : {}),
    });
    // Remove from tombstone if re-created
    batch.delete(delRef);
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `${SUBMISSIONS_COLLECTION}/${safeId}`);
  }
}

/**
 * Batch save multiple submissions (e.g. from sample data or excel import).
 */
export async function saveBatchSubmissionsToFirebase(submissions: QuizSubmission[]): Promise<void> {
  try {
    const batch = writeBatch(db);
    submissions.forEach((sub, idx) => {
      const safeId = String(sub.id || `sub-batch-${Date.now()}-${idx}`).replace(/[^a-zA-Z0-9_\-]/g, '-').slice(0, 120);
      const docRef = doc(db, SUBMISSIONS_COLLECTION, safeId);
      const delRef = doc(db, DELETED_COLLECTION, safeId);
      batch.set(docRef, {
        id: safeId,
        studentName: (sub.studentName || 'Siswa').trim().slice(0, 115) || 'Siswa',
        studentClass: (sub.studentClass || '7A').trim().slice(0, 25) || '7A',
        studentNumber: (sub.studentNumber || '1').trim().slice(0, 14) || '1',
        score: Math.min(100, Math.max(0, Number(sub.score) || 0)),
        totalQuestions: Math.min(100, Math.max(0, Number(sub.totalQuestions) || 10)),
        correctCount: Math.min(100, Math.max(0, Number(sub.correctCount) || 0)),
        wrongCount: Math.min(100, Math.max(0, Number(sub.wrongCount) || 0)),
        answers: sub.answers || {},
        timeSpentSeconds: Math.max(0, Math.round(Number(sub.timeSpentSeconds) || 0)),
        submittedAt: (sub.submittedAt || new Date().toISOString()).slice(0, 45),
        violationsCount: Math.max(0, Number(sub.violationsCount) || 0),
        ...(typeof sub.hasSubmitted === 'boolean' ? { hasSubmitted: sub.hasSubmitted } : {}),
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
  return subscribeToSharedSettings((settingsMap) => {
    const data = settingsMap['app'];
    if (data && data.teacherPin) {
      onPin(data.teacherPin);
      return;
    }
    onPin(defaultPin);
  });
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
  const safeId = String(violation.id || `viol-${Date.now()}`).replace(/[^a-zA-Z0-9_\-]/g, '-').slice(0, 120);
  const docRef = doc(db, VIOLATIONS_COLLECTION, safeId);
  try {
    await setDoc(docRef, {
      id: safeId,
      studentName: (violation.studentName || 'Siswa').trim().slice(0, 115) || 'Siswa',
      studentClass: (violation.studentClass || '7A').trim().slice(0, 25) || '7A',
      studentNumber: (violation.studentNumber || '1').trim().slice(0, 14) || '1',
      questionNumber: Math.max(1, Number(violation.questionNumber) || 1),
      violationCount: Math.max(1, Number(violation.violationCount) || 1),
      timestamp: violation.timestamp || new Date().toISOString(),
      unlockToken: (violation.unlockToken || '-').slice(0, 25),
      reason: (violation.reason || 'Terdeteksi membuka tab lain atau meminimalkan browser').slice(0, 280),
      status: violation.status === 'unlocked' ? 'unlocked' : 'locked',
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `${VIOLATIONS_COLLECTION}/${safeId}`);
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
        ...(status === 'unlocked' ? { unlockedAt: new Date().toISOString() } : {}),
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
  _onError?: (error: Error) => void
): () => void {
  return subscribeToSharedSettings((settingsMap) => {
    const data = settingsMap[QUESTION_BANK_DOC];
    if (data && data.questionsJson) {
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
    onData(null);
  });
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
  _onError?: (error: Error) => void
): () => void {
  return subscribeToSharedSettings((settingsMap) => {
    const data = settingsMap[PROCEDURE_TEXT_DOC];
    if (data && data.procedureTextJson) {
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
    onData(null);
  });
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

const STUDENT_RESTRICTIONS_DOC = 'studentRestrictions';

/**
 * Subscribe to synchronized Student Attempt & Quiz Restriction configuration.
 */
export function subscribeToStudentRestrictions(
  onData: (config: StudentRestrictionConfig | null) => void,
  _onError?: (error: Error) => void
): () => void {
  return subscribeToSharedSettings((settingsMap) => {
    const data = settingsMap[STUDENT_RESTRICTIONS_DOC];
    if (data && data.restrictionsJson) {
      try {
        const parsed = JSON.parse(data.restrictionsJson);
        if (parsed && typeof parsed === 'object') {
          onData(parsed);
          return;
        }
      } catch (e) {
        console.warn('Failed to parse synchronized studentRestrictions:', e);
      }
    }
    onData(null);
  });
}

/**
 * Save updated Student Attempt & Quiz Restriction settings to Firebase Firestore.
 */
export async function saveStudentRestrictionsToFirebase(config: StudentRestrictionConfig): Promise<void> {
  const docRef = doc(db, SETTINGS_COLLECTION, STUDENT_RESTRICTIONS_DOC);
  try {
    await setDoc(
      docRef,
      {
        restrictionsJson: JSON.stringify(config),
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${SETTINGS_COLLECTION}/${STUDENT_RESTRICTIONS_DOC}`);
  }
}

const DASHBOARD_BACKGROUND_DOC = 'dashboardBackground';

/**
 * Subscribe to synchronized Dashboard Background configuration.
 */
export function subscribeToDashboardBackground(
  onData: (config: DashboardBackgroundConfig | null) => void,
  _onError?: (error: Error) => void
): () => void {
  return subscribeToSharedSettings((settingsMap) => {
    const data = settingsMap[DASHBOARD_BACKGROUND_DOC];
    if (data && data.backgroundJson) {
      try {
        const parsed = JSON.parse(data.backgroundJson);
        if (parsed && typeof parsed === 'object') {
          onData(parsed);
          return;
        }
      } catch (e) {
        console.warn('Failed to parse synchronized dashboardBackground:', e);
      }
    }
    onData(null);
  });
}

/**
 * Save updated Dashboard Background settings to Firebase Firestore (truncating history if needed to stay under 900KB).
 */
export async function saveDashboardBackgroundToFirebase(config: DashboardBackgroundConfig): Promise<void> {
  const docRef = doc(db, SETTINGS_COLLECTION, DASHBOARD_BACKGROUND_DOC);
  try {
    let payloadConfig = { ...config };
    let serialized = JSON.stringify(payloadConfig);
    if (serialized.length > 850000 && Array.isArray(payloadConfig.savedCustomImages)) {
      payloadConfig = {
        ...payloadConfig,
        savedCustomImages: payloadConfig.savedCustomImages.slice(0, 2),
      };
      serialized = JSON.stringify(payloadConfig);
    }
    if (serialized.length > 850000) {
      payloadConfig = {
        ...payloadConfig,
        savedCustomImages: [],
      };
      serialized = JSON.stringify(payloadConfig);
    }

    await setDoc(
      docRef,
      {
        backgroundJson: serialized,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${SETTINGS_COLLECTION}/${DASHBOARD_BACKGROUND_DOC}`);
  }
}



