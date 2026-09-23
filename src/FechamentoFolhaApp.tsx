import React, { useState, useEffect } from 'react';
import { db } from './lib/firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import { Empresa } from './types';
import FechamentoFolhaTab from './components/FechamentoFolhaTab';
import RelatoriosChecklistTab from './components/RelatoriosChecklistTab';
import { FileSpreadsheet, FileText, Loader2, TableProperties } from 'lucide-react';
import { isCompanyInExcludedDprhList } from './data/excludedDprhCompanies';
import { isEmpresaAtivaNosModulos } from './utils/empresaUtils';

export default function FechamentoFolhaApp() {
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'controle' | 'relatorios'>('controle');

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'empresas'), (snapshot) => {
      const all = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Empresa));
      // Filtra estritamente empresas ativas pertencentes ao módulo DP & RH excluindo as da lista do usuário e empresas baixadas/transferidas
      const dprhEmpresas = all.filter(e => {
        if (!isEmpresaAtivaNosModulos(e)) return false;
        if (isCompanyInExcludedDprhList(e)) return false;
        return (
          !e.modulosResponsavel || 
          e.modulosResponsavel.length === 0 || 
          e.modulosResponsavel.includes('DP & RH')
        );
      });
      setEmpresas(dprhEmpresas);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
        <p className="text-sm font-medium">Carregando Fechamento de Folha...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 w-full bg-slate-950 min-h-screen text-slate-100 p-4 md:p-6 lg:p-8">
      {/* Header do Módulo Fechamento de Folha */}
      <div className="mb-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-400">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Fechamento de Folha</h1>
              <p className="text-sm text-slate-400">
                Acompanhamento mensal das etapas da folha de pagamento e relatório unificado de obrigações do DP & RH
              </p>
            </div>
          </div>
        </div>

        {/* Abas e Contador */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex space-x-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveTab('controle')}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-lg transition-all ${
                activeTab === 'controle'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <TableProperties className="w-4 h-4" />
              <span>Tabela de Fechamento</span>
            </button>
            <button
              onClick={() => setActiveTab('relatorios')}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-lg transition-all ${
                activeTab === 'relatorios'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Relatório de Obrigações</span>
            </button>
          </div>

          <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-3.5 py-2 rounded-xl text-xs font-medium text-slate-300">
            <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse"></span>
            <span>{empresas.length} empresas ativas</span>
          </div>
        </div>
      </div>

      {/* Conteúdo Dinâmico das Abas */}
      {activeTab === 'controle' ? (
        <div className="flex-1 bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 md:p-6 shadow-xl backdrop-blur-sm">
          <FechamentoFolhaTab empresas={empresas} />
        </div>
      ) : (
        <div className="flex-1">
          <RelatoriosChecklistTab empresas={empresas} />
        </div>
      )}
    </div>
  );
}
