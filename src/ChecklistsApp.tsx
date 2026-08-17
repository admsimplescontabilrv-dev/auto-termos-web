import React, { useState, useEffect } from 'react';
import { db } from './lib/firebase';
import { collection, query, where, getDocs, addDoc, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { ChecklistItem, ChecklistRule, Empresa } from './types';
import { Plus, Trash2, CheckCircle2, Circle, Save, Settings, X, RefreshCw } from 'lucide-react';

export default function ChecklistsApp() {
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [selectedEmpresa, setSelectedEmpresa] = useState('');
  const [competencia, setCompetencia] = useState('');
  const [activeTab, setActiveTab] = useState<'FOLHA' | 'FERIAS' | 'RESCISAO'>('FOLHA');
  
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [rules, setRules] = useState<ChecklistRule[]>([]);
  const [showRulesModal, setShowRulesModal] = useState(false);

  // Load empresas and rules on mount
  useEffect(() => {
    const fetchData = async () => {
      const empSnapshot = await getDocs(collection(db, 'empresas'));
      setEmpresas(empSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as Empresa)));

      const rulesSnapshot = await getDocs(collection(db, 'checklist_rules'));
      setRules(rulesSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as ChecklistRule)));
    };
    fetchData();
  }, []);

  // Load or generate items when selectedEmpresa, competencia or tab changes
  useEffect(() => {
    if (!selectedEmpresa || !competencia) return;
    loadChecklistItems();
  }, [selectedEmpresa, competencia, activeTab]);

  const loadChecklistItems = async () => {
    setIsLoading(true);
    try {
      const q = query(
        collection(db, 'checklist_items'),
        where('empresaId', '==', selectedEmpresa),
        where('competencia', '==', competencia),
        where('type', '==', activeTab)
      );
      const snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
        setItems(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ChecklistItem)));
      } else {
        // Generate new items based on rules
        const empresa = empresas.find(e => e.id === selectedEmpresa);
        if (!empresa) return;

        const applicableRules = rules.filter(r => {
          if (r.type !== activeTab) return false;
          if (r.competencias && r.competencias.length > 0 && !r.competencias.includes(competencia)) return false;
          
          if (r.targetType === 'GLOBAL') return true;
          if (r.targetType === 'EMPRESA' && r.targetId === empresa.id) return true;
          if (r.targetType === 'SINDICATO' && r.targetId === empresa.sindicatoId) return true;
          return false;
        });

        const newItems: ChecklistItem[] = [];
        for (const rule of applicableRules) {
          const itemData: Omit<ChecklistItem, 'id'> = {
            ruleId: rule.id,
            empresaId: selectedEmpresa,
            competencia,
            type: activeTab,
            description: rule.description,
            status: 'PENDENTE',
            observacao: ''
          };
          const docRef = await addDoc(collection(db, 'checklist_items'), itemData);
          newItems.push({ id: docRef.id, ...itemData });
        }
        setItems(newItems);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleItemStatus = async (item: ChecklistItem) => {
    const newStatus = item.status === 'PENDENTE' ? 'CONCLUIDO' : 'PENDENTE';
    await updateDoc(doc(db, 'checklist_items', item.id), { status: newStatus });
    setItems(items.map(i => i.id === item.id ? { ...i, status: newStatus } : i));
  };

  const updateObservacao = async (item: ChecklistItem, obs: string) => {
    await updateDoc(doc(db, 'checklist_items', item.id), { observacao: obs });
    setItems(items.map(i => i.id === item.id ? { ...i, observacao: obs } : i));
  };

  const forceGenerate = async () => {
    // Refresh rules
    const rulesSnapshot = await getDocs(collection(db, 'checklist_rules'));
    setRules(rulesSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as ChecklistRule)));
    await loadChecklistItems();
  };

  return (
    <div className="flex-1 w-full max-w-7xl mx-auto p-6 md:p-8 flex flex-col h-full">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-serif text-[#C49B4A] tracking-wider">CHECKLISTS</h1>
        <button 
          onClick={() => setShowRulesModal(true)}
          className="flex items-center space-x-2 text-[#C49B4A] hover:text-white border border-[#4A1828] hover:bg-[#4A1828] px-4 py-2 rounded-lg transition-colors text-sm font-bold tracking-widest"
        >
          <Settings className="w-4 h-4" />
          <span>MOTOR DE REGRAS</span>
        </button>
      </div>

      <div className="bg-[#18060B] border border-[#4A1828] p-6 rounded-2xl mb-6 shadow-xl flex flex-col md:flex-row gap-4 items-end">
        <div className="flex-1 w-full">
          <label className="text-[#845a27] text-xs font-bold tracking-widest uppercase mb-2 block">Empresa</label>
          <select 
            value={selectedEmpresa}
            onChange={(e) => setSelectedEmpresa(e.target.value)}
            className="w-full bg-[#0C0305] border border-[#3A1221] text-[#D1A751] rounded-lg px-4 py-3 focus:outline-none focus:border-[#C49B4A]"
          >
            <option value="">Selecione uma empresa...</option>
            {empresas.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
          </select>
        </div>
        <div className="w-full md:w-64">
          <label className="text-[#845a27] text-xs font-bold tracking-widest uppercase mb-2 block">Competência (MM/AAAA)</label>
          <input 
            type="text"
            placeholder="Ex: 08/2026"
            value={competencia}
            onChange={(e) => setCompetencia(e.target.value)}
            className="w-full bg-[#0C0305] border border-[#3A1221] text-[#D1A751] rounded-lg px-4 py-3 focus:outline-none focus:border-[#C49B4A]"
          />
        </div>
        <button onClick={forceGenerate} className="bg-[#2A0B16] text-[#A68759] hover:text-[#C49B4A] p-3 rounded-lg border border-[#3A1221] transition-colors" title="Recarregar">
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#4A1828] mb-6">
        {(['FOLHA', 'FERIAS', 'RESCISAO'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-8 py-3 text-sm font-bold tracking-widest uppercase border-b-2 transition-colors ${
              activeTab === tab ? 'border-[#C49B4A] text-[#C49B4A]' : 'border-transparent text-[#845a27] hover:text-[#A68759]'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {!selectedEmpresa || !competencia ? (
          <div className="flex flex-col items-center justify-center h-40 text-[#A68759]">
            Selecione uma empresa e digite a competência para visualizar o checklist.
          </div>
        ) : isLoading ? (
          <div className="flex flex-col items-center justify-center h-40 text-[#A68759]">
            Carregando itens...
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-[#A68759]">
            Nenhuma regra se aplica para esta seleção.
          </div>
        ) : (
          <div className="space-y-3">
            {items.map(item => (
              <div key={item.id} className={`flex flex-col md:flex-row items-start md:items-center gap-4 p-4 rounded-xl border transition-colors ${
                item.status === 'CONCLUIDO' ? 'bg-[#18060B]/50 border-green-900/50' : 'bg-[#1E0810] border-[#4A1828]'
              }`}>
                <button onClick={() => toggleItemStatus(item)} className="mt-1 md:mt-0 flex-shrink-0">
                  {item.status === 'CONCLUIDO' 
                    ? <CheckCircle2 className="w-6 h-6 text-green-500" />
                    : <Circle className="w-6 h-6 text-[#A68759]" />
                  }
                </button>
                <div className="flex-1 w-full">
                  <p className={`text-sm ${item.status === 'CONCLUIDO' ? 'text-[#845a27] line-through' : 'text-[#D1A751]'}`}>
                    {item.description}
                  </p>
                </div>
                <div className="w-full md:w-1/3">
                  <input
                    type="text"
                    placeholder="Observações (opcional)..."
                    value={item.observacao || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      setItems(items.map(i => i.id === item.id ? { ...i, observacao: val } : i));
                    }}
                    onBlur={(e) => updateObservacao(item, e.target.value)}
                    className="w-full bg-[#0C0305] border border-[#3A1221] text-[#A68759] text-xs rounded-md px-3 py-2 focus:outline-none focus:border-[#C49B4A]"
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showRulesModal && (
         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
           <div className="bg-[#18060B] border border-[#C49B4A] rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
             <div className="flex justify-between items-center p-6 border-b border-[#4A1828]">
               <h2 className="text-[#C49B4A] font-serif tracking-widest text-xl">MOTOR DE REGRAS</h2>
               <button onClick={() => setShowRulesModal(false)} className="text-[#A68759] hover:text-white"><X className="w-6 h-6" /></button>
             </div>
             <div className="flex-1 overflow-auto p-6 text-sm text-[#D1A751]">
               <p className="mb-4 text-[#A68759]">A criação de regras detalhadas ocorre via <strong>AI Hub</strong>, mas você pode visualizar as regras ativas aqui.</p>
               <div className="space-y-2">
                 {rules.map(rule => (
                   <div key={rule.id} className="bg-[#110408] border border-[#3A1221] p-4 rounded-lg flex justify-between items-center">
                     <div>
                       <span className="text-xs font-bold text-[#845a27] uppercase bg-[#2A0B16] px-2 py-1 rounded mr-2">{rule.type}</span>
                       <span className="text-xs font-bold text-[#C49B4A] uppercase bg-[#2A0B16] px-2 py-1 rounded mr-3">{rule.targetType}</span>
                       <span>{rule.description}</span>
                     </div>
                     <button 
                       onClick={async () => {
                         if (confirm('Excluir esta regra?')) {
                           await deleteDoc(doc(db, 'checklist_rules', rule.id));
                           setRules(rules.filter(r => r.id !== rule.id));
                         }
                       }}
                       className="text-red-500 hover:text-red-400 p-2"
                     >
                       <Trash2 className="w-4 h-4" />
                     </button>
                   </div>
                 ))}
                 {rules.length === 0 && <p className="text-center text-[#845a27] py-10">Nenhuma regra cadastrada.</p>}
               </div>
             </div>
           </div>
         </div>
      )}
    </div>
  );
}
