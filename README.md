# V12.1 — Interface compacta e gabaritos por atividade

Filtros e seleção de editores recolhíveis; menu Pedagógico removido (modelos no menu Modelos e padronização em Arquivo); ações centralizadas; barra de formatação em uma linha com rolagem horizontal em telas estreitas. O painel Gabarito seleciona a atividade atual ou uma atividade salva, sem substituir o documento aberto. A prévia A4 utiliza o PDF do gabarito selecionado. Os gabaritos permanecem no registro da atividade, com a sincronização e backup existentes. Faça backup antes de publicar.

# Marks Class Studio — V12 (MKS)

Atualização sobre a V11. O Banco de Questões é único e oferece onze editores especializados. A marca MKS aparece no cabeçalho e no login. Os registros, login, configuração do Netlify, editor principal, planos de aula e armazenamento existentes continuam sendo usados; não apague dados ou altere o nome do site.

## Novidades

- Seletor de editor: interpretação de imagens, interpretação de textos, caça-palavras, associação, lacunas, verdadeiro/falso, ordenação, correção, tradução, produção textual e questão livre.
- Cadastro de uma ou várias séries (1º, 2º e 3º ano EM), modalidade Regular/EMTI/Ambas, tipo de editor, componente, assunto, filtros e habilidade. A lista e os filtros consultam o mesmo banco. Questões antigas sem o novo tipo explícito recebem uma classificação inicial inferida; revise-as se necessário.
- Enunciado, texto de apoio, imagens, comando, alternativas e linhas para resposta aberta; prévia A4, formatação, gabarito e justificativa. Habilidade e classificação não são impressas na atividade.
- Geradores locais, sem IA: informe palavras, pares separados por `|`, frases ou texto com respostas entre `[colchetes]`, conforme a ajuda do editor. Configure os controles e clique em gerar. É possível revisar e formatar o resultado antes de salvar. Alterar os dados do gerador requer gerar novamente para atualizar o gabarito.
- Caça-palavras com quadro de palavras acima da grade, dificuldade por direção e conferência do encaixe. O gabarito indica coordenadas, não uma segunda grade colorida. O tamanho solicitado pode aumentar para encaixar todas as palavras. Associação embaralha os significados, lacunas podem usar quadro de palavras e colunas. Verdadeiro/falso aceita V/F ou T/F; correção e tradução usam respostas fornecidas pelo professor.
- Metadados e dados dos geradores fazem parte de cada questão, do armazenamento local, sincronização e exportação do banco. A V12 usa o mesmo Netlify Blobs `marks-class-question-bank-v9`. Atualize também os dois arquivos do backend para preservar os novos campos.

## Instalação e validação

Consulte `ATUALIZACAO_V12_GITHUB.txt`. Faça um backup antes de atualizar. Testes locais: TypeScript com declaração simulada de Identity; 300 grades de caça-palavras verificadas; interface isolada em Chromium com API simulada (sete geradores, cadastro texto/imagem, filtros, reabertura, inserção e exportação de nove questões). O build real do Netlify, autenticação, sincronização e exportação do PDF com os novos layouts ainda precisam ser testados no ambiente publicado. Questões extensas podem exigir ajuste de paginação, como na V11. Revise o gabarito se alterar o resultado manualmente. O modelo de plano de aula permanece provisório.

---

## Histórico e referência de compatibilidade — V11

# Marks Class Studio — V11

Atualização diretamente sobre a V10. Mantém Netlify Identity, `MCS_OWNER_EMAIL`, armazenamento em Netlify Blobs, salvamento periódico, editor A4, modelos pedagógicos, imagens, importação e backup. Não é necessário usar IA paga. Não limpe os dados antigos.

## Novidades

