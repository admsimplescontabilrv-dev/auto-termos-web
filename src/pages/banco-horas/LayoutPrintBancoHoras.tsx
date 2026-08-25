import React from 'react';
import { Colaborador, BancoHorasLancamento } from '../../types';
import { minutesToTime } from '../../utils/timeFormat';

interface LayoutPrintBancoHorasProps {
  mesAno: string;
  colaboradores: Colaborador[];
  allLancamentos: BancoHorasLancamento[];
}

export default function LayoutPrintBancoHoras({ mesAno, colaboradores, allLancamentos }: LayoutPrintBancoHorasProps) {
  const [ano, mes] = mesAno.split('-');
  const mesFormatado = new Date(parseInt(ano), parseInt(mes) - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  const getColabStats = (colabId: string) => {
    const colabRecords = allLancamentos.filter(l => l.colaboradorId === colabId);
    
    let totalPositivos = 0;
    let totalNegativos = 0;
    
    let mesPositivos = 0;
    let mesNegativos = 0;

    colabRecords.forEach(l => {
      totalPositivos += (l.minutosPositivos || 0);
      totalNegativos += (l.minutosNegativos || 0);
      
      if (l.mesAno === mesAno) {
        mesPositivos += (l.minutosPositivos || 0);
        mesNegativos += (l.minutosNegativos || 0);
      }
    });

    return {
      mesPositivos,
      mesNegativos,
      saldoMes: mesPositivos - mesNegativos,
      saldoTotal: totalPositivos - totalNegativos
    };
  };

  return (
    <div className="hidden print:block w-full bg-white text-black min-h-screen font-sans p-8">
      {/* Cabeçalho */}
      <div className="text-center mb-8 border-b-2 border-black pb-4">
        <h1 className="text-xl font-bold uppercase">Controle de Banco de horas</h1>
        <h2 className="text-lg font-bold uppercase mt-1">SIMPLES ASSESSORIA CONTÁBIL E EMPRESARIAL</h2>
        <p className="mt-2 text-sm">Competência: <span className="font-bold capitalize">{mesFormatado}</span></p>
      </div>

      {/* Tabela de Resumo */}
      <table className="w-full text-sm mb-12 border-collapse border border-black">
        <thead>
          <tr className="bg-gray-100">
            <th className="border border-black p-2 text-left w-1/4">Colaborador</th>
            <th className="border border-black p-2 text-center w-[12%]">Crédito (+)</th>
            <th className="border border-black p-2 text-center w-[12%]">Débito (-)</th>
            <th className="border border-black p-2 text-center w-[12%]">Saldo Mês</th>
            <th className="border border-black p-2 text-center w-[14%]">Saldo Total</th>
            <th className="border border-black p-2 text-left w-1/4">Assinatura</th>
          </tr>
        </thead>
        <tbody>
          {colaboradores.map(colab => {
            const stats = getColabStats(colab.id!);
            
            // Ignorar inativos sem lançamento e sem histórico
            if (colab.ativo === false && stats.mesPositivos === 0 && stats.mesNegativos === 0 && stats.saldoTotal === 0) {
              return null;
            }

            return (
              <tr key={colab.id} className="print:break-inside-avoid">
                <td className="border border-black p-2 font-medium">{colab.nome}</td>
                <td className="border border-black p-2 text-center">{minutesToTime(stats.mesPositivos)}</td>
                <td className="border border-black p-2 text-center">{minutesToTime(stats.mesNegativos)}</td>
                <td className="border border-black p-2 text-center font-bold">
                  {minutesToTime(stats.saldoMes)}
                </td>
                <td className="border border-black p-2 text-center font-bold">
                  {minutesToTime(stats.saldoTotal)}
                </td>
                <td className="border border-black p-2"></td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Rodapé - Assinatura do Empregador */}
      <div className="mt-24 pt-8 w-full flex justify-center print:break-inside-avoid">
        <div className="w-96 text-center border-t border-black pt-2">
          <p className="font-bold uppercase text-sm">SIMPLES ASSESSORIA CONTÁBIL E EMPRESARIAL</p>
          <p className="text-xs mt-1">Empregador</p>
        </div>
      </div>
    </div>
  );
}
