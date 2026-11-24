# Marks Class Studio — V2

Segunda versão funcional da plataforma de criação e edição de atividades pedagógicas.

## O que mudou na V2
- Importação de PDF com extração de texto para a área editável.
- Importação de DOCX com texto, formatação básica e imagens incorporadas.
- O conteúdo importado abre imediatamente na folha A4.
- Edição e prévia atualizadas em tempo real.
- Biblioteca de atividades funcional: abrir, duplicar e excluir.
- Sincronização das atividades com Netlify Blobs quando online.
- Modelos funcionais: Atividade, Avaliação, Recuperação, Simulado e Pesquisa.
- Histórico de versões com restauração.
- Botão Nova atividade.
- Inserção de imagens diretamente no editor.
- Prévia em modal, impressão, PDF e compartilhamento.
- Identidade atualizada para Marks Class Studio.

## Observações de importação
- PDF: a V2 extrai o texto e o transforma em conteúdo editável. Imagens embutidas dentro do PDF ainda não são reconstruídas automaticamente como elementos independentes.
- DOCX: imagens incorporadas são preservadas quando possível.
- DOC antigo: converta para DOCX ou PDF antes de importar.

## Estrutura
- Arquivos da raiz: README.md, index.html, netlify.toml, package.json, tsconfig.json, vite.config.ts
- Pasta src: main.ts, style.css, vendor.d.ts
- Pasta netlify/functions: save-activity.mts, load-activity.mts, list-activities.mts, delete-activity.mts

## Deploy no Netlify
Build command: `npm run build`
Publish directory: `dist`
Functions: `netlify/functions`
