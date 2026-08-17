import React, { useState, useEffect } from 'react';
import { db } from './lib/firebase';
import { collection, addDoc, updateDoc, doc, deleteDoc, onSnapshot } from 'firebase/firestore';
import { Empresa, Sindicato } from './types';
import { Plus, Trash2, Building, Building2, Pencil, X, AlertTriangle, Search } from 'lucide-react';

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
                <div className="pt-3 border-t border-slate-700/50 w-full mt-auto">
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
                    value={editingEmpresa.sindicatoNome || sindicatos.find(s => s.id === editingEmpresa.sindicatoId)?.nome || ''}
                    onChange={e => {
                      setEditingEmpresa({...editingEmpresa, sindicatoNome: e.target.value, sindicatoId: ''});
                    }}
                    onFocus={(e) => e.target.select()}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-lg px-4 py-3 focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                  {editingEmpresa.sindicatoNome !== undefined && (
                    <div className="absolute z-10 w-full mt-1 bg-slate-900 border border-slate-700 rounded-lg shadow-xl max-h-48 overflow-y-auto custom-scrollbar">
                      <div 
                        className="px-4 py-2 hover:bg-slate-800 cursor-pointer text-slate-400 text-sm"
                        onClick={() => {
                          setEditingEmpresa({...editingEmpresa, sindicatoId: '', sindicatoNome: ''});
                        }}
                      >
                        Nenhum
                      </div>
                      {sindicatos
                        .filter(s => s.nome.toLowerCase().includes((editingEmpresa.sindicatoNome || '').toLowerCase()))
                        .map(s => (
                        <div 
                          key={s.id}
                          className="px-4 py-2 hover:bg-slate-800 cursor-pointer text-slate-200 text-sm"
                          onClick={() => {
                            setEditingEmpresa({...editingEmpresa, sindicatoId: s.id, sindicatoNome: s.nome});
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
    </div>
  );
}