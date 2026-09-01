import React, { useState } from 'react';
import ColaboradoresTab from './ColaboradoresTab';
import LancamentosTab from './LancamentosTab';
import ResumoTab from './ResumoTab';
import { Clock, Users, FileText, LayoutList } from 'lucide-react';

export default function BancoDeHorasApp() {
  const [activeTab, setActiveTab] = useState<'lancamentos' | 'colaboradores' | 'resumo'>('lancamentos');

  return (
    <div className="w-full flex flex-col bg-slate-950 text-slate-200 print:bg-white print:text-black">
      <div className="p-6 md:p-8 flex-1 print:p-0 print:m-0">
        <div className="print:hidden">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-3 bg-indigo-500/10 rounded-xl">
              <Clock className="w-6 h-6 text-indigo-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Banco de Horas</h1>
              <p className="text-sm text-slate-400 mt-1">Gerencie horas extras e faltas dos colaboradores</p>
            </div>
          </div>

          <div className="flex space-x-1 bg-slate-900 p-1 rounded-xl mb-8 border border-slate-800 w-full max-w-md">
            <button
              onClick={() => setActiveTab('lancamentos')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                activeTab === 'lancamentos'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <LayoutList className="w-4 h-4" />
              Lançamentos
            </button>
            <button
              onClick={() => setActiveTab('colaboradores')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                activeTab === 'colaboradores'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <Users className="w-4 h-4" />
              Colaboradores
            </button>
            <button
              onClick={() => setActiveTab('resumo')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                activeTab === 'resumo'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <FileText className="w-4 h-4" />
              Resumo
            </button>
          </div>
        </div>

        <div>
          {activeTab === 'lancamentos' && <LancamentosTab />}
          {activeTab === 'colaboradores' && <ColaboradoresTab />}
          {activeTab === 'resumo' && <ResumoTab />}
        </div>
      </div>
    </div>
  );
}
