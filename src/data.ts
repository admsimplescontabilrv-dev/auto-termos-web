import { SavedTemplate } from './types';

export const DEFAULT_TEMPLATES: SavedTemplate[] = [
  {
    id: 'tpl-nda',
    name: 'Acordo de Confidencialidade e Não Aliciamento',
    content: `<div style="text-align: center;"><h2><b>ACORDO DE CONFIDENCIALIDADE E NÃO ALICIAMENTO</b></h2></div>
<br>
<p><b>EMPREGADOR:</b> <b>[NOME DA EMPRESA]</b>, pessoa jurídica de direito privado, inscrita no CNPJ sob o nº <b>[CNPJ DA EMPRESA]</b>.</p>
<p><b>EMPREGADO(A):</b> <b>[NOME DO COLABORADOR]</b>, inscrito(a) no CPF sob o nº <b>[CPF DO COLABORADOR]</b>.</p>
<br>
<p>As partes acima qualificadas celebram o presente acordo mediante as cláusulas e condições abaixo:</p>
<br>
<p><b>1. DA CONFIDENCIALIDADE E SIGILO (NDA)</b></p>
<p>O(A) <b>EMPREGADO(A)</b> obriga-se a manter o mais absoluto sigilo sobre toda e qualquer Informação Confidencial da <b>EMPRESA</b> a que tiver acesso em razão de seu vínculo, seja durante o contrato de trabalho ou após o seu término.</p>
<p><b>1.1. Abrangência:</b> Entende-se por "Informação Confidencial" dados técnicos, operacionais, comerciais ou financeiros, incluindo: segredos de negócio, estratégias, listas de clientes e fornecedores, métodos de trabalho, senhas e dados de faturamento.</p>
<br>
<p><b>2. DO NÃO ALICIAMENTO</b></p>
<p>Pelo período de 12 (doze) meses após o encerramento do vínculo, o(a) <b>EMPREGADO(A)</b> compromete-se a não:</p>
<p><b>2.1.</b> Aliciar, convidar ou induzir o desligamento de outros empregados ou prestadores de serviço da <b>EMPRESA</b>.</p>
<p><b>2.2.</b> Desviar ou tentar desviar a clientela ativa da <b>EMPRESA</b> utilizando-se de informações privilegiadas obtidas durante o contrato de trabalho.</p>
<br>
<p><b>3. PROPRIEDADE INTELECTUAL</b></p>
<p>Qualquer processo, criação, método ou melhoria desenvolvida pelo(a) <b>EMPREGADO(A)</b> durante sua jornada de trabalho e com recursos da <b>EMPRESA</b> pertencerá exclusivamente ao <b>EMPREGADOR</b>.</p>

[QUEBRA]

<p><b>4. PENALIDADES</b></p>
<p>A quebra deste acordo constitui falta grave e sujeita o infrator à rescisão por justa causa (se durante o contrato), além da responsabilização civil por perdas e danos causados à <b>EMPRESA</b>.</p>
<br>
<p><b>5. DISPOSIÇÕES GERAIS</b></p>
<p><b>5.1. Independência das Cláusulas:</b> A eventual invalidade de uma cláusula não afetará a validade das demais.</p>
<p><b>5.2. Foro:</b> Fica eleito o Foro da Comarca de <b>[CIDADE/UF]</b> para dirimir quaisquer dúvidas oriundas deste termo.</p>
<br>
<div style="text-align: center;">
  <p><b>[CIDADE/UF]</b>, <b>[DATA]</b>.</p>
  <br><br>
  <p>__________________________________________</p>
  <p><b>EMPREGADOR</b></p>
  <br><br>
  <p>__________________________________________</p>
  <p><b>[NOME DO COLABORADOR]</b></p>
</div>`,
    lastUsed: Date.now()
  },
  {
    id: 'tpl-banco-horas',
    name: 'Acordo Individual - Banco de Horas',
    content: `<div style="text-align: center;"><h2><b>INSTRUMENTO PARTICULAR DE ACORDO INDIVIDUAL PARA PRORROGAÇÃO E COMPENSAÇÃO DE JORNADA DE TRABALHO</b></h2></div>
<br>
<p><b>EMPREGADOR:</b> <b>[NOME DA EMPRESA]</b>, inscrita no CNPJ/MF sob o nº <b>[CNPJ DA EMPRESA]</b>.</p>
<p><b>EMPREGADO(A):</b> <b>[NOME DO COLABORADOR]</b>, portador(a) do CPF nº <b>[CPF DO COLABORADOR]</b>.</p>
<br>
<p>As partes acima qualificadas celebram entre si o presente Acordo Individual, mediante as seguintes cláusulas:</p>
<br>
<p><b>CLÁUSULA PRIMEIRA – DO OBJETO</b></p>
<p>O presente acordo tem por objetivo instituir o regime de Prorrogação de Jornada cumulado com Compensação de Horas (Banco de Horas), permitindo que as horas trabalhadas além da jornada contratual sejam compensadas com folgas ou reduções de jornada, ou, pagas como horas extraordinárias.</p>
<br>
<p><b>CLÁUSULA SEGUNDA – DA SOLICITAÇÃO E DA VOLUNTARIEDADE (VIDA PESSOAL)</b></p>
<p>A prestação de horas extraordinárias reger-se-á pelos seguintes critérios de mútua anuência:</p>
<p><b>a. Iniciativa do Empregador:</b> O <b>EMPREGADO(A)</b> apenas poderá realizar horas extraordinárias mediante solicitação expressa ou autorização prévia e formal do <b>EMPREGADOR</b> ou superior hierárquico.</p>
<p><b>b. Faculdade de Recusa:</b> Caso a convocação para jornada extraordinária interfira de forma comprovada ou relevante na vida pessoal e compromissos extraoficiais do <b>EMPREGADO(A)</b>, fica a este facultado o direito de declinar do cumprimento da hora extra em questão, sem que isso configure insubordinação ou infração disciplinar.</p>
<br>
<p><b>CLÁUSULA TERCEIRA – DOS LIMITES E REGISTRO</b></p>
<p>A prorrogação da jornada não poderá exceder o limite legal de 02 (duas) horas diárias, totalizando o máximo de 10 (dez) horas de trabalho por dia.</p>
<p><b>Parágrafo Único:</b> A permanência nas dependências da empresa ou logado em sistemas remotos sem solicitação do <b>EMPREGADOR</b> será considerada tempo de natureza particular, não sendo computada como hora extra.</p>

[QUEBRA]

<p><b>CLÁUSULA QUARTA – DA FORMA DE QUITAÇÃO (CRITÉRIO DO EMPREGADOR)</b></p>
<p>Fica a critério exclusivo do <b>EMPREGADOR</b> decidir se as horas excedentes serão destinadas ao Banco de Horas (compensação) ou se serão pagas como Horas Extras no contracheque.</p>
<p><b>Comunicação Prévia:</b> O <b>EMPREGADOR</b> deverá comunicar ao <b>EMPREGADO(A)</b>, com antecedência, qual será a modalidade de quitação escolhida (se haverá folga compensatória ou pagamento).</p>

<p><b>CLÁUSULA QUINTA – DO REGIME DE COMPENSAÇÃO (BANCO DE HORAS)</b></p>
<p>Sendo adotada a compensação, observar-se-á:</p>
<p><b>a. Prazo:</b> A compensação das horas acumuladas deverá ocorrer no prazo máximo de 06 (seis) meses, conforme Art. 59, § 5º da CLT.</p>
<p><b>b. Gestão de Folgas:</b> A definição das datas e períodos de folga compensatória será de conveniência do <b>EMPREGADOR</b>.</p>
<br>
<p><b>CLÁUSULA SEXTA – DA REMUNERAÇÃO DAS HORAS NÃO COMPENSADAS</b></p>
<p>Caso as horas excedentes não sejam compensadas dentro do prazo de 06 meses, o <b>EMPREGADOR</b> efetuará o pagamento destas como horas extras, com o adicional mínimo de 50% (cinquenta por cento) ou o percentual mais benéfico previsto em Convenção Coletiva de Trabalho (CCT).</p>
<br>
<p><b>CLÁUSULA SÉTIMA – DO SALDO NEGATIVO</b></p>
<p>Eventuais débitos de horas do <b>EMPREGADO(A)</b> (atrasos ou saídas antecipadas autorizadas) poderão ser compensados com horas positivas ou, ao final do período de 06 meses/rescisão, serem descontados em folha de pagamento.</p>

[QUEBRA]

<p><b>CLÁUSULA OITAVA – DA RESCISÃO CONTRATUAL</b></p>
<p>Na hipótese de rescisão do contrato de trabalho:</p>
<p><b>a. Saldo Positivo:</b> As horas não compensadas serão pagas como extras nas verbas rescisórias.</p>
<p><b>b. Saldo Negativo:</b> As horas não trabalhadas poderão ser descontadas das verbas rescisórias, conforme limite legal.</p>
<br>
<p><b>CLÁUSULA NONA – VIGÊNCIA E FORO</b></p>
<p>Este acordo tem validade por prazo indeterminado, podendo ser revisto ou aditado caso surjam novas Normas Coletivas que se sobreponham a estas condições. As partes elegem o foro da Comarca de <b>[CIDADE/UF]</b> para dirimir controvérsias.</p>
<br>
<div style="text-align: center;">
  <p><b>[CIDADE/UF]</b>, <b>[DATA]</b>.</p>
  <br>
  <p>___________________________________</p>
  <p><b>EMPREGADOR</b></p>
  <br>
  <p>___________________________________</p>
  <p><b>[NOME DO COLABORADOR]</b></p>
</div>`,
    lastUsed: Date.now()
  },
  {
    id: 'tpl-etica-digital',
    name: 'Política de Ferramentas Digitais e Conduta',
    content: `<div style="text-align: center;"><h2><b>POLÍTICA GERAL DE USO DE FERRAMENTAS DIGITAIS E CONDUTA</b></h2></div>
<br>
<p><b>EMPREGADOR:</b> <b>[NOME DA EMPRESA]</b>, inscrito no CNPJ sob o nº <b>[CNPJ DA EMPRESA]</b>.</p>
<p><b>EMPREGADO(A):</b> <b>[NOME DO COLABORADOR]</b>, inscrito(a) no CPF sob o nº <b>[CPF DO COLABORADOR]</b>.</p>
<br>
<p><b>1. USO DE FERRAMENTAS (WHATSAPP, E-MAIL, SISTEMAS)</b></p>
<p><b>1.1.</b> Equipamentos, e-mails, números de telefone corporativos e contas de WhatsApp cedidas pela empresa destinam-se estritamente ao desempenho das atividades profissionais.</p>
<p><b>1.2.</b> O uso de dispositivo pessoal (celular próprio) para comunicação de trabalho deve se restringir aos assuntos laborais, zelando o empregado pelo sigilo das informações da empresa e dos clientes.</p>
<br>
<p><b>2. PRIVACIDADE E MONITORAMENTO</b></p>
<p><b>2.1.</b> O <b>EMPREGADOR</b> poderá monitorar, realizar backup e auditar <b>exclusivamente os sistemas, e-mails e linhas telefônicas de propriedade da empresa</b>.</p>
<p><b>2.2.</b> A empresa declara que <b>não</b> terá acesso, nem fará monitoramento de dados, mensagens ou aplicativos de cunho pessoal instalados em dispositivos particulares do empregado, respeitando-se o direito constitucional à intimidade.</p>
<br>
<p><b>3. CONDUTA PROFISSIONAL E FALTAS GRAVES</b></p>
<p>Constituem infrações sujeitas a medidas disciplinares (advertência, suspensão ou demissão por justa causa — Art. 482 da CLT):</p>
<ul style="list-style-type: lower-alpha; padding-left: 25px;">
  <li>Compartilhar externamente informações confidenciais de clientes, fornecedores ou da própria empresa;</li>
  <li>Apagar o histórico de conversas em aplicativos de mensagens corporativos sem autorização, prejudicando a rastreabilidade;</li>
  <li>Utilizar ferramentas de trabalho para assédio, disseminação de correntes, conteúdo inadequado ou condutas ofensivas;</li>
  <li>Expor a marca da empresa ou de clientes de maneira negativa ou desrespeitosa em redes sociais.</li>
</ul>

[QUEBRA]

<p><b>4. PROPRIEDADE DOS DADOS CORPORATIVOS</b></p>
<p><b>4.1.</b> Todo o histórico de mensagens, arquivos e comunicações realizadas em contas corporativas é de propriedade exclusiva do <b>EMPREGADOR</b>. É proibida a exclusão sem autorização prévia.</p>
<br>
<p><b>5. DIREITO À DESCONEXÃO</b></p>
<p>Comunicações enviadas pela empresa ou por clientes fora da jornada contratual de trabalho não exigem resposta imediata por parte do empregado, garantindo-se o direito ao descanso (exceto em casos de sobreaviso formalmente combinados).</p>
<br>
<p><b>6. PROTEÇÃO DE DADOS (LGPD)</b></p>
<p>O <b>EMPREGADO(A)</b> obriga-se a tratar os dados pessoais a que tiver acesso em estrita observância à Lei nº 13.709/2018, utilizando-os apenas para as finalidades determinadas pelo <b>EMPREGADOR</b> e adotando medidas para evitar acessos não autorizados ou vazamentos.</p>
<br>
<div style="text-align: center;">
  <p><b>[CIDADE/UF]</b>, <b>[DATA]</b>.</p>
  <br><br>
  <p>________________________</p>
  <p><b>EMPREGADOR</b></p>
  <br><br>
  <p>________________________</p>
  <p><b>[NOME DO COLABORADOR]</b></p>
</div>`,
    lastUsed: Date.now()
  },
  {
    id: 'tpl-imagem',
    name: 'Autorização de Uso de Imagem e Voz',
    content: `<div style="text-align: center;"><h2><b>TERMO DE CONSENTIMENTO E AUTORIZAÇÃO DE USO DE IMAGEM, VOZ E NOME</b></h2></div>
<br>
<p><b>EMPREGADOR:</b> <b>[NOME DA EMPRESA]</b>, pessoa jurídica de direito privado, inscrita no CNPJ sob o nº <b>[CNPJ DA EMPRESA]</b>.</p>
<p><b>EMPREGADO(A):</b> <b>[NOME DO COLABORADOR]</b>, inscrito(a) no CPF sob o nº <b>[CPF DO COLABORADOR]</b>.</p>
<br>
<p>Pelo presente instrumento, o(a) <b>EMPREGADO(A)</b> autoriza o <b>EMPREGADOR</b>, de forma voluntária e gratuita, a utilizar sua imagem, voz e nome para fins exclusivamente institucionais, de publicidade e de comunicação interna ou externa.</p>
<br>
<p><b>1. OBJETO E FINALIDADE:</b></p>
<p>A presente autorização destina-se ao uso da imagem (estática ou em movimento), voz e nome do(a) <b>EMPREGADO(A)</b> para fins de publicidade e divulgação de cultura corporativa, podendo ser utilizada em:</p>
<ul style="list-style-type: disc; padding-left: 25px;">
  <li><b>Mídias Digitais:</b> Redes sociais (Instagram, LinkedIn, Facebook, YouTube, TikTok, entre outras), site institucional, blogs e anúncios digitais.</li>
  <li><b>Comunicação Interna:</b> Materiais de treinamento, murais físicos ou digitais e comunicados.</li>
  <li><b>Materiais Impressos e Publicidade:</b> Folders, catálogos, outdoors, apresentações comerciais, revistas e jornais.</li>
</ul>
<br>
<p><b>2. ABRANGÊNCIA E TERRITÓRIO:</b></p>
<p>A autorização é concedida em caráter global (Brasil e exterior), permitindo que o <b>EMPREGADOR</b> realize edições, cortes, fixações e reproduções do material, desde que preservada a honra e a imagem pública do(a) <b>EMPREGADO(A)</b>.</p>
<br>
<p><b>3. GRATUIDADE:</b></p>
<p>O(A) <b>EMPREGADO(A)</b> declara que a presente autorização é concedida de forma totalmente gratuita. O uso da imagem, voz e nome não gera direito a qualquer tipo de remuneração extra, "cachê", indenização ou participação financeira.</p>

[QUEBRA]

<p><b>4. PRAZO E REVOGAÇÃO (DIREITO AO ARREPENDIMENTO):</b></p>
<p>A autorização é válida por prazo indeterminado, permanecendo vigente inclusive após o término do contrato de trabalho, observadas as seguintes condições:</p>
<ul style="list-style-type: disc; padding-left: 25px;">
  <li><b>Direito de Revogação:</b> O(A) <b>EMPREGADO(A)</b> poderá, a qualquer tempo, solicitar a revogação desta autorização mediante comunicação escrita ao setor de Recursos Humanos da empresa.</li>
  <li><b>Efeito Não Retroativo:</b> Em caso de revogação, o <b>EMPREGADOR</b> interromperá a utilização do material em novas produções ou campanhas. Todavia, a empresa não possui obrigação de remover, apagar ou recolher materiais, publicações, vídeos ou impressos já executados, publicados ou distribuídos anteriormente à data da revogação.</li>
</ul>
<br>
<p><b>5. PROTEÇÃO DE DADOS (LGPD):</b></p>
<p>O <b>EMPREGADOR</b>, na qualidade de Controlador de Dados, compromete-se a tratar os dados biovocais e de imagem do(a) <b>EMPREGADO(A)</b> em estrita observância à LGPD, garantindo que o tratamento seja limitado às finalidades institucionais aqui descritas, adotando medidas de segurança para proteger tais informações.</p>
<br>
<p><b>6. DISPOSIÇÕES GERAIS:</b></p>
<p>O(A) <b>EMPREGADO(A)</b> declara ter lido e compreendido todos os termos deste documento, estando de pleno acordo com a utilização de sua imagem e voz conforme aqui estipulado.</p>
<br>
<div style="text-align: center;">
  <p><b>[CIDADE/UF]</b>, <b>[DATA]</b>.</p>
  <br><br>
  <p>_____________________________</p>
  <p><b>EMPREGADOR</b></p>
  <br><br>
  <p>_____________________________</p>
  <p><b>[NOME DO COLABORADOR]</b></p>
</div>`,
    lastUsed: Date.now()
  },
  {
    id: 'tpl-equipamentos',
    name: 'Termo de Responsabilidade - Equipamentos',
    content: `<div style="text-align: center;"><h2><b>TERMO DE RESPONSABILIDADE PELA GUARDA E USO DE EQUIPAMENTOS E MATERIAIS</b></h2></div>
<br>
<p><b>EMPREGADOR:</b> <b>[NOME DA EMPRESA]</b>, inscrita no CNPJ sob o nº <b>[CNPJ DA EMPRESA]</b>.</p>
<p><b>EMPREGADO(A):</b> <b>[NOME DO COLABORADOR]</b>, portador(a) do CPF nº <b>[CPF DO COLABORADOR]</b>.</p>
<br>
<p>Através deste documento, o(a) <b>EMPREGADO(A)</b> acima qualificado(a) declara que recebeu da empresa, a título de empréstimo para uso exclusivo em suas atividades profissionais, os seguintes equipamentos/materiais:</p>
<br>
<p><b>Relação de Itens Entregues:</b></p>
<p>1. [ITEM 1]</p>
<p>2. [ITEM 2]</p>
<br>
<p><b>Condições de Uso e Responsabilidade:</b></p>
<p><b>1.</b> O(A) <b>EMPREGADO(A)</b> compromete-se a zelar pela conservação e guarda dos equipamentos/materiais recebidos, utilizando-os única e exclusivamente para o desempenho de suas funções profissionais.</p>
<p><b>2.</b> Em caso de dano, avaria, extravio ou perda decorrente de dolo, culpa (negligência, imprudência ou imperícia) ou mau uso, o(a) <b>EMPREGADO(A)</b> autoriza expressamente, nos termos do art. 462, §1º da CLT, o desconto do valor correspondente ao reparo ou reposição em seu salário ou em suas verbas rescisórias.</p>
<p><b>3.</b> Ao término do contrato de trabalho, ou a qualquer momento em que for solicitado, o(a) <b>EMPREGADO(A)</b> obriga-se a devolver os itens em estado de conservação compatível com o desgaste natural do uso regular, sob pena de desconto do valor correspondente nas verbas rescisórias.</p>
<br>
<div style="text-align: center;">
  <p><b>[CIDADE/UF]</b>, <b>[DATA]</b>.</p>
  <br>
  <p>___________________________________________________</p>
  <p><b>[NOME DO COLABORADOR]</b></p>
  <p>Assinatura do(a) Empregado(a)</p>
</div>`,
    lastUsed: Date.now()
  },
  {
    id: 'tpl-monitoramento',
    name: 'Termo de Consentimento - Monitoramento por Câmeras',
    content: `<div style="text-align: center;"><h2><b>TERMO DE CIÊNCIA E CONSENTIMENTO DE MONITORAMENTO POR VÍDEO E ÁUDIO</b></h2></div>
<br>
<p><b>EMPREGADOR:</b> <b>[NOME DA EMPRESA]</b>, pessoa jurídica de direito privado, inscrita no CNPJ sob o nº <b>[CNPJ DA EMPRESA]</b>.</p>
<p><b>EMPREGADO(A):</b> <b>[NOME DO COLABORADOR]</b>, inscrito(a) no CPF sob o nº <b>[CPF DO COLABORADOR]</b>.</p>
<br>
<p>Pelo presente instrumento, as partes acima qualificadas firmam o presente termo, mediante as seguintes cláusulas:</p>
<br>
<p><b>1. DA CIÊNCIA DO MONITORAMENTO</b></p>
<p>O(A) <b>EMPREGADO(A)</b> declara ter plena ciência e expressa concordância de que as dependências físicas do <b>EMPREGADOR</b> são monitoradas por sistema interno de câmeras de segurança, as quais realizam a captação contínua de imagem e, em determinados equipamentos, também a captação de áudio/voz.</p>
<br>
<p><b>2. DA FINALIDADE</b></p>
<p>O monitoramento tem como finalidade exclusiva garantir a segurança patrimonial da empresa, a integridade física dos colaboradores, clientes e visitantes, bem como auxiliar na prevenção de acidentes de trabalho, segurança operacional e na apuração de eventuais incidentes ou irregularidades.</p>
<br>
<p><b>3. DO RESPEITO À INTIMIDADE E PRIVACIDADE</b></p>
<p>O <b>EMPREGADOR</b> garante que o sistema de monitoramento está instalado apenas em áreas comuns, de circulação, operacionais e de atendimento. É terminantemente garantida a não instalação de câmeras em locais que exponham a intimidade do(a) <b>EMPREGADO(A)</b>, tais como banheiros, vestiários e ambientes similares.</p>

[QUEBRA]

<p><b>4. DO USO E PROTEÇÃO DE DADOS (LGPD)</b></p>
<p><b>4.1.</b> As imagens e áudios capturados constituem dados pessoais e serão tratados em estrita observância à Lei Geral de Proteção de Dados (Lei nº 13.709/2018), com armazenamento seguro e acesso restrito exclusivamente às pessoas previamente autorizadas pelo <b>EMPREGADOR</b>.</p>
<p><b>4.2.</b> O material capturado não será divulgado publicamente nem compartilhado com terceiros, salvo mediante requisição de autoridades policiais, órgãos fiscalizadores ou judiciais, ou para o exercício regular de direitos da empresa em processos trabalhistas, cíveis ou administrativos.</p>
<br>
<p><b>5. DAS DISPOSIÇÕES FINAIS</b></p>
<p>O(A) <b>EMPREGADO(A)</b> reconhece que a captação de imagens e áudios no ambiente de trabalho, nos termos aqui expostos, não configura violação de sua privacidade, intimidade ou direitos de personalidade, tratando-se de medida legítima e preventiva adotada pelo <b>EMPREGADOR</b>.</p>
<br>
<div style="text-align: center;">
  <p><b>[CIDADE/UF]</b>, <b>[DATA]</b>.</p>
  <br><br>
  <p>________________________________________________</p>
  <p><b>EMPREGADOR</b></p>
  <br><br>
  <p>________________________________________________</p>
  <p><b>[NOME DO COLABORADOR]</b></p>
</div>`,
    lastUsed: Date.now()
  }
];

