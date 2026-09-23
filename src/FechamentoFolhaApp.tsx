import React, { useState, useEffect } from 'react';
import { db } from './lib/firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import { Empresa } from './types';
import FechamentoFolhaTab from './components/FechamentoFolhaTab';
import { FileSpreadsheet, Loader2 } from 'lucide-react';
import { isCompanyInExcludedDprhList } from './data/excludedDprhCompanies';

export default function FechamentoFolhaApp() {
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'empresas'), (snapshot) => {
      const all = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Empresa));
      // Filtra estritamente empresas ativas pertencentes ao módulo DP & RH excluindo as da lista do usuário
      const dprhEmpresas = all.filter(e => {
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
      {/* Header do Módulo Autônomo */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Fechamento de Folha</h1>
              <p className="text-sm text-slate-400">
                Acompanhamento mensal das etapas da folha de pagamento das empresas do DP & RH
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 self-start md:self-auto bg-slate-900 border border-slate-800 px-3.5 py-1.5 rounded-lg text-xs font-medium text-slate-300">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>{empresas.length} empresas ativas vinculadas</span>
        </div>
      </div>

      {/* Tabela e Operações do Fechamento */}
      <div className="flex-1 bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 md:p-6 shadow-xl backdrop-blur-sm">
        <FechamentoFolhaTab empresas={empresas} />
      </div>
    </div>
  );
}
