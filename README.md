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