- Banco de questões: identificação e nome, componente, série, tema, habilidade (uso interno), filtros personalizados, enunciado, imagens, comando, alternativas A–E expansíveis, resposta correta e justificativa separados. Campos ricos usam barra de formatação compartilhada. Questões antigas continuam no banco; o conteúdo legado é aberto no enunciado para revisão e separação manual, não é apagado.
- Filtros: na engrenagem ou no banco, cadastre termos e sinônimos. Busca por nome, texto, tema, habilidade e etiquetas com dicionário bilíngue local e aliases cadastrados. Não é tradução universal ou busca semântica por IA. Renomear/excluir um filtro não apaga etiquetas de registros antigos; recadastre a classificação quando necessário.
- Imagens: campo próprio, inserção/colagem, alças verdes de largura e altura, alinhamento, recorte, restauração, movimentação no fluxo e exclusão. Imagens remotas dependem de CORS; prefira o arquivo local.
- Questões com tabelas: número de linhas/colunas, ajuste por medidas, arraste junto às divisórias, inserção/exclusão de linhas e colunas, mesclagem à direita, cor e alinhamento. Operações estruturais sobre células já mescladas têm restrições. Colunas 1/2/3, espaçamento e linha divisória; largura desigual em duas colunas separa enunciado/imagens do comando/alternativas, quando ambos existem.
- Prévia A4 da questão e das selecionadas. Inserção preserva o HTML estruturado, não aplica uma nova colagem inteligente. A quebra de página pode mudar conforme cabeçalho e espaço disponível. A lista contém nome compacto, visualizar, editar, duplicar e excluir.
- Caça-palavras: gerador local da V10 mantido, com validação das palavras, tabela editável e gabarito de coordenadas.
- Gabarito: questões inseridas recebem um vínculo interno que acompanha a ordem e exclusão dos blocos; pode gerar simples ou comentado e exportar PDF. A habilidade não aparece na folha de atividade. O gabarito não detecta semanticamente se uma alternativa foi alterada no editor; revise depois de editar as respostas. Gabaritos manuais são preservados ao acrescentar questões até que o professor escolha explicitamente gerar um novo gabarito vinculado.
- Plano de aula: botão no topo. Cria um documento independente, editável e salvo em Minhas Atividades, utilizando disciplina, turma, título, temas e habilidades das questões inseridas. O modelo de tabela, cores, objetivos e metodologia são provisórios; adapte ao modelo oficial quando for enviado. Habilidades ausentes ficam a definir, não são inventadas.
- Paginação: mede cada página criada e distribui blocos para a seguinte, preservando ordem. Em questões longas, tenta separar seções/parágrafos intactos e manter comando e alternativas juntos. Tabelas, imagens ou blocos únicos maiores que a área útil podem exigir ajuste manual, assim como colunas complexas e objetos flutuantes. A prévia integral e PDF usam o fluxo da V10; a exportação avisa se há conteúdo fora da área útil.
- Compartilhar: conserva o comportamento da V10. WhatsApp abre com mensagem no computador, PDF baixado precisa ser anexado; compartilhamento nativo de arquivo no celular depende do navegador.
- Backup: novas informações da questão e seus vínculos integram os registros de documentos e questões; filtros personalizados integram as preferências sincronizadas. Exporte backup completo com internet. Nenhum dado antigo é removido automaticamente.

## Atualização

Leia `ATUALIZACAO_V11_GITHUB.txt`. Atualize também os dois arquivos do backend do banco; sem eles, os novos metadados não serão preservados pela nuvem. Nenhuma pasta nova. Não modifique as variáveis de autenticação.

## Validação

TypeScript local 5.8.3 com declarações simuladas de Identity; testes em Chromium com APIs, captura de PDF e armazenamento simulados. Testados campos separados, filtros português/inglês e aliases, cadastro e prévia, inserção preservando HTML, gabarito simples/comentado, plano provisório, gerador de caça-palavras, redimensionamento de imagens por alças, alinhamento, inserção e adição de linha em tabela, duplicação, backup e paginação de 120 parágrafos. Os serviços reais, compilação com dependências instaladas, PDF e WhatsApp ainda dependem de validação no Netlify. Não há teste integral de todas as combinações possíveis de layout.

