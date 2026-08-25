import { SavedTemplate } from './types';

export const DEFAULT_TEMPLATES: SavedTemplate[] = [
  {
    id: 'tpl-nda',
    name: 'Acordo de Confidencialidade, Não Aliciamento e Não Concorrência',
    content: `<br><br>
<div style="text-align: center;"><h2><b>ACORDO DE CONFIDENCIALIDADE, NÃO ALICIAMENTO E NÃO CONCORRÊNCIA</b></h2></div>
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
<p><b>3. DA EXCLUSIVIDADE E NÃO CONCORRÊNCIA DURANTE O CONTRATO</b></p>
<p>Enquanto o(a) <b>EMPREGADO(A)</b> estiver prestando serviços e mantiver vínculo com a <b>EMPRESA</b>, este(a) compromete-se a não prestar serviços de qualquer natureza, seja de forma autônoma, empregatícia ou consultiva, para outras empresas concorrentes do mesmo segmento.</p>
<p><b>3.1.</b> Esta vedação aplica-se inclusive fora do horário de expediente do(a) <b>EMPREGADO(A)</b>, uma vez que a prestação de serviços a concorrentes configura ato de concorrência desleal, violação de boa-fé e quebra de fidúcia, conforme o Art. 482, alínea 'c', da Consolidação das Leis do Trabalho (CLT).</p>
<br>
<p><b>4. PROPRIEDADE INTELECTUAL</b></p>
<p>Qualquer processo, criação, método ou melhoria desenvolvida pelo(a) <b>EMPREGADO(A)</b> durante sua jornada de trabalho e com recursos da <b>EMPRESA</b> pertencerá exclusivamente ao <b>EMPREGADOR</b>.</p>

[QUEBRA]

<p><b>5. PENALIDADES</b></p>
<p>A quebra de qualquer cláusula deste acordo constitui falta grave e sujeita o infrator à imediata rescisão do contrato de trabalho por justa causa (se a infração ocorrer durante o vínculo).</p>
<p><b>5.1. Multa Contratual:</b> Sem prejuízo da rescisão por justa causa e da responsabilização civil por perdas e danos causados à <b>EMPRESA</b>, o descumprimento deste termo sujeitará o(a) <b>EMPREGADO(A)</b> ao pagamento de multa compensatória no valor equivalente a 1 (um) salário contratual mensal vigente do(a) colaborador(a), ou o equivalente ao seu último salário registrado, caso o vínculo já tenha sido desligado no momento da infração.</p>
<br>
<p><b>6. DISPOSIÇÕES GERAIS</b></p>
<p><b>6.1. Independência das Cláusulas:</b> A eventual invalidade de uma cláusula não afetará a validade das demais.</p>
<p><b>6.2. Foro:</b> Fica eleito o Foro da Comarca de <b>[CIDADE/UF]</b> para dirimir quaisquer dúvidas oriundas deste termo.</p>
<br>
<div style="text-align: center;">
  <p><b>[CIDADE/UF]</b>, <b>[DATA]</b>.</p>
  <br><br>
  <p>__________________________________________</p>
  <p><b>[NOME DA EMPRESA]</b></p>
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
  <p><b>[NOME DA EMPRESA]</b></p>
  <br>
  <p>___________________________________</p>
  <p><b>[NOME DO COLABORADOR]</b></p>
</div>`,
    lastUsed: Date.now()
  },
  {
    id: 'tpl-etica-digital',
    name: 'Política de Ferramentas Digitais e Conduta',
    content: `<div style="text-align: center;"><h2><b>POLÍTICA GERAL DE USO DE FERRAMENTAS DIGITAIS, APARELHOS CELULARES E CONDUTA</b></h2></div>
<br>
<p><b>EMPREGADOR:</b> <b>[NOME DA EMPRESA]</b>, inscrito no CNPJ sob o nº <b>[CNPJ DA EMPRESA]</b>.</p>
<p><b>EMPREGADO(A):</b> <b>[NOME DO COLABORADOR]</b>, inscrito(a) no CPF sob o nº <b>[CPF DO COLABORADOR]</b>.</p>
<br>
<p><b>1. USO DE FERRAMENTAS CORPORATIVAS E REDES SOCIAIS DA EMPRESA</b></p>
<p><b>1.1.</b> Equipamentos, e-mails, números de telefone corporativos, contas de WhatsApp e demais sistemas cedidos pela empresa destinam-se estritamente ao desempenho das atividades profissionais.</p>
<p><b>1.2.</b> O <b>EMPREGADOR</b> detém total autonomia, propriedade e autoridade sobre o WhatsApp corporativo, redes sociais e todas as plataformas digitais da empresa.</p>
<p><b>1.3.</b> O <b>EMPREGADO</b> não deve publicar, enviar, apagar, alterar ou executar qualquer informação ou conteúdo nas redes sociais, WhatsApp ou plataformas digitais da empresa sem a prévia e expressa autorização do <b>EMPREGADOR</b>.</p>
<p><b>1.4.</b> Todo o histórico de mensagens, arquivos e comunicações realizadas em contas corporativas é de propriedade exclusiva do <b>EMPREGADOR</b>. É terminantemente proibida a exclusão de conversas ou dados sem autorização prévia, garantindo a rastreabilidade das informações.</p>
<br>
<p><b>2. USO DO APARELHO CELULAR PESSOAL NO AMBIENTE DE TRABALHO</b></p>
<p><b>2.1.</b> O uso de telefone celular pessoal durante o expediente e no ambiente de trabalho deve ocorrer somente em caráter de urgência ou emergência.</p>
<p><b>2.2.</b> O uso excessivo do aparelho celular pessoal para fins de entretenimento, redes sociais particulares ou conversas não relacionadas ao trabalho durante a jornada é expressamente proibido, pois compromete a atenção e a produtividade.</p>
<p><b>2.3.</b> Caso o <b>EMPREGADO</b> tenha uma necessidade urgente de utilizar o celular, deverá comunicar imediatamente o seu superior direto.</p>
<p><b>2.4.</b> Autorizado o uso pela urgência, o <b>EMPREGADO</b> deverá retirar-se do seu posto de trabalho (dirigindo-se a um local apropriado) e retornar imediatamente à sua função assim que finalizar a comunicação.</p>
<p><b>2.5.</b> O uso de dispositivo pessoal (celular próprio) para comunicação de trabalho, quando ocorrer, deve se restringir aos assuntos laborais, zelando o empregado pelo sigilo das informações da empresa e dos clientes.</p>

[QUEBRA]

<p><b>3. PRIVACIDADE, GARANTIAS DO EMPREGADO E MONITORAMENTO</b></p>
<p><b>3.1.</b> O <b>EMPREGADOR</b> poderá monitorar, realizar backup e auditar exclusivamente os sistemas, e-mails, linhas telefônicas e contas de WhatsApp de propriedade da empresa.</p>
<p><b>3.2. Garantia de Não Confisco e Inviolabilidade:</b> Fica expressamente estabelecido que, em nenhuma ocasião, o <b>EMPREGADOR</b> poderá confiscar, reter, revistar ou acessar o conteúdo do aparelho celular pessoal do <b>EMPREGADO</b>. A empresa respeita integralmente o direito constitucional à intimidade e à privacidade, não realizando qualquer monitoramento de dados ou aplicativos de cunho pessoal instalados em dispositivos particulares.</p>
<br>
<p><b>4. DIREITO À DESCONEXÃO</b></p>
<p><b>4.1.</b> Comunicações enviadas pela empresa ou por clientes fora da jornada contratual de trabalho não exigem resposta imediata por parte do <b>EMPREGADO</b>, garantindo-se o direito ao descanso (exceto em casos de sobreaviso formalmente combinados).</p>
<br>
<p><b>5. PROTEÇÃO DE DADOS (LGPD)</b></p>
<p><b>5.1.</b> O <b>EMPREGADO(A)</b> obriga-se a tratar os dados pessoais a que tiver acesso em estrita observância à Lei nº 13.709/2018 (Lei Geral de Proteção de Dados), utilizando-os apenas para as finalidades determinadas pelo <b>EMPREGADOR</b> e adotando medidas para evitar acessos não autorizados ou vazamentos.</p>
<br>
<p><b>6. CONDUTA PROFISSIONAL E PENALIDADES</b></p>
<p><b>6.1.</b> O cumprimento das regras descritas neste termo é obrigatório. O seu descumprimento, especialmente quanto ao uso excessivo do celular, delegação não autorizada de informações da empresa ou quebra de sigilo, é considerado ato de indisciplina e insubordinação.</p>
<p><b>6.2.</b> Constituem infrações graves sujeitas a medidas disciplinares:</p>
<ul style="list-style-type: lower-alpha; padding-left: 25px;">
  <li>Utilizar o celular pessoal de forma excessiva e injustificada durante o expediente;</li>
  <li>Compartilhar externamente informações confidenciais de clientes, fornecedores ou da própria empresa;</li>
  <li>Apagar o histórico de conversas em aplicativos de mensagens corporativos sem autorização;</li>
  <li>Utilizar ferramentas de trabalho para assédio, disseminação de correntes, conteúdo inadequado ou condutas ofensivas;</li>
  <li>Expor a marca da empresa ou de clientes de maneira negativa ou desrespeitosa;</li>
  <li>Realizar qualquer ação nas plataformas digitais da empresa sem autorização.</li>
</ul>
<p><b>6.3. Aplicação das Penalidades:</b> As infrações a esta política sujeitarão o infrator às penalidades previstas na legislação trabalhista (Art. 482 da CLT), aplicadas de forma progressiva ou imediata, dependendo da gravidade do ato, sendo elas:</p>
<p>I. Advertência verbal;</p>
<p>II. Advertência escrita;</p>
<p>III. Suspensão não remunerada;</p>
<p>IV. Demissão por justa causa.</p>
<br>
<div style="text-align: center;">
  <p><b>[CIDADE/UF]</b>, <b>[DATA]</b>.</p>
  <br><br>
  <p>___________________________________</p>
  <p><b>[NOME DA EMPRESA]</b></p>
  <p>EMPREGADOR</p>
  <br><br>
  <p>___________________________________</p>
  <p><b>[NOME DO COLABORADOR]</b></p>
  <p>EMPREGADO(A)</p>
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
  <p><b>[NOME DA EMPRESA]</b></p>
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
  <p><b>[NOME DA EMPRESA]</b></p>
  <br><br>
  <p>________________________________________________</p>
  <p><b>[NOME DO COLABORADOR]</b></p>
</div>`,
    lastUsed: Date.now()
  },
  {
    id: 'tpl-veiculo',
    name: 'Termo de Uso de Veículo Corporativo',
    content: `<div style="text-align: center;"><h2><b>TERMO DE RESPONSABILIDADE E CONDIÇÕES DE USO DE VEÍCULO CORPORATIVO</b></h2></div>
<br>
<p><b>EMPREGADORA:</b> <b>[NOME DA EMPRESA]</b>, CNPJ: <b>[CNPJ DA EMPRESA]</b></p>
<p><b>EMPREGADO(A):</b> <b>[NOME DO COLABORADOR]</b>, CPF: <b>[CPF DO COLABORADOR]</b></p>
<p><b>VEÍCULO:</b> <b>[VEÍCULO]</b> <b>PLACA:</b> <b>[PLACA DO VEÍCULO]</b> <b>RENAVAM:</b> <b>[RENAVAM DO VEÍCULO]</b></p>
<br>
<p>Pelo presente termo, o(a) <b>EMPREGADO(A)</b> acima qualificado(a) declara receber da <b>EMPREGADORA</b> o veículo acima descrito, assumindo o compromisso de utilizá-lo de acordo com as seguintes cláusulas:</p>
<br>
<p><b>1. DO USO EXCLUSIVO PARA O TRABALHO</b></p>
<p>O veículo descrito é uma ferramenta de trabalho e deve ser utilizado exclusiva e estritamente para o exercício das atividades profissionais. Fica terminantemente proibido o uso do veículo para fins particulares, ceder a direção a terceiros sob qualquer pretexto, bem como oferecer carona a terceiros sem autorização expressa do empregador, sob pena de sanções disciplinares.</p>
<br>
<p><b>2. DA CONSERVAÇÃO E CONDUTA NO TRÂNSITO</b></p>
<p>O(a) <b>EMPREGADO(A)</b> compromete-se a zelar pela guarda, conservação e limpeza do veículo. Ao conduzir o veículo, especialmente em vias não pavimentadas ou de tráfego severo, o(a) <b>EMPREGADO(A)</b> deve observar estritamente as regras de trânsito, adequando a velocidade às condições da via para evitar desgastes prematuros, avarias e acidentes e caso ocorra algum fato que venha a gerar qualquer avaria ao veículo ou aos integrantes dele, é obrigação do empregado comunicar imediatamente o empregador e registrar o boletim de ocorrência caso se faça necessário.</p>

[QUEBRA]

<p><b>3. DAS MULTAS DE TRÂNSITO</b></p>
<p>As infrações de trânsito cometidas por ato exclusivo do motorista (ex: excesso de velocidade, uso de celular) serão de sua inteira responsabilidade, inclusive pontuação na CNH e pagamento da multa. O empregador fica autorizadas a descontar o valor da multa do salário, comprometendo-se a restituí-lo caso o auto de infração seja anulado pelo órgão competente. Infrações decorrentes de fato do veículo (ex: pneu careca, farol queimado, falta de manutenção) serão de responsabilidade do(a) <b>EMPREGADO(A)</b> apenas se este falhar em registrar a irregularidade no Checklist de Vistoria Diária antes do início da jornada.</p>
<br>
<p><b>4. DOS DANOS, AVARIAS E AUTORIZAÇÃO DE DESCONTO</b></p>
<p>Nos termos do § 1º do art. 462 da CLT, em caso de danos materiais, avarias ou sinistros decorrentes de dolo (intenção) ou culpa (imprudência, negligência, imperícia, desrespeito à legislação de trânsito), o(a) <b>EMPREGADO(A)</b> autoriza o desconto salarial ou em rescisão dos valores correspondentes ao conserto ou franquia. O desconto fica condicionado à certificação do dano mediante multa, boletim de ocorrência, laudo técnico ou confissão do motorista.</p>
<br>
<p><b>5. DA VISTORIA DIÁRIA (CHECK-IN E CHECK-OUT)</b></p>
<p>A cada retirada e devolução do veículo, o(a) <b>EMPREGADO(A)</b> obriga-se a realizar vistoria conjunta, atestando o estado do veículo no documento "Checklist de Vistoria Diária". A assinatura no momento da retirada (Check-in) atesta que o veículo foi recebido nas condições lá descritas. O surgimento de novas avarias no momento da devolução (Check-out), não registradas anteriormente, implicará na presunção de que o dano ocorreu durante o uso sob responsabilidade do(a) <b>EMPREGADO(A)</b>.</p>
<br>
<p>Por ser a expressão da verdade e por estar de pleno acordo, o(a) <b>EMPREGADO(A)</b> assina o presente termo em 2 (duas) vias de igual teor.</p>
<br>
<div style="text-align: center;">
  <p><b>[CIDADE/UF]</b>, <b>[DATA]</b>.</p>
  <br><br>
  <p>________________________________________________</p>
  <p><b>[NOME DO COLABORADOR]</b></p>
  <p>EMPREGADO(A)</p>
  <br><br>
  <p>________________________________________________</p>
  <p><b>[NOME DA EMPRESA]</b></p>
  <p>EMPREGADORA</p>
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
