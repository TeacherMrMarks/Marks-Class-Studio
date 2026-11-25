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
