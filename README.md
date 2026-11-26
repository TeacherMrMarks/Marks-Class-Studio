# Atualização V8.1 — Marks Class Studio

Base: V8, sem mudança de autenticação.

- Barra permanente de formatação acima da régua, menus e ações compactos; indicador de salvamento por símbolo e descrição.
- Arial 12, justificado, entrelinha 1,15 em novos documentos, colagem inteligente, importação padronizada e IA. Modelos pedagógicos com linhas de resposta próprias.
- Cabeçalhos (nome da escola e título): clique no campo e use a barra de formatação. A formatação se aplica ao campo inteiro.
- Layout > Bordas da página: opcional, desligada em novos documentos, espessura 0,25–6 pt, cor, estilo, distância do texto e escopo. O limite de 5 mm da borda do papel é uma referência; confirme a margem física da sua impressora.
- Engrenagem > Intervalo de salvamento: 15 s a 10 min, padrão 30 s. Alterações são acumuladas durante a edição. Salvar, trocar documento e ocultar a aba antecipam a gravação. Fechamento abrupto antes do intervalo pode perder alterações; salve manualmente antes de fechar.
- Engrenagem > Limpar atividades antigas: exige conexão e confirmação. Remove atividades dos dois acervos e históricos anteriores, preservando os 23 modelos pedagógicos, modelos pessoais e banco de imagens. Faça backup antes; execute com as outras abas/dispositivos fechados. A limpeza não ocorre automaticamente no deploy.
- Não são gerados novos históricos persistentes. Desfazer/refazer continuam disponíveis durante a sessão.
- Limpar atividade cria novo documento com cabeçalho preservado e guarda o anterior.
- Importação padrão: Biblioteca de Referências; altere o destino se desejar.

Validação: tsc 5.8.3, usando declaração temporária para o SDK Identity (não incluída no ZIP). O Chromium não permitiu navegar na página de testes nesta sessão. O build com as dependências reais e a sincronização real precisam de validação no Netlify.

---

# Marks Class Studio — V7.2

Plataforma de uso individual do professor (sem autenticação nesta versão) para criar, importar, editar, organizar e exportar atividades pedagógicas de **Língua Inglesa** e **Projeto de Vida**.

## Novidades da V7.2 (base V7.1)

- Marca, nome e identificação da versão ancorados no canto superior esquerdo. Menu geral centralizado no espaço disponível e controles de sincronização/painel à direita; em telas estreitas, menu geral na linha seguinte.
- No cabeçalho padrão das duas disciplinas, professor na primeira linha; disciplina à esquerda e turma alinhada à margem direita na segunda linha. A linha do aluno mantém toda a largura útil. Cabeçalhos importados em modo de preservação permanecem inalterados.
- Nenhuma alteração no armazenamento ou nas funções Netlify.

## Novidades da V7.1 (base V7)

- Menu geral centralizado ao lado da marca, com divisórias e adaptação a telas menores.
- Menus de edição centralizados, com listas verticais suspensas; fecham ao escolher uma ação ou clicar fora. Os campos de margem permanecem disponíveis enquanto são ajustados.
- Correção pontual do histórico para que uma formatação não seja agrupada com a digitação anterior.
- Nenhuma alteração de armazenamento ou funções Netlify.

## Novidades da V7 (base V6.1)

- Menu geral acima dos menus de edição, ambos compactos e fixos durante a rolagem. Ações Visualizar, Gerar PDF e Compartilhar à direita das abas de edição. Em telas estreitas, as faixas têm rolagem horizontal.
- Um único menu IA e um único menu Modelos. Os comandos de criação, seleção, adaptação, gabarito e reconstrução ficam reunidos em IA. A reconstrução abre o importador em modo adaptar com IA. Salvar layout atual fica dentro de Modelos.
- Arquivo > Salvar abre um diálogo para nome, componente e série na primeira confirmação; os autosaves continuam ativos e a atividade continua armazenada em Minhas Atividades. Salvar como cria um novo ID, preservando o original. Renomear altera o nome no acervo sem modificar o cabeçalho impresso.
- Para editar uma imagem flutuante, selecione-a e clique na tesoura (ou Inserir > Editar imagem). Arraste as oito alças ou informe percentuais de recorte; gire em 90°, ajuste brilho, contraste e escala de cinza. Aplique, cancele ou restaure o original. Os ajustes são armazenados com a atividade e integrados ao desfazer/refazer. O raster editado é limitado a 2400 pixels no maior lado; o arquivo original permanece guardado. Imagens grandes podem pressionar o limite de armazenamento local do navegador.
- O recorte nesta versão atua nas imagens flutuantes inseridas na folha, não nas imagens HTML internas de um DOCX importado nem nas logomarcas do cabeçalho/rodapé.
- Chave de IA ainda necessária no Netlify. Não há autenticação nesta versão. Não armazene dados pessoais de alunos em uma implantação pública sem proteção de acesso.

