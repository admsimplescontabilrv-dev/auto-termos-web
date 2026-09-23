// Lista oficial de empresas excluídas do módulo DP & RH fornecida pelo usuário
export interface ExcludedCompany {
  nome: string;
  cnpj: string; // formato limpo (somente números)
  cnpjOriginal: string;
}

export const EXCLUDED_DPRH_COMPANIES: ExcludedCompany[] = [
  { nome: "Aço DLR Ltda", cnpj: "55860930000107", cnpjOriginal: "55.860.930/0001-07" },
  { nome: "Agi Consultoria E Assessoria De Negocios Ltda", cnpj: "39941142000199", cnpjOriginal: "39.941.142/0001-99" },
  { nome: "Agropontes Comercial Agricola Ltda-Filial", cnpj: "63657632000223", cnpjOriginal: "63.657.632/0002-23" },
  { nome: "Amperes", cnpj: "47023507000124", cnpjOriginal: "47.023.507/0001-24" },
  { nome: "Amperes Industria E Instalacoes Eletricas Ltda", cnpj: "63942647000152", cnpjOriginal: "63.942.647/0001-52" },
  { nome: "ANA PAULA MORAIS - DOMÉSTICA", cnpj: "71303057115", cnpjOriginal: "713.030.571-15" },
  { nome: "Angela da Silkva Paula de Oliveira", cnpj: "32426812000190", cnpjOriginal: "32.426.812/0001-90" },
  { nome: "AromaPro Brasil LTDA", cnpj: "62112419000192", cnpjOriginal: "62.112.419/0001-92" },
  { nome: "Beija Flor Assessoria", cnpj: "42824513000167", cnpjOriginal: "42.824.513/0001-67" },
  { nome: "BF Galpões e Alambrados Ltda (municipio de goias)", cnpj: "32448329000106", cnpjOriginal: "32.448.329/0001-06" },
  { nome: "Brk Truck Center Ltda", cnpj: "66459731000108", cnpjOriginal: "66.459.731/0001-08" },
  { nome: "Centro de Treinamento Ramon Ataides Ltda", cnpj: "48182755000180", cnpjOriginal: "48.182.755/0001-80" },
  { nome: "Comercial Esperança Ltda", cnpj: "43086605000150", cnpjOriginal: "43.086.605/0001-50" },
  { nome: "Cristalê Comercio de Tintas", cnpj: "14287075000100", cnpjOriginal: "14.287.075/0001-00" },
  { nome: "DIVINO FRANCISCO DOS SANTOS JUNIOR 99604779168-Cabral", cnpj: "21716589000107", cnpjOriginal: "21.716.589/0001-07" },
  { nome: "Doce Mel Embalagens e Limpeza LTDA", cnpj: "64073841000125", cnpjOriginal: "64.073.841/0001-25" },
  { nome: "DOUGLAS MORAIS - DOMÉSTICA", cnpj: "87508940130", cnpjOriginal: "875.089.401-30" },
  { nome: "E F DIAS PRIME LTDA (EMPORIO PRIME)", cnpj: "67825488000167", cnpjOriginal: "67.825.488/0001-67" },
  { nome: "E&B Assesoria LTDA", cnpj: "35106380000128", cnpjOriginal: "35.106.380/0001-28" },
  { nome: "Evolut Seg Portaria e Serviços LTDA", cnpj: "40820075000133", cnpjOriginal: "40.820.075/0001-33" },
  { nome: "F. Erick Fernandes EIRELI", cnpj: "30082786000102", cnpjOriginal: "30.082.786/0001-02" },
  { nome: "Falcon Agro Sistemas (MUDOU DE CONTADOR)", cnpj: "59594775000185", cnpjOriginal: "59.594.775/0001-85" },
  { nome: "Gdc Tecnologia Ltda", cnpj: "50641230000108", cnpjOriginal: "50.641.230/0001-08" },
  { nome: "Gr Soluções Industriais Ltda", cnpj: "50297500000105", cnpjOriginal: "50.297.500/0001-05" },
  { nome: "Grain Logistica Ltda", cnpj: "27603963000136", cnpjOriginal: "27.603.963/0001-36" },
  { nome: "Instituto Humanous de Orientação e Performance Profissional LTDA", cnpj: "68360966000173", cnpjOriginal: "68.360.966/0001-73" },
  { nome: "João Batista Silva Pacheco Ltda (usuário particular)", cnpj: "34143288000175", cnpjOriginal: "34.143.288/0001-75" },
  { nome: "Kaza Posta Ltda", cnpj: "39345473000166", cnpjOriginal: "39.345.473/0001-66" },
  { nome: "Ko'ach Construtora E Incorporadora Ltda", cnpj: "62060808000111", cnpjOriginal: "62.060.808/0001-11" },
  { nome: "Lanchonte Ki Bagunça", cnpj: "48606997000154", cnpjOriginal: "48.606.997/0001-54" },
  { nome: "Leão e Proto Ltda", cnpj: "05815742000199", cnpjOriginal: "05.815.742/0001-99" },
  { nome: "Lg Consultoria Em Administracao E Tecnologia Ltda", cnpj: "08862565000190", cnpjOriginal: "08.862.565/0001-90" },
  { nome: "Liber Trading Ltda- Filial", cnpj: "63657511000281", cnpjOriginal: "63.657.511/0002-81" },
  { nome: "LR Global Moto Peças", cnpj: "50875785000114", cnpjOriginal: "50.875.785/0001-14" },
  { nome: "M.B. Muniz LTDA", cnpj: "58866967000130", cnpjOriginal: "58.866.967/0001-30" },
  { nome: "Marcos Humbetto Chagas", cnpj: "59058244000178", cnpjOriginal: "59.058.244/0001-78" },
  { nome: "Master Poke Empório e Temakeria", cnpj: "41818821000117", cnpjOriginal: "41.818.821/0001-17" },
  { nome: "Minas Mais Comércio Ltda", cnpj: "32456474000139", cnpjOriginal: "32.456.474/0001-39" },
  { nome: "Morah Negócios e Serviços Ltda.", cnpj: "48292481000182", cnpjOriginal: "48.292.481/0001-82" },
  { nome: "Mundial Planeta Cursos E Assessoria", cnpj: "00099178000131", cnpjOriginal: "00.099.178/0001-31" },
  { nome: "Oliveira E Cardoso Centro De Saude Ltda", cnpj: "51842850000178", cnpjOriginal: "51.842.850/0001-78" },
  { nome: "Pamplona Agro Industrial Ltda", cnpj: "66255932000193", cnpjOriginal: "66.255.932/0001-93" },
  { nome: "Rações Nova Aliança Compra e Venda de Grãos LTDA", cnpj: "36330258000101", cnpjOriginal: "36.330.258/0001-01" },
  { nome: "Rancheiro Agro Ltda", cnpj: "66260486000105", cnpjOriginal: "66.260.486/0001-05" },
  { nome: "Restaurante Proza", cnpj: "52264394000199", cnpjOriginal: "52.264.394/0001-99" },
  { nome: "Rodorapha", cnpj: "28165443000151", cnpjOriginal: "28.165.443/0001-51" },
  { nome: "S Batista Comida Caseira Arte Do Sabor", cnpj: "13557575000151", cnpjOriginal: "13.557.575/0001-51" },
  { nome: "Serena Clinic Ltda", cnpj: "65725148000139", cnpjOriginal: "65.725.148/0001-39" },
  { nome: "Studios Domingues Vieira Ltda.", cnpj: "43793013000178", cnpjOriginal: "43.793.013/0001-78" },
  { nome: "Tec Aço", cnpj: "00136958000104", cnpjOriginal: "00.136.958/0001-04" },
  { nome: "Terraplan Engenharia Ltda. (Tirar do nome)", cnpj: "59043732000101", cnpjOriginal: "59.043.732/0001-01" },
  { nome: "TSB Estratégia Comercial Ltda", cnpj: "65501301000144", cnpjOriginal: "65.501.301/0001-44" },
  { nome: "Vaz Comércio Global Ltda", cnpj: "46279316000165", cnpjOriginal: "46.279.316/0001-65" },
  { nome: "WDF Arquitetura", cnpj: "19087108000191", cnpjOriginal: "19.087.108/0001-91" },
  { nome: "Wender M. dos Santos", cnpj: "42330726000132", cnpjOriginal: "42.330.726/0001-32" },
  { nome: "WILLIAN GERMANO CARPIM", cnpj: "99968037168", cnpjOriginal: "999.680.371-68" },
  { nome: "Zeni Silva Confecção", cnpj: "59148423000104", cnpjOriginal: "59.148.423/0001-04" }
];

export function cleanDocumentNumber(doc?: string | null): string {
  return (doc || '').replace(/\D/g, '');
}

export function normalizeCompanyName(name?: string | null): string {
  return (name || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

export function isCompanyInExcludedDprhList(empresa: { nome?: string; cnpj?: string }): boolean {
  const cleanDoc = cleanDocumentNumber(empresa.cnpj);
  const normName = normalizeCompanyName(empresa.nome);

  return EXCLUDED_DPRH_COMPANIES.some(item => {
    if (cleanDoc && item.cnpj && cleanDoc === item.cnpj) {
      return true;
    }
    const itemNormName = normalizeCompanyName(item.nome);
    if (normName && itemNormName && (normName === itemNormName || normName.includes(itemNormName) || itemNormName.includes(normName))) {
      return true;
    }
    return false;
  });
}
