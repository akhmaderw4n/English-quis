import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import {
  initializeFirestore,
  setLogLevel,
  collection,
  doc,
  setDoc,
  getDocs,
  deleteDoc,
  writeBatch,
  onSnapshot,
  query,
  DocumentData,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import {
  QuizSubmission,
  QuizViolationRecord,
  Question,
  ProcedureTextConfig,
  StudentRestrictionConfig,
  DashboardBackgroundConfig,
} from '../types';

try {
  setLogLevel('silent');
} catch {
  // Ignore if unavailable
}

const app = initializeApp(firebaseConfig);

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

let isFirestoreQuotaExhausted = false;

function isQuotaOrNetworkError(error: unknown): boolean {
  const msg = (error instanceof Error ? error.message : String(error)).toLowerCase();
  const code = String((error as any)?.code || '').toLowerCase();
  return (
    code.includes('resource-exhausted') ||
    code.includes('unavailable') ||
    msg.includes('quota') ||
    msg.includes('resource-exhausted') ||
    msg.includes('offline') ||
    msg.includes('failed-precondition')
  );
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): void {
  const errMsg = error instanceof Error ? error.message : String(error);
  if (isQuotaOrNetworkError(error)) {
    isFirestoreQuotaExhausted = true;
    return;
  }
  const errInfo: FirestoreErrorInfo = {
    error: errMsg,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  if (errMsg.toLowerCase().includes('permission') || errMsg.toLowerCase().includes('insufficient')) {
    console.error('Firestore Error: ', JSON.stringify(errInfo));
  } else {
    console.warn('Firestore operation notice:', errMsg);
  }
}

const SUBMISSIONS_COLLECTION = 'submissions';
const DELETED_COLLECTION = 'deletedSubmissions';
const SETTINGS_COLLECTION = 'settings';
const VIOLATIONS_COLLECTION = 'violations';

const QUESTION_BANK_DOC = 'questionBank';
const PROCEDURE_TEXT_DOC = 'procedureText';
const STUDENT_RESTRICTIONS_DOC = 'studentRestrictions';
const DASHBOARD_BACKGROUND_DOC = 'dashboardBackground';

const LS_SUBMISSIONS = 'en_nusantara_quiz_submissions_v1';
const LS_RESTRICTIONS = 'en_nusantara_student_restrictions_v1';
const LS_PIN = 'en_nusantara_teacher_pin_v1';
const LS_QUESTIONS = 'en_nusantara_quiz_questions_v1';
const LS_PROCEDURE = 'en_nusantara_learning_material_v2';
const LS_BG = 'en_nusantara_dashboard_bg_v1';

type SettingsCacheMap = Record<string, DocumentData>;

const submissionsMap = new Map<string, QuizSubmission>();
const deletedIdsSet = new Set<string>();
let latestSettingsMap: SettingsCacheMap = {};
const violationsMap = new Map<string, QuizViolationRecord>();

const submissionListeners = new Set<(subs: QuizSubmission[]) => void>();
const settingsSubscribers = new Set<(map: SettingsCacheMap) => void>();
const violationListeners = new Set<(viols: QuizViolationRecord[]) => void>();

let hasInitializedLocal = false;
let hasInitialMergeSent = false;
let pollIntervalId: ReturnType<typeof setInterval> | null = null;

function normalizeNameKey(name: string): string {
  return String(name || '')
    .trim()
    .replace(/^\d{1,3}[\.\,\;\-\)\s\t]+/, '')
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function normalizeClassKey(cls: string): string {
  const raw = String(cls || '')
    .trim()
    .toUpperCase()
    .replace(/^KELAS[\s\-_:\.]*/i, '');
  const compact = raw.replace(/[\s\-_\.]/g, '');
  const match7 = compact.match(/^7([A-H])$/);
  if (match7) return `7${match7[1]}`;
  const matchRoman = compact.match(/^VII([A-H])$/);
  if (matchRoman) return `7${matchRoman[1]}`;
  return compact || '7A';
}

function mergeRestrictionConfigs(
  currentRaw: string | undefined,
  incomingRaw: string | undefined
): string | undefined {
  if (!incomingRaw) return currentRaw;
  if (!currentRaw) return incomingRaw;
  try {
    const currentObj = JSON.parse(currentRaw);
    const incomingObj = JSON.parse(incomingRaw);
    if (!currentObj || typeof currentObj !== 'object') return incomingRaw;
    if (!incomingObj || typeof incomingObj !== 'object') return currentRaw;

    const currentTime = currentObj.updatedAt ? new Date(currentObj.updatedAt).getTime() : 0;
    const incomingTime = incomingObj.updatedAt ? new Date(incomingObj.updatedAt).getTime() : 0;

    // Union registeredStudents so neither local nor server/cloud loses inputted class rosters (e.g., 7G)
    const rosterMap = new Map<string, any>();
    const olderRoster = incomingTime >= currentTime ? currentObj.registeredStudents : incomingObj.registeredStudents;
    const newerRoster = incomingTime >= currentTime ? incomingObj.registeredStudents : currentObj.registeredStudents;

    if (Array.isArray(olderRoster)) {
      olderRoster.forEach((r: any) => {
        if (!r || !r.name) return;
        const k = `${normalizeClassKey(r.studentClass)}__${normalizeNameKey(r.name)}`;
        rosterMap.set(k, { ...r, studentClass: normalizeClassKey(r.studentClass) });
      });
    }
    if (Array.isArray(newerRoster)) {
      newerRoster.forEach((r: any) => {
        if (!r || !r.name) return;
        const k = `${normalizeClassKey(r.studentClass)}__${normalizeNameKey(r.name)}`;
        rosterMap.set(k, { ...r, studentClass: normalizeClassKey(r.studentClass) });
      });
    }

    const base = incomingTime >= currentTime ? { ...currentObj, ...incomingObj } : { ...incomingObj, ...currentObj };
    base.registeredStudents = Array.from(rosterMap.values());
    return JSON.stringify(base);
  } catch {
    return incomingRaw || currentRaw;
  }
}

function hydrateFromLocalStorageOnce() {
  if (hasInitializedLocal || typeof window === 'undefined') return;
  hasInitializedLocal = true;

  try {
    const rawSubs = localStorage.getItem(LS_SUBMISSIONS);
    if (rawSubs) {
      const parsed: QuizSubmission[] = JSON.parse(rawSubs);
      if (Array.isArray(parsed)) {
        parsed.forEach((s) => {
          if (s && s.id && !deletedIdsSet.has(s.id)) {
            submissionsMap.set(s.id, {
              ...s,
              studentClass: normalizeClassKey(s.studentClass),
            });
          }
        });
      }
    }
  } catch {}

  try {
    const rawRestr = localStorage.getItem(LS_RESTRICTIONS);
    if (rawRestr) {
      latestSettingsMap[STUDENT_RESTRICTIONS_DOC] = {
        restrictionsJson: rawRestr,
        updatedAt: new Date().toISOString(),
      };
    }
  } catch {}

  try {
    const rawPin = localStorage.getItem(LS_PIN);
    if (rawPin) {
      latestSettingsMap['app'] = { teacherPin: rawPin };
    }
  } catch {}

  try {
    const rawQuestions = localStorage.getItem(LS_QUESTIONS);
    if (rawQuestions) {
      latestSettingsMap[QUESTION_BANK_DOC] = { questionsJson: rawQuestions };
    }
  } catch {}

  try {
    const rawProc = localStorage.getItem(LS_PROCEDURE);
    if (rawProc) {
      latestSettingsMap[PROCEDURE_TEXT_DOC] = { procedureTextJson: rawProc };
    }
  } catch {}

  try {
    const rawBg = localStorage.getItem(LS_BG);
    if (rawBg) {
      latestSettingsMap[DASHBOARD_BACKGROUND_DOC] = { backgroundJson: rawBg };
    }
  } catch {}
}

function emitSubmissions() {
  const active = Array.from(submissionsMap.values()).filter((s) => !deletedIdsSet.has(s.id));
  active.sort(
    (a, b) => new Date(b.submittedAt || 0).getTime() - new Date(a.submittedAt || 0).getTime()
  );
  submissionListeners.forEach((cb) => {
    try {
      cb(active);
    } catch {}
  });
}

function emitSettings() {
  settingsSubscribers.forEach((cb) => {
    try {
      cb(latestSettingsMap);
    } catch {}
  });
}

function emitViolations() {
  const list = Array.from(violationsMap.values());
  list.sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime());
  violationListeners.forEach((cb) => {
    try {
      cb(list);
    } catch {}
  });
}

async function syncWithBackendServer() {
  if (typeof window === 'undefined') return;
  hydrateFromLocalStorageOnce();

  if (!hasInitialMergeSent) {
    hasInitialMergeSent = true;
    try {
      const localSubs = Array.from(submissionsMap.values());
      let localRestrictionsObj: any = undefined;
      const rawRestr = latestSettingsMap[STUDENT_RESTRICTIONS_DOC]?.restrictionsJson;
      if (rawRestr) {
        try {
          localRestrictionsObj = JSON.parse(rawRestr);
        } catch {}
      }
      await fetch('/api/sync/merge-client', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          submissions: localSubs,
          studentRestrictions: localRestrictionsObj,
          settings: latestSettingsMap,
        }),
      });
    } catch {}
  }

  try {
    const res = await fetch('/api/sync');
    if (!res.ok) return;
    const data = await res.json();

    if (Array.isArray(data.deletedSubmissionIds)) {
      data.deletedSubmissionIds.forEach((id: string) => {
        deletedIdsSet.add(id);
        submissionsMap.delete(id);
      });
    }

    if (Array.isArray(data.submissions)) {
      data.submissions.forEach((sub: QuizSubmission) => {
        if (sub && sub.id && !deletedIdsSet.has(sub.id)) {
          submissionsMap.set(sub.id, {
            ...sub,
            studentClass: normalizeClassKey(sub.studentClass),
          });
        }
      });
    }
    emitSubmissions();

    if (data.settings && typeof data.settings === 'object') {
      const nextSettings: SettingsCacheMap = { ...latestSettingsMap };
      Object.entries(data.settings).forEach(([docId, docData]: [string, any]) => {
        if (!docData) return;
        if (docId === STUDENT_RESTRICTIONS_DOC && docData.restrictionsJson) {
          const mergedJson = mergeRestrictionConfigs(
            nextSettings[STUDENT_RESTRICTIONS_DOC]?.restrictionsJson,
            docData.restrictionsJson
          );
          nextSettings[STUDENT_RESTRICTIONS_DOC] = {
            ...docData,
            restrictionsJson: mergedJson,
          };
        } else {
          nextSettings[docId] = docData;
        }
      });
      latestSettingsMap = nextSettings;
      emitSettings();
    }

    if (Array.isArray(data.violations)) {
      violationsMap.clear();
      data.violations.forEach((v: QuizViolationRecord) => {
        if (v && v.id) {
          violationsMap.set(v.id, v);
        }
      });
      emitViolations();
    }
  } catch {
    // Operate from local cache if server fetch fails temporarily
  }
}