## O que mudou na V4

- Editor **A4 multipágina real**: cada página aparece separadamente.
- Orientação por página: **Retrato** ou **Paisagem**, inclusive misturadas no mesmo documento.
- Numeração de páginas centralizada no rodapé.
- Logo da escola no cabeçalho e campo para **logo pessoal na última página**.
- Faixa de ferramentas organizada em menus no estilo de editor de escritório: **Início, Inserir, Layout, Organizar, Modelos e IA**.
- Página com **1, 2 ou 3 colunas**.
- Trecho selecionado com **2 ou 3 colunas** sem mudar a página inteira.
- Ordenação da seleção em **A→Z, Z→A ou numérica**.
- Inserção de imagem, caixa de texto, tabela, linhas de resposta e novas páginas.
- Imagens/caixas de texto móveis e redimensionáveis.
- Biblioteca, modelos, banco de imagens e histórico preservados da V3.
- Modelos de layout pessoais (páginas, orientação, colunas, margens e rodapé).
- Importação PDF/DOCX com detecção de páginas e orientação; quando a IA estiver configurada, a opção **Remontar com IA** reorganiza o conteúdo em HTML editável.
- Criador com IA com escolha de componente, série, tema, número de questões, número de páginas, orientação, colunas e referência na biblioteca.
- Assistente de IA para **melhorar seleção** e **criar semelhante**.
- Gabarito separado do documento do aluno.
- PDF em três modos: **Atividade**, **Atividade + gabarito** e **Somente gabarito**.
- Migração automática dos dados locais da V3/V2 para a V4.

## IA no Netlify

Para ativar os recursos inteligentes, adicione no Netlify a variável de ambiente:

`OPENAI_API_KEY`

Opcionalmente, você pode definir:

`OPENAI_MODEL`

Se `OPENAI_MODEL` não existir, a função usa `gpt-4.1-mini`.

Depois de alterar variáveis no Netlify, faça um novo deploy.

## Importação

### DOCX
É a melhor opção quando você quer preservar estrutura editável e imagens. O sistema converte o documento para HTML editável.

### PDF
O sistema preserva a quantidade de páginas e detecta Retrato/Paisagem. PDFs são documentos de saída e nem sempre carregam a mesma estrutura lógica de um arquivo Word; por isso a V4 extrai o conteúdo e, quando a IA estiver ativa, tenta reconstruir títulos, questões, listas, tabelas e colunas. PDFs escaneados sem camada de texto ainda podem exigir inserção manual da imagem da página.

## Salvamento

A atividade é salva localmente de forma automática e sincronizada com Netlify Blobs quando há conexão.

## V5 — melhorias sobre a V4

- Menu Arquivo, Minhas Atividades e Biblioteca de Referências; documentos antigos
  importados aparecem nos dois acervos para não ocultar material já existente.
  Abrir uma referência gera uma cópia editável. A opção Ambos compartilha o mesmo
  documento entre os acervos; copiar para outro acervo cria uma cópia independente.
- Salvamento local imediato, sincronização com fila e status de falha. Os nomes
  das chaves locais e do Netlify Blobs da V4 são mantidos para continuidade.
- Configurações retráteis, margens em Layout, régua para recuos dos parágrafos,
  espaçamento 0,5–2,0 e personalizado, antes/depois e remoção de espaçamento.
- Correção do X das imagens e caixas de texto; histórico próprio de desfazer/refazer.
- Tabelas com escolha de linhas e colunas (até 200 x 50, máximo 3.000 células),
  edição de linhas, colunas, mesclagem horizontal, bordas, cor e alinhamento.
  Largura/altura por valores numéricos, não arrastando divisórias.
