import { Question, QuizSubmission, ProcedureTextConfig, ProcedureTextRecipe } from '../types';

export const QUIZ_METADATA = {
  title: 'Interactive English Quiz: Introducing My self and other',
  topic: 'Introducing Myself & Others / Procedure Text (Culinary and Me)',
  chapter: 'Chapter 2: Culinary and Me & Chapter 1',
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
  definition: 'Procedure text is a text that gives instructions on how to do or make something through a sequence of steps.',
  socialFunction: 'To explain to the reader or listener how to make, operate, or do something through a sequential series of actions or steps.',
  genericStructure: [
    {
      id: 'struct-1',
      title: '1. Goal / Aim (Tujuan)',
      desc: 'States what is to be made or accomplished, usually written in the title (e.g., How to Make Sweet Potato Fritters).'
    },
    {
      id: 'struct-2',
      title: '2. Ingredients / Materials (Bahan-Bahan)',
      desc: 'Lists the food items, ingredients, quantities, or materials required to complete the procedure (e.g., flour, sugar, bananas, 200 ml of water).'
    },
    {
      id: 'struct-3',
      title: '3. Cooking Utensils / Tools (Peralatan)',
      desc: 'Lists the kitchen equipment or tools used during preparation (e.g., frying pan, spatula, knife, peeler, sieve, stove).'
    },
    {
      id: 'struct-4',
      title: '4. Steps / Method (Langkah-Langkah)',
      desc: 'The chronological step-by-step instructions using imperative verbs (Verb 1) and sequence connectors to guide the reader.'
    }
  ],
  languageFeatures: [
    {
      id: 'feat-1',
      name: 'Imperative Sentences (Kalimat Perintah)',
      example: 'Peel the bananas! / Pour the oil into the pan! / Stir the batter gently!'
    },
    {
      id: 'feat-2',
      name: 'Action Verbs (Kata Kerja Aksi Memasak)',
      example: 'Peel, chop, slice, grate, pour, stir, mix, dip, fry, boil, drain, serve'
    },
    {
      id: 'feat-3',
      name: 'Sequence Adverbs (Kata Penghubung Urutan)',
      example: 'First, Second, Next, Then, After that, Finally'
    },
    {
      id: 'feat-4',
      name: 'Adverbials of Quantity & Manner (Keterangan Takaran & Cara)',
      example: '2 tablespoons of sugar / fry until golden brown and crispy'
    }
  ],
  texts: [
    {
      id: 'rec-1',
      title: 'How to Make Sweet Potato Fritters',
      category: 'Food Recipe (Makanan Ringan)',
      servings: '4 porsi',
      timeMinutes: '20 menit',
      difficulty: 'Mudah',
      goal: 'To make delicious and crispy sweet potato fritters for an afternoon family snack.',
      ingredients: [
        '2 medium sweet potatoes (ubi jalar)',
        '1 cup of wheat flour (tepung terigu)',
        '2 tablespoons of granulated sugar',
        '1/2 teaspoon of salt',
        '150 ml of clean water',
        'Cooking oil for deep frying'
      ],
      tools: [
        'Peeler or kitchen knife',
        'Cutting board',
        'Medium mixing bowl',
        'Frying pan (wajan)',
        'Spatula (sutil)',
        'Wire sieve or strainer (saringan peniris minyak)'
      ],
      steps: [
        'First, peel the sweet potatoes and wash them thoroughly with running water.',
        'Next, cut the sweet potatoes into thin, even slices using a sharp knife.',
        'Then, mix flour, sugar, salt, and water in a bowl to make a smooth coating batter.',
        'After that, dip each sweet potato slice into the batter until well coated.',
        'Next, heat cooking oil in a frying pan and fry the slices over medium heat until golden brown and crispy.',
        'Finally, drain the excess cooking oil using a sieve and serve the sweet potato fritters while warm.'
      ],
      languageNotes: 'Action Verbs: peel, wash, cut, mix, dip, fry, drain, serve. Sequence words: First, Next, Then, After that, Finally.',
      audioScript: 'How to Make Sweet Potato Fritters. First, peel the sweet potatoes and wash them thoroughly with running water. Next, cut them into thin slices and coat them with flour batter. Then, fry them in hot cooking oil until crispy. Finally, drain excess oil and serve the fritters while warm.',
      lastUpdated: new Date().toISOString()
    },
    {
      id: 'rec-2',
      title: "Galang's Crispy Banana Fritters",
      category: 'Food Recipe (Gorengan Tradisional)',
      servings: '5 porsi',
      timeMinutes: '15 menit',
      difficulty: 'Mudah',
      goal: 'To make crispy Indonesian fried bananas with sweet grated cheddar cheese on top.',
      ingredients: [
        '4 ripe bananas (pisang kepok/raja)',
        '1 cup of all-purpose flour',
        '1 tablespoon of white sugar',
        '1/4 teaspoon of salt',
        '200 ml of water',
        'Cooking oil',
        'Grated cheddar cheese or chocolate sprinkles (optional topping)'
      ],
      tools: [
        'Frying pan',
        'Wooden spatula',
        'Mixing bowl',
        'Serving plate',
        'Cheese grater'
      ],
      steps: [
        'First, peel the ripe bananas and cut each banana in half lengthwise.',
        'Next, mix flour, water, sugar, and salt in a bowl to create a smooth, lump-free batter.',
        'Then, dip the sliced bananas into the batter until evenly coated.',
        'After that, fry the coated bananas in hot cooking oil until golden brown on both sides.',
        'Finally, place the fritters on a plate and sprinkle grated cheese generously on top.'
      ],
      languageNotes: 'Focus on "dip into the batter" and "fry until golden brown". Imperative form starts directly with Verb 1.',
      audioScript: "Galang's Crispy Banana Fritters. First, peel the bananas and cut each banana in half. Next, mix flour, water, and sugar to make a smooth batter. Then, dip the sliced bananas into the batter. After that, fry them in hot cooking oil until golden brown. Finally, place them on a plate and sprinkle grated cheese on top.",
      lastUpdated: new Date().toISOString()
    },
    {
      id: 'rec-3',
      title: 'How to Make Warm Sweet Tea',
      category: 'Beverage Recipe (Minuman Hangat)',
      servings: '1 cangkir',
      timeMinutes: '5 menit',
      difficulty: 'Mudah',
      goal: 'To prepare a warm, comforting cup of sweet black tea for breakfast.',
      ingredients: [
        '1 black tea bag (kantong teh celup)',
        '2 teaspoons of granulated sugar',
        '200 ml of hot or warm water'
      ],
      tools: [
        'Ceramic tea cup or glass mug',
        'Teaspoon for stirring',
        'Water kettle or dispenser'
      ],
      steps: [
        'First, place one tea bag into a clean cup.',
        'Next, pour 200 ml of fresh warm water into the cup.',
        'Then, dip the tea bag up and down several times until the water turns rich reddish-brown.',
        'After that, add two teaspoons of sugar and stir well using a teaspoon until dissolved.',
        'Finally, remove the tea bag from the cup and your warm sweet tea is ready to enjoy.'
      ],
      languageNotes: 'Verb "dip" means to put something briefly into a liquid. "Stir" means to agitate with a spoon.',
      audioScript: 'How to Make Warm Sweet Tea. First, place the tea bag into a cup. Next, pour warm water into the cup. Then, dip the tea bag several times until the water turns reddish-brown. After that, add two teaspoons of sugar and stir well. Finally, warm sweet tea is ready to serve!',
      lastUpdated: new Date().toISOString()
    },
    {
      id: 'rec-4',
      title: 'Special Indonesian Fried Rice (Nasi Goreng Spesial)',
      category: 'Food Recipe (Makanan Utama)',
      servings: '2 porsi',
      timeMinutes: '15 menit',
      difficulty: 'Sedang',
      goal: 'To cook quick, savory, and fragrant Indonesian fried rice using leftover cold rice.',
      ingredients: [
        '2 plates of cold cooked white rice',
        '2 eggs',
        '2 cloves of garlic and 3 shallots (minced)',
        '2 tablespoons of sweet soy sauce (kecap manis)',
        '1 tablespoon of vegetable cooking oil',
        '1/2 teaspoon of salt and pepper to taste',
        'Fried shallots and cucumber slices for garnish'
      ],
      tools: [
        'Wok or large skillet',
        'Cooking spatula',
        'Knife and cutting board',
        'Stove'
      ],
      steps: [
        'First, heat vegetable oil in a wok over medium heat.',
        'Next, add minced garlic and shallots, then sauté until fragrant and lightly browned.',
        'Then, push the aromatics aside, crack the eggs into the wok, and scramble them quickly.',
        'After that, add the cold rice, pour sweet soy sauce, salt, and pepper, and stir-fry vigorously until evenly mixed.',
        'Finally, turn off the heat, transfer to serving plates, and garnish with fried shallots and cucumber.'
      ],
      languageNotes: 'Culinary Action Verbs: heat, sauté, crack, scramble, add, pour, stir-fry, transfer, garnish.',
      audioScript: 'Special Indonesian Fried Rice. First, heat vegetable oil in a wok. Next, add minced garlic and sauté until fragrant. Then, scramble the eggs. After that, add cold rice and sweet soy sauce, and stir-fry evenly. Finally, serve hot with fried shallots.',
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