function ensureBackendPolling() {
  if (typeof window === 'undefined' || pollIntervalId) return;
  hydrateFromLocalStorageOnce();
  syncWithBackendServer();
  pollIntervalId = setInterval(() => {
    syncWithBackendServer();
  }, 2500);
  window.addEventListener('focus', () => {
    syncWithBackendServer();
  });
}

function subscribeToSharedSettings(listener: (map: SettingsCacheMap) => void): () => void {
  hydrateFromLocalStorageOnce();
  ensureBackendPolling();
  settingsSubscribers.add(listener);
  listener(latestSettingsMap);

  let firestoreUnsub: (() => void) | null = null;
  if (!isFirestoreQuotaExhausted) {
    try {
      firestoreUnsub = onSnapshot(
        collection(db, SETTINGS_COLLECTION),
        (snapshot) => {
          const nextMap: SettingsCacheMap = { ...latestSettingsMap };
          snapshot.forEach((docSnap) => {
            const cloudData = docSnap.data();
            if (docSnap.id === STUDENT_RESTRICTIONS_DOC && cloudData?.restrictionsJson) {
              nextMap[STUDENT_RESTRICTIONS_DOC] = {
                ...cloudData,
                restrictionsJson: mergeRestrictionConfigs(
                  nextMap[STUDENT_RESTRICTIONS_DOC]?.restrictionsJson,
                  cloudData.restrictionsJson
                ),
              };
            } else {
              nextMap[docSnap.id] = cloudData;
            }
          });
          latestSettingsMap = nextMap;
          emitSettings();
        },
        (err) => {
          if (isQuotaOrNetworkError(err)) {
            isFirestoreQuotaExhausted = true;
          }
        }
      );
    } catch {}
  }

  return () => {
    settingsSubscribers.delete(listener);
    if (firestoreUnsub) {
      try {
        firestoreUnsub();
      } catch {}
    }
  };
}