## Referência de compatibilidade — V10

### Notas históricas da V10

Atualização da V9 voltada à construção de atividades a partir do Banco de Questões. O aplicativo continua privado, com Netlify Identity, `MCS_OWNER_EMAIL`, armazenamento no Netlify Blobs e salvamento periódico configurável. As chaves e os formatos de armazenamento anteriores foram mantidos.

## Banco de questões

- Acesso direto no topo. Referências e Criar com IA foram retirados da interface, inclusive a opção de reconstrução com IA na importação. O editor, os modelos pedagógicos, gabarito, imagens e importação para edição foram mantidos. Não é necessário cadastrar chave de IA.
- Pesquisa por enunciado, tema, origem e texto de apoio, filtros por componente, série e tipo. Registros antigos sem classificação permanecem em Todos os componentes; ao editar, escolha Inglês ou Projeto de Vida.
- Seleção em ordem de clique, controles de inserção no topo, numeração opcional (desativada por padrão para manter o original), inclusão opcional de texto de apoio e gabarito.
- Prévia A4 de questão individual, questão em edição ou conjunto selecionado. O mesmo HTML sanitizado é utilizado na inserção, sem colagem inteligente nem nova normalização. O espaço útil depende do cabeçalho, margens, colunas, orientação e conteúdo existente na página de destino. Questões maiores que uma página precisam ser divididas ou ajustadas.
- Editor com formatação, imagem, linhas de resposta, e controles de tamanho, posição no fluxo, recorte reversível e exclusão de imagem. No editor principal, imagens do conteúdo coladas ou importadas passam a ser objetos móveis quando clicadas, com alças de largura e altura, recorte e exclusão. As logomarcas de cabeçalho/rodapé continuam nas configurações do documento.
- Importar questões: selecione até 20 arquivos PDF/DOCX. A classificação usa a disciplina selecionada no filtro (ou a do documento) e a série informada. A extração identifica questões numeradas; a revisão humana continua necessária. O original é guardado no armazenamento compatível da V9 para recuperação no backup. Não há OCR nesta versão.
- Caça-palavras: informe de 1 a 25 palavras de 2 a 25 letras, uma por linha ou separadas por vírgulas. O algoritmo aumenta a grade se necessário, verifica todas as posições e gera o gabarito com coordenadas. Acentos e espaços são retirados das palavras da grade. A grade é uma tabela editável. Se alterar letras manualmente, revise o gabarito.

## Editor e compartilhamento

- Visualizar utiliza a mesma rotina de renderização do PDF, página a página, sem alças de edição. Há uma prévia HTML de contingência se a captura falhar. A exportação em PDF continua como antes.
- As divisórias horizontais das tabelas são áreas de arraste; as laterais das imagens alteram altura e largura separadamente. Colunas com células mescladas ainda têm restrições do editor anterior.
- Compartilhar: no computador, tenta abrir o WhatsApp com a mensagem de atividade e baixa o PDF; selecione o contato e anexe o arquivo. Navegadores não podem anexar automaticamente arquivos locais ao WhatsApp por URL. No celular, quando o navegador oferece compartilhamento de arquivos, use Enviar arquivo pelo celular e escolha WhatsApp. Não são gerados links públicos. Se o navegador bloquear a janela, use o botão de abertura manual.
- Imagens remotas coladas por URL dependem de permissão CORS e disponibilidade do endereço. Para recortar e conservar integralmente no backup, prefira arquivos locais ou imagens copiadas como dados de imagem.

## Dados e backup

A V10 não apaga questões, referências antigas ou documentos. Os documentos antigos de referência também podem ser encontrados em Minhas Atividades; os originais da V9 permanecem incluídos no backup online. Questões e gabaritos são salvos no armazenamento local com fila de sincronização, usando o intervalo escolhido. Faça o backup completo com internet e confira a confirmação de sincronização. Em caso de falha na nuvem, um backup local parcial pode ser exportado com aviso explícito. A restauração usa as estruturas da V9; não apaga registros ausentes no arquivo. Não há recriação automática de histórico de versões.

