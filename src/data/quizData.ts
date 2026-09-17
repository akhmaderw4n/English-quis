import { Question, QuizSubmission } from '../types';

export const QUIZ_METADATA = {
  title: 'Interactive English Quiz: Procedure Text',
  chapter: 'Chapter 2: Culinary and Me',
  unit: 'Unit 3: A Secret Recipe & Unit 1-2',
  textbook: 'English for Nusantara (SMP/MTs Kelas VII - Kurikulum Merdeka)',
  branding: 'Kuis by Eli Ermawati, S.Pd.',
  teacherName: 'Eli Ermawati, S.Pd.',
  totalQuestions: 10,
  passingScore: 75, // KKM
  pointsPerQuestion: 10,
  defaultTeacherPin: '1234',
};

export const PROCEDURE_TEXT_SUMMARY = {
  definition: 'Procedure text is a text that gives instructions on how to do or make something through a sequence of steps.',
  genericStructure: [
    { title: '1. Goal / Aim', desc: 'States what will be made or done (e.g., How to Make Sweet Potato Fritters).' },
    { title: '2. Ingredients / Materials', desc: 'Lists the food items, amounts, or ingredients needed (e.g., flour, sugar, bananas).' },
    { title: '3. Cooking Utensils / Tools', desc: 'Equipment used during preparation (e.g., pan, spatula, knife, sieve, stove).' },
    { title: '4. Steps / Method', desc: 'Sequential instructions using imperative verbs and sequence words.' }
  ],
  languageFeatures: [
    { name: 'Imperative Sentences (Kalimat Perintah)', example: 'Peel the bananas! / Stir the batter well!' },
    { name: 'Action Verbs (Kata Kerja Masak)', example: 'Peel, chop, slice, pour, stir, mix, fry, boil, drain, serve' },
    { name: 'Sequence Adverbs (Kata Penghubung Urutan)', example: 'First, Second, Next, Then, After that, Finally' }
  ]
};

export const QUIZ_QUESTIONS: Question[] = [
  {
    id: 1,
    topic: 'Social Function / Purpose of Procedure Text',
    unitReference: 'Chapter 2: Culinary and Me (Unit 3: Section 1)',
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
