import React, { useState, useEffect, useRef } from 'react';
import { db } from './lib/firebase';
import { collection, onSnapshot, query, addDoc, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { CalendarEvent, Empresa, Sindicato, ScheduleFrequency } from './types';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus, Trash2, Edit2, X, Clock, AlertTriangle, Search, Briefcase, Building2, Globe, Upload, Loader2 } from 'lucide-react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isToday, getDay, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { getTrimmedPdfBase64 } from './pdfUtils';
import UnifiedAddModal from './components/UnifiedAddModal';

export default function CalendarioApp() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [sindicatos, setSindicatos] = useState<Sindicato[]>([]);
  const [filterEmpresaId, setFilterEmpresaId] = useState<string>('ALL');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Partial<CalendarEvent> | null>(null);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const handleSaveProcess = async (data: any) => {
    const isSindicato = sindicatos.some(s => s.id === data.empresaId);
    await addDoc(collection(db, 'checklistRules'), {
      taskName: data.taskName,
      type: data.processType,
      targetType: isSindicato ? 'SPECIFIC_SINDICATO' : 'SPECIFIC_EMPRESA',
      targetId: data.empresaId,
      frequency: 'CONSULTA',
      createdAt: Date.now()
    });
  };

  const handleSaveFixo = async (data: any) => {
    const emp = empresas.find(e => e.id === data.empresaId);
    const sind = sindicatos.find(s => s.id === data.empresaId);
    const nome = emp ? emp.nome : (sind ? sind.nome : '');
    
    await addDoc(collection(db, 'calendarEvents'), {
      title: data.taskName,
      date: Date.now(),
      empresaId: data.empresaId,
      empresaNome: nome,
      type: 'RECORRENTE',
      isRecurrent: true,
      recurrentDay: data.dayValue,
      recurrentMonth: data.monthValue,
      recurrentRule: data.frequency,
      status: 'ATIVO',
      createdAt: Date.now()
    });
  };

  const handleSaveCalendario = async (data: any) => {
    const emp = empresas.find(e => e.id === data.empresaId);
    const sind = sindicatos.find(s => s.id === data.empresaId);
    const nome = emp ? emp.nome : (sind ? sind.nome : '');

    let finalSpecificDate = data.specificDate;
    let eventDate = Date.now();
    
    if (data.calendarDateType === 'CALCULADA') {
       let d = new Date(data.calcYear, data.calcMonth, data.calcDay);
       if (d.getDay() === 6) d.setDate(d.getDate() - 1);
       else if (d.getDay() === 0) d.setDate(d.getDate() - 2);
       finalSpecificDate = format(d, 'yyyy-MM-dd');
    }

    if (finalSpecificDate) {
      const parts = finalSpecificDate.split('-');
      if (parts.length === 3) {
        eventDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2])).getTime();
      }
    }
    await addDoc(collection(db, 'calendarEvents'), {
      title: data.taskName,
      date: eventDate,
      empresaId: data.empresaId,
      empresaNome: nome,
      type: 'PRAZO',
      isRecurrent: false,
      specificDate: finalSpecificDate,
      status: 'ATIVO',
      createdAt: Date.now()
    });
  };

  const handleSaveAviso = async (data: any) => {
    const emp = empresas.find(e => e.id === data.empresaId);
    const sind = sindicatos.find(s => s.id === data.empresaId);
    const nome = emp ? emp.nome : (sind ? sind.nome : '');

    let targetDate = new Date();
    let dataInicioStr = data.dataInicio;
    
    if (data.tipoCalculo === 'DIAS') {
        const parts = data.dataInicio.split('-');
        if (parts.length === 3) {
           targetDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        }
        targetDate.setDate(targetDate.getDate() + data.dias);
    } else {
        const parts = data.dataFim.split('-');
        if (parts.length === 3) {
            targetDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        }
    }
    
    await addDoc(collection(db, 'calendarEvents'), {
      title: `Aviso Prévio: ${data.nome}`,
      description: `Término do aviso prévio (Início: ${dataInicioStr.split('-').reverse().join('/')}).`,
      date: targetDate.getTime(),
      type: 'AVISO_PREVIO',
      empresaId: data.empresaId,
      empresaNome: nome,
      status: 'ATIVO',
      createdAt: Date.now()
    });
  };

  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean, action: () => void, message: string } | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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
    // We fetch all events for now as the calendar needs to compute recurrent events effectively
    // and we want to ensure we don't miss global events that don't match the query bounds
    const qEvents = query(collection(db, 'calendarEvents'));
    
    const unsubEvents = onSnapshot(qEvents, (snapshot) => {
      setEvents(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as CalendarEvent)));
    });

    return () => {
      unsubEvents();
    };
  }, [currentDate]);

  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const startDate = new Date(monthStart);
  startDate.setDate(startDate.getDate() - startDate.getDay()); // Start on Sunday
  const endDate = new Date(monthEnd);
  if (endDate.getDay() !== 6) {
    endDate.setDate(endDate.getDate() + (6 - endDate.getDay())); // End on Saturday
  }

  const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });

  const openEventModal = (date: Date, event?: CalendarEvent) => {
    if (event) {
      setEditingEvent(event);
    } else {
      setEditingEvent({ 
        title: '', 
        description: '', 
        date: date.getTime(),
        type: 'MEETING'
      });
    }
    setSelectedDate(date);
    setIsModalOpen(true);
  };

  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEvent?.title || !editingEvent.date) return;

    // Attach empresaNome if applicable
    let empresaNome = '';
    if (editingEvent.empresaId) {
      const emp = empresas.find(e => e.id === editingEvent.empresaId);
      if (emp) {
        empresaNome = emp.nome;
      } else {
        const sind = sindicatos.find(s => s.id === editingEvent.empresaId);
        if (sind) empresaNome = sind.nome;
      }
    }

    const payload: any = {
      ...editingEvent,
    };
    if (empresaNome) {
      payload.empresaNome = empresaNome;
    }


    if (editingEvent.id) {
      await updateDoc(doc(db, 'calendarEvents', editingEvent.id), payload as any);
    } else {
      await addDoc(collection(db, 'calendarEvents'), {
        ...payload,
        createdAt: Date.now()
      });
    }
    setIsModalOpen(false);
  };

  const handleDeleteEvent = async (id: string) => {
    setConfirmModal({
      isOpen: true,
      message: 'Tem certeza que deseja excluir este evento?',
      action: async () => {
        await deleteDoc(doc(db, 'calendarEvents', id));
        setConfirmModal(null);
        setIsModalOpen(false);
      }
    });
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'MEETING': return 'bg-blue-500/20 text-blue-400 border-blue-500/50';
      case 'DEADLINE': return 'bg-red-500/20 text-red-400 border-red-500/50';
      case 'REMINDER': return 'bg-amber-500/20 text-amber-400 border-amber-500/50';
      case 'HOLIDAY': return 'bg-purple-500/20 text-purple-400 border-purple-500/50';
      default: return 'bg-slate-500/20 text-slate-400 border-slate-500/50';
    }
  };

  const filteredEmpresas = empresas.filter(e => e.nome.toLowerCase().includes(searchTerm.toLowerCase()));
  const filteredSindicatos = sindicatos.filter(s => s.nome.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="flex-1 w-full max-w-6xl mx-auto p-6 md:p-8 flex flex-col h-full animate-in fade-in zoom-in-95 duration-200">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <h1 className="text-3xl font-medium text-indigo-400 tracking-wider uppercase flex items-center space-x-3">
          <CalendarIcon className="w-8 h-8" />
          <span>Calendário DP</span>
        </h1>
        
        <div className="flex flex-col md:flex-row items-center space-y-4 md:space-y-0 md:space-x-4">
          <div className="relative w-full md:w-80" ref={dropdownRef}>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input 
                type="text"
                placeholder={filterEmpresaId === 'ALL' ? 'Calendário Geral' : (empresas.find(e => e.id === filterEmpresaId)?.nome || sindicatos.find(s => s.id === filterEmpresaId)?.nome || 'Buscar...')}
                value={searchTerm}
                onFocus={() => setIsDropdownOpen(true)}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setIsDropdownOpen(true);
                }}
                className="w-full bg-slate-900 border border-slate-700/50 text-slate-200 rounded-xl pl-9 pr-8 py-2.5 focus:outline-none focus:border-indigo-500 transition-colors"
              />
              {filterEmpresaId !== 'ALL' && !searchTerm && (
                <button 
                  onClick={() => { setFilterEmpresaId('ALL'); setSearchTerm(''); }}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-200"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {isDropdownOpen && (
              <div className="absolute top-full mt-2 right-0 w-full md:w-96 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl z-50 max-h-80 overflow-y-auto custom-scrollbar">
                <button
                  className="w-full text-left px-3 py-3 hover:bg-slate-700 text-slate-200 transition-colors flex items-center space-x-2 border-b border-slate-700/50"
                  onClick={() => {
                    setFilterEmpresaId('ALL');
                    setIsDropdownOpen(false);
                    setSearchTerm('');
                  }}
                >
                  <Globe className="w-4 h-4 text-slate-400" />
                  <span className="font-medium">Calendário Geral</span>
                </button>

                {filteredEmpresas.length > 0 && (
                  <div className="p-2">
                    <div className="text-xs font-bold text-slate-500 uppercase tracking-widest px-3 py-2">Empresas</div>
                    {filteredEmpresas.map((emp) => (
                      <button
                        key={emp.id}
                        className="w-full text-left px-3 py-2 hover:bg-slate-700 rounded-lg text-slate-200 transition-colors flex items-center space-x-2"
                        onClick={() => {
                          setFilterEmpresaId(emp.id!);
                          setIsDropdownOpen(false);
                          setSearchTerm('');
                        }}
                      >
                        <Briefcase className="w-4 h-4 text-indigo-400 shrink-0" />
                        <span className="truncate">{emp.nome}</span>
                      </button>
                    ))}
                  </div>
                )}
                {filteredSindicatos.length > 0 && (
                  <div className="p-2 border-t border-slate-700/50">
                    <div className="text-xs font-bold text-slate-500 uppercase tracking-widest px-3 py-2">Sindicatos</div>
                    {filteredSindicatos.map((sind) => (
                      <button
                        key={sind.id}
                        className="w-full text-left px-3 py-2 hover:bg-slate-700 rounded-lg text-slate-200 transition-colors flex items-center space-x-2"
                        onClick={() => {
                          setFilterEmpresaId(sind.id!);
                          setIsDropdownOpen(false);
                          setSearchTerm('');
                        }}
                      >
                        <Building2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span className="truncate">{sind.nome}</span>
                      </button>
                    ))}
                  </div>
                )}
                {filteredEmpresas.length === 0 && filteredSindicatos.length === 0 && (
                  <div className="p-4 text-center text-sm text-slate-500">Nenhum resultado encontrado.</div>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center space-x-4 bg-slate-900 border border-slate-700/50 p-2 rounded-xl">
            <button onClick={prevMonth} className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="text-lg font-bold text-slate-200 min-w-[150px] text-center capitalize">
              {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
            </span>
            <button onClick={nextMonth} className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-colors flex items-center justify-center space-x-2 shadow-lg h-full"
          >
            <Plus className="w-5 h-5" />
            <span>Adicionar</span>
          </button>
        </div>
      </div>

      <div className="flex-1 bg-slate-900 border border-slate-700/50 rounded-2xl overflow-hidden flex flex-col shadow-2xl">
        <div className="grid grid-cols-7 border-b border-slate-800 bg-slate-950/50">
          {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
            <div key={day} className="py-4 text-center text-xs font-bold text-slate-500 uppercase tracking-widest border-r border-slate-800 last:border-0">
              {day}
            </div>
          ))}
        </div>
        
        <div className="flex-1 grid grid-cols-7 grid-rows-5 lg:grid-rows-auto">
          {calendarDays.map((day, idx) => {
            const isCurrentMonth = isSameMonth(day, currentDate);
            const dayEvents = events.filter(e => {
              let matchDate = false;
              if (e.isRecurrent) {
                if (e.recurrentRule === 'DAILY') {
                  matchDate = true;
                } else if (e.recurrentRule === 'WEEKLY') {
                  matchDate = getDay(day) === getDay(new Date(e.date));
                } else if (e.recurrentRule === 'NEAR_5' || e.recurrentRule === 'NEAR_20' || e.recurrentRule === 'NEAR_30') {
                  let target = e.recurrentRule === 'NEAR_5' ? 5 : (e.recurrentRule === 'NEAR_20' ? 20 : 30);
                  let targetDate = new Date(day.getFullYear(), day.getMonth(), target);
                  
                  let dayOfWeek = getDay(targetDate);
                  if (dayOfWeek === 6) targetDate = subDays(targetDate, 1);
                  else if (dayOfWeek === 0) targetDate = subDays(targetDate, 2);
                  
                  matchDate = targetDate.getDate() === day.getDate();
                } else if (e.recurrentRule === 'YEARLY') {
                  matchDate = (e.recurrentDay === day.getDate() && e.recurrentMonth === day.getMonth());
                } else {
                  // MONTHLY_EXACT or fallback
                  matchDate = (e.recurrentDay === day.getDate());
                }
              } else {
                matchDate = isSameDay(new Date(e.date), day);
              }

              if (!matchDate) return false;

              if (filterEmpresaId === 'ALL') return true;

              // Check if event belongs directly to the selected empresa
              if (e.empresaId === filterEmpresaId) return true;

              // Check if event belongs to the sindicato of the selected empresa
              const currentEmpresa = empresas.find(emp => emp.id === filterEmpresaId);
              if (currentEmpresa && currentEmpresa.sindicatoId && e.empresaId === currentEmpresa.sindicatoId) {
                return true;
              }

              return false;
            });
            
            return (
              <div 
                key={day.toISOString()} 
                className={`min-h-[120px] p-2 border-r border-b border-slate-800 relative group transition-colors hover:bg-slate-800/30
                  ${!isCurrentMonth ? 'bg-slate-950/30' : ''}
                  ${idx % 7 === 6 ? 'border-r-0' : ''}
                `}
                onClick={() => openEventModal(day)}
              >
                <div className="flex justify-between items-start mb-2">
                  <span className={`w-8 h-8 flex items-center justify-center rounded-full text-sm font-medium
                    ${isToday(day) ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 
                      !isCurrentMonth ? 'text-slate-600' : 'text-slate-300'
                    }
                  `}>
                    {format(day, 'd')}
                  </span>
                  
                  <button 
                    className="p-1 text-slate-500 hover:text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity rounded"
                    onClick={(e) => { e.stopPropagation(); openEventModal(day); }}
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                
                <div className="space-y-1 overflow-y-auto max-h-[80px] custom-scrollbar pr-1">
                  {dayEvents.map(event => {
                    const isSindicatoEvent = !!sindicatos.find(s => s.id === event.empresaId);
                    return (
                    <div 
                      key={event.id}
                      onClick={(e) => { e.stopPropagation(); openEventModal(day, event); }}
                      className={`text-[10px] sm:text-xs px-2 py-1 rounded border cursor-pointer hover:opacity-80 transition-opacity ${getTypeColor(event.type)} flex flex-col`}
                      title={event.title + (event.empresaNome ? ` - ${event.empresaNome}` : '')}
                    >
                      <div className="font-medium truncate">{event.title}</div>
                      {event.empresaNome && <div className="text-[9px] opacity-75 truncate">{event.empresaNome}</div>}
                      {isSindicatoEvent && filterEmpresaId !== 'ALL' && (
                        <div className="text-[8px] font-bold uppercase mt-0.5 bg-black/20 rounded px-1 w-max">Via Sindicato</div>
                      )}
                    </div>
                  )})}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Event Modal */}
      {isModalOpen && editingEvent && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700/50 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center shrink-0">
              <h2 className="text-lg font-medium text-slate-200">
                {editingEvent.id ? 'Editar Evento' : 'Novo Registro'} 
                <span className="text-slate-500 text-sm ml-2 font-normal">
                  ({selectedDate && format(selectedDate, 'dd/MM/yyyy')})
                </span>
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-500 hover:text-slate-300 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="overflow-y-auto custom-scrollbar">
                <form onSubmit={handleSaveEvent} className="p-6 space-y-4">
                  {editingEvent.id && !!sindicatos.find(s => s.id === editingEvent.empresaId) && (
                    <div className="bg-amber-500/10 border border-amber-500/20 p-3 rounded-xl flex items-start space-x-3 text-amber-400 mb-4">
                      <AlertTriangle className="w-5 h-5 shrink-0" />
                      <p className="text-xs leading-relaxed">
                        Este evento foi herdado de um Sindicato. Modificá-lo ou excluí-lo afetará todas as empresas vinculadas a este Sindicato. 
                        <strong> Recomendamos não alterar.</strong>
                      </p>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Título do Evento *</label>
                    <input 
                      type="text" 
                      required 
                      value={editingEvent.title || ''} 
                      onChange={e => setEditingEvent({...editingEvent, title: e.target.value})} 
                      className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-lg px-4 py-3 focus:outline-none focus:border-indigo-500 transition-colors" 
                      placeholder="Ex: Reunião Sindicato"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Tipo de Evento</label>
                    <select 
                      value={editingEvent.type || 'MEETING'} 
                      onChange={e => setEditingEvent({...editingEvent, type: e.target.value as any})} 
                      className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-lg px-4 py-3 focus:outline-none focus:border-indigo-500 transition-colors"
                    >
                      <option value="DEADLINE">Prazo / Vencimento</option>
                      <option value="MEETING">Reunião</option>
                      <option value="REMINDER">Lembrete</option>
                      <option value="HOLIDAY">Feriado</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Empresa ou Sindicato (Opcional)</label>
                    <select 
                      value={editingEvent.empresaId || ''} 
                      onChange={e => setEditingEvent({...editingEvent, empresaId: e.target.value})} 
                      className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-lg px-4 py-3 focus:outline-none focus:border-indigo-500 transition-colors"
                    >
                      <option value="">Geral (Nenhuma)</option>
                      <optgroup label="Empresas">
                        {empresas.map(emp => (
                          <option key={emp.id} value={emp.id}>{emp.nome}</option>
                        ))}
                      </optgroup>
                      <optgroup label="Sindicatos">
                        {sindicatos.map(s => (
                          <option key={s.id} value={s.id}>{s.nome}</option>
                        ))}
                      </optgroup>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Descrição (Opcional)</label>
                    <textarea 
                      value={editingEvent.description || ''} 
                      onChange={e => setEditingEvent({...editingEvent, description: e.target.value})} 
                      className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-lg px-4 py-3 focus:outline-none focus:border-indigo-500 transition-colors h-24 resize-none"
                      placeholder="Detalhes adicionais..."
                    />
                  </div>
                  
                  <div className="pt-4 flex justify-between border-t border-slate-800 mt-4">
                    {editingEvent.id ? (
                      <button type="button" onClick={() => handleDeleteEvent(editingEvent.id!)} className="text-red-500 hover:text-red-400 p-2 transition-colors">
                        <Trash2 className="w-5 h-5" />
                      </button>
                    ) : <div></div>}
                    <div className="flex space-x-3">
                      <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 text-slate-400 hover:text-slate-200 font-medium transition-colors">Cancelar</button>
                      <button type="submit" className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2.5 rounded-lg font-medium transition-colors shadow-lg shadow-indigo-500/20">Salvar</button>
                    </div>
                  </div>
                </form>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Modal */}
      {confirmModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700/50 rounded-2xl w-full max-w-sm shadow-2xl p-6">
            <div className="flex items-center space-x-3 text-red-400 mb-4">
              <AlertTriangle className="w-6 h-6" />
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

      <UnifiedAddModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        empresas={empresas}
        sindicatos={sindicatos}
        initialEmpresaId={filterEmpresaId === 'ALL' ? undefined : filterEmpresaId}
        processTabs={[
          { id: 'FOLHA', label: 'Folha de Pagamento' },
          { id: 'FERIAS', label: 'Férias' },
          { id: 'RESCISAO', label: 'Rescisão' }
        ]}
        onSaveProcess={handleSaveProcess}
        onSaveFixo={handleSaveFixo}
        onSaveCalendario={handleSaveCalendario}
        onSaveAviso={handleSaveAviso}
      />
    </div>
  );
}