- Modelos aplicados sem apagar páginas ou objetos existentes.
- Importação com três modos: original, adaptar ou somente conteúdo. PDF: detecção
  conservadora de colunas, preservação da orientação e quantidade de páginas;
  imagens de PDFs com texto e diagramação complexa podem não ser recuperadas.
  PDF sem texto é inserido como imagem. DOCX: preservação básica via Mammoth,
  leitura da primeira seção e quebras de página quando reconhecidas. Cabeçalhos,
  rodapés e múltiplas seções complexas podem exigir reconstrução manual.
  A IA é opcional no modo adaptar e não altera o número de páginas detectado.
- Sem autenticação: proteja o deploy antes de guardar informações confidenciais.

### Validação desta entrega

`tsc --noEmit` e testes dos controles em Chromium com serviços simulados. Não
foi validado o build Vite completo nem o funcionamento real das dependências de
PDF/DOCX, API de IA e Netlify Blobs neste ambiente. Veja ATUALIZACAO_V5_GITHUB.txt.

## V6 — melhorias sobre a V5.1

- Acervos e ferramentas transferidos para menu horizontal superior.
- Configurações e importação recolhíveis, com estado lembrado no navegador.
- Tabelas: clique dentro da tabela para ver as alças. Arraste o canto inferior direito para alterar largura e altura proporcionalmente às colunas/linhas; arraste as divisórias verticais/horizontais para ajustar dimensões individuais. As alças não entram no PDF. O conteúdo e as margens limitam o tamanho mínimo/máximo. Em tabelas com células mescladas, use Editar tabela para ajustes individuais de colunas; o arraste de divisórias verticais exige células regulares.
- Importação com opção de padronização ativa por padrão: Arial 12 pt, texto justificado, entrelinha 1,0 e 3 pt depois de parágrafos comuns; listas e alternativas compactas. Títulos identificados permanecem destacados. Desmarque a opção para tentar preservar os estilos extraídos. A extração de PDF agrupa linhas em parágrafos com heurísticas, sem exigir IA.
- Mantida a correção da V5.1 para Uint8Array/Blob e as chaves de armazenamento.

Validação V6: TypeScript 5.8.3 (tsc --noEmit), testes Chromium dos controles, arraste de tabela/divisórias, desfazer/refazer e formatação com dados de PDF/DOCX simulados. Build Vite, dependências reais e deploy Netlify ainda não validados. PDFs complexos, especialmente tabelas, imagens e digitalizações, e DOCX com paginação complexa exigem revisão.

### V6.1
Linha do aluno até a margem direita do cabeçalho, régua alinhada à folha ativa e à rolagem horizontal, com escala em centímetros e marcadores de recuo. Mantida a base V6.

## V7.3 — Colagem inteligente e histórico rápido

- Ctrl+V na folha: Arial 12, justificado, entrelinha 1,0 e zero antes/depois; mantém destaques semânticos, listas, tabelas e imagens quando o clipboard fornece HTML compatível. Texto sem formatação não contém informações sobre negrito ou itálico. Imagens copiadas isoladamente continuam como objetos móveis.
- Início → Colar: inteligente, original ou somente texto. Se o navegador não liberar a leitura pelo botão, use Ctrl+V após escolher o modo.
- Desfazer e Refazer sempre visíveis na barra de edição; Ctrl+Z e Ctrl+R, também Ctrl+Y e Ctrl+Shift+Z. Fora de campos de formulário e diálogos, Ctrl+R é capturado para refazer em vez de atualizar a página. O navegador pode reservar esse atalho em algumas plataformas.
- Sem alteração dos serviços Netlify ou das chaves de armazenamento.

## V8 — editor compacto, modelos pedagógicos, backup e conta privada

Base: V7.3. As chaves de dados e os nomes dos stores de atividades/imagens foram mantidos. A edição usa a mesma estrutura de documentos, imagens, régua, tabelas, colagem inteligente e PDF. O navegador migra os registros existentes para cache compatível e usa IndexedDB como camada adicional para dados grandes. O salvamento é local a cada edição, com sincronização remota em fila; a escrita no IndexedDB é assíncrona. Mantenha a página aberta quando houver indicação de sincronização pendente ou falha. Os documentos também são recuperados da nuvem ao iniciar, sem sobrescrever uma edição local pendente.