export async function testConnection(): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return false;
  }
  try {
    const res = await fetch('/api/sync');
    if (res.ok) return true;
  } catch {}
  return true;
}

export function subscribeToSubmissions(
  onData: (submissions: QuizSubmission[]) => void,
  _onError?: (error: Error) => void
): () => void {
  hydrateFromLocalStorageOnce();
  ensureBackendPolling();
  submissionListeners.add(onData);
  emitSubmissions();

  let unsubDeleted: (() => void) | null = null;
  let unsubSubmissions: (() => void) | null = null;

  if (!isFirestoreQuotaExhausted) {
    try {
      unsubDeleted = onSnapshot(
        collection(db, DELETED_COLLECTION),
        (snapshot) => {
          snapshot.forEach((docSnap) => {
            deletedIdsSet.add(docSnap.id);
            submissionsMap.delete(docSnap.id);
          });
          emitSubmissions();
        },
        (err) => {
          if (isQuotaOrNetworkError(err)) {
            isFirestoreQuotaExhausted = true;
          }
        }
      );

      unsubSubmissions = onSnapshot(
        query(collection(db, SUBMISSIONS_COLLECTION)),
        (snapshot) => {
          snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const id = data.id || docSnap.id;
            if (!deletedIdsSet.has(id)) {
              submissionsMap.set(id, {
                id,
                studentName: data.studentName || '',
                studentClass: normalizeClassKey(data.studentClass || '7A'),
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
          emitSubmissions();
        },
        (err) => {
          if (isQuotaOrNetworkError(err)) {
            isFirestoreQuotaExhausted = true;
          }
        }
      );
    } catch {}
  }

  return () => {
    submissionListeners.delete(onData);
    if (unsubDeleted) {
      try {
        unsubDeleted();
      } catch {}
    }
    if (unsubSubmissions) {
      try {
        unsubSubmissions();
      } catch {}
    }
  };
}

function sanitizeSubmissionPayload(submission: QuizSubmission, fallbackIdx: number = 0): QuizSubmission {
  const safeId = String(submission.id || `sub-${Date.now()}-${fallbackIdx}`)
    .replace(/[^a-zA-Z0-9_\-]/g, '-')
    .slice(0, 120);
  return {
    id: safeId,
    studentName: (submission.studentName || 'Siswa').trim().slice(0, 115) || 'Siswa',
    studentClass: normalizeClassKey(submission.studentClass || '7A').slice(0, 25) || '7A',
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
  };
}

export async function saveSubmissionToFirebase(submission: QuizSubmission): Promise<void> {
  const clean = sanitizeSubmissionPayload(submission);
  deletedIdsSet.delete(clean.id);
  submissionsMap.set(clean.id, clean);
  emitSubmissions();

  try {
    await fetch('/api/sync/submissions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ submissions: [clean] }),
    });
  } catch {}

  if (!isFirestoreQuotaExhausted) {
    const docRef = doc(db, SUBMISSIONS_COLLECTION, clean.id);
    const delRef = doc(db, DELETED_COLLECTION, clean.id);
    try {
      const batch = writeBatch(db);
      batch.set(docRef, clean);
      batch.delete(delRef);
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `${SUBMISSIONS_COLLECTION}/${clean.id}`);
    }
  }
}

export async function saveBatchSubmissionsToFirebase(submissions: QuizSubmission[]): Promise<void> {
  const cleanedList = submissions.map((sub, idx) => sanitizeSubmissionPayload(sub, idx));
  cleanedList.forEach((clean) => {
    deletedIdsSet.delete(clean.id);
    submissionsMap.set(clean.id, clean);
  });
  emitSubmissions();

  try {
    await fetch('/api/sync/submissions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ submissions: cleanedList }),
    });
  } catch {}

  if (!isFirestoreQuotaExhausted) {
    try {
      const batch = writeBatch(db);
      cleanedList.forEach((clean) => {
        const docRef = doc(db, SUBMISSIONS_COLLECTION, clean.id);
        const delRef = doc(db, DELETED_COLLECTION, clean.id);
        batch.set(docRef, clean);
        batch.delete(delRef);
      });
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, SUBMISSIONS_COLLECTION);
    }
  }
}

