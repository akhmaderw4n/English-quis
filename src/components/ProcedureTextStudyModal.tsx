import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BookOpen, 
  ChefHat, 
  Sparkles, 
  Volume2, 
  VolumeX, 
  Clock, 
  Users, 
  Utensils, 
  ListOrdered, 
  X, 
  ChevronRight,
  CheckCircle2
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

  const handleCloseModal = () => {
    stopSpeech();
    setIsPlayingAudio(false);
    setPlayingRecipeId(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2.5 sm:p-4 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-2xl sm:rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden my-auto"
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-amber-200 bg-gradient-to-r from-amber-500 to-orange-500 text-white flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-white shrink-0">
              <ChefHat className="w-5 h-5 text-amber-100" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/20 text-amber-100">
                  Modul Belajar Siswa
                </span>
                <span className="text-xs text-amber-100 hidden sm:inline">
                  Chapter 2: Culinary and Me
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-black text-white leading-tight">
                Materi Pembelajaran: Procedure Text
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={handleCloseModal}
            className="w-8 h-8 rounded-full bg-black/20 hover:bg-black/30 flex items-center justify-center text-white font-bold transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex items-center gap-2 px-4 sm:px-6 pt-3 pb-2 border-b border-slate-200 bg-amber-50/40 shrink-0">
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
            <span>1. Pengertian &amp; Struktur Teks</span>
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
            <Utensils className="w-4 h-4" />
            <span>2. Contoh Teks Resep ({config.texts?.length || 0})</span>
          </button>
        </div>

        {/* Tab 1: Theory */}
        {activeTab === 'theory' && (
          <div className="p-4 sm:p-6 overflow-y-auto space-y-5">
            {/* Definition */}
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 space-y-1.5">
              <span className="text-xs font-bold text-amber-900 uppercase tracking-wider block">
                Definisi (What is a Procedure Text?)
              </span>
              <p className="text-xs sm:text-sm font-semibold text-slate-800 leading-relaxed">
                {config.definition}
              </p>
              {config.socialFunction && (
                <p className="text-xs text-amber-800 pt-1 border-t border-amber-200/60 mt-2">
                  <strong>Tujuan Komunikatif (Social Function):</strong> {config.socialFunction}
                </p>
              )}
            </div>

            {/* Generic Structure */}
            <div>
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2.5">
                Struktur Generik (Generic Structure of Procedure Text)
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {config.genericStructure.map((struct, idx) => (
                  <div key={idx} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                    <span className="text-xs font-extrabold text-amber-900 block">
                      {struct.title}
                    </span>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {struct.desc}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Language Features */}
            <div>
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2.5">
                Ciri-Ciri Kebahasaan (Language Features)
              </h4>
              <div className="space-y-2">
                {config.languageFeatures.map((feat, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-white border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
                    <span className="font-bold text-slate-800">
                      &bull; {feat.name}
                    </span>
                    <span className="text-amber-800 font-medium bg-amber-50 px-2 py-0.5 rounded border border-amber-100">
                      {feat.example}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Recipes */}
        {activeTab === 'recipes' && (
          <div className="grid grid-cols-1 sm:grid-cols-12 h-full overflow-hidden">
            {/* Left Recipe List */}
            <div className="sm:col-span-4 p-3 border-r border-slate-200 overflow-y-auto space-y-2 bg-slate-50/50 max-h-[500px]">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider px-2 block mb-1">
                Daftar Resep &amp; Teks
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
                    <div className="text-xs line-clamp-1">
                      {recipe.title}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Right Recipe Content */}
            <div className="sm:col-span-8 p-4 sm:p-6 overflow-y-auto max-h-[500px] space-y-4">
              {selectedRecipe && (
                <>
                  <div className="flex items-start justify-between gap-2 pb-3 border-b border-slate-100">
                    <div>
                      <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block">
                        {selectedRecipe.category} &bull; {selectedRecipe.servings || 'Porsi'} &bull; {selectedRecipe.timeMinutes || 'Waktu'}
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

                  {/* Goal */}
                  <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200 text-xs">
                    <strong>Goal / Purpose:</strong> {selectedRecipe.goal}
                  </div>

                  {/* Ingredients */}
                  <div>
                    <h5 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-1.5">
                      Ingredients (Bahan):
                    </h5>
                    <ul className="text-xs space-y-1 text-slate-700 pl-4 list-disc">
                      {selectedRecipe.ingredients.map((ing, i) => (
                        <li key={i}>{ing}</li>
                      ))}
                    </ul>
                  </div>

                  {/* Tools */}
                  {selectedRecipe.tools?.length > 0 && (
                    <div>
                      <h5 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-1.5">
                        Tools / Utensils (Peralatan):
                      </h5>
                      <ul className="text-xs space-y-1 text-slate-700 pl-4 list-disc">
                        {selectedRecipe.tools.map((tool, i) => (
                          <li key={i}>{tool}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Steps */}
                  <div>
                    <h5 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-1.5">
                      Steps (Langkah-Langkah):
                    </h5>
                    <ol className="text-xs space-y-1.5 text-slate-700 pl-4 list-decimal">
                      {selectedRecipe.steps.map((st, i) => (
                        <li key={i} className="leading-relaxed">{st}</li>
                      ))}
                    </ol>
                  </div>

                  {/* Language Notes */}
                  {selectedRecipe.languageNotes && (
                    <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-200 text-xs text-indigo-900">
                      <strong>Language Notes:</strong> {selectedRecipe.languageNotes}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="p-3 sm:p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <span>English for Nusantara &bull; Kelas 7 SMP</span>
          <button
            type="button"
            onClick={handleCloseModal}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </motion.div>
    </div>
  );
};