## Atualizar da V9

Consulte `ATUALIZACAO_V10_GITHUB.txt`. Não crie um projeto novo nem limpe o armazenamento. As configurações do Netlify Identity e a variável `MCS_OWNER_EMAIL` continuam iguais.

## Desenvolvimento

- Node compatível com Vite 7; `npm install`, `npm run build`, `npm run dev`.
- Build Netlify: `npm run build`, publicação `dist`, funções em `netlify/functions`.
- Testes nesta entrega: TypeScript 5.8.3 com declaração temporária do SDK Identity; 100 gerações de caça-palavras verificadas; Chromium com serviços, PDF e autenticação simulados (criação e busca, igualdade do HTML prévia/inserção, colagem/seleção de imagem, altura, recorte/remoção, arraste de linha de tabela, fluxo da prévia, compartilhamento e exportação de backup contendo grade e gabarito). O build real, renderização real com html2canvas, armazenamento no Netlify, importação de arquivos reais e abertura/envio pelo WhatsApp exigem validação no site publicado. Nenhuma declaração simulada foi incluída no pacote.

## V13 — persistência e ajustes do banco

Consulte `ATUALIZACAO_V13_GITHUB.txt` para os arquivos alterados e o procedimento de limpeza voluntária de registros legados. A aba Modelos foi retirada do topo; os dados antigos não são apagados automaticamente. O editor de interpretação de textos oferece imagem opcional antes do texto de apoio; a numeração é inserida no enunciado quando houver. Rascunhos sem nome permanecem locais até serem salvos como atividade. O backup inclui o rascunho separadamente. O gabarito lista atividades nomeadas com respostas vinculadas. As funções de atividades e questões respeitam registros de exclusão persistentes.

## V14 — Numeração, imagens e navegação

- A numeração é inserida no primeiro trecho textual do enunciado, inclusive HTML aninhado. Questões sem texto usam uma linha própria.
- Controles contextuais de imagens em campos ricos do banco; oito alças e alinhamento no editor principal.
- Fechar ou salvar a edição individual retorna ao banco, preservando filtros, seleção e rolagem. Fechar o banco retorna ao editor principal.
- Mantidas as chaves de armazenamento e funções da V13. Nenhuma limpeza automática.
- Validação local TypeScript com SDK Identity simulado; testes visuais e deploy real pendentes.

## V15 — Praticidade e estabilidade

- Associação, verdadeiro/falso, correção e tradução por itens: campos independentes por par, adição e remoção de itens, colagem em lote opcional.
- Tradução: opção de texto completo com editor rico, imagem, linhas de resposta e tradução esperada separada; opção por itens mantém o gerador existente.
- Lacunas: botão para transformar a seleção do texto-fonte em lacuna.
- Geradores: visualização e salvamento tentam atualizar automaticamente o resultado quando a entrada muda. Mensagens de validação ficam próximas às ações; conteúdo inválido continua no editor.
- Identificação e layout avançado recolhíveis; ações fixadas na parte inferior.
- Mantidas as chaves de armazenamento, funções Netlify e formato de backup da V14.
- Validação: TypeScript com declaração temporária do SDK Identity e testes unitários de exemplo dos sete geradores. Não houve teste integral de navegador/Netlify/PDF. Campos de entrada dos geradores ainda são de texto simples; o resultado possui editor rico. Fazer backup antes da atualização.

## V16 — Currículo e planejamento
Veja ATUALIZACAO_V16_GITHUB.txt. Novo acervo curricular com 14 registros oficiais de Língua Inglesa do primeiro trimestre de 2026, separados por série, com sugestões pedagógicas editáveis. Acervo de planos independente, seleção de atividades, vínculo curricular por questão, exclusões registradas, sincronização e backup. Impressão A4 e PDF via diálogo de impressão do navegador. Campos vazios omitidos. Os planos guardam os textos gerados, sem alterações retroativas ao editar habilidades. A geração usa regras locais e dados cadastrados, não IA. Campos de plano editáveis em formulário; prévia não é editor rico. Validação local com declaração simulada de Identity; deploy e impressão real ainda não verificados.