export async function deleteSubmissionFromFirebase(submissionId: string): Promise<void> {
  deletedIdsSet.add(submissionId);
  submissionsMap.delete(submissionId);
  emitSubmissions();

  try {
    await fetch('/api/sync/submissions/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: [submissionId] }),
    });
  } catch {}

  if (!isFirestoreQuotaExhausted) {
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
}

export async function clearAllSubmissionsFromFirebase(): Promise<void> {
  Array.from(submissionsMap.keys()).forEach((id) => {
    deletedIdsSet.add(id);
  });
  submissionsMap.clear();
  emitSubmissions();

  try {
    await fetch('/api/sync/submissions/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clearAll: true }),
    });
  } catch {}

  if (!isFirestoreQuotaExhausted) {
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
}

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

export async function saveTeacherPinToFirebase(newPin: string): Promise<void> {
  const payload = {
    teacherPin: newPin,
    updatedAt: new Date().toISOString(),
  };
  latestSettingsMap['app'] = payload;
  emitSettings();

  try {
    await fetch('/api/sync/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ docId: 'app', data: payload }),
    });
  } catch {}

  if (!isFirestoreQuotaExhausted) {
    const docRef = doc(db, SETTINGS_COLLECTION, 'app');
    try {
      await setDoc(docRef, payload, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `${SETTINGS_COLLECTION}/app`);
    }
  }
}

