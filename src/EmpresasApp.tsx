import React, { useState, useEffect } from 'react';
import { db } from './lib/firebase';
import { collection, getDocs, addDoc, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { Empresa, Sindicato } from './types';
import { Plus, Trash2, Building, Building2, Save } from 'lucide-react';

export default function EmpresasApp() {
  const [activeTab, setActiveTab] = useState<'EMPRESAS' | 'SINDICATOS'>('EMPRESAS');
  
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [sindicatos, setSindicatos] = useState<Sindicato[]>([]);
  
  const [newSindicato, setNewSindicato] = useState({ nome: '', cnpj: '', codigo: '' });
  const [newEmpresa, setNewEmpresa] = useState({ nome: '', cnpj: '', codigo: '', sindicatoId: '' });

  const loadData = async () => {
    const sSnapshot = await getDocs(collection(db, 'sindicatos'));
    setSindicatos(sSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as Sindicato)));
    
    const eSnapshot = await getDocs(collection(db, 'empresas'));
    setEmpresas(eSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as Empresa)));
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddSindicato = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSindicato.nome) return;
    const docRef = await addDoc(collection(db, 'sindicatos'), newSindicato);
    setSindicatos([...sindicatos, { id: docRef.id, ...newSindicato }]);
    setNewSindicato({ nome: '', cnpj: '', codigo: '' });
  };

  const handleAddEmpresa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmpresa.nome) return;
    const docRef = await addDoc(collection(db, 'empresas'), newEmpresa);
    setEmpresas([...empresas, { id: docRef.id, ...newEmpresa }]);
    setNewEmpresa({ nome: '', cnpj: '', codigo: '', sindicatoId: '' });
  };

  const handleDeleteSindicato = async (id: string) => {
    if (confirm('Tem certeza?')) {
      await deleteDoc(doc(db, 'sindicatos', id));
      setSindicatos(sindicatos.filter(s => s.id !== id));
    }
  };

  const handleDeleteEmpresa = async (id: string) => {
    if (confirm('Tem certeza?')) {
      await deleteDoc(doc(db, 'empresas', id));
      setEmpresas(empresas.filter(emp => emp.id !== id));
    }
  };

  return (
    <div className="flex-1 w-full max-w-5xl mx-auto p-6 md:p-8 flex flex-col h-full">
      <h1 className="text-3xl font-serif text-[#C49B4A] tracking-wider mb-8">CADASTRAR</h1>
      
      {/* Tabs */}
      <div className="flex border-b border-[#4A1828] mb-8">
        <button
          onClick={() => setActiveTab('EMPRESAS')}
          className={`px-8 py-3 text-sm font-bold tracking-widest uppercase border-b-2 transition-colors flex items-center space-x-2 ${
            activeTab === 'EMPRESAS' ? 'border-[#C49B4A] text-[#C49B4A]' : 'border-transparent text-[#845a27] hover:text-[#A68759]'
          }`}
        >
          <Building className="w-4 h-4" />
          <span>EMPRESAS</span>
        </button>
        <button
          onClick={() => setActiveTab('SINDICATOS')}
          className={`px-8 py-3 text-sm font-bold tracking-widest uppercase border-b-2 transition-colors flex items-center space-x-2 ${
            activeTab === 'SINDICATOS' ? 'border-[#C49B4A] text-[#C49B4A]' : 'border-transparent text-[#845a27] hover:text-[#A68759]'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>SINDICATOS</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {activeTab === 'SINDICATOS' && (
          <div className="space-y-8">
            <div className="bg-[#18060B] border border-[#4A1828] p-6 rounded-2xl shadow-xl">
              <h2 className="text-[#C49B4A] font-serif text-lg tracking-widest mb-4">NOVO SINDICATO</h2>
              <form onSubmit={handleAddSindicato} className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-2">
                  <input type="text" placeholder="Nome" value={newSindicato.nome} onChange={e => setNewSindicato({...newSindicato, nome: e.target.value})} className="w-full bg-[#0C0305] border border-[#3A1221] text-[#D1A751] rounded-lg px-4 py-3 focus:outline-none focus:border-[#C49B4A]" required />
                </div>
                <div>
                  <input type="text" placeholder="CNPJ" value={newSindicato.cnpj} onChange={e => setNewSindicato({...newSindicato, cnpj: e.target.value})} className="w-full bg-[#0C0305] border border-[#3A1221] text-[#D1A751] rounded-lg px-4 py-3 focus:outline-none focus:border-[#C49B4A]" />
                </div>
                <div className="flex items-center space-x-2">
                  <input type="text" placeholder="Código" value={newSindicato.codigo} onChange={e => setNewSindicato({...newSindicato, codigo: e.target.value})} className="w-full bg-[#0C0305] border border-[#3A1221] text-[#D1A751] rounded-lg px-4 py-3 focus:outline-none focus:border-[#C49B4A]" />
                  <button type="submit" className="bg-[#C49B4A] text-[#1E0810] p-3 rounded-lg hover:bg-[#D1A751] transition-colors"><Plus className="w-5 h-5"/></button>
                </div>
              </form>
            </div>

            <div className="space-y-3">
              {sindicatos.map(s => (
                <div key={s.id} className="bg-[#1E0810] border border-[#4A1828] p-4 rounded-xl flex justify-between items-center text-[#D1A751]">
                  <div>
                    <p className="font-bold">{s.nome}</p>
                    <p className="text-xs text-[#845a27] mt-1">CNPJ: {s.cnpj || '-'} | Cód: {s.codigo || '-'}</p>
                  </div>
                  <button onClick={() => handleDeleteSindicato(s.id)} className="text-red-500 hover:text-red-400 p-2"><Trash2 className="w-5 h-5"/></button>
                </div>
              ))}
              {sindicatos.length === 0 && <p className="text-center text-[#845a27] py-4">Nenhum sindicato cadastrado.</p>}
            </div>
          </div>
        )}

        {activeTab === 'EMPRESAS' && (
          <div className="space-y-8">
            <div className="bg-[#18060B] border border-[#4A1828] p-6 rounded-2xl shadow-xl">
              <h2 className="text-[#C49B4A] font-serif text-lg tracking-widest mb-4">NOVA EMPRESA</h2>
              <form onSubmit={handleAddEmpresa} className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div className="md:col-span-2">
                  <input type="text" placeholder="Nome" value={newEmpresa.nome} onChange={e => setNewEmpresa({...newEmpresa, nome: e.target.value})} className="w-full bg-[#0C0305] border border-[#3A1221] text-[#D1A751] rounded-lg px-4 py-3 focus:outline-none focus:border-[#C49B4A]" required />
                </div>
                <div>
                  <input type="text" placeholder="CNPJ" value={newEmpresa.cnpj} onChange={e => setNewEmpresa({...newEmpresa, cnpj: e.target.value})} className="w-full bg-[#0C0305] border border-[#3A1221] text-[#D1A751] rounded-lg px-4 py-3 focus:outline-none focus:border-[#C49B4A]" />
                </div>
                <div>
                  <select value={newEmpresa.sindicatoId} onChange={e => setNewEmpresa({...newEmpresa, sindicatoId: e.target.value})} className="w-full bg-[#0C0305] border border-[#3A1221] text-[#D1A751] rounded-lg px-4 py-3 focus:outline-none focus:border-[#C49B4A]">
                    <option value="">Sindicato...</option>
                    {sindicatos.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
                  </select>
                </div>
                <div className="flex items-center space-x-2">
                  <input type="text" placeholder="Código" value={newEmpresa.codigo} onChange={e => setNewEmpresa({...newEmpresa, codigo: e.target.value})} className="w-full bg-[#0C0305] border border-[#3A1221] text-[#D1A751] rounded-lg px-4 py-3 focus:outline-none focus:border-[#C49B4A]" />
                  <button type="submit" className="bg-[#C49B4A] text-[#1E0810] p-3 rounded-lg hover:bg-[#D1A751] transition-colors"><Plus className="w-5 h-5"/></button>
                </div>
              </form>
            </div>

            <div className="space-y-3">
              {empresas.map(emp => {
                const sindicato = sindicatos.find(s => s.id === emp.sindicatoId);
                return (
                  <div key={emp.id} className="bg-[#1E0810] border border-[#4A1828] p-4 rounded-xl flex justify-between items-center text-[#D1A751]">
                    <div>
                      <p className="font-bold">{emp.nome}</p>
                      <p className="text-xs text-[#845a27] mt-1">CNPJ: {emp.cnpj || '-'} | Cód: {emp.codigo || '-'} | Sindicato: {sindicato ? sindicato.nome : 'Nenhum'}</p>
                    </div>
                    <button onClick={() => handleDeleteEmpresa(emp.id)} className="text-red-500 hover:text-red-400 p-2"><Trash2 className="w-5 h-5"/></button>
                  </div>
                );
              })}
              {empresas.length === 0 && <p className="text-center text-[#845a27] py-4">Nenhuma empresa cadastrada.</p>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