## V17
Cabeçalho de plano com divisórias, título 16 pt sem faixa, assinaturas próximas; sugestões pedagógicas individualizadas para 14 registros; visualização independente de atividades e seletor curricular em painel separado. Mantidas as chaves e funções de armazenamento V16. Sugestões iniciais são atualizadas apenas em registros de origem não editados.
Validação: TypeScript com declaração temporária simulada de Identity; testes de navegador e deploy pendentes.

## V18
- Editor de planos com barra única de formatação e campos rich text; planos anteriores continuam legíveis e editáveis.
- Formatação armazenada em `richFields` junto com os campos textuais; prévia e impressão usam o mesmo conteúdo sanitizado. Campos vazios permanecem omitidos.
- Sugestões de conteúdos de Língua Inglesa no campo Conteúdo / tema do banco de questões, com digitação livre. São sugestões gerais, não classificação curricular oficial.
- Nenhuma alteração de chave de armazenamento ou de função Netlify; limite atual de 500 KB por registro curricular continua aplicável (o editor limita a 480 KB).
- Teste local TypeScript com declaração temporária do SDK Identity; build Netlify, testes de interação no navegador e PDF real pendentes.

## V19
- Categorias personalizadas reutilizam a chave de armazenamento dos filtros antigos. O formato de resposta continua independente, para não afetar alternativas, linhas e gabarito.
- Pesquisa por texto durante a digitação e seletor único de categorias. Registros anteriores continuam disponíveis; renomear/excluir uma categoria do cadastro não altera retroativamente as classificações antigas.
- Importação removida da interface do banco, sem excluir questões existentes.
- Desmarcação de imagens no editor principal, no banco e do contorno no editor de plano de aula. No plano ainda não há alças universais de edição.
- TypeScript validado com declaração temporária simulada de Identity. Build Netlify e teste visual não executados.

## V20 — Listagem compacta do banco
- Apenas título e série são exibidos na listagem; habilidades, categorias, conteúdos e demais metadados continuam armazenados e pesquisáveis.
- Todas as ações de cada questão permanecem disponíveis; a série não restringe a inserção em atividades.
- Nenhuma alteração em armazenamento, backup ou funções Netlify.

### Sugestão curricular V20
O vínculo curricular sugere uma habilidade existente com base em termos do título, tema, categoria, enunciado e textos, respeitando componente, séries e filtros curriculares. A seleção manual tem prioridade; correspondências insuficientes ou empatadas não são forçadas. O mecanismo é lexical, não uma IA semântica. O formato de resposta permanece separado da categoria. Os dados e as chaves de armazenamento anteriores permanecem inalterados.

## V21 — Controle da paginação A4
- Layout → Puxar conteúdo da página seguinte: move blocos que cabem na área restante.
- Backspace no início de uma página: tenta juntar com a anterior, sem apagar texto.
- Layout → Inserir quebra antes do bloco: posicione o cursor no bloco que deve iniciar a próxima folha. A quebra é manual.
- Layout → Remover quebra anterior / juntar: selecione a página posterior à quebra.
- Ajustes manuais desligam a redistribuição automática do documento; Layout → Reorganizar páginas reativa o modo automático e preserva as quebras manuais.
- A redistribuição divide contêineres de questões em blocos menores, preservando o vínculo com o gabarito. Tabelas, imagens, grades, colunas e alternativas permanecem inteiras. Páginas com objetos flutuantes não são reunidas automaticamente; use a edição manual. Blocos maiores que a área A4 precisam de ajustes de tamanho ou divisão manual.
- O estado de paginação e as páginas fazem parte do documento e do backup. No modo manual, conteúdo que exceder a folha precisa ser ajustado antes da visualização; o PDF mantém o aviso de excesso existente.
- Nenhuma alteração de chaves de armazenamento ou funções do Netlify.

