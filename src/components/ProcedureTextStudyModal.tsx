import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  BookOpen, 
  GraduationCap, 
  Volume2, 
  Users, 
  ListOrdered, 
  X, 
  CheckCircle2,
  Sparkles,
  MessageSquare,
  UserCheck,
  Smartphone
} from 'lucide-react';
import { ProcedureTextConfig, ProcedureTextRecipe } from '../types';
import { speakEnglish, stopSpeech, playClickSound } from '../utils/audio';

interface ProcedureTextStudyModalProps {
  config: ProcedureTextConfig;
  isOpen: boolean;
  onClose: () => void;
}

export const ProcedureTextStudyModal: React.FC<ProcedureTextStudyModalProps> = ({
  config,
  isOpen,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'theory' | 'recipes'>('theory');
  const [selectedRecipeId, setSelectedRecipeId] = useState<string>(() => {
    return config.texts?.[0]?.id || '';
  });
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [playingRecipeId, setPlayingRecipeId] = useState<string | null>(null);
  const [isScreenshotBlocked, setIsScreenshotBlocked] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const handleTouch = (e: TouchEvent) => {
      if (e.touches && e.touches.length >= 2) {
        if (e.cancelable) e.preventDefault();
        setIsScreenshotBlocked(true);
      }
    };
    const handleContext = (e: Event) => e.preventDefault();
    window.addEventListener('touchstart', handleTouch, { capture: true, passive: false });
    window.addEventListener('touchmove', handleTouch, { capture: true, passive: false });
    document.addEventListener('contextmenu', handleContext);
    return () => {
      window.removeEventListener('touchstart', handleTouch, { capture: true });
      window.removeEventListener('touchmove', handleTouch, { capture: true });
      document.removeEventListener('contextmenu', handleContext);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const selectedRecipe = (config.texts || []).find(r => r.id === selectedRecipeId) || (config.texts || [])[0];

  const handlePlayAudio = (recipe: ProcedureTextRecipe) => {
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

    const script = recipe.audioScript || `${recipe.title}. ${recipe.steps.join(' ')}`;
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

  const handleCloseModal = () => {
    stopSpeech();
    setIsPlayingAudio(false);
    setPlayingRecipeId(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2.5 sm:p-4 overflow-y-auto anti-screenshot-zone">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-2xl sm:rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden my-auto relative"
      >
        {isScreenshotBlocked && (
          <div className="absolute inset-0 z-50 bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center space-y-3">
            <Smartphone className="w-10 h-10 text-rose-400 animate-pulse" />
            <h4 className="text-base font-black">SCREENSHOT MODUL AJAR DIBLOKIR DI HP SISWA</h4>
            <p className="text-xs text-slate-300 max-w-sm">
              Modul materi hanya diizinkan dibaca langsung dengan 1 jari dan tidak dapat di-screenshot.
            </p>
            <button
              type="button"
              onClick={() => setIsScreenshotBlocked(false)}
              className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold cursor-pointer"
            >
              Lanjutkan Membaca (Gunakan 1 Jari)
            </button>
          </div>
        )}
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-amber-200 bg-gradient-to-r from-amber-500 to-orange-500 text-white flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-white shrink-0">
              <GraduationCap className="w-5 h-5 text-amber-100" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/20 text-amber-100">
                  Modul Belajar Siswa
                </span>
                <span className="text-xs text-amber-100 font-semibold">
                  Chapter 1: Introducing my self and other
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-black text-white leading-tight mt-0.5">
                Materi Pembelajaran: Introducing my self and other
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={handleCloseModal}
            className="w-8 h-8 rounded-full bg-black/20 hover:bg-black/30 flex items-center justify-center text-white font-bold transition-colors cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex items-center justify-between gap-2 px-4 sm:px-6 pt-3 pb-2 border-b border-slate-200 bg-amber-50/40 shrink-0 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => {
                playClickSound();
                setActiveTab('theory');
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeTab === 'theory'
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>1. Poin-Poin Materi &amp; Unsur Kebahasaan</span>
            </button>

            <button
              type="button"
              onClick={() => {
                playClickSound();
                setActiveTab('recipes');
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeTab === 'recipes'
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              <span>2. Detail Tiap Poin &amp; Contoh Teks ({config.texts?.length || 0})</span>
            </button>
          </div>

          <span className="text-[11px] font-bold text-rose-700 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200">
            Batas Akses: 1 User 1 Kali Lihat
          </span>
        </div>

        {/* Tab 1: Theory & Complete Material Points */}
        {activeTab === 'theory' && (
          <div className="p-4 sm:p-6 overflow-y-auto space-y-5">
            {/* Definition & Social Function */}
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 space-y-1.5">
              <h4 className="font-extrabold text-sm text-amber-950 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Apa itu Descriptive text</span>
              </h4>
              <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider block">
                Pengertian Materi (Introducing Myself, Others &amp; Descriptive Text)
              </span>
              <p className="text-xs sm:text-sm font-semibold text-slate-800 leading-relaxed">
                {config.definition}
              </p>
              {config.socialFunction && (
                <p className="text-xs text-amber-800 pt-1.5 border-t border-amber-200/60 mt-2 leading-relaxed">
                  <strong>Tujuan Komunikatif (Social Function):</strong> {config.socialFunction}
                </p>
              )}
            </div>

            {/* Generic Structure / Main Points of Introducing Myself & Others */}
            <div>
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-600" />
                <span>Poin-Poin Utama Materi &quot;Introducing My Self and Other&quot;</span>
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {config.genericStructure.map((struct, idx) => (
                  <div key={idx} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                    <span className="text-xs font-extrabold text-amber-900 block">
                      {struct.title}
                    </span>
                    <p className="text-xs text-slate-700 leading-relaxed">
                      {struct.desc}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Complete Point-by-Point Expressions Reference Table */}
            <div>
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                <UserCheck className="w-4 h-4 text-emerald-600" />
                <span>Tabel Ungkapan Lengkap Tiap Poin (Expressions &amp; Responses)</span>
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Point A: Introducing Myself */}
                <div className="p-3.5 rounded-xl bg-white border border-amber-200 shadow-2xs space-y-2">
                  <div className="text-xs font-extrabold text-amber-900 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200 inline-block">
                    A. Poin Introducing Myself (Memperkenalkan Diri)
                  </div>
                  <ul className="text-xs text-slate-700 space-y-1.5 pl-1">
                    <li>&bull; <strong>Greeting &amp; Opening:</strong> <em>&quot;Hello! Let me introduce myself.&quot;</em></li>
                    <li>&bull; <strong>Name &amp; Nickname:</strong> <em>&quot;My name is Galang. You can call me Galang.&quot;</em></li>
                    <li>&bull; <strong>Origin (Asal):</strong> <em>&quot;I am from Kalimantan / I come from Medan.&quot;</em></li>
                    <li>&bull; <strong>Address (Alamat):</strong> <em>&quot;I live on Jalan Sumatera / at Jl. Merdeka No. 10.&quot;</em></li>
                    <li>&bull; <strong>Age &amp; School:</strong> <em>&quot;I am 13 years old. I am a student at SMP Merdeka.&quot;</em></li>
                    <li>&bull; <strong>Hobby &amp; Favorite:</strong> <em>&quot;My hobby is fishing. My favorite food is fried rice.&quot;</em></li>
                    <li>&bull; <strong>Family/Siblings:</strong> <em>&quot;I have one older sister and two brothers.&quot;</em></li>
                  </ul>
                </div>

                {/* Point B: Introducing Others */}
                <div className="p-3.5 rounded-xl bg-white border border-blue-200 shadow-2xs space-y-2">
                  <div className="text-xs font-extrabold text-blue-900 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200 inline-block">
                    B. Poin Introducing Others (Memperkenalkan Orang Lain)
                  </div>
                  <ul className="text-xs text-slate-700 space-y-1.5 pl-1">
                    <li>&bull; <strong>Opening:</strong> <em>&quot;Hi Monita, this is my friend, Andre.&quot;</em></li>
                    <li>&bull; <strong>Polite Form:</strong> <em>&quot;Let me introduce my classmate. Her name is Sinta.&quot;</em></li>
                    <li>&bull; <strong>Origin &amp; Address:</strong> <em>&quot;He is from Pontianak. He lives on Jalan Teratai.&quot;</em></li>
                    <li>&bull; <strong>Age &amp; Hobby:</strong> <em>&quot;She is 13 years old. She likes playing badminton.&quot;</em></li>
                    <li>&bull; <strong>Greeting Response:</strong> <em>&quot;Nice to meet you!&quot; &rarr; &quot;Nice to meet you too.&quot;</em></li>
                    <li>&bull; <strong>Asking Identity:</strong> <em>&quot;Where are you from?&quot; / &quot;What is your hobby?&quot;</em></li>
                    <li>&bull; <strong>Parting (Pamit):</strong> <em>&quot;See you later!&quot; &rarr; &quot;See you! Bye.&quot;</em></li>
                  </ul>
                </div>

                {/* Point C: Descriptive Text Structure */}
                <div className="p-3.5 rounded-xl bg-white border border-emerald-200 shadow-2xs space-y-2 md:col-span-2">
                  <div className="text-xs font-extrabold text-emerald-900 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 inline-block">
                    C. Poin Materi Descriptive Text (Mendeskripsikan Ciri Fisik &amp; Sifat Seseorang)
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs text-slate-700 pt-1">
                    <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                      <strong className="text-slate-900 block mb-1">1. Generic Structure:</strong>
                      <p>&bull; <strong>Identification:</strong> Memperkenalkan nama &amp; identitas orang yang dideskripsikan.</p>
                      <p className="mt-1">&bull; <strong>Description:</strong> Merinci ciri fisik, sifat, dan kebiasaan uniknya.</p>
                    </div>
                    <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                      <strong className="text-slate-900 block mb-1">2. Physical Appearance (Fisik):</strong>
                      <p>&bull; <strong>Body:</strong> <em>tall, short, slim, well-built</em></p>
                      <p>&bull; <strong>Hair:</strong> <em>straight, wavy, curly, short, long</em></p>
                      <p>&bull; <strong>Features:</strong> <em>wears glasses, wears a hijab, uses crutches</em></p>
                    </div>
                    <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                      <strong className="text-slate-900 block mb-1">3. Personality Traits (Sifat):</strong>
                      <p>&bull; <strong>Positive:</strong> <em>friendly (ramah), kind (baik), cheerful (ceria), polite (sopan), diligent (rajin), helpful, independent</em></p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Language Features */}
            <div>
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2.5">
                Unsur Kebahasaan &amp; Tata Bahasa (Language Features)
              </h4>
              <div className="space-y-2">
                {config.languageFeatures.map((feat, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-white border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 text-xs">
                    <span className="font-bold text-slate-800">
                      &bull; {feat.name}
                    </span>
                    <span className="text-amber-900 font-semibold bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
                      {feat.example}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Detailed Points & Example Texts */}
        {activeTab === 'recipes' && (
          <div className="grid grid-cols-1 sm:grid-cols-12 h-full overflow-hidden">
            {/* Left Topic List */}
            <div className="sm:col-span-4 p-3 border-r border-slate-200 overflow-y-auto space-y-2 bg-slate-50/50 max-h-[520px]">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider px-2 block mb-1">
                Pilih Poin Materi &amp; Contoh Teks
              </span>
              {config.texts?.map((recipe) => {
                const isSelected = recipe.id === selectedRecipe?.id;
                return (
                  <div
                    key={recipe.id}
                    onClick={() => {
                      playClickSound();
                      setSelectedRecipeId(recipe.id);
                    }}
                    className={`p-3 rounded-xl text-left border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-amber-500 text-white font-bold border-amber-600 shadow-xs'
                        : 'bg-white text-slate-800 hover:bg-amber-50 border-slate-200'
                    }`}
                  >
                    <div className="text-[10px] uppercase font-bold opacity-80 mb-0.5">
                      {recipe.category}
                    </div>
                    <div className="text-xs line-clamp-2 leading-snug">
                      {recipe.title}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Right Topic Content */}
            <div className="sm:col-span-8 p-4 sm:p-6 overflow-y-auto max-h-[520px] space-y-4">
              {selectedRecipe && (
                <>
                  <div className="flex items-start justify-between gap-2 pb-3 border-b border-slate-100">
                    <div>
                      <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block">
                        {selectedRecipe.category} &bull; {selectedRecipe.servings || 'Chapter 1'} &bull; {selectedRecipe.timeMinutes || '5 menit'}
                      </span>
                      <h4 className="text-base sm:text-lg font-black text-slate-900">
                        {selectedRecipe.title}
                      </h4>
                    </div>

                    <button
                      type="button"
                      onClick={() => handlePlayAudio(selectedRecipe)}
                      className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 ${
                        isPlayingAudio && playingRecipeId === selectedRecipe.id
                          ? 'bg-amber-500 text-white animate-pulse'
                          : 'bg-amber-100 hover:bg-amber-200 text-amber-900'
                      }`}
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                      <span>{isPlayingAudio && playingRecipeId === selectedRecipe.id ? 'Stop Audio' : 'Dengarkan Audio'}</span>
                    </button>
                  </div>

                  {/* Goal / Learning Objective */}
                  <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200 text-xs leading-relaxed">
                    <strong>Tujuan Pembelajaran (Learning Focus):</strong> {selectedRecipe.goal}
                  </div>

                  {/* Key Expressions / Vocabulary Points */}
                  <div>
                    <h5 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-amber-600" />
                      <span>Poin Ungkapan Kunci &amp; Kosakata (Key Expressions &amp; Vocabulary):</span>
                    </h5>
                    <ul className="text-xs space-y-1.5 text-slate-700 pl-4 list-disc">
                      {selectedRecipe.ingredients.map((ing, i) => (
                        <li key={i} className="leading-relaxed">{ing}</li>
                      ))}
                    </ul>
                  </div>

                  {/* Grammar & Structure Focus */}
                  {selectedRecipe.tools?.length > 0 && (
                    <div>
                      <h5 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-blue-600" />
                        <span>Poin Tata Bahasa &amp; Kaidah Kalimat (Grammar Focus):</span>
                      </h5>
                      <ul className="text-xs space-y-1.5 text-slate-700 pl-4 list-disc">
                        {selectedRecipe.tools.map((tool, i) => (
                          <li key={i} className="leading-relaxed">{tool}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Full Example Text / Dialogue */}
                  <div>
                    <h5 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                      <ListOrdered className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Contoh Teks / Dialog Lengkap:</span>
                    </h5>
                    <ol className="text-xs space-y-2 text-slate-800 pl-4 list-decimal bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                      {selectedRecipe.steps.map((st, i) => (
                        <li key={i} className="leading-relaxed font-medium">{st}</li>
                      ))}
                    </ol>
                  </div>

                  {/* Language Notes */}
                  {selectedRecipe.languageNotes && (
                    <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-200 text-xs text-indigo-900 leading-relaxed">
                      <strong>Catatan Penting (Language Notes):</strong> {selectedRecipe.languageNotes}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="p-3 sm:p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <span>Chapter 1: Introducing my self and other &bull; English for Nusantara Kelas 7 SMP</span>
          <button
            type="button"
            onClick={handleCloseModal}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold cursor-pointer"
          >
            Tutup Modul
          </button>
        </div>
      </motion.div>
    </div>
  );
};
