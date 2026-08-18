import React, { useState, useEffect } from 'react';
import { useFirestore } from '../../hooks/useFirestore';
import { Colaborador, BancoHorasLancamento } from '../../types';
import { timeToMinutes, minutesToTime } from '../../utils/timeFormat';
import { collection, query, where, getDocs, updateDoc, doc, addDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Loader2 } from 'lucide-react';

export default function LancamentosTab() {
  const [mesAno, setMesAno] = useState(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  });

  const { data: colaboradores, loading: loadingColabs } = useFirestore<Colaborador>('colaboradores');
  const [lancamentos, setLancamentos] = useState<Record<string, BancoHorasLancamento>>({});
  const [loadingLancamentos, setLoadingLancamentos] = useState(false);
  const [savingStatus, setSavingStatus] = useState<Record<string, 'saving' | 'saved' | 'error'>>({});

  useEffect(() => {
    const fetchLancamentos = async () => {
      if (!mesAno) return;
      setLoadingLancamentos(true);
      try {
        const q = query(
          collection(db, 'banco_horas_lancamentos'),
          where('mesAno', '==', mesAno)
        );
        const snap = await getDocs(q);
        const lMap: Record<string, BancoHorasLancamento> = {};
        snap.docs.forEach(d => {
          const data = d.data() as BancoHorasLancamento;
          lMap[data.colaboradorId] = { id: d.id, ...data };
        });
        setLancamentos(lMap);
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingLancamentos(false);
      }
    };
    fetchLancamentos();
  }, [mesAno]);

  const handleBlur = async (colaboradorId: string, field: keyof BancoHorasLancamento, value: any) => {
    const current = lancamentos[colaboradorId];
    
    // Check if value actually changed
    if (current && current[field] === value) return;
    if (!current && (value === 0 || value === '')) return; // No need to save empty new records

    setSavingStatus(prev => ({ ...prev, [colaboradorId]: 'saving' }));

    try {
      if (current && current.id) {
        await updateDoc(doc(db, 'banco_horas_lancamentos', current.id), { [field]: value });
        setLancamentos(prev => ({
          ...prev,
          [colaboradorId]: { ...current, [field]: value }
        }));
      } else {
        const newRecord: Omit<BancoHorasLancamento, 'id'> = {
          colaboradorId,
          mesAno,
          minutosPositivos: field === 'minutosPositivos' ? value : 0,
          minutosNegativos: field === 'minutosNegativos' ? value : 0,
          observacoes: field === 'observacoes' ? value : ''
        };
        const docRef = await addDoc(collection(db, 'banco_horas_lancamentos'), newRecord);
        setLancamentos(prev => ({
          ...prev,
          [colaboradorId]: { id: docRef.id, ...newRecord }
        }));
      }
      setSavingStatus(prev => ({ ...prev, [colaboradorId]: 'saved' }));
      setTimeout(() => {
        setSavingStatus(prev => ({ ...prev, [colaboradorId]: undefined as any })); // Clear status
      }, 2000);
    } catch (err) {
      console.error(err);
      setSavingStatus(prev => ({ ...prev, [colaboradorId]: 'error' }));
    }
  };

  const getSaldo = (colabId: string) => {
    const l = lancamentos[colabId];
    if (!l) return 0;
    return (l.minutosPositivos || 0) - (l.minutosNegativos || 0);
  };

  const ativos = colaboradores.filter(c => c.ativo);

  if (loadingColabs) return <div className="text-slate-400 p-8 text-center">Carregando...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 bg-slate-900 border border-slate-700/50 p-4 rounded-xl">
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

      <div className="bg-slate-900 border border-slate-700/50 rounded-xl overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-300 min-w-[800px]">
          <thead className="bg-slate-800/50 text-slate-400 font-medium">
            <tr>
              <th className="px-6 py-4 w-1/4">Colaborador</th>
              <th className="px-6 py-4 w-32">Horas Extras (+)</th>
              <th className="px-6 py-4 w-32">Faltas/Atrasos (-)</th>
              <th className="px-6 py-4 w-32">Saldo Mês</th>
              <th className="px-6 py-4">Observações</th>
              <th className="px-6 py-4 w-12"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            {ativos.map(colab => {
              const lanc = lancamentos[colab.id!];
              const saldo = getSaldo(colab.id!);
              const status = savingStatus[colab.id!];

              return (
                <tr key={colab.id} className="hover:bg-slate-800/20 transition-colors">
                  <td className="px-6 py-4 font-medium text-slate-200">{colab.nome}</td>
                  <td className="px-6 py-4">
                    <input
                      type="time"
                      defaultValue={minutesToTime(lanc?.minutosPositivos || 0).replace('-', '')}
                      onBlur={e => handleBlur(colab.id!, 'minutosPositivos', timeToMinutes(e.target.value))}
                      className="bg-slate-950 border border-slate-700 text-emerald-400 rounded-lg px-3 py-1.5 w-full focus:outline-none focus:border-emerald-500"
                    />
                  </td>
                  <td className="px-6 py-4">
                    <input
                      type="time"
                      defaultValue={minutesToTime(lanc?.minutosNegativos || 0).replace('-', '')}
                      onBlur={e => handleBlur(colab.id!, 'minutosNegativos', timeToMinutes(e.target.value))}
                      className="bg-slate-950 border border-slate-700 text-red-400 rounded-lg px-3 py-1.5 w-full focus:outline-none focus:border-red-500"
                    />
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1.5 rounded-lg font-bold ${saldo > 0 ? 'bg-emerald-500/10 text-emerald-400' : saldo < 0 ? 'bg-red-500/10 text-red-400' : 'bg-slate-800 text-slate-400'}`}>
                      {minutesToTime(saldo)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <input
                      type="text"
                      defaultValue={lanc?.observacoes || ''}
                      onBlur={e => handleBlur(colab.id!, 'observacoes', e.target.value)}
                      placeholder="Obs..."
                      className="bg-transparent border-b border-transparent hover:border-slate-700 focus:border-indigo-500 w-full px-2 py-1 focus:outline-none transition-colors"
                    />
                  </td>
                  <td className="px-6 py-4 text-center">
                    {status === 'saving' && <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />}
                    {status === 'saved' && <span className="text-emerald-400 text-xs font-bold">OK</span>}
                    {status === 'error' && <span className="text-red-400 text-xs font-bold">Erro</span>}
                  </td>
                </tr>
              );
            })}
            {ativos.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                  Nenhum colaborador ativo encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