### V21 — Acabamento e persistência curricular
- Categorias e editores em ordem alfabética (opções "Todos" primeiro); campo de categoria compacto.
- Lista de habilidades compacta com código, componente, série, trimestre e ano letivo. Visualizar, Editar e Excluir; duplicação removida apenas das habilidades. Pesquisa continua consultando os textos completos.
- Planos de aula: salvamento periódico conforme intervalo global; gravação antecipada ao fechar ou voltar, tentativa ao ocultar a aba e aviso de saída com edição pendente. Estado local e fila de sincronização preservam o rich text. Reenvio de pendências e confirmação de versão gravada; alterações salvas apenas localmente podem não estar disponíveis em outro Permalink.
- Validação: TypeScript com declaração temporária simulada do SDK Identity; teste isolado do armazenamento curricular com serviço simulado (salvar, offline, reenviar, recuperar de cache vazio, preservar HTML e exclusão). Testes completos de navegador/paginação, build real Netlify, autenticação entre deploys e PDF pendentes. O navegador local não concluiu o teste de paginação. Nenhum dado pessoal do site foi acessado ou excluído.

## V22 — Várias perguntas com um texto ou imagem de apoio

Nos editores Interpretação de textos, Interpretação de imagens e Questão livre, preencha o material de apoio e a primeira pergunta normalmente. Clique em **+ Adicionar outra pergunta** para ativar o conjunto. O primeiro comando e as alternativas/respostas já digitadas são transferidos para a primeira ficha. Cada ficha pode ter múltipla escolha (2 a 10 alternativas) ou resposta aberta (0 a 30 linhas), resposta esperada, justificativa e uma habilidade específica opcional. Use as setas para mudar a ordem. Duplicar e Excluir atuam apenas na pergunta do conjunto. O conjunto aceita até 50 perguntas; as respostas objetivas exigem pelo menos duas alternativas preenchidas consecutivamente. O material compartilhado aparece antes da primeira pergunta. A seleção no banco continua sendo por conjunto; ao inserir, cada pergunta recebe seu próprio vínculo e número no editor e no gabarito. As escolhas curriculares são incluídas nos vínculos da atividade.

Questões anteriores continuam no formato anterior até o usuário ativar o modo de várias perguntas. O conjunto é armazenado no mesmo registro com a propriedade adicional `subquestions`, incluída no backup e na sincronização. Atualize os arquivos cliente **e** os dois arquivos do banco de questões no Netlify indicados em ATUALIZACAO_V22_GITHUB.txt. Evite editar conjuntos de perguntas em deploys anteriores à V22, pois versões antigas não reconhecem os novos campos. Faça backup antes da atualização. Não houve mudança de chaves de armazenamento nem exclusão automática.

Validação: TypeScript local com declaração temporária simulada do SDK Netlify Identity; interface isolada no Chromium com armazenamento remoto simulado (três perguntas, prévia, apoio único, questão aberta com quatro linhas, gravação, reabertura, inserção a partir de 4 e gabaritos); teste de funções com armazenamento simulado. Não foi executado build completo com as dependências reais do Netlify. Testar sincronização real, paginação e PDF no Permalink.

## V23 — Listagem A–Z e filtros claros

O Banco de Questões ordena os registros pelo título usando a ordenação pt-BR, inclusive na pesquisa. O botão Limpar filtros restaura todos os filtros e a busca, sem alterar dados ou seleção. O contador mostra registros exibidos e total do banco, além de avisar sobre filtros ativos e questões selecionadas que estejam ocultas. A sequência de inserção permanece na ordem de seleção. Nenhuma mudança no armazenamento, backup ou funções Netlify.

## V24 — Associação visual e quadros de produção

