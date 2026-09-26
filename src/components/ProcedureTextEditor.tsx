import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FileText, 
  Plus, 
  Pencil, 
  Trash2, 
  Copy, 
  Volume2, 
  VolumeX, 
  Square, 
  Check, 
  RotateCcw, 
  Printer, 
  Search, 
  ChefHat, 
  BookOpen, 
  Sparkles, 
  Clock, 
  Users, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight, 
  Save, 
  PlusCircle, 
  Layers, 
  ListOrdered, 
  Utensils, 
  X,
  Eye,
  Share2
} from 'lucide-react';
import { ProcedureTextConfig, ProcedureTextRecipe, Question } from '../types';
import { speakEnglish, stopSpeech, playClickSound, playUnlockSuccessSound } from '../utils/audio';

interface ProcedureTextEditorProps {
  config: ProcedureTextConfig;
  onSaveConfig: (updatedConfig: ProcedureTextConfig) => Promise<void> | void;
  onResetToDefault: () => Promise<void> | void;
  onAddQuestionToBank?: (question: Question) => Promise<void> | void;
  isDbConnected?: boolean;
}

export const ProcedureTextEditor: React.FC<ProcedureTextEditorProps> = ({
  config,
  onSaveConfig,
  onResetToDefault,
  onAddQuestionToBank,
  isDbConnected = true,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'recipes' | 'theory' | 'preview'>('recipes');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  
  // Selected recipe for detail/preview
  const [selectedRecipeId, setSelectedRecipeId] = useState<string>(() => {
    return config.texts?.[0]?.id || '';
  });

  // Modal / Form state for editing or creating a recipe
  const [isRecipeModalOpen, setIsRecipeModalOpen] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<ProcedureTextRecipe | null>(null);

  // Form inputs for recipe modal
  const [formTitle, setFormTitle] = useState('');
  const [formCategory, setFormCategory] = useState('Food Recipe');
  const [formServings, setFormServings] = useState('4 porsi');
  const [formTime, setFormTime] = useState('15 menit');
  const [formDifficulty, setFormDifficulty] = useState<'Mudah' | 'Sedang' | 'Mahir'>('Mudah');
  const [formGoal, setFormGoal] = useState('');
  const [formIngredientsText, setFormIngredientsText] = useState('');
  const [formToolsText, setFormToolsText] = useState('');
  const [formStepsText, setFormStepsText] = useState('');
  const [formLanguageNotes, setFormLanguageNotes] = useState('');
  const [formAudioScript, setFormAudioScript] = useState('');
  const [formError, setFormError] = useState('');

  // Audio listening state
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [playingRecipeId, setPlayingRecipeId] = useState<string | null>(null);

  // General Theory editing state
  const [theoryDefinition, setTheoryDefinition] = useState(config.definition);
  const [theorySocialFunction, setTheorySocialFunction] = useState(config.socialFunction);
  const [theoryStructures, setTheoryStructures] = useState(config.genericStructure);
  const [theoryFeatures, setTheoryFeatures] = useState(config.languageFeatures);
  const [isSavingTheory, setIsSavingTheory] = useState(false);

  // Reset confirmation modal state
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  // Delete recipe confirmation modal
  const [recipeToDelete, setRecipeToDelete] = useState<ProcedureTextRecipe | null>(null);

  // Toast notification
  const [toastMsg, setToastMsg] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToastMsg({ text, type });
    setTimeout(() => setToastMsg(null), 4000);
  };

  // Categories list
  const categories = useMemo(() => {
    const set = new Set<string>();
    config.texts?.forEach(t => {
      if (t.category) set.add(t.category);
    });
    return Array.from(set);
  }, [config.texts]);

  // Filtered recipes
  const filteredRecipes = useMemo(() => {
    return (config.texts || []).filter(item => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || 
        item.title.toLowerCase().includes(q) ||
        item.goal.toLowerCase().includes(q) ||
        item.ingredients.some(ing => ing.toLowerCase().includes(q));
      const matchesCategory = selectedCategory === 'ALL' || item.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [config.texts, searchQuery, selectedCategory]);

  const selectedRecipe = useMemo(() => {
    return (config.texts || []).find(t => t.id === selectedRecipeId) || (config.texts || [])[0] || null;
  }, [config.texts, selectedRecipeId]);

  // Audio Playback
  const handlePlayRecipeAudio = (recipe: ProcedureTextRecipe) => {
    playClickSound();
    if (isPlayingAudio && playingRecipeId === recipe.id) {
      stopSpeech();
      setIsPlayingAudio(false);
      setPlayingRecipeId(null);
      return;
    }

    stopSpeech();
    setIsPlayingAudio(true);
    setPlayingRecipeId(recipe.id);

    const script = recipe.audioScript || `${recipe.title}. Goal: ${recipe.goal}. Steps: ${recipe.steps.join(' ')}`;
    speakEnglish(script, {
      rate: 0.82,
      onStart: () => {
        setIsPlayingAudio(true);
        setPlayingRecipeId(recipe.id);
      },
      onEnd: () => {
        setIsPlayingAudio(false);
        setPlayingRecipeId(null);
      },
      onError: () => {
        setIsPlayingAudio(false);
        setPlayingRecipeId(null);
      }
    });
  };

  const handleStopAudio = () => {
    stopSpeech();
    setIsPlayingAudio(false);
    setPlayingRecipeId(null);
  };

  // Open recipe edit modal
  const handleOpenEditRecipe = (recipe: ProcedureTextRecipe) => {
    playClickSound();
    setEditingRecipe(recipe);
    setFormTitle(recipe.title);
    setFormCategory(recipe.category || 'Food Recipe');
    setFormServings(recipe.servings || '4 porsi');
    setFormTime(recipe.timeMinutes || '15 menit');
    setFormDifficulty(recipe.difficulty || 'Mudah');
    setFormGoal(recipe.goal);
    setFormIngredientsText(recipe.ingredients.join('\n'));
    setFormToolsText(recipe.tools.join('\n'));
    setFormStepsText(recipe.steps.join('\n'));
    setFormLanguageNotes(recipe.languageNotes || '');
    setFormAudioScript(recipe.audioScript || '');
    setFormError('');
    setIsRecipeModalOpen(true);
  };

  // Open create recipe modal
  const handleOpenCreateRecipe = () => {
    playClickSound();
    setEditingRecipe(null);
    setFormTitle('');
    setFormCategory('Food Recipe');
    setFormServings('4 porsi');
    setFormTime('20 menit');
    setFormDifficulty('Mudah');
    setFormGoal('');
    setFormIngredientsText('• 2 sweet potatoes\n• 1 cup of flour\n• 2 tablespoons of sugar\n• Cooking oil');
    setFormToolsText('• Knife and peeler\n• Mixing bowl\n• Frying pan\n• Spatula\n• Sieve / Strainer');
    setFormStepsText('1. First, peel the ingredients and wash them.\n2. Next, cut them into thin slices.\n3. Then, dip into the batter and fry until golden brown.\n4. Finally, serve while warm.');
    setFormLanguageNotes('Action Verbs: peel, wash, cut, dip, fry, serve. Sequence Words: First, Next, Then, Finally.');
    setFormAudioScript('');
    setFormError('');
    setIsRecipeModalOpen(true);
  };

  // Save recipe from modal
  const handleSaveRecipeForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      setFormError('Judul teks prosedur wajib diisi.');
      return;
    }
    if (!formGoal.trim()) {
      setFormError('Goal / Tujuan teks prosedur wajib diisi.');
      return;
    }

    const ingredients = formIngredientsText
      .split('\n')
      .map(s => s.replace(/^[•\-\*]\s*/, '').trim())
      .filter(Boolean);

    const tools = formToolsText
      .split('\n')
      .map(s => s.replace(/^[•\-\*]\s*/, '').trim())
      .filter(Boolean);

    const steps = formStepsText
      .split('\n')
      .map(s => s.replace(/^\d+[\.\)]\s*/, '').trim())
      .filter(Boolean);

    if (ingredients.length === 0) {
      setFormError('Masukkan minimal 1 bahan (ingredients).');
      return;
    }

    if (steps.length === 0) {
      setFormError('Masukkan minimal 1 langkah pengerjaan (steps).');
      return;
    }

    const defaultAudio = formAudioScript.trim() || 
      `${formTitle}. Goal: ${formGoal}. Steps: ${steps.join(' ')}`;

    const newRecipe: ProcedureTextRecipe = {
      id: editingRecipe ? editingRecipe.id : `rec-${Date.now()}`,
      title: formTitle.trim(),
      category: formCategory.trim(),
      servings: formServings.trim(),
      timeMinutes: formTime.trim(),
      difficulty: formDifficulty,
      goal: formGoal.trim(),
      ingredients,
      tools,
      steps,
      languageNotes: formLanguageNotes.trim(),
      audioScript: defaultAudio,
      lastUpdated: new Date().toISOString()
    };

    let updatedTexts: ProcedureTextRecipe[];
    if (editingRecipe) {
      updatedTexts = (config.texts || []).map(r => r.id === editingRecipe.id ? newRecipe : r);
    } else {
      updatedTexts = [newRecipe, ...(config.texts || [])];
    }

    const updatedConfig: ProcedureTextConfig = {
      ...config,
      texts: updatedTexts,
      lastUpdated: new Date().toISOString()
    };

    try {
      await onSaveConfig(updatedConfig);
      setIsRecipeModalOpen(false);
      setSelectedRecipeId(newRecipe.id);
      playUnlockSuccessSound();
      showToast(editingRecipe ? `Teks "${newRecipe.title}" berhasil diperbarui!` : `Teks prosedur baru "${newRecipe.title}" berhasil ditambahkan!`);
    } catch (err) {
      console.error(err);
      setFormError('Terjadi kesalahan saat menyimpan teks.');
    }
  };

  // Duplicate recipe
  const handleDuplicateRecipe = async (recipe: ProcedureTextRecipe) => {
    playClickSound();
    const duplicated: ProcedureTextRecipe = {
      ...recipe,
      id: `rec-${Date.now()}`,
      title: `${recipe.title} (Salinan)`,
      lastUpdated: new Date().toISOString()
    };
    const updatedConfig: ProcedureTextConfig = {
      ...config,
      texts: [duplicated, ...(config.texts || [])],
      lastUpdated: new Date().toISOString()
    };
    await onSaveConfig(updatedConfig);
    setSelectedRecipeId(duplicated.id);
    showToast(`Berhasil menduplikasi teks: "${duplicated.title}"`);
  };

  // Delete recipe
  const handleConfirmDeleteRecipe = async () => {
    if (!recipeToDelete) return;
    playClickSound();
    const filtered = (config.texts || []).filter(r => r.id !== recipeToDelete.id);
    const updatedConfig: ProcedureTextConfig = {
      ...config,
      texts: filtered,
      lastUpdated: new Date().toISOString()
    };
    await onSaveConfig(updatedConfig);
    if (selectedRecipeId === recipeToDelete.id && filtered.length > 0) {
      setSelectedRecipeId(filtered[0].id);
    }
    setRecipeToDelete(null);
    showToast(`Teks "${recipeToDelete.title}" berhasil dihapus.`);
  };

  // Save Theory Changes
  const handleSaveTheory = async () => {
    playClickSound();
    setIsSavingTheory(true);
    const updatedConfig: ProcedureTextConfig = {
      ...config,
      definition: theoryDefinition.trim(),
      socialFunction: theorySocialFunction.trim(),
      genericStructure: theoryStructures,
      languageFeatures: theoryFeatures,
      lastUpdated: new Date().toISOString()
    };
    try {
      await onSaveConfig(updatedConfig);
      playUnlockSuccessSound();
      showToast('Materi dan Ciri Kebahasaan Procedure Text berhasil diperbarui!');
    } catch (err) {
      console.error(err);
      showToast('Gagal menyimpan materi teori.', 'error');
    } finally {
      setIsSavingTheory(false);
    }
  };

  // Auto-generate Question from Recipe to Question Bank
  const handleCreateQuestionFromRecipe = async (recipe: ProcedureTextRecipe) => {
    if (!onAddQuestionToBank) {
      showToast('Fitur Tambah Soal belum terhubung ke Bank Soal.', 'info');
      return;
    }
    playClickSound();

    const newQuestion: Question = {
      id: Date.now(),
      topic: `Comprehension: ${recipe.title}`,
      unitReference: `Chapter 2: Culinary and Me (Procedure Text - ${recipe.category})`,
      hasAudio: true,
      audioTitle: `Listening: ${recipe.title}`,
      listeningInstruction: `Listen to the recipe steps for "${recipe.title}" carefully, then answer the question.`,
      audioScript: recipe.audioScript || `${recipe.title}. ${recipe.steps.join(' ')}`,
      contextTitle: recipe.title,
      contextText: `Goal: ${recipe.goal}\nIngredients:\n${recipe.ingredients.map(i => `• ${i}`).join('\n')}\nSteps:\n${recipe.steps.map((s, idx) => `${idx + 1}. ${s}`).join('\n')}`,
      question: `What is the primary social function of the procedure text "${recipe.title}"?`,
      options: [
        { key: 'A', text: `To entertain readers with an imaginative story about ${recipe.title.toLowerCase()}` },
        { key: 'B', text: `To persuade readers to buy ingredients at a local market` },
        { key: 'C', text: `To explain step-by-step how to make ${recipe.title.replace(/^How to Make\s*/i, '')}` },
        { key: 'D', text: `To describe what an Indonesian traditional market looks like` }
      ],
      correctAnswer: 'C',
      explanation: `Teks "${recipe.title}" adalah procedure text yang bertujuan memandu pembaca langkah demi langkah cara membuat atau melakukan sesuatu (to explain step-by-step how to make ${recipe.title.replace(/^How to Make\s*/i, '')}).`
    };

    try {
      await onAddQuestionToBank(newQuestion);
      playUnlockSuccessSound();
      showToast(`Soal kuis baru berdasarkan "${recipe.title}" berhasil ditambahkan ke Bank Soal!`);
    } catch (err) {
      console.error(err);
      showToast('Gagal menambahkan soal ke Bank Soal.', 'error');
    }
  };

  // Print Handout for students
  const handlePrintHandout = (recipe: ProcedureTextRecipe) => {
    playClickSound();
    const printWin = window.open('', '_blank');
    if (!printWin) {
      alert('Pop-up terblokir. Izinkan pop-up untuk mencetak lembar handout.');
      return;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Handout Materi: ${recipe.title}</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 24px; color: #1e293b; max-width: 800px; margin: 0 auto; line-height: 1.6; }
          .header { border-bottom: 2px solid #f59e0b; padding-bottom: 12px; margin-bottom: 20px; }
          .badge { display: inline-block; background: #fef3c7; color: #92400e; font-weight: bold; font-size: 12px; padding: 3px 8px; border-radius: 4px; margin-right: 6px; }
          h1 { margin: 8px 0 4px 0; color: #0f172a; font-size: 24px; }
          h2 { color: #b45309; font-size: 16px; margin-top: 20px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; }
          ul, ol { padding-left: 20px; }
          li { margin-bottom: 6px; }
          .meta-box { background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px; margin-bottom: 16px; font-size: 14px; }
          .note-box { background: #eff6ff; border-left: 4px solid #3b82f6; padding: 10px 14px; margin-top: 16px; border-radius: 0 6px 6px 0; font-size: 13px; }
          @media print { body { padding: 0; } button { display: none; } }
        </style>
      </head>
      <body>
        <div class="header">
          <span class="badge">Buku Siswa English for Nusantara</span>
          <span class="badge">Chapter 2: Culinary and Me</span>
          <span class="badge">Kelas 7 SMP</span>
          <h1>${recipe.title}</h1>
          <p style="margin: 0; color: #64748b; font-size: 14px;">Materi Ajar Bahasa Inggris: Procedure Text &bull; Guru Pengampu: Eli Ermawati, S.Pd.</p>
        </div>

        <div class="meta-box">
          <strong>Goal / Social Function:</strong> ${recipe.goal}<br>
          <strong>Kategori:</strong> ${recipe.category} &bull; <strong>Waktu:</strong> ${recipe.timeMinutes || '-'} &bull; <strong>Porsi:</strong> ${recipe.servings || '-'}
        </div>

        <h2>1. Ingredients / Materials (Bahan-Bahan)</h2>
        <ul>
          ${recipe.ingredients.map(ing => `<li>${ing}</li>`).join('')}
        </ul>

        <h2>2. Cooking Utensils / Tools (Peralatan)</h2>
        <ul>
          ${recipe.tools.map(tool => `<li>${tool}</li>`).join('')}
        </ul>

        <h2>3. Steps / Method (Langkah-Langkah)</h2>
        <ol>
          ${recipe.steps.map(step => `<li>${step}</li>`).join('')}
        </ol>

        ${recipe.languageNotes ? `
          <div class="note-box">
            <strong>Language Focus &amp; Action Verbs:</strong><br>
            ${recipe.languageNotes}
          </div>
        ` : ''}

        <p style="text-align: right; margin-top: 30px; font-size: 12px; color: #94a3b8;">
          Dicetak dari Interactive English Quiz &bull; ${new Date().toLocaleDateString('id-ID')}
        </p>

        <script>
          window.onload = function() { window.print(); };
        </script>
      </body>
      </html>
    `;

    printWin.document.open();
    printWin.document.write(htmlContent);
    printWin.document.close();
  };

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      <AnimatePresence>
        {toastMsg && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`p-3.5 rounded-xl border text-xs sm:text-sm font-semibold flex items-center justify-between gap-3 shadow-md ${
              toastMsg.type === 'success'
                ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                : toastMsg.type === 'error'
                ? 'bg-rose-50 border-rose-300 text-rose-900'
                : 'bg-blue-50 border-blue-300 text-blue-900'
            }`}
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{toastMsg.text}</span>
            </div>
            <button
              type="button"
              onClick={() => setToastMsg(null)}
              className="text-slate-500 hover:text-slate-800 text-xs font-bold"
            >
              ✕
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Editor Banner & Action Header */}
      <div className="bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 text-white rounded-2xl sm:rounded-3xl p-5 sm:p-7 shadow-md relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-200 border border-amber-300/30 text-xs font-bold flex items-center gap-1.5">
                <ChefHat className="w-3.5 h-3.5" />
                <span>Menu Guru: Modul Ajar</span>
              </span>
              <span className="px-2 py-0.5 rounded-full bg-white/20 text-white text-[11px] font-semibold">
                Kurikulum Merdeka Kelas 7
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
              <FileText className="w-6 h-6 text-amber-200" />
              <span>Edit Materi &amp; Teks Prosedur (Procedure Text)</span>
            </h2>
            <p className="text-xs sm:text-sm text-amber-100/90 mt-1 max-w-2xl">
              Sesuaikan definisi, struktur generik (*Goal, Ingredients, Tools, Steps*), ciri kebahasaan (*Action Verbs &amp; Sequence Words*), dan perbendaharaan teks resep nusantara yang dipelajari siswa.
            </p>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto shrink-0 flex-wrap justify-end">
            <button
              type="button"
              onClick={handleOpenCreateRecipe}
              className="px-3.5 py-2 rounded-xl bg-white hover:bg-amber-50 active:scale-98 text-amber-900 font-extrabold text-xs sm:text-sm transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <PlusCircle className="w-4 h-4 text-amber-600" />
              <span>Tambah Teks Prosedur Baru</span>
            </button>

            <button
              type="button"
              onClick={() => setIsResetModalOpen(true)}
              className="px-3 py-2 rounded-xl bg-black/20 hover:bg-black/30 text-amber-100 font-semibold text-xs transition-all flex items-center gap-1.5 cursor-pointer border border-white/20"
              title="Reset ke Teks Standar Buku English for Nusantara"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Standar</span>
            </button>
          </div>
        </div>
      </div>

      {/* Sub-tab Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          type="button"
          onClick={() => {
            playClickSound();
            setActiveSubTab('recipes');
          }}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer ${
            activeSubTab === 'recipes'
              ? 'bg-amber-500 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Utensils className="w-4 h-4" />
          <span>Koleksi Teks Resep ({config.texts?.length || 0})</span>
        </button>

        <button
          type="button"
          onClick={() => {
            playClickSound();
            setActiveSubTab('theory');
          }}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer ${
            activeSubTab === 'theory'
              ? 'bg-amber-500 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Materi Teori &amp; Kebahasaan</span>
        </button>

        <button
          type="button"
          onClick={() => {
            playClickSound();
            setActiveSubTab('preview');
          }}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer ${
            activeSubTab === 'preview'
              ? 'bg-amber-500 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Eye className="w-4 h-4" />
          <span>Pratinjau Tampilan Siswa</span>
        </button>
      </div>

      {/* Sub-tab 1: Recipes & Texts Collection */}
      {activeSubTab === 'recipes' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Left Column: List of Procedure Texts */}
          <div className="lg:col-span-5 space-y-3">
            {/* Search & Category Filter */}
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs space-y-2.5">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari judul, bahan, atau kata kunci..."
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none"
                />
              </div>

              {categories.length > 0 && (
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setSelectedCategory('ALL')}
                    className={`px-2.5 py-1 rounded-lg font-bold shrink-0 transition-colors cursor-pointer ${
                      selectedCategory === 'ALL'
                        ? 'bg-amber-500 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Semua ({config.texts?.length || 0})
                  </button>
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-2.5 py-1 rounded-lg font-medium shrink-0 transition-colors cursor-pointer ${
                        selectedCategory === cat
                          ? 'bg-amber-500 text-white font-bold'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Recipe Cards List */}
            <div className="space-y-2.5 max-h-[640px] overflow-y-auto pr-1">
              {filteredRecipes.length === 0 ? (
                <div className="p-8 text-center bg-white rounded-2xl border border-dashed border-slate-300 text-slate-500 text-xs">
                  Tidak ada teks prosedur yang cocok dengan pencarian.
                </div>
              ) : (
                filteredRecipes.map((recipe) => {
                  const isSelected = recipe.id === selectedRecipe?.id;
                  const isCurrentAudio = isPlayingAudio && playingRecipeId === recipe.id;

                  return (
                    <div
                      key={recipe.id}
                      onClick={() => {
                        playClickSound();
                        setSelectedRecipeId(recipe.id);
                      }}
                      className={`p-3.5 sm:p-4 rounded-2xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-amber-50/80 border-amber-400 shadow-sm ring-2 ring-amber-300/40'
                          : 'bg-white border-slate-200 hover:border-amber-200 hover:bg-amber-50/30'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap mb-1">
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
                              {recipe.category || 'Recipe'}
                            </span>
                            {recipe.difficulty && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600">
                                {recipe.difficulty}
                              </span>
                            )}
                          </div>
                          <h4 className="text-sm font-bold text-slate-900 leading-snug truncate">
                            {recipe.title}
                          </h4>
                          <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                            {recipe.goal}
                          </p>
                        </div>

                        {/* Quick Audio Play Button on List */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePlayRecipeAudio(recipe);
                          }}
                          className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-colors cursor-pointer ${
                            isCurrentAudio
                              ? 'bg-amber-500 text-white animate-pulse'
                              : 'bg-slate-100 hover:bg-amber-100 text-slate-700'
                          }`}
                          title="Dengarkan pelafalan TTS audio"
                        >
                          {isCurrentAudio ? (
                            <Volume2 className="w-4 h-4" />
                          ) : (
                            <VolumeX className="w-4 h-4 text-slate-400" />
                          )}
                        </button>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2.5 pt-2 border-t border-slate-100">
                        <div className="flex items-center gap-3">
                          <span>{recipe.ingredients.length} Bahan</span>
                          <span>&bull;</span>
                          <span>{recipe.steps.length} Langkah</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenEditRecipe(recipe);
                            }}
                            className="p-1 rounded-md text-amber-700 hover:bg-amber-100 transition-colors"
                            title="Edit Teks Ini"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDuplicateRecipe(recipe);
                            }}
                            className="p-1 rounded-md text-blue-700 hover:bg-blue-100 transition-colors"
                            title="Duplikasi Teks"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setRecipeToDelete(recipe);
                            }}
                            className="p-1 rounded-md text-rose-600 hover:bg-rose-100 transition-colors"
                            title="Hapus Teks"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Column: Selected Procedure Text Detail & Actions */}
          <div className="lg:col-span-7">
            {selectedRecipe ? (
              <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200 shadow-sm p-5 sm:p-7 space-y-6">
                {/* Header of selected recipe */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
                        {selectedRecipe.category}
                      </span>
                      {selectedRecipe.timeMinutes && (
                        <span className="flex items-center gap-1 text-xs text-slate-500">
                          <Clock className="w-3.5 h-3.5" />
                          <span>{selectedRecipe.timeMinutes}</span>
                        </span>
                      )}
                      {selectedRecipe.servings && (
                        <span className="flex items-center gap-1 text-xs text-slate-500">
                          <Users className="w-3.5 h-3.5" />
                          <span>{selectedRecipe.servings}</span>
                        </span>
                      )}
                    </div>
                    <h3 className="text-xl sm:text-2xl font-black text-slate-900">
                      {selectedRecipe.title}
                    </h3>
                  </div>

                  {/* Actions for selected text */}
                  <div className="flex items-center gap-1.5 flex-wrap shrink-0">
                    <button
                      type="button"
                      onClick={() => handlePlayRecipeAudio(selectedRecipe)}
                      className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer ${
                        isPlayingAudio && playingRecipeId === selectedRecipe.id
                          ? 'bg-amber-500 text-white shadow-xs'
                          : 'bg-amber-100 hover:bg-amber-200 text-amber-900'
                      }`}
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                      <span>{isPlayingAudio && playingRecipeId === selectedRecipe.id ? 'Hentikan Audio' : 'Dengarkan TTS'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenEditRecipe(selectedRecipe)}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      <span>Edit Teks</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handlePrintHandout(selectedRecipe)}
                      className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                      title="Cetak Lembar Belajar Siswa (Handout)"
                    >
                      <Printer className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Generic Structure: 1. Goal / Aim */}
                <div className="bg-amber-50/60 rounded-2xl p-4 border border-amber-200/70">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900 uppercase tracking-wider mb-1">
                    <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                    <span>1. Goal / Aim (Tujuan Teks)</span>
                  </div>
                  <p className="text-sm font-semibold text-slate-800">
                    {selectedRecipe.goal}
                  </p>
                </div>

                {/* Generic Structure: 2. Ingredients & 3. Tools */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Ingredients */}
                  <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-200/80">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1">
                        <Utensils className="w-3.5 h-3.5 text-amber-600" />
                        <span>2. Ingredients (Bahan)</span>
                      </span>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">
                        {selectedRecipe.ingredients.length} item
                      </span>
                    </div>
                    <ul className="space-y-1.5 text-xs text-slate-700">
                      {selectedRecipe.ingredients.map((ing, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                          <span>{ing}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Utensils / Tools */}
                  <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-200/80">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1">
                        <ChefHat className="w-3.5 h-3.5 text-amber-600" />
                        <span>3. Tools / Utensils (Alat)</span>
                      </span>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-800">
                        {selectedRecipe.tools.length} item
                      </span>
                    </div>
                    <ul className="space-y-1.5 text-xs text-slate-700">
                      {selectedRecipe.tools.map((tool, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                          <span>{tool}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Generic Structure: 4. Steps / Method */}
                <div className="bg-slate-50/80 rounded-2xl p-4.5 border border-slate-200/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <ListOrdered className="w-4 h-4 text-emerald-600" />
                      <span>4. Steps / Method (Langkah-Langkah Pengerjaan)</span>
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                      {selectedRecipe.steps.length} tahapan
                    </span>
                  </div>

                  <div className="space-y-2">
                    {selectedRecipe.steps.map((step, idx) => (
                      <div key={idx} className="flex items-start gap-2.5 p-2 rounded-xl bg-white border border-slate-200/70 text-xs">
                        <span className="w-5 h-5 rounded-full bg-emerald-500 text-white font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                          {idx + 1}
                        </span>
                        <div className="text-slate-800 font-medium leading-relaxed">
                          {step}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Language Focus Box */}
                {selectedRecipe.languageNotes && (
                  <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-200/80">
                    <div className="text-xs font-bold text-indigo-900 mb-1 flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Language Focus &amp; Vocabulary Notes</span>
                    </div>
                    <p className="text-xs text-indigo-800/90 leading-relaxed font-medium">
                      {selectedRecipe.languageNotes}
                    </p>
                  </div>
                )}

                {/* Teacher Quick Integration Action: Jadikan Soal di Bank Soal */}
                <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <h5 className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                      <span>Buat Soal Kuis Otomatis dari Teks Ini</span>
                    </h5>
                    <p className="text-[11px] text-amber-800 mt-0.5">
                      Sisipkan teks resep "{selectedRecipe.title}" sebagai soal pemahaman baru ke tab Bank Soal.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCreateQuestionFromRecipe(selectedRecipe)}
                    className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-98 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Jadikan Soal Kuis</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-2xl p-12 text-center border border-dashed border-slate-300 text-slate-500">
                Pilih atau buat teks prosedur dari daftar di sebelah kiri.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Sub-tab 2: Theory & Language Features Editor */}
      {activeSubTab === 'theory' && (
        <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200 shadow-sm p-5 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-lg sm:text-xl font-black text-slate-900">
                Ringkasan Materi &amp; Ciri Kebahasaan (Language Features)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Konsep inti materi Procedure Text yang ditampilkan kepada peserta didik sebagai panduan belajar.
              </p>
            </div>
            <button
              type="button"
              onClick={handleSaveTheory}
              disabled={isSavingTheory}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-98 text-white font-bold text-xs sm:text-sm flex items-center gap-1.5 transition-all cursor-pointer shadow-xs disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{isSavingTheory ? 'Menyimpan...' : 'Simpan Materi Teori'}</span>
            </button>
          </div>

          {/* Definition */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
              1. Definition (Pengertian Procedure Text)
            </label>
            <textarea
              rows={2}
              value={theoryDefinition}
              onChange={(e) => setTheoryDefinition(e.target.value)}
              className="w-full p-3 text-xs sm:text-sm rounded-xl border border-slate-200 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none"
              placeholder="Procedure text is a text that gives instructions..."
            />
          </div>

          {/* Social Function */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
              2. Social Function / Purpose (Tujuan Komunikatif)
            </label>
            <textarea
              rows={2}
              value={theorySocialFunction}
              onChange={(e) => setTheorySocialFunction(e.target.value)}
              className="w-full p-3 text-xs sm:text-sm rounded-xl border border-slate-200 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none"
              placeholder="To explain to the reader how to make or do something..."
            />
          </div>

          {/* Generic Structure Cards */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                3. Generic Structure (Struktur Generik)
              </label>
              <button
                type="button"
                onClick={() => {
                  setTheoryStructures([
                    ...theoryStructures,
                    { id: `struct-${Date.now()}`, title: 'New Structure Section', desc: 'Description here...' }
                  ]);
                }}
                className="text-xs text-amber-700 hover:text-amber-900 font-bold flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Bagian Struktur</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {theoryStructures.map((struct, index) => (
                <div key={struct.id || index} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <input
                      type="text"
                      value={struct.title}
                      onChange={(e) => {
                        const updated = [...theoryStructures];
                        updated[index].title = e.target.value;
                        setTheoryStructures(updated);
                      }}
                      className="text-xs font-bold text-slate-900 bg-white px-2 py-1 rounded border border-slate-200 w-full"
                    />
                    {theoryStructures.length > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          setTheoryStructures(theoryStructures.filter((_, i) => i !== index));
                        }}
                        className="text-rose-500 hover:text-rose-700 p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <textarea
                    rows={2}
                    value={struct.desc}
                    onChange={(e) => {
                      const updated = [...theoryStructures];
                      updated[index].desc = e.target.value;
                      setTheoryStructures(updated);
                    }}
                    className="w-full text-xs p-2 rounded bg-white border border-slate-200"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Language Features */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                4. Language Features (Ciri-Ciri Kebahasaan)
              </label>
              <button
                type="button"
                onClick={() => {
                  setTheoryFeatures([
                    ...theoryFeatures,
                    { id: `feat-${Date.now()}`, name: 'New Language Feature', example: 'Example sentences or words' }
                  ]);
                }}
                className="text-xs text-amber-700 hover:text-amber-900 font-bold flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Ciri Kebahasaan</span>
              </button>
            </div>

            <div className="space-y-2.5">
              {theoryFeatures.map((feat, index) => (
                <div key={feat.id || index} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 flex flex-col sm:flex-row items-start sm:items-center gap-3">
                  <div className="w-full sm:w-1/3">
                    <input
                      type="text"
                      value={feat.name}
                      onChange={(e) => {
                        const updated = [...theoryFeatures];
                        updated[index].name = e.target.value;
                        setTheoryFeatures(updated);
                      }}
                      className="text-xs font-bold text-slate-900 bg-white px-2.5 py-1.5 rounded border border-slate-200 w-full"
                      placeholder="Nama fitur..."
                    />
                  </div>
                  <div className="w-full sm:w-2/3 flex items-center gap-2">
                    <input
                      type="text"
                      value={feat.example}
                      onChange={(e) => {
                        const updated = [...theoryFeatures];
                        updated[index].example = e.target.value;
                        setTheoryFeatures(updated);
                      }}
                      className="text-xs text-slate-700 bg-white px-2.5 py-1.5 rounded border border-slate-200 w-full"
                      placeholder="Contoh kata atau kalimat..."
                    />
                    {theoryFeatures.length > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          setTheoryFeatures(theoryFeatures.filter((_, i) => i !== index));
                        }}
                        className="text-rose-500 hover:text-rose-700 p-1.5"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Sub-tab 3: Student View Preview */}
      {activeSubTab === 'preview' && (
        <div className="bg-amber-50/50 rounded-2xl sm:rounded-3xl border border-amber-200/80 p-5 sm:p-8 space-y-6">
          <div className="text-center max-w-xl mx-auto space-y-2 mb-6">
            <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-900 font-bold text-xs border border-amber-300 inline-block">
              Simulasi Tampilan Peserta Didik
            </span>
            <h3 className="text-xl sm:text-2xl font-black text-slate-900">
              Modul Pembelajaran: Procedure Text
            </h3>
            <p className="text-xs text-slate-600">
              Ini adalah tampilan yang dapat diakses siswa sebelum memulai kuis atau saat mempelajari materi.
            </p>
          </div>

          {/* Theory Summary for Students */}
          <div className="bg-white rounded-2xl p-5 border border-amber-200 shadow-2xs space-y-4">
            <h4 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-amber-600" />
              <span>Apa itu Procedure Text?</span>
            </h4>
            <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-medium bg-amber-50/60 p-3.5 rounded-xl border border-amber-100">
              {config.definition}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-2">
              {config.genericStructure.map((st, i) => (
                <div key={i} className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                  <div className="font-bold text-amber-900 mb-1">{st.title}</div>
                  <div className="text-[11px] text-slate-600 leading-tight">{st.desc}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Sample Recipe Card for Students */}
          {selectedRecipe && (
            <div className="bg-white rounded-2xl p-5 border border-amber-200 shadow-2xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block">
                    Contoh Teks Resep Siswa
                  </span>
                  <h4 className="text-lg font-black text-slate-900">
                    {selectedRecipe.title}
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() => handlePlayRecipeAudio(selectedRecipe)}
                  className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs flex items-center gap-1.5"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>Dengarkan Pengucapan (Audio)</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <h5 className="text-xs font-bold text-slate-800 mb-2">Ingredients:</h5>
                  <ul className="text-xs space-y-1 text-slate-600 pl-4 list-disc">
                    {selectedRecipe.ingredients.map((ing, i) => (
                      <li key={i}>{ing}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h5 className="text-xs font-bold text-slate-800 mb-2">Tools:</h5>
                  <ul className="text-xs space-y-1 text-slate-600 pl-4 list-disc">
                    {selectedRecipe.tools.map((t, i) => (
                      <li key={i}>{t}</li>
                    ))}
                  </ul>
                </div>
              </div>

              <div>
                <h5 className="text-xs font-bold text-slate-800 mb-2">Cooking Steps:</h5>
                <ol className="text-xs space-y-1.5 text-slate-700 pl-4 list-decimal">
                  {selectedRecipe.steps.map((st, i) => (
                    <li key={i} className="leading-relaxed">{st}</li>
                  ))}
                </ol>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal: Edit or Create Procedure Text Recipe */}
      <AnimatePresence>
        {isRecipeModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl sm:rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden my-auto"
            >
              {/* Modal Header */}
              <div className="p-4 sm:p-5 border-b border-slate-200 bg-amber-50/70 flex items-center justify-between gap-3 shrink-0">
                <div className="flex items-center gap-2">
                  <ChefHat className="w-5 h-5 text-amber-600" />
                  <h4 className="font-extrabold text-slate-900 text-sm sm:text-base">
                    {editingRecipe ? 'Edit Teks Prosedur' : 'Tambah Teks Prosedur Baru'}
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() => setIsRecipeModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-white hover:bg-slate-100 flex items-center justify-center text-slate-500 font-bold border border-slate-200"
                >
                  ✕
                </button>
              </div>

              {/* Modal Body Form */}
              <form onSubmit={handleSaveRecipeForm} className="p-4 sm:p-6 overflow-y-auto space-y-4">
                {formError && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                {/* Title */}
                <div>
                  <label className="text-xs font-bold text-slate-800 block mb-1">
                    Judul Teks Prosedur (Title / Goal)*
                  </label>
                  <input
                    type="text"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="e.g. How to Make Sweet Potato Fritters"
                    className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-300 focus:border-amber-500 outline-none"
                    required
                  />
                </div>

                {/* Category, Servings, Time */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-800 block mb-1">
                      Kategori
                    </label>
                    <input
                      type="text"
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value)}
                      placeholder="Food Recipe / Drink"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:border-amber-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-800 block mb-1">
                      Porsi (Servings)
                    </label>
                    <input
                      type="text"
                      value={formServings}
                      onChange={(e) => setFormServings(e.target.value)}
                      placeholder="4 porsi"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:border-amber-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-800 block mb-1">
                      Waktu (Cooking Time)
                    </label>
                    <input
                      type="text"
                      value={formTime}
                      onChange={(e) => setFormTime(e.target.value)}
                      placeholder="20 menit"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:border-amber-500 outline-none"
                    />
                  </div>
                </div>

                {/* Goal / Purpose */}
                <div>
                  <label className="text-xs font-bold text-slate-800 block mb-1">
                    Goal / Purpose (Tujuan)*
                  </label>
                  <textarea
                    rows={2}
                    value={formGoal}
                    onChange={(e) => setFormGoal(e.target.value)}
                    placeholder="To explain step-by-step how to make crispy sweet potato fritters..."
                    className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-300 focus:border-amber-500 outline-none"
                    required
                  />
                </div>

                {/* Ingredients & Tools */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-800 block mb-1">
                      Ingredients / Bahan (1 item per baris)*
                    </label>
                    <textarea
                      rows={5}
                      value={formIngredientsText}
                      onChange={(e) => setFormIngredientsText(e.target.value)}
                      placeholder="2 sweet potatoes&#10;1 cup of flour&#10;Cooking oil"
                      className="w-full p-2.5 text-xs font-mono rounded-xl border border-slate-300 focus:border-amber-500 outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-800 block mb-1">
                      Tools / Peralatan (1 item per baris)
                    </label>
                    <textarea
                      rows={5}
                      value={formToolsText}
                      onChange={(e) => setFormToolsText(e.target.value)}
                      placeholder="Frying pan&#10;Spatula&#10;Wire sieve"
                      className="w-full p-2.5 text-xs font-mono rounded-xl border border-slate-300 focus:border-amber-500 outline-none"
                    />
                  </div>
                </div>

                {/* Steps */}
                <div>
                  <label className="text-xs font-bold text-slate-800 block mb-1">
                    Steps / Langkah-Langkah (1 langkah per baris, gunakan sequence adverbs: First, Next, Then, Finally)*
                  </label>
                  <textarea
                    rows={5}
                    value={formStepsText}
                    onChange={(e) => setFormStepsText(e.target.value)}
                    placeholder="First, peel the sweet potatoes and wash them.&#10;Next, cut them into thin slices.&#10;Then, fry them in hot cooking oil until crispy.&#10;Finally, serve while warm."
                    className="w-full p-2.5 text-xs font-mono rounded-xl border border-slate-300 focus:border-amber-500 outline-none"
                    required
                  />
                </div>

                {/* Language Notes */}
                <div>
                  <label className="text-xs font-bold text-slate-800 block mb-1">
                    Catatan Kebahasaan (Action Verbs &amp; Sequence Words)
                  </label>
                  <input
                    type="text"
                    value={formLanguageNotes}
                    onChange={(e) => setFormLanguageNotes(e.target.value)}
                    placeholder="Action verbs: peel, wash, cut, fry, serve."
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:border-amber-500 outline-none"
                  />
                </div>

                {/* Audio Script */}
                <div>
                  <label className="text-xs font-bold text-slate-800 block mb-1">
                    Naskah Pembacaan Audio / TTS (Opsional - otomatis jika kosong)
                  </label>
                  <textarea
                    rows={2}
                    value={formAudioScript}
                    onChange={(e) => setFormAudioScript(e.target.value)}
                    placeholder="Teks pelafalan bahasa Inggris untuk latihan listening siswa..."
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:border-amber-500 outline-none"
                  />
                </div>

                {/* Form Buttons */}
                <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setIsRecipeModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm"
                  >
                    <Check className="w-4 h-4" />
                    <span>Simpan Teks Prosedur</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Confirmation Modal: Delete Recipe */}
      <AnimatePresence>
        {recipeToDelete && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4"
            >
              <div className="flex items-center gap-3 text-rose-600">
                <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center shrink-0">
                  <Trash2 className="w-5 h-5 text-rose-600" />
                </div>
                <div>
                  <h4 className="font-extrabold text-slate-900 text-sm">
                    Hapus Teks Prosedur?
                  </h4>
                  <p className="text-xs text-slate-500">
                    Tindakan ini tidak dapat dibatalkan.
                  </p>
                </div>
              </div>

              <p className="text-xs text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-200">
                Apakah Anda yakin ingin menghapus teks: <strong>"{recipeToDelete.title}"</strong> dari koleksi materi?
              </p>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRecipeToDelete(null)}
                  className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDeleteRecipe}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold"
                >
                  Hapus Teks
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Confirmation Modal: Reset to Default */}
      <AnimatePresence>
        {isResetModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4"
            >
              <div className="flex items-center gap-3 text-amber-600">
                <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                  <RotateCcw className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <h4 className="font-extrabold text-slate-900 text-sm">
                    Reset ke Materi Standar?
                  </h4>
                  <p className="text-xs text-slate-500">
                    Kembalikan modul Procedure Text ke buku English for Nusantara.
                  </p>
                </div>
              </div>

              <p className="text-xs text-slate-700 bg-amber-50 p-3 rounded-xl border border-amber-200">
                Seluruh definisi, struktur teks, dan resep bawaan (Ubi Goreng, Pisang Goreng Galang, Teh Manis, Nasi Goreng) akan dikembalikan ke versi standar.
              </p>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsResetModalOpen(false)}
                  className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={isResetting}
                  onClick={async () => {
                    setIsResetting(true);
                    try {
                      await onResetToDefault();
                      setIsResetModalOpen(false);
                      playUnlockSuccessSound();
                      showToast('Materi Procedure Text berhasil di-reset ke standar buku English for Nusantara.');
                    } catch (err) {
                      console.error(err);
                      showToast('Gagal melakukan reset.', 'error');
                    } finally {
                      setIsResetting(false);
                    }
                  }}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold"
                >
                  {isResetting ? 'Mereset...' : 'Ya, Reset ke Standar'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
