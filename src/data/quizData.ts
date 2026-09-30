import { Question, QuizSubmission, ProcedureTextConfig, ProcedureTextRecipe, StudentRestrictionConfig, StudentInfo, RegisteredStudent } from '../types';

export const ALL_CLASS_LIST = ['7A', '7B', '7C', '7D', '7E', '7F', '7G', '7H'];

export const INITIAL_REGISTERED_STUDENTS: RegisteredStudent[] = [
  { id: 'reg-1', name: 'Galang Pratama', studentClass: '7A', studentNumber: '12' },
  { id: 'reg-2', name: 'Monita Rahma', studentClass: '7A', studentNumber: '18' },
  { id: 'reg-3', name: 'Made Wijaya', studentClass: '7A', studentNumber: '16' },
  { id: 'reg-4', name: 'Andre Wicaksono', studentClass: '7B', studentNumber: '4' },
  { id: 'reg-5', name: 'Pipit Salsabila', studentClass: '7B', studentNumber: '22' },
];

export const INITIAL_STUDENT_RESTRICTION_CONFIG: StudentRestrictionConfig = {
  maxAttempts: 1, // Default: 1x pengerjaan per siswa
  timeLimitMinutes: 0, // Default: Tanpa batas waktu
  isQuizOpen: true,
  allowedClasses: ['7A', '7B', '7C', '7D', '7E', '7F', '7G', '7H'],
  allowRemedialIfBelowKKM: false,
  allowReviewAfterQuiz: true,
  studyModuleAccessMode: 'once_per_user',
  extraAttemptGrants: {},
  shuffleQuestions: true,
  lockByClassAndNumber: true,
  viewedStudyModuleMap: {},
  registeredStudents: INITIAL_REGISTERED_STUDENTS,
  enforceRegisteredDatabase: false,
  antiScreenshotMobile: true,
  antiScreenshotMode: 'touch_hold',
};

export function normalizeStudentName(name: string | undefined | null): string {
  return (name || '')
    .trim()
    .replace(/^\d{1,3}[\.\,\;\-\)\s\t]+/, '') // strip accidental leading roll number from bulk paste
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

export function normalizeStudentClass(cls: string | undefined | null): string {
  const raw = (cls || '')
    .trim()
    .toUpperCase()
    .replace(/^KELAS\s+/i, '')
    .replace(/^VII([\s\-_]*)/i, '7')
    .replace(/[\s\-_]+/g, '');
  return raw;
}

export function normalizeStudentNumber(num: string | undefined | null): string {
  const raw = (num || '').trim();
  if (!raw) return '';
  const parsed = parseInt(raw, 10);
  return !isNaN(parsed) ? String(parsed) : raw;
}

/**
 * Returns true if a submission record was entered via the Teacher's "Input Siswa" menu
 * (single/batch/paste) rather than an online exam session completed by the student.
 */
export function isTeacherManualRosterSubmission(sub: QuizSubmission | undefined | null): boolean {
  if (!sub) return false;
  const id = String(sub.id || '');
  if (
    id.startsWith('sub-manual-') ||
    id.startsWith('sub-batch-') ||
    id.startsWith('sub-paste-') ||
    id.startsWith('sub-roster-') ||
    id.startsWith('reg-unsub-') ||
    /^sub-[1-5]$/.test(id)
  ) {
    return true;
  }
  return false;
}

/**
 * Returns true ONLY if the student has actually submitted/completed the quiz (or teacher explicitly inputted a non-zero grade).
 * Returns false if the student has not taken the quiz yet (e.g. pre-registered or score left blank / 0 on roster entry).
 */
export function hasStudentSubmittedQuiz(sub: QuizSubmission | undefined | null): boolean {
  if (!sub) return false;
  if (sub.hasSubmitted === false) return false;
  if (sub.hasSubmitted === true) return true;
  if (sub.score === null || sub.score === undefined || Number.isNaN(Number(sub.score))) {
    return false;
  }
  // If entered via teacher manual/batch/paste roster input with score 0, treat as not yet taken ("Belum Mengerjakan")
  if (isTeacherManualRosterSubmission(sub) && Number(sub.score) === 0) {
    return false;
  }
  const answerCount = sub.answers ? Object.keys(sub.answers).length : 0;
  if (answerCount === 0 && Number(sub.score) === 0) {
    return false;
  }
  return true;
}

export type SubmissionAssessmentStatus = 'TUNTAS' | 'REMEDIAL' | 'BELUM_MENGERJAKAN';

/**
 * Determines the official assessment status:
 * - 'BELUM_MENGERJAKAN': Student has not submitted the quiz yet (do not give automatic 0, do not mark as Remedial).
 * - 'REMEDIAL': Student HAS submitted the quiz, and score < 75 (passingScore).
 * - 'TUNTAS': Student HAS submitted the quiz, and score >= 75 (passingScore).
 */
export function getSubmissionAssessmentStatus(
  sub: QuizSubmission | undefined | null,
  passingScore: number = 75
): SubmissionAssessmentStatus {
  if (!hasStudentSubmittedQuiz(sub)) {
    return 'BELUM_MENGERJAKAN';
  }
  return Number(sub!.score) >= passingScore ? 'TUNTAS' : 'REMEDIAL';
}

export function buildNormalizedStudentKey(
  student: { name: string; studentClass: string; studentNumber: string },
  lockByClassAndNumber: boolean = false
): string {
  const cleanClass = normalizeStudentClass(student.studentClass);
  const cleanNum = normalizeStudentNumber(student.studentNumber);
  const cleanName = normalizeStudentName(student.name);
  if (!cleanClass || (!cleanNum && !cleanName)) return '';
  if (lockByClassAndNumber && cleanNum && !cleanName) {
    return `${cleanClass}_${cleanNum}`;
  }
  return `${cleanClass}_${cleanNum}_${cleanName}`;
}

export interface CrossClassConflictItem {
  normalizedName: string;
  displayName: string;
  authoritativeClass: string;
  authoritativeNumber: string;
  source: 'DATABASE_SISWA_GURU' | 'DATA_REKAP_AWAL';
  classesUsed: string[];
  validSubmissions: QuizSubmission[];
  invalidSubmissions: QuizSubmission[];
}

/**
 * Detects if any user name is used in 2 or more classes, or in a class that contradicts
 * the official Student/Teacher Database (registeredStudents), and separates valid vs invalid records.
 */
