# Marks Class Studio — V3

Plataforma pedagógica para criação, edição, organização e geração de atividades de **Língua Inglesa** e **Projeto de Vida**.

## O que mudou na V3

- Migração automática dos dados locais da V2.
- Cabeçalho baseado no padrão real da E.E. Ione Silveira Mendes.
- Logo Ione V3 incluída como padrão e substituível.
- Perfis separados: Língua Inglesa e Projeto de Vida.
- Editor A4 em tempo real com Arial 12 e texto justificado.
- Régua horizontal com margens esquerda/direita arrastáveis e controles das quatro margens.
- Imagens flutuantes: inserir, mover, redimensionar, trazer para frente e excluir.
- Caixas de texto flutuantes: mover, redimensionar, editar e mostrar/ocultar borda.
- Arrastar imagem do computador para a folha e colar imagem da área de transferência.
- Banco de imagens local + sincronização por Netlify Blobs.
- Biblioteca com filtro por componente e busca.
- Modelos próprios para Inglês e Projeto de Vida.
- Histórico restaurável.
- Importação PDF/DOCX para conteúdo editável.
- Geração e compartilhamento de PDF.
- Módulo “Criar com IA” preparado e funcional quando `OPENAI_API_KEY` estiver configurada no Netlify. A IA recebe referências da própria biblioteca do professor.

## Estrutura

```text
src/
  main.ts
  style.css
  vendor.d.ts
  logo-ione-v3.png
netlify/functions/
  save-activity.mts
  load-activity.mts
  list-activities.mts
  delete-activity.mts
  save-image.mts
  list-images.mts
  delete-image.mts
  generate-activity.mts
index.html
netlify.toml
package.json
tsconfig.json
vite.config.ts
```

## IA (opcional nesta etapa)

No painel do Netlify, configure a variável de ambiente `OPENAI_API_KEY`. Opcionalmente defina `OPENAI_MODEL`; se não for definida, o projeto usa `gpt-6-luna`. Depois faça um novo deploy. Sem a chave, todo o restante da plataforma continua funcionando e o módulo informa claramente que a IA não está configurada.

## Build

```bash
npm install
npm run build
```
