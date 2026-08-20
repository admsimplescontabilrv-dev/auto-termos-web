import React from 'react';

// Aqui definimos os tipos para as props que o Layout vai receber
export interface TrctData {
  // Empregador
  cnpj: string;
  razaoSocial: string;
  enderecoEmpresa: string;
  bairroEmpresa: string;
  municipioEmpresa: string;
  ufEmpresa: string;
  cepEmpresa: string;
  cnae: string;
  // Trabalhador
  pis: string;
  nome: string;
  enderecoTrabalhador: string;
  bairroTrabalhador: string;
  municipioTrabalhador: string;
  ufTrabalhador: string;
  cepTrabalhador: string;
  ctps: string;
  cpf: string;
  dataNascimento: string;
  nomeMae: string;
  // Contrato
  tipoContrato: string;
  causaAfastamento: string;
  remuneracaoMesAnterior: number;
  dataAdmissao: string;
  dataAvisoPrevio: string;
  dataAfastamento: string;
  codigoAfastamento: string;
  pensaoAlimenticia: number;
  pensaoAlimenticiaFGTS: number;
  sindicato: string;
  cnpjSindicato: string;
  
  // Verbas
  proventos: { id: string; codigo: string; descricao: string; valor: number; }[];
  descontos: { id: string; codigo: string; descricao: string; valor: number; }[];
  
  diasSaldoSalario?: number;
  faltasDsr?: number;

  totalBruto: number;
  totalDeducoes: number;
  valorLiquido: number;
}

interface LayoutTRCTProps {
  data: TrctData;
}