export function subscribeToViolations(
  onData: (violations: QuizViolationRecord[]) => void,
  _onError?: (error: Error) => void
): () => void {
  ensureBackendPolling();
  violationListeners.add(onData);
  emitViolations();

  let firestoreUnsub: (() => void) | null = null;
  if (!isFirestoreQuotaExhausted) {
    try {
      firestoreUnsub = onSnapshot(
        query(collection(db, VIOLATIONS_COLLECTION)),
        (snapshot) => {
          snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const id = data.id || docSnap.id;
            violationsMap.set(id, {
              id,
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
          emitViolations();
        },
        (err) => {
          if (isQuotaOrNetworkError(err)) {
            isFirestoreQuotaExhausted = true;
          }
        }
      );
    } catch {}
  }

  return () => {
    violationListeners.delete(onData);
    if (firestoreUnsub) {
      try {
        firestoreUnsub();
      } catch {}
    }
  };
}

export async function reportViolationToFirebase(violation: QuizViolationRecord): Promise<void> {
  const safeId = String(violation.id || `viol-${Date.now()}`)
    .replace(/[^a-zA-Z0-9_\-]/g, '-')
    .slice(0, 120);
  const clean: QuizViolationRecord = {
    id: safeId,
    studentName: (violation.studentName || 'Siswa').trim().slice(0, 115) || 'Siswa',
    studentClass: (violation.studentClass || '7A').trim().slice(0, 25) || '7A',
    studentNumber: (violation.studentNumber || '1').trim().slice(0, 14) || '1',
    questionNumber: Math.max(1, Number(violation.questionNumber) || 1),
    violationCount: Math.max(1, Number(violation.violationCount) || 1),
    timestamp: violation.timestamp || new Date().toISOString(),
    unlockToken: (violation.unlockToken || '-').slice(0, 25),
    reason: (violation.reason || 'Terdeteksi membuka tab lain atau meminimalkan browser').slice(
      0,
      280
    ),
    status: violation.status === 'unlocked' ? 'unlocked' : 'locked',
  };

  violationsMap.set(safeId, clean);
  emitViolations();

  try {
    await fetch('/api/sync/violations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ violation: clean }),
    });
  } catch {}

  if (!isFirestoreQuotaExhausted) {
    const docRef = doc(db, VIOLATIONS_COLLECTION, safeId);
    try {
      await setDoc(docRef, clean);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `${VIOLATIONS_COLLECTION}/${safeId}`);
    }
  }
}

