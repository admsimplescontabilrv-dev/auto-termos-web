import React from 'react';
import { Colaborador, BancoHorasLancamento } from '../../types';
import { formatMinutesToPdfTime } from '../../utils/timeFormat';

interface LayoutPrintBancoHorasProps {
  mesAno: string;
  colaboradores: Colaborador[];
  allLancamentos: BancoHorasLancamento[];
  modoExibicao?: 'mes' | 'acumulado';
}

export default function LayoutPrintBancoHoras({
  mesAno,
  colaboradores,
  allLancamentos,
  modoExibicao = 'mes'
}: LayoutPrintBancoHorasProps) {
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

    if (modoExibicao === 'acumulado') {
      return {
        horasPositivas: totalPositivos,
        horasNegativas: totalNegativos,
        saldoGeral: totalPositivos - totalNegativos
      };
    }

    return {
      horasPositivas: mesPositivos,
      horasNegativas: mesNegativos,
      saldoGeral: mesPositivos - mesNegativos
    };
  };

  const sortedColaboradores = [...colaboradores].sort((a, b) =>
    a.nome.localeCompare(b.nome, 'pt-BR')
  );

  return (
    <>
      <style>{`
        @media print {
          @page {
            size: A4 landscape;
            margin: 10mm;
          }
          html, body {
            background-color: #ffffff !important;
            color: #000000 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>

      <div
        className="hidden print:block w-full bg-white text-black font-sans"
        style={{
          backgroundColor: '#ffffff',
          color: '#000000',
          pageBreakInside: 'avoid',
          breakInside: 'avoid',
        }}
      >
        {/* Moldura externa única estilo recibo oficial de banco de horas */}
        <div
          className="w-full border border-black box-border"
          style={{
            borderColor: '#000000',
            borderWidth: '1px',
            borderStyle: 'solid',
            backgroundColor: '#ffffff'
          }}
        >
          {/* Cabeçalho superior */}
          <div
            className="text-center py-2.5 px-4 font-bold uppercase tracking-wide border-b border-black"
            style={{
              fontSize: '13px',
              borderBottom: '1px solid #000000',
              letterSpacing: '0.02em',
              backgroundColor: '#ffffff',
              color: '#000000'
            }}
          >
            Controle de Banco de horas - SIMPLES ASSESSORIA CONTÁBIL E EMPRESARIAL
          </div>

          {/* Tabela de Lançamentos */}
          <table
            className="w-full border-collapse"
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              borderSpacing: 0
            }}
          >
            <thead>
              <tr
                style={{
                  backgroundColor: '#3b82f6',
                  color: '#ffffff',
                  WebkitPrintColorAdjust: 'exact',
                  printColorAdjust: 'exact'
                }}
              >
                <th
                  style={{
                    width: '36%',
                    padding: '6px 12px',
                    textAlign: 'left',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    borderRight: '1px solid #000000',
                    borderBottom: '1px solid #000000',
                    color: '#ffffff'
                  }}
                >
                  Colaborador
                </th>
                <th
                  style={{
                    width: '16%',
                    padding: '6px 8px',
                    textAlign: 'center',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    borderRight: '1px solid #000000',
                    borderBottom: '1px solid #000000',
                    color: '#ffffff'
                  }}
                >
                  Total Horas Positivas
                </th>
                <th
                  style={{
                    width: '16%',
                    padding: '6px 8px',
                    textAlign: 'center',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    borderRight: '1px solid #000000',
                    borderBottom: '1px solid #000000',
                    color: '#ffffff'
                  }}
                >
                  Total Horas Negativas
                </th>
                <th
                  style={{
                    width: '16%',
                    padding: '6px 8px',
                    textAlign: 'center',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    borderRight: '1px solid #000000',
                    borderBottom: '1px solid #000000',
                    color: '#ffffff'
                  }}
                >
                  Saldo Geral
                </th>
                <th
                  style={{
                    width: '16%',
                    padding: '6px 12px',
                    textAlign: 'left',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    borderBottom: '1px solid #000000',
                    color: '#ffffff'
                  }}
                >
                  ASS:
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedColaboradores.map((colab) => {
                const stats = getColabStats(colab.id!);

                // Ocultar inativos apenas se não tiverem saldo e nem horas no período
                if (
                  colab.ativo === false &&
                  stats.horasPositivas === 0 &&
                  stats.horasNegativas === 0 &&
                  stats.saldoGeral === 0
                ) {
                  return null;
                }

                return (
                  <tr
                    key={colab.id}
                    style={{
                      height: '28px',
                      pageBreakInside: 'avoid',
                      breakInside: 'avoid',
                      backgroundColor: '#ffffff'
                    }}
                  >
                    <td
                      style={{
                        padding: '5px 12px',
                        textAlign: 'left',
                        fontSize: '11px',
                        fontWeight: 'normal',
                        borderRight: '1px solid #000000',
                        borderBottom: '1px solid #000000',
                        textTransform: 'uppercase',
                        color: '#000000'
                      }}
                    >
                      {colab.nome}
                    </td>
                    <td
                      style={{
                        padding: '5px 8px',
                        textAlign: 'center',
                        fontSize: '11px',
                        borderRight: '1px solid #000000',
                        borderBottom: '1px solid #000000',
                        color: '#000000'
                      }}
                    >
                      {formatMinutesToPdfTime(stats.horasPositivas)}
                    </td>
                    <td
                      style={{
                        padding: '5px 8px',
                        textAlign: 'center',
                        fontSize: '11px',
                        borderRight: '1px solid #000000',
                        borderBottom: '1px solid #000000',
                        color: '#000000'
                      }}
                    >
                      {formatMinutesToPdfTime(stats.horasNegativas)}
                    </td>
                    <td
                      style={{
                        padding: '5px 8px',
                        textAlign: 'center',
                        fontSize: '11px',
                        borderRight: '1px solid #000000',
                        borderBottom: '1px solid #000000',
                        fontWeight: stats.saldoGeral !== 0 ? 'bold' : 'normal',
                        color: '#000000'
                      }}
                    >
                      {formatMinutesToPdfTime(stats.saldoGeral)}
                    </td>
                    <td
                      style={{
                        padding: '5px 12px',
                        borderBottom: '1px solid #000000'
                      }}
                    ></td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Área de Assinatura do Empregador dentro da moldura */}
          <div
            style={{
              paddingTop: '65px',
              paddingBottom: '35px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#ffffff'
            }}
          >
            <div
              style={{
                width: '260px',
                borderTop: '1px solid #000000',
                textAlign: 'center',
                paddingTop: '6px'
              }}
            >
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 'normal',
                  color: '#000000'
                }}
              >
                Empregador
              </span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