Dois editores novos em ordem alfabética no Banco de Questões (13 ao todo):
- **Associação de imagens e palavras**: até 12 pares, upload de imagens JPG/PNG/WebP (redimensionadas a até 320 px para reduzir tamanho), palavras correspondentes, reordenação, exclusão, largura das imagens, embaralhamento da coluna de respostas, círculos numerados e círculos vazios. Gabarito gerado automaticamente. O resultado continua editável com as ferramentas do banco.
- **Quadros para desenho e colagem**: até 12 quadros com títulos, altura de 15–100 mm, 1–3 colunas, reordenação e remoção. O comando e a resposta esperada são editáveis.

Na primeira abertura do Banco de Questões com a sincronização autenticada funcionando, são cadastrados dois exemplos de Culture a partir das imagens fornecidas, com IDs estáveis: associação com as sete imagens recortadas do print e desenho/colagem com quatro quadros. O comando da associação foi reconstruído porque o início estava cortado no print. Os exemplos são classificados como Inglês, 1º ano EM, ambas as modalidades; podem ser editados. Nenhum número fixo de questão; os números das imagens são identificadores de associação. O cadastro não substitui registros existentes e respeita registros de exclusão no servidor. Se offline, a inclusão é tentada quando a consulta autenticada ao banco voltar a funcionar. Não restaure backups antigos por cima de dados mais recentes sem conferir o acervo.

Inclui todos os ajustes V23. O editor principal continua permitindo criar atividade do zero e salvar em Minhas Atividades via Arquivo → Salvar. Chaves de armazenamento e rotinas de salvamento de atividades foram mantidas. A função de banco de questões do Netlify aceita os novos tipos e o conteúdo maior do gerador visual. Não edite questões novas em deploys anteriores à V24.

Validação local: TypeScript com declaração temporária simulada do SDK Identity; Chromium com interface isolada e API simulada (cadastro dos exemplos, sete imagens, gabarito, prévia A4, edição dos quadros, upload, salvar/reabrir, A–Z e filtros); testes da função Netlify com armazenamento simulado (persistência dos novos tipos, dados acima de 60 mil caracteres, proteção de versões recentes e exclusões, regressão de questões agrupadas). O build completo com dependências reais, PDF final e sincronização entre Permalinks ainda precisam de confirmação no ambiente publicado. Nenhum acesso ao acervo privado real foi realizado.

### V24 — Colunas apenas no trecho selecionado (revisão final)

Selecione o texto e abra Layout → Colunas — somente o trecho selecionado → 1, 2 ou 3 colunas. A seleção é transformada em um bloco independente, preservando a formatação e o conteúdo que vem antes e depois. Para retirar ou alterar as colunas de um bloco existente, posicione o cursor dentro dele e escolha a quantidade desejada. As opções de página inteira continuam em um grupo separado, com confirmação. Tabelas e linhas de alternativas são mantidas inteiras; seleções que cortam vínculos de questões ou atravessam blocos de colunas existentes precisam ser ajustadas separadamente. Não foram alteradas as rotinas de armazenamento.

Teste adicional: função de colunas executada em Chromium isolado com as dependências de salvamento e paginação simuladas; 2/3 colunas, retorno a 1, seleção parcial em negrito, alternativas, preservação de conteúdo vizinho e vínculo de gabarito. PDF e integração completa com paginação real ainda precisam de validação no site.

## V25 — Importação de atividades e novos editores

Três atividades editáveis de Língua Inglesa foram preparadas a partir dos PDFs fornecidos, com IDs estáveis: Black Awareness Day (2 páginas), Starter Unit Anytime (3 páginas, incluindo as respostas originais) e Adverbs of Frequency – Listening Sara (2 páginas, sem a página de respostas). Textos e linhas reconstruídos em HTML e imagens/infográficos preservados; diagramação aproximada, não uma reprodução exata. O cadastro ocorre após leitura autenticada bem-sucedida do acervo, sem substituir IDs existentes ou recriar IDs excluídos. Classificação inicial genérica de Ensino Médio; altere a série conforme necessário.

