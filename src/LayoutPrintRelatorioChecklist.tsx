import React from 'react';
import { Empresa } from './types';

interface RelatorioItem {
  titulo: string;
  tipo: 'Fixo' | 'Aviso';
  status: 'Concluído' | 'Pendente';
  dataConclusao?: number | null;
  empresaNome: string;
  empresaId: string;
}

interface LayoutPrintRelatorioChecklistProps {
  items: RelatorioItem[];
  mesAno: string;
  empresas: Empresa[];
  empresaFiltro: string; // 'TODAS' ou id da empresa
}

export default function LayoutPrintRelatorioChecklist({ items, mesAno, empresas, empresaFiltro }: LayoutPrintRelatorioChecklistProps) {
  const [ano, mes] = mesAno.split('-');
  const mesFormatado = new Date(parseInt(ano), parseInt(mes) - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  // Agrupar itens por empresaId
  const grupos: Record<string, RelatorioItem[]> = {};
  items.forEach(item => {
    if (!grupos[item.empresaId]) grupos[item.empresaId] = [];
    grupos[item.empresaId].push(item);
  });

  return (
    <div className="hidden print:block w-full bg-white text-black min-h-screen font-sans p-8">
      {/* Cabeçalho */}
      <div className="flex justify-between items-center mb-8 border-b-2 border-slate-800 pb-4">
        <div>
          <h1 className="text-xl font-bold uppercase text-black">Relatório de Acompanhamento</h1>
          <h2 className="text-sm uppercase text-black mt-1">SIMPLES ASSESSORIA CONTÁBIL E EMPRESARIAL</h2>
        </div>
        <div className="text-right">
          <p className="text-sm text-black">Competência</p>
          <p className="font-bold capitalize text-black">{mesFormatado}</p>
        </div>
      </div>

      {/* Conteúdo */}
      <div className="space-y-8">
        {Object.entries(grupos).map(([empId, empItems]) => {
          const empName = empItems[0]?.empresaNome || 'Empresa Desconhecida';
          return (
            <div key={empId} className="mb-8 print:break-inside-avoid-page">
              <h3 className="text-lg font-bold bg-gray-100 p-2 border border-slate-800 border-b-0 text-black">
                {empName}
              </h3>
              <table className="w-full text-sm border-collapse border border-slate-800">
                <thead>
                  <tr className="bg-gray-50 text-black border-b border-slate-800">
                    <th className="p-2 text-left border-r border-slate-800">Obrigação</th>
                    <th className="p-2 text-center w-24 border-r border-slate-800">Tipo</th>
                    <th className="p-2 text-center w-32 border-r border-slate-800">Status</th>
                    <th className="p-2 text-center w-32">Resolução</th>
                  </tr>
                </thead>
                <tbody>
                  {empItems.map((item, idx) => (
                    <tr key={idx} className="print:break-inside-avoid border-b border-slate-800">
                      <td className="p-2 border-r border-slate-800 font-medium text-black">
                        {item.titulo}
                      </td>
                      <td className="p-2 text-center border-r border-slate-800 text-black">
                        {item.tipo}
                      </td>
                      <td className={`p-2 text-center font-bold border-r border-slate-800 ${item.status === 'Pendente' ? 'text-black italic' : 'text-black'}`}>
                        {item.status}
                      </td>
                      <td className="p-2 text-center text-black">
                        {item.dataConclusao 
                          ? new Date(item.dataConclusao).toLocaleDateString('pt-BR') 
                          : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })}
        {items.length === 0 && (
          <p className="text-center text-gray-500 italic mt-8">Nenhuma obrigação encontrada para este período.</p>
        )}
      </div>
    </div>
  );
}
