import React, { useState, useEffect } from 'react';
import { db } from './lib/firebase';
import { collection, addDoc, updateDoc, doc, deleteDoc, onSnapshot, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { Empresa, Sindicato } from './types';
import { Plus, Trash2, Building, Building2, Pencil, X, AlertTriangle, Search, FileText, Upload, CheckCircle2, RefreshCw, Eye, BookOpen } from 'lucide-react';

interface EmpresasAppProps {
  entityToEdit?: { id: string, type: 'EMPRESA' | 'SINDICATO' } | null;
  clearEntityToEdit?: () => void;
}

export default function EmpresasApp({ entityToEdit, clearEntityToEdit }: EmpresasAppProps) {
  const [activeTab, setActiveTab] = useState<'EMPRESAS' | 'SINDICATOS'>('EMPRESAS');
  
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [sindicatos, setSindicatos] = useState<Sindicato[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSindicato, setEditingSindicato] = useState<Partial<Sindicato> | null>(null);
  const [editingEmpresa, setEditingEmpresa] = useState<Partial<Empresa> | null>(null);

  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean, action: () => void, message: string } | null>(null);
  
  const [isSindicatoDropdownOpen, setIsSindicatoDropdownOpen] = useState(false);

  // CCT Management State
  const [cctModalSindicato, setCctModalSindicato] = useState<Sindicato | null>(null);
  const [cctTexto, setCctTexto] = useState('');
  const [cctLoading, setCctLoading] = useState(false);
  const [cctSaving, setCctSaving] = useState(false);
  const [cctSuccessMessage, setCctSuccessMessage] = useState('');
  const [cctSearchTerm, setCctSearchTerm] = useState('');
  const [cctUpdatedAt, setCctUpdatedAt] = useState<Date | null>(null);

  const openCctModal = async (sindicato: Sindicato) => {
    setCctModalSindicato(sindicato);
    setCctTexto('');
    setCctLoading(true);
    setCctSuccessMessage('');
    setCctSearchTerm('');
    setCctUpdatedAt(null);
    try {
      const cctDoc = await getDoc(doc(db, 'sindicatos', sindicato.id, 'cct_textos', 'vigente'));
      if (cctDoc.exists()) {
        const data = cctDoc.data();
        setCctTexto(data.texto_puro || '');
        if (data.updatedAt) {
          setCctUpdatedAt(data.updatedAt.toDate ? data.updatedAt.toDate() : new Date(data.updatedAt));
        }
      } else {
        setCctTexto('');
      }
    } catch (err) {
      console.error('Erro ao buscar CCT:', err);
    } finally {
      setCctLoading(false);
    }
  };

  const handleSaveCct = async () => {
    if (!cctModalSindicato) return;
    setCctSaving(true);
    try {
      await setDoc(doc(db, 'sindicatos', cctModalSindicato.id, 'cct_textos', 'vigente'), {
        texto_puro: cctTexto,
        updatedAt: serverTimestamp()
      }, { merge: true });
      setCctUpdatedAt(new Date());
      setCctSuccessMessage('Convenção Coletiva (CCT) salva com sucesso! A IA já utilizará esta nova base.');
      setTimeout(() => setCctSuccessMessage(''), 4000);
    } catch (err) {
      console.error('Erro ao salvar CCT:', err);
      alert('Erro ao salvar CCT: ' + err);
    } finally {
      setCctSaving(false);
    }
  };

  const handleFileUploadCct = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        setCctTexto(text);
        setCctSuccessMessage(`Arquivo "${file.name}" carregado no editor! Clique em "Salvar CCT" para confirmar.`);
        setTimeout(() => setCctSuccessMessage(''), 4000);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  useEffect(() => {
    const unsubSindicatos = onSnapshot(collection(db, 'sindicatos'), (snapshot) => {
      setSindicatos(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Sindicato)));
    });
    
    const unsubEmpresas = onSnapshot(collection(db, 'empresas'), (snapshot) => {
      setEmpresas(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Empresa)));
    });

    return () => {
      unsubSindicatos();
      unsubEmpresas();
    };
  }, []);

  useEffect(() => {
    if (entityToEdit && (empresas.length > 0 || sindicatos.length > 0)) {
      if (entityToEdit.type === 'EMPRESA') {
        const emp = empresas.find(e => e.id === entityToEdit.id);
        if (emp) {
          setActiveTab('EMPRESAS');
          openEmpresaModal(emp);
          if (clearEntityToEdit) clearEntityToEdit();
        }
      } else if (entityToEdit.type === 'SINDICATO') {
        const sind = sindicatos.find(s => s.id === entityToEdit.id);
        if (sind) {
          setActiveTab('SINDICATOS');
          openSindicatoModal(sind);
          if (clearEntityToEdit) clearEntityToEdit();
        }
      }
    }
  }, [entityToEdit, empresas, sindicatos, clearEntityToEdit]);

  const openSindicatoModal = (sindicato?: Sindicato) => {
    if (sindicato) {
      setEditingSindicato(sindicato);
    } else {
      setEditingSindicato({ nome: '', cnpj: '', codigo: '', regiaoAtuacao: '' });
    }
    setIsModalOpen(true);
  };

  const openEmpresaModal = (empresa?: Empresa) => {
    if (empresa) {
      setEditingEmpresa(empresa);
    } else {
      setEditingEmpresa({ nome: '', cnpj: '', codigo: '', sindicatoId: '' });
    }
    setIsModalOpen(true);
  };

  const handleSaveSindicato = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSindicato?.nome) return;

    const action = async () => {
      const data = {
        nome: editingSindicato.nome,
        cnpj: editingSindicato.cnpj || '',
        codigo: editingSindicato.codigo || '',
        validadeCCT: editingSindicato.validadeCCT || '',
        regiaoAtuacao: editingSindicato.regiaoAtuacao || '',
      };

      let sindicatoId = editingSindicato.id;

      if (sindicatoId) {
        await updateDoc(doc(db, 'sindicatos', sindicatoId), data);
      } else {
        const docRef = await addDoc(collection(db, 'sindicatos'), { ...data, createdAt: Date.now() });
        sindicatoId = docRef.id;
      }

      // Add Calendar Event for CCT
      if (data.validadeCCT) {
        const parts = data.validadeCCT.split('-');
        if (parts.length === 3) {
          const date = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
          await addDoc(collection(db, 'calendarEvents'), {
            title: `Vencimento CCT: ${data.nome}`,
            description: `Data base / Vencimento CCT para o Sindicato ${data.nome}`,
            date: date.getTime(),
            type: 'VENCIMENTO_CCT',
            empresaId: sindicatoId,
            empresaNome: data.nome,
            status: 'ATIVO',
            createdAt: Date.now()
          });
        }
      }

      setIsModalOpen(false);
      setConfirmModal(null);
    };

    if (editingSindicato.id) {
      setConfirmModal({
        isOpen: true,
        message: `Tem certeza que deseja alterar os dados do sindicato "${editingSindicato.nome}"?\nIsso pode afetar empresas vinculadas e regras de checklist.`,
        action
      });
    } else {
      await action();
    }
  };

  const handleSaveEmpresa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEmpresa?.nome) return;

    const sindicato = sindicatos.find(s => s.id === editingEmpresa.sindicatoId);

    const action = async () => {
      const data = {
        nome: editingEmpresa.nome,
        cnpj: editingEmpresa.cnpj || '',
        codigo: editingEmpresa.codigo || '',
        sindicatoId: editingEmpresa.sindicatoId || '',
        sindicatoNome: sindicato ? sindicato.nome : ''
      };

      if (editingEmpresa.id) {
        await updateDoc(doc(db, 'empresas', editingEmpresa.id), data);
      } else {
        await addDoc(collection(db, 'empresas'), { ...data, createdAt: Date.now() });
      }
      setIsModalOpen(false);
      setConfirmModal(null);
    };

    if (editingEmpresa.id) {
      setConfirmModal({
        isOpen: true,
        message: `Tem certeza que deseja alterar os dados da empresa "${editingEmpresa.nome}"?\nIsso pode afetar regras de checklist e relatórios.`,
        action
      });
    } else {
      await action();
    }
  };

  const handleDeleteSindicato = (id: string, nome: string) => {
    setConfirmModal({
      isOpen: true,
      message: `Tem certeza que deseja excluir o sindicato "${nome}"?\nEsta ação não pode ser desfeita.`,
      action: async () => {
        await deleteDoc(doc(db, 'sindicatos', id));
        setConfirmModal(null);
      }
    });
  };

  const handleDeleteEmpresa = (id: string, nome: string) => {
    setConfirmModal({
      isOpen: true,
      message: `Tem certeza que deseja excluir a empresa "${nome}"?\nEsta ação não pode ser desfeita.`,
      action: async () => {
        await deleteDoc(doc(db, 'empresas', id));
        setConfirmModal(null);
      }
    });
  };

  return (
    <div className="flex-1 w-full max-w-5xl mx-auto p-6 md:p-8 flex flex-col h-full animate-in fade-in zoom-in-95 duration-200">
      <h1 className="text-3xl font-medium text-indigo-400 tracking-wider mb-8 uppercase">Cadastrar</h1>
      
      <div className="flex border-b border-slate-700/50 mb-8 items-center justify-between">
        <div className="flex">
          <button
            onClick={() => setActiveTab('EMPRESAS')}
            className={`px-8 py-3 text-sm font-bold tracking-widest uppercase border-b-2 transition-colors flex items-center space-x-2 ${
              activeTab === 'EMPRESAS' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-400'
            }`}
          >
            <Building className="w-4 h-4" />
            <span>EMPRESAS</span>
          </button>
          <button
            onClick={() => setActiveTab('SINDICATOS')}
            className={`px-8 py-3 text-sm font-bold tracking-widest uppercase border-b-2 transition-colors flex items-center space-x-2 ${
              activeTab === 'SINDICATOS' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-400'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>SINDICATOS</span>
          </button>
        </div>
      </div>

      <div className="mb-6 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <button 
          onClick={() => activeTab === 'EMPRESAS' ? openEmpresaModal() : openSindicatoModal()}
          className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center space-x-2 shadow-lg shadow-black/20 shrink-0"
        >
          <Plus className="w-5 h-5" />
          <span>NOVO {activeTab === 'EMPRESAS' ? 'EMPRESA' : 'SINDICATO'}</span>
        </button>
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input 
            type="text" 
            placeholder={`Buscar ${activeTab.toLowerCase()}...`}
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-slate-900 border border-slate-700 text-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {activeTab === 'SINDICATOS' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sindicatos.filter(s => 
              s.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
              (s.cnpj && s.cnpj.toLowerCase().includes(searchTerm.toLowerCase())) ||
              (s.regiaoAtuacao && s.regiaoAtuacao.toLowerCase().includes(searchTerm.toLowerCase()))
            ).map(s => {
              const linkedEmpresas = empresas.filter(e => e.sindicatoId === s.id);
              return (
              <div key={s.id} className="bg-slate-800/50 border border-slate-700/50 p-5 rounded-xl flex flex-col transition-colors hover:border-slate-600">
                <div className="flex justify-between items-start w-full mb-3">
                  <div>
                    <h3 className="font-bold text-slate-200 text-lg mb-1">{s.nome}</h3>
                    <div className="text-sm text-slate-400 space-y-1">
                      <p>CNPJ: <span className="text-slate-300">{s.cnpj || '-'}</span></p>
                      <p>Código: <span className="text-slate-300">{s.codigo || '-'}</span></p>
                      <p>Região: <span className="text-slate-300">{s.regiaoAtuacao || '-'}</span></p>
                    </div>
                  </div>
                  <div className="flex space-x-2 shrink-0 ml-4">
                    <button onClick={() => openSindicatoModal(s)} className="text-slate-500 hover:text-indigo-400 p-2 transition-colors">
                      <Pencil className="w-5 h-5" />
                    </button>
                    <button onClick={() => handleDeleteSindicato(s.id, s.nome)} className="text-slate-500 hover:text-red-500 p-2 transition-colors">
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
                <div className="pt-3 border-t border-slate-700/50 w-full mt-auto space-y-3">
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Empresas Vinculadas</p>
                    {linkedEmpresas.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {linkedEmpresas.map(emp => (
                          <span key={emp.id} className="text-xs bg-indigo-500/10 text-indigo-400 px-2 py-1 rounded-md border border-indigo-500/20">
                            {emp.nome}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500">Nenhuma empresa vinculada</p>
                    )}
                  </div>

                  <button
                    onClick={() => openCctModal(s)}
                    className="w-full py-2.5 px-3 bg-indigo-600/10 hover:bg-indigo-600/20 border border-indigo-500/30 hover:border-indigo-500/60 text-indigo-300 rounded-lg text-xs font-semibold flex items-center justify-center space-x-2 transition-all cursor-pointer shadow-sm"
                  >
                    <FileText className="w-4 h-4 text-indigo-400" />
                    <span>Visualizar / Atualizar CCT (IA)</span>
                  </button>
                </div>
              </div>
            )})}
            {sindicatos.filter(s => 
              s.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
              (s.cnpj && s.cnpj.toLowerCase().includes(searchTerm.toLowerCase())) ||
              (s.regiaoAtuacao && s.regiaoAtuacao.toLowerCase().includes(searchTerm.toLowerCase()))
            ).length === 0 && <div className="col-span-full text-center text-slate-500 py-10">Nenhum sindicato encontrado.</div>}
          </div>
        )}

        {activeTab === 'EMPRESAS' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {empresas.filter(e => {
              const sindicato = sindicatos.find(s => s.id === e.sindicatoId);
              return e.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                     (e.cnpj && e.cnpj.toLowerCase().includes(searchTerm.toLowerCase())) ||
                     (sindicato && sindicato.regiaoAtuacao && sindicato.regiaoAtuacao.toLowerCase().includes(searchTerm.toLowerCase())) ||
                     (sindicato && sindicato.nome.toLowerCase().includes(searchTerm.toLowerCase()));
            }).map(emp => {
              const sindicato = sindicatos.find(s => s.id === emp.sindicatoId);
              return (
                <div key={emp.id} className="bg-slate-800/50 border border-slate-700/50 p-5 rounded-xl flex justify-between items-start transition-colors hover:border-slate-600">
                  <div>
                    <h3 className="font-bold text-slate-200 text-lg mb-1">{emp.nome}</h3>
                    <div className="text-sm text-slate-400 space-y-1">
                      <p>CNPJ: <span className="text-slate-300">{emp.cnpj || '-'}</span></p>
                      <p>Código: <span className="text-slate-300">{emp.codigo || '-'}</span></p>
                      <p>Sindicato: <span className="text-indigo-400">{sindicato ? sindicato.nome : 'Nenhum'}</span></p>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button onClick={() => openEmpresaModal(emp)} className="text-slate-500 hover:text-indigo-400 p-2 transition-colors">
                      <Pencil className="w-5 h-5" />
                    </button>
                    <button onClick={() => handleDeleteEmpresa(emp.id, emp.nome)} className="text-slate-500 hover:text-red-500 p-2 transition-colors">
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              );
            })}
            {empresas.filter(e => {
              const sindicato = sindicatos.find(s => s.id === e.sindicatoId);
              return e.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                     (e.cnpj && e.cnpj.toLowerCase().includes(searchTerm.toLowerCase())) ||
                     (sindicato && sindicato.regiaoAtuacao && sindicato.regiaoAtuacao.toLowerCase().includes(searchTerm.toLowerCase())) ||
                     (sindicato && sindicato.nome.toLowerCase().includes(searchTerm.toLowerCase()));
            }).length === 0 && <div className="col-span-full text-center text-slate-500 py-10">Nenhuma empresa encontrada.</div>}
          </div>
        )}
      </div>

      {/* Sindicato Modal */}
      {isModalOpen && activeTab === 'SINDICATOS' && editingSindicato && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700/50 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center">
              <h2 className="text-lg font-medium text-slate-200">{editingSindicato.id ? 'Editar Sindicato' : 'Novo Sindicato'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-500 hover:text-slate-300 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveSindicato} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Nome do Sindicato *</label>
                <input type="text" required value={editingSindicato.nome || ''} onChange={e => setEditingSindicato({...editingSindicato, nome: e.target.value})} className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-lg px-4 py-3 focus:outline-none focus:border-indigo-500 transition-colors" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">CNPJ</label>
                <input type="text" value={editingSindicato.cnpj || ''} onChange={e => setEditingSindicato({...editingSindicato, cnpj: e.target.value})} className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-lg px-4 py-3 focus:outline-none focus:border-indigo-500 transition-colors" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Código</label>
                <input type="text" value={editingSindicato.codigo || ''} onChange={e => setEditingSindicato({...editingSindicato, codigo: e.target.value})} className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-lg px-4 py-3 focus:outline-none focus:border-indigo-500 transition-colors" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Região de Atuação (Cidade)</label>
                <input type="text" value={editingSindicato.regiaoAtuacao || ''} onChange={e => setEditingSindicato({...editingSindicato, regiaoAtuacao: e.target.value})} className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-lg px-4 py-3 focus:outline-none focus:border-indigo-500 transition-colors" placeholder="Ex: São Paulo, Campinas..." />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Validade CCT / Data Base</label>
                <input type="date" value={editingSindicato.validadeCCT || ''} onChange={e => setEditingSindicato({...editingSindicato, validadeCCT: e.target.value})} className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-lg px-4 py-3 focus:outline-none focus:border-indigo-500 transition-colors" />
              </div>
              <div className="pt-4 flex justify-end space-x-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 text-slate-400 hover:text-slate-200 font-medium transition-colors">Cancelar</button>
                <button type="submit" className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2.5 rounded-lg font-medium transition-colors">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Empresa Modal */}
      {isModalOpen && activeTab === 'EMPRESAS' && editingEmpresa && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700/50 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center">
              <h2 className="text-lg font-medium text-slate-200">{editingEmpresa.id ? 'Editar Empresa' : 'Nova Empresa'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-500 hover:text-slate-300 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveEmpresa} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Nome da Empresa *</label>
                <input type="text" required value={editingEmpresa.nome || ''} onChange={e => setEditingEmpresa({...editingEmpresa, nome: e.target.value})} className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-lg px-4 py-3 focus:outline-none focus:border-indigo-500 transition-colors" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">CNPJ</label>
                <input type="text" value={editingEmpresa.cnpj || ''} onChange={e => setEditingEmpresa({...editingEmpresa, cnpj: e.target.value})} className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-lg px-4 py-3 focus:outline-none focus:border-indigo-500 transition-colors" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Código</label>
                <input type="text" value={editingEmpresa.codigo || ''} onChange={e => setEditingEmpresa({...editingEmpresa, codigo: e.target.value})} className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-lg px-4 py-3 focus:outline-none focus:border-indigo-500 transition-colors" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Sindicato Vinculado</label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Pesquisar sindicato..."
                    value={editingEmpresa.sindicatoNome !== undefined ? editingEmpresa.sindicatoNome : (sindicatos.find(s => s.id === editingEmpresa.sindicatoId)?.nome || '')}
                    onChange={e => {
                      setEditingEmpresa({...editingEmpresa, sindicatoNome: e.target.value, sindicatoId: ''});
                      setIsSindicatoDropdownOpen(true);
                    }}
                    onFocus={(e) => {
                      e.target.select();
                      setIsSindicatoDropdownOpen(true);
                    }}
                    onBlur={() => {
                      // timeout to allow click on dropdown items
                      setTimeout(() => setIsSindicatoDropdownOpen(false), 200);
                    }}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-lg px-4 py-3 focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                  {isSindicatoDropdownOpen && (
                    <div className="absolute z-10 w-full mt-1 bg-slate-900 border border-slate-700 rounded-lg shadow-xl max-h-48 overflow-y-auto custom-scrollbar">
                      <div 
                        className="px-4 py-2 hover:bg-slate-800 cursor-pointer text-slate-400 text-sm"
                        onClick={() => {
                          setEditingEmpresa({...editingEmpresa, sindicatoId: '', sindicatoNome: undefined});
                          setIsSindicatoDropdownOpen(false);
                        }}
                      >
                        Nenhum
                      </div>
                      {sindicatos
                        .filter(s => s.nome.toLowerCase().includes((editingEmpresa.sindicatoNome !== undefined ? editingEmpresa.sindicatoNome : '').toLowerCase()))
                        .map(s => (
                        <div 
                          key={s.id}
                          className="px-4 py-2 hover:bg-slate-800 cursor-pointer text-slate-200 text-sm"
                          onClick={() => {
                            setEditingEmpresa({...editingEmpresa, sindicatoId: s.id, sindicatoNome: undefined});
                            setIsSindicatoDropdownOpen(false);
                          }}
                        >
                          {s.nome}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="pt-4 flex justify-end space-x-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 text-slate-400 hover:text-slate-200 font-medium transition-colors">Cancelar</button>
                <button type="submit" className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2.5 rounded-lg font-medium transition-colors">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmModal && (
        <div className="fixed inset-0 bg-black/70 z-[60] flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700/50 rounded-2xl w-full max-w-md shadow-2xl p-6">
            <div className="flex items-center space-x-4 mb-4">
              <div className="bg-amber-500/20 p-3 rounded-full text-amber-500">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h2 className="text-lg font-medium text-slate-200">Atenção</h2>
            </div>
            <p className="text-slate-400 mb-6 whitespace-pre-wrap leading-relaxed">{confirmModal.message}</p>
            <div className="flex justify-end space-x-3">
              <button onClick={() => setConfirmModal(null)} className="px-5 py-2.5 text-slate-400 hover:text-slate-200 font-medium transition-colors bg-slate-800/50 hover:bg-slate-800 rounded-lg">Cancelar</button>
              <button onClick={confirmModal.action} className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2.5 rounded-lg font-medium transition-colors">Confirmar</button>
            </div>
          </div>
        </div>
      )}

      {/* CCT Text Management Modal */}
      {cctModalSindicato && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[70] flex items-center justify-center p-4 md:p-6 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700/70 rounded-2xl w-full max-w-4xl max-h-[92vh] shadow-2xl flex flex-col overflow-hidden">
            
            {/* Header */}
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-400">
                  <BookOpen className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                    Texto da CCT Vigente
                    <span className="text-xs font-normal px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                      Base de Conhecimento da IA
                    </span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Sindicato: <span className="text-slate-200 font-medium">{cctModalSindicato.nome}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setCctModalSindicato(null)}
                className="text-slate-400 hover:text-slate-200 p-2 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Info Banner & Actions */}
            <div className="p-4 bg-slate-950/70 border-b border-slate-800 space-y-3">
              <p className="text-xs text-slate-400 leading-relaxed">
                Este texto é consultado em tempo real pelo <span className="text-indigo-400 font-medium">Assistente de IA</span> para responder perguntas sobre piso salarial, adicionais, estabilidades e regras sindicais das empresas vinculadas. Quando a convenção for renovada, basta colar o novo texto ou subir o arquivo <code className="text-indigo-300 bg-indigo-950/60 px-1 py-0.5 rounded">.txt</code>.
              </p>

              {cctSuccessMessage && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center space-x-2 text-emerald-400 text-xs animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{cctSuccessMessage}</span>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <div className="flex items-center space-x-2">
                  <label className="cursor-pointer bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-3.5 py-2 rounded-lg flex items-center space-x-1.5 transition-colors shadow-sm">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Carregar Arquivo (.txt)</span>
                    <input
                      type="file"
                      accept=".txt"
                      onChange={handleFileUploadCct}
                      className="hidden"
                    />
                  </label>

                  {cctTexto && (
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm('Deseja limpar todo o texto da CCT?')) {
                          setCctTexto('');
                        }
                      }}
                      className="text-slate-400 hover:text-red-400 text-xs px-3 py-2 rounded-lg hover:bg-slate-800 transition-colors"
                    >
                      Limpar Texto
                    </button>
                  )}
                </div>

                <div className="flex items-center space-x-3 text-xs text-slate-400">
                  <span>
                    Caracteres: <strong className="text-slate-200">{cctTexto.length.toLocaleString('pt-BR')}</strong>
                  </span>
                  <span>•</span>
                  <span>
                    Palavras: <strong className="text-slate-200">{(cctTexto.trim() ? cctTexto.trim().split(/\s+/).length : 0).toLocaleString('pt-BR')}</strong>
                  </span>
                  {cctUpdatedAt && (
                    <>
                      <span>•</span>
                      <span>
                        Última atualização: <strong className="text-slate-200">{cctUpdatedAt.toLocaleDateString('pt-BR')} {cctUpdatedAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</strong>
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Editor Area */}
            <div className="flex-1 p-4 overflow-hidden flex flex-col">
              {cctLoading ? (
                <div className="flex-1 flex items-center justify-center py-20 text-slate-400 text-sm">
                  <RefreshCw className="w-5 h-5 animate-spin mr-2 text-indigo-400" />
                  Carregando texto da CCT...
                </div>
              ) : (
                <textarea
                  value={cctTexto}
                  onChange={e => setCctTexto(e.target.value)}
                  placeholder="Cole aqui o texto integral da Convenção Coletiva de Trabalho (CCT) ou clique em 'Carregar Arquivo (.txt)' acima..."
                  className="w-full flex-1 min-h-[340px] bg-slate-950 border border-slate-800 text-slate-200 rounded-xl p-4 text-xs font-mono leading-relaxed focus:outline-none focus:border-indigo-500 transition-colors resize-none custom-scrollbar"
                />
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-800 flex justify-between items-center bg-slate-950/60">
              <p className="text-xs text-slate-500">
                {cctTexto ? 'Texto pronto para ser consultado pela IA.' : 'Nenhum texto cadastrado para este sindicato.'}
              </p>
              <div className="flex items-center space-x-3">
                <button
                  type="button"
                  onClick={() => setCctModalSindicato(null)}
                  className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-slate-200 transition-colors"
                >
                  Fechar
                </button>
                <button
                  type="button"
                  disabled={cctSaving || cctLoading}
                  onClick={handleSaveCct}
                  className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-5 py-2 rounded-lg text-xs font-semibold flex items-center space-x-2 transition-colors shadow-lg shadow-indigo-500/10 cursor-pointer"
                >
                  {cctSaving ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Salvando...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Salvar CCT Vigente</span>
                    </>
                  )}
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}