export function detectCrossClassDuplicateSubmissions(
  submissions: QuizSubmission[],
  restrictions: StudentRestrictionConfig
): CrossClassConflictItem[] {
  const registeredList = restrictions.registeredStudents ?? INITIAL_REGISTERED_STUDENTS;
  const regByName = new Map<string, RegisteredStudent>();
  registeredList.forEach((r) => {
    const n = normalizeStudentName(r.name);
    if (n && !regByName.has(n)) {
      regByName.set(n, r);
    }
  });

  const subsByName = new Map<string, QuizSubmission[]>();
  submissions.forEach((sub) => {
    const n = normalizeStudentName(sub.studentName);
    if (!n) return;
    const list = subsByName.get(n) || [];
    list.push(sub);
    subsByName.set(n, list);
  });

  const conflicts: CrossClassConflictItem[] = [];

  subsByName.forEach((subList, normName) => {
    const uniqueClasses = Array.from(
      new Set(subList.map((s) => normalizeStudentClass(s.studentClass)).filter(Boolean))
    );
    const regEntry = regByName.get(normName);

    if (regEntry) {
      const authClass = normalizeStudentClass(regEntry.studentClass);
      const authNum = normalizeStudentNumber(regEntry.studentNumber);
      const invalidSubs = subList.filter(
        (s) => normalizeStudentClass(s.studentClass) !== authClass
      );
      const validSubs = subList.filter(
        (s) => normalizeStudentClass(s.studentClass) === authClass
      );

      if (invalidSubs.length > 0) {
        conflicts.push({
          normalizedName: normName,
          displayName: regEntry.name || subList[0].studentName,
          authoritativeClass: authClass,
          authoritativeNumber: authNum,
          source: 'DATABASE_SISWA_GURU',
          classesUsed: uniqueClasses,
          validSubmissions: validSubs,
          invalidSubmissions: invalidSubs,
        });
      }
    } else if (uniqueClasses.length > 1) {
      // Not explicitly in registeredStudents yet, but same user name is used in 2+ classes!
      // Earliest submission in the teacher database is the registered class
      const sortedOldestFirst = [...subList].sort(
        (a, b) => new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime()
      );
      const firstRecord = sortedOldestFirst[0];
      const authClass = normalizeStudentClass(firstRecord.studentClass);
      const authNum = normalizeStudentNumber(firstRecord.studentNumber);

      const validSubs = subList.filter(
        (s) => normalizeStudentClass(s.studentClass) === authClass
      );
      const invalidSubs = subList.filter(
        (s) => normalizeStudentClass(s.studentClass) !== authClass
      );

      if (invalidSubs.length > 0) {
        conflicts.push({
          normalizedName: normName,
          displayName: firstRecord.studentName,
          authoritativeClass: authClass,
          authoritativeNumber: authNum,
          source: 'DATA_REKAP_AWAL',
          classesUsed: uniqueClasses,
          validSubmissions: validSubs,
          invalidSubmissions: invalidSubs,
        });
      }
    }
  });

  return conflicts;
}

