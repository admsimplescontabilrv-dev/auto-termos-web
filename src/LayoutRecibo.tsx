import React from 'react';
import { DadosEmpresa, DadosFuncionario, Rubrica, ResultadoCalculo } from './types';

export const LayoutRecibo = ({
  dadosEmpresa,
  dadosFuncionario,
  todasRubricas,
  resultados,
  mesAnoRef
}: {
  dadosEmpresa: DadosEmpresa;
  dadosFuncionario: DadosFuncionario;
  todasRubricas: Rubrica[];
  resultados: ResultadoCalculo;
  mesAnoRef: string;
}) => {
  const formatMoney = (val: number) => val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const formatMesAno = (val: string) => {
    if (!val) return '';
    const [year, month] = val.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    const mStr = date.toLocaleString('pt-BR', { month: 'long' });
    const yStr = year.slice(2);
    return `${mStr}-${yStr}`;
  };
  
  const formattedMesAno = formatMesAno(mesAnoRef);

  const isProLabore = dadosEmpresa.tipoRecibo === 'prolabore' || todasRubricas.some(r => r.descricao.toUpperCase().includes('PRO LABORE') || r.descricao.toUpperCase().includes('PRÓ-LABORE'));
  const tituloRecibo = isProLabore ? 'Recibo de Pagamento de Pró-Labore' : 'Recibo de Pagamento de Salário';

  const codigoFormatado = String(dadosFuncionario.codigo || '1').padStart(3, '0');

  return (
    <div style={{
      fontFamily: 'Arial, Helvetica, sans-serif',
      fontSize: '11px',
      color: '#000',
      background: 'white',
      pageBreakInside: 'avoid',
      width: '100%',
      minWidth: '700px',
      maxWidth: '900px',
      height: '440px',
      margin: '0 auto',
      position: 'relative'
    }}>
      
      {/* Container Principal e Lateral */}
      <div style={{ display: 'flex', border: '1px solid #000', height: '100%' }}>
        
        {/* Esquerda - Conteúdo Principal */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          
          {/* Cabeçalho da Empresa */}
          <div style={{ borderBottom: '1px solid #000', display: 'flex' }}>
            <div style={{ flex: 1, padding: '6px', minWidth: 0, display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <div style={{ fontSize: '9px' }}>EMPREGADOR</div>
                <div style={{ fontWeight: 'bold', fontSize: '15px', marginRight: '20px' }}>{tituloRecibo}</div>
              </div>
              <div style={{ display: 'flex' }}>
                <span style={{ fontSize: '9px', width: '50px', textAlign: 'right', marginRight: '4px', alignSelf: 'center', flexShrink: 0 }}>Nome</span>
                <span style={{ fontWeight: 'bold', fontSize: '12px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{dadosEmpresa.nome}</span>
              </div>
              <div style={{ display: 'flex', marginTop: '2px' }}>
                <span style={{ fontSize: '9px', width: '50px', textAlign: 'right', marginRight: '4px', alignSelf: 'center', flexShrink: 0 }}>Endereço</span>
                <span style={{ 
                  fontWeight: 'bold', 
                  fontSize: '10px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  maxWidth: 'calc(100% - 10px)',
                  display: 'inline-block'
                }}>{dadosEmpresa.endereco}</span>
              </div>
              <div style={{ display: 'flex', marginTop: '2px' }}>
                <span style={{ fontSize: '9px', width: '50px', textAlign: 'right', marginRight: '4px', alignSelf: 'center', flexShrink: 0 }}>CNPJ</span>
                <span style={{ fontWeight: 'bold', fontSize: '11px' }}>{dadosEmpresa.cnpj}</span>
              </div>
            </div>
            
            <div style={{ 
              width: '150px', 
              textAlign: 'center', 
              borderLeft: '1px solid #000', 
              display: 'flex',
              flexDirection: 'column',
              alignSelf: 'stretch'
            }}>
              <div style={{ fontSize: '10px', padding: '2px', borderBottom: '1px solid #000' }}>Referente ao Mês / Ano</div>
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '14px', whiteSpace: 'nowrap', textTransform: 'uppercase' }}>
                {formattedMesAno}
              </div>
            </div>
          </div>

          {/* Dados Funcionário */}
          <table style={{ width: '100%', borderCollapse: 'collapse', borderBottom: '1px solid #000' }}>
            <thead>
              <tr style={{ fontSize: '9px' }}>
                <td style={{ padding: '2px 4px', width: '60px' }}>CÓDIGO</td>
                <td style={{ padding: '2px 4px' }}>NOME DO FUNCIONÁRIO</td>
                <td style={{ padding: '2px 4px', width: '200px' }}>FUNÇÃO</td>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ padding: '2px 4px', fontWeight: 'bold', fontSize: '12px' }}>{codigoFormatado}</td>
                <td style={{ padding: '2px 4px', fontWeight: 'bold', fontSize: '12px' }}>{dadosFuncionario.nome}</td>
                <td style={{ padding: '2px 4px', fontWeight: 'bold', fontSize: '12px' }}>{dadosFuncionario.funcao}</td>
              </tr>
            </tbody>
          </table>

          {/* Rubricas Tabela */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', height: '100%' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #000', fontSize: '10px' }}>
                  <td style={{ padding: '2px 4px', width: '50px', borderRight: '1px solid #000' }}>Cód.</td>
                  <td style={{ padding: '2px 4px', borderRight: '1px solid #000', textAlign: 'center' }}>Descrição</td>
                  <td style={{ padding: '2px 4px', width: '80px', textAlign: 'center', borderRight: '1px solid #000' }}>Referência</td>
                  <td style={{ padding: '2px 4px', width: '100px', textAlign: 'center', borderRight: '1px solid #000' }}>Proventos</td>
                  <td style={{ padding: '2px 4px', width: '100px', textAlign: 'center' }}>Descontos</td>
                </tr>
              </thead>
              <tbody style={{ verticalAlign: 'top', fontSize: '11px' }}>
                {todasRubricas.map((r, i) => (
                  <tr key={i}>
                    <td style={{ padding: '2px 4px', textAlign: 'right', borderRight: '1px solid #000' }}>{r.codigo}</td>
                    <td style={{ padding: '2px 4px', borderRight: '1px solid #000' }}>{r.descricao}</td>
                    <td style={{ padding: '2px 4px', textAlign: 'right', borderRight: '1px solid #000' }}>{r.referencia}</td>
                    <td style={{ padding: '2px 4px', textAlign: 'right', borderRight: '1px solid #000' }}>
                      {r.tipo === 'provento' && r.valor > 0 ? formatMoney(r.valor) : ''}
                    </td>
                    <td style={{ padding: '2px 4px', textAlign: 'right' }}>
                      {r.tipo === 'desconto' && r.valor > 0 ? formatMoney(r.valor) : ''}
                    </td>
                  </tr>
                ))}
                <tr>
                  <td style={{ height: '100%', borderRight: '1px solid #000' }}></td>
                  <td style={{ height: '100%', borderRight: '1px solid #000' }}></td>
                  <td style={{ height: '100%', borderRight: '1px solid #000' }}></td>
                  <td style={{ height: '100%', borderRight: '1px solid #000' }}></td>
                  <td style={{ height: '100%' }}></td>
                </tr>
              </tbody>
              <tfoot>
                <tr style={{ borderTop: '1px solid #000' }}>
                  <td colSpan={3} rowSpan={2} style={{ padding: '2px 4px', fontSize: '10px', borderRight: '1px solid #000', verticalAlign: 'bottom' }}>
                    MENSAGENS
                  </td>
                  <td style={{ borderRight: '1px solid #000', padding: 0, verticalAlign: 'top' }}>
                    <div style={{ fontSize: '9px', padding: '2px', borderBottom: '1px solid #000', textAlign: 'center' }}>Total dos Vencimentos</div>
                    <div style={{ padding: '4px', textAlign: 'right', fontSize: '12px' }}>{formatMoney(resultados.totalVencimentos)}</div>
                  </td>
                  <td style={{ padding: 0, verticalAlign: 'top' }}>
                    <div style={{ fontSize: '9px', padding: '2px', borderBottom: '1px solid #000', textAlign: 'center' }}>Total dos Descontos</div>
                    <div style={{ padding: '4px', textAlign: 'right', fontSize: '12px' }}>{formatMoney(resultados.totalDescontos)}</div>
                  </td>
                </tr>
                <tr style={{ borderTop: '1px solid #000' }}>
                  <td style={{ padding: '4px 8px', textAlign: 'center', fontWeight: 'bold', fontSize: '12px', borderRight: '1px solid #000' }}>
                    Líquido a Receber <span style={{fontSize: '14px'}}>→</span>
                  </td>
                  <td style={{ padding: '4px', textAlign: 'right', fontWeight: 'bold', fontSize: '13px' }}>
                    {formatMoney(resultados.liquidoReceber)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Rodapé - Bases */}
          <div style={{ display: 'flex', borderTop: '1px solid #000', fontSize: '9px' }}>
            <div style={{ flex: 1, padding: '2px 4px', textAlign: 'center', borderRight: '1px solid #000' }}>
              <div>Salário Base</div>
              <div style={{ marginTop: '2px', fontSize: '11px' }}>
                {resultados.salarioBase > 0 ? formatMoney(resultados.salarioBase) : ''}
              </div>
            </div>
            <div style={{ flex: 1, padding: '2px 4px', textAlign: 'center', borderRight: '1px solid #000' }}>
              <div>Base Cálc. INSS</div>
              <div style={{ marginTop: '2px', fontSize: '11px' }}>
                {dadosEmpresa.calcularTributos ? formatMoney(resultados.baseINSS) : ''}
              </div>
            </div>
            <div style={{ flex: 1, padding: '2px 4px', textAlign: 'center', borderRight: '1px solid #000' }}>
              <div>Base Calc. FGTS</div>
              <div style={{ marginTop: '2px', fontSize: '11px' }}>
                {dadosEmpresa.calcularTributos ? formatMoney(resultados.baseFGTS) : ''}
              </div>
            </div>
            <div style={{ flex: 1, padding: '2px 4px', textAlign: 'center', borderRight: '1px solid #000' }}>
              <div>FGTS do Mês</div>
              <div style={{ marginTop: '2px', fontSize: '11px' }}>
                {dadosEmpresa.calcularTributos ? formatMoney(resultados.valorFGTS) : ''}
              </div>
            </div>
            <div style={{ flex: 1, padding: '2px 4px', textAlign: 'center' }}>
              <div>Base Cálc. IRRF</div>
              <div style={{ marginTop: '2px', fontSize: '11px' }}>
                {dadosEmpresa.calcularTributos ? formatMoney(resultados.baseIRRF) : ''}
              </div>
            </div>
            <div style={{ flex: 1, padding: '2px 4px', textAlign: 'center', borderLeft: '1px solid #000' }}>
              <div>Faixa IRRF</div>
              <div style={{ marginTop: '2px', fontSize: '11px' }}>
                {dadosEmpresa.calcularTributos ? (resultados.faixaIRRF || 'Isento') : ''}
              </div>
            </div>
          </div>

        </div>

        {/* Barra Lateral - Assinatura (SVG) */}
        <div style={{
          width: '45px',
          minWidth: '45px',
          borderLeft: '1px solid #000',
          position: 'relative'
        }}>
          <svg
            width="45"
            height="100%"
            viewBox="0 0 45 440"
            preserveAspectRatio="none"
            style={{ width: '45px', height: '100%', display: 'block' }}
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Texto: DECLARO TER RECEBIDO A IMPORTÂNCIA LÍQUIDA DISCRIMINADA NESTE RECIBO */}
            <text
              x="14"
              y="435"
              transform="rotate(-90, 14, 435)"
              fontSize="7"
              fontFamily="Arial, Helvetica, sans-serif"
              fill="#000"
            >
              DECLARO TER RECEBIDO A IMPORTÂNCIA LÍQUIDA DISCRIMINADA NESTE RECIBO
            </text>

            {/* Texto: ASSINATURA DO FUNCIONÁRIO */}
            <text
              x="30"
              y="435"
              transform="rotate(-90, 30, 435)"
              fontSize="8"
              fontFamily="Arial, Helvetica, sans-serif"
              fill="#000"
            >
              ASSINATURA DO FUNCIONÁRIO - DATA: ___/___/___
            </text>
          </svg>
        </div>

      </div>

    </div>
  );
};

