export interface Sindicato {
  id: string;
  nome: string;
  cnpj: string;
  codigo: string;
}

export interface Empresa {
  id: string;
  nome: string;
  cnpj: string;
  codigo: string;
  sindicatoId: string;
}

export interface ChecklistRule {
  id: string;
  type: 'FOLHA' | 'FERIAS' | 'RESCISAO';
  description: string;
  targetType: 'GLOBAL' | 'SINDICATO' | 'EMPRESA';
  targetId?: string;
  competencias?: string[];
}

export interface ChecklistItem {
  id: string;
  ruleId?: string;
  empresaId: string;
  competencia: string;
  type: 'FOLHA' | 'FERIAS' | 'RESCISAO';
  description: string;
  status: 'PENDENTE' | 'CONCLUIDO';
  observacao?: string;
}

export interface SavedTemplate {
  id: string;
  name: string;
  content: string;
  lastUsed: number;
}

export interface Rubrica {
  codigo: number;
  descricao: string;
  referencia: string;
  valor: number;
  tipo: 'provento' | 'desconto';
}

export interface DadosEmpresa {
  nome: string;
  cnpj: string;
  endereco: string;
  mesAno: string;
  mesAnoFinal?: string;
  geracaoEmLote?: boolean;
  variarValores?: boolean;
  tipoRecibo: 'salario' | 'prolabore';
  calcularTributos?: boolean;
  calcularINSS?: boolean;
  calcularIRRF?: boolean;
  calcularFGTS?: boolean;
}

export interface DadosFuncionario {
  codigo: string;
  nome: string;
  funcao: string;
  cbo: string;
  numeroDependentes: number;
  salarioBaseContratual?: number;
  diasTrabalhados?: number;
}

export interface ResultadoCalculo {
  totalVencimentos: number;
  totalDescontos: number;
  liquidoReceber: number;
  baseINSS: number;
  valorINSS: number;
  baseIRRF: number;
  valorIRRF: number;
  faixaIRRF: string;
  salarioBase: number;
  baseFGTS: number;
  valorFGTS: number;
}