export function getStudentAttemptStatus(
  student: StudentInfo | null | undefined,
  submissions: QuizSubmission[],
  restrictions: StudentRestrictionConfig
) {
  const cleanName = normalizeStudentName(student?.name);
  const cleanClass = normalizeStudentClass(student?.studentClass);
  const cleanNum = normalizeStudentNumber(student?.studentNumber);

  const isIdentityComplete = Boolean(cleanName && cleanClass && cleanNum);
  const studentKey = isIdentityComplete
    ? buildNormalizedStudentKey({ name: cleanName, studentClass: cleanClass, studentNumber: cleanNum }, false)
    : '';
  const seatKey = isIdentityComplete ? `${cleanClass}_${cleanNum}` : '';
  const legacyKey = isIdentityComplete ? `${cleanClass}_${cleanNum}_${cleanName}` : '';

  // 1. Check Master Database Siswa / Guru (registeredStudents) & Existing Submissions Database
  const registeredList = restrictions.registeredStudents ?? INITIAL_REGISTERED_STUDENTS;
  const registeredMatchesByName = cleanName
    ? registeredList.filter((r) => normalizeStudentName(r.name) === cleanName)
    : [];

  const allSubmissionsByName = cleanName
    ? submissions.filter((s) => normalizeStudentName(s.studentName) === cleanName)
    : [];

  let isCrossClassConflict = false;
  let isDatabaseNumberMismatch = false;
  let isSeatTakenInDb = false;
  let isUnregisteredInDb = false;
  let authoritativeClass = '';
  let authoritativeNumber = '';
  let conflictMessage = '';
  let isVerifiedInDatabase = false;

  if (cleanName && cleanClass) {
    if (registeredMatchesByName.length > 0) {
      // Student name exists in Master Database Siswa/Guru
      const matchInSelectedClass = registeredMatchesByName.find(
        (r) => normalizeStudentClass(r.studentClass) === cleanClass
      );

      if (!matchInSelectedClass) {
        const officialRecord = registeredMatchesByName[0];
        authoritativeClass = normalizeStudentClass(officialRecord.studentClass);
        authoritativeNumber = normalizeStudentNumber(officialRecord.studentNumber);
        if (restrictions.enforceRegisteredDatabase) {
          isCrossClassConflict = true;
          conflictMessage = `DITOLAK: Nama "${student?.name.trim()}" terdata di Database Siswa/Guru pada Kelas ${authoritativeClass}${
            authoritativeNumber ? ` (No. Absen ${authoritativeNumber})` : ''
          }. Silakan pilih Kelas ${authoritativeClass} sesuai database.`;
        }
      } else {
        // Class matches Database Siswa/Guru!
        const officialNum = normalizeStudentNumber(matchInSelectedClass.studentNumber);
        isVerifiedInDatabase = true;
        authoritativeClass = cleanClass;
        authoritativeNumber = officialNum || cleanNum;
      }
    } else if (allSubmissionsByName.length > 0) {
      // Name is not in registeredStudents master list, but ALREADY exists in Teacher's Submissions Database
      const sortedOldest = [...allSubmissionsByName].sort(
        (a, b) => new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime()
      );
      const firstSub = sortedOldest[0];
      const recordedClass = normalizeStudentClass(firstSub.studentClass);
      const recordedNum = normalizeStudentNumber(firstSub.studentNumber);

      if (recordedClass && recordedClass !== cleanClass) {
        authoritativeClass = recordedClass;
        authoritativeNumber = recordedNum;
        if (restrictions.enforceRegisteredDatabase) {
          isCrossClassConflict = true;
          conflictMessage = `DITOLAK: Nama "${student?.name.trim()}" sudah terdata di Database Nilai Guru pada Kelas ${recordedClass}${
            recordedNum ? ` (No. Absen ${recordedNum})` : ''
          }. Silakan pilih Kelas ${recordedClass}.`;
        }
      } else {
        isVerifiedInDatabase = true;
        authoritativeClass = recordedClass;
        authoritativeNumber = recordedNum;
      }
    } else if (restrictions.enforceRegisteredDatabase) {
      // Only enforce strict database rejection if the selected class actually has a registered roster
      const classHasRegisteredRoster = registeredList.some(
        (r) => normalizeStudentClass(r.studentClass) === cleanClass
      );
      if (classHasRegisteredRoster) {
        isUnregisteredInDb = true;
        conflictMessage = `DITOLAK: Nama "${student?.name.trim()}" (Kelas ${cleanClass}) tidak terdata di Database Siswa/Guru. Silakan hubungi Guru untuk mendaftarkan nama Anda.`;
      }
    }
  }

  const isDatabaseRejected =
    isCrossClassConflict || isDatabaseNumberMismatch || isSeatTakenInDb || isUnregisteredInDb;

  // Separate actual online student exam submissions from teacher pre-input/roster entries
  // so students whose data was pre-input by the teacher (and haven't taken the exam yet) can still start the quiz!
  const allMatchingByIdentity = isIdentityComplete
    ? submissions.filter((sub) => {
        const sName = normalizeStudentName(sub.studentName);
        const sClass = normalizeStudentClass(sub.studentClass);
        return sName === cleanName && (!cleanClass || !sClass || sClass === cleanClass);
      })
    : [];

  const matchingSubmissions = allMatchingByIdentity.filter(
    (sub) => hasStudentSubmittedQuiz(sub) && !isTeacherManualRosterSubmission(sub)
  );
  const teacherPreInputSubmissions = allMatchingByIdentity.filter(
    (sub) => !hasStudentSubmittedQuiz(sub) || isTeacherManualRosterSubmission(sub)
  );

  const attemptsUsed = matchingSubmissions.length;
  const bestScore = matchingSubmissions.reduce((max, s) => Math.max(max, s.score), 0);
  const lastSubmission = matchingSubmissions[0] || null;

  const extraGrant =
    studentKey
      ? (restrictions.extraAttemptGrants?.[studentKey] ??
         restrictions.extraAttemptGrants?.[seatKey] ??
         restrictions.extraAttemptGrants?.[legacyKey] ??
         0)
      : 0;
  const remedialBonus =
    restrictions.maxAttempts > 0 &&
    restrictions.allowRemedialIfBelowKKM &&
    attemptsUsed > 0 &&
    bestScore < QUIZ_METADATA.passingScore
      ? 1
      : 0;

  const effectiveMaxAttempts =
    restrictions.maxAttempts > 0
      ? restrictions.maxAttempts + extraGrant + remedialBonus
      : 0; // 0 = unlimited

  const remainingAttempts =
    effectiveMaxAttempts > 0 ? Math.max(0, effectiveMaxAttempts - attemptsUsed) : Infinity;

  const isQuotaExhausted = effectiveMaxAttempts > 0 && attemptsUsed >= effectiveMaxAttempts;
  const normalizedAllowedClasses = (restrictions.allowedClasses || ALL_CLASS_LIST).map((c) =>
    normalizeStudentClass(c)
  );
  const isClassAllowed = !cleanClass || normalizedAllowedClasses.includes(cleanClass);
  const canStartQuiz =
    restrictions.isQuizOpen &&
    isClassAllowed &&
    !isQuotaExhausted &&
    !isDatabaseRejected;

  return {
    isIdentityComplete,
    studentKey,
    matchingSubmissions,
    teacherPreInputSubmissions,
    attemptsUsed,
    bestScore,
    lastSubmission,
    extraGrant,
    remedialBonus,
    effectiveMaxAttempts,
    remainingAttempts,
    isQuotaExhausted,
    isClassAllowed,
    isCrossClassConflict,
    isDatabaseNumberMismatch,
    isSeatTakenInDb,
    isUnregisteredInDb,
    isDatabaseRejected,
    isVerifiedInDatabase,
    authoritativeClass,
    authoritativeNumber,
    conflictMessage,
    canStartQuiz,
  };
}

export const QUIZ_METADATA = {
  title: 'Interactive English Quiz: Introducing My self and other',
  topic: 'Introducing My self and other (Materi Descriptive text)',
  chapter: 'Chapter 1: Introducing my self and other',
  unit: 'Unit 3: A Secret Recipe & Self Introduction',
  textbook: 'English for Nusantara (SMP/MTs Kelas VII - Kurikulum Merdeka)',
  branding: 'Kuis by Eli Ermawati, S.Pd.',
  teacherName: 'Eli Ermawati, S.Pd.',
  totalQuestions: 10,
  passingScore: 75, // KKM
  pointsPerQuestion: 10,
  defaultTeacherPin: '1234',
};

