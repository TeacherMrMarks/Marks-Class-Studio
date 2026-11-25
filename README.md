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
