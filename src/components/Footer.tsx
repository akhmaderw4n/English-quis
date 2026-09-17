import React from 'react';
import { Heart, BookOpen, GraduationCap } from 'lucide-react';
import { QUIZ_METADATA } from '../data/quizData';

export const Footer: React.FC = () => {
  return (
    <footer className="mt-auto border-t border-amber-200/80 bg-white/70 backdrop-blur-sm py-6 text-slate-600">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
        {/* Branding Requirement */}
        <div className="flex flex-col sm:flex-row items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-900 font-bold text-xs sm:text-sm border border-amber-300 shadow-2xs">
            <GraduationCap className="w-4 h-4 text-amber-700" />
            {QUIZ_METADATA.branding}
          </span>
          <span className="text-xs text-slate-500">
            Guru Bahasa Inggris SMP
          </span>
        </div>

        {/* Curriculum Reference */}
        <div className="flex flex-col items-center sm:items-end text-xs text-slate-500 space-y-1">
          <div className="flex items-center gap-1.5 font-medium text-slate-700">
            <BookOpen className="w-3.5 h-3.5 text-amber-600" />
            <span>{QUIZ_METADATA.textbook}</span>
          </div>
          <div>
            <span>Chapter 2: Culinary and Me &bull; Topik: Procedure Text (Fase D)</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
