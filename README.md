# Marks Class Studio — V10

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
