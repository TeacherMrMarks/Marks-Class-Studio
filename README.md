# Teacher Marks Edu Studio — V1

Primeira base funcional da plataforma pedagógica para criação, edição e exportação de atividades escolares.

## O que já existe nesta versão
- Editor de atividade em página A4
- Padrão Arial 12 e texto justificado
- Negrito, itálico, sublinhado, alinhamentos, listas, recuo, desfazer/refazer
- Espaçamento entre linhas
- Cabeçalho com escola, professor, disciplina, turma e título
- Logomarca da escola
- Autosave local com debounce de 700 ms
- Tentativa de sincronização com Netlify Blobs quando online
- Exportação para PDF
- Compartilhamento do PDF pelo compartilhamento nativo do celular quando disponível
- Estrutura preparada para Biblioteca, Modelos, Histórico e importação PDF/Word

## Publicar no GitHub e Netlify
1. Extraia o ZIP.
2. Crie um repositório novo no GitHub.
3. Envie todos os arquivos desta pasta para o repositório.
4. No Netlify, escolha **Add new site > Import an existing project** e conecte o repositório.
5. O Netlify deverá reconhecer:
   - Build command: `npm run build`
   - Publish directory: `dist`
6. Publique o site.

O `netlify.toml` já traz essas configurações.

## Desenvolvimento local
```bash
npm install
npm run dev
```

## Próximos módulos previstos
1. Biblioteca real de atividades e arquivos
2. Importação inteligente de PDF/Word para conteúdo editável
3. Modelos de Atividade / Avaliação / Recuperação / Simulado / Pesquisa
4. Histórico de versões com restauração
5. Geração inteligente de questões por tema/habilidade
6. Gabarito e versão do professor
7. Banco de questões e classificação por série, disciplina, habilidade e dificuldade
8. Compartilhamento por link temporário

## Observação
Nesta V1, o upload de PDF/Word já aparece na interface, mas a interpretação automática do arquivo ainda não foi ligada. A arquitetura já está preparada para isso.
