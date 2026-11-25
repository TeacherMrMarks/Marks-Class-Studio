# Marks Class Studio — V4

Plataforma privada do professor para criar, importar, editar, organizar e exportar atividades pedagógicas de **Língua Inglesa** e **Projeto de Vida**.

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

Se `OPENAI_MODEL` não existir, a função usa `gpt-6-luna`.

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
