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
  const [ano, mes] = mesAno.split('-');
  const mesFormatado = new Date(parseInt(ano), parseInt(mes) - 1, 1).toLocaleDateString('pt-BR', {
    month: 'long',
    year: 'numeric'
  });

  const dataEmissao = new Date().toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });

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

  const sortedColaboradores = [...colaboradores]
    .filter(c => c.ativo !== false)
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));

  // Totais consolidados da empresa
  let somaPositivas = 0;
  let somaNegativas = 0;

  sortedColaboradores.forEach(c => {
    const stats = getColabStats(c.id!);
    somaPositivas += stats.horasPositivas;
    somaNegativas += stats.horasNegativas;
  });

  const saldoConsolidado = somaPositivas - somaNegativas;

  return (
    <>
      <style>{`
        @media print {
          @page {
            size: A4 landscape;
            margin: 8mm 10mm;
          }
          html, body {
            background-color: #ffffff !important;
            color: #0f172a !important;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>

      <div
        className="hidden print:block w-full bg-white text-slate-900 font-sans"
        style={{
          backgroundColor: '#ffffff',
          color: '#0f172a',
          pageBreakInside: 'avoid',
          breakInside: 'avoid',
          width: '100%',
          maxWidth: '100%',
          margin: '0 auto',
          boxSizing: 'border-box'
        }}
      >
        {/* Moldura Executiva com Identidade Visual da Simples Assessoria */}
        <div
          style={{
            border: '2px solid #1e293b',
            borderRadius: '6px',
            backgroundColor: '#ffffff',
            overflow: 'hidden'
          }}
        >
          {/* CABEÇALHO OFICIAL COM BRANDING SIMPLES ASSESSORIA */}
          <div
            style={{
              padding: '12px 18px',
              backgroundColor: '#ffffff',
              borderBottom: '2px solid #1e293b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '16px'
            }}
          >
            {/* Lado Esquerdo: Logo e Dados da Empresa */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <img
                src="/logo.png?v=2"
                alt="Logo Simples Assessoria"
                style={{
                  height: '42px',
                  width: '42px',
                  objectFit: 'contain'
                }}
              />
              <div>
                <h1
                  style={{
                    fontSize: '13px',
                    fontWeight: '900',
                    color: '#0f172a',
                    margin: 0,
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    lineHeight: '1.2'
                  }}
                >
                  SIMPLES ASSESSORIA CONTÁBIL E EMPRESARIAL
                </h1>
                <p
                  style={{
                    fontSize: '10px',
                    color: '#475569',
                    margin: '2px 0 0 0',
                    fontWeight: '600',
                    letterSpacing: '0.02em'
                  }}
                >
                  CNPJ: 27.205.802/0001-94 • DEPARTAMENTO PESSOAL & RH
                </p>
              </div>
            </div>

            {/* Lado Direito: Identificador do Documento e Competência */}
            <div style={{ textAlign: 'right' }}>
              <div
                style={{
                  display: 'inline-block',
                  backgroundColor: '#1e3a8a',
                  color: '#ffffff',
                  fontSize: '11px',
                  fontWeight: '800',
                  padding: '3px 10px',
                  borderRadius: '4px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}
              >
                CONTROLE DE BANCO DE HORAS
              </div>
              <p
                style={{
                  fontSize: '10px',
                  color: '#334155',
                  margin: '4px 0 0 0',
                  fontWeight: '600'
                }}
              >
                Competência: <strong style={{ color: '#0f172a', textTransform: 'capitalize' }}>{mesFormatado}</strong>
                {modoExibicao === 'acumulado' && ' (Acumulado Geral)'} • Emissão: {dataEmissao}
              </p>
            </div>
          </div>

          {/* Faixa decorativa nobre dourada / corporativa da marca */}
          <div
            style={{
              height: '3px',
              backgroundColor: '#D1A751',
              width: '100%'
            }}
          />

          {/* TABELA DE BANCO DE HORAS COM LAYOUT EXECUTIVO */}
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              borderSpacing: 0,
              fontSize: '11px'
            }}
          >
            <thead>
              <tr
                style={{
                  backgroundColor: '#1e3a8a',
                  color: '#ffffff',
                  WebkitPrintColorAdjust: 'exact',
                  printColorAdjust: 'exact'
                }}
              >
                <th
                  style={{
                    width: '34%',
                    padding: '7px 12px',
                    textAlign: 'left',
                    fontWeight: '800',
                    fontSize: '11px',
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                    borderRight: '1px solid #334155',
                    color: '#ffffff'
                  }}
                >
                  Colaborador
                </th>
                <th
                  style={{
                    width: '16%',
                    padding: '7px 8px',
                    textAlign: 'center',
                    fontWeight: '800',
                    fontSize: '11px',
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                    borderRight: '1px solid #334155',
                    color: '#ffffff'
                  }}
                >
                  Total Horas Positivas
                </th>
                <th
                  style={{
                    width: '16%',
                    padding: '7px 8px',
                    textAlign: 'center',
                    fontWeight: '800',
                    fontSize: '11px',
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                    borderRight: '1px solid #334155',
                    color: '#ffffff'
                  }}
                >
                  Total Horas Negativas
                </th>
                <th
                  style={{
                    width: '16%',
                    padding: '7px 8px',
                    textAlign: 'center',
                    fontWeight: '800',
                    fontSize: '11px',
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                    borderRight: '1px solid #334155',
                    color: '#ffffff'
                  }}
                >
                  Saldo Geral
                </th>
                <th
                  style={{
                    width: '18%',
                    padding: '7px 12px',
                    textAlign: 'left',
                    fontWeight: '800',
                    fontSize: '11px',
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                    color: '#ffffff'
                  }}
                >
                  ASS:
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedColaboradores.map((colab, idx) => {
                const stats = getColabStats(colab.id!);
                const isEven = idx % 2 === 0;

                return (
                  <tr
                    key={colab.id}
                    style={{
                      height: '27px',
                      backgroundColor: isEven ? '#ffffff' : '#f8fafc',
                      borderBottom: '1px solid #cbd5e1',
                      pageBreakInside: 'avoid',
                      breakInside: 'avoid'
                    }}
                  >
                    <td
                      style={{
                        padding: '5px 12px',
                        textAlign: 'left',
                        fontWeight: '700',
                        fontSize: '10.5px',
                        borderRight: '1px solid #cbd5e1',
                        color: '#0f172a',
                        textTransform: 'uppercase'
                      }}
                    >
                      {colab.nome}
                    </td>
                    <td
                      style={{
                        padding: '5px 8px',
                        textAlign: 'center',
                        fontSize: '11px',
                        fontFamily: 'monospace',
                        fontWeight: '600',
                        borderRight: '1px solid #cbd5e1',
                        color: stats.horasPositivas > 0 ? '#15803d' : '#475569'
                      }}
                    >
                      {formatMinutesToPdfTime(stats.horasPositivas)}
                    </td>
                    <td
                      style={{
                        padding: '5px 8px',
                        textAlign: 'center',
                        fontSize: '11px',
                        fontFamily: 'monospace',
                        fontWeight: '600',
                        borderRight: '1px solid #cbd5e1',
                        color: stats.horasNegativas > 0 ? '#b91c1c' : '#475569'
                      }}
                    >
                      {formatMinutesToPdfTime(stats.horasNegativas)}
                    </td>
                    <td
                      style={{
                        padding: '5px 8px',
                        textAlign: 'center',
                        fontSize: '11px',
                        fontFamily: 'monospace',
                        fontWeight: '800',
                        borderRight: '1px solid #cbd5e1',
                        color:
                          stats.saldoGeral > 0
                            ? '#15803d'
                            : stats.saldoGeral < 0
                            ? '#b91c1c'
                            : '#475569'
                      }}
                    >
                      {formatMinutesToPdfTime(stats.saldoGeral)}
                    </td>
                    <td
                      style={{
                        padding: '5px 12px'
                      }}
                    />
                  </tr>
                );
              })}

              {/* LINHA DE TOTAIS CONSOLIDADOS DA EMPRESA */}
              <tr
                style={{
                  backgroundColor: '#f1f5f9',
                  borderTop: '2px solid #1e293b',
                  borderBottom: '1px solid #1e293b',
                  fontWeight: '800',
                  height: '28px'
                }}
              >
                <td
                  style={{
                    padding: '5px 12px',
                    textAlign: 'left',
                    fontSize: '10.5px',
                    textTransform: 'uppercase',
                    color: '#0f172a',
                    borderRight: '1px solid #cbd5e1',
                    letterSpacing: '0.03em'
                  }}
                >
                  TOTAIS DA EMPRESA
                </td>
                <td
                  style={{
                    padding: '5px 8px',
                    textAlign: 'center',
                    fontFamily: 'monospace',
                    fontSize: '11px',
                    color: '#15803d',
                    borderRight: '1px solid #cbd5e1'
                  }}
                >
                  {formatMinutesToPdfTime(somaPositivas)}
                </td>
                <td
                  style={{
                    padding: '5px 8px',
                    textAlign: 'center',
                    fontFamily: 'monospace',
                    fontSize: '11px',
                    color: '#b91c1c',
                    borderRight: '1px solid #cbd5e1'
                  }}
                >
                  {formatMinutesToPdfTime(somaNegativas)}
                </td>
                <td
                  style={{
                    padding: '5px 8px',
                    textAlign: 'center',
                    fontFamily: 'monospace',
                    fontSize: '11px',
                    borderRight: '1px solid #cbd5e1',
                    color:
                      saldoConsolidado > 0
                        ? '#15803d'
                        : saldoConsolidado < 0
                        ? '#b91c1c'
                        : '#0f172a'
                  }}
                >
                  {formatMinutesToPdfTime(saldoConsolidado)}
                </td>
                <td
                  style={{
                    padding: '5px 12px',
                    fontSize: '9px',
                    color: '#64748b',
                    fontStyle: 'italic'
                  }}
                >
                  Apuração Consolidada
                </td>
              </tr>
            </tbody>
          </table>

          {/* TERMO FORMAL E ÁREA DE ASSINATURA DUPLA (RESPONSÁVEL DP + EMPREGADOR) */}
          <div
            style={{
              padding: '24px 20px 18px 20px',
              backgroundColor: '#ffffff'
            }}
          >
            <p
              style={{
                fontSize: '9.5px',
                color: '#64748b',
                textAlign: 'center',
                margin: '0 0 35px 0',
                lineHeight: '1.4'
              }}
            >
              Declaramos para os devidos fins que o controle e os saldos apurados acima refletem com fidelidade os registros de espelho de ponto e banco de horas dos colaboradores do período.
            </p>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-around',
                alignItems: 'center',
                gap: '40px'
              }}
            >
              {/* Assinatura Responsável DP */}
              <div
                style={{
                  width: '280px',
                  textAlign: 'center'
                }}
              >
                <div style={{ borderTop: '1px solid #0f172a', paddingTop: '5px' }}>
                  <p
                    style={{
                      fontSize: '11px',
                      fontWeight: '700',
                      textTransform: 'uppercase',
                      color: '#0f172a',
                      margin: 0
                    }}
                  >
                    Departamento Pessoal & RH
                  </p>
                  <p
                    style={{
                      fontSize: '9.5px',
                      color: '#64748b',
                      margin: '2px 0 0 0'
                    }}
                  >
                    Simples Assessoria Contábil
                  </p>
                </div>
              </div>

              {/* Assinatura Empregador */}
              <div
                style={{
                  width: '280px',
                  textAlign: 'center'
                }}
              >
                <div style={{ borderTop: '1px solid #0f172a', paddingTop: '5px' }}>
                  <p
                    style={{
                      fontSize: '11px',
                      fontWeight: '800',
                      textTransform: 'uppercase',
                      color: '#0f172a',
                      margin: 0
                    }}
                  >
                    SIMPLES ASSESSORIA CONTÁBIL E EMPRESARIAL
                  </p>
                  <p
                    style={{
                      fontSize: '9.5px',
                      color: '#64748b',
                      margin: '2px 0 0 0'
                    }}
                  >
                    CNPJ: 27.205.802/0001-94 — Empregador
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* RODAPÉ DO DOCUMENTO */}
          <div
            style={{
              padding: '6px 16px',
              backgroundColor: '#f8fafc',
              borderTop: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '8.5px',
              color: '#64748b'
            }}
          >
            <span>Sistema DP • Simples Assessoria Contábil e Empresarial</span>
            <span>Documento Emitido Eletronicamente • Página 1 de 1</span>
          </div>
        </div>
      </div>
    </>
  );
}