export const INITIAL_PROCEDURE_TEXT_CONFIG: ProcedureTextConfig = {
  definition: 'Introducing Myself and Others adalah materi pembelajaran Bahasa Inggris tentang cara memperkenalkan identitas diri sendiri (Introducing Myself) maupun memperkenalkan orang lain/teman (Introducing Others), dilanjutkan dengan Descriptive Text untuk mendeskripsikan ciri fisik (Physical Appearance), sifat (Personality), serta hobi seseorang secara runtut.',
  socialFunction: 'Untuk memperkenalkan identitas diri sendiri dan orang lain secara sopan dalam membangun komunikasi sosial, serta mendeskripsikan ciri khusus seseorang (Identification & Description) sesuai konteks Buku English for Nusantara Kelas 7 SMP.',
  genericStructure: [
    {
      id: 'struct-1',
      title: '1. Greeting & Opening (Salam Pembuka & Izin Memperkenalkan Diri)',
      desc: 'Diawali dengan sapaan sopan seperti "Hello, everyone!", "Good morning, friends!", diikuti kalimat pembuka "Let me introduce myself" atau "Allow me to introduce myself."'
    },
    {
      id: 'struct-2',
      title: '2. Stating Personal Identity (Menyebutkan Identitas Diri Sendiri)',
      desc: 'Menyampaikan poin-poin identitas: Nama Lengkap ("My name is..."), Nama Panggilan ("You can call me..."), Asal Daerah ("I am from..."), Alamat Tempat Tinggal ("I live in/on/at..."), serta Usia & Sekolah ("I am 13 years old. I study at SMP Merdeka.").'
    },
    {
      id: 'struct-3',
      title: '3. Stating Hobbies, Favorites & Family (Hobi, Hal Favorit & Keluarga)',
      desc: 'Menjelaskan kegemaran ("My hobby is fishing / I like playing badminton"), makanan/minuman favorit ("My favorite food is fried rice"), serta jumlah saudara kandung ("I have one older sister and one brother").'
    },
    {
      id: 'struct-4',
      title: '4. Introducing Others (Memperkenalkan Orang Lain / Teman)',
      desc: 'Menggunakan ungkapan penghubung untuk memperkenalkan teman atau keluarga: "This is my friend, Andre.", "Let me introduce my classmate, Monita. She is from Medan. Her hobby is reading.", serta respons "Nice to meet you!" -> "Nice to meet you too."'
    },
    {
      id: 'struct-5',
      title: '5. Descriptive Text: Identification & Description (Mendeskripsikan Teman)',
      desc: 'Struktur Descriptive Text terdiri atas: (a) Identification: memperkenalkan siapa orang yang dideskripsikan, dan (b) Description: menjelaskan ciri fisik (tall, slim, wavy hair, wearing glasses/hijab), sifat (friendly, cheerful, diligent), serta aktivitas/kegemarannya.'
    }
  ],
  languageFeatures: [
    {
      id: 'feat-1',
      name: 'Pronouns (Kata Ganti Subjek & Kepemilikan / Possessive Adjectives)',
      example: 'Subject: I, You, He, She, We, They • Possessive: My name, Your hobby, His bicycle, Her glasses, Our class'
    },
    {
      id: 'feat-2',
      name: 'To Be in Simple Present Tense (am, is, are)',
      example: 'I am Galang (13 years old) • He is from Kalimantan • She is very friendly • They are my classmates'
    },
    {
      id: 'feat-3',
      name: 'Prepositions of Place & Origin (from, in, on, at)',
      example: 'from Kalimantan (asal) • in Banjarbaru (kota) • on Jalan Sumatera (nama jalan) • at Jalan Sumatera No. 12 (alamat lengkap)'
    },
    {
      id: 'feat-4',
      name: 'Simple Present Verbs & Have/Has (Kepemilikan Ciri & Kebiasaan)',
      example: 'I live / He lives • I like / She likes reading • I have short hair / She has long straight hair and wears a hijab'
    },
    {
      id: 'feat-5',
      name: 'Descriptive Adjectives (Kata Sifat Ciri Fisik & Kepribadian)',
      example: 'Physical: tall, short, slim, curly/straight/wavy hair • Personality: friendly, kind, polite, cheerful, independent, diligent'
    }
  ],
  texts: [
    {
      id: 'rec-1',
      title: 'Poin 1: Introducing Myself (Galang from Kalimantan)',
      category: '1. Introducing Myself (Perkenalan Diri)',
      servings: 'Unit 1 • Section 1',
      timeMinutes: '5 menit baca',
      difficulty: 'Mudah',
      goal: 'Memahami dan mempraktikkan cara memperkenalkan identitas diri sendiri (Nama, Asal, Alamat, Usia, Hobi, dan Kesukaan) secara lengkap dan runtut.',
      ingredients: [
        'Greeting (Salam): "Hello, friends! Good morning."',
        'Opening: "Let me introduce myself."',
        'Full Name & Nickname: "My name is Galang Pratama. You can call me Galang."',
        'Origin (Asal): "I am from Banjarbaru, South Kalimantan."',
        'Address (Alamat): "I live on Jalan Sumatera No. 15."',
        'Age & Grade (Usia & Kelas): "I am thirteen years old. I am in Class 7A at SMP Merdeka."',
        'Hobby & Favorites: "My hobby is fishing. My favorite food is fried rice."',
        'Closing: "Nice to meet you all! Thank you."'
      ],
      tools: [
        'Subject Pronoun "I" + To Be "am" (I am Galang, I am thirteen years old)',
        'Possessive Adjective "My" (My name, My hobby, My favorite food)',
        'Preposition "from" untuk asal daerah (I am from Kalimantan)',
        'Preposition "in" (kota), "on" (nama jalan), "at" (alamat bernomor rumah)',
        'Gerund (Verb-ing) setelah kata hobby is / like (fishing, cycling, reading)'
      ],
      steps: [
        'Hello, everyone! Good morning. Let me introduce myself.',
        'My full name is Galang Pratama, and you can call me Galang.',
        'I am originally from Kalimantan. Right now, I live on Jalan Sumatera with my parents and my sister.',
        'I am thirteen years old, and I am a new seventh-grade student at SMP Merdeka.',
        'My hobby is fishing. I usually go fishing at the river near my house on weekends.',
        'My favorite food is Indonesian fried rice, and my favorite drink is cold sweet tea. Nice to meet you all!'
      ],
      languageNotes: 'Gunakan "You can call me..." untuk menyebutkan nama panggilan (nickname). Gunakan "on" untuk nama jalan tanpa nomor (on Jalan Sumatera) dan "at" jika diikuti nomor rumah (at Jalan Sumatera No. 15).',
      audioScript: 'Hello, everyone! Good morning. Let me introduce myself. My full name is Galang Pratama, and you can call me Galang. I am from Kalimantan, and I live on Jalan Sumatera. I am thirteen years old. My hobby is fishing, and my favorite food is fried rice. Nice to meet you all!',
      lastUpdated: new Date().toISOString()
    },
    {
      id: 'rec-2',
      title: 'Poin 2: Introducing Others (Memperkenalkan Teman & Orang Lain)',
      category: '2. Introducing Others (Perkenalan Orang Lain)',
      servings: 'Unit 1 • Section 2',
      timeMinutes: '5 menit baca',
      difficulty: 'Mudah',
      goal: 'Memahami ungkapan untuk memperkenalkan teman, sahabat, atau anggota keluarga kepada orang lain beserta cara meresponsnya dengan sopan.',
      ingredients: [
        'Introducing a Friend: "Hi Monita, this is my new friend, Andre."',
        'Formal/Polite Introduction: "Let me introduce my classmate. Her name is Monita."',
        'Stating Friend\'s Origin: "He is from Pontianak." / "She comes from Medan."',
        'Stating Friend\'s Address & Age: "He lives on Jalan Teratai. He is 13 years old."',
        'Stating Friend\'s Hobby: "He likes playing badminton and cycling."',
        'Greeting Response: "Hi, Andre! Nice to meet you." -> "Nice to meet you too, Monita."'
      ],
      tools: [
        'Third-Person Subject Pronouns: "He" (dia laki-laki) dan "She" (dia perempuan)',
        'Possessive Adjectives: "His" (miliknya laki-laki: His name) dan "Her" (miliknya perempuan: Her hobby)',
        'Simple Present Tense Verb + s/es untuk subjek He/She (He lives, She likes, He comes from)',
        'Demonstrative Pronoun: "This is..." untuk menunjuk dan memperkenalkan seseorang'
      ],
      steps: [
        'Galang: "Hi, Monita! Let me introduce my new friend. This is Andre. Andre, this is Monita, my classmate in Class 7A."',
        'Andre: "Hello, Monita! Nice to meet you."',
        'Monita: "Hi, Andre! Nice to meet you too. Where are you from, Andre?"',
        'Galang: "He is from Pontianak, West Kalimantan. Now he lives on Jalan Teratai near our school."',
        'Monita: "That is great! What is your hobby, Andre?"',
        'Andre: "I love cycling and playing badminton. Galang also likes playing badminton with me."',
        'Monita: "Awesome! My hobby is reading novels. See you in class tomorrow!"'
      ],
      languageNotes: 'Saat memperkenalkan orang ketiga tunggal (He/She), perhatikan penambahan akhiran -s/-es pada kata kerja (Verb): "He lives...", "She likes...", "He studies...".',
      audioScript: 'Hi, Monita! Let me introduce my new friend. This is Andre. Andre, this is Monita, my classmate. Hello, Monita! Nice to meet you. Hi, Andre! Nice to meet you too. He is from Pontianak, and he loves cycling and playing badminton.',
      lastUpdated: new Date().toISOString()
    },
    {
      id: 'rec-3',
      title: 'Poin 3: Asking & Telling About Hobbies (Unit 2: I Love Fishing)',
      category: '3. Hobbies & Daily Identities (Hobi & Kegemaran)',
      servings: 'Unit 2 • Hobbies',
      timeMinutes: '5 menit baca',
      difficulty: 'Mudah',
      goal: 'Menanyakan dan menceritakan hobi, peralatan yang digunakan, serta seberapa sering (frekuensi) melakukan kegiatan kegemaran tersebut.',
      ingredients: [
        'Asking Hobby: "What is your hobby?" / "What do you like doing in your free time?"',
        'Telling Singular Hobby: "My hobby is fishing." / "I love reading comic books."',
        'Telling Plural Hobbies: "My hobbies are singing and listening to music."',
        'Asking Frequency: "How often do you go cycling?" -> "Twice a week / Every Sunday."',
        'Asking Tools/Equipment: "What do you need for badminton?" -> "I need a racket and a shuttlecock."',
        'Telling Friend\'s Hobby: "Sinta likes jogging. She goes jogging every Sunday morning."'
      ],
      tools: [
        'Pola Kalimat Kesukaan: Subject + like/love/enjoy + Verb-ing (I like swimming, She loves drawing)',
        'Adverbs of Frequency (Keterangan Frekuensi): always, usually, often, sometimes, once a week, every weekend',
        'Kosakata Alat Hobi: fishing rod & bucket (memancing), racket & shuttlecock (bulu tangkis), bicycle & helmet (bersepeda), mobile phone (bermain gim)'
      ],
      steps: [
        'Galang and his friends at SMP Merdeka have different hobbies that they enjoy in their free time.',
        'Galang loves fishing. He prepares a fishing rod, a small bucket, and fish bait before going to the river every Sunday.',
        'Monita\'s hobby is reading. She likes reading science-fiction novels and adventure stories in the school library.',
        'Andre enjoys mobile gaming and cycling. He rides his red bicycle around the neighborhood every afternoon.',
        'Meanwhile, Sinta and Ibu Posma love playing badminton. They use rackets and shuttlecocks to practice twice a week.'
      ],
      languageNotes: 'Jika hobi hanya satu, gunakan "My hobby IS...". Jika lebih dari satu, gunakan bentuk jamak "My hobbies ARE... and...". Kata kerja setelah is/like/love/enjoy wajib berbentuk Verb-ing (Gerund).',
      audioScript: 'Galang and his friends have different hobbies. Galang loves fishing at the river every Sunday. Monita likes reading adventure stories in the library. Andre enjoys cycling around the neighborhood, while Sinta loves playing badminton twice a week.',
      lastUpdated: new Date().toISOString()
    },
    {
      id: 'rec-4',
      title: 'Poin 4: Descriptive Text — Describing People (Unit 3: My Friends and I)',
      category: '4. Descriptive Text (Mendeskripsikan Seseorang)',
      servings: 'Unit 3 • Descriptive Text',
      timeMinutes: '6 menit baca',
      difficulty: 'Sedang',
      goal: 'Memahami struktur Descriptive Text (Identification & Description) untuk mendeskripsikan ciri fisik (Physical Appearance) dan kepribadian (Personality) teman.',
      ingredients: [
        'Structure 1 - Identification: Paragraf pembuka yang memperkenalkan nama dan hubungan dengan orang yang dideskripsikan.',
        'Structure 2 - Description: Paragraf isi yang merinci ciri fisik, pakaian/aksesori, sifat/karakter, dan hobi.',
        'Physical Appearance (Tinggi & Tubuh): tall (tinggi), short (pendek), slim/slender (ramping), well-built (tegap), chubby (gempal).',
        'Hair & Face (Rambut & Wajah): straight hair (lurus), wavy hair (bergelombang), curly hair (keriting), bald, round face, bright smile.',
        'Special Features / Clothing: wears glasses (berkacamata), wears a hijab (berhijab), uses crutches (menggunakan kruk), has a mole (punya tahi lalat).',
        'Personality Traits (Sifat): friendly (ramah), kind (baik hati), cheerful (ceria), polite (sopan), diligent (rajin), independent (mandiri), helpful (suka menolong).'
      ],
      tools: [
        'Pola 1 (To Be + Adjective) untuk sifat & postur: "Made IS tall, friendly, and independent."',
        'Pola 2 (Have/Has + Adjective + Noun) untuk kepemilikan ciri fisik: "He HAS short straight black hair." / "She HAS brown eyes."',
        'Pola 3 (Wear/Wears + Noun) untuk aksesori/pakaian: "Monita WEARS glasses and a neat hijab."',
        'Simple Present Tense karena mendeskripsikan fakta dan karakteristik tetap seseorang.'
      ],
      steps: [
        '[IDENTIFICATION] Let me tell you about my best friend, Made. He is fourteen years old, and he is my classmate in Class 7A at SMP Merdeka.',
        '[DESCRIPTION - Physical Appearance] Made is a tall boy with a friendly smile. He has short, straight black hair, brown eyes, and tan skin. He uses crutches to walk, and he always carries a black backpack to school.',
        '[DESCRIPTION - Personality] Made is a very cheerful, polite, and independent person. He is never shy to greet people first, and he is always helpful to his friends in class.',
        '[DESCRIPTION - Hobby & Habit] His favorite sport is wheelchair basketball. He practices basketball earnestly every Wednesday and Saturday afternoon. Everyone in Class 7A loves being friends with Made.'
      ],
      languageNotes: 'Perbedaan penting dalam Descriptive Text: Gunakan "IS/AM/ARE" untuk kata sifat langsung (He is tall, She is slim, He is friendly). Gunakan "HAS/HAVE" untuk kata benda/bagian tubuh (He has curly hair, She has a pointed nose).',
      audioScript: 'Descriptive Text: My Best Friend, Made. Identification: Made is fourteen years old and he is my classmate at SMP Merdeka. Description: Made is a tall boy with a friendly smile. He has short straight black hair. He uses crutches to walk. Made is very cheerful, polite, and independent. His favorite sport is wheelchair basketball.',
      lastUpdated: new Date().toISOString()
    }
  ]
};