- **Documento**, no canto superior direito: abre somente sob demanda o painel de cabeçalho, escola, professor, componente, turma, título, logos e rodapé. Fecha sem ocupar uma coluna fixa. Importação agora em Arquivo → Importar PDF / Word.
- **Pedagógico**: 11 modelos de Inglês (Reading, Listening com roteiro para leitura do professor, lacunas, associação, questões objetivas, escrita, imagens, verdadeiro/falso, ordenar frases, recortar/colar, caça-palavras de exemplo) e 12 de Projeto de Vida. Escolha a série 1ª/2ª/3ª EMTI ou EM. Cada modelo cria uma atividade nova, editável, com exemplos e gabarito quando aplicável. As imagens dos modelos que as pedem são espaços reservados; insira a imagem de sua escolha. O caça-palavras é um exemplo editável, não o gerador automático. Não há módulo de áudio.
- **Pedagógico → Formatar documento automaticamente**: normaliza textos em Arial 12, justificado, entrelinha 1,0 e zero antes/depois, preservando destaques, tabelas, objetos e colunas. Revise títulos, quebras de página e conteúdo ao finalizar.
- O gabarito digitado também é salvo automaticamente. Modelos, histórico e preferências de régua/importação são sincronizados por registros auxiliares; a interface de histórico mostra os 35 registros locais mais recentes. O banco de imagens e os documentos são retomados quando a conexão voltar. Evite editar o mesmo documento simultaneamente em dois aparelhos: não é edição colaborativa.

### Configurar o acesso ANTES de publicar a V8

1. No painel do seu site no Netlify, abra Identity, habilite o serviço e configure Registration → Invite only. Convide somente seu e-mail em Users (se já existir, use a conta existente).
2. Em Project configuration → Environment variables, adicione `MCS_OWNER_EMAIL` com seu e-mail de Identity, exatamente o que foi convidado. Disponibilize a variável às Functions, inclusive no ambiente do deploy desejado. A falta da variável bloqueia o acesso por segurança. Não coloque senha nem essa configuração no código público. A chave `OPENAI_API_KEY`, se usada, continua no Netlify.
3. Suba todos os arquivos V8, inclusive index.html, arquivos novos de src, as funções atualizadas e `netlify/shared/auth.mts`. Publique apenas quando todos estiverem no repositório (idealmente um commit completo). A autenticação passa a proteger as funções de documentos, imagens e IA, além da tela. Não deixe a versão pública anterior publicada em URLs acessíveis caso contenha dados sensíveis; revogue deploys antigos quando possível.
4. Abra o link de convite recebido por e-mail e defina a senha. A tela também tem Esqueci minha senha. Para alterar a senha estando conectado, clique na engrenagem → Alterar minha senha e informe a senha atual, a nova e a confirmação.