export const INITIAL_TEMPLATE = `<div style="text-align: center;"><h2><b>TERMO DE RESPONSABILIDADE PELA GUARDA E USO DE EQUIPAMENTOS E MATERIAIS</b></h2></div>
<br>
<p><b>EMPREGADOR:</b> <b>[NOME DA EMPRESA]</b>, inscrita no CNPJ sob o nº <b>[CNPJ DA EMPRESA]</b>.</p>
<p><b>EMPREGADO(A):</b> <b>[NOME DO COLABORADOR]</b>, portador(a) do CPF nº <b>[CPF DO COLABORADOR]</b>.</p>
<br>
<p>Através deste documento, o(a) <b>EMPREGADO(A)</b> acima qualificado(a) declara que recebeu da empresa, a título de empréstimo para uso exclusivo em suas atividades profissionais, os seguintes equipamentos/materiais:</p>
<br>
<p><b>Relação de Itens Entregues:</b></p>
<p>1. [ITEM 1]</p>
<p>2. [ITEM 2]</p>
<br>
<p><b>Condições de Uso e Responsabilidade:</b></p>
<p><b>1.</b> O(A) <b>EMPREGADO(A)</b> compromete-se a zelar pela conservação e guarda dos equipamentos/materiais recebidos, utilizando-os única e exclusivamente para o desempenho de suas funções profissionais.</p>
<p><b>2.</b> Em caso de dano, avaria, extravio ou perda decorrente de dolo, culpa (negligência, imprudência ou imperícia) ou mau uso, o(a) <b>EMPREGADO(A)</b> autoriza expressamente, nos termos do art. 462, §1º da CLT, o desconto do valor correspondente ao reparo ou reposição em seu salário ou em suas verbas rescisórias.</p>
<p><b>3.</b> Ao término do contrato de trabalho, ou a qualquer momento em que for solicitado, o(a) <b>EMPREGADO(A)</b> obriga-se a devolver os itens em estado de conservação compatível com o desgaste natural do uso regular, sob pena de desconto do valor correspondente nas verbas rescisórias.</p>
<br>
<div style="text-align: center;">
  <p><b>[CIDADE/UF]</b>, <b>[DATA]</b>.</p>
  <br>
  <p>___________________________________________________</p>
  <p><b>[NOME DO COLABORADOR]</b></p>
  <p>Assinatura do(a) Empregado(a)</p>
</div>`;