export const PROCEDURE_TEXT_SUMMARY = {
  definition: INITIAL_PROCEDURE_TEXT_CONFIG.definition,
  genericStructure: INITIAL_PROCEDURE_TEXT_CONFIG.genericStructure,
  languageFeatures: INITIAL_PROCEDURE_TEXT_CONFIG.languageFeatures
};

export const QUIZ_QUESTIONS: Question[] = [
  {
    id: 1,
    topic: 'Introducing Myself (Personal Identity)',
    unitReference: 'Chapter 1: Introducing My Self and Other (Unit 1: Galang from Kalimantan)',
    hasAudio: true,
    audioTitle: 'Audio 1.1: Listening - Galang\'s Self-Introduction',
    listeningInstruction: 'Dengarkan perkenalan diri Galang dengan saksama, lalu tentukan informasi yang tepat mengenai identitas Galang.',
    audioScript: 'Hello, everyone! Good morning. Let me introduce myself. My full name is Galang Pratama, and you can call me Galang. I am from Banjarbaru, South Kalimantan. Right now, I live on Jalan Sumatera. I am thirteen years old, and my hobby is fishing. Nice to meet you all! Question: Where is Galang originally from and what is his hobby?',
    contextTitle: 'Text for Question 1',
    contextText: `"Hello, everyone! Good morning. Let me introduce myself. My full name is Galang Pratama, and you can call me Galang. I am from Banjarbaru, South Kalimantan. Right now, I live on Jalan Sumatera. I am thirteen years old, and my hobby is fishing. Nice to meet you all!"`,
    question: 'Based on the self-introduction text above, where is Galang from and what is his hobby?',
    options: [
      { key: 'A', text: 'He is from Medan and his hobby is reading novels' },
      { key: 'B', text: 'He is from Pontianak and his hobby is playing badminton' },
      { key: 'C', text: 'He is from Kalimantan and his hobby is fishing' },
      { key: 'D', text: 'He is from Jakarta and his hobby is cycling' },
    ],
    correctAnswer: 'C',
    explanation: 'Berdasarkan teks perkenalan Galang: "I am from Banjarbaru, South Kalimantan... and my hobby is fishing", maka Galang berasal dari Kalimantan dan hobinya adalah memancing (fishing).'
  },
  {
    id: 2,
    topic: 'Prepositions of Place & Address (from, in, on, at)',
    unitReference: 'Chapter 1: Introducing My Self and Other (Unit 1: Language Focus - Prepositions)',
    hasAudio: true,
    audioTitle: 'Audio 1.2: Listening - Stating Home Address',
    listeningInstruction: 'Dengarkan kalimat perkenalan alamat tempat tinggal berikut, lalu pilih kata depan (preposition) yang paling tepat.',
    audioScript: 'Listen to the sentence carefully: Hello, my name is Andre. I am from Pontianak, and now I live blank Jalan Teratai near SMP Merdeka. Which preposition is correct to fill in the blank: from, on, at, or under?',
    contextTitle: 'Sentence Completion',
    contextText: `"Hello, my name is Andre. I am from Pontianak, and now I live __________ Jalan Teratai near SMP Merdeka."`,
    question: 'Which preposition of place best completes the sentence above when stating a street name without a house number?',
    options: [
      { key: 'A', text: 'in' },
      { key: 'B', text: 'on' },
      { key: 'C', text: 'at' },
      { key: 'D', text: 'from' },
    ],
    correctAnswer: 'B',
    explanation: 'Dalam Bahasa Inggris, untuk menyebutkan nama jalan tanpa nomor rumah digunakan preposisi "on" (contoh: "on Jalan Teratai" / "on Jalan Sumatera"). "in" digunakan untuk nama kota/negara, sedangkan "at" digunakan untuk alamat lengkap dengan nomor rumah.'
  },
  {
    id: 3,
    topic: 'Introducing Others (Memperkenalkan Teman)',
    unitReference: 'Chapter 1: Introducing My Self and Other (Unit 1: Section 2 - Introducing Others)',
    hasAudio: true,
    audioTitle: 'Audio 1.3: Listening - Introducing a Classmate',
    listeningInstruction: 'Dengarkan percakapan saat Galang memperkenalkan Andre kepada Monita, lalu pilih respons yang paling tepat.',
    audioScript: 'Galang says: Hi, Monita! Let me introduce my new friend. This is Andre. Andre says: Hello, Monita! Nice to meet you. What is the best response for Monita to say?',
    contextTitle: 'Dialogue: Introducing a Friend',
    contextText: `Galang : "Hi, Monita! Let me introduce my new friend. This is Andre."\nAndre  : "Hello, Monita! Nice to meet you."\nMonita : "________________________________________"`,
    question: 'What is the most appropriate response for Monita to complete the dialogue above?',
    options: [
      { key: 'A', text: 'See you tomorrow morning, Galang.' },
      { key: 'B', text: 'Hi, Andre! Nice to meet you too.' },
      { key: 'C', text: 'I am thirteen years old, thank you.' },
      { key: 'D', text: 'My favorite food is Indonesian fried rice.' },
    ],
    correctAnswer: 'B',
    explanation: 'Ketika seseorang menyapa saat berkenalan dengan ucapan "Hello, Monita! Nice to meet you" (Senang bertemu denganmu), respons yang paling tepat dan sopan adalah "Hi, Andre! Nice to meet you too." (Senang bertemu denganmu juga).'
  },
  {
    id: 4,
    topic: 'Pronouns & Possessive Adjectives (My, Your, His, Her)',
    unitReference: 'Chapter 1: Introducing My Self and Other (Unit 1: Language Focus - Pronouns)',
    hasAudio: true,
    audioTitle: 'Audio 1.4: Listening - Possessive Adjectives in Introduction',
    listeningInstruction: 'Dengarkan kalimat yang memperkenalkan Monita berikut, lalu tentukan kata ganti kepemilikan (possessive adjective) yang benar.',
    audioScript: 'Listen to the sentence: Monita is my classmate in Class 7A. Blank hobby is reading science-fiction novels in the school library. Which word correctly completes the sentence: Her, His, Their, or Our?',
    contextTitle: 'Grammar Focus: Possessive Adjective',
    contextText: `"Monita is my classmate in Class 7A. __________ hobby is reading science-fiction novels in the school library."`,
    question: 'Choose the correct possessive adjective to complete the sentence above:',
    options: [
      { key: 'A', text: 'Her' },
      { key: 'B', text: 'His' },
      { key: 'C', text: 'Their' },
      { key: 'D', text: 'He' },
    ],
    correctAnswer: 'A',
    explanation: 'Karena subjek yang dibicarakan adalah Monita (satu orang perempuan / She), maka kata ganti kepemilikan (possessive adjective) yang diikuti kata benda "hobby" adalah "Her" (Her hobby = hobinya).'
  },
  {
    id: 5,
    topic: 'Asking & Telling About Hobbies (Unit 2: I Love Fishing)',
    unitReference: 'Chapter 1: Introducing My Self and Other (Unit 2: Hobbies & Equipment)',
    hasAudio: true,
    audioTitle: 'Audio 1.5: Listening - Hobby and Equipment',
    listeningInstruction: 'Dengarkan cerita tentang hobi Sinta dan Ibu Posma, lalu tentukan peralatan yang mereka gunakan.',
    audioScript: 'Sinta and Ibu Posma love playing badminton together twice a week. Before playing on the court, they always prepare their sports equipment. What equipment do Sinta and Ibu Posma need to play badminton?',
    contextTitle: 'Text for Question 5',
    contextText: `"Sinta and Ibu Posma love playing badminton together twice a week. Before playing on the court, they always prepare their sports equipment."`,
    question: 'What equipment do Sinta and Ibu Posma need to do their hobby?',
    options: [
      { key: 'A', text: 'A fishing rod, a small bucket, and fish bait' },
      { key: 'B', text: 'A bicycle, a helmet, and cycling shoes' },
      { key: 'C', text: 'A racket and a shuttlecock' },
      { key: 'D', text: 'A paintbrush, canvas, and watercolors' },
    ],
    correctAnswer: 'C',
    explanation: 'Hobi Sinta dan Ibu Posma adalah bermain bulu tangkis ("playing badminton"). Peralatan yang dibutuhkan untuk bermain bulu tangkis adalah raket dan kok ("a racket and a shuttlecock").'
  },
  {
    id: 6,
    topic: 'Simple Present Tense & Gerund in Hobbies',
    unitReference: 'Chapter 1: Introducing My Self and Other (Unit 2: Language Focus)',
    hasAudio: true,
    audioTitle: 'Audio 1.6: Listening - Expressing Hobbies & Likes',
    listeningInstruction: 'Dengarkan kalimat tentang hobi Andre di waktu luang dan pilih bentuk kata kerja yang tepat.',
    audioScript: 'Andre has two favorite activities in his free time. He really likes blank his red bicycle around the neighborhood every afternoon. Choose the correct word to complete the sentence: ride, rides, riding, or rode.',
    contextTitle: 'Expressing Likes and Hobbies',
    contextText: `"Andre has two favorite activities in his free time. He really likes __________ his red bicycle around the neighborhood every afternoon."`,
    question: 'Which verb form correctly completes the sentence after the verb "likes"?',
    options: [
      { key: 'A', text: 'ride' },
      { key: 'B', text: 'rides' },
      { key: 'C', text: 'riding' },
      { key: 'D', text: 'rode' },
    ],
    correctAnswer: 'C',
    explanation: 'Setelah kata kerja kesukaan seperti "like / likes / love / loves / enjoy / enjoys", kata kerja berikutnya berbentuk Gerund (Verb-ing), sehingga jawaban yang tepat adalah "riding" (He really likes riding his red bicycle).'
  },
  {
    id: 7,
    topic: 'Social Function of Descriptive Text (Describing People)',
    unitReference: 'Chapter 1: Introducing My Self and Other (Unit 3: My Friends and I)',
    hasAudio: true,
    audioTitle: 'Audio 1.7: Listening - Descriptive Text about Monita',
    listeningInstruction: 'Dengarkan pembacaan teks deskriptif tentang Monita berikut, lalu tentukan tujuan komunikatif (social function) dari teks tersebut.',
    audioScript: 'Monita is my classmate in Class 7A at SMP Merdeka. She is a tall and slim girl. She wears a neat hijab and prescription glasses. Monita is very diligent, polite, and friendly to everyone. She loves reading novels in the library. Question: What is the social function of the text above?',
    contextTitle: 'Descriptive Text: My Classmate, Monita',
    contextText: `Monita is my classmate in Class 7A at SMP Merdeka. She is a tall and slim girl. She wears a neat hijab and prescription glasses. Monita is very diligent, polite, and friendly to everyone. She loves reading novels in the library.`,
    question: 'What is the main social function (purpose) of the descriptive text above?',
    options: [
      { key: 'A', text: 'To describe Monita\'s physical appearance, personality, and hobby specifically' },
      { key: 'B', text: 'To explain step-by-step how to borrow a novel from the school library' },
      { key: 'C', text: 'To tell a past story about Monita\'s holiday last year' },
      { key: 'D', text: 'To persuade students to buy new prescription glasses' },
    ],
    correctAnswer: 'A',
    explanation: 'Teks di atas adalah Descriptive Text yang bertujuan untuk mendeskripsikan ciri fisik (tall, slim, wears a hijab and glasses), sifat (diligent, polite, friendly), dan hobi Monita secara spesifik.'
  },
  {
    id: 8,
    topic: 'Generic Structure of Descriptive Text (Identification & Description)',
    unitReference: 'Chapter 1: Introducing My Self and Other (Unit 3: Generic Structure)',
    hasAudio: true,
    audioTitle: 'Audio 1.8: Listening - Generic Structure of Descriptive Text',
    listeningInstruction: 'Dengarkan paragraf pertama dari teks deskriptif tentang Made, lalu tentukan nama bagian struktur teksnya.',
    audioScript: 'Paragraph 1: Let me tell you about my best friend, Made. He is fourteen years old, and he is my classmate in Class 7A at SMP Merdeka. In the generic structure of a descriptive text, what is this opening paragraph called?',
    contextTitle: 'Paragraph 1 of Descriptive Text',
    contextText: `Paragraph 1:\n"Let me tell you about my best friend, Made. He is fourteen years old, and he is my classmate in Class 7A at SMP Merdeka."`,
    question: 'In the generic structure of a Descriptive Text, the opening paragraph that introduces who the person is (shown above) is called ...',
    options: [
      { key: 'A', text: 'Identification' },
      { key: 'B', text: 'Description' },
      { key: 'C', text: 'Ingredients' },
      { key: 'D', text: 'Resolution' },
    ],
    correctAnswer: 'A',
    explanation: 'Struktur Descriptive Text terdiri dari 2 bagian utama: (1) "Identification" yaitu bagian pembuka yang memperkenalkan siapa objek/orang yang dideskripsikan, dan (2) "Description" yaitu bagian rincian ciri fisik, sifat, serta kebiasaan.'
  },
  {
    id: 9,
    topic: 'Describing Physical Appearance (To Be vs Have/Has)',
    unitReference: 'Chapter 1: Introducing My Self and Other (Unit 3: Language Focus - Describing People)',
    hasAudio: true,
    audioTitle: 'Audio 1.9: Listening - Describing Physical Features',
    listeningInstruction: 'Dengarkan kalimat yang mendeskripsikan ciri fisik Pak Edo, lalu pilih kata kerja kepemilikan yang tepat.',
    audioScript: 'Listen carefully: Pak Edo is a friendly and cheerful man. He blank short curly hair, brown eyes, and a well-built body. Which word correctly fills the blank: am, are, has, or have?',
    contextTitle: 'Describing Physical Appearance',
    contextText: `"Pak Edo is a friendly and cheerful man. He __________ short curly hair, brown eyes, and a well-built body."`,
    question: 'Which word correctly completes the sentence to describe Pak Edo\'s hair and eyes?',
    options: [
      { key: 'A', text: 'is' },
      { key: 'B', text: 'has' },
      { key: 'C', text: 'have' },
      { key: 'D', text: 'are' },
    ],
    correctAnswer: 'B',
    explanation: 'Untuk mendeskripsikan kepemilikan ciri bagian tubuh berupa kata benda ("short curly hair, brown eyes") dengan subjek tunggal "He" (Pak Edo), kita menggunakan "has" (He has short curly hair).'
  },
  {
    id: 10,
    topic: 'Reading Comprehension: Descriptive Text (Describing People)',
    unitReference: 'Chapter 1: Introducing My Self and Other (Unit 3: Made the Basketball Player)',
    hasAudio: true,
    audioTitle: 'Audio 1.10: Listening - My Best Friend, Made',
    listeningInstruction: 'Dengarkan teks deskriptif tentang Made berikut dengan saksama, lalu jawab pertanyaan mengenai sifat dan olahraga favorit Made.',
    audioScript: 'Made is a tall boy with a friendly smile. He has short straight black hair. He uses crutches to walk, and he is very independent, polite, and helpful to his friends. Made loves sports very much. His favorite sport is wheelchair basketball, and he practices every Wednesday and Saturday afternoon. Question: Which statement is TRUE about Made based on the descriptive text?',
    contextTitle: 'My Best Friend, Made',
    contextText: `Made is a tall boy with a friendly smile. He has short, straight black hair. He uses crutches to walk, and he is very independent, polite, and helpful to his friends. Made loves sports very much. His favorite sport is wheelchair basketball, and he practices every Wednesday and Saturday afternoon.`,
    question: 'Which statement is TRUE about Made based on the descriptive text above?',
    options: [
      { key: 'A', text: 'Made has long wavy hair and dislikes playing sports' },
      { key: 'B', text: 'Made is an independent and polite boy whose favorite sport is wheelchair basketball' },
      { key: 'C', text: 'Made is shy to greet people and only practices football on Sundays' },
      { key: 'D', text: 'Made wears prescription glasses and loves reading novels in the library' },
    ],
    correctAnswer: 'B',
    explanation: 'Berdasarkan teks deskriptif di atas, pernyataan yang benar adalah Made merupakan anak yang mandiri serta sopan ("independent, polite") dan olahraga favoritnya adalah bola basket kursi roda ("wheelchair basketball").'
  }
];

