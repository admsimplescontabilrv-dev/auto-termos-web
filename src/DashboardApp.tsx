import React, { useState } from 'react';
import { ChevronDown, CalendarDays, Building2, CheckSquare, KanbanSquare, FileText, Receipt, FileStack, Briefcase, ShieldCheck, FileSpreadsheet, Clock } from 'lucide-react';
import ChatApp from './ChatApp';

export default function DashboardApp() {
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  const handleNav = (mod: string) => {
    window.dispatchEvent(new CustomEvent('navigate-module', { detail: mod }));
    setOpenDropdown(null);
  };

  return (
    <div className="flex-1 w-full max-w-7xl mx-auto p-4 md:p-8 flex flex-col gap-6 lg:h-[calc(100vh-4rem)] animate-in fade-in zoom-in-95 duration-200">
      
      {/* Barra de Módulos (Header) */}
      <div className="bg-slate-900 border border-slate-700/50 rounded-2xl shadow-lg p-4 flex flex-wrap gap-4 items-center relative z-20">
        <h2 className="text-white font-bold tracking-widest text-sm mr-4">MÓDULOS:</h2>
        
        {/* Dropdown DP & RH */}
        <div className="relative group">
          <button 
            onClick={() => setOpenDropdown(openDropdown === 'dprh' ? null : 'dprh')}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600/20 text-indigo-400 rounded-lg hover:bg-indigo-600/30 transition-colors font-bold text-sm cursor-pointer"
          >
            DP & RH
            <ChevronDown className="w-4 h-4" />
          </button>
          
          {openDropdown === 'dprh' && (
            <div className="absolute top-full left-0 mt-2 w-64 bg-slate-800 border border-slate-600 rounded-xl shadow-2xl overflow-hidden py-2 z-50">
              <button onClick={() => handleNav('kanban')} className="w-full text-left px-4 py-2 text-sm text-slate-300 hover:bg-slate-700 hover:text-white flex items-center gap-2 cursor-pointer"><KanbanSquare className="w-4 h-4"/> Kanban de Demandas</button>
              <button onClick={() => handleNav('checklists')} className="w-full text-left px-4 py-2 text-sm text-slate-300 hover:bg-slate-700 hover:text-white flex items-center gap-2 cursor-pointer"><CheckSquare className="w-4 h-4"/> Programação e Processos</button>
              <button onClick={() => handleNav('calendario')} className="w-full text-left px-4 py-2 text-sm text-slate-300 hover:bg-slate-700 hover:text-white flex items-center gap-2 cursor-pointer"><CalendarDays className="w-4 h-4"/> Calendário</button>
              <button onClick={() => handleNav('fechamento')} className="w-full text-left px-4 py-2 text-sm text-slate-300 hover:bg-slate-700 hover:text-white flex items-center gap-2 cursor-pointer font-semibold text-emerald-400"><FileSpreadsheet className="w-4 h-4 text-emerald-400"/> Fechamento de Folha</button>
              <button onClick={() => handleNav('autotermos')} className="w-full text-left px-4 py-2 text-sm text-slate-300 hover:bg-slate-700 hover:text-white flex items-center gap-2 cursor-pointer"><FileText className="w-4 h-4"/> Termos</button>
              <button onClick={() => handleNav('recibos')} className="w-full text-left px-4 py-2 text-sm text-slate-300 hover:bg-slate-700 hover:text-white flex items-center gap-2 cursor-pointer"><Receipt className="w-4 h-4"/> Recibos</button>
              <button onClick={() => handleNav('banco-horas')} className="w-full text-left px-4 py-2 text-sm text-slate-300 hover:bg-slate-700 hover:text-white flex items-center gap-2 cursor-pointer"><Clock className="w-4 h-4"/> Banco de Horas</button>
              <button onClick={() => handleNav('boletos')} className="w-full text-left px-4 py-2 text-sm text-slate-300 hover:bg-slate-700 hover:text-white flex items-center gap-2 cursor-pointer"><FileStack className="w-4 h-4"/> Boletos</button>
              <button onClick={() => handleNav('trct')} className="w-full text-left px-4 py-2 text-sm text-slate-300 hover:bg-slate-700 hover:text-white flex items-center gap-2 cursor-pointer"><Briefcase className="w-4 h-4"/> TRCT</button>
              <button onClick={() => handleNav('sindicatos')} className="w-full text-left px-4 py-2 text-sm text-slate-300 hover:bg-slate-700 hover:text-white flex items-center gap-2 cursor-pointer"><Building2 className="w-4 h-4"/> Cadastro de Sindicatos</button>
            </div>
          )}
        </div>

        {/* Dropdown GERAL */}
        <div className="relative group">
          <button 
            onClick={() => setOpenDropdown(openDropdown === 'geral' ? null : 'geral')}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600/20 text-emerald-400 rounded-lg hover:bg-emerald-600/30 transition-colors font-bold text-sm cursor-pointer"
          >
            GERAL
            <ChevronDown className="w-4 h-4" />
          </button>
          
          {openDropdown === 'geral' && (
            <div className="absolute top-full left-0 mt-2 w-64 bg-slate-800 border border-slate-600 rounded-xl shadow-2xl overflow-hidden py-2 z-50">
              <button onClick={() => handleNav('empresas')} className="w-full text-left px-4 py-2 text-sm text-slate-300 hover:bg-slate-700 hover:text-white flex items-center gap-2 cursor-pointer"><Building2 className="w-4 h-4"/> Cadastro de Empresas</button>
            </div>
          )}
        </div>

        {/* Dropdown LEGALIZAÇÃO */}
        <div className="relative group">
          <button 
            onClick={() => setOpenDropdown(openDropdown === 'legalizacao' ? null : 'legalizacao')}
            className="flex items-center gap-2 px-4 py-2 bg-amber-600/20 text-amber-400 rounded-lg hover:bg-amber-600/30 transition-colors font-bold text-sm cursor-pointer"
          >
            LEGALIZAÇÃO
            <ChevronDown className="w-4 h-4" />
          </button>
          
          {openDropdown === 'legalizacao' && (
            <div className="absolute top-full left-0 mt-2 w-64 bg-slate-800 border border-slate-600 rounded-xl shadow-2xl overflow-hidden py-2 z-50">
              <button onClick={() => handleNav('kanban-legalizacao')} className="w-full text-left px-4 py-2 text-sm text-slate-300 hover:bg-slate-700 hover:text-white flex items-center gap-2 cursor-pointer"><KanbanSquare className="w-4 h-4"/> Kanban de Legalização</button>
              <button onClick={() => handleNav('alvaras')} className="w-full text-left px-4 py-2 text-sm text-slate-300 hover:bg-slate-700 hover:text-white flex items-center gap-2 cursor-pointer"><ShieldCheck className="w-4 h-4"/> Controle de Alvarás</button>
            </div>
          )}
        </div>
      </div>

      {/* Assistente IA Ocupando Todo o Resto */}
      <div className="flex-1 bg-slate-900 border border-slate-700/50 rounded-2xl shadow-2xl flex flex-col relative overflow-hidden min-h-[500px]">
        {/* Background Decoration */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-64 h-64 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex flex-col flex-1 min-h-0 p-4 md:p-8 z-10">
          <ChatApp />
        </div>
      </div>
    </div>
  );
}
