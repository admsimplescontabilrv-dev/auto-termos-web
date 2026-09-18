import React, { useState, useEffect } from 'react';
import { db, auth } from '../lib/firebase';
import { collection, onSnapshot, query, setDoc, doc, deleteDoc, updateDoc, where } from 'firebase/firestore';
import { Empresa, CalendarEvent } from '../types';
import { format, addMonths, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Search, FileSpreadsheet, ArrowUp, ArrowDown, Printer } from 'lucide-react';

interface FechamentoFolhaTabProps {
  empresas: Empresa[];
}

export default function FechamentoFolhaTab({ empresas }: FechamentoFolhaTabProps) {
  const [currentMonth, setCurrentMonth] = useState(() => {
    const today = new Date();
    return today.getDate() > 22 ? addMonths(today, 1) : today;
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [fechamentos, setFechamentos] = useState<Record<string, any>>({});
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [recurrentCompletions, setRecurrentCompletions] = useState<{ [key: string]: number }>({});
  const [isUpdatingOrder, setIsUpdatingOrder] = useState(false);

  const [isEditMode, setIsEditMode] = useState(false);
  const [isMesesModalOpen, setIsMesesModalOpen] = useState(false);
  const [mesesModalData, setMesesModalData] = useState<{empresaId: string, tipo: 'LABORAL' | 'PATRONAL', selected: number[]}>({empresaId: '', tipo: 'LABORAL', selected: []});

  useEffect(() => {
    const monthKey = format(currentMonth, 'yyyy-MM');
    
    // Fetch Fechamentos
    const qFechamentos = query(collection(db, 'fechamentoFolha'), where('monthKey', '==', monthKey));
    const unsubFechamentos = onSnapshot(qFechamentos, (snapshot) => {
      const fechs: Record<string, any> = {};
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        fechs[data.empresaId] = data;
      });
      setFechamentos(fechs);
    });

    // Fetch Calendar Events
    const unsubEvents = onSnapshot(collection(db, 'calendarEvents'), (snapshot) => {
      setCalendarEvents(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as CalendarEvent)));
    });

    // Fetch Completions
    const unsubCompletions = onSnapshot(query(collection(db, 'recurrentCompletions'), where('monthKey', '==', monthKey)), (snapshot) => {
      const comps: { [key: string]: number } = {};
      snapshot.docs.forEach(d => {
        const data = d.data();
        comps[`${data.eventId}_${data.entityId}`] = data.completedAt;
      });
      setRecurrentCompletions(comps);
    });

    return () => {
      unsubFechamentos();
      unsubEvents();
      unsubCompletions();
    };
  }, [currentMonth]);

  const updateFechamento = async (empresaId: string, field: string, value: string) => {
    if (isEditMode) {
      // Editar o template base na coleção Empresas
      const emp = empresas.find(e => e.id === empresaId);
      if (!emp) return;
      const newTemplate = { ...(emp.fechamentoTemplate || {}), [field]: value };
      await updateDoc(doc(db, 'empresas', empresaId), { fechamentoTemplate: newTemplate });
      return;
    }

    const monthKey = format(currentMonth, 'yyyy-MM');
    const docId = `${monthKey}_${empresaId}`;
    
    const existing = fechamentos[empresaId] || {};
    const newData = { ...existing, [field]: value, monthKey, empresaId, updatedAt: Date.now() };
    
    await setDoc(doc(db, 'fechamentoFolha', docId), newData, { merge: true });

    // Sync with Calendar Completions if applicable
    const syncFields = ['fgts', 'dctf', 'guiaSindicato', 'guiaSindicatoLaboral', 'guiaSindicatoPatronal', 'recibo', 'adiantamento', 'consignado', 'lancamento', 'verificarEnvio'];
    if (syncFields.includes(field)) {
      let eventTitleMatch = '';
      if (field === 'fgts') eventTitleMatch = 'FGTS';
      else if (field === 'dctf') eventTitleMatch = 'DCTF';
      else if (field === 'guiaSindicato' || field === 'guiaSindicatoLaboral' || field === 'guiaSindicatoPatronal') eventTitleMatch = 'SINDICATO';
      else if (field === 'recibo') eventTitleMatch = 'RECIBO';
      else if (field === 'adiantamento') eventTitleMatch = 'ADIANTAMENTO';
      else if (field === 'consignado') eventTitleMatch = 'EMPRÉSTIMO';
      else if (field === 'lancamento') eventTitleMatch = 'LANÇAMENTO';
      else if (field === 'verificarEnvio') eventTitleMatch = 'VERIFICAR';

      if (eventTitleMatch) {
        const emp = empresas.find(e => e.id === empresaId);
        const sindicatoId = emp?.sindicatoId;

        let matchingEvents = calendarEvents.filter(e => {
          const isEntityMatch = e.empresaId === empresaId || (sindicatoId && e.empresaId === sindicatoId) || !e.empresaId || e.empresaId === 'GERAL' || e.empresaId === 'PADRAO';
          if (!isEntityMatch) return false;
          const upper = e.title.toUpperCase();
          if (field === 'consignado') {
            return upper.includes('EMPRÉSTIMO') || upper.includes('EMPRESTIMO') || upper.includes('CONSIGNADO');
          }
          if (field === 'lancamento') {
            return upper.includes('LANÇAMENTO') || upper.includes('LANCAMENTO') || upper.includes('PONTO') || upper.includes('COMISSÃO') || upper.includes('COMISSAO');
          }
          if (field === 'verificarEnvio') {
            return upper.includes('VERIFICAR ENVIO') || upper.includes('VERIFICAR');
          }
          return upper.includes(eventTitleMatch);
        });

        // Fallback: se não encontrar restrito à empresa/sindicato, busca por título global
        if (matchingEvents.length === 0) {
          matchingEvents = calendarEvents.filter(e => {
            const upper = e.title.toUpperCase();
            if (field === 'consignado') {
              return upper.includes('EMPRÉSTIMO') || upper.includes('EMPRESTIMO') || upper.includes('CONSIGNADO');
            }
            if (field === 'lancamento') {
              return upper.includes('LANÇAMENTO') || upper.includes('LANCAMENTO') || upper.includes('PONTO') || upper.includes('COMISSÃO') || upper.includes('COMISSAO');
            }
            if (field === 'verificarEnvio') {
              return upper.includes('VERIFICAR ENVIO') || upper.includes('VERIFICAR');
            }
            return upper.includes(eventTitleMatch);
          });
        }

        for (const event of matchingEvents) {
          const compDocId = `${event.id}_${empresaId}_${monthKey}`;
          if (value === 'OK') {
            await setDoc(doc(db, 'recurrentCompletions', compDocId), {
              eventId: event.id,
              monthKey,
              entityId: empresaId,
              completedAt: Date.now(),
              createdAt: Date.now()
            });
          } else {
            await deleteDoc(doc(db, 'recurrentCompletions', compDocId)).catch(() => {});
          }
        }
      }
    }

    // Sync to Google Sheets in background
    if (!isEditMode) {
      try {
        const token = await auth.currentUser?.getIdToken();
        if (token) {
          const columnMap: Record<string, string> = {
            lancamento: "Inf. Lançamento",
            consignado: "Empréstimo",
            adiantamento: "Adiantamento",
            recibo: "Recibo",
            fgts: "FGTS",
            dctf: "DCTF",
            guiaSindicato: "Guia Sindicato",
            verificarEnvio: "Verificar Envio",
            observacoes: "Observações",
            contatos: "Contatos",
            tipoFolha: "Pro Labore/Func"
          };
          const coluna = columnMap[field] || field;

          fetch('/api/sheets/update', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              empresaId,
              coluna,
              novoStatus: value
            })
          }).catch(err => console.error("Error syncing to sheets", err));
        }
      } catch (err) {
        console.error("Auth error", err);
      }
    }
  };

  const sortedEmpresas = [...empresas].sort((a, b) => {
    const ordemA = a.ordemFechamento ?? 999999;
    const ordemB = b.ordemFechamento ?? 999999;
    if (ordemA !== ordemB) return ordemA - ordemB;
    return a.nome.localeCompare(b.nome);
  });

  const filteredEmpresas = sortedEmpresas.filter(e => 
    e.nome.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (e.cnpj && e.cnpj.includes(searchTerm))
  );

  const moveEmpresa = async (index: number, direction: 'UP' | 'DOWN') => {
    if (isUpdatingOrder) return;
    if (direction === 'UP' && index === 0) return;
    if (direction === 'DOWN' && index === sortedEmpresas.length - 1) return;

    setIsUpdatingOrder(true);
    try {
      const targetIndex = direction === 'UP' ? index - 1 : index + 1;
      const newSorted = [...sortedEmpresas];
      
      const temp = newSorted[index];
      newSorted[index] = newSorted[targetIndex];
      newSorted[targetIndex] = temp;

      const promises: Promise<void>[] = [];
      newSorted.forEach((emp, i) => {
        if (emp.ordemFechamento !== i) {
          promises.push(updateDoc(doc(db, 'empresas', emp.id), { ordemFechamento: i }));
        }
      });
      
      await Promise.all(promises);
    } catch (error) {
      console.error("Erro ao reordenar", error);
    } finally {
      setIsUpdatingOrder(false);
    }
  };

  const handlePrint = () => {
    const windowPrint = window.open('about:blank', '_blank', 'width=1024,height=768');
    if (!windowPrint) return;

    const formattedMonth = format(currentMonth, 'MMMM yyyy', { locale: ptBR });
    const capitalizedMonth = formattedMonth.charAt(0).toUpperCase() + formattedMonth.slice(1);

    windowPrint.document.write(`
      <html>
        <head>
          <title>Fechamento de Folha - ${capitalizedMonth}</title>
          <style>
            @page { size: landscape; margin: 10mm; }
            body { font-family: Arial, sans-serif; font-size: 10px; margin: 0; color: #333; }
            h2 { font-size: 16px; margin-bottom: 15px; text-transform: uppercase; color: #111; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            th, td { border: 1px solid #ccc; padding: 6px; text-align: left; }
            th { background-color: #f4f4f5; font-weight: bold; text-transform: uppercase; font-size: 9px; }
            .ok, .nao-tem { color: #2c5f34; background-color: #d5ebd1; font-weight: bold; }
            .pendente, .consultar { color: #715423; background-color: #fde2ab; font-weight: bold; }
            .pendente-especial { color: #325264; background-color: #dae8ea; font-weight: bold; }
          </style>
        </head>
        <body>
          <h2>FECHAMENTO DE FOLHA - ${capitalizedMonth}</h2>
          <table>
            <thead>
              <tr>
                <th style="width: 20px;">#</th>
                <th>EMPRESA</th>
                <th>INF. LANÇAMENTO</th>
                <th>EMPRÉSTIMO</th>
                <th>ADIANTAMENTO</th>
                <th>RECIBO</th>
                <th>FGTS</th>
                <th>DCTF</th>
                <th>GUIA SINDICATO LAB.</th>
                <th>GUIA SINDICATO PATR.</th>
                <th>VERIFICAR ENVIO</th>
                <th>OBSERVAÇÕES</th>
                <th>CONTATOS</th>
                <th>PRO LABORE/FUNC</th>
              </tr>
            </thead>
            <tbody>
              ${filteredEmpresas.map((emp, i) => {
                const fDataRaw = fechamentos[emp.id] || {};
                const tpl = emp.fechamentoTemplate || {};
                
    const mesAtualIdx = currentMonth.getMonth();
    const labMeses = tpl.guiaSindicatoLaboralMeses ? tpl.guiaSindicatoLaboralMeses.split(',').map(Number) : [];
    const isLabMes = labMeses.includes(mesAtualIdx);
    const defaultLabStatus = isLabMes ? 'PENDENTE' : 'OK';

    const patMeses = tpl.guiaSindicatoPatronalMeses ? tpl.guiaSindicatoPatronalMeses.split(',').map(Number) : [];
    const isPatMes = patMeses.includes(mesAtualIdx);
    const defaultPatStatus = isPatMes ? 'PENDENTE' : 'OK';

const fData = isEditMode ? tpl : {
                  lancamento: fDataRaw.lancamento ?? tpl.lancamento,
                  consignado: fDataRaw.consignado ?? tpl.consignado,
                  adiantamento: fDataRaw.adiantamento ?? tpl.adiantamento,
                  recibo: fDataRaw.recibo ?? tpl.recibo,
                  fgts: fDataRaw.fgts ?? tpl.fgts,
                  dctf: fDataRaw.dctf ?? tpl.dctf,
                  guiaSindicatoLaboral: fDataRaw.guiaSindicatoLaboral ?? (fDataRaw.guiaSindicato ?? defaultLabStatus),
                  guiaSindicatoPatronal: fDataRaw.guiaSindicatoPatronal ?? defaultPatStatus,
                  verificarEnvio: fDataRaw.verificarEnvio ?? tpl.verificarEnvio,
                  observacoes: fDataRaw.observacoes ?? tpl.observacoes,
                  contatos: fDataRaw.contatos ?? tpl.contatos,
                  tipoFolha: fDataRaw.tipoFolha ?? tpl.tipoFolha,
                };
                
                const getStatusClass = (val: string) => {
                  if (['OK', 'NÃO TEM', 'NÃO ENVIAMOS', 'SEM LANÇAMENTO', 'INFORMADO (VER COLUNA K)'].includes(val)) return 'ok';
                  if (['PENDENTE', 'A CONSULTAR', 'AGUARDANDO RESPOSTA', 'PENDENTE DE SOLICITAÇÃO'].includes(val)) return 'pendente';
                  if (val === 'PENDENTE (PONTO/COMISSÃO)') return 'pendente-especial';
                  return '';
                };

                return `
                  <tr>
                    <td>${i + 1}</td>
                    <td>
                      <strong>${emp.nome}</strong><br/>
                      <span style="font-size: 8px; color: #666;">${emp.cnpj || ''}</span>
                    </td>
                    <td class="${getStatusClass(fData.lancamento)}">${fData.lancamento || ''}</td>
                    <td class="${getStatusClass(fData.consignado)}">${fData.consignado || ''}</td>
                    <td class="${getStatusClass(fData.adiantamento)}">${fData.adiantamento || ''}</td>
                    <td class="${getStatusClass(fData.recibo)}">${fData.recibo || ''}</td>
                    <td class="${getStatusClass(fData.fgts)}">${fData.fgts || ''}</td>
                    <td class="${getStatusClass(fData.dctf)}">${fData.dctf || ''}</td>
                    <td class="${getStatusClass(fData.guiaSindicatoLaboral)}">${fData.guiaSindicatoLaboral || ''}</td>
                    <td class="${getStatusClass(fData.guiaSindicatoPatronal)}">${fData.guiaSindicatoPatronal || ''}</td>
                    <td class="${getStatusClass(fData.verificarEnvio)}">${fData.verificarEnvio || ''}</td>
                    <td>${fData.observacoes || ''}</td>
                    <td>${fData.contatos || ''}</td>
                    <td>${fData.tipoFolha || ''}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </body>
      </html>
    `);
    
    windowPrint.document.close();
    windowPrint.focus();
    setTimeout(() => {
      windowPrint.print();
      windowPrint.close();
    }, 250);
  };

  const getSelectClass = (value: string) => {
    if (['OK', 'NÃO TEM', 'NÃO ENVIAMOS', 'SEM LANÇAMENTO', 'INFORMADO (VER COLUNA K)'].includes(value)) {
      return 'bg-green-200/90 text-green-900 border-green-300/50';
    }
    if (['PENDENTE', 'A CONSULTAR', 'AGUARDANDO RESPOSTA', 'PENDENTE DE SOLICITAÇÃO'].includes(value)) {
      return 'bg-amber-200/90 text-amber-900 border-amber-300/50';
    }
    if (['PENDENTE (PONTO/COMISSÃO)'].includes(value)) {
      return 'bg-fuchsia-200/90 text-fuchsia-900 border-fuchsia-300/50';
    }
    return 'bg-slate-900 border-slate-800 text-slate-300';
  };

  const saveMeses = async () => {
    const { empresaId, tipo, selected } = mesesModalData;
    const emp = empresas.find(e => e.id === empresaId);
    if (!emp) return;

    const fieldName = tipo === 'LABORAL' ? 'guiaSindicatoLaboralMeses' : 'guiaSindicatoPatronalMeses';
    const valueToSave = selected.join(',');
    
    const newTemplate = { ...(emp.fechamentoTemplate || {}), [fieldName]: valueToSave };
    await updateDoc(doc(db, 'empresas', empresaId), { fechamentoTemplate: newTemplate });

    for (let i = 0; i < 12; i++) {
      const eventTitle = `Guia Sindicato ${tipo === 'LABORAL' ? 'Laboral' : 'Patronal'}`;
      const exists = calendarEvents.find(e => e.empresaId === empresaId && e.isRecurrent && e.recurrentMonth === i && e.title === eventTitle);
      
      if (selected.includes(i)) {
        if (!exists) {
          await setDoc(doc(collection(db, 'calendarEvents')), {
            title: eventTitle,
            date: new Date(2024, i, 10).toISOString(),
            empresaId,
            empresaNome: emp.nome,
            type: 'RECORRENTE',
            isRecurrent: true,
            recurrentRule: 'YEARLY',
            recurrentDay: 10,
            recurrentMonth: i,
            createdAt: Date.now()
          });
        }
      } else {
        if (exists) {
          await deleteDoc(doc(db, 'calendarEvents', exists.id));
        }
      }
    }

    setIsMesesModalOpen(false);
  };

  return (
    <div className="bg-slate-900 border border-slate-700/50 rounded-2xl shadow-xl flex flex-col min-h-[500px]">
      <div className="p-4 border-b border-slate-800 bg-slate-950/50 flex flex-col md:flex-row items-center justify-between gap-4 rounded-t-2xl">
        <div className="flex items-center space-x-3">
          <FileSpreadsheet className="w-6 h-6 text-emerald-400" />
          <h2 className="text-lg font-bold text-slate-200">Fechamento de Folha</h2>
          <span className="bg-slate-800 text-slate-400 text-xs px-2 py-1 rounded-md font-mono font-bold">
            {filteredEmpresas.length} empresas
          </span>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <button
            onClick={() => setIsEditMode(!isEditMode)}
            className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors border w-full sm:w-auto ${
              isEditMode 
                ? 'bg-amber-500/20 text-amber-400 border-amber-500/50' 
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
            }`}
          >
            {isEditMode ? 'Editando Modelo Base' : 'Modo Padrão'}
          </button>

          {isEditMode && (
            <button
              onClick={async () => {
                if (window.confirm("Preencher os modelos base vazios com o padrão sugerido?")) {
                  const promises = empresas.map(emp => {
                    if (!emp.fechamentoTemplate || Object.keys(emp.fechamentoTemplate).length === 0) {
                      return updateDoc(doc(db, 'empresas', emp.id), {
                        fechamentoTemplate: {
                          lancamento: 'PENDENTE (PONTO/COMISSÃO)',
                          consignado: 'A CONSULTAR',
                          adiantamento: 'NÃO TEM',
                          fgts: 'PENDENTE',
                          dctf: 'PENDENTE',
                          guiaSindicato: 'NÃO ENVIAMOS',
                          verificarEnvio: 'PENDENTE',
                          tipoFolha: 'FUNCIONÁRIOS'
                        }
                      });
                    }
                    return Promise.resolve();
                  });
                  await Promise.all(promises);
                  alert("Modelos base preenchidos com sucesso!");
                }
              }}
              className="px-3 py-2 text-sm font-medium bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 rounded-lg hover:bg-indigo-600/30 transition-colors w-full sm:w-auto"
            >
              Preencher Modelos Vazios
            </button>
          )}

          <div className="flex w-full sm:w-auto gap-3 flex-wrap sm:flex-nowrap">
            <button 
              onClick={handlePrint}
              className="flex items-center justify-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-lg text-sm transition-colors shrink-0"
            >
              <Printer className="w-4 h-4" />
              <span className="hidden sm:inline">Imprimir Relatório</span>
            </button>

            <div className="relative flex-1 sm:w-64 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input 
                type="text"
                placeholder="Buscar empresa..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>
            
            {!isEditMode && (
              <div className="flex items-center justify-between bg-slate-800 border border-slate-700/50 rounded-lg p-1 w-full sm:w-48 shrink-0">
                <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-1 text-slate-400 hover:text-slate-200 transition-colors rounded">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-sm font-bold text-slate-300 capitalize">
                  {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
                </span>
                <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-1 text-slate-400 hover:text-slate-200 transition-colors rounded">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="hidden md:block flex-1 overflow-x-auto overflow-y-auto custom-scrollbar">
        <table className="w-full text-left text-sm whitespace-nowrap min-w-max">
          <thead className="bg-slate-950/80 text-slate-400 text-xs uppercase tracking-wider sticky top-0 z-10">
            <tr>
              <th className="px-2 py-3 font-medium border-b border-r border-slate-800 sticky left-0 bg-slate-950 z-20 w-10 text-center">#</th>
              <th className="px-4 py-3 font-medium border-b border-r border-slate-800 sticky left-[40px] bg-slate-950 z-20">Empresa</th>
              <th className="px-4 py-3 font-medium border-b border-r border-slate-800">Inf. Lançamento</th>
              <th className="px-4 py-3 font-medium border-b border-r border-slate-800">Empréstimo</th>
              <th className="px-4 py-3 font-medium border-b border-r border-slate-800">Adiantamento</th>
              <th className="px-4 py-3 font-medium border-b border-r border-slate-800">Recibo</th>
              <th className="px-4 py-3 font-medium border-b border-r border-slate-800">FGTS</th>
              <th className="px-4 py-3 font-medium border-b border-r border-slate-800">DCTF</th>
              <th className="px-4 py-3 font-medium border-b border-r border-slate-800">Guia Sindicato Laboral</th>
              <th className="px-4 py-3 font-medium border-b border-r border-slate-800">Guia Sindicato Patronal</th>
              <th className="px-4 py-3 font-medium border-b border-r border-slate-800">Verificar Envio</th>
              <th className="px-4 py-3 font-medium border-b border-r border-slate-800">Observações</th>
              <th className="px-4 py-3 font-medium border-b border-r border-slate-800">Contatos</th>
              <th className="px-4 py-3 font-medium border-b border-r border-slate-800">Pro Labore/Func</th>
              <th className="px-4 py-3 font-medium border-b border-slate-800">Últ. Atualização</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            {filteredEmpresas.map((emp, index) => {
              const fDataRaw = fechamentos[emp.id] || {};
              const tpl = emp.fechamentoTemplate || {};
              
              
    const mesAtualIdx = currentMonth.getMonth();
    const labMeses = tpl.guiaSindicatoLaboralMeses ? tpl.guiaSindicatoLaboralMeses.split(',').map(Number) : [];
    const isLabMes = labMeses.includes(mesAtualIdx);
    const defaultLabStatus = isLabMes ? 'PENDENTE' : 'OK';

    const patMeses = tpl.guiaSindicatoPatronalMeses ? tpl.guiaSindicatoPatronalMeses.split(',').map(Number) : [];
    const isPatMes = patMeses.includes(mesAtualIdx);
    const defaultPatStatus = isPatMes ? 'PENDENTE' : 'OK';

const fData = isEditMode ? tpl : {
                lancamento: fDataRaw.lancamento ?? tpl.lancamento,
                consignado: fDataRaw.consignado ?? tpl.consignado,
                adiantamento: fDataRaw.adiantamento ?? tpl.adiantamento,
                recibo: fDataRaw.recibo ?? tpl.recibo,
                fgts: fDataRaw.fgts ?? tpl.fgts,
                dctf: fDataRaw.dctf ?? tpl.dctf,
                guiaSindicatoLaboral: fDataRaw.guiaSindicatoLaboral ?? (fDataRaw.guiaSindicato ?? defaultLabStatus),
                guiaSindicatoPatronal: fDataRaw.guiaSindicatoPatronal ?? defaultPatStatus,
                verificarEnvio: fDataRaw.verificarEnvio ?? tpl.verificarEnvio,
                observacoes: fDataRaw.observacoes ?? tpl.observacoes,
                contatos: fDataRaw.contatos ?? tpl.contatos,
                tipoFolha: fDataRaw.tipoFolha ?? tpl.tipoFolha,
                updatedAt: fDataRaw.updatedAt
              };
              
              return (
                <tr key={emp.id} className="hover:bg-slate-800/30 transition-colors group">
                  <td className="px-1 py-2 border-r border-slate-800/50 sticky left-0 bg-slate-900 group-hover:bg-slate-800 transition-colors z-10">
                    <div className="flex flex-col items-center justify-center space-y-1">
                      <button 
                        onClick={() => moveEmpresa(index, 'UP')}
                        disabled={index === 0 || isUpdatingOrder || searchTerm !== ''}
                        className="text-slate-600 hover:text-emerald-400 disabled:opacity-20 disabled:hover:text-slate-600 transition-colors p-0.5"
                      >
                        <ArrowUp className="w-3 h-3" />
                      </button>
                      <span className="text-[10px] font-bold text-slate-500">{index + 1}</span>
                      <button 
                        onClick={() => moveEmpresa(index, 'DOWN')}
                        disabled={index === sortedEmpresas.length - 1 || isUpdatingOrder || searchTerm !== ''}
                        className="text-slate-600 hover:text-emerald-400 disabled:opacity-20 disabled:hover:text-slate-600 transition-colors p-0.5"
                      >
                        <ArrowDown className="w-3 h-3" />
                      </button>
                    </div>
                  </td>

                  <td className="px-4 py-2 border-r border-slate-800/50 sticky left-[40px] bg-slate-900 group-hover:bg-slate-800 transition-colors z-10 max-w-[250px] truncate" title={emp.nome}>
                    <div className="font-bold text-slate-200 truncate">{emp.nome}</div>
                    <div className="text-[10px] text-slate-500 font-mono mt-0.5">{emp.cnpj}</div>
                  </td>
                  
                  <td className="px-2 py-2 border-r border-slate-800/50">
                    <select 
                      value={fData.lancamento || ''}
                      onChange={(e) => updateFechamento(emp.id, 'lancamento', e.target.value)}
                      className={`w-full text-xs font-bold rounded px-2 py-1.5 border appearance-none cursor-pointer focus:outline-none transition-colors ${getSelectClass(fData.lancamento)}`}
                    >
                      <option value=""></option>
                      <option value="PENDENTE (PONTO/COMISSÃO)">PENDENTE (PONTO/COMISSÃO)</option>
                      <option value="AGUARDANDO RESPOSTA">AGUARDANDO RESPOSTA</option>
                      <option value="SEM LANÇAMENTO">SEM LANÇAMENTO</option>
                      <option value="INFORMADO (VER COLUNA K)">INFORMADO (VER COLUNA K)</option>
                      <option value="PENDENTE DE SOLICITAÇÃO">PENDENTE DE SOLICITAÇÃO</option>
                      <option value="OK">OK</option>
                    </select>
                  </td>

                  <td className="px-2 py-2 border-r border-slate-800/50">
                    <select 
                      value={fData.consignado || ''}
                      onChange={(e) => updateFechamento(emp.id, 'consignado', e.target.value)}
                      className={`w-full text-xs font-bold rounded px-2 py-1.5 border appearance-none cursor-pointer focus:outline-none transition-colors ${getSelectClass(fData.consignado)}`}
                    >
                      <option value=""></option>
                      <option value="A CONSULTAR">A CONSULTAR</option>
                      <option value="NÃO TEM">NÃO TEM</option>
                      <option value="OK">OK</option>
                    </select>
                  </td>

                  <td className="px-2 py-2 border-r border-slate-800/50">
                    <select 
                      value={fData.adiantamento || ''}
                      onChange={(e) => updateFechamento(emp.id, 'adiantamento', e.target.value)}
                      className={`w-full text-xs font-bold rounded px-2 py-1.5 border appearance-none cursor-pointer focus:outline-none transition-colors ${getSelectClass(fData.adiantamento)}`}
                    >
                      <option value=""></option>
                      <option value="A CONSULTAR">A CONSULTAR</option>
                      <option value="NÃO TEM">NÃO TEM</option>
                      <option value="OK">OK</option>
                    </select>
                  </td>

                  <td className="px-2 py-2 border-r border-slate-800/50">
                    <select 
                      value={fData.recibo || ''}
                      onChange={(e) => updateFechamento(emp.id, 'recibo', e.target.value)}
                      className={`w-full text-xs font-bold rounded px-2 py-1.5 border appearance-none cursor-pointer focus:outline-none transition-colors ${getSelectClass(fData.recibo)}`}
                    >
                      <option value=""></option>
                      <option value="PENDENTE">PENDENTE</option>
                      <option value="OK">OK</option>
                    </select>
                  </td>

                  <td className="px-2 py-2 border-r border-slate-800/50">
                    <select 
                      value={fData.fgts || ''}
                      onChange={(e) => updateFechamento(emp.id, 'fgts', e.target.value)}
                      className={`w-full text-xs font-bold rounded px-2 py-1.5 border appearance-none cursor-pointer focus:outline-none transition-colors ${getSelectClass(fData.fgts)}`}
                    >
                      <option value=""></option>
                      <option value="PENDENTE">PENDENTE</option>
                      <option value="OK">OK</option>
                    </select>
                  </td>

                  <td className="px-2 py-2 border-r border-slate-800/50">
                    <select 
                      value={fData.dctf || ''}
                      onChange={(e) => updateFechamento(emp.id, 'dctf', e.target.value)}
                      className={`w-full text-xs font-bold rounded px-2 py-1.5 border appearance-none cursor-pointer focus:outline-none transition-colors ${getSelectClass(fData.dctf)}`}
                    >
                      <option value=""></option>
                      <option value="PENDENTE">PENDENTE</option>
                      <option value="OK">OK</option>
                    </select>
                  </td>

                  <td className="px-2 py-2 border-r border-slate-800/50">
                    <div className="flex items-center gap-1">
                      <select 
                        value={fData.guiaSindicatoLaboral || ''}
                        onChange={(e) => updateFechamento(emp.id, 'guiaSindicatoLaboral', e.target.value)}
                        className={`w-full text-xs font-bold rounded px-2 py-1.5 border appearance-none cursor-pointer focus:outline-none transition-colors ${getSelectClass(fData.guiaSindicatoLaboral)}`}
                      >
                        <option value=""></option>
                        <option value="PENDENTE">PENDENTE</option>
                        <option value="OK">OK</option>
                      </select>
                      <button
                        onClick={() => {
                          const selStr = tpl.guiaSindicatoLaboralMeses || '';
                          const selArr = selStr ? selStr.split(',').map(Number) : [];
                          setMesesModalData({ empresaId: emp.id, tipo: 'LABORAL', selected: selArr });
                          setIsMesesModalOpen(true);
                        }}
                        className="p-1.5 hover:bg-slate-700 rounded text-slate-400 hover:text-slate-200 transition-colors"
                        title="Configurar Meses"
                      >
                        ⚙️
                      </button>
                    </div>
                  </td>

                  <td className="px-2 py-2 border-r border-slate-800/50">
                    <div className="flex items-center gap-1">
                      <select 
                        value={fData.guiaSindicatoPatronal || ''}
                        onChange={(e) => updateFechamento(emp.id, 'guiaSindicatoPatronal', e.target.value)}
                        className={`w-full text-xs font-bold rounded px-2 py-1.5 border appearance-none cursor-pointer focus:outline-none transition-colors ${getSelectClass(fData.guiaSindicatoPatronal)}`}
                      >
                        <option value=""></option>
                        <option value="PENDENTE">PENDENTE</option>
                        <option value="OK">OK</option>
                      </select>
                      <button
                        onClick={() => {
                          const selStr = tpl.guiaSindicatoPatronalMeses || '';
                          const selArr = selStr ? selStr.split(',').map(Number) : [];
                          setMesesModalData({ empresaId: emp.id, tipo: 'PATRONAL', selected: selArr });
                          setIsMesesModalOpen(true);
                        }}
                        className="p-1.5 hover:bg-slate-700 rounded text-slate-400 hover:text-slate-200 transition-colors"
                        title="Configurar Meses"
                      >
                        ⚙️
                      </button>
                    </div>
                  </td>

                  <td className="px-2 py-2 border-r border-slate-800/50">
                    <select 
                      value={fData.verificarEnvio || ''}
                      onChange={(e) => updateFechamento(emp.id, 'verificarEnvio', e.target.value)}
                      className={`w-full text-xs font-bold rounded px-2 py-1.5 border appearance-none cursor-pointer focus:outline-none transition-colors ${getSelectClass(fData.verificarEnvio)}`}
                    >
                      <option value=""></option>
                      <option value="PENDENTE">PENDENTE</option>
                      <option value="NÃO ENVIAMOS">NÃO ENVIAMOS</option>
                      <option value="OK">OK</option>
                    </select>
                  </td>

                  <td className="px-2 py-2 border-r border-slate-800/50">
                    <input 
                      type="text"
                      value={fData.observacoes || ''}
                      onChange={(e) => updateFechamento(emp.id, 'observacoes', e.target.value)}
                      placeholder="Obs..."
                      className="w-48 bg-slate-900 border border-slate-700 text-slate-200 rounded px-3 py-1.5 text-xs focus:outline-none focus:border-emerald-500 transition-colors"
                    />
                  </td>

                  <td className="px-2 py-2 border-r border-slate-800/50">
                    <input 
                      type="text"
                      value={fData.contatos || ''}
                      onChange={(e) => updateFechamento(emp.id, 'contatos', e.target.value)}
                      placeholder="Contatos..."
                      className="w-48 bg-slate-900 border border-slate-700 text-slate-200 rounded px-3 py-1.5 text-xs focus:outline-none focus:border-emerald-500 transition-colors"
                    />
                  </td>

                  <td className="px-2 py-2 border-r border-slate-800/50">
                    <select 
                      value={fData.tipoFolha || ''}
                      onChange={(e) => updateFechamento(emp.id, 'tipoFolha', e.target.value)}
                      className={`w-full text-xs font-bold rounded px-2 py-1.5 border appearance-none cursor-pointer focus:outline-none transition-colors ${fData.tipoFolha ? 'bg-slate-800 text-slate-300 border-slate-600' : 'bg-slate-900 text-slate-500 border-slate-800'}`}
                    >
                      <option value=""></option>
                      <option value="FUNCIONÁRIOS">FUNCIONÁRIOS</option>
                      <option value="PRO LABORE">PRO LABORE</option>
                    </select>
                  </td>

                  <td className="px-3 py-2 text-xs text-slate-500 font-mono whitespace-nowrap">
                    {(fData as any).updatedAt ? format((fData as any).updatedAt, "dd/MM 'às' HH:mm") : '-'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile Card Layout */}
      <div className="md:hidden flex flex-col space-y-4 p-4 flex-1 overflow-y-auto custom-scrollbar">
        {filteredEmpresas.map((emp, index) => {
          const fDataRaw = fechamentos[emp.id] || {};
          const tpl = emp.fechamentoTemplate || {};
          
          
    const mesAtualIdx = currentMonth.getMonth();
    const labMeses = tpl.guiaSindicatoLaboralMeses ? tpl.guiaSindicatoLaboralMeses.split(',').map(Number) : [];
    const isLabMes = labMeses.includes(mesAtualIdx);
    const defaultLabStatus = isLabMes ? 'PENDENTE' : 'OK';

    const patMeses = tpl.guiaSindicatoPatronalMeses ? tpl.guiaSindicatoPatronalMeses.split(',').map(Number) : [];
    const isPatMes = patMeses.includes(mesAtualIdx);
    const defaultPatStatus = isPatMes ? 'PENDENTE' : 'OK';

const fData = isEditMode ? tpl : {
            lancamento: fDataRaw.lancamento ?? tpl.lancamento,
            consignado: fDataRaw.consignado ?? tpl.consignado,
            adiantamento: fDataRaw.adiantamento ?? tpl.adiantamento,
            recibo: fDataRaw.recibo ?? tpl.recibo,
            fgts: fDataRaw.fgts ?? tpl.fgts,
            dctf: fDataRaw.dctf ?? tpl.dctf,
            guiaSindicatoLaboral: fDataRaw.guiaSindicatoLaboral ?? (fDataRaw.guiaSindicato ?? defaultLabStatus),
            guiaSindicatoPatronal: fDataRaw.guiaSindicatoPatronal ?? defaultPatStatus,
            verificarEnvio: fDataRaw.verificarEnvio ?? tpl.verificarEnvio,
            observacoes: fDataRaw.observacoes ?? tpl.observacoes,
            contatos: fDataRaw.contatos ?? tpl.contatos,
            tipoFolha: fDataRaw.tipoFolha ?? tpl.tipoFolha,
            updatedAt: fDataRaw.updatedAt
          };

          const renderSelect = (field: string, label: string, options: string[]) => (
            <div className="flex flex-col space-y-1">
              <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">{label}</label>
              <select 
                value={(fData as any)[field] || ''}
                onChange={(e) => updateFechamento(emp.id, field, e.target.value)}
                className={`w-full text-xs font-bold rounded px-2 py-2 border appearance-none cursor-pointer focus:outline-none transition-colors ${getSelectClass((fData as any)[field])}`}
              >
                <option value=""></option>
                {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </div>
          );

          return (
            <div key={emp.id} className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 flex flex-col space-y-4">
              <div className="flex items-start justify-between border-b border-slate-700/50 pb-3">
                <div className="flex-1 min-w-0 pr-4">
                  <h3 className="font-bold text-slate-200 text-sm truncate">{emp.nome}</h3>
                  <p className="text-xs text-slate-500 font-mono mt-0.5">{emp.cnpj}</p>
                </div>
                <div className="flex flex-col items-center space-y-1 shrink-0 bg-slate-900/50 rounded-lg p-1 border border-slate-700/50">
                  <button 
                    onClick={() => moveEmpresa(index, 'UP')}
                    disabled={index === 0 || isUpdatingOrder || searchTerm !== ''}
                    className="text-slate-600 hover:text-emerald-400 disabled:opacity-20 disabled:hover:text-slate-600 p-1"
                  >
                    <ArrowUp className="w-3 h-3" />
                  </button>
                  <span className="text-[10px] font-bold text-slate-400">#{index + 1}</span>
                  <button 
                    onClick={() => moveEmpresa(index, 'DOWN')}
                    disabled={index === sortedEmpresas.length - 1 || isUpdatingOrder || searchTerm !== ''}
                    className="text-slate-600 hover:text-emerald-400 disabled:opacity-20 disabled:hover:text-slate-600 p-1"
                  >
                    <ArrowDown className="w-3 h-3" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {renderSelect('lancamento', 'Inf. Lançamento', ['PENDENTE (PONTO/COMISSÃO)', 'AGUARDANDO RESPOSTA', 'SEM LANÇAMENTO', 'INFORMADO (VER COLUNA K)', 'PENDENTE DE SOLICITAÇÃO', 'OK'])}
                {renderSelect('consignado', 'Empréstimo', ['A CONSULTAR', 'NÃO TEM', 'OK'])}
                {renderSelect('adiantamento', 'Adiantamento', ['A CONSULTAR', 'NÃO TEM', 'OK'])}
                {renderSelect('recibo', 'Recibo', ['PENDENTE', 'OK'])}
                {renderSelect('fgts', 'FGTS', ['PENDENTE', 'OK'])}
                {renderSelect('dctf', 'DCTF', ['PENDENTE', 'OK'])}
                
                <div className="flex flex-col space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Sind. Laboral</label>
                  <div className="flex items-center gap-1">
                    <select 
                      value={fData.guiaSindicatoLaboral || ''}
                      onChange={(e) => updateFechamento(emp.id, 'guiaSindicatoLaboral', e.target.value)}
                      className={`w-full text-xs font-bold rounded px-2 py-2 border appearance-none cursor-pointer focus:outline-none transition-colors ${getSelectClass(fData.guiaSindicatoLaboral)}`}
                    >
                      <option value=""></option>
                      <option value="PENDENTE">PENDENTE</option>
                      <option value="OK">OK</option>
                    </select>
                    <button
                      onClick={() => {
                        const selStr = tpl.guiaSindicatoLaboralMeses || '';
                        const selArr = selStr ? selStr.split(',').map(Number) : [];
                        setMesesModalData({ empresaId: emp.id, tipo: 'LABORAL', selected: selArr });
                        setIsMesesModalOpen(true);
                      }}
                      className="p-2 hover:bg-slate-700 rounded text-slate-400 hover:text-slate-200 transition-colors"
                    >
                      ⚙️
                    </button>
                  </div>
                </div>

                <div className="flex flex-col space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Sind. Patronal</label>
                  <div className="flex items-center gap-1">
                    <select 
                      value={fData.guiaSindicatoPatronal || ''}
                      onChange={(e) => updateFechamento(emp.id, 'guiaSindicatoPatronal', e.target.value)}
                      className={`w-full text-xs font-bold rounded px-2 py-2 border appearance-none cursor-pointer focus:outline-none transition-colors ${getSelectClass(fData.guiaSindicatoPatronal)}`}
                    >
                      <option value=""></option>
                      <option value="PENDENTE">PENDENTE</option>
                      <option value="OK">OK</option>
                    </select>
                    <button
                      onClick={() => {
                        const selStr = tpl.guiaSindicatoPatronalMeses || '';
                        const selArr = selStr ? selStr.split(',').map(Number) : [];
                        setMesesModalData({ empresaId: emp.id, tipo: 'PATRONAL', selected: selArr });
                        setIsMesesModalOpen(true);
                      }}
                      className="p-2 hover:bg-slate-700 rounded text-slate-400 hover:text-slate-200 transition-colors"
                    >
                      ⚙️
                    </button>
                  </div>
                </div>

                {renderSelect('verificarEnvio', 'Verificar Envio', ['PENDENTE', 'NÃO ENVIAMOS', 'OK'])}
                {renderSelect('tipoFolha', 'Tipo', ['FUNCIONÁRIOS', 'PRO LABORE'])}
              </div>

              <div className="flex flex-col space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Observações</label>
                <input 
                  type="text"
                  value={fData.observacoes || ''}
                  onChange={(e) => updateFechamento(emp.id, 'observacoes', e.target.value)}
                  placeholder="Obs..."
                  className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded px-3 py-2 text-xs focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>

              <div className="flex flex-col space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Contatos</label>
                <input 
                  type="text"
                  value={fData.contatos || ''}
                  onChange={(e) => updateFechamento(emp.id, 'contatos', e.target.value)}
                  placeholder="Contatos..."
                  className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded px-3 py-2 text-xs focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>

              {(fData as any).updatedAt && (
                <div className="text-[10px] text-slate-500 font-mono text-right pt-2 border-t border-slate-700/50">
                  Atualizado em: {format((fData as any).updatedAt, "dd/MM 'às' HH:mm")}
                </div>
              )}
            </div>
          );
        })}
      </div>
      {isMesesModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 p-6 rounded-xl w-full max-w-sm">
            <h3 className="text-lg font-bold text-slate-200 mb-4">
              Configurar Meses - Guia Sindicato {mesesModalData.tipo === 'LABORAL' ? 'Laboral' : 'Patronal'}
            </h3>
            
            <div className="flex flex-wrap gap-2 mb-6">
              <button
                onClick={() => setMesesModalData(prev => ({ ...prev, selected: prev.selected.length === 12 ? [] : [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] }))}
                className="w-full py-1 text-xs font-bold text-slate-400 border border-slate-700 rounded hover:bg-slate-800 transition-colors mb-2"
              >
                {mesesModalData.selected.length === 12 ? 'Desmarcar Todos' : 'Marcar Todos'}
              </button>
              {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(m => (
                <label key={m} className="flex items-center space-x-2 text-sm text-slate-300 bg-slate-800/50 px-3 py-2 rounded-lg cursor-pointer border border-slate-700/50 flex-1 min-w-[30%]">
                  <input
                    type="checkbox"
                    checked={mesesModalData.selected.includes(m)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setMesesModalData(prev => ({ ...prev, selected: [...prev.selected, m] }));
                      } else {
                        setMesesModalData(prev => ({ ...prev, selected: prev.selected.filter(x => x !== m) }));
                      }
                    }}
                    className="rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-emerald-500"
                  />
                  <span className="capitalize">{format(new Date(2024, m, 1), 'MMM', { locale: ptBR })}</span>
                </label>
              ))}
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setIsMesesModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-slate-300 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={saveMeses}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-bold rounded-lg transition-colors"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