export const INITIAL_STUDENT_SUBMISSIONS: QuizSubmission[] = [
  {
    id: 'sub-1',
    studentName: 'Galang Pratama',
    studentClass: '7A',
    studentNumber: '12',
    score: 100,
    totalQuestions: 10,
    correctCount: 10,
    wrongCount: 0,
    answers: { 1: 'C', 2: 'B', 3: 'B', 4: 'A', 5: 'C', 6: 'C', 7: 'A', 8: 'A', 9: 'B', 10: 'B' },
    timeSpentSeconds: 145,
    submittedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
  {
    id: 'sub-2',
    studentName: 'Monita Rahma',
    studentClass: '7A',
    studentNumber: '18',
    score: 90,
    totalQuestions: 10,
    correctCount: 9,
    wrongCount: 1,
    answers: { 1: 'C', 2: 'B', 3: 'B', 4: 'A', 5: 'C', 6: 'C', 7: 'A', 8: 'A', 9: 'B', 10: 'A' },
    timeSpentSeconds: 160,
    submittedAt: new Date(Date.now() - 3600000 * 1.5).toISOString(),
  },
  {
    id: 'sub-3',
    studentName: 'Andre Wicaksono',
    studentClass: '7B',
    studentNumber: '04',
    score: 80,
    totalQuestions: 10,
    correctCount: 8,
    wrongCount: 2,
    answers: { 1: 'C', 2: 'B', 3: 'A', 4: 'A', 5: 'C', 6: 'C', 7: 'A', 8: 'A', 9: 'A', 10: 'B' },
    timeSpentSeconds: 195,
    submittedAt: new Date(Date.now() - 3600000 * 1).toISOString(),
  },
  {
    id: 'sub-4',
    studentName: 'Made Wijaya',
    studentClass: '7A',
    studentNumber: '16',
    score: 90,
    totalQuestions: 10,
    correctCount: 9,
    wrongCount: 1,
    answers: { 1: 'C', 2: 'B', 3: 'B', 4: 'A', 5: 'C', 6: 'B', 7: 'A', 8: 'A', 9: 'B', 10: 'B' },
    timeSpentSeconds: 130,
    submittedAt: new Date(Date.now() - 1800000).toISOString(),
  },
  {
    id: 'sub-5',
    studentName: 'Pipit Salsabila',
    studentClass: '7B',
    studentNumber: '22',
    score: 70,
    totalQuestions: 10,
    correctCount: 7,
    wrongCount: 3,
    answers: { 1: 'C', 2: 'C', 3: 'B', 4: 'B', 5: 'C', 6: 'C', 7: 'A', 8: 'A', 9: 'A', 10: 'B' },
    timeSpentSeconds: 220,
    submittedAt: new Date(Date.now() - 900000).toISOString(),
  }
];
