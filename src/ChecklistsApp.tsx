import React, { useState, useEffect, useRef } from 'react';
import { db } from './lib/firebase';
import { collection, onSnapshot, query, where, addDoc, deleteDoc, doc, setDoc } from 'firebase/firestore';
import { Empresa, Sindicato, ChecklistRule, CalendarEvent, ScheduleFrequency } from './types';
import { CheckSquare, Plus, Trash2, Calendar, FileText, Briefcase, Building2, AlertCircle, Search, Clock, CheckCircle2, X, ChevronLeft, ChevronRight, Pencil } from 'lucide-react';
import { format, addMonths, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ChecklistsAppProps {
  onEditEntity?: (id: string, type: 'EMPRESA' | 'SINDICATO') => void;
}

export default function ChecklistsApp({ onEditEntity }: ChecklistsAppProps) {
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [sindicatos, setSindicatos] = useState<Sindicato[]>([]);
  
  const [selectedEntity, setSelectedEntity] = useState<{ id: string, type: 'EMPRESA' | 'SINDICATO', nome: string } | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [checklistRules, setChecklistRules] = useState<ChecklistRule[]>([]);
  
  const [activeProcessType, setActiveProcessType] = useState<string>('RESCISAO');
  const [currentRecurrentMonth, setCurrentRecurrentMonth] = useState(new Date());
  const [recurrentCompletions, setRecurrentCompletions] = useState<{ [eventId: string]: number }>({});
  
  const [isNewCategoryModalOpen, setIsNewCategoryModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  const [isAddItemModalOpen, setIsAddItemModalOpen] = useState(false);
  const [isAvisoModalOpen, setIsAvisoModalOpen] = useState(false);
  const [avisoData, setAvisoData] = useState({ 
    nome: '',
    dataInicio: format(new Date(), 'yyyy-MM-dd'),
    tipoCalculo: 'DIAS' as 'DIAS' | 'DATA',
    dias: 30,
    dataFim: ''
  });
  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean, action: () => void, message: string } | null>(null);

  const handleLancarAviso = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEntity || !avisoData.nome) return;
    
    let targetDate = new Date();
    let dataInicioStr = avisoData.dataInicio;
    
    if (avisoData.tipoCalculo === 'DIAS') {
        const parts = avisoData.dataInicio.split('-');
        if (parts.length === 3) {
           targetDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        }
        targetDate.setDate(targetDate.getDate() + avisoData.dias);
    } else {
        const parts = avisoData.dataFim.split('-');
        if (parts.length === 3) {
            targetDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        }
    }
    
    await addDoc(collection(db, 'calendarEvents'), {
      title: `Aviso Prévio: ${avisoData.nome}`,
      description: `Término do aviso prévio (Início: ${dataInicioStr.split('-').reverse().join('/')}).`,
      date: targetDate.getTime(),
      type: 'AVISO_PREVIO',
      empresaId: selectedEntity.id,
      empresaNome: selectedEntity.nome,
      status: 'ATIVO',
      createdAt: Date.now()
    });
    
    setIsAvisoModalOpen(false);
    setAvisoData({ 
      nome: '',
      dataInicio: format(new Date(), 'yyyy-MM-dd'),
      tipoCalculo: 'DIAS',
      dias: 30,
      dataFim: ''
    });
  };

  const [transientChecks, setTransientChecks] = useState<Record<string, boolean>>({});

  const [newItem, setNewItem] = useState<{
    taskName: string,
    addType: 'processo' | 'fixo' | 'calendario',
    processType: string,
    frequency: ScheduleFrequency,
    dayValue: number,
    monthValue: number,
    specificDate: string,
    calendarDateType: 'EXATA' | 'CALCULADA',
    calcDay: number,
    calcMonth: number,
    calcYear: number
  }>({
    taskName: '',
    addType: 'processo',
    processType: 'RESCISAO',
    frequency: 'MONTHLY_EXACT',
    dayValue: 5,
    monthValue: 0,
    specificDate: format(new Date(), 'yyyy-MM-dd'),
    calendarDateType: 'EXATA',
    calcDay: 5,
    calcMonth: new Date().getMonth(),
    calcYear: new Date().getFullYear()
  });

  useEffect(() => {
    const unsubEmpresas = onSnapshot(collection(db, 'empresas'), (snapshot) => {
      setEmpresas(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Empresa)));
    });
    const unsubSindicatos = onSnapshot(collection(db, 'sindicatos'), (snapshot) => {
      setSindicatos(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Sindicato)));
    });
    return () => {
      unsubEmpresas();
      unsubSindicatos();
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!selectedEntity) {
      setCalendarEvents([]);
      setChecklistRules([]);
      return;
    }

    const qEvents = query(collection(db, 'calendarEvents'));
    const unsubEvents = onSnapshot(qEvents, (snapshot) => {
      const allEvents = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as CalendarEvent));
      // If we selected a Sindicato, show events tied strictly to that sindicato id.
      // If we selected an Empresa, show events tied to that empresa id OR tied to that empresa's sindicatoId.
      let filteredEvents = allEvents;
      if (selectedEntity.type === 'SINDICATO') {
        filteredEvents = allEvents.filter(e => e.empresaId === selectedEntity.id);
      } else {
        const empresaData = empresas.find(e => e.id === selectedEntity.id);
        const sindicatoId = empresaData?.sindicatoId;
        filteredEvents = allEvents.filter(e => e.empresaId === selectedEntity.id || (sindicatoId && e.empresaId === sindicatoId));
      }
      setCalendarEvents(filteredEvents);
    });

    const qRulesTarget = query(collection(db, 'checklistRules'));
    const unsubRulesTarget = onSnapshot(qRulesTarget, (snapshot) => {
      const allRules = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ChecklistRule));
      let filteredRules = allRules;
      if (selectedEntity.type === 'SINDICATO') {
        filteredRules = allRules.filter(r => r.targetId === selectedEntity.id);
      } else {
        const empresaData = empresas.find(e => e.id === selectedEntity.id);
        const sindicatoId = empresaData?.sindicatoId;
        filteredRules = allRules.filter(r => r.targetId === selectedEntity.id || (sindicatoId && r.targetId === sindicatoId));
      }
      setChecklistRules(filteredRules);
    });

    return () => {
      unsubEvents();
      unsubRulesTarget();
    };
  }, [selectedEntity]);

  useEffect(() => {
    if (!selectedEntity) {
      setRecurrentCompletions({});
      return;
    }
    const monthKey = format(currentRecurrentMonth, 'yyyy-MM');
    const qCompletions = query(collection(db, 'recurrentCompletions'), where('monthKey', '==', monthKey));
    
    const unsub = onSnapshot(qCompletions, (snapshot) => {
      const completions: { [eventId: string]: number } = {};
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        // Since we query by monthKey, we just need to match the eventId for the selected entity (which is handled in the UI filter, or we can just load all completions for this month and let the UI match by event id).
        // It's safe to load all for the monthKey as the count won't be massive in a typical SMB app, or we could add targetId to the query.
        completions[data.eventId] = data.completedAt;
      });
      setRecurrentCompletions(completions);
    });

    return () => unsub();
  }, [selectedEntity, currentRecurrentMonth]);

  const toggleRecurrentCompletion = async (eventId: string, isCompleted: boolean) => {
    const monthKey = format(currentRecurrentMonth, 'yyyy-MM');
    if (isCompleted) {
      await deleteDoc(doc(db, 'recurrentCompletions', `${eventId}_${monthKey}`));
    } else {
      await setDoc(doc(db, 'recurrentCompletions', `${eventId}_${monthKey}`), {
        eventId,
        monthKey,
        completedAt: Date.now(),
        createdAt: Date.now()
      });
    }
  };


  const handleAddCategory = () => {
    if (!newCategoryName.trim() || !selectedEntity) return;
    
    // We just simulate creating a category by adding a placeholder rule, or we can just rely on the active tab state if we don't need persistence yet.
    // For robust persistence of categories without a separate collection, we will add a special checklistRule that acts as a category placeholder.
    addDoc(collection(db, 'checklistRules'), {
      taskName: '___CATEGORY_PLACEHOLDER___',
      type: newCategoryName.trim().toUpperCase(),
      targetType: selectedEntity.type === 'EMPRESA' ? 'SPECIFIC_EMPRESA' : 'SPECIFIC_SINDICATO',
      targetId: selectedEntity.id,
      createdAt: Date.now(),
      frequency: 'CONSULTA'
    });
    
    setActiveProcessType(newCategoryName.trim().toUpperCase());
    setIsNewCategoryModalOpen(false);
    setNewCategoryName('');
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItem.taskName || !selectedEntity) return;

    if (newItem.addType === 'processo') {
      await addDoc(collection(db, 'checklistRules'), {
        taskName: newItem.taskName,
        type: newItem.processType,
        targetType: selectedEntity.type === 'EMPRESA' ? 'SPECIFIC_EMPRESA' : 'SPECIFIC_SINDICATO',
        targetId: selectedEntity.id,
        frequency: 'CONSULTA',
        createdAt: Date.now()
      });
    } else if (newItem.addType === 'fixo') {
      await addDoc(collection(db, 'calendarEvents'), {
        title: newItem.taskName,
        date: Date.now(),
        empresaId: selectedEntity.id,
        empresaNome: selectedEntity.nome,
        type: 'RECORRENTE',
        isRecurrent: true,
        recurrentDay: newItem.dayValue,
        recurrentMonth: newItem.monthValue,
        recurrentRule: newItem.frequency,
        status: 'ATIVO',
        createdAt: Date.now()
      });
    } else if (newItem.addType === 'calendario') {
      let finalSpecificDate = newItem.specificDate;
      let eventDate = Date.now();
      
      if (newItem.calendarDateType === 'CALCULADA') {
         let d = new Date(newItem.calcYear, newItem.calcMonth, newItem.calcDay);
         // Antecipar fim de semana
         if (d.getDay() === 6) { // Sábado
            d.setDate(d.getDate() - 1);
         } else if (d.getDay() === 0) { // Domingo
            d.setDate(d.getDate() - 2);
         }
         finalSpecificDate = format(d, 'yyyy-MM-dd');
      }

      if (finalSpecificDate) {
        const parts = finalSpecificDate.split('-');
        if (parts.length === 3) {
          eventDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2])).getTime();
        }
      }
      await addDoc(collection(db, 'calendarEvents'), {
        title: newItem.taskName,
        date: eventDate,
        empresaId: selectedEntity.id,
        empresaNome: selectedEntity.nome,
        type: 'PRAZO',
        isRecurrent: false,
        specificDate: finalSpecificDate,
        status: 'ATIVO',
        createdAt: Date.now()
      });
    }

    setIsAddItemModalOpen(false);
    setNewItem({ taskName: '', addType: 'processo', processType: activeProcessType, frequency: 'MONTHLY_EXACT', dayValue: 5, monthValue: 0, specificDate: format(new Date(), 'yyyy-MM-dd'), calendarDateType: 'EXATA', calcDay: 5, calcMonth: new Date().getMonth(), calcYear: new Date().getFullYear() });
  };

  const handleDeleteRule = async (id: string, taskName: string) => {
    setConfirmModal({
      isOpen: true,
      message: 'Remover este item do checklist?',
      action: async () => {
        await deleteDoc(doc(db, 'checklistRules', id));
        
        // Also attempt to clean up associated calendar event if any
        // We will match it by the taskName
        const matchingEvent = calendarEvents.find(e => e.title === taskName && (e.type === 'RECORRENTE' || e.type === 'PRAZO'));
        if (matchingEvent) {
          await deleteDoc(doc(db, 'calendarEvents', matchingEvent.id));
        }
        setConfirmModal(null);
      }
    });
  };

  const nextMonths = [0, 1, 2].map(i => addMonths(new Date(), i));

  // Determine dynamic tabs
  const baseTabs = [
    { id: 'RESCISAO', label: 'Rescisão' },
    { id: 'FOLHA', label: 'Folha Mensal' },
    { id: 'FERIAS', label: 'Férias' }
  ];
  const customTabIds = Array.from(new Set(checklistRules.map(r => r.type))).filter(t => !baseTabs.find(b => b.id === t));
  const allTabs = [...baseTabs, ...customTabIds.map(id => ({ id, label: id }))];

  const toggleTransientCheck = (ruleId: string) => {
    setTransientChecks(prev => ({
      ...prev,
      [ruleId]: !prev[ruleId]
    }));
  };

  const currentProcessRules = checklistRules.filter(r => r.type === activeProcessType && r.taskName !== '___CATEGORY_PLACEHOLDER___' && r.frequency === 'CONSULTA');

  const filteredEmpresas = empresas.filter(e => e.nome.toLowerCase().includes(searchTerm.toLowerCase()));
  const filteredSindicatos = sindicatos.filter(s => s.nome.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="flex-1 w-full max-w-7xl mx-auto p-6 md:p-8 flex flex-col h-full animate-in fade-in zoom-in-95 duration-200">
      <div className="flex items-center space-x-3 mb-8">
        <CheckSquare className="w-8 h-8 text-indigo-400" />
        <h1 className="text-3xl font-medium text-indigo-400 tracking-wider uppercase">Programação e Processos</h1>
      </div>

      <div className="bg-slate-900 border border-slate-700/50 p-6 rounded-2xl mb-8 flex flex-col md:flex-row items-center gap-6 shadow-xl relative" ref={dropdownRef}>
        <div className="flex-1 w-full relative">
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
            Buscar Empresa ou Sindicato
          </label>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input 
              type="text"
              placeholder="Digite para buscar..."
              value={searchTerm}
              onFocus={() => setIsDropdownOpen(true)}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setIsDropdownOpen(true);
              }}
              className="w-full bg-slate-950 border border-slate-700 text-slate-200 rounded-xl pl-12 pr-4 py-3 focus:outline-none focus:border-indigo-500 text-lg transition-colors"
            />
          </div>

          {isDropdownOpen && (
            <div className="absolute top-full mt-2 left-0 w-full bg-slate-800 border border-slate-700 rounded-xl shadow-2xl z-50 max-h-80 overflow-y-auto custom-scrollbar">
              {filteredEmpresas.length > 0 && (
                <div className="p-2">
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-widest px-3 py-2">Empresas</div>
                  {filteredEmpresas.map((emp, i) => (
                    <button
                      key={emp.id || `emp-${i}`}
                      className="w-full text-left px-3 py-2 hover:bg-slate-700 rounded-lg text-slate-200 transition-colors flex items-center space-x-2"
                      onClick={() => {
                        setSelectedEntity({ id: emp.id, type: 'EMPRESA', nome: emp.nome });
                        setIsDropdownOpen(false);
                        setSearchTerm('');
                      }}
                    >
                      <Briefcase className="w-4 h-4 text-indigo-400" />
                      <span>{emp.nome}</span>
                    </button>
                  ))}
                </div>
              )}
              {filteredSindicatos.length > 0 && (
                <div className="p-2 border-t border-slate-700/50">
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-widest px-3 py-2">Sindicatos</div>
                  {filteredSindicatos.map((sind, i) => (
                    <button
                      key={sind.id || `sind-${i}`}
                      className="w-full text-left px-3 py-2 hover:bg-slate-700 rounded-lg text-slate-200 transition-colors flex items-center space-x-2"
                      onClick={() => {
                        setSelectedEntity({ id: sind.id, type: 'SINDICATO', nome: sind.nome });
                        setIsDropdownOpen(false);
                        setSearchTerm('');
                      }}
                    >
                      <Building2 className="w-4 h-4 text-emerald-400" />
                      <span>{sind.nome}</span>
                    </button>
                  ))}
                </div>
              )}
              {filteredEmpresas.length === 0 && filteredSindicatos.length === 0 && (
                <div className="p-6 text-center text-slate-500">Nenhum resultado encontrado.</div>
              )}
            </div>
          )}
        </div>
        
        {selectedEntity && (
          <div className="flex items-center space-x-3 bg-indigo-500/10 text-indigo-400 px-6 py-4 rounded-xl border border-indigo-500/20 shrink-0">
            {selectedEntity.type === 'EMPRESA' ? <Briefcase className="w-6 h-6" /> : <Building2 className="w-6 h-6" />}
            <div>
              <p className="text-xs uppercase tracking-wider opacity-80">Selecionado</p>
              <p className="font-bold text-lg">{selectedEntity.nome}</p>
            </div>
            <div className="flex items-center space-x-1 ml-4 border-l border-indigo-500/20 pl-4">
              {onEditEntity && (
                <button onClick={() => onEditEntity(selectedEntity.id, selectedEntity.type)} title="Editar Cadastro" className="p-1.5 hover:bg-indigo-500/20 rounded-lg transition-colors">
                  <Pencil className="w-4 h-4" />
                </button>
              )}
              <button onClick={() => setSelectedEntity(null)} title="Limpar Seleção" className="p-1.5 hover:bg-indigo-500/20 rounded-lg transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {!selectedEntity ? (
        <div className="flex-1 flex flex-col items-center justify-center bg-slate-900 border border-slate-700/50 rounded-2xl p-10 opacity-60">
          <CheckSquare className="w-16 h-16 text-slate-700 mb-4" />
          <p className="text-slate-400 text-lg">Busque e selecione uma empresa ou sindicato acima para visualizar a programação.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 flex-1 min-h-0">
          
          {/* Left Column: Schedule & Fixed */}
          <div className="lg:col-span-4 flex flex-col space-y-6">
            <h2 className="text-xl font-medium text-slate-200 flex items-center space-x-2">
              <Calendar className="w-5 h-5 text-indigo-400" />
              <span>Programação & Fixos</span>
            </h2>

            <div className="bg-slate-900 border border-slate-700/50 rounded-2xl overflow-hidden flex flex-col flex-1 shadow-xl">
              <div className="p-4 border-b border-slate-800 bg-slate-950/50 flex flex-col gap-3">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Obrigações Fixas</h3>
                  <span className="bg-indigo-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">{calendarEvents.filter(e => e.isRecurrent).length}</span>
                </div>
                <div className="flex items-center justify-between bg-slate-900 border border-slate-700/50 rounded-lg p-1">
                  <button onClick={() => setCurrentRecurrentMonth(subMonths(currentRecurrentMonth, 1))} className="p-1 text-slate-400 hover:text-slate-200 transition-colors">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-sm font-bold text-slate-300 capitalize">{format(currentRecurrentMonth, 'MMMM yyyy', { locale: ptBR })}</span>
                  <button onClick={() => setCurrentRecurrentMonth(addMonths(currentRecurrentMonth, 1))} className="p-1 text-slate-400 hover:text-slate-200 transition-colors">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="p-4 space-y-3 overflow-y-auto max-h-[350px] custom-scrollbar">
                {calendarEvents.filter(e => e.isRecurrent).length === 0 && (
                  <p className="text-slate-500 text-sm italic">Nenhum evento programado.</p>
                )}
                {calendarEvents.filter(e => e.isRecurrent).map((event, i) => {
                  const isCompleted = !!recurrentCompletions[event.id];
                  const completedAt = recurrentCompletions[event.id];
                  const isFromSindicato = selectedEntity?.type === 'EMPRESA' && event.empresaId !== selectedEntity.id;

                  return (
                    <div key={event.id || `recurrent-${i}`} className={`bg-slate-800/50 border border-slate-700 rounded-lg p-3 flex flex-col group transition-colors ${isCompleted ? 'border-emerald-500/50 bg-emerald-500/5' : ''}`}>
                      <div className="flex justify-between items-start">
                        <div className="flex items-start space-x-3">
                          <button 
                            onClick={() => toggleRecurrentCompletion(event.id, isCompleted)}
                            className={`mt-0.5 w-5 h-5 shrink-0 rounded flex items-center justify-center border transition-colors ${isCompleted ? 'bg-emerald-500 border-emerald-500' : 'border-slate-500 hover:border-indigo-400'}`}
                          >
                            {isCompleted && <CheckSquare className="w-3 h-3 text-white" />}
                          </button>
                          <div>
                            <p className={`text-sm font-medium flex items-center flex-wrap gap-2 ${isCompleted ? 'text-slate-400 line-through' : 'text-slate-200'}`}>
                              <span>{event.title}</span>
                              {isFromSindicato && (
                                <span className="text-[9px] font-bold bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded uppercase tracking-wider border border-emerald-500/20">Via Sindicato</span>
                              )}
                            </p>
                          </div>
                        </div>
                        <span className="bg-indigo-500/20 text-indigo-300 text-[10px] font-bold px-2 py-1 rounded uppercase whitespace-nowrap ml-2">
                          {event.recurrentRule === 'NEAR_5' ? 'Prox. Dia 05' : 
                           event.recurrentRule === 'NEAR_30' ? 'Prox. Dia 30' : 
                           event.recurrentRule === 'WEEKLY' ? 'Semanal' :
                           event.recurrentRule === 'DAILY' ? 'Diário' :
                           `Todo dia ${event.recurrentDay}`}
                        </span>
                      </div>
                      {isCompleted && completedAt && (
                        <div className="mt-2 pl-8 flex items-center space-x-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                          <span className="text-[10px] text-emerald-500 font-medium">Marcado em {format(new Date(completedAt), "dd/MM/yyyy 'às' HH:mm")}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="p-4 border-y border-slate-800 bg-slate-950/50 mt-auto">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Próximos Meses (Avulsos)</h3>
              </div>
              <div className="p-4 space-y-4 overflow-y-auto max-h-[300px] custom-scrollbar">
                {nextMonths.map((month, i) => (
                  <div key={`month-${i}-${month.toISOString()}`} className="space-y-2">
                    <h4 className="text-xs font-bold text-slate-500 uppercase">{format(month, 'MMMM yyyy', { locale: ptBR })}</h4>
                    <div className="space-y-2 pl-2 border-l border-slate-700">
                       {calendarEvents.filter(e => !e.isRecurrent && new Date(e.date).getMonth() === month.getMonth() && new Date(e.date).getFullYear() === month.getFullYear()).map((event, j) => {
                         const isFromSindicato = selectedEntity?.type === 'EMPRESA' && event.empresaId !== selectedEntity.id;
                         return (
                         <div key={event.id || `avulso-${i}-${j}`} className="text-sm flex items-center">
                           <span className="text-slate-300 font-medium">{format(new Date(event.date), 'dd/MM')}</span>
                           <span className="text-slate-500 mx-2">-</span>
                           <span className="text-slate-400">{event.title}</span>
                           {isFromSindicato && (
                             <span className="ml-2 text-[9px] font-bold bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded uppercase tracking-wider border border-emerald-500/20">Via Sindicato</span>
                           )}
                         </div>
                         );
                       })}
                       {calendarEvents.filter(e => !e.isRecurrent && new Date(e.date).getMonth() === month.getMonth() && new Date(e.date).getFullYear() === month.getFullYear()).length === 0 && (
                         <p className="text-slate-600 text-xs italic">Sem eventos específicos.</p>
                       )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Process Checklists */}
          <div className="lg:col-span-8 flex flex-col min-h-0">
            <h2 className="text-xl font-medium text-slate-200 flex items-center space-x-2 mb-6">
              <FileText className="w-5 h-5 text-emerald-400" />
              <span>Checklists de Processo</span>
            </h2>

            {/* Horizontal Tabs */}
            <div className="flex items-center space-x-2 mb-6 overflow-x-auto custom-scrollbar pb-2">
              {allTabs.map((tab, i) => (
                <button
                  key={tab.id || `tab-${i}`}
                  onClick={() => setActiveProcessType(tab.id)}
                  className={`px-6 py-3 rounded-xl font-bold tracking-wide transition-all whitespace-nowrap ${
                    activeProcessType === tab.id 
                      ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/20' 
                      : 'bg-slate-900 text-slate-400 hover:bg-slate-800 border border-slate-700/50'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
              <button
                onClick={() => setIsNewCategoryModalOpen(true)}
                className="px-4 py-3 rounded-xl border border-dashed border-slate-600 text-slate-400 hover:text-slate-200 hover:border-slate-400 transition-colors flex items-center space-x-2 shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span className="text-sm font-bold">Novo</span>
              </button>
            </div>

            <div className="flex-1 bg-slate-900 border border-slate-700/50 rounded-2xl p-6 shadow-xl flex flex-col">
              
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 mb-6 flex items-start space-x-4">
                <AlertCircle className="w-6 h-6 text-emerald-500 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="text-emerald-400 font-medium mb-1">Padrão de Qualidade: {activeProcessType}</h3>
                  <p className="text-slate-400 text-sm">
                    Configure os itens de checklist (consultas/conferências) e obrigações programadas para a categoria selecionada na entidade <strong>{selectedEntity.nome}</strong>.
                  </p>
                </div>
                <div className="flex flex-col space-y-2">
                  <button
                    onClick={() => {
                      setNewItem(prev => ({ ...prev, addType: 'processo', processType: activeProcessType }));
                      setIsAddItemModalOpen(true);
                    }}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors flex items-center justify-center space-x-2 whitespace-nowrap shadow-lg w-full"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Adicionar Item</span>
                  </button>
                  {activeProcessType === 'RESCISAO' && (
                    <button
                      onClick={() => setIsAvisoModalOpen(true)}
                      className="bg-amber-600/20 hover:bg-amber-600/30 text-amber-500 border border-amber-600/50 px-4 py-2 rounded-lg text-sm font-bold transition-colors flex items-center justify-center space-x-2 whitespace-nowrap shadow-lg w-full"
                    >
                      <Clock className="w-4 h-4" />
                      <span>Lançar Aviso Prévio</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-3">
                {currentProcessRules.map((rule, i) => {
                  const isChecked = !!transientChecks[rule.id];
                  const isFromSindicato = selectedEntity?.type === 'EMPRESA' && rule.targetId !== selectedEntity.id;
                  return (
                  <div key={rule.id || `rule-${i}`} className={`flex items-center justify-between bg-slate-800/50 border border-slate-700/50 p-4 rounded-xl group transition-colors ${isChecked ? 'border-emerald-500/50 bg-emerald-500/5' : 'hover:border-emerald-500/30'}`}>
                    <div className="flex items-start space-x-4">
                      <button 
                        onClick={() => toggleTransientCheck(rule.id)}
                        className={`mt-0.5 w-5 h-5 shrink-0 rounded flex items-center justify-center border transition-colors ${isChecked ? 'bg-emerald-500 border-emerald-500' : 'border-slate-500 hover:border-indigo-400'}`}
                      >
                        {isChecked && <CheckSquare className="w-3 h-3 text-white" />}
                      </button>
                      <div>
                        <span className={`font-medium flex items-center flex-wrap gap-2 transition-colors ${isChecked ? 'text-slate-500 line-through' : 'text-slate-200'}`}>
                          <span>{rule.taskName}</span>
                          {isFromSindicato && (
                            <span className="text-[9px] font-bold bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded uppercase tracking-wider border border-emerald-500/20">Via Sindicato</span>
                          )}
                        </span>
                      </div>
                    </div>
                    {!isFromSindicato && (
                      <button 
                        onClick={() => handleDeleteRule(rule.id, rule.taskName || '')}
                        className="text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity p-2"
                        title="Remover Item"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                  );
                })}
                {currentProcessRules.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-16 text-slate-500">
                    <FileText className="w-12 h-12 mb-4 opacity-50" />
                    <p>Nenhum item configurado para este processo.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New Category Modal */}
      {isNewCategoryModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700/50 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center">
              <h2 className="text-lg font-medium text-slate-200">Novo Processo (Checklist)</h2>
              <button onClick={() => setIsNewCategoryModalOpen(false)} className="text-slate-500 hover:text-slate-300 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Nome da Categoria *</label>
                <input type="text" autoFocus required placeholder="Ex: Admissão, Afastamento..." value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-lg px-4 py-3 focus:outline-none focus:border-emerald-500 transition-colors" />
              </div>
              <div className="pt-4 flex justify-end space-x-3">
                <button onClick={() => setIsNewCategoryModalOpen(false)} className="px-5 py-2.5 text-slate-400 hover:text-slate-200 font-medium transition-colors">Cancelar</button>
                <button onClick={handleAddCategory} disabled={!newCategoryName.trim()} className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white px-6 py-2.5 rounded-lg font-medium transition-colors">Criar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Item Modal */}
      {isAddItemModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700/50 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center">
              <h2 className="text-lg font-medium text-slate-200">Adicionar Item ao Checklist</h2>
              <button onClick={() => setIsAddItemModalOpen(false)} className="text-slate-500 hover:text-slate-300 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddItem} className="p-6 space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Descrição da Tarefa / Conferência *</label>
                <input type="text" autoFocus required placeholder="Ex: Verificar FGTS" value={newItem.taskName} onChange={e => setNewItem({...newItem, taskName: e.target.value})} className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-lg px-4 py-3 focus:outline-none focus:border-emerald-500 transition-colors" />
              </div>

              <div className="bg-slate-950 rounded-xl p-1 border border-slate-800 flex flex-col sm:flex-row gap-1">
                <button
                  type="button"
                  onClick={() => setNewItem({...newItem, addType: 'processo'})}
                  className={`flex-1 py-2 px-2 text-xs font-bold rounded-lg transition-all ${newItem.addType === 'processo' ? 'bg-slate-800 text-emerald-400 shadow-md' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  Checklist de Processo
                </button>
                <button
                  type="button"
                  onClick={() => setNewItem({...newItem, addType: 'fixo'})}
                  className={`flex-1 py-2 px-2 text-xs font-bold rounded-lg transition-all ${newItem.addType === 'fixo' ? 'bg-slate-800 text-indigo-400 shadow-md' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  Obrigação Fixa
                </button>
                <button
                  type="button"
                  onClick={() => setNewItem({...newItem, addType: 'calendario'})}
                  className={`flex-1 py-2 px-2 text-xs font-bold rounded-lg transition-all ${newItem.addType === 'calendario' ? 'bg-slate-800 text-amber-400 shadow-md' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  Calendário
                </button>
              </div>

              {newItem.addType === 'processo' && (
                <div className="bg-emerald-900/10 border border-emerald-500/20 rounded-xl p-4 space-y-4 animate-in slide-in-from-top-2">
                  <div>
                    <label className="block text-xs font-bold text-emerald-400 uppercase tracking-widest mb-2">Processo</label>
                    <select 
                      value={newItem.processType}
                      onChange={e => setNewItem({...newItem, processType: e.target.value})}
                      className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-4 py-2.5 focus:outline-none focus:border-emerald-500"
                    >
                      {allTabs.map((tab, i) => (
                        <option key={tab.id || `opt-${i}`} value={tab.id}>{tab.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {newItem.addType === 'fixo' && (
                <div className="bg-indigo-900/10 border border-indigo-500/20 rounded-xl p-4 space-y-4 animate-in slide-in-from-top-2">
                  <div>
                    <label className="block text-xs font-bold text-indigo-400 uppercase tracking-widest mb-2">Frequência (Recorrente)</label>
                    <select 
                      value={newItem.frequency}
                      onChange={e => setNewItem({...newItem, frequency: e.target.value as ScheduleFrequency})}
                      className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-4 py-2.5 focus:outline-none focus:border-indigo-500"
                    >
                      <option value="MONTHLY_EXACT">Todo dia X do Mês</option>
                      <option value="YEARLY">Anual (Uma vez ao ano)</option>
                      <option value="NEAR_5">Sempre próximo ao Dia 05</option>
                      <option value="NEAR_20">Sempre próximo ao Dia 20</option>
                      <option value="NEAR_30">Sempre próximo ao Dia 30</option>
                      <option value="WEEKLY">Semanal (Toda semana)</option>
                      <option value="DAILY">Diário</option>
                    </select>
                  </div>

                  {(newItem.frequency === 'MONTHLY_EXACT' || newItem.frequency === 'YEARLY') && (
                    <div className="flex gap-3">
                      <div className="flex-1">
                        <label className="block text-xs font-bold text-indigo-400 uppercase tracking-widest mb-2">Dia do Mês</label>
                        <input 
                          type="number" min="1" max="31" required 
                          value={newItem.dayValue} 
                          onChange={e => setNewItem({...newItem, dayValue: parseInt(e.target.value)})}
                          className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-4 py-2.5 focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                      {newItem.frequency === 'YEARLY' && (
                        <div className="flex-1">
                          <label className="block text-xs font-bold text-indigo-400 uppercase tracking-widest mb-2">Mês</label>
                          <select 
                            value={newItem.monthValue} 
                            onChange={e => setNewItem({...newItem, monthValue: parseInt(e.target.value)})}
                            className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-4 py-2.5 focus:outline-none focus:border-indigo-500"
                          >
                            <option value={0}>Janeiro</option>
                            <option value={1}>Fevereiro</option>
                            <option value={2}>Março</option>
                            <option value={3}>Abril</option>
                            <option value={4}>Maio</option>
                            <option value={5}>Junho</option>
                            <option value={6}>Julho</option>
                            <option value={7}>Agosto</option>
                            <option value={8}>Setembro</option>
                            <option value={9}>Outubro</option>
                            <option value={10}>Novembro</option>
                            <option value={11}>Dezembro</option>
                          </select>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {(newItem.frequency === 'NEAR_5' || newItem.frequency === 'NEAR_20' || newItem.frequency === 'NEAR_30') && (
                    <p className="text-xs text-slate-400 flex items-start space-x-2">
                      <AlertCircle className="w-4 h-4 shrink-0 text-indigo-400" />
                      <span>O sistema priorizará alocar esta tarefa de Segunda a Sexta, antecipando caso o dia base caia num fim de semana.</span>
                    </p>
                  )}
                </div>
              )}

              {newItem.addType === 'calendario' && (
                <div className="bg-amber-900/10 border border-amber-500/20 rounded-xl p-4 space-y-4 animate-in slide-in-from-top-2">
                  <div>
                    <label className="block text-xs font-bold text-amber-400 uppercase tracking-widest mb-2">Tipo de Data</label>
                    <div className="flex gap-4">
                      <label className="flex items-center space-x-2 text-slate-300 cursor-pointer">
                        <input type="radio" checked={newItem.calendarDateType === 'EXATA'} onChange={() => setNewItem({...newItem, calendarDateType: 'EXATA'})} className="text-amber-500 focus:ring-amber-500 bg-slate-900 border-slate-700" />
                        <span className="text-sm">Data Exata</span>
                      </label>
                      <label className="flex items-center space-x-2 text-slate-300 cursor-pointer">
                        <input type="radio" checked={newItem.calendarDateType === 'CALCULADA'} onChange={() => setNewItem({...newItem, calendarDateType: 'CALCULADA'})} className="text-amber-500 focus:ring-amber-500 bg-slate-900 border-slate-700" />
                        <span className="text-sm">Dia Fixo (Antecipa FDS)</span>
                      </label>
                    </div>
                  </div>

                  {newItem.calendarDateType === 'EXATA' ? (
                    <div>
                      <label className="block text-xs font-bold text-amber-400 uppercase tracking-widest mb-2">Data Específica</label>
                      <input 
                        type="date" required 
                        value={newItem.specificDate} 
                        onChange={e => setNewItem({...newItem, specificDate: e.target.value})}
                        className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-4 py-2.5 focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex gap-3">
                        <div className="flex-1">
                          <label className="block text-xs font-bold text-amber-400 uppercase tracking-widest mb-2">Dia base</label>
                          <input 
                            type="number" min="1" max="31" required 
                            value={newItem.calcDay} 
                            onChange={e => setNewItem({...newItem, calcDay: parseInt(e.target.value)})}
                            className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-4 py-2.5 focus:outline-none focus:border-amber-500"
                          />
                        </div>
                        <div className="flex-1">
                          <label className="block text-xs font-bold text-amber-400 uppercase tracking-widest mb-2">Mês</label>
                          <select 
                            value={newItem.calcMonth} 
                            onChange={e => setNewItem({...newItem, calcMonth: parseInt(e.target.value)})}
                            className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-4 py-2.5 focus:outline-none focus:border-amber-500"
                          >
                            <option value={0}>Janeiro</option>
                            <option value={1}>Fevereiro</option>
                            <option value={2}>Março</option>
                            <option value={3}>Abril</option>
                            <option value={4}>Maio</option>
                            <option value={5}>Junho</option>
                            <option value={6}>Julho</option>
                            <option value={7}>Agosto</option>
                            <option value={8}>Setembro</option>
                            <option value={9}>Outubro</option>
                            <option value={10}>Novembro</option>
                            <option value={11}>Dezembro</option>
                          </select>
                        </div>
                        <div className="w-24">
                          <label className="block text-xs font-bold text-amber-400 uppercase tracking-widest mb-2">Ano</label>
                          <input 
                            type="number" min="2020" max="2100" required 
                            value={newItem.calcYear} 
                            onChange={e => setNewItem({...newItem, calcYear: parseInt(e.target.value)})}
                            className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-4 py-2.5 focus:outline-none focus:border-amber-500"
                          />
                        </div>
                      </div>
                      <p className="text-xs text-slate-400 flex items-start space-x-2">
                        <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
                        <span>O sistema irá salvar o evento na data mais próxima de segunda a sexta (antecipando se for fim de semana).</span>
                      </p>
                    </div>
                  )}
                </div>
              )}

              <div className="pt-4 border-t border-slate-800">
                <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-4 rounded-lg transition-colors shadow-lg">
                  Salvar Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Aviso Modal */}
      {isAvisoModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700/50 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center">
              <h2 className="text-lg font-medium text-slate-200">Lançar Aviso Prévio</h2>
              <button onClick={() => setIsAvisoModalOpen(false)} className="text-slate-500 hover:text-slate-300 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleLancarAviso} className="p-6 space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Nome do Colaborador *</label>
                <input type="text" autoFocus required placeholder="Ex: João da Silva" value={avisoData.nome} onChange={e => setAvisoData({...avisoData, nome: e.target.value})} className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-lg px-4 py-3 focus:outline-none focus:border-amber-500 transition-colors" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Data de Início *</label>
                <input type="date" required value={avisoData.dataInicio} onChange={e => setAvisoData({...avisoData, dataInicio: e.target.value})} className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-lg px-4 py-3 focus:outline-none focus:border-amber-500 transition-colors" />
              </div>
              
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Calcular término por:</label>
                <div className="flex gap-4 mb-3">
                  <label className="flex items-center space-x-2 text-slate-300 cursor-pointer">
                    <input type="radio" name="tipoCalculo" checked={avisoData.tipoCalculo === 'DIAS'} onChange={() => setAvisoData({...avisoData, tipoCalculo: 'DIAS'})} className="text-amber-500 focus:ring-amber-500 bg-slate-900 border-slate-700" />
                    <span className="text-sm">Dias Corridos</span>
                  </label>
                  <label className="flex items-center space-x-2 text-slate-300 cursor-pointer">
                    <input type="radio" name="tipoCalculo" checked={avisoData.tipoCalculo === 'DATA'} onChange={() => setAvisoData({...avisoData, tipoCalculo: 'DATA'})} className="text-amber-500 focus:ring-amber-500 bg-slate-900 border-slate-700" />
                    <span className="text-sm">Data Específica</span>
                  </label>
                </div>
                
                {avisoData.tipoCalculo === 'DIAS' ? (
                  <input type="number" min="1" required placeholder="Ex: 30" value={avisoData.dias} onChange={e => setAvisoData({...avisoData, dias: parseInt(e.target.value)})} className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-lg px-4 py-3 focus:outline-none focus:border-amber-500 transition-colors" />
                ) : (
                  <input type="date" required value={avisoData.dataFim} onChange={e => setAvisoData({...avisoData, dataFim: e.target.value})} className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-lg px-4 py-3 focus:outline-none focus:border-amber-500 transition-colors" />
                )}
              </div>
              
              <div className="pt-4 border-t border-slate-800">
                <button type="submit" className="w-full bg-amber-600 hover:bg-amber-500 text-white font-bold py-3 px-4 rounded-lg transition-colors shadow-lg flex justify-center items-center space-x-2">
                  <Clock className="w-5 h-5" />
                  <span>Criar Lembrete no Calendário</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Modal */}
      {confirmModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700/50 rounded-2xl w-full max-w-sm shadow-2xl p-6">
            <div className="flex items-center space-x-3 text-red-400 mb-4">
              <AlertCircle className="w-6 h-6" />
              <h2 className="text-lg font-medium">Confirmar Exclusão</h2>
            </div>
            <p className="text-slate-300 mb-6 whitespace-pre-line leading-relaxed">{confirmModal.message}</p>
            <div className="flex justify-end space-x-3">
              <button 
                onClick={() => setConfirmModal(null)}
                className="px-5 py-2.5 text-slate-400 hover:text-slate-200 font-medium transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={confirmModal.action}
                className="bg-red-500/20 text-red-500 hover:bg-red-500 hover:text-white px-5 py-2.5 rounded-lg font-medium transition-colors border border-red-500/50 hover:border-red-500"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
