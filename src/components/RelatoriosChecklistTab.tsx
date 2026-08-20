import React, { useState, useEffect } from 'react';
import { Empresa, CalendarEvent } from '../types';
import { db } from '../lib/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { Printer, Loader2, AlertTriangle } from 'lucide-react';
import LayoutPrintRelatorioChecklist from '../LayoutPrintRelatorioChecklist';

interface RelatoriosChecklistTabProps {
  empresas: Empresa[];
}

export default function RelatoriosChecklistTab({ empresas }: RelatoriosChecklistTabProps) {
  const [reportMonth, setReportMonth] = useState(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  });
  
  // By default select all companies
  const [selectedEmpresas, setSelectedEmpresas] = useState<string[]>(empresas.map(e => e.id));
  const [reportTypes, setReportTypes] = useState({ fixas: true, avisos: true });
  
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<any[]>([]);

  // Keep selectedEmpresas synced if new empresas load
  useEffect(() => {
    if (selectedEmpresas.length === 0 && empresas.length > 0) {
      setSelectedEmpresas(empresas.map(e => e.id));
    }
  }, [empresas]);

  useEffect(() => {
    const fetchReportData = async () => {
      setLoading(true);
      try {
        const eventsRef = collection(db, 'calendarEvents');
        const snapEvents = await getDocs(eventsRef);
        const allEvents = snapEvents.docs.map(d => ({ id: d.id, ...d.data() } as CalendarEvent));

        const completionsRef = collection(db, 'recurrentCompletions');
        const qCompletions = query(completionsRef, where('monthKey', '==', reportMonth));
        const snapCompletions = await getDocs(qCompletions);
        
        const completionsMap: Record<string, { completedAt: number, entityId: string }> = {};
        snapCompletions.docs.forEach(d => {
          const data = d.data();
          completionsMap[`${data.eventId}_${data.entityId}`] = { 
            completedAt: data.completedAt, 
            entityId: data.entityId 
          };
        });

        const [anoStr, mesStr] = reportMonth.split('-');
        const currentYear = parseInt(anoStr);
        const currentMonth = parseInt(mesStr) - 1;

        const items: any[] = [];

        const empresasToProcess = empresas.filter(e => selectedEmpresas.includes(e.id));

        empresasToProcess.forEach(empresa => {
          if (reportTypes.fixas) {
            const fixedEvents = allEvents.filter(e => e.isRecurrent && (e.empresaId === empresa.id || e.empresaId === empresa.sindicatoId));
            fixedEvents.forEach(event => {
              const comp = completionsMap[`${event.id}_${empresa.id}`];
              items.push({
                titulo: event.title,
                tipo: 'Fixo',
                status: comp ? 'Concluído' : 'Pendente',
                dataConclusao: comp ? comp.completedAt : null,
                empresaNome: empresa.nome,
                empresaId: empresa.id
              });
            });
          }

          if (reportTypes.avisos) {
            const monthEvents = allEvents.filter(e => {
              if (e.isRecurrent) return false;
              if (e.empresaId !== empresa.id && e.empresaId !== empresa.sindicatoId) return false;
              const d = new Date(e.date);
              return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
            });
            
            monthEvents.forEach(event => {
               const isCompleted = event.status === 'CONCLUIDO';
               items.push({
                 titulo: event.title,
                 tipo: 'Aviso',
                 status: isCompleted ? 'Concluído' : 'Pendente',
                 dataConclusao: null,
                 empresaNome: empresa.nome,
                 empresaId: empresa.id
               });
            });
          }
        });

        items.sort((a, b) => {
          if (a.empresaNome !== b.empresaNome) return a.empresaNome.localeCompare(b.empresaNome);
          if (a.status !== b.status) return a.status === 'Pendente' ? -1 : 1;
          return a.titulo.localeCompare(b.titulo);
        });

        setReportData(items);

      } catch (err) {
        console.error("Error fetching report data", err);
      } finally {
        setLoading(false);
      }
    };

    fetchReportData();
  }, [reportMonth, selectedEmpresas, reportTypes, empresas]);

  const toggleEmpresa = (id: string) => {
    setSelectedEmpresas(prev => 
      prev.includes(id) ? prev.filter(e => e !== id) : [...prev, id]
    );
  };

  const toggleAllEmpresas = () => {
    if (selectedEmpresas.length === empresas.length) {
      setSelectedEmpresas([]);
    } else {
      setSelectedEmpresas(empresas.map(e => e.id));
    }
  };

  const [printWarning, setPrintWarning] = useState(false);

  const handlePrint = () => {
    if (window.self !== window.top) {
      setPrintWarning(true);
      setTimeout(() => setPrintWarning(false), 8000);
    }
    setTimeout(() => {
      window.print();
    }, 100);
  };

  const groupedData = reportData.reduce((acc, item) => {
    if (!acc[item.empresaId]) acc[item.empresaId] = [];
    acc[item.empresaId].push(item);
    return acc;
  }, {} as Record<string, any[]>);

  return (
    <div className="flex-1 w-full bg-slate-900 border border-slate-700/50 rounded-2xl p-6 shadow-xl flex flex-col h-full animate-in fade-in zoom-in-95 duration-200 print:bg-white print:border-none print:shadow-none print:p-0">
      
      {printWarning && (
        <div className="bg-amber-500/10 border border-amber-500/50 p-4 rounded-xl flex items-start gap-3 mb-6 print:hidden animate-in fade-in slide-in-from-top-2">
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

      <div className="flex flex-col xl:flex-row gap-6 mb-8 print:hidden">
        <div className="flex flex-col gap-6 w-full xl:w-auto">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Mês Referência</label>
            <input 
              type="month" 
              value={reportMonth}
              onChange={e => setReportMonth(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-lg px-4 py-2.5 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>
          
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Tipos de Obrigação</label>
            <div className="flex gap-4 pt-2">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={reportTypes.fixas}
                  onChange={e => setReportTypes(prev => ({...prev, fixas: e.target.checked}))}
                  className="w-4 h-4 rounded text-indigo-500 bg-slate-950 border-slate-800 focus:ring-indigo-500"
                />
                <span className="text-sm text-slate-300">Obrigações Fixas</span>
              </label>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={reportTypes.avisos}
                  onChange={e => setReportTypes(prev => ({...prev, avisos: e.target.checked}))}
                  className="w-4 h-4 rounded text-indigo-500 bg-slate-950 border-slate-800 focus:ring-indigo-500"
                />
                <span className="text-sm text-slate-300">Inclusões/Avisos</span>
              </label>
            </div>
          </div>
        </div>

        <div className="flex-1 max-h-48 overflow-y-auto bg-slate-950 border border-slate-800 rounded-lg p-4 custom-scrollbar">
          <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest">Empresas ({selectedEmpresas.length}/{empresas.length})</label>
            <button onClick={toggleAllEmpresas} className="text-xs text-indigo-400 hover:text-indigo-300 font-medium">
              {selectedEmpresas.length === empresas.length ? 'Desmarcar Todas' : 'Marcar Todas'}
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {empresas.map(emp => (
              <label key={emp.id} className="flex items-center space-x-2 cursor-pointer group">
                <input 
                  type="checkbox" 
                  checked={selectedEmpresas.includes(emp.id)}
                  onChange={() => toggleEmpresa(emp.id)}
                  className="w-4 h-4 rounded text-indigo-500 bg-slate-900 border-slate-700 focus:ring-indigo-500"
                />
                <span className="text-sm text-slate-400 group-hover:text-slate-200 transition-colors truncate" title={emp.nome}>
                  {emp.nome}
                </span>
              </label>
            ))}
          </div>
        </div>
        
        <div className="flex items-start xl:items-end">
          <button 
            onClick={handlePrint}
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2.5 rounded-lg font-medium flex items-center gap-2 transition-colors whitespace-nowrap"
          >
            <Printer className="w-4 h-4" />
            Imprimir Relatório (PDF)
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto bg-slate-950 rounded-xl border border-slate-800 custom-scrollbar print:hidden">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
          </div>
        ) : reportData.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-500">
            <p>Nenhum dado encontrado para os filtros selecionados.</p>
          </div>
        ) : (
          <div className="p-4 space-y-6">
            {Object.entries(groupedData).map(([empId, empItems]: [string, any[]]) => (
              <div key={empId} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                <div className="bg-slate-800/50 px-4 py-3 border-b border-slate-800">
                  <h3 className="font-bold text-slate-200">{empItems[0].empresaNome}</h3>
                </div>
                <table className="w-full text-left text-sm text-slate-300">
                  <thead className="bg-slate-900/50 text-slate-400 font-medium">
                    <tr>
                      <th className="px-6 py-3">Obrigação</th>
                      <th className="px-6 py-3 text-center w-24">Tipo</th>
                      <th className="px-6 py-3 text-center w-32">Status</th>
                      <th className="px-6 py-3 text-center w-32">Resolução</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {empItems.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-800/20 transition-colors">
                        <td className="px-6 py-3">{item.titulo}</td>
                        <td className="px-6 py-3 text-center">
                          <span className="text-xs bg-slate-800 px-2 py-1 rounded text-slate-400 font-medium">
                            {item.tipo}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-center">
                          <span className={`px-2.5 py-1 text-xs font-bold rounded-full ${
                            item.status === 'Concluído' 
                              ? 'bg-emerald-500/10 text-emerald-400' 
                              : 'bg-red-500/10 text-red-400'
                          }`}>
                            {item.status}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-center text-slate-400">
                          {item.dataConclusao ? new Date(item.dataConclusao).toLocaleDateString('pt-BR') : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        )}
      </div>

      <LayoutPrintRelatorioChecklist 
        items={reportData} 
        mesAno={reportMonth}
        empresas={empresas}
        empresaFiltro={selectedEmpresas.join(',')}
      />
    </div>
  );
}
