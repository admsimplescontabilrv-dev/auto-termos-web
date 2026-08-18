import React, { useState } from 'react';
import { useFirestore } from '../../hooks/useFirestore';
import { Colaborador } from '../../types';
import { Plus, UserMinus, UserCheck, Trash2 } from 'lucide-react';

export default function ColaboradoresTab() {
  const { data: colaboradores, add, update, remove, loading } = useFirestore<Colaborador>('colaboradores');
  const [novoNome, setNovoNome] = useState('');

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoNome.trim()) return;
    await add({
      nome: novoNome.trim(),
      ativo: true,
      createdAt: Date.now()
    });
    setNovoNome('');
  };

  const toggleAtivo = async (colaborador: Colaborador) => {
    if (!colaborador.id) return;
    await update(colaborador.id, { ativo: !colaborador.ativo });
  };

  const handleDelete = async (id?: string) => {
    if (!id) return;
    if (confirm('Tem certeza que deseja excluir permanentemente este colaborador?')) {
      await remove(id);
    }
  };

  if (loading) return <div className="text-slate-400 p-8 text-center">Carregando colaboradores...</div>;

  return (
    <div className="space-y-6">
      <form onSubmit={handleAdd} className="flex gap-4 items-end">
        <div className="flex-1 max-w-md">
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Novo Colaborador</label>
          <input
            type="text"
            value={novoNome}
            onChange={e => setNovoNome(e.target.value)}
            placeholder="Nome completo"
            className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-4 py-2 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>
        <button
          type="submit"
          disabled={!novoNome.trim()}
          className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2.5 rounded-lg font-medium flex items-center gap-2 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Adicionar
        </button>
      </form>

      <div className="bg-slate-900 border border-slate-700/50 rounded-xl overflow-hidden">
        <table className="w-full text-left text-sm text-slate-300">
          <thead className="bg-slate-800/50 text-slate-400 font-medium">
            <tr>
              <th className="px-6 py-4">Nome do Colaborador</th>
              <th className="px-6 py-4 text-center w-32">Status</th>
              <th className="px-6 py-4 text-right w-48">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            {colaboradores.map(colab => (
              <tr key={colab.id} className="hover:bg-slate-800/20 transition-colors">
                <td className="px-6 py-4 font-medium text-slate-200">
                  <span className={!colab.ativo ? 'line-through text-slate-500' : ''}>{colab.nome}</span>
                </td>
                <td className="px-6 py-4 text-center">
                  <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${
                    colab.ativo ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                  }`}>
                    {colab.ativo ? 'Ativo' : 'Inativo'}
                  </span>
                </td>
                <td className="px-6 py-4 flex justify-end gap-2">
                  <button
                    onClick={() => toggleAtivo(colab)}
                    className={`p-2 rounded-lg transition-colors ${
                      colab.ativo ? 'text-amber-400 hover:bg-amber-400/10' : 'text-emerald-400 hover:bg-emerald-400/10'
                    }`}
                    title={colab.ativo ? 'Desativar' : 'Ativar'}
                  >
                    {colab.ativo ? <UserMinus className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => handleDelete(colab.id)}
                    className="p-2 text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                    title="Excluir"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
            {colaboradores.length === 0 && (
              <tr>
                <td colSpan={3} className="px-6 py-8 text-center text-slate-500">
                  Nenhum colaborador cadastrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