Cinco tipos adicionais: Associação de frases e significados, Interpretação de infográficos, Listening – compreensão auditiva (link externo de áudio/vídeo, lacunas e perguntas complementares), Respostas pessoais e Vocabulário e cognatos. Sem upload de áudio/vídeo nesta versão. Delete e Backspace nos limites das páginas vazias e confirmação para apagar página com conteúdo; recorte/cópia de objetos selecionados e conteúdo formatado. O clipboard depende das permissões do navegador. As chaves de armazenamento foram mantidas. Consulte ATUALIZACAO_V25_GITHUB.txt.

Validação: TypeScript com declaração temporária simulada do SDK Identity. Prévia isolada das sete páginas convertidas. Testes integrados de atalhos, sincronização real, build Netlify e exportação PDF ainda pendentes. Nenhum acervo remoto foi acessado.

## V26 — Habilidades nas atividades, gabaritos e formatação importada

- Minhas Atividades: listagem compacta e botão Habilidades para selecionar os registros curriculares diretamente em qualquer documento, inclusive os criados do zero. Sugestões baseadas no texto e nos registros curriculares ativos; revise a escolha. Os vínculos entram no plano de aula, além dos vínculos das questões. Para os três PDFs sem série definida, a seleção inicial usa registros do 1º ano; a escolha pode ser alterada e os vínculos removidos não são recriados automaticamente.
- Os três documentos V25 são adaptados pelo ID, sem substituir integralmente os registros salvos. Cabeçalho padrão único na primeira página, numeração no rodapé, remoção de títulos importados reconhecidos e conversão de fragmentos em parágrafos editáveis. Listening Sara: o texto de lacunas passa a ser um parágrafo corrido. A página original de respostas de Starter Unit Anytime é removida quando reconhecida sem alterações de conteúdo; uma página modificada é preservada para evitar perda de trabalho. Os cabeçalhos antigos modificados pelo usuário também podem precisar de remoção manual. A mudança de margens e cabeçalho pode alterar o número final de páginas.
- Menu Gabarito existente: acervo manual independente, texto simples editável, pesquisa, renomeação, exclusão, visualização A4 em PDF e exportação. Mantidos os gabaritos automáticos. Respostas das páginas 3 de Listening Sara e Starter Unit Anytime cadastradas após leitura autenticada do acervo auxiliar, com IDs estáveis e proteção por registros de exclusão. As respostas foram transcritas dos PDFs, sem revisão pedagógica. Incluídas no backup e na fila de sincronização auxiliar. Atualizar também a função aux-data do Netlify.
- Validação: TypeScript local com declaração temporária simulada de Identity; teste isolado do conversor em Chromium confirmou a transformação das páginas, preservação das imagens de atividades e parágrafo corrido de Listening Sara. Não foram concluídos o teste integral da interface, a conferência de paginação/PDF, a sincronização real ou o build do Netlify. O último print adicional não estava disponível para análise. Consulte ATUALIZACAO_V26_GITHUB.txt.

### V26 — Revisão final do monograma e paginação manual
- Marca MKS com largura mínima, centralização e tamanho responsivo para evitar letras cortadas.
- A movimentação manual aceita páginas com orientações, colunas ou bordas diferentes; o conteúdo passa a usar o layout da folha de destino. A paginação automática continua respeitando as configurações das folhas. Quando um parágrafo comum não cabe inteiro, a movimentação manual pode dividir o texto em um limite de palavra, mantendo a formatação inline e o trecho restante. Imagens flutuantes, tabelas, linhas de resposta e questões vinculadas não são divididas arbitrariamente. Se o conteúdo não couber, a interface avisa sem excluí-lo.
- Validação adicional: TypeScript com declaração simulada do SDK Identity; teste isolado no Chromium confirmou largura da marca, movimentação manual entre layouts distintos, divisão de parágrafo preservando texto/negrito, proteção de questão vinculada e remoção de página vazia. Não houve build completo com dependências reais nem teste de sincronização no Netlify ou PDF final.
