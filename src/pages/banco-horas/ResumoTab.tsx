import React, { useState, useEffect } from 'react';
import { useFirestore } from '../../hooks/useFirestore';
import { Colaborador, BancoHorasLancamento } from '../../types';
import { minutesToTime } from '../../utils/timeFormat';
import { collection, query, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Loader2, Printer, AlertTriangle } from 'lucide-react';
import LayoutPrintBancoHoras from './LayoutPrintBancoHoras';

export default function ResumoTab() {
  const [mesAno, setMesAno] = useState(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  });

  const { data: colaboradores, loading: loadingColabs } = useFirestore<Colaborador>('colaboradores');
  
  // Store all lancamentos
  const [allLancamentos, setAllLancamentos] = useState<BancoHorasLancamento[]>([]);
  const [loadingLancamentos, setLoadingLancamentos] = useState(false);
  const [printWarning, setPrintWarning] = useState(false);

  useEffect(() => {
    const fetchLancamentos = async () => {
      setLoadingLancamentos(true);
      try {
        const q = query(collection(db, 'banco_horas_lancamentos'));
        const snap = await getDocs(q);
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as BancoHorasLancamento));
        setAllLancamentos(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingLancamentos(false);
      }
    };
    fetchLancamentos();
  }, []);

  const handlePrint = () => {
    if (window.self !== window.top) {
      setPrintWarning(true);
      setTimeout(() => setPrintWarning(false), 8000);
    }
    setTimeout(() => {
      window.print();
    }, 100);
  };

  const getColabStats = (colabId: string) => {
    const colabRecords = allLancamentos.filter(l => l.colaboradorId === colabId);
    
    let totalPositivos = 0;
    let totalNegativos = 0;
    
    let mesPositivos = 0;
    let mesNegativos = 0;

    colabRecords.forEach(l => {
      totalPositivos += (l.minutosPositivos || 0);
      totalNegativos += (l.minutosNegativos || 0);
      
      if (l.mesAno === mesAno) {
        mesPositivos += (l.minutosPositivos || 0);
        mesNegativos += (l.minutosNegativos || 0);
      }
    });

    return {
      mesPositivos,
      mesNegativos,
      saldoMes: mesPositivos - mesNegativos,
      saldoTotal: totalPositivos - totalNegativos
    };
  };

  if (loadingColabs) return <div className="text-slate-400 p-8 text-center">Carregando...</div>;

  return (
    <div className="space-y-6">
      {printWarning && (
        <div className="bg-amber-500/10 border border-amber-500/50 p-4 rounded-xl flex items-start gap-3 print:hidden animate-in fade-in slide-in-from-top-2">
          <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-amber-500 font-bold text-sm">Aviso de Impressão (Modo Preview)</h4>
            <p className="text-amber-400/90 text-sm mt-1">
              Parece que você está acessando pelo modo Preview onde a impressão pode ser bloqueada pelo navegador. 
              Para imprimir, abra o sistema em uma <strong>nova guia</strong> clicando no ícone de nova janela no canto superior direito do Preview.
            </p>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-700/50 p-4 rounded-xl print:hidden">
        <div className="flex items-center gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Mês/Ano</label>
            <input
              type="month"
              value={mesAno}
              onChange={e => setMesAno(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-slate-200 rounded-lg px-4 py-2 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>
          {loadingLancamentos && <Loader2 className="w-5 h-5 text-indigo-500 animate-spin mt-4" />}
        </div>
        
        <button
          onClick={handlePrint}
          className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2.5 rounded-lg font-medium flex items-center gap-2 transition-colors whitespace-nowrap"
        >
          <Printer className="w-4 h-4" />
          Imprimir Resumo (PDF)
        </button>
      </div>

      <div className="bg-slate-900 border border-slate-700/50 rounded-xl overflow-hidden print:hidden">
        <table className="w-full text-left text-sm text-slate-300">
          <thead className="bg-slate-800/50 text-slate-400 font-medium">
            <tr>
              <th className="px-6 py-4">Colaborador</th>
              <th className="px-6 py-4 text-center">Crédito Mês (+)</th>
              <th className="px-6 py-4 text-center">Débito Mês (-)</th>
              <th className="px-6 py-4 text-center">Saldo do Mês</th>
              <th className="px-6 py-4 text-center border-l border-slate-700/50">Saldo Acumulado Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            {colaboradores.map(colab => {
              const stats = getColabStats(colab.id!);
              
              // Hide inactive users who have absolutely zero records ever
              if (colab.ativo === false && stats.mesPositivos === 0 && stats.mesNegativos === 0 && stats.saldoTotal === 0) {
                return null;
              }
              
              return (
                <tr key={colab.id} className="hover:bg-slate-800/20 transition-colors">
                  <td className="px-6 py-4 font-medium text-slate-200">{colab.nome}</td>
                  <td className="px-6 py-4 text-center text-emerald-400">{minutesToTime(stats.mesPositivos)}</td>
                  <td className="px-6 py-4 text-center text-red-400">{minutesToTime(stats.mesNegativos)}</td>
                  <td className="px-6 py-4 text-center">
                    <span className={`px-3 py-1.5 rounded-lg font-bold ${stats.saldoMes > 0 ? 'bg-emerald-500/10 text-emerald-400' : stats.saldoMes < 0 ? 'bg-red-500/10 text-red-400' : 'bg-slate-800 text-slate-400'}`}>
                      {minutesToTime(stats.saldoMes)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center border-l border-slate-700/50">
                    <span className={`px-3 py-1.5 rounded-lg font-bold ${stats.saldoTotal > 0 ? 'bg-emerald-500/10 text-emerald-400' : stats.saldoTotal < 0 ? 'bg-red-500/10 text-red-400' : 'text-slate-400'}`}>
                      {minutesToTime(stats.saldoTotal)}
                    </span>
                  </td>
                </tr>
              );
            })}
            {colaboradores.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                  Nenhum registro encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <LayoutPrintBancoHoras 
        mesAno={mesAno} 
        colaboradores={colaboradores} 
        allLancamentos={allLancamentos} 
      />
    </div>
  );
}
