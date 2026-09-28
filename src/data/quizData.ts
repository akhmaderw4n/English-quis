import { Question, QuizSubmission, ProcedureTextConfig, ProcedureTextRecipe, StudentRestrictionConfig, StudentInfo } from '../types';

export const ALL_CLASS_LIST = ['7A', '7B', '7C', '7D', '7E', '7F', '7G', '7H'];

export const INITIAL_STUDENT_RESTRICTION_CONFIG: StudentRestrictionConfig = {
  maxAttempts: 1, // Default: 1x pengerjaan per siswa
  timeLimitMinutes: 0, // Default: Tanpa batas waktu
  isQuizOpen: true,
  allowedClasses: ['7A', '7B', '7C', '7D', '7E', '7F', '7G', '7H'],
  allowRemedialIfBelowKKM: false,
  allowReviewAfterQuiz: true,
  studyModuleAccessMode: 'once_per_user',
  extraAttemptGrants: {},
};

export function buildNormalizedStudentKey(student: { name: string; studentClass: string; studentNumber: string }): string {
  const cleanClass = (student.studentClass || '').trim().toUpperCase();
  const rawNum = (student.studentNumber || '').trim();
  const numParsed = parseInt(rawNum, 10);
  const cleanNum = !isNaN(numParsed) ? String(numParsed) : rawNum;
  const cleanName = (student.name || '').trim().toLowerCase();
  if (!cleanClass || (!cleanNum && !cleanName)) return '';
  return `${cleanClass}_${cleanNum}_${cleanName}`;
}