A V8 usa o SDK oficial `@netlify/identity` 2.0.1 (https://docs.netlify.com/manage/security/secure-access-to-sites/identity/get-started/). O formulário de senha nova aceita de 6 a 12 caracteres; prefira 12. Não foi adotada a senha de quatro dígitos por segurança e compatibilidade. O serviço pode impor requisitos adicionais. Nenhuma senha é salva no arquivo de backup. O login real, recuperação por e-mail e alterações de senha requerem o Identity habilitado em um deploy. A proteção remota não criptografa o cache já gravado no perfil do navegador; evite computadores compartilhados. Ao sair, a aplicação tenta sincronizar antes de encerrar a sessão.

### Backup

Na engrenagem no canto superior direito → **Exportar backup completo**. Um arquivo JSON datado reúne rascunho, atividades, referências, objetos/imagens inseridos, logos, gabaritos, banco de imagens, modelos, histórico disponível e preferências. A plataforma consulta a nuvem e combina com os dados locais; se a nuvem estiver indisponível, oferece explicitamente backup somente local, que não deve ser confundido com o completo. Não inclui a senha, sessão, chaves de API, nem os PDFs/DOCX originais que não foram armazenados pela biblioteca anterior (inclui o documento reconstruído e editável).

Para recuperar: engrenagem → Importar backup, selecione o JSON e confirme. A restauração mescla os acervos por ID, preserva itens que já existiam e prefere a atividade mais recente em caso de conflito; não limpa o acervo atual. Importe apenas backups que você gerou e mantenha uma cópia separada. O editor valida a estrutura e higieniza HTML ao importar. A sincronização ocorre em fila; arquivos muito grandes podem exceder os limites das Functions/armazenamento do navegador, e exigem revisão do status. Para backup completo é necessário acesso à nuvem. O JSON contém seu material: guarde-o em local privado.

### Validação V8

Validação local com TypeScript 5.8.3 e uma declaração de teste temporária para o SDK Identity (não incluída no projeto); Chromium com serviços e autenticação simulados para painel, modelos, gabarito automático, tela de alteração de senha, exportação/restauração de backup e tela estreita. A instalação das dependências não foi possível neste ambiente (rede DNS indisponível). Portanto, ainda é necessário confirmar o build real, a API Identity, a sincronização de Blobs e a recuperação por e-mail no Netlify. A geração por IA continua dependendo de `OPENAI_API_KEY`. A infraestrutura nova não substitui os testes de importação PDF/Word com seus arquivos reais.

## V9 — Memória pedagógica e banco de questões

Base: V8.1. Os acervos existentes e as configurações de acesso são preservados. Referências → Importar até 20 arquivos: selecione PDF/DOCX, componente, série e tipo. O envio exige conexão e permite até 25 MB por arquivo. O original é enviado em partes, identificado por SHA-256 e confirmado antes da extração do texto. Duplicatas do mesmo conteúdo são ignoradas. A falha de um arquivo não cancela os outros. Mantenha a janela aberta durante o envio; o botão Tentar novamente reenvia os itens não confirmados. Não há fila de arquivos offline persistente.

A biblioteca permite baixar o original, revisar/editar o conteúdo extraído, reprocessar, extrair questões, abrir uma cópia editável e excluir a referência. PDFs digitalizados sem texto permanecem armazenados, mas exigem transcrição/revisão manual; não há OCR automático. A reconstrução visual continua sujeita aos limites do PDF/Word. Imagens dos originais são preservadas no arquivo, não indexadas visualmente pela IA. O texto pesquisável é limitado a 1,5 milhão de caracteres por documento. A importação por link aceita URLs públicas diretas de PDF/DOCX que permitam leitura pelo navegador (CORS); se bloqueadas, baixe e envie o arquivo. Não importa páginas HTML ou pastas do Drive.

Banco de questões: acesse em Referências → Banco de questões ou Pedagógico → Banco de questões. Cadastre manualmente componente, série, tema, tipo, texto de apoio, enunciado, alternativas e gabarito. É possível formatar o enunciado e inserir imagens de até 900 KB. Questões detectadas em documentos numerados são marcadas para revisão; a detecção é heurística, e as respostas não são inventadas. Selecione uma ou várias questões, informe a numeração inicial e escolha incluir o contexto e o gabarito. O conteúdo é inserido na atividade atual; revise a distribuição de páginas. A edição das questões usa o intervalo de salvamento escolhido nas configurações e tenta salvar ao fechar. O banco é independente: remover uma referência não apaga automaticamente suas questões extraídas. Exclua-as pelo banco quando necessário.

Na geração de IA, habilite o uso da biblioteca. A função consulta referências da disciplina (ou gerais) e questões revisadas, ordenando trechos por termos de busca e série, sem enviar o acervo inteiro à API. É recuperação lexical, não treinamento do modelo ou busca vetorial. A consulta ainda lê os registros de texto na nuvem; bibliotecas muito grandes podem precisar de indexação otimizada posteriormente. Requer OPENAI_API_KEY no Netlify. As referências são tratadas como dados, não instruções.

O backup completo online inclui originais confirmados, textos extraídos, banco de questões e acervos anteriores. Backups antigos continuam aceitos; documentos antigos sem original armazenado não ganham original automaticamente. A restauração mescla dados. O backup em JSON pode ficar grande; mantenha cópia privada e conexão durante a operação.

Validação: TypeScript 5.8.3 com declarações temporárias para o SDK Identity, não incluídas no pacote; testes de funções com armazenamento e autorização simulados: integridade do original, envio incompleto, duplicatas, extração de questões numeradas, cadastro manual, exclusão, restauração e consulta por disciplina. Não foi validado o build com dependências reais, o fluxo completo no navegador, o login real, o Netlify Blobs nem a geração com API real. Teste com um lote pequeno antes de importar todo o acervo.