export default function LayoutTRCT({ data }: LayoutTRCTProps) {
  const formatCurrency = (value: number | undefined | null) => {
    if (value === undefined || value === null || isNaN(value)) return '';
    return `R$ ${Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const getProvento = (codigo: string) => {
    return data.proventos.find(p => p.codigo === codigo);
  };
  
  const getDesconto = (codigo: string) => {
    return data.descontos.find(d => d.codigo === codigo);
  };

  const getCustomProventos = () => {
    const fixedCodes = ['50', '51', '52', '53', '54', '55', '56.1', '57', '58', '59', '60', '62', '63', '64.1', '65', '66.1', '68', '69', '70', '71', '99'];
    return data.proventos.filter(p => !fixedCodes.includes(p.codigo));
  };

  const getCustomDescontos = () => {
    const fixedCodes = ['100', '101', '102', '103', '112.1', '112.2', '114.1', '114.2'];
    return data.descontos.filter(d => !fixedCodes.includes(d.codigo));
  };

  const customProventos = getCustomProventos();
  const customDescontos = getCustomDescontos();
  
  const renderEmptyProventos = (startIndex: number, limit: number) => {
    if (startIndex < customProventos.length) {
      return (
        <>
          <td className="border border-black py-[2px] px-[4px]">{customProventos[startIndex].codigo} {customProventos[startIndex].descricao}</td>
          <td className="border border-black py-[2px] px-[4px] text-right">{formatCurrency(customProventos[startIndex].valor)}</td>
        </>
      );
    }
    return (
      <>
        <td className="border border-black py-[2px] px-[4px]">&nbsp;</td>
        <td className="border border-black py-[2px] px-[4px]"></td>
      </>
    );
  }

  const renderEmptyDescontos = (startIndex: number, limit: number) => {
    if (startIndex < customDescontos.length) {
      return (
        <>
          <td className="border border-black py-[2px] px-[4px]">{customDescontos[startIndex].codigo} {customDescontos[startIndex].descricao}</td>
          <td className="border border-black py-[2px] px-[4px] text-right">{formatCurrency(customDescontos[startIndex].valor)}</td>
        </>
      );
    }
    return (
      <>
        <td className="border border-black py-[2px] px-[4px]">&nbsp;</td>
        <td className="border border-black py-[2px] px-[4px]"></td>
      </>
    );
  }

  return (
    <div id="document-print-area" className="w-full flex flex-col items-center">
      <div className="page-container relative overflow-hidden bg-white text-black font-sans flex flex-col mx-auto shrink-0 print:m-0 print:w-full print:h-auto" style={{ maxWidth: '202mm', width: '100%', padding: '3mm', boxSizing: 'border-box' }}>
        
        {/* Título Principal */}
        <div className="text-center bg-gray-300 font-bold border border-black py-[1px] px-1 text-[9px] uppercase mb-[2px]">
          TERMO DE RESCISÃO DO CONTRATO DE TRABALHO
        </div>

        {/* IDENTIFICAÇÃO DO EMPREGADOR */}
        <table className="w-full text-[8px] border-collapse border border-black mb-[2px] leading-none">
          <tbody>
            <tr>
              <td colSpan={5} className="bg-gray-300 text-center font-bold border border-black uppercase text-[9px] py-[2px] px-[4px]">
                IDENTIFICAÇÃO DO EMPREGADOR
              </td>
            </tr>
            <tr>
              <td className="border border-black py-[2px] px-[4px] w-1/4">01 CNPJ/CEI<br/><span className="font-bold">{data.cnpj || ' '}</span></td>
              <td colSpan={4} className="border border-black py-[2px] px-[4px]">02 Razão Social/Nome<br/><span className="font-bold">{data.razaoSocial || ' '}</span></td>
            </tr>
            <tr>
              <td colSpan={4} className="border border-black py-[2px] px-[4px] w-[70%]">03 Endereço (logradouro, nº, andar, apartamento)<br/><span className="font-bold">{data.enderecoEmpresa || ' '}</span></td>
              <td className="border border-black py-[2px] px-[4px] w-[30%]">04 Bairro<br/><span className="font-bold">{data.bairroEmpresa || ' '}</span></td>
            </tr>
            <tr>
              <td className="border border-black py-[2px] px-[4px] w-1/3">05 Município<br/><span className="font-bold">{data.municipioEmpresa || ' '}</span></td>
              <td className="border border-black py-[2px] px-[4px] w-12">06 UF<br/><span className="font-bold">{data.ufEmpresa || ' '}</span></td>
              <td className="border border-black py-[2px] px-[4px] w-20">07 CEP<br/><span className="font-bold">{data.cepEmpresa || ' '}</span></td>
              <td className="border border-black py-[2px] px-[4px] w-24">08 CNAE<br/><span className="font-bold">{data.cnae || ' '}</span></td>
              <td className="border border-black py-[2px] px-[4px]">09 CNPJ/CEI Tomador/Obra<br/>&nbsp;</td>
            </tr>
          </tbody>
        </table>

        {/* IDENTIFICAÇÃO DO TRABALHADOR */}
        <table className="w-full text-[8px] border-collapse border border-black mb-[2px] leading-none">
          <tbody>
            <tr>
              <td colSpan={6} className="bg-gray-300 text-center font-bold border border-black uppercase text-[9px] py-[2px] px-[4px]">
                IDENTIFICAÇÃO DO TRABALHADOR
              </td>
            </tr>
            <tr>
              <td colSpan={2} className="border border-black py-[2px] px-[4px] w-1/3">10 PIS/PASEP<br/><span className="font-bold">{data.pis || ' '}</span></td>
              <td colSpan={4} className="border border-black py-[2px] px-[4px] w-2/3">11 Nome<br/><span className="font-bold">{data.nome || ' '}</span></td>
            </tr>
            <tr>
              <td colSpan={5} className="border border-black py-[2px] px-[4px] w-[70%]">12 Endereço (logradouro, nº, andar, apartamento)<br/><span className="font-bold">{data.enderecoTrabalhador || ' '}</span></td>
              <td className="border border-black py-[2px] px-[4px] w-[30%]">13 Bairro<br/><span className="font-bold">{data.bairroTrabalhador || ' '}</span></td>
            </tr>
            <tr>
              <td colSpan={2} className="border border-black py-[2px] px-[4px] w-1/3">14 Município<br/><span className="font-bold">{data.municipioTrabalhador || ' '}</span></td>
              <td className="border border-black py-[2px] px-[4px] w-12">15 UF<br/><span className="font-bold">{data.ufTrabalhador || ' '}</span></td>
              <td className="border border-black py-[2px] px-[4px] w-20">16 CEP<br/><span className="font-bold">{data.cepTrabalhador || ' '}</span></td>
              <td className="border border-black py-[2px] px-[4px] w-1/4">17 CTPS (nº, série, UF)<br/><span className="font-bold">{data.ctps || ' '}</span></td>
              <td className="border border-black py-[2px] px-[4px] w-1/4">18 CPF<br/><span className="font-bold">{data.cpf || ' '}</span></td>
            </tr>
            <tr>
              <td colSpan={2} className="border border-black py-[2px] px-[4px] w-1/3">19 Data de Nascimento<br/><span className="font-bold">{data.dataNascimento || ' '}</span></td>
              <td colSpan={4} className="border border-black py-[2px] px-[4px] w-2/3">20 Nome da Mãe<br/><span className="font-bold">{data.nomeMae || ' '}</span></td>
            </tr>
          </tbody>
        </table>

        {/* DADOS DO CONTRATO */}
        <table className="w-full text-[8px] border-collapse border border-black mb-[2px] leading-none">
          <tbody>
            <tr>
              <td colSpan={5} className="bg-gray-300 text-center font-bold border border-black uppercase text-[9px] py-[2px] px-[4px]">
                DADOS DO CONTRATO
              </td>
            </tr>
            <tr>
              <td colSpan={5} className="border border-black py-[2px] px-[4px]">21 Tipo de Contrato<br/><span className="font-bold">{data.tipoContrato || ' '}</span></td>
            </tr>
            <tr>
              <td colSpan={5} className="border border-black py-[2px] px-[4px]">22 Causa do Afastamento<br/><span className="font-bold">{data.causaAfastamento || ' '}</span></td>
            </tr>
            <tr>
              <td className="border border-black py-[2px] px-[4px] w-1/5">23 Remuneração Mês Ant.<br/><span className="font-bold">{formatCurrency(data.remuneracaoMesAnterior)}</span></td>
              <td className="border border-black py-[2px] px-[4px] w-1/5">24 Data de Admissão<br/><span className="font-bold">{data.dataAdmissao || ' '}</span></td>
              <td className="border border-black py-[2px] px-[4px] w-1/5">25 Data do Aviso Prévio<br/><span className="font-bold">{data.dataAvisoPrevio || ' '}</span></td>
              <td className="border border-black py-[2px] px-[4px] w-1/5">26 Data de Afastamento<br/><span className="font-bold">{data.dataAfastamento || ' '}</span></td>
              <td className="border border-black py-[2px] px-[4px] w-1/5">27 Cód. Afastamento<br/><span className="font-bold">{data.codigoAfastamento || ' '}</span></td>
            </tr>
            <tr>
              <td colSpan={2} className="border border-black py-[2px] px-[4px] w-[40%]">28 Pensão Alim. (%) (TRCT)<br/><span className="font-bold">{data.pensaoAlimenticia ? `${data.pensaoAlimenticia}%` : ' '}</span></td>
              <td className="border border-black py-[2px] px-[4px] w-1/5">29 Pensão Alim. (%) (FGTS)<br/><span className="font-bold">{data.pensaoAlimenticiaFGTS ? `${data.pensaoAlimenticiaFGTS}%` : ' '}</span></td>
              <td colSpan={2} className="border border-black py-[2px] px-[4px] w-[40%]">30 Categoria do Trabalhador<br/>&nbsp;</td>
            </tr>
            <tr>
              <td colSpan={2} className="border border-black py-[2px] px-[4px] w-[40%]">31 Código Sindical<br/>&nbsp;</td>
              <td colSpan={3} className="border border-black py-[2px] px-[4px] w-[60%]">32 CNPJ e Nome da Entidade Sindical Laboral<br/><span className="font-bold">{data.cnpjSindicato} {data.sindicato}</span></td>
            </tr>
          </tbody>
        </table>

        {/* VERBAS RESCISÓRIAS E DEDUÇÕES - TABELA ÚNICA */}
        <table className="w-full text-[8px] border-collapse border border-black mb-[2px] leading-none">
          <tbody>
            <tr>
              <td colSpan={6} className="bg-gray-300 text-center font-bold border border-black uppercase text-[9px] py-[2px] px-[4px]">
                DISCRIMINAÇÃO DAS VERBAS RESCISÓRIAS
              </td>
            </tr>
            {/* PROVENTOS */}
            <tr>
              <td colSpan={6} className="bg-gray-200 font-bold border border-black py-[2px] px-[4px]">VERBAS RESCISÓRIAS</td>
            </tr>
            <tr className="font-bold bg-gray-100">
              <td className="border border-black py-[2px] px-[4px] w-[25%]">Rubrica</td>
              <td className="border border-black py-[2px] px-[4px] w-[8%] text-center">Valor</td>
              <td className="border border-black py-[2px] px-[4px] w-[25%]">Rubrica</td>
              <td className="border border-black py-[2px] px-[4px] w-[8%] text-center">Valor</td>
              <td className="border border-black py-[2px] px-[4px] w-[25%]">Rubrica</td>
              <td className="border border-black py-[2px] px-[4px] w-[8%] text-center">Valor</td>
            </tr>
            
            {/* LINHA 1 */}
            <tr>
              <td className="border border-black py-[2px] px-[4px]">50 Saldo de {data.diasSaldoSalario || '___'}/dias Salário<br/>(líquido de {data.faltasDsr || '0'}/faltas e DSR)</td>
              <td className="border border-black py-[2px] px-[4px] text-right align-top">{formatCurrency(getProvento('50')?.valor)}</td>
              <td className="border border-black py-[2px] px-[4px] align-top">51 Comissões</td>
              <td className="border border-black py-[2px] px-[4px] text-right align-top">{formatCurrency(getProvento('51')?.valor)}</td>
              <td className="border border-black py-[2px] px-[4px] align-top">52 Gratificação</td>
              <td className="border border-black py-[2px] px-[4px] text-right align-top">{formatCurrency(getProvento('52')?.valor)}</td>
            </tr>
            {/* LINHA 2 */}
            <tr>
              <td className="border border-black py-[2px] px-[4px] align-top">53 Adic. de Insalubridade<br/>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;%</td>
              <td className="border border-black py-[2px] px-[4px] text-right align-top">{formatCurrency(getProvento('53')?.valor)}</td>
              <td className="border border-black py-[2px] px-[4px] align-top">54 Adic. de<br/>Periculosidade &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;%</td>
              <td className="border border-black py-[2px] px-[4px] text-right align-top">{formatCurrency(getProvento('54')?.valor)}</td>
              <td className="border border-black py-[2px] px-[4px] align-top">55 Adic. Noturno<br/>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Horas a &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;%</td>
              <td className="border border-black py-[2px] px-[4px] text-right align-top">{formatCurrency(getProvento('55')?.valor)}</td>
            </tr>
            {/* LINHA 3 */}
            <tr>
              <td className="border border-black py-[2px] px-[4px] align-top">56.1 Horas Extras &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;horas a<br/>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;%</td>
              <td className="border border-black py-[2px] px-[4px] text-right align-top">{formatCurrency(getProvento('56.1')?.valor)}</td>
              <td className="border border-black py-[2px] px-[4px] align-top">57 Gorjetas</td>
              <td className="border border-black py-[2px] px-[4px] text-right align-top">{formatCurrency(getProvento('57')?.valor)}</td>
              <td className="border border-black py-[2px] px-[4px] align-top">58 Descanso Semanal<br/>Remunerado (DSR)</td>
              <td className="border border-black py-[2px] px-[4px] text-right align-top">{formatCurrency(getProvento('58')?.valor)}</td>
            </tr>
            {/* LINHA 4 */}
            <tr>
              <td className="border border-black py-[2px] px-[4px] align-top">59 Reflexo do DSR sobre Salário<br/>Variável</td>
              <td className="border border-black py-[2px] px-[4px] text-right align-top">{formatCurrency(getProvento('59')?.valor)}</td>
              <td className="border border-black py-[2px] px-[4px] align-top">60 Multa Art. 477, §<br/>8º/CLT</td>
              <td className="border border-black py-[2px] px-[4px] text-right align-top">{formatCurrency(getProvento('60')?.valor)}</td>
              <td className="border border-black py-[2px] px-[4px] align-top">62 Salário-Família</td>
              <td className="border border-black py-[2px] px-[4px] text-right align-top">{formatCurrency(getProvento('62')?.valor)}</td>
            </tr>
            {/* LINHA 5 */}
            <tr>
              <td className="border border-black py-[2px] px-[4px] align-top">63 13º Salário Proporcional<br/>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;/12 avos</td>
              <td className="border border-black py-[2px] px-[4px] text-right align-top">{formatCurrency(getProvento('63')?.valor)}</td>
              <td className="border border-black py-[2px] px-[4px] align-top">64.1 13º Salário–Exerc.<br/>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;- /12 avos</td>
              <td className="border border-black py-[2px] px-[4px] text-right align-top">{formatCurrency(getProvento('64.1')?.valor)}</td>
              <td className="border border-black py-[2px] px-[4px] align-top">65 Férias Proporc<br/>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;/12 avos</td>
              <td className="border border-black py-[2px] px-[4px] text-right align-top">{formatCurrency(getProvento('65')?.valor)}</td>
            </tr>
            {/* LINHA 6 */}
            <tr>
              <td className="border border-black py-[2px] px-[4px] align-top">66.1 Férias Venc. Per. Aquisitivo<br/>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;a</td>
              <td className="border border-black py-[2px] px-[4px] text-right align-top">{formatCurrency(getProvento('66.1')?.valor)}</td>
              <td className="border border-black py-[2px] px-[4px] align-top">68 Terço Constituc. de<br/>Férias</td>
              <td className="border border-black py-[2px] px-[4px] text-right align-top">{formatCurrency(getProvento('68')?.valor)}</td>
              <td className="border border-black py-[2px] px-[4px] align-top">69 Aviso Prévio<br/>Indenizado</td>
              <td className="border border-black py-[2px] px-[4px] text-right align-top">{formatCurrency(getProvento('69')?.valor)}</td>
            </tr>
            {/* LINHA 7 */}
            <tr>
              <td className="border border-black py-[2px] px-[4px] align-top">70 13º Salário (Aviso Prévio<br/>Indenizado)</td>
              <td className="border border-black py-[2px] px-[4px] text-right align-top">{formatCurrency(getProvento('70')?.valor)}</td>
              <td className="border border-black py-[2px] px-[4px] align-top">71 Férias (Aviso Prévio<br/>Indenizado)</td>
              <td className="border border-black py-[2px] px-[4px] text-right align-top">{formatCurrency(getProvento('71')?.valor)}</td>
              {renderEmptyProventos(0, 1)}
            </tr>
            {/* LINHA DE RESPIRO PROVENTOS */}
            <tr>
              {renderEmptyProventos(1, 1)}
              {renderEmptyProventos(2, 1)}
              {renderEmptyProventos(3, 1)}
            </tr>
            
            {/* TOTAL BRUTO */}
            <tr>
              {renderEmptyProventos(10, 1)}
              <td className="border border-black py-[2px] px-[4px] align-top">99 Ajuste do saldo<br/>devedor</td>
              <td className="border border-black py-[2px] px-[4px] text-right align-top">{formatCurrency(getProvento('99')?.valor)}</td>
              <td className="border border-black py-[2px] px-[4px] font-bold bg-gray-200">TOTAL BRUTO</td>
              <td className="border border-black py-[2px] px-[4px] font-bold text-right bg-gray-200">{formatCurrency(data.totalBruto)}</td>
            </tr>

            {/* DEDUÇÕES */}
            <tr>
              <td colSpan={6} className="bg-gray-200 font-bold border border-black py-[2px] px-[4px]">DEDUÇÕES</td>
            </tr>
            <tr className="font-bold bg-gray-100">
              <td className="border border-black py-[2px] px-[4px]">Desconto</td>
              <td className="border border-black py-[2px] px-[4px] text-center">Valor</td>
              <td className="border border-black py-[2px] px-[4px]">Desconto</td>
              <td className="border border-black py-[2px] px-[4px] text-center">Valor</td>
              <td className="border border-black py-[2px] px-[4px]">Desconto</td>
              <td className="border border-black py-[2px] px-[4px] text-center">Valor</td>
            </tr>
            {/* LINHA 1 DESC */}
            <tr>
              <td className="border border-black py-[2px] px-[4px] align-top">100 Pensão Alimentícia</td>
              <td className="border border-black py-[2px] px-[4px] text-right align-top">{formatCurrency(getDesconto('100')?.valor)}</td>
              <td className="border border-black py-[2px] px-[4px] align-top">101 Adiantamento Salarial</td>
              <td className="border border-black py-[2px] px-[4px] text-right align-top">{formatCurrency(getDesconto('101')?.valor)}</td>
              <td className="border border-black py-[2px] px-[4px] align-top">102 Adiantamento 13º<br/>Salário</td>
              <td className="border border-black py-[2px] px-[4px] text-right align-top">{formatCurrency(getDesconto('102')?.valor)}</td>
            </tr>
            {/* LINHA 2 DESC */}
            <tr>
              <td className="border border-black py-[2px] px-[4px] align-top">103 Aviso Prévio Indenizado<br/>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;dias</td>
              <td className="border border-black py-[2px] px-[4px] text-right align-top">{formatCurrency(getDesconto('103')?.valor)}</td>
              <td className="border border-black py-[2px] px-[4px] align-top">112.1 Previdência Social</td>
              <td className="border border-black py-[2px] px-[4px] text-right align-top">{formatCurrency(getDesconto('112.1')?.valor)}</td>
              <td className="border border-black py-[2px] px-[4px] align-top">112.2 Prev Social - 13º<br/>Salário</td>
              <td className="border border-black py-[2px] px-[4px] text-right align-top">{formatCurrency(getDesconto('112.2')?.valor)}</td>
            </tr>
            {/* LINHA 3 DESC */}
            <tr>
              <td className="border border-black py-[2px] px-[4px] align-top">114.1 IRRF</td>
              <td className="border border-black py-[2px] px-[4px] text-right align-top">{formatCurrency(getDesconto('114.1')?.valor)}</td>
              <td className="border border-black py-[2px] px-[4px] align-top">114.2 IRRF sobre 13º<br/>Salário</td>
              <td className="border border-black py-[2px] px-[4px] text-right align-top">{formatCurrency(getDesconto('114.2')?.valor)}</td>
              {renderEmptyDescontos(0, 1)}
            </tr>
            {/* LINHA DE RESPIRO DESC */}
            <tr>
              {renderEmptyDescontos(1, 1)}
              {renderEmptyDescontos(2, 1)}
              {renderEmptyDescontos(3, 1)}
            </tr>
            {/* TOTAL DEDUÇÕES */}
            <tr>
              {renderEmptyDescontos(7, 1)}
              {renderEmptyDescontos(8, 1)}
              <td className="border border-black py-[2px] px-[4px] font-bold bg-gray-200">TOTAL DEDUÇÕES</td>
              <td className="border border-black py-[2px] px-[4px] font-bold text-right bg-gray-200">{formatCurrency(data.totalDeducoes)}</td>
            </tr>
            {/* VALOR LÍQUIDO */}
            <tr>
              {renderEmptyDescontos(9, 1)}
              {renderEmptyDescontos(10, 1)}
              <td className="border border-black py-[2px] px-[4px] font-bold bg-gray-300">VALOR LÍQUIDO</td>
              <td className="border border-black py-[2px] px-[4px] font-bold text-right bg-gray-300">{formatCurrency(data.valorLiquido)}</td>
            </tr>
          </tbody>
        </table>

        {/* ASSINATURAS */}
        <table className="w-full text-[8px] border-collapse border border-black mb-0 leading-none text-center mt-[3px]">
          <tbody>
            <tr>
              <td className="border border-black py-[4px] px-1 w-1/2 align-bottom" style={{ height: '70px' }}>
                _____________________________________________________<br/>
                <span className="font-bold">{data.razaoSocial || 'EMPREGADOR'}</span><br/>
                Empregador
              </td>
              <td className="border border-black py-[4px] px-1 w-1/2 align-bottom" style={{ height: '70px' }}>
                _____________________________________________________<br/>
                <span className="font-bold">{data.nome || 'TRABALHADOR'}</span><br/>
                Empregado
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