export function getStudentAttemptStatus(
  student: StudentInfo | null | undefined,
  submissions: QuizSubmission[],
  restrictions: StudentRestrictionConfig
) {
  const cleanName = (student?.name || '').trim().toLowerCase();
  const cleanClass = (student?.studentClass || '').trim().toUpperCase();
  const rawNum = (student?.studentNumber || '').trim();
  const numParsed = parseInt(rawNum, 10);
  const cleanNum = !isNaN(numParsed) ? String(numParsed) : rawNum;

  const isIdentityComplete = Boolean(cleanName && cleanClass && cleanNum);
  const studentKey = isIdentityComplete ? `${cleanClass}_${cleanNum}_${cleanName}` : '';

  const matchingSubmissions = isIdentityComplete
    ? submissions.filter((sub) => {
        const sClass = (sub.studentClass || '').trim().toUpperCase();
        const sRawNum = (sub.studentNumber || '').trim();
        const sNumParsed = parseInt(sRawNum, 10);
        const sNum = !isNaN(sNumParsed) ? String(sNumParsed) : sRawNum;
        const sName = (sub.studentName || '').trim().toLowerCase();

        if (sClass !== cleanClass) return false;
        // Match by exact name in same class, or exact absen + name in same class
        return (sName === cleanName && sNum === cleanNum) || sName === cleanName;
      })
    : [];

  const attemptsUsed = matchingSubmissions.length;
  const bestScore = matchingSubmissions.reduce((max, s) => Math.max(max, s.score), 0);
  const lastSubmission = matchingSubmissions[0] || null;

  const extraGrant = studentKey ? (restrictions.extraAttemptGrants?.[studentKey] || 0) : 0;
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
  const isClassAllowed = !cleanClass || restrictions.allowedClasses.includes(cleanClass);
  const canStartQuiz = restrictions.isQuizOpen && isClassAllowed && !isQuotaExhausted;

  return {
    isIdentityComplete,
    studentKey,
    matchingSubmissions,
    attemptsUsed,
    bestScore,
    lastSubmission,
    extraGrant,
    remedialBonus,
    effectiveMaxAttempts,
    remainingAttempts,
    isQuotaExhausted,
    isClassAllowed,
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
    topic: 'Social Function / Purpose of Procedure Text',
    unitReference: 'Chapter 2: Culinary and Me (Unit 3: Section 1)',
    hasAudio: true,
    audioTitle: 'Audio 2.1: Listening - How to Make Sweet Potato Fritters',
    listeningInstruction: 'Dengarkan pembacaan teks resep ini dengan saksama, lalu tentukan tujuan komunikatif (social function) dari teks tersebut.',
    audioScript: 'How to Make Sweet Potato Fritters. Ingredients: two sweet potatoes, one cup of flour, two tablespoons of sugar, cooking oil. Steps: First, peel the sweet potatoes and wash them. Next, cut them into thin slices and coat them with flour batter. Then, fry them in hot cooking oil until crispy. Finally, serve the fritters while warm. Question: What is the primary social function of the procedure text above?',
    contextTitle: 'Text for Question 1',
    contextText: `How to Make Sweet Potato Fritters\nIngredients: 2 sweet potatoes, 1 cup of flour, 2 tablespoons of sugar, cooking oil.\nSteps:\n1. First, peel the sweet potatoes and wash them.\n2. Next, cut them into thin slices and coat them with flour batter.\n3. Then, fry them in hot cooking oil until crispy.\n4. Finally, serve the fritters while warm.`,
    question: 'What is the primary social function (purpose) of the procedure text above?',
    options: [
      { key: 'A', text: 'To entertain readers with an amusing fiction story about sweet potatoes' },
      { key: 'B', text: 'To describe what a traditional food market looks like in Indonesia' },
      { key: 'C', text: 'To explain step-by-step how to make sweet potato fritters' },
      { key: 'D', text: 'To persuade people to buy cooking oil and flour at a supermarket' },
    ],
    correctAnswer: 'C',
    explanation: 'Tujuan utama (social function / goal) dari teks prosedur resep makanan adalah memberikan instruksi langkah demi langkah kepada pembaca tentang cara membuat makanan tersebut (to explain step-by-step how to make sweet potato fritters).'
  },
  {
    id: 2,
    topic: 'Generic Structure of a Recipe',
    unitReference: 'Chapter 2: Culinary and Me (Unit 3: Section 2 - Ingredients vs Tools)',
    hasAudio: true,
    audioTitle: 'Audio 2.2: Listening - Recipe Component Identification',
    listeningInstruction: 'Dengarkan rincian komponen resep Galang, lalu tentukan bagian struktur generik teks prosedur tersebut.',
    audioScript: 'Recipe for Galang\'s Favorite Banana Fritters: four ripe bananas, one cup of flour, one tablespoon of sugar, half teaspoon of salt, two hundred milliliters of water, cooking oil. In the generic structure of a procedure text, what is this list called?',
    contextTitle: 'Recipe Component',
    contextText: `Recipe for Galang's Favorite Banana Fritters:\n• 4 ripe bananas\n• 1 cup of flour\n• 1 tablespoon of sugar\n• 1/2 teaspoon of salt\n• 200 ml of water\n• Cooking oil`,
    question: 'In the generic structure of a procedure text, the list shown above is called ...',
    options: [
      { key: 'A', text: 'Goal / Aim' },
      { key: 'B', text: 'Ingredients / Materials' },
      { key: 'C', text: 'Cooking Tools / Utensils' },
      { key: 'D', text: 'Steps / Instructions' },
    ],
    correctAnswer: 'B',
    explanation: 'Daftar bahan makanan yang diperlukan untuk mengolah suatu hidangan disebut "Ingredients" (bahan-bahan). "Tools" adalah peralatan memasak (wajan, sutil), sedangkan "Steps" adalah langkah pembuatannya.'
  },
  {
    id: 3,
    topic: 'Cooking Utensils / Tools Identification',
    unitReference: 'Chapter 2: Culinary and Me (Unit 3: Worksheet 2.24)',
    hasAudio: true,
    audioTitle: 'Audio 2.3: Listening - Kitchen Scenario & Utensils',
    listeningInstruction: 'Dengarkan situasi memasak Galang di dapur dan pilihlah peralatan memasak yang paling tepat.',
    audioScript: 'Galang is frying banana fritters in a frying pan. He needs to flip the fritters over so that both sides cook evenly without burning his hands. Which kitchen tool should he use? A peeler, a spatula, a measuring spoon, or a rolling pin?',
    question: 'Galang is frying banana fritters in a frying pan. He needs to flip the fritters over so that both sides cook evenly without burning his hands. Which kitchen tool should he use?',
    options: [
      { key: 'A', text: 'A peeler' },
      { key: 'B', text: 'A spatula' },
      { key: 'C', text: 'A measuring spoon' },
      { key: 'D', text: 'A rolling pin' },
    ],
    correctAnswer: 'B',
    explanation: 'Alat dapur yang digunakan untuk membalik (flip/turn) atau mengaduk makanan di wajan penggorengan adalah "a spatula" (sudip/sutil). "Peeler" untuk mengupas kulit buah/sayur, "measuring spoon" untuk menakar bumbu.'
  },
  {
    id: 4,
    topic: 'Cooking Action Verbs (Vocabulary)',
    unitReference: 'Chapter 2: Culinary and Me (Unit 3: Worksheet 2.27)',
    hasAudio: true,
    audioTitle: 'Audio 2.4: Listening - Action Verb in Recipe Step',
    listeningInstruction: 'Dengarkan pelafalan kalimat instruksi memasak ini dan cermati arti kata kerja aksi yang digunakan.',
    audioScript: 'Listen to the instruction: First, peel the sweet potatoes and wash them thoroughly with running water. What does the action verb peel mean in Indonesian?',
    contextTitle: 'Action Verb in Step 1',
    contextText: `"First, peel the sweet potatoes and wash them thoroughly with running water."`,
    question: 'What does the action verb "peel" mean in Indonesian?',
    options: [
      { key: 'A', text: 'Mengupas kulit luar buah atau umbi' },
      { key: 'B', text: 'Mengiris bahan menjadi potongan tipis' },
      { key: 'C', text: 'Mengaduk rata adonan dengan sendok' },
      { key: 'D', text: 'Menggoreng bahan di dalam minyak panas' },
    ],
    correctAnswer: 'A',
    explanation: 'Kata kerja "peel" artinya mengupas kulit luar (to remove the outer skin). Mengiris adalah "slice", mengaduk adalah "stir/mix", dan menggoreng adalah "fry".'
  },
  {
    id: 5,
    topic: 'Sequence Adverbs (Connectors)',
    unitReference: 'Chapter 2: Culinary and Me (Unit 3: Section 4 - Sequencing Steps)',
    hasAudio: true,
    audioTitle: 'Audio 2.5: Listening - Sequence Adverbs in Recipe',
    listeningInstruction: 'Dengarkan penjelasan tentang sequence adverbs dan tentukan kata penghubung untuk langkah paling akhir.',
    audioScript: 'When writing cooking steps, we use sequence adverbs such as First, Next, Then, and After that. Which sequence word is the most appropriate to introduce the very last step in a recipe?',
    question: 'When writing cooking steps, we use sequence adverbs such as "First", "Next", "Then", and "After that". Which sequence word is the most appropriate to introduce the very LAST step in a recipe?',
    options: [
      { key: 'A', text: 'First' },
      { key: 'B', text: 'Then' },
      { key: 'C', text: 'Finally' },
      { key: 'D', text: 'Before' },
    ],
    correctAnswer: 'C',
    explanation: 'Kata penghubung urutan (sequence adverb) yang digunakan secara khusus untuk menandai langkah terakhir atau penutup resep adalah "Finally" (Akhirnya/Terakhir), misalnya: "Finally, serve the fried rice on a plate."'
  },
  {
    id: 6,
    topic: 'Reading Comprehension & Step Ordering',
    unitReference: 'Chapter 2: Culinary and Me (Unit 2 & 3: Banana Fritters Recipe)',
    hasAudio: true,
    audioTitle: 'Audio 2.6: Listening - Galang\'s Crispy Banana Fritters Steps',
    listeningInstruction: 'Dengarkan seluruh tahapan memasak pisang goreng renyah Galang dan tentukan langkah setelah mencelupkan pisang.',
    audioScript: 'Galang\'s Crispy Banana Fritters. Steps: First, peel the bananas and cut each banana in half. Next, mix flour, water, and sugar in a bowl to make a smooth batter. Then, dip the sliced bananas into the batter until well coated. After that, fry them in hot cooking oil until golden brown. Finally, place the fritters on a plate and sprinkle grated cheese on top. Question: Based on the recipe, what must we do immediately after dipping the sliced bananas into the batter?',
    contextTitle: 'Galang\'s Crispy Banana Fritters',
    contextText: `Steps:\n1. First, peel the bananas and cut each banana in half.\n2. Next, mix flour, water, and sugar in a bowl to make a smooth batter.\n3. Then, dip the sliced bananas into the batter until well coated.\n4. After that, fry them in hot cooking oil until golden brown.\n5. Finally, place the fritters on a plate and sprinkle grated cheese on top.`,
    question: 'Based on the recipe above, what must we do immediately AFTER dipping the sliced bananas into the batter?',
    options: [
      { key: 'A', text: 'Cut each banana into two equal halves' },
      { key: 'B', text: 'Sprinkle grated cheese on top of the bananas' },
      { key: 'C', text: 'Fry them in hot cooking oil until golden brown' },
      { key: 'D', text: 'Mix flour and sugar in a large glass bowl' },
    ],
    correctAnswer: 'C',
    explanation: 'Pada langkah ke-3: "dip the sliced bananas into the batter", langkah yang tepat berikutnya (langkah ke-4) adalah: "After that, fry them in hot cooking oil until golden brown".'
  },
  {
    id: 7,
    topic: 'Imperative Sentences & Cooking Verbs',
    unitReference: 'Chapter 2: Culinary and Me (Unit 3: Language Focus - Action Verbs)',
    hasAudio: true,
    audioTitle: 'Audio 2.7: Listening - Cooking Instruction with Missing Verb',
    listeningInstruction: 'Dengarkan kalimat instruksi memasak rumpang berikut dan tentukan kata kerja yang paling tepat.',
    audioScript: 'Listen carefully to the missing instruction: blank, the cooking oil into the frying pan, then heat it over medium flame. Choose the most appropriate action verb: Pour, Chop, Grate, or Peel?',
    question: 'Choose the most appropriate action verb to complete the instruction below:\n\n"__________ the cooking oil into the frying pan, then heat it over medium flame."',
    options: [
      { key: 'A', text: 'Pour' },
      { key: 'B', text: 'Chop' },
      { key: 'C', text: 'Grate' },
      { key: 'D', text: 'Peel' },
    ],
    correctAnswer: 'A',
    explanation: 'Kata kerja "Pour" artinya menuangkan (digunakan untuk benda cair seperti minyak goreng/air). "Chop" artinya mencincang, "Grate" artinya memarut, dan "Peel" artinya mengupas.'
  },
  {
    id: 8,
    topic: 'Kitchen Tools & Utensils in English for Nusantara',
    unitReference: 'Chapter 2: Culinary and Me (Unit 3: Worksheet 2.27 - Sweet Potato Fritters)',
    hasAudio: true,
    audioTitle: 'Audio 2.8: Listening - Draining Excess Cooking Oil',
    listeningInstruction: 'Dengarkan situasi Monita yang ingin meniriskan minyak goreng dari gorengan ubi.',
    audioScript: 'After frying the sweet potato fritters, Monita wants to separate the fritters from excess cooking oil so they stay crispy and not greasy. What tool should she use to drain the oil? A sieve or strainer, a rolling pin, a gas stove, or a refrigerator?',
    question: 'After frying the sweet potato fritters, Monita wants to separate the fritters from excess cooking oil so they stay crispy and not greasy. What tool should she use to drain the oil?',
    options: [
      { key: 'A', text: 'A sieve or strainer' },
      { key: 'B', text: 'A rolling pin' },
      { key: 'C', text: 'A gas stove' },
      { key: 'D', text: 'A refrigerator' },
    ],
    correctAnswer: 'A',
    explanation: 'Alat dapur berupa saringan kawat ("a sieve" atau "strainer") digunakan untuk meniriskan minyak (to drain excess cooking oil) setelah makanan digoreng.'
  },
  {
    id: 9,
    topic: 'Grammar - Identifying Imperative Sentences (Kalimat Perintah)',
    unitReference: 'Chapter 2: Culinary and Me (Unit 3: Language Focus)',
    hasAudio: true,
    audioTitle: 'Audio 2.9: Listening - Imperative Sentence Recognition',
    listeningInstruction: 'Dengarkan contoh kalimat perintah dalam teks prosedur dan pilih kalimat perintah yang tepat.',
    audioScript: 'Procedure text uses imperative sentences to give clear cooking directions. Listen to this sentence: Stir the mixture gently with a wooden spoon until smooth. Which of the following sentences is an imperative sentence?',
    question: 'Procedure text uses imperative sentences (kalimat perintah) to give clear cooking directions. Which of the following sentences is an IMPERATIVE sentence?',
    options: [
      { key: 'A', text: 'Monita is cooking sweet potato fritters in the kitchen.' },
      { key: 'B', text: 'Stir the mixture gently with a wooden spoon until smooth.' },
      { key: 'C', text: 'Andre and Galang ate three plates of special fried rice.' },
      { key: 'D', text: 'My mother will buy fresh bananas at the supermarket tomorrow.' },
    ],
    correctAnswer: 'B',
    explanation: 'Kalimat perintah (imperative sentence) diawali langsung dengan kata kerja bentuk pertama (Verb 1) tanpa subjek: "Stir the mixture gently..." (Aduklah adonan secara perlahan...). Pilihan A, C, dan D adalah kalimat berita/pernyataan (declarative).'
  },
  {
    id: 10,
    topic: 'Comprehension & Vocabulary in Context',
    unitReference: 'Chapter 2: Culinary and Me (Unit 3: Worksheet 2.22 - Warm Sweet Tea)',
    hasAudio: true,
    audioTitle: 'Audio 2.10: Listening - How to Make Warm Sweet Tea',
    listeningInstruction: 'Dengarkan audio resep membuat teh manis hangat, lalu tentukan alasan mencelupkan kantong teh berulang kali.',
    audioScript: 'How to Make Warm Sweet Tea. Ingredients: one tea bag, two teaspoons of sugar, two hundred milliliters of warm water. Steps: One, place the tea bag into a cup. Two, pour warm water into the cup. Three, dip the tea bag several times until the water turns reddish-brown. Four, add two teaspoons of sugar and stir well. Five, warm sweet tea is ready to serve! Question: Based on the text, why should we dip the tea bag into the warm water several times?',
    contextTitle: 'How to Make Warm Sweet Tea',
    contextText: `Ingredients:\n• 1 tea bag\n• 2 teaspoons of sugar\n• 200 ml of warm water\nSteps:\n1. Place the tea bag into a cup.\n2. Pour warm water into the cup.\n3. Dip the tea bag several times until the water turns reddish-brown.\n4. Add two teaspoons of sugar and stir well.\n5. Warm sweet tea is ready to serve!`,
    question: 'Based on the text, why should we dip the tea bag into the warm water several times?',
    options: [
      { key: 'A', text: 'To cool down the warm water quickly' },
      { key: 'B', text: 'To extract the tea flavor and color until the water turns reddish-brown' },
      { key: 'C', text: 'To melt the plastic spoon in the cup' },
      { key: 'D', text: 'To clean and wash the tea bag' },
    ],
    correctAnswer: 'B',
    explanation: 'Berdasarkan langkah ke-3 ("Dip the tea bag several times until the water turns reddish-brown"), tujuan mencelupkan kantong teh berulang kali adalah untuk mengeluarkan sari rasa dan warna teh hingga air berubah menjadi cokelat kemerahan.'
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