export async function updateViolationStatusInFirebase(
  violationId: string,
  status: 'locked' | 'unlocked'
): Promise<void> {
  const unlockedAt = status === 'unlocked' ? new Date().toISOString() : undefined;
  const existing = violationsMap.get(violationId);
  if (existing) {
    violationsMap.set(violationId, {
      ...existing,
      status,
      ...(unlockedAt ? { unlockedAt } : {}),
    });
    emitViolations();
  }

  try {
    await fetch('/api/sync/violations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ updateStatus: { id: violationId, status, unlockedAt } }),
    });
  } catch {}

  if (!isFirestoreQuotaExhausted) {
    const docRef = doc(db, VIOLATIONS_COLLECTION, violationId);
    try {
      await setDoc(
        docRef,
        {
          status,
          ...(unlockedAt ? { unlockedAt } : {}),
        },
        { merge: true }
      );
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `${VIOLATIONS_COLLECTION}/${violationId}`);
    }
  }
}

export async function deleteViolationFromFirebase(violationId: string): Promise<void> {
  violationsMap.delete(violationId);
  emitViolations();

  try {
    await fetch('/api/sync/violations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deleteId: violationId }),
    });
  } catch {}

  if (!isFirestoreQuotaExhausted) {
    const docRef = doc(db, VIOLATIONS_COLLECTION, violationId);
    try {
      await deleteDoc(docRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `${VIOLATIONS_COLLECTION}/${violationId}`);
    }
  }
}

export async function clearAllViolationsFromFirebase(): Promise<void> {
  violationsMap.clear();
  emitViolations();

  try {
    await fetch('/api/sync/violations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clearAll: true }),
    });
  } catch {}

  if (!isFirestoreQuotaExhausted) {
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
}

export function listenToViolationStatus(
  violationId: string,
  onStatusChange: (status: 'locked' | 'unlocked') => void
): () => void {
  return subscribeToViolations((list) => {
    const found = list.find((v) => v.id === violationId);
    if (found && found.status) {
      onStatusChange(found.status);
    }
  });
}

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
      } catch {}
    }
    onData(null);
  });
}

export async function saveQuestionBankToFirebase(questions: Question[]): Promise<void> {
  const payload = {
    questionsJson: JSON.stringify(questions),
    totalQuestions: questions.length,
    updatedAt: new Date().toISOString(),
  };
  latestSettingsMap[QUESTION_BANK_DOC] = payload;
  emitSettings();

  try {
    await fetch('/api/sync/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ docId: QUESTION_BANK_DOC, data: payload }),
    });
  } catch {}

  if (!isFirestoreQuotaExhausted) {
    const docRef = doc(db, SETTINGS_COLLECTION, QUESTION_BANK_DOC);
    try {
      await setDoc(docRef, payload, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `${SETTINGS_COLLECTION}/${QUESTION_BANK_DOC}`);
    }
  }
}

export async function resetQuestionBankInFirebase(): Promise<void> {
  delete latestSettingsMap[QUESTION_BANK_DOC];
  emitSettings();

  try {
    await fetch('/api/sync/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ docId: QUESTION_BANK_DOC, deleteDoc: true }),
    });
  } catch {}

  if (!isFirestoreQuotaExhausted) {
    const docRef = doc(db, SETTINGS_COLLECTION, QUESTION_BANK_DOC);
    try {
      await deleteDoc(docRef);
    } catch (error) {
      handleFirestoreError(
        error,
        OperationType.DELETE,
        `${SETTINGS_COLLECTION}/${QUESTION_BANK_DOC}`
      );
    }
  }
}

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
      } catch {}
    }
    onData(null);
  });
}

