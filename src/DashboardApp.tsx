import React, { useState, useEffect } from 'react';
import { Sparkles, ArrowRight, Loader2, CheckCircle2, AlertCircle, CalendarDays, Bell } from 'lucide-react';
import { db } from './lib/firebase';
import { collection, addDoc, getDocs, onSnapshot, query, orderBy } from 'firebase/firestore';
import { CalendarEvent } from './types';
import { format, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function DashboardApp() {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ type: 'success'|'error', message: string, details?: any } | null>(null);
  const [lembretes, setLembretes] = useState<CalendarEvent[]>([]);

  useEffect(() => {
    // Fetch upcoming lembretes (not recurrent, just single date events for simplicity)
    const q = query(collection(db, 'calendarEvents'), orderBy('date', 'asc'));
    const unsub = onSnapshot(q, (snapshot) => {
      const allEvents = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as CalendarEvent));
      const upcoming = allEvents
        .filter(e => !e.isRecurrent && Number(e.date) >= Date.now() - 24 * 60 * 60 * 1000)
        .sort((a, b) => Number(a.date) - Number(b.date))
        .slice(0, 10);
      setLembretes(upcoming);
    });
    return () => unsub();
  }, []);

  const handleAICommand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setLoading(true);
    setResult(null);
    try {
      const empresasSnapshot = await getDocs(collection(db, 'empresas'));
      const empresas = empresasSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      const sindicatosSnapshot = await getDocs(collection(db, 'sindicatos'));
      const sindicatos = sindicatosSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      const response = await fetch('/api/ai-command', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ prompt, context: { empresas, sindicatos } })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Erro ao processar comando AI');
      }

      if (data.details) {
        const { intent, parameters } = data.details;
        if (intent === 'CREATE_CALENDAR_EVENT' && parameters) {
          await addDoc(collection(db, 'calendarEvents'), {
            ...parameters,
            createdAt: Date.now()
          });
        } else if (intent === 'CREATE_CHECKLIST_RULE' && parameters) {
          await addDoc(collection(db, 'checklistRules'), {
            ...parameters,
            createdAt: Date.now()
          });
        }
      }

      setResult({
        type: 'success',
        message: data.message || 'Comando executado com sucesso.',
        details: data.details
      });
      setPrompt('');
    } catch (err: any) {
      setResult({
        type: 'error',
        message: err.message
      });
    } finally {
      setLoading(false);
    }
  };

  const hojeLembretes = lembretes.filter(l => isToday(new Date(l.date)));
  const proximosLembretes = lembretes.filter(l => !isToday(new Date(l.date)));

  return (
    <div className="flex-1 w-full max-w-7xl mx-auto p-6 md:p-8 flex flex-col lg:flex-row gap-8 h-full animate-in fade-in zoom-in-95 duration-200">
      
      {/* Esquerda: Assistente IA */}
      <div className="flex-[2] bg-slate-900 border border-slate-700/50 rounded-2xl p-6 md:p-10 shadow-2xl flex flex-col relative overflow-hidden h-[calc(100vh-8rem)] lg:h-auto min-h-[500px]">
        {/* Background Decoration */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-64 h-64 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col h-full">
          <div className="mb-8">
            <h2 className="text-2xl font-medium text-slate-200 flex items-center space-x-3">
              <Sparkles className="w-6 h-6 text-indigo-400" />
              <span>Assistente IA do DP</span>
            </h2>
            <p className="text-slate-400 mt-2 max-w-2xl">
              Use linguagem natural para interagir com o sistema. Ex: <span className="text-indigo-300">"Quais empresas estão vinculadas ao Sindicato X?"</span> ou <span className="text-indigo-300">"Gere os recibos do mês passado para a Empresa Y"</span>.
            </p>
          </div>

          <div className="flex-1 flex flex-col justify-end">
            
            {result && (
              <div className={`mb-6 p-5 rounded-xl border ${result.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-red-500/10 border-red-500/30 text-red-300'} animate-in slide-in-from-bottom-2`}>
                <div className="flex items-start space-x-3">
                  {result.type === 'success' ? <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" /> : <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />}
                  <div>
                    <p className="font-medium">{result.message}</p>
                    {result.details && (
                      <pre className="mt-3 p-3 bg-black/20 rounded-lg text-xs overflow-x-auto font-mono text-slate-300">
                        {JSON.stringify(result.details, null, 2)}
                      </pre>
                    )}
                  </div>
                </div>
              </div>
            )}

            <form onSubmit={handleAICommand} className="relative mt-auto">
              <div className="relative flex items-center">
                <div className="absolute left-4 text-slate-500">
                  <Sparkles className="w-5 h-5" />
                </div>
                <input
                  type="text"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  disabled={loading}
                  placeholder="O que você precisa que eu faça?"
                  className="w-full bg-slate-950 border border-slate-700 text-slate-200 rounded-2xl pl-12 pr-16 py-4 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-lg placeholder-slate-600 disabled:opacity-50 shadow-inner"
                />
                <button
                  type="submit"
                  disabled={loading || !prompt.trim()}
                  className="absolute right-2 p-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-500 disabled:opacity-50 disabled:hover:bg-indigo-600 transition-colors shadow-lg"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ArrowRight className="w-5 h-5" />}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Direita: Lembretes */}
      <div className="flex-1 flex flex-col space-y-6">
        
        {/* Lembretes de Hoje */}
        <div className={`bg-emerald-950/30 border border-emerald-900/50 p-6 rounded-2xl flex flex-col shadow-lg relative overflow-hidden shrink-0 ${hojeLembretes.length === 0 ? 'items-center text-center' : ''}`}>
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
          
          <h3 className={`text-emerald-400 text-sm font-bold tracking-widest uppercase mb-4 flex items-center space-x-2 relative z-10 w-full ${hojeLembretes.length === 0 ? 'justify-center' : ''}`}>
            <Bell className="w-5 h-5" />
            <span>Para Hoje</span>
          </h3>
          
          <div className={`relative z-10 w-full flex flex-col items-center justify-center ${hojeLembretes.length === 0 ? '' : 'space-y-3'}`}>
            {hojeLembretes.length === 0 ? (
              <div className="py-6 flex flex-col items-center justify-center border border-dashed border-emerald-800/30 rounded-xl bg-emerald-900/10 w-full">
                <p className="text-emerald-500/70 text-sm font-medium">Nenhum compromisso para hoje.</p>
              </div>
            ) : (
              hojeLembretes.map(lembrete => (
                <div key={lembrete.id} className="bg-emerald-900/40 rounded-xl p-4 border border-emerald-500/30 flex flex-col gap-1 shadow-sm">
                  <span className="font-semibold text-emerald-100 text-base">{lembrete.title}</span>
                  {lembrete.empresaNome && <span className="text-sm text-emerald-300/80">{lembrete.empresaNome}</span>}
                  <span className="text-xs text-emerald-400/60 mt-1 uppercase font-semibold tracking-wider">
                    HOJE
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Próximos Lembretes */}
        <div className="bg-slate-900 border border-slate-700/50 p-6 rounded-2xl flex flex-col flex-1 shadow-lg">
          <h3 className="text-slate-400 text-sm font-bold tracking-widest uppercase mb-4 flex items-center space-x-2">
            <CalendarDays className="w-5 h-5" />
            <span>Próximos Lembretes</span>
          </h3>
          
          <div className="space-y-3 flex-1 overflow-y-auto custom-scrollbar pr-2 min-h-[200px] max-h-[400px] lg:max-h-full">
            {proximosLembretes.length === 0 ? (
              <p className="text-slate-500 text-sm">Nenhum lembrete futuro.</p>
            ) : (
              proximosLembretes.map(lembrete => (
                <div key={lembrete.id} className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50 flex flex-col gap-1 transition-colors hover:bg-slate-800">
                  <span className="font-medium text-slate-200 text-base">{lembrete.title}</span>
                  {lembrete.empresaNome && <span className="text-sm text-slate-400">{lembrete.empresaNome}</span>}
                  <div className="mt-2">
                    <span className="px-2 py-1 bg-indigo-500/10 text-indigo-400 rounded text-xs font-semibold border border-indigo-500/20">
                      {format(new Date(lembrete.date), "dd 'de' MMMM", { locale: ptBR })}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
        
      </div>

    </div>
  );
}