export async function saveProcedureTextToFirebase(config: ProcedureTextConfig): Promise<void> {
  const payload = {
    procedureTextJson: JSON.stringify(config),
    totalTexts: config.texts?.length || 0,
    updatedAt: new Date().toISOString(),
  };
  latestSettingsMap[PROCEDURE_TEXT_DOC] = payload;
  emitSettings();

  try {
    await fetch('/api/sync/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ docId: PROCEDURE_TEXT_DOC, data: payload }),
    });
  } catch {}

  if (!isFirestoreQuotaExhausted) {
    const docRef = doc(db, SETTINGS_COLLECTION, PROCEDURE_TEXT_DOC);
    try {
      await setDoc(docRef, payload, { merge: true });
    } catch (error) {
      handleFirestoreError(
        error,
        OperationType.WRITE,
        `${SETTINGS_COLLECTION}/${PROCEDURE_TEXT_DOC}`
      );
    }
  }
}

export async function resetProcedureTextInFirebase(): Promise<void> {
  delete latestSettingsMap[PROCEDURE_TEXT_DOC];
  emitSettings();

  try {
    await fetch('/api/sync/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ docId: PROCEDURE_TEXT_DOC, deleteDoc: true }),
    });
  } catch {}

  if (!isFirestoreQuotaExhausted) {
    const docRef = doc(db, SETTINGS_COLLECTION, PROCEDURE_TEXT_DOC);
    try {
      await deleteDoc(docRef);
    } catch (error) {
      handleFirestoreError(
        error,
        OperationType.DELETE,
        `${SETTINGS_COLLECTION}/${PROCEDURE_TEXT_DOC}`
      );
    }
  }
}

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
      } catch {}
    }
    onData(null);
  });
}

export async function saveStudentRestrictionsToFirebase(
  config: StudentRestrictionConfig
): Promise<void> {
  const normalizedConfig: StudentRestrictionConfig = {
    ...config,
    registeredStudents: Array.isArray(config.registeredStudents)
      ? config.registeredStudents.map((r) => ({
          ...r,
          studentClass: normalizeClassKey(r.studentClass),
        }))
      : config.registeredStudents,
    updatedAt: new Date().toISOString(),
  };
  const payload = {
    restrictionsJson: JSON.stringify(normalizedConfig),
    updatedAt: normalizedConfig.updatedAt,
  };
  latestSettingsMap[STUDENT_RESTRICTIONS_DOC] = payload;
  emitSettings();

  try {
    await fetch('/api/sync/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ docId: STUDENT_RESTRICTIONS_DOC, data: payload }),
    });
  } catch {}

  if (!isFirestoreQuotaExhausted) {
    const docRef = doc(db, SETTINGS_COLLECTION, STUDENT_RESTRICTIONS_DOC);
    try {
      await setDoc(docRef, payload, { merge: true });
    } catch (error) {
      handleFirestoreError(
        error,
        OperationType.WRITE,
        `${SETTINGS_COLLECTION}/${STUDENT_RESTRICTIONS_DOC}`
      );
    }
  }
}

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
      } catch {}
    }
    onData(null);
  });
}

export async function saveDashboardBackgroundToFirebase(
  config: DashboardBackgroundConfig
): Promise<void> {
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

  const payload = {
    backgroundJson: serialized,
    updatedAt: new Date().toISOString(),
  };
  latestSettingsMap[DASHBOARD_BACKGROUND_DOC] = payload;
  emitSettings();

  try {
    await fetch('/api/sync/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ docId: DASHBOARD_BACKGROUND_DOC, data: payload }),
    });
  } catch {}

  if (!isFirestoreQuotaExhausted) {
    const docRef = doc(db, SETTINGS_COLLECTION, DASHBOARD_BACKGROUND_DOC);
    try {
      await setDoc(docRef, payload, { merge: true });
    } catch (error) {
      handleFirestoreError(
        error,
        OperationType.WRITE,
        `${SETTINGS_COLLECTION}/${DASHBOARD_BACKGROUND_DOC}`
      );
    }
  }
}
