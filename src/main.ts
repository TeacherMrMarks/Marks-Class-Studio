import './style.css';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import mammoth from 'mammoth';
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import defaultSchoolLogo from './logo-ione-v3.png?inline';

GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

type ComponentKind = 'english' | 'life-project';
type Orientation = 'portrait' | 'landscape';
type FloatingType = 'image' | 'textbox';
type PdfMode = 'activity' | 'activity-key' | 'key';

type FloatingObject = {
  id: string;
  pageId: string;
  type: FloatingType;
  x: number;
  y: number;
  width: number;
  height: number;
  src?: string;
  html?: string;
  border?: boolean;
  z: number;
};

type PageData = {
  id: string;
  html: string;
  orientation: Orientation;
  columns: 1 | 2 | 3;
};

type Margins = { top: number; right: number; bottom: number; left: number };

type Activity = {
  id: string;
  component: ComponentKind;
  school: string;
  teacher: string;
  subject: string;
  grade: string;
  title: string;
  logoDataUrl?: string;
  personalLogoDataUrl?: string;
  showPersonalLogo: boolean;
  showPageNumbers: boolean;
  sourceName?: string;
  collection?: "activity" | "reference" | "both";
  originalLayout?: boolean;
  tags?: string[];
  margins: Margins;
  pages: PageData[];
  objects: FloatingObject[];
  answerKeyHtml: string;
  createdAt: string;
  updatedAt: string;
  // compatibilidade V1/V2/V3
  content?: string;
};

type HistoryItem = { id: string; savedAt: string; activity: Activity };
type ImageBankItem = { id: string; name: string; dataUrl: string; createdAt: string };

type ImportCandidate = {
  sourceName: string;
  warning?: string;
  pages: Array<{ html: string; orientation: Orientation; columns?: 1 | 2 | 3 }>;
};

const STORAGE_KEY = 'marks-class-studio:draft:v4';
const LIBRARY_KEY = 'marks-class-studio:library:v4';
const HISTORY_KEY = 'marks-class-studio:history:v4';
const IMAGE_BANK_KEY = 'marks-class-studio:image-bank:v4';
const OLD_KEYS = {
  draft: ['marks-class-studio:draft:v3', 'marks-class-studio:draft:v2'],
  library: ['marks-class-studio:library:v3', 'marks-class-studio:library:v2'],
  history: ['marks-class-studio:history:v3', 'marks-class-studio:history:v2'],
  images: ['marks-class-studio:image-bank:v3']
};
const MAX_HISTORY = 35;
const MAX_LIBRARY = 160;
const MAX_IMAGE_BANK = 50;

const nowIso = () => new Date().toISOString();
const newId = () => crypto.randomUUID();
const escapeHtml = (value: string) => value.replace(/[&<>'"]/g, char => ({ '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;' }[char] || char));
const compactJson=(value:unknown)=>JSON.stringify(value,(key,val)=>key==='logoDataUrl'&&val===defaultSchoolLogo?undefined:val);
const stripExtension = (name: string) => name.replace(/\.[^.]+$/, '');
const safeJson = <T>(value: string | null, fallback: T): T => { if (!value) return fallback; try { return JSON.parse(value) as T; } catch { return fallback; } };
const stripHtml = (html: string) => {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return (doc.body.textContent || '').replace(/\s+/g, ' ').trim();
};

const profileDefaults: Record<ComponentKind, { subject: string; grade: string; title: string }> = {
  english: { subject: 'Língua Inglesa', grade: '1º Ano EM', title: 'ATIVIDADE DE LÍNGUA INGLESA / 2026' },
  'life-project': { subject: 'Projeto de Vida', grade: '1º Ano EM', title: 'ATIVIDADE DE PROJETO DE VIDA / 2026' }
};

const blankPage = (orientation: Orientation = 'portrait', columns: 1|2|3 = 1, html = '<p><strong>1.</strong> Digite aqui a primeira questão da atividade.</p>'): PageData => ({ id: newId(), html, orientation, columns });

const blankActivity = (component: ComponentKind = 'english'): Activity => ({
  id: newId(),
  component,
  school: 'ESCOLA ESTADUAL IONE SILVEIRA MENDES',
  teacher: 'Adeilson Marks',
  subject: profileDefaults[component].subject,
  grade: profileDefaults[component].grade,
  title: profileDefaults[component].title,
  logoDataUrl: defaultSchoolLogo,
  personalLogoDataUrl: '',
  showPersonalLogo: true,
  showPageNumbers: true,
  margins: { top: 13, right: 14, bottom: 17, left: 14 },
  pages: [blankPage('portrait', 1, component === 'english'
    ? '<p><strong>1.</strong> Digite aqui a primeira questão da atividade.</p><p><strong>A)</strong> Alternativa A<br><strong>B)</strong> Alternativa B<br><strong>C)</strong> Alternativa C<br><strong>D)</strong> Alternativa D</p>'
    : '<p><strong>1.</strong> Digite aqui a primeira questão de Projeto de Vida.</p><p class="answer-lines">________________________________________________________________________________<br>________________________________________________________________________________</p>')],
  objects: [],
  answerKeyHtml: '',
  tags: [],
  collection: "activity",
  createdAt: nowIso(),
  updatedAt: nowIso()
});

const normalizePage = (raw: Partial<PageData>, fallbackHtml = ''): PageData => ({
  id: raw.id || newId(),
  html: typeof raw.html === 'string' ? raw.html : fallbackHtml,
  orientation: raw.orientation === 'landscape' ? 'landscape' : 'portrait',
  columns: raw.columns === 2 || raw.columns === 3 ? raw.columns : 1
});

const normalizeActivity = (raw: Partial<Activity>): Activity => {
  const component: ComponentKind = raw.component === 'life-project' ? 'life-project' : 'english';
  const base = blankActivity(component);
  const rawPages = Array.isArray(raw.pages) && raw.pages.length ? raw.pages : [normalizePage({}, typeof raw.content === 'string' ? raw.content : base.pages[0].html)];
  return {
    ...base,
    ...raw,
    component,
    collection: raw.collection || (raw.sourceName ? "both" : "activity"),
    id: raw.id || base.id,
    createdAt: raw.createdAt || base.createdAt,
    updatedAt: raw.updatedAt || base.updatedAt,
    margins: { ...base.margins, ...(raw.margins || {}) },
    pages: rawPages.map(p => normalizePage(p)),
    objects: Array.isArray(raw.objects) ? raw.objects.map(o => ({ ...o, pageId: o.pageId || rawPages[0]?.id || base.pages[0].id })) : [],
    tags: Array.isArray(raw.tags) ? raw.tags : [],
    logoDataUrl: raw.logoDataUrl || base.logoDataUrl,
    personalLogoDataUrl: raw.personalLogoDataUrl || '',
    showPersonalLogo: raw.showPersonalLogo !== false,
    showPageNumbers: raw.showPageNumbers !== false,
    answerKeyHtml: typeof raw.answerKeyHtml === 'string' ? raw.answerKeyHtml : ''
  };
};

const migrateOldData = () => {
  if (!localStorage.getItem(STORAGE_KEY)) {
    const key = OLD_KEYS.draft.find(k => localStorage.getItem(k));
    if (key) localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizeActivity(safeJson(localStorage.getItem(key), {}))));
  }
  if (!localStorage.getItem(LIBRARY_KEY)) {
    const key = OLD_KEYS.library.find(k => localStorage.getItem(k));
    if (key) localStorage.setItem(LIBRARY_KEY, JSON.stringify(safeJson<any[]>(localStorage.getItem(key), []).map(normalizeActivity)));
  }
  if (!localStorage.getItem(HISTORY_KEY)) {
    const key = OLD_KEYS.history.find(k => localStorage.getItem(k));
    if (key) {
      const items = safeJson<any[]>(localStorage.getItem(key), []).map(i => ({ ...i, activity: normalizeActivity(i.activity || {}) }));
      localStorage.setItem(HISTORY_KEY, JSON.stringify(items));
    }
  }
  if (!localStorage.getItem(IMAGE_BANK_KEY)) {
    const key = OLD_KEYS.images.find(k => localStorage.getItem(k));
    if (key) localStorage.setItem(IMAGE_BANK_KEY, localStorage.getItem(key) || '[]');
  }
};
migrateOldData();

const loadLocal = () => normalizeActivity(safeJson(localStorage.getItem(STORAGE_KEY), {}));
const getLibrary = (): Activity[] => safeJson<any[]>(localStorage.getItem(LIBRARY_KEY), []).map(normalizeActivity);
const setLibrary = (items: Activity[]) => { localStorage.setItem(LIBRARY_KEY, compactJson(items)); };
const getHistory = (): HistoryItem[] => safeJson<any[]>(localStorage.getItem(HISTORY_KEY), []).map(i => ({ ...i, activity: normalizeActivity(i.activity || {}) }));
const setHistory = (items: HistoryItem[]) => { try { localStorage.setItem(HISTORY_KEY, compactJson(items.slice(0, MAX_HISTORY))); } catch {} };
const getImageBank = (): ImageBankItem[] => safeJson(localStorage.getItem(IMAGE_BANK_KEY), []);
const setImageBank = (items: ImageBankItem[]) => { try { localStorage.setItem(IMAGE_BANK_KEY, JSON.stringify(items.slice(0, MAX_IMAGE_BANK))); } catch {} };

let activity = loadLocal();
let activePageId = activity.pages[0]?.id || '';
let selectedObjectId: string | null = null;
let saveTimer: number | undefined;
let toastTimer: number | undefined;
let importBusy = false;
let activeRibbon = 'home';

const app = document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML = `
<div class="app-shell">
  <header class="topbar">
    <div class="brand"><span class="brand-mark">MC</span><div><strong>Marks Class Studio</strong><small>Editor inteligente de atividades • V5</small></div></div>
    <span id="saveStatus" class="status saved">Salvo localmente</span>
    <div class="top-actions">
      <button class="btn" id="toggleSidebar" type="button">☰ Painel</button><button class="btn ghost" id="previewBtn" type="button">Visualizar</button>
      <button class="btn primary" id="pdfMenuBtn" type="button">Gerar PDF ▾</button>
      <button class="btn" id="shareBtn" type="button">Compartilhar</button>
    </div>
  </header>

  <div class="workspace">
    <aside class="sidebar">
      <div class="sidebar-title"><h3>Documento</h3><button class="mini primary-mini" id="newActivityBtn" type="button">＋ Nova</button></div>
      <details id="documentSettings" class="details-box"><summary>Configurações do documento</summary>
      <div class="field"><label>Componente</label><select id="componentInput"><option value="english">Língua Inglesa</option><option value="life-project">Projeto de Vida</option></select></div>
      <div class="field"><label>Escola</label><input id="schoolInput" /></div>
      <div class="field"><label>Professor</label><input id="teacherInput" /></div>
      <div class="field"><label>Disciplina</label><input id="subjectInput" /></div>
      <div class="field"><label>Série / turma</label><input id="gradeInput" /></div>
      <div class="field"><label>Título do cabeçalho</label><input id="titleInput" /></div>
      <div class="field"><label>Logo da escola</label><input id="logoInput" type="file" accept="image/*" /></div>
      <div class="field"><label>Minha logo (última página)</label><input id="personalLogoInput" type="file" accept="image/*" /></div>
      <label class="check-line"><input id="showPersonalLogo" type="checkbox" /> Mostrar minha logo na última página</label>
      <label class="check-line"><input id="originalLayout" type="checkbox" /> Preservar cabeçalho/rodapé importado (sem acrescentar padrão)</label><label class="check-line"><input id="showPageNumbers" type="checkbox" /> Numerar páginas no centro</label>

      </details>
      <div class="import-zone">
        <strong>Importação inteligente</strong>
        <span>PDF/DOCX → páginas editáveis, orientação e colunas.</span>
        <label>Modo<select id="importMode"><option value="original">Reproduzir original</option><option value="adapt">Adaptar ao meu padrão</option><option value="content">Somente conteúdo</option></select></label><label>Destino<select id="importDestination"><option value="activity">Minhas Atividades</option><option value="reference">Biblioteca de Referências</option><option value="both">Ambos</option></select></label><label class="check-line compact"><input id="smartImport" type="checkbox" /> Remontar com IA (modo adaptar)</label>
        <input id="fileInput" type="file" accept=".pdf,.doc,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" multiple />
        <small id="importStatus">Nenhum arquivo importado.</small>
      </div>

      <nav class="side-menu">
        <button id="myActivitiesBtn" type="button"><span>📁 Minhas Atividades</span><b>›</b></button>
        <button id="libraryBtn" type="button"><span>📚 Biblioteca de Referências</span><b>›</b></button>
        <button id="modelsBtn" type="button"><span>🧩 Modelos</span><b>›</b></button>
        <button id="imageBankBtn" type="button"><span>🖼 Banco de imagens</span><b>›</b></button>
        <button id="aiBtn" type="button"><span>✨ Criar com IA</span><b>›</b></button>
        <button id="answerKeyBtn" type="button"><span>✓ Gabarito</span><b>›</b></button>
        <button id="historyBtn" type="button"><span>🕘 Histórico</span><b>›</b></button>
      </nav>
    </aside>

    <main class="main">
      <div class="editing-head"><div><strong>Documento multipágina A4</strong><span>Retrato/Paisagem, colunas e edição em tempo real.</span></div><span class="live-badge"><i></i> Prévia ao vivo</span></div>

      <div class="ribbon">
        <div class="ribbon-tabs">
          <button data-ribbon="file" type="button">Arquivo</button><button data-ribbon="home" class="active" type="button">Início</button>
          <button data-ribbon="insert" type="button">Inserir</button>
          <button data-ribbon="layout" type="button">Layout</button>
          <button data-ribbon="organize" type="button">Organizar</button>
          <button data-ribbon="models" type="button">Modelos</button>
          <button data-ribbon="ai" type="button">IA</button>
        </div>
        <div class="ribbon-panels">
          <section class="ribbon-panel" data-panel="file"><div class="tool-group"><small>Documento</small><div><button id="fileNew">Novo</button><button id="fileOpen">Abrir</button><button id="fileSave">Salvar</button><button id="fileSaveAs">Salvar como</button><button id="fileRename">Renomear</button><button id="filePdf">Exportar PDF</button><button id="fileHistory">Histórico</button></div></div></section>
          <section class="ribbon-panel active" data-panel="home">
            <div class="tool-group"><small>Fonte</small><div><select id="fontName"><option>Arial</option><option>Calibri</option><option>Times New Roman</option><option>Georgia</option><option>Verdana</option></select><select id="fontSize"><option value="2">10</option><option value="3" selected>12</option><option value="4">14</option><option value="5">18</option><option value="6">24</option></select></div></div>
            <div class="tool-group"><small>Estilo</small><div><button data-cmd="bold"><b>B</b></button><button data-cmd="italic"><i>I</i></button><button data-cmd="underline"><u>U</u></button><button data-cmd="strikeThrough"><s>S</s></button></div></div>
            <div class="tool-group"><small>Parágrafo</small><div><button data-cmd="justifyLeft">≡←</button><button data-cmd="justifyCenter">≡</button><button data-cmd="justifyRight">→≡</button><button data-cmd="justifyFull">☰</button><button data-cmd="insertUnorderedList">• Lista</button><button data-cmd="insertOrderedList">1. Lista</button><select id="lineHeight" title="Espaçamento entre linhas"><option value="0.5">0,5</option><option value="0.6">0,6</option><option value="0.7">0,7</option><option value="0.8">0,8</option><option value="0.9">0,9</option><option value="1" selected>1</option><option value="1.15">1,15</option><option value="1.5">1,5</option><option value="2">2</option><option value="custom">Personalizado</option></select><button id="paragraphSpacing">Antes/depois</button><button id="zeroSpacing">Sem espaço</button></div></div>
            <div class="tool-group"><small>Ações</small><div><button data-cmd="undo">↶</button><button data-cmd="redo">↷</button><button id="resetFormat">Arial 12</button></div></div>
          </section>
          <section class="ribbon-panel" data-panel="insert">
            <div class="tool-group"><small>Elementos</small><div><button id="insertImageBtn">🖼 Imagem</button><input id="editorImageInput" type="file" accept="image/*" hidden /><button id="insertTextboxBtn">▣ Caixa de texto</button><button id="insertAnswerLinesBtn">≣ Linhas de resposta</button><button id="insertTableBtn">▦ Tabela ▾</button><button id="editTableBtn">Editar tabela</button></div></div>
            <div class="tool-group"><small>Páginas</small><div><button id="addPageBtn">＋ Página</button><button id="duplicatePageBtn">⧉ Duplicar página</button><button id="deletePageBtn">🗑 Página</button></div></div>
          </section>
          <section class="ribbon-panel" data-panel="layout"><div class="tool-group"><small>Margens (mm)</small>      <div class="margin-grid">
        <label>Sup.<input id="marginTop" type="number" min="5" max="35" step="1" /></label>
        <label>Dir.<input id="marginRight" type="number" min="5" max="35" step="1" /></label>
        <label>Inf.<input id="marginBottom" type="number" min="5" max="35" step="1" /></label>
        <label>Esq.<input id="marginLeft" type="number" min="5" max="35" step="1" /></label>
      </div>

</div><div class="tool-group"><small>Exibição</small><div><button id="toggleRuler">Régua</button></div></div>
            <div class="tool-group"><small>Orientação da página ativa</small><div><button id="portraitBtn">▯ Retrato</button><button id="landscapeBtn">▭ Paisagem</button></div></div>
            <div class="tool-group"><small>Aplicar a todas</small><div><button id="allPortraitBtn">Todas retrato</button><button id="allLandscapeBtn">Todas paisagem</button></div></div>
            <div class="tool-group"><small>Colunas da página</small><div><button data-page-cols="1">1 coluna</button><button data-page-cols="2">2 colunas</button><button data-page-cols="3">3 colunas</button></div></div>
            <div class="tool-group"><small>Colunas na seleção</small><div><button data-selection-cols="2">Seleção 2 col.</button><button data-selection-cols="3">Seleção 3 col.</button></div></div>
          </section>
          <section class="ribbon-panel" data-panel="organize">
            <div class="tool-group"><small>Ordenar seleção</small><div><button id="sortAzBtn">A → Z</button><button id="sortZaBtn">Z → A</button><button id="sortNumericBtn">1 → 9</button></div></div>
            <div class="tool-group"><small>Objetos</small><div><button id="bringFrontBtn">Trazer à frente</button><button id="deleteObjectBtn">Excluir objeto</button></div></div>
          </section>
          <section class="ribbon-panel" data-panel="models"><div class="tool-group"><small>Modelos pessoais</small><div><button id="openModelsRibbonBtn">Abrir modelos</button><button id="saveLayoutModelBtn">Salvar layout atual</button></div></div></section>
          <section class="ribbon-panel" data-panel="ai"><div class="tool-group"><small>Assistente</small><div><button id="openAiRibbonBtn">✨ Criar atividade</button><button id="aiRewriteBtn">Melhorar seleção</button><button id="aiSimilarBtn">Criar semelhante</button></div></div></section>
        </div>
      </div>

      <div class="ruler-shell"><div class="ruler-label">Recuos</div><div class="ruler" id="ruler"><div id="rulerTicks" class="ruler-ticks"></div><button id="leftMarginHandle" title="Recuo esquerdo dos parágrafos" class="margin-handle left-handle" type="button">▲</button><button id="rightMarginHandle" title="Recuo direito dos parágrafos" class="margin-handle right-handle" type="button">▲</button><button id="firstLineHandle" title="Recuo da primeira linha" class="margin-handle first-handle" type="button">▼</button></div></div>

      <div class="document-wrap" id="documentWrap"><div id="pagesMount" class="pages-mount"></div><div class="hint">Clique em uma página para ativá-la. Retrato e Paisagem podem coexistir no mesmo documento.</div></div>
    </main>
  </div>
</div>
<div id="toast" class="toast" role="status" aria-live="polite"></div>

<dialog id="previewDialog" class="modal preview-modal"><div class="modal-head"><div><strong>Prévia</strong><small>Documento atual</small></div><button data-close="previewDialog">✕</button></div><div class="preview-stage"><div id="previewMount"></div></div><div class="modal-actions"><button class="btn" data-close="previewDialog">Voltar</button><button class="btn primary" id="printBtn">Imprimir</button></div></dialog>

<dialog id="libraryDialog" class="modal"><div class="modal-head"><div><strong id="libraryHeading">Biblioteca de Referências</strong><small id="librarySubtitle">Exemplos para a IA</small></div><button data-close="libraryDialog">✕</button></div><div class="library-tools"><input id="librarySearch" placeholder="Pesquisar título, série ou disciplina" /><select id="libraryComponentFilter"><option value="all">Todos</option><option value="english">Língua Inglesa</option><option value="life-project">Projeto de Vida</option></select></div><div id="libraryList" class="card-list"></div><div class="modal-actions"><button class="btn" data-close="libraryDialog">Fechar</button></div></dialog>

<dialog id="tableDialog" class="modal small-modal"><div class="modal-head"><strong>Inserir tabela</strong><button data-close="tableDialog">✕</button></div><form id="tableForm" class="ai-form"><div class="form-row"><label>Linhas<input id="tableRows" type="number" min="1" max="200" value="4" required></label><label>Colunas<input id="tableCols" type="number" min="1" max="50" value="3" required></label></div><button class="btn primary" type="submit">Inserir</button></form></dialog>
<dialog id="tableEditDialog" class="modal small-modal"><div class="modal-head"><strong>Editar tabela</strong><button data-close="tableEditDialog">✕</button></div><div class="ai-form"><div class="table-actions"><button data-table-action="row+">Adicionar linha</button><button data-table-action="row-">Excluir linha</button><button data-table-action="col+">Adicionar coluna</button><button data-table-action="col-">Excluir coluna</button><button data-table-action="merge">Mesclar com célula à direita</button><button data-table-action="split">Dividir célula</button><button data-table-action="border">Bordas / sem bordas</button><button data-table-action="borderstyle">Estilo das bordas</button><button data-table-action="halign">Alinhamento horizontal</button><button data-table-action="width">Largura da coluna</button><button data-table-action="height">Altura da linha</button><button data-table-action="fill">Cor da célula</button><button data-table-action="valign">Alinhamento vertical</button><button data-table-action="delete">Excluir tabela</button></div></div></dialog>
<dialog id="modelsDialog" class="modal"><div class="modal-head"><div><strong>Modelos</strong><small>Estruturas prontas e layouts salvos</small></div><button data-close="modelsDialog">✕</button></div><div id="modelsList" class="model-grid"></div><div class="modal-actions"><button class="btn" data-close="modelsDialog">Fechar</button></div></dialog>

<dialog id="imageBankDialog" class="modal wide-modal"><div class="modal-head"><div><strong>Banco de imagens</strong><small>Imagens reutilizáveis</small></div><button data-close="imageBankDialog">✕</button></div><div class="image-bank-tools"><input id="imageBankUpload" type="file" accept="image/*" multiple /><div class="web-image-search"><input id="webImageQuery" placeholder="Tema para pesquisar imagens" /><button id="openGoogleImagesBtn" class="btn">Pesquisar no Google Imagens</button></div></div><div id="imageBankList" class="image-grid"></div><div class="modal-actions"><button class="btn" data-close="imageBankDialog">Fechar</button></div></dialog>

<dialog id="aiDialog" class="modal wide-modal"><div class="modal-head"><div><strong>Criar com IA</strong><small>Configuração completa do formato</small></div><button data-close="aiDialog">✕</button></div><form id="aiForm" class="ai-form">
  <div class="form-row"><label>Componente<select id="aiComponent"><option value="english">Língua Inglesa</option><option value="life-project">Projeto de Vida</option></select></label><label>Série / turma<input id="aiGrade" /></label></div>
  <label>Tema / conteúdo<input id="aiTopic" required placeholder="Ex.: Simple Past, escolhas e planejamento..." /></label>
  <div class="form-row"><label>Quantidade de questões<input id="aiQuestionCount" type="number" min="1" max="40" value="8" /></label><label>Tipo<select id="aiQuestionType"><option value="mista">Mista</option><option value="objetiva">Objetiva</option><option value="aberta">Aberta</option></select></label></div>
  <div class="form-row"><label>Nº de páginas<select id="aiPages"><option value="1">1</option><option value="2" selected>2</option><option value="3">3</option><option value="4">4</option></select></label><label>Orientação<select id="aiOrientation"><option value="portrait">Retrato</option><option value="landscape">Paisagem</option></select></label></div>
  <div class="form-row"><label>Colunas<select id="aiColumns"><option value="1">1 coluna</option><option value="2">2 colunas</option><option value="3">3 colunas</option></select></label><label>Modelo<select id="aiStyleModel"><option value="current">Usar layout atual</option><option value="library">Inspirar em atividade da biblioteca</option><option value="clean">Modelo limpo</option></select></label></div>
  <label>Orientações adicionais<textarea id="aiNotes" rows="4" placeholder="Habilidade, dificuldade, texto de apoio, imagens, estilo desejado..."></textarea></label>
  <label class="check-line"><input id="aiUseLibrary" type="checkbox" checked /> Usar minhas atividades semelhantes como referência</label>
  <label class="check-line"><input id="aiIncludeKey" type="checkbox" checked /> Gerar gabarito automaticamente</label>
  <div id="aiStatus" class="ai-status">Configure OPENAI_API_KEY no Netlify para ativar a IA.</div><button class="btn primary" id="aiGenerateBtn" type="submit">Gerar atividade</button>
</form></dialog>

<dialog id="answerKeyDialog" class="modal wide-modal"><div class="modal-head"><div><strong>Gabarito do professor</strong><small>Não aparece no PDF normal da atividade</small></div><button data-close="answerKeyDialog">✕</button></div><textarea id="answerKeyEditor" class="answer-key-editor" rows="16" placeholder="1. C\n2. A\n3. Resposta esperada..."></textarea><div class="modal-actions"><button class="btn" data-close="answerKeyDialog">Cancelar</button><button class="btn primary" id="saveAnswerKeyBtn">Salvar gabarito</button></div></dialog>

<dialog id="pdfDialog" class="modal small-modal"><div class="modal-head"><div><strong>Gerar PDF</strong><small>Escolha a saída</small></div><button data-close="pdfDialog">✕</button></div><div class="pdf-options"><button data-pdf-mode="activity">📄 Atividade</button><button data-pdf-mode="activity-key">📄 Atividade + gabarito</button><button data-pdf-mode="key">✓ Somente gabarito</button></div></dialog>

<dialog id="historyDialog" class="modal"><div class="modal-head"><div><strong>Histórico</strong><small>Restaure uma versão anterior</small></div><button data-close="historyDialog">✕</button></div><div id="historyList" class="card-list"></div><div class="modal-actions"><button class="btn" data-close="historyDialog">Fechar</button></div></dialog>
`;

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const status = $('saveStatus');
const pagesMount = $<HTMLDivElement>('pagesMount');
const inputs = {
  component: $<HTMLSelectElement>('componentInput'), school: $<HTMLInputElement>('schoolInput'), teacher: $<HTMLInputElement>('teacherInput'), subject: $<HTMLInputElement>('subjectInput'), grade: $<HTMLInputElement>('gradeInput'), title: $<HTMLInputElement>('titleInput')
};
const marginInputs = { top: $<HTMLInputElement>('marginTop'), right: $<HTMLInputElement>('marginRight'), bottom: $<HTMLInputElement>('marginBottom'), left: $<HTMLInputElement>('marginLeft') };

const toast = (message: string) => { const el = $('toast'); window.clearTimeout(toastTimer); el.textContent = message; el.classList.add('show'); toastTimer = window.setTimeout(() => el.classList.remove('show'), 2800); };
const showDialog = (id: string) => { const d = $<HTMLDialogElement>(id); if (typeof d.showModal === 'function') d.showModal(); else d.setAttribute('open',''); };
const closeDialog = (id: string) => { const d = $<HTMLDialogElement>(id); if (typeof d.close === 'function') d.close(); else d.removeAttribute('open'); };
document.querySelectorAll<HTMLElement>('[data-close]').forEach(btn => btn.addEventListener('click', () => closeDialog(btn.dataset.close || '')));

const sanitizeImportedHtml = (html: string) => {
  const doc = new DOMParser().parseFromString(`<div id="safe-root">${html}</div>`, 'text/html');
  const root = doc.getElementById('safe-root')!;
  root.querySelectorAll('script,style,iframe,object,embed,form,input,button,textarea,select').forEach(el => el.remove());
  root.querySelectorAll<HTMLElement>('*').forEach(el => [...el.attributes].forEach(attr => {
    const name = attr.name.toLowerCase(); const value = attr.value.trim().toLowerCase();
    if (name.startsWith('on') || (['href','src'].includes(name) && value.startsWith('javascript:'))) el.removeAttribute(attr.name);
  }));
  return root.innerHTML;
};

const activePage = () => activity.pages.find(p => p.id === activePageId) || activity.pages[0];
const pageDims = (orientation: Orientation) => orientation === 'landscape' ? { width: 297, height: 210 } : { width: 210, height: 297 };
const profileLabels = () => activity.component === 'english'
  ? { teacher:'Teacher:', subject:'Subject:', grade:'Grade/Class:', student:'Student:' }
  : { teacher:'Professor(a):', subject:'Componente:', grade:'Turma:', student:'Aluno(a):' };

const renderSidebar = () => {
  inputs.component.value = activity.component; inputs.school.value = activity.school; inputs.teacher.value = activity.teacher; inputs.subject.value = activity.subject; inputs.grade.value = activity.grade; inputs.title.value = activity.title;
  marginInputs.top.value = String(activity.margins.top); marginInputs.right.value = String(activity.margins.right); marginInputs.bottom.value = String(activity.margins.bottom); marginInputs.left.value = String(activity.margins.left);
  $<HTMLInputElement>('originalLayout').checked=!!activity.originalLayout;
  $<HTMLInputElement>('showPersonalLogo').checked = activity.showPersonalLogo;
  $<HTMLInputElement>('showPageNumbers').checked = activity.showPageNumbers;
};

const selectObject=(id:string|null)=>{selectedObjectId=id;pagesMount.querySelectorAll<HTMLElement>('.floating-object').forEach(el=>el.classList.toggle('selected',el.dataset.id===id));};
const renderFloatingObjects = (pageEl: HTMLElement, pageId: string) => {
  const layer = pageEl.querySelector<HTMLElement>('.floating-layer')!;
  const pageData = activity.pages.find(p => p.id === pageId)!;
  const dims = pageDims(pageData.orientation);
  layer.innerHTML = '';
  activity.objects.filter(o => o.pageId === pageId).sort((a,b)=>a.z-b.z).forEach(obj => {
    const item = document.createElement('div');
    item.className = `floating-object ${obj.type}${selectedObjectId === obj.id ? ' selected' : ''}`;
    item.dataset.id = obj.id; item.style.left = `${obj.x}mm`; item.style.top = `${obj.y}mm`; item.style.width = `${obj.width}mm`; item.style.height = `${obj.height}mm`; item.style.zIndex = String(obj.z);
    if (obj.type === 'image') item.innerHTML = `<img src="${obj.src || ''}" alt="Imagem inserida"><div class="object-controls"><button data-drag>✥</button><button data-front>↑</button><button data-delete>✕</button></div><span class="resize-handle"></span>`;
    else item.innerHTML = `<div class="textbox-content" contenteditable="true" spellcheck="true">${obj.html || ''}</div><div class="object-controls"><button data-drag>✥</button><button data-border>${obj.border ? '□' : '▢'}</button><button data-front>↑</button><button data-delete>✕</button></div><span class="resize-handle"></span>`;
    item.addEventListener('pointerdown', () => { selectObject(obj.id); });
    item.querySelectorAll('button,.resize-handle').forEach(el=>el.addEventListener('pointerdown',e=>{selectObject(obj.id);e.stopPropagation();}));
    item.querySelector<HTMLElement>('[data-drag]')?.addEventListener('pointerdown', e => startObjectDrag(e, obj.id, pageEl, dims.width, dims.height));
    item.querySelector<HTMLElement>('.resize-handle')?.addEventListener('pointerdown', e => startObjectResize(e, obj.id, pageEl, dims.width, dims.height));
    item.querySelector<HTMLButtonElement>('[data-front]')?.addEventListener('click', e => { e.stopPropagation(); obj.z = Math.max(0,...activity.objects.map(o=>o.z))+1; renderPages(); scheduleSave(); });
    item.querySelector<HTMLButtonElement>('[data-delete]')?.addEventListener('click', e => { e.stopPropagation(); activity.objects = activity.objects.filter(o=>o.id!==obj.id); selectedObjectId = null; renderPages(); scheduleSave(); });
    item.querySelector<HTMLButtonElement>('[data-border]')?.addEventListener('click', e => { e.stopPropagation(); obj.border = !obj.border; renderPages(); scheduleSave(); });
    const text = item.querySelector<HTMLElement>('.textbox-content'); if (text) { text.style.border = obj.border ? '1px solid #111827' : '1px solid transparent'; text.addEventListener('input', () => { obj.html = text.innerHTML; scheduleSave('typing'); }); }
    layer.appendChild(item);
  });
};

const headerHtml = () => {
  const labels = profileLabels();
  return `<div class="school-head"><img class="logo" src="${activity.logoDataUrl || defaultSchoolLogo}" alt="Logo da escola"><div class="school-name editable-header" data-header="school" contenteditable="true">${escapeHtml(activity.school)}</div><div class="header-title editable-header" data-header="title" contenteditable="true">${escapeHtml(activity.title)}</div></div>
  <div class="meta"><div><strong>${labels.teacher}</strong> <span class="editable-header" data-header="teacher" contenteditable="true">${escapeHtml(activity.teacher)}</span></div><div><strong>${labels.grade}</strong> <span class="editable-header" data-header="grade" contenteditable="true">${escapeHtml(activity.grade)}</span></div><div><strong>${labels.subject}</strong> <span class="editable-header" data-header="subject" contenteditable="true">${escapeHtml(activity.subject)}</span></div><div class="full"><strong>${labels.student}</strong> <span class="student-line"></span></div></div>`;
};

const renderPages = () => {
  if (!activity.pages.length) activity.pages = [blankPage()];
  if (!activity.pages.some(p => p.id === activePageId)) activePageId = activity.pages[0].id;
  savedRange=null;
  pagesMount.innerHTML = '';
  activity.pages.forEach((p, index) => {
    const dims = pageDims(p.orientation);
    const page = document.createElement('section');
    page.className = `page ${p.orientation}${p.id === activePageId ? ' active-page' : ''}`;
    page.dataset.pageId = p.id;
    page.style.setProperty('--page-width', `${dims.width}mm`); page.style.setProperty('--page-height', `${dims.height}mm`);
    page.style.setProperty('--page-margin-top', `${activity.margins.top}mm`); page.style.setProperty('--page-margin-right', `${activity.margins.right}mm`); page.style.setProperty('--page-margin-bottom', `${activity.margins.bottom}mm`); page.style.setProperty('--page-margin-left', `${activity.margins.left}mm`);
    const isFirst = index === 0; const isLast = index === activity.pages.length - 1;
    page.innerHTML = `<div class="page-flow">${isFirst && !activity.originalLayout ? headerHtml() : ''}<div class="editor cols-${p.columns}" data-editor-page="${p.id}" contenteditable="true" spellcheck="true">${p.html}</div></div><div class="floating-layer"></div>${activity.showPageNumbers && !activity.originalLayout ? `<div class="page-number">${index+1}</div>` : ''}${isLast && !activity.originalLayout && activity.showPersonalLogo && activity.personalLogoDataUrl ? `<img class="personal-logo" src="${activity.personalLogoDataUrl}" alt="Logo do professor">` : ''}`;
    page.addEventListener('pointerdown', () => { activePageId = p.id; document.querySelectorAll('.page').forEach(x=>x.classList.remove('active-page')); page.classList.add('active-page'); updateRulerHandles(); });
    page.querySelectorAll<HTMLElement>('.editable-header').forEach(el => el.addEventListener('input', () => {
      const key = el.dataset.header as 'school'|'teacher'|'subject'|'grade'|'title'; if (!key) return; (activity as any)[key] = el.textContent?.trim() || ''; renderSidebar(); scheduleSave();
    }));
    const editor = page.querySelector<HTMLDivElement>('[data-editor-page]')!;
    editor.addEventListener('focus', () => { activePageId = p.id; selectObject(null); });
    editor.addEventListener('input', () => { p.html = editor.innerHTML; scheduleSave('typing'); if(!activity.originalLayout)window.setTimeout(() => rebalanceOverflow(p.id), 0); });
    editor.addEventListener('paste', event => {
      const imageFile = [...(event.clipboardData?.files || [])].find(f=>f.type.startsWith('image/')); if (!imageFile) return; event.preventDefault(); void fileToDataUrl(imageFile).then(src=>addFloatingImage(src, imageFile.name || 'Imagem colada', p.id));
    });
    page.addEventListener('dragover', e => { if (e.dataTransfer?.types.includes('Files')) { e.preventDefault(); page.classList.add('drop-target'); } });
    page.addEventListener('dragleave', ()=>page.classList.remove('drop-target'));
    page.addEventListener('drop', e => { page.classList.remove('drop-target'); const image = [...(e.dataTransfer?.files || [])].find(f=>f.type.startsWith('image/')); if (!image) return; e.preventDefault(); void fileToDataUrl(image).then(src=>addFloatingImage(src,image.name,p.id)); });
    pagesMount.appendChild(page);
    renderFloatingObjects(page, p.id);
  });
  fitEditorHeights();
  updateRulerHandles();
};

const fitEditorHeights = () => {
  pagesMount.querySelectorAll<HTMLElement>('.page').forEach(pageEl => {
    const flow = pageEl.querySelector<HTMLElement>('.page-flow');
    const ed = pageEl.querySelector<HTMLElement>('.editor');
    if (!flow || !ed) return;
    const bottom = parseFloat(getComputedStyle(flow).paddingBottom || '0');
    const available = Math.max(80, flow.clientHeight - ed.offsetTop - bottom - 4);
    ed.style.height = `${available}px`;
    ed.style.maxHeight = `${available}px`;
    ed.style.overflow = 'hidden';
  });
};

const rebalanceOverflow = (pageId: string) => {
  const start = activity.pages.findIndex(p => p.id === pageId);
  if (start < 0) return;
  let changed = false;
  for (let i = start; i < activity.pages.length; i++) {
    const p = activity.pages[i];
    const ed = pagesMount.querySelector<HTMLDivElement>(`[data-editor-page="${CSS.escape(p.id)}"]`);
    if (!ed) continue;
    let safety = 0;
    while (ed.scrollHeight > ed.clientHeight + 3 && ed.lastChild && safety++ < 40) {
      const node = ed.lastChild;
      if (!node || ed.childNodes.length<2) break;
      if (!activity.pages[i + 1]) activity.pages.push(blankPage(p.orientation, p.columns, '<p><br></p>'));
      const next = activity.pages[i + 1];
      const holder = document.createElement('div');
      holder.appendChild(node.cloneNode(true));
      node.remove();
      const clean = next.html.replace(/^\s*<p><br\s*\/?><\/p>\s*/i, '');
      next.html = holder.innerHTML + clean;
      p.html = ed.innerHTML;
      changed = true;
    }
  }
  if (changed) {
    renderPages();
    scheduleSave();
    toast('Conteúdo redistribuído automaticamente entre as páginas.');
  }
};

window.addEventListener('resize', () => fitEditorHeights());

const render = () => { renderSidebar(); renderPages(); renderPreview(); };
const renderPreview = () => {
  const mount = $('previewMount'); if (!mount) return; mount.innerHTML = '';
  activity.pages.forEach((_,i) => { const source = pagesMount.children[i] as HTMLElement | undefined; if (!source) return; const clone = source.cloneNode(true) as HTMLElement; clone.classList.remove('active-page'); clone.querySelectorAll('[contenteditable]').forEach(el=>el.removeAttribute('contenteditable')); clone.querySelectorAll('.object-controls,.resize-handle').forEach(el=>el.remove()); clone.querySelectorAll('.selected').forEach(el=>el.classList.remove('selected')); mount.appendChild(clone); });
};

const upsertLocalLibrary = (item: Activity) => { const items = getLibrary().filter(x=>x.id!==item.id); items.unshift(structuredClone(item)); setLibrary(items); };
const addHistorySnapshot = (item: Activity) => {
  const list = getHistory(); const sig = JSON.stringify({title:item.title,pages:item.pages,objects:item.objects,margins:item.margins,answerKeyHtml:item.answerKeyHtml,logo:item.logoDataUrl,personal:item.personalLogoDataUrl});
  const first = list.find(x=>x.activity.id===item.id); const firstSig = first ? JSON.stringify({title:first.activity.title,pages:first.activity.pages,objects:first.activity.objects,margins:first.activity.margins,answerKeyHtml:first.activity.answerKeyHtml,logo:first.activity.logoDataUrl,personal:first.activity.personalLogoDataUrl}) : '';
  if (sig === firstSig) return; list.unshift({ id:newId(), savedAt:nowIso(), activity:structuredClone(item) }); setHistory(list);
};
const saveRemote = async (payload: Activity) => { try { const r=await fetch('/.netlify/functions/save-activity',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)}); return r.ok; } catch { return false; } };
const undoStack:Activity[]=[];const redoStack:Activity[]=[];let undoBase=structuredClone(activity);let lastEdit=0;let lastEditKind='';
const signature=(a:Activity)=>JSON.stringify({...a,updatedAt:'',content:''});
function recordEdit(kind='action'){if(undoBase.id!==activity.id){undoStack.length=0;redoStack.length=0;undoBase=structuredClone(activity);lastEditKind='';return;}if(signature(undoBase)===signature(activity))return;const now=Date.now();if(kind!=='typing'||lastEditKind!=='typing'||now-lastEdit>650){undoStack.push(undoBase);if(undoStack.length>40)undoStack.shift();}redoStack.length=0;undoBase=structuredClone(activity);lastEdit=now;lastEditKind=kind;}
let remoteQueue=Promise.resolve();
const pendingKey='marks-class-studio:pending:v5';
const pending=()=>safeJson<string[]>(localStorage.getItem(pendingKey),[]);
function markPending(id:string,on:boolean){try{const ids=new Set(pending());on?ids.add(id):ids.delete(id);localStorage.setItem(pendingKey,JSON.stringify([...ids]));}catch{}}
function saveLocal(){activity.updatedAt=nowIso();activity.content=activity.pages.map(p=>p.html).join('<hr class="soft-break">');try{localStorage.setItem(STORAGE_KEY,compactJson(activity));upsertLocalLibrary(activity);markPending(activity.id,true);return true;}catch{status.textContent='Armazenamento local cheio';toast('Armazenamento local cheio. Não feche antes de sincronizar.');return false;}}
const persist = async () => {window.clearTimeout(saveTimer);const localOk=saveLocal();const snapshot=structuredClone(activity);addHistorySnapshot(snapshot);status.textContent=localOk?'Salvo localmente':'Aguardando nuvem';status.className='status saved';if(navigator.onLine){remoteQueue=remoteQueue.catch(()=>{}).then(async()=>{const ok=await saveRemote(snapshot);if(ok){const latest=getLibrary().find(i=>i.id===snapshot.id);if(!latest||latest.updatedAt<=snapshot.updatedAt)markPending(snapshot.id,false);}if(activity.id===snapshot.id&&activity.updatedAt===snapshot.updatedAt){status.textContent=ok?'Sincronizado':localOk?'Salvo localmente — nuvem pendente':'Falha ao salvar';status.className=ok?'status synced':'status saved';}});await remoteQueue;}renderPreview();};
function scheduleSave(kind='action'){recordEdit(kind);const ok=saveLocal();if(ok){status.textContent='Salvo localmente • sincronizando';status.className='status saving';}window.clearTimeout(saveTimer);saveTimer=window.setTimeout(()=>void persist(),700);}
function undoRedo(redo=false){const from=redo?redoStack:undoStack,to=redo?undoStack:redoStack;if(!from.length){toast(redo?'Nada para refazer.':'Nada para desfazer.');return;}to.push(structuredClone(activity));activity=from.pop()!;undoBase=structuredClone(activity);lastEditKind='';selectedObjectId=null;activePageId=activity.pages.find(p=>p.id===activePageId)?.id||activity.pages[0].id;render();scheduleSave();}

Object.values(inputs).forEach(input => { if (input===inputs.component) return; input.addEventListener('input',()=>{ activity.school=inputs.school.value; activity.teacher=inputs.teacher.value; activity.subject=inputs.subject.value; activity.grade=inputs.grade.value; activity.title=inputs.title.value; renderPages(); scheduleSave(); }); });
inputs.component.addEventListener('change',()=>{ const prev=activity.component; const next=inputs.component.value as ComponentKind; activity.component=next; if(activity.subject===profileDefaults[prev].subject) activity.subject=profileDefaults[next].subject; if(activity.title===profileDefaults[prev].title) activity.title=profileDefaults[next].title; render(); scheduleSave(); });
const clampMargin=(v:number)=>Math.min(35,Math.max(5,Number.isFinite(v)?v:14));
Object.entries(marginInputs).forEach(([key,input])=>input.addEventListener('input',()=>{ activity.margins[key as keyof Margins]=clampMargin(Number(input.value)); renderPages(); scheduleSave(); }));
$<HTMLInputElement>('originalLayout').addEventListener('change',e=>{activity.originalLayout=(e.target as HTMLInputElement).checked;renderPages();scheduleSave();});
$<HTMLInputElement>('showPersonalLogo').addEventListener('change',e=>{activity.showPersonalLogo=(e.target as HTMLInputElement).checked;renderPages();scheduleSave();});
$<HTMLInputElement>('showPageNumbers').addEventListener('change',e=>{activity.showPageNumbers=(e.target as HTMLInputElement).checked;renderPages();scheduleSave();});

const fileToDataUrl = (file: File) => new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result||''));reader.onerror=()=>reject(reader.error||new Error('Falha ao ler arquivo.'));reader.readAsDataURL(file);});
$<HTMLInputElement>('logoInput').addEventListener('change',async e=>{const f=(e.target as HTMLInputElement).files?.[0];if(!f)return;activity.logoDataUrl=await fileToDataUrl(f);renderPages();scheduleSave();});
$<HTMLInputElement>('personalLogoInput').addEventListener('change',async e=>{const f=(e.target as HTMLInputElement).files?.[0];if(!f)return;activity.personalLogoDataUrl=await fileToDataUrl(f);activity.showPersonalLogo=true;render();scheduleSave();});

const activeEditor = () => pagesMount.querySelector<HTMLDivElement>(`[data-editor-page="${CSS.escape(activePageId)}"]`);
let savedRange:Range|null=null;
function captureRange(){const sel=window.getSelection();if(!sel?.rangeCount)return;const range=sel.getRangeAt(0);const node=range.commonAncestorContainer;const ed=(node instanceof Element?node:node.parentElement)?.closest<HTMLElement>('[data-editor-page]');if(ed&&pagesMount.contains(ed)){savedRange=range.cloneRange();activePageId=ed.dataset.editorPage||activePageId;}}
function restoreRange(){const ed=activeEditor();if(!ed)return;const range=savedRange?.cloneRange();ed.focus({preventScroll:true});if(range&&ed.contains(range.commonAncestorContainer)){const sel=window.getSelection();sel?.removeAllRanges();sel?.addRange(range);savedRange=range;} }
document.addEventListener('selectionchange',()=>{captureRange();updateRulerHandles();});
document.querySelectorAll<HTMLButtonElement>('.ribbon button').forEach(b=>b.addEventListener('pointerdown',e=>{captureRange();e.preventDefault();}));
document.querySelectorAll<HTMLSelectElement>('.ribbon select').forEach(b=>b.addEventListener('pointerdown',captureRange));
const execCmd = (cmd:string,value?:string) => {if(cmd==='undo'||cmd==='redo'){undoRedo(cmd==='redo');return;}const ed=activeEditor(); if(!ed)return;restoreRange();document.execCommand(cmd,false,value); const p=activePage(); if(p) p.html=ed.innerHTML;captureRange();scheduleSave();};
document.querySelectorAll<HTMLButtonElement>('[data-cmd]').forEach(btn=>btn.addEventListener('click',()=>execCmd(btn.dataset.cmd||'')));
$<HTMLSelectElement>('fontName').addEventListener('change',e=>execCmd('fontName',(e.target as HTMLSelectElement).value));
$<HTMLSelectElement>('fontSize').addEventListener('change',e=>execCmd('fontSize',(e.target as HTMLSelectElement).value));
function selectedBlocks():HTMLElement[]{const ed=activeEditor();if(!ed)return[];const range=savedRange;if(!range||!ed.contains(range.commonAncestorContainer))return[];const selector='p,li,h1,h2,h3,h4,blockquote,td,th,div:not(.column-section)';const node=range.startContainer;const parent=(node instanceof Element?node:node.parentElement)?.closest<HTMLElement>(selector);if(range.collapsed)return parent&&parent!==ed&&ed.contains(parent)?[parent]:[];const matches=[...ed.querySelectorAll<HTMLElement>(selector)].filter(el=>range.intersectsNode(el));return matches.filter(el=>!matches.some(other=>other!==el&&el.contains(other)));}
function formatBlocks(style:(el:HTMLElement)=>void){restoreRange();let blocks=selectedBlocks();if(!blocks.length){const ed=activeEditor();if(!ed)return;document.execCommand('formatBlock',false,'p');captureRange();blocks=selectedBlocks();}if(!blocks.length){toast('Selecione um parágrafo ou posicione o cursor.');return;}blocks.forEach(style);const ed=activeEditor();if(ed)activePage().html=ed.innerHTML;scheduleSave();updateRulerHandles();}
$<HTMLSelectElement>('lineHeight').addEventListener('change',e=>{let v=(e.target as HTMLSelectElement).value;if(v==='custom')v=prompt('Espaçamento entre linhas (0,5 a 4):','0,8')||'';const n=Number(v.replace(',','.'));if(n>=.5&&n<=4)formatBlocks(el=>el.style.lineHeight=String(n));});
$('paragraphSpacing').addEventListener('click',()=>{const before=prompt('Espaço antes (pt):','0');if(before===null)return;const after=prompt('Espaço depois (pt):','0');if(after===null)return;const a=Number(before.replace(',','.')),b=Number(after.replace(',','.'));if(a>=0&&a<=72&&b>=0&&b<=72)formatBlocks(el=>{el.style.marginTop=a+'pt';el.style.marginBottom=b+'pt';});});
$('zeroSpacing').addEventListener('click',()=>formatBlocks(el=>{el.style.marginTop='0';el.style.marginBottom='0';}));
document.addEventListener('keydown',e=>{const target=e.target as HTMLElement;const inEditor=pagesMount.contains(target);if((e.ctrlKey||e.metaKey)&&inEditor&&['z','y'].includes(e.key.toLowerCase())){e.preventDefault();undoRedo(e.key.toLowerCase()==='y'||e.shiftKey);}else if((e.key==='Delete'||e.key==='Backspace')&&selectedObjectId&&!target.closest('input,textarea,[contenteditable=true]')){e.preventDefault();$('deleteObjectBtn').click();}});

$('resetFormat').addEventListener('click',()=>{execCmd('removeFormat');execCmd('fontName','Arial');execCmd('fontSize','3');execCmd('justifyFull');});

const applySelectionColumns = (cols:2|3) => { restoreRange();const ed=activeEditor();const sel=window.getSelection();if(!ed||!sel||!sel.rangeCount||sel.isCollapsed){toast('Selecione primeiro o trecho que ficará em colunas.');return;}const range=sel.getRangeAt(0);if(!ed.contains(range.commonAncestorContainer)){toast('A seleção precisa estar na página ativa.');return;}const frag=range.extractContents();const wrap=document.createElement('div');wrap.className=`column-section cols-${cols}`;wrap.appendChild(frag);range.insertNode(wrap);sel.removeAllRanges();activePage().html=ed.innerHTML;scheduleSave();};
document.querySelectorAll<HTMLButtonElement>('[data-selection-cols]').forEach(btn=>btn.addEventListener('click',()=>applySelectionColumns(Number(btn.dataset.selectionCols) as 2|3)));
document.querySelectorAll<HTMLButtonElement>('[data-page-cols]').forEach(btn=>btn.addEventListener('click',()=>{const p=activePage();if(!p)return;p.columns=Number(btn.dataset.pageCols) as 1|2|3;renderPages();scheduleSave();}));

const sortSelection = (direction:'az'|'za'|'num') => { restoreRange();const ed=activeEditor();const sel=window.getSelection();if(!ed||!sel||!sel.rangeCount||sel.isCollapsed){toast('Selecione uma lista ou linhas de texto.');return;}const range=sel.getRangeAt(0);if(!ed.contains(range.commonAncestorContainer)){toast('A seleção precisa estar na página ativa.');return;}const text=sel.toString();const lines=text.split(/\n+/).map(s=>s.trim()).filter(Boolean);if(lines.length<2){toast('Selecione pelo menos duas linhas.');return;}if(direction==='num')lines.sort((a,b)=>(parseFloat(a)||0)-(parseFloat(b)||0));else lines.sort((a,b)=>a.localeCompare(b,'pt-BR',{numeric:true,sensitivity:'base'})*(direction==='az'?1:-1));range.deleteContents();const frag=document.createDocumentFragment();lines.forEach(line=>{const p=document.createElement('p');p.textContent=line;frag.appendChild(p);});range.insertNode(frag);sel.removeAllRanges();activePage().html=ed.innerHTML;scheduleSave();};
$('sortAzBtn').addEventListener('click',()=>sortSelection('az'));$('sortZaBtn').addEventListener('click',()=>sortSelection('za'));$('sortNumericBtn').addEventListener('click',()=>sortSelection('num'));

const addFloatingImage=(src:string,name='Imagem',pageId=activePageId)=>{const p=activity.pages.find(x=>x.id===pageId)||activePage();if(!p)return;const d=pageDims(p.orientation);const obj:FloatingObject={id:newId(),pageId:p.id,type:'image',x:Math.max(15,d.width/2-30),y:85,width:60,height:45,src,z:Math.max(0,...activity.objects.map(o=>o.z))+1};activity.objects.push(obj);selectedObjectId=obj.id;renderPages();scheduleSave();toast(`${name} inserida.`);};
const addTextbox=()=>{const p=activePage();if(!p)return;const d=pageDims(p.orientation);const obj:FloatingObject={id:newId(),pageId:p.id,type:'textbox',x:Math.max(15,d.width/2-38),y:95,width:76,height:25,html:'Digite aqui',border:false,z:Math.max(0,...activity.objects.map(o=>o.z))+1};activity.objects.push(obj);selectedObjectId=obj.id;renderPages();scheduleSave();};
$('insertImageBtn').addEventListener('click',()=>$<HTMLInputElement>('editorImageInput').click());
$<HTMLInputElement>('editorImageInput').addEventListener('change',async e=>{const i=e.target as HTMLInputElement;const f=i.files?.[0];if(!f)return;addFloatingImage(await fileToDataUrl(f),f.name);i.value='';});
$('insertTextboxBtn').addEventListener('click',addTextbox);
$('insertAnswerLinesBtn').addEventListener('click',()=>execCmd('insertHTML','<p class="answer-lines">________________________________________________________________________________<br>________________________________________________________________________________<br>________________________________________________________________________________</p>'));
$('insertTableBtn').addEventListener('click',()=>showDialog('tableDialog'));
$('tableForm').addEventListener('submit',e=>{e.preventDefault();const rows=Number($<HTMLInputElement>('tableRows').value),cols=Number($<HTMLInputElement>('tableCols').value);if(!Number.isInteger(rows)||!Number.isInteger(cols)||rows<1||rows>200||cols<1||cols>50||rows*cols>3000){toast('Use até 3.000 células.');return;}closeDialog('tableDialog');execCmd('insertHTML','<table class="editor-table"><tbody>'+('<tr>'+ '<td><br></td>'.repeat(cols)+'</tr>').repeat(rows)+'</tbody></table><p><br></p>');});
let editingCell:HTMLTableCellElement|null=null;
$('editTableBtn').addEventListener('click',()=>{const node=savedRange?.startContainer;editingCell=(node instanceof Element?node:node?.parentElement)?.closest<HTMLTableCellElement>('td,th')||null;if(!editingCell||!pagesMount.contains(editingCell)){toast('Posicione o cursor dentro de uma célula.');return;}showDialog('tableEditDialog');});
document.querySelectorAll<HTMLButtonElement>('[data-table-action]').forEach(b=>b.addEventListener('click',()=>{const cell=editingCell,table=cell?.closest('table'),row=cell?.parentElement as HTMLTableRowElement|null;if(!cell||!table||!row||!pagesMount.contains(table))return;const action=b.dataset.tableAction;const idx=cell.cellIndex;const rows=[...table.rows];const complex=rows.some(r=>[...r.cells].some(c=>c.colSpan>1||c.rowSpan>1));if(complex&&['row+','row-','col+','col-'].includes(action||'')){toast('Divida as células mescladas antes de alterar linhas ou colunas.');return;}if(action==='row+'){const nr=table.insertRow(row.rowIndex+1);for(let i=0;i<row.cells.length;i++)nr.insertCell().innerHTML='<br>';}else if(action==='row-'){if(rows.length>1)table.deleteRow(row.rowIndex);else table.remove();}else if(action==='col+'){rows.forEach(r=>r.insertCell(Math.min(idx+1,r.cells.length)).innerHTML='<br>');}else if(action==='col-'){if(row.cells.length===1)table.remove();else rows.forEach(r=>{if(r.cells[idx])r.deleteCell(idx);});}else if(action==='merge'){const next=cell.nextElementSibling as HTMLTableCellElement|null;if(!next||cell.rowSpan!==next.rowSpan){toast('Não há célula compatível à direita.');return;}cell.colSpan+=next.colSpan;cell.innerHTML+='<br>'+next.innerHTML;next.remove();}else if(action==='split'){const count=cell.colSpan;if(count<=1){toast('Esta célula não está mesclada horizontalmente.');return;}cell.colSpan=1;for(let j=1;j<count;j++)row.insertCell(idx+j).innerHTML='<br>';}else if(action==='border'){table.classList.toggle('no-borders');}else if(action==='borderstyle'){const color=prompt('Cor da borda (#hex):','#333333');const width=Number(prompt('Espessura (pt):','1'));const style=prompt('Estilo: solid, dashed ou dotted','solid');if(color&&/^#[0-9a-f]{6}$/i.test(color)&&width>0&&width<=8&&style&&['solid','dashed','dotted'].includes(style)){table.classList.remove('no-borders');rows.forEach(r=>[...r.cells].forEach(c=>c.style.border=`${width}pt ${style} ${color}`));}}else if(action==='halign'){const v=prompt('Alinhamento: left, center, right ou justify','left');if(v&&['left','center','right','justify'].includes(v))cell.style.textAlign=v;}else if(action==='width'){const v=Number(prompt('Largura em milímetros:','30'));if(v>0&&v<=250)rows.forEach(r=>{if(r.cells[idx])r.cells[idx].style.width=v+'mm';});}else if(action==='height'){const v=Number(prompt('Altura em milímetros:','10'));if(v>0&&v<180)row.style.height=v+'mm';}else if(action==='fill'){const v=prompt('Cor hexadecimal (ex.: #eeeeee):','#eeeeee');if(v&&/^#[0-9a-f]{6}$/i.test(v))cell.style.backgroundColor=v;}else if(action==='valign'){const v=prompt('Alinhamento: top, middle ou bottom','middle');if(v&&['top','middle','bottom'].includes(v))cell.style.verticalAlign=v;}else if(action==='delete'){table.remove();}const ed=activeEditor();if(ed)activePage().html=ed.innerHTML;closeDialog('tableEditDialog');scheduleSave();}));

function startObjectDrag(event:PointerEvent,id:string,pageEl:HTMLElement,pageWidth:number,pageHeight:number){event.preventDefault();event.stopPropagation();const obj=activity.objects.find(o=>o.id===id);if(!obj)return;const sx=event.clientX,sy=event.clientY,ox=obj.x,oy=obj.y;const mmPerPx=pageWidth/pageEl.getBoundingClientRect().width;const pid=event.pointerId;const move=(m:PointerEvent)=>{if(m.pointerId!==pid)return;obj.x=Math.max(0,Math.min(pageWidth-obj.width,ox+(m.clientX-sx)*mmPerPx));obj.y=Math.max(0,Math.min(pageHeight-obj.height,oy+(m.clientY-sy)*mmPerPx));const el=pageEl.querySelector<HTMLElement>(`[data-id="${CSS.escape(id)}"]`);if(el){el.style.left=`${obj.x}mm`;el.style.top=`${obj.y}mm`;}};const up=(u:PointerEvent)=>{if(u.pointerId!==pid)return;window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',up);scheduleSave();};window.addEventListener('pointermove',move);window.addEventListener('pointerup',up);}
function startObjectResize(event:PointerEvent,id:string,pageEl:HTMLElement,pageWidth:number,pageHeight:number){event.preventDefault();event.stopPropagation();const obj=activity.objects.find(o=>o.id===id);if(!obj)return;const sx=event.clientX,sy=event.clientY,ow=obj.width,oh=obj.height;const mmPerPx=pageWidth/pageEl.getBoundingClientRect().width;const pid=event.pointerId;const move=(m:PointerEvent)=>{if(m.pointerId!==pid)return;obj.width=Math.max(18,Math.min(pageWidth-obj.x,ow+(m.clientX-sx)*mmPerPx));obj.height=Math.max(10,Math.min(pageHeight-obj.y,oh+(m.clientY-sy)*mmPerPx));const el=pageEl.querySelector<HTMLElement>(`[data-id="${CSS.escape(id)}"]`);if(el){el.style.width=`${obj.width}mm`;el.style.height=`${obj.height}mm`;}};const up=(u:PointerEvent)=>{if(u.pointerId!==pid)return;window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',up);scheduleSave();};window.addEventListener('pointermove',move);window.addEventListener('pointerup',up);}
$('bringFrontBtn').addEventListener('click',()=>{const obj=activity.objects.find(o=>o.id===selectedObjectId);if(!obj){toast('Selecione uma imagem ou caixa de texto.');return;}obj.z=Math.max(0,...activity.objects.map(o=>o.z))+1;renderPages();scheduleSave();});
$('deleteObjectBtn').addEventListener('click',()=>{if(!selectedObjectId){toast('Selecione um objeto.');return;}activity.objects=activity.objects.filter(o=>o.id!==selectedObjectId);selectedObjectId=null;renderPages();scheduleSave();});

const addPage=(orientation:Orientation=activePage()?.orientation||'portrait',columns:1|2|3=activePage()?.columns||1,html='<p><br></p>')=>{const p=blankPage(orientation,columns,html);const idx=Math.max(0,activity.pages.findIndex(x=>x.id===activePageId));activity.pages.splice(idx+1,0,p);activePageId=p.id;renderPages();scheduleSave();};
$('addPageBtn').addEventListener('click',()=>addPage());
$('duplicatePageBtn').addEventListener('click',()=>{const p=activePage();if(!p)return;const copy={...structuredClone(p),id:newId()};const idx=activity.pages.findIndex(x=>x.id===p.id);activity.pages.splice(idx+1,0,copy);activity.objects.filter(o=>o.pageId===p.id).forEach(o=>activity.objects.push({...structuredClone(o),id:newId(),pageId:copy.id}));activePageId=copy.id;renderPages();scheduleSave();});
$('deletePageBtn').addEventListener('click',()=>{if(activity.pages.length===1){toast('O documento precisa ter pelo menos uma página.');return;}const idx=activity.pages.findIndex(p=>p.id===activePageId);activity.objects=activity.objects.filter(o=>o.pageId!==activePageId);activity.pages.splice(idx,1);activePageId=activity.pages[Math.max(0,idx-1)].id;renderPages();scheduleSave();});
const setOrientation=(orientation:Orientation,all=false)=>{(all?activity.pages:[activePage()]).filter(Boolean).forEach(p=>{if(p)p.orientation=orientation;});renderPages();scheduleSave();};
$('portraitBtn').addEventListener('click',()=>setOrientation('portrait'));$('landscapeBtn').addEventListener('click',()=>setOrientation('landscape'));$('allPortraitBtn').addEventListener('click',()=>setOrientation('portrait',true));$('allLandscapeBtn').addEventListener('click',()=>setOrientation('landscape',true));

// Faixa de opções estilo Word
const setRibbon=(name:string)=>{activeRibbon=name;document.querySelectorAll<HTMLElement>('[data-ribbon]').forEach(b=>b.classList.toggle('active',b.dataset.ribbon===name));document.querySelectorAll<HTMLElement>('[data-panel]').forEach(p=>p.classList.toggle('active',p.dataset.panel===name));};
document.querySelectorAll<HTMLButtonElement>('[data-ribbon]').forEach(btn=>btn.addEventListener('click',()=>setRibbon(btn.dataset.ribbon||'home')));

// Régua
const rulerTicks=$<HTMLDivElement>('rulerTicks');let rulerWidth=0;
function updateRulerHandles(){const p=activePage();if(!p)return;const d=pageDims(p.orientation);const ruler=$('ruler');const page=pagesMount.querySelector<HTMLElement>(`[data-page-id="${CSS.escape(p.id)}"]`);if(page)ruler.style.width=page.getBoundingClientRect().width+'px';if(rulerWidth!==d.width){rulerWidth=d.width;rulerTicks.innerHTML=Array.from({length:Math.floor(d.width/10)+1},(_,i)=>`<span style="left:${i*1000/d.width}%">${i}</span>`).join('');}const block=selectedBlocks()[0];const pxmm=96/25.4;const l=block?parseFloat(getComputedStyle(block).marginLeft)/pxmm||0:0;const rr=block?parseFloat(getComputedStyle(block).marginRight)/pxmm||0:0;const first=block?parseFloat(getComputedStyle(block).textIndent)/pxmm||0:0;const positions={leftMarginHandle:activity.margins.left+l,rightMarginHandle:d.width-activity.margins.right-rr,firstLineHandle:activity.margins.left+l+first};Object.entries(positions).forEach(([id,x])=>{const h=$<HTMLButtonElement>(id);h.style.left=`${x/d.width*100}%`;h.disabled=!block;});}
function startIndentDrag(event:PointerEvent,side:'left'|'right'|'first'){event.preventDefault();const blocks=selectedBlocks();if(!blocks.length){toast('Selecione o texto primeiro.');return;}const rect=$('ruler').getBoundingClientRect();const d=pageDims(activePage().orientation);const ed=activeEditor();if(!ed)return;const pxmm=96/25.4;const init=blocks.map(el=>({el,l:parseFloat(getComputedStyle(el).marginLeft)/pxmm||0,r:parseFloat(getComputedStyle(el).marginRight)/pxmm||0,f:parseFloat(getComputedStyle(el).textIndent)/pxmm||0}));const start=event.clientX;const move=(e:PointerEvent)=>{const delta=(e.clientX-start)/rect.width*d.width;init.forEach(({el,l,r,f})=>{const max=Math.max(0,el.parentElement!.clientWidth/pxmm-20);if(side==='left')el.style.marginLeft=Math.max(0,Math.min(max-r,l+delta))+'mm';else if(side==='right')el.style.marginRight=Math.max(0,Math.min(max-l,r-delta))+'mm';else el.style.textIndent=Math.max(-l,Math.min(max-l-r,f+delta))+'mm';});updateRulerHandles();};const up=()=>{window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',up);window.removeEventListener('pointercancel',up);activePage().html=ed.innerHTML;scheduleSave();};window.addEventListener('pointermove',move);window.addEventListener('pointerup',up);window.addEventListener('pointercancel',up);}
$('leftMarginHandle').addEventListener('pointerdown',e=>startIndentDrag(e,'left'));$('rightMarginHandle').addEventListener('pointerdown',e=>startIndentDrag(e,'right'));$('firstLineHandle').addEventListener('pointerdown',e=>startIndentDrag(e,'first'));
$('toggleRuler').addEventListener('click',()=>{const el=document.querySelector<HTMLElement>('.ruler-shell')!;el.hidden=!el.hidden;localStorage.setItem('mcs-ruler-hidden',String(el.hidden));});
const settings=$<HTMLDetailsElement>('documentSettings');settings.open=localStorage.getItem('mcs-settings-open')==='true';settings.addEventListener('toggle',()=>localStorage.setItem('mcs-settings-open',String(settings.open)));
const workspace=document.querySelector<HTMLElement>('.workspace')!;workspace.classList.toggle('sidebar-hidden',localStorage.getItem('mcs-sidebar-hidden')==='true');$('toggleSidebar').addEventListener('click',()=>{workspace.classList.toggle('sidebar-hidden');localStorage.setItem('mcs-sidebar-hidden',String(workspace.classList.contains('sidebar-hidden')));});document.querySelector<HTMLElement>('.ruler-shell')!.hidden=localStorage.getItem('mcs-ruler-hidden')==='true';

// Importação: PDF preserva número e orientação das páginas; DOCX tenta preservar HTML e divide por quebras explícitas.
const extractPdfCandidate=async(file:File):Promise<ImportCandidate>=>{const data=new Uint8Array(await file.arrayBuffer());const pdf=await getDocument({data}).promise;const pages:ImportCandidate['pages']=[];let warning='';for(let pageNo=1;pageNo<=pdf.numPages;pageNo++){const pg=await pdf.getPage(pageNo);const viewport=pg.getViewport({scale:1});const orientation:Orientation=viewport.width>viewport.height?'landscape':'portrait';const text=await pg.getTextContent();const rows=new Map<number,Array<{x:number,w:number,str:string,size:number}>>();for(const raw of text.items as any[]){if(!raw||typeof raw.str!=='string'||!raw.str.trim())continue;const y=Math.round(Number(raw.transform?.[5]||0)/3)*3;const x=Number(raw.transform?.[4]||0);const row=rows.get(y)||[];row.push({x,w:Math.abs(Number(raw.width)||0),str:raw.str,size:Math.abs(Number(raw.height)||12)});rows.set(y,row);}const ordered=[...rows.entries()].sort((a,b)=>b[0]-a[0]).map(([,items])=>items.sort((a,b)=>a.x-b.x));const midpoint=viewport.width/2;const gap=viewport.width*.025;const evidence=ordered.filter(row=>row.some(i=>i.x+i.w<midpoint-gap)&&row.some(i=>i.x>midpoint+gap)&&!row.some(i=>i.x<midpoint+gap&&i.x+i.w>midpoint-gap));const crossing=ordered.filter(row=>row.some(i=>i.x<midpoint-gap&&i.x+i.w>midpoint+gap));const two=evidence.length>=6&&evidence.length>=ordered.length*.55&&crossing.length===0;const line=(row:typeof ordered[number])=>row.map(i=>i.str).join(' ').replace(/\s+/g,' ').trim();const para=(row:typeof ordered[number])=>{const t=line(row);if(!t)return '';const size=Math.max(6,Math.min(32,row[0]?.size||12));return `<p style="font-size:${size.toFixed(1)}pt">${escapeHtml(t)}</p>`;};let html=ordered.map(para).join('');if(two){const left=ordered.map(row=>para(row.filter(i=>i.x<midpoint))).join('');const right=ordered.map(row=>para(row.filter(i=>i.x>=midpoint))).join('');html=`<div class="import-columns"><div>${left}</div><div>${right}</div></div>`;}if(!html){warning='PDF digitalizado: texto não reconhecido; a página foi preservada como imagem.';const imagePg=pg as unknown as {getViewport(o:{scale:number}):{width:number;height:number};render(o:{canvasContext:CanvasRenderingContext2D;viewport:unknown}):{promise:Promise<void>}};const v=imagePg.getViewport({scale:1.5});const canvas=document.createElement('canvas');canvas.width=v.width;canvas.height=v.height;await imagePg.render({canvasContext:canvas.getContext('2d')!,viewport:v}).promise;html=`<p><img class="import-scan" src="${canvas.toDataURL('image/jpeg',.85)}" alt="Página digitalizada"></p>`;}else if(!two&&evidence.length>=3){warning='Colunas ambíguas: mantida uma coluna para evitar alterações indevidas.';}pages.push({html,orientation,columns:1});}return{sourceName:file.name,pages,warning};};
async function docxXml(buffer:ArrayBuffer):Promise<Document|null>{try{const v=new DataView(buffer);const bytes=new Uint8Array(buffer);let end=bytes.length-22;while(end>=Math.max(0,bytes.length-65557)&&v.getUint32(end,true)!==0x06054b50)end--;if(end<0||v.getUint32(end,true)!==0x06054b50)return null;let pos=v.getUint32(end+16,true);const n=v.getUint16(end+10,true);for(let i=0;i<n;i++){if(v.getUint32(pos,true)!==0x02014b50)return null;const method=v.getUint16(pos+10,true),size=v.getUint32(pos+20,true),len=v.getUint16(pos+28,true),extra=v.getUint16(pos+30,true),comment=v.getUint16(pos+32,true),offset=v.getUint32(pos+42,true);const name=new TextDecoder().decode(bytes.slice(pos+46,pos+46+len));if(name==='word/document.xml'){const start=offset+30+v.getUint16(offset+26,true)+v.getUint16(offset+28,true);let content:Uint8Array=bytes.slice(start,start+size);if(method===8){const stream=new Blob([content]).stream().pipeThrough(new DecompressionStream('deflate-raw' as CompressionFormat));content=new Uint8Array(await new Response(stream).arrayBuffer());}else if(method!==0)return null;return new DOMParser().parseFromString(new TextDecoder().decode(content),'application/xml');}pos+=46+len+extra+comment;}return null;}catch{return null;}}
const extractDocxCandidate=async(file:File):Promise<ImportCandidate>=>{const arrayBuffer=await file.arrayBuffer();const result=await mammoth.convertToHtml({arrayBuffer},{convertImage:mammoth.images.imgElement(async image=>({src:`data:${image.contentType};base64,${await image.read('base64')}`}))});const html=sanitizeImportedHtml(result.value||'<p>Documento sem conteúdo reconhecível.</p>');const doc=new DOMParser().parseFromString(html,'text/html');const xml=await docxXml(arrayBuffer);const ns='http://schemas.openxmlformats.org/wordprocessingml/2006/main';const sections=xml?[...xml.getElementsByTagNameNS(ns,'sectPr')]:[];const section=sections[0];const pg=section?.getElementsByTagNameNS(ns,'pgSz')[0];const col=section?.getElementsByTagNameNS(ns,'cols')[0];const orientation:Orientation=pg&&(pg.getAttributeNS(ns,'orient')==='landscape'||Number(pg.getAttributeNS(ns,'w'))>Number(pg.getAttributeNS(ns,'h')))?'landscape':'portrait';const count=Number(col?.getAttributeNS(ns,'num')||1);const columns:1|2|3=count===2||count===3?count:1;const chunks:string[]=[];let current=document.createElement('div');const breakBefore=new Set<string>();if(xml){[...xml.getElementsByTagNameNS(ns,'p')].forEach(p=>{const before=p.getElementsByTagNameNS(ns,'pageBreakBefore')[0];if(before&&before.getAttributeNS(ns,'val')!=='0'&&before.getAttributeNS(ns,'val')!=='false'){const t=[...p.getElementsByTagNameNS(ns,'t')].map(x=>x.textContent||'').join('').trim();if(t)breakBefore.add(t);}});}const breakAfter=new Set<string>();if(xml){[...xml.getElementsByTagNameNS(ns,'p')].forEach(p=>{if([...p.getElementsByTagNameNS(ns,'br')].some(b=>b.getAttributeNS(ns,'type')==='page')){const t=[...p.getElementsByTagNameNS(ns,'t')].map(x=>x.textContent||'').join('').trim();if(t)breakAfter.add(t);}});}let priorBreak=false;[...doc.body.childNodes].forEach(node=>{const el=node instanceof HTMLElement?node:null;const explicit=priorBreak||el?.style?.breakBefore==='page'||el?.style?.pageBreakBefore==='always'||el?.classList.contains('page-break')||breakBefore.has(node.textContent?.trim()||'');if(explicit&&current.innerHTML.trim()){chunks.push(current.innerHTML);current=document.createElement('div');}current.appendChild(node.cloneNode(true));priorBreak=breakAfter.has(node.textContent?.trim()||'');});if(current.innerHTML.trim())chunks.push(current.innerHTML);return{sourceName:file.name,pages:(chunks.length?chunks:[html]).map(h=>({html:h,orientation,columns})),warning:sections.length>1?'DOCX com múltiplas seções: revise orientações e colunas; a primeira seção foi usada.':'DOCX: paginação e formatação complexa podem exigir revisão.'};};
const analyzeImportWithAI=async(candidate:ImportCandidate,component:ComponentKind):Promise<ImportCandidate>=>{if(candidate.pages.some(p=>/<(?:img|table)\b|import-columns/i.test(p.html)))return {...candidate,warning:'Imagens/tabelas preservadas sem reescrita pela IA.'};try{const res=await fetch('/.netlify/functions/analyze-import',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({component,sourceName:candidate.sourceName,pages:candidate.pages.map(p=>({orientation:p.orientation,columns:p.columns||1,text:stripHtml(p.html).slice(0,9000),html:p.html.slice(0,16000)}))})});const json=await res.json().catch(()=>({}));if(!res.ok||!json?.ok||!Array.isArray(json.pages)||json.pages.length!==candidate.pages.length)throw new Error(json?.error||'A IA retornou uma paginação diferente.');return{...candidate,pages:candidate.pages.map((p,i)=>({...p,html:sanitizeImportedHtml(String(json.pages[i].html||p.html))}))};}catch(err){return {...candidate,warning:`IA não aplicada: ${err instanceof Error?err.message:'falha'}. Conteúdo extraído mantido.`};}};
const importCandidateToActivity=(candidate:ImportCandidate,mode:string,destination:Activity['collection']):Activity=>{const created=nowIso();return normalizeActivity({...activity,id:newId(),collection:destination,originalLayout:mode==='original',title:stripExtension(candidate.sourceName),sourceName:candidate.sourceName,pages:candidate.pages.map(p=>normalizePage({html:mode==='content'?`<p>${escapeHtml(stripHtml(p.html))}</p>`:p.html,orientation:p.orientation,columns:mode==='content'?1:p.columns||1})),objects:[],answerKeyHtml:'',createdAt:created,updatedAt:created});};
$<HTMLInputElement>('fileInput').addEventListener('change',async e=>{const input=e.target as HTMLInputElement;const files=[...(input.files||[])];if(!files.length||importBusy)return;importBusy=true;const label=$('importStatus');const imported:Activity[]=[];const warnings:string[]=[];const mode=$<HTMLSelectElement>('importMode').value;const dest=$<HTMLSelectElement>('importDestination').value as Activity['collection'];try{await persist();for(let i=0;i<files.length;i++){const file=files[i];label.textContent=`Lendo ${i+1}/${files.length}: ${file.name}…`;const ext=file.name.toLowerCase().split('.').pop()||'';let candidate:ImportCandidate;if(ext==='pdf'||file.type==='application/pdf')candidate=await extractPdfCandidate(file);else if(ext==='docx')candidate=await extractDocxCandidate(file);else throw new Error('Use PDF ou DOCX.');if(mode==='adapt'&&$<HTMLInputElement>('smartImport').checked){label.textContent=`Remontando ${file.name}…`;candidate=await analyzeImportWithAI(candidate,activity.component);}if(candidate.warning)warnings.push(candidate.warning);const item=importCandidateToActivity(candidate,mode,dest);imported.push(item);upsertLocalLibrary(item);markPending(item.id,true);if(navigator.onLine&&await saveRemote(item))markPending(item.id,false);}if(imported[0]&&dest!=='reference'){activity=structuredClone(imported[0]);activePageId=activity.pages[0].id;selectedObjectId=null;render();recordEdit();await persist();}label.textContent=`${imported.length} arquivo(s) importado(s). ${dest==='reference'?'Salvos nas referências.':'Primeiro aberto para edição.'} ${[...new Set(warnings)].join(' ')}`;toast('Importação concluída. Revise o layout.');}catch(err){label.textContent=err instanceof Error?err.message:'Falha ao importar.';toast(label.textContent);}finally{importBusy=false;input.value='';}});

// PDF multipágina misto (portrait/landscape)
const pageToCanvas=async(el:HTMLElement)=>{el.classList.add('exporting');try{return await html2canvas(el,{scale:2,useCORS:true,backgroundColor:'#ffffff'});}finally{el.classList.remove('exporting');}};
const buildAnswerKeyPage=()=>{const page=document.createElement('section');page.className='page portrait answer-key-page';page.style.setProperty('--page-width','210mm');page.style.setProperty('--page-height','297mm');page.style.setProperty('--page-margin-top','16mm');page.style.setProperty('--page-margin-right','16mm');page.style.setProperty('--page-margin-bottom','18mm');page.style.setProperty('--page-margin-left','16mm');page.innerHTML=`<div class="page-flow"><div class="key-title">GABARITO — ${escapeHtml(activity.title)}</div><div class="key-meta">${escapeHtml(activity.subject)} • ${escapeHtml(activity.grade)}</div><div class="key-content">${activity.answerKeyHtml ? sanitizeImportedHtml(activity.answerKeyHtml) : '<p>Gabarito ainda não preenchido.</p>'}</div></div>`;document.body.appendChild(page);return page;};
const makePdfBlob=async(mode:PdfMode='activity')=>{const sourcePages=[...pagesMount.querySelectorAll<HTMLElement>('.page')];if(mode!=='key'&&sourcePages.some(p=>{const ed=p.querySelector<HTMLElement>('.editor');return !!ed&&(ed.scrollHeight>ed.clientHeight+4||ed.scrollWidth>ed.clientWidth+4);})&&!confirm('Há conteúdo além do limite de alguma página. O PDF pode cortá-lo. Exportar assim mesmo?'))throw new Error('Exportação cancelada. Ajuste as páginas.');const targets:HTMLElement[]=[];let keyPage:HTMLElement|null=null;if(mode!=='key')targets.push(...sourcePages);if(mode!=='activity'){keyPage=buildAnswerKeyPage();targets.push(keyPage);}if(!targets.length)throw new Error('Nenhuma página para exportar.');let pdf:jsPDF|null=null;for(let i=0;i<targets.length;i++){const el=targets[i];const orientation:Orientation=el.classList.contains('landscape')?'landscape':'portrait';const dims=pageDims(orientation);const canvas=await pageToCanvas(el);const data=canvas.toDataURL('image/jpeg',0.97);if(!pdf)pdf=new jsPDF(orientation==='landscape'?'l':'p','mm','a4');else pdf.addPage('a4',orientation==='landscape'?'l':'p');pdf.addImage(data,'JPEG',0,0,dims.width,dims.height);}keyPage?.remove();return pdf!.output('blob');};
const downloadBlob=(blob:Blob,filename:string)=>{const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();window.setTimeout(()=>URL.revokeObjectURL(url),1200);};
$('pdfMenuBtn').addEventListener('click',()=>showDialog('pdfDialog'));
document.querySelectorAll<HTMLButtonElement>('[data-pdf-mode]').forEach(btn=>btn.addEventListener('click',async()=>{const mode=btn.dataset.pdfMode as PdfMode;closeDialog('pdfDialog');toast('Gerando PDF…');try{const blob=await makePdfBlob(mode);const suffix=mode==='activity'?'':mode==='key'?' - Gabarito':' - Com Gabarito';downloadBlob(blob,`${activity.title||'atividade'}${suffix}.pdf`);toast('PDF gerado.');}catch(e){toast(e instanceof Error?e.message:'Falha ao gerar PDF.');}}));
$('shareBtn').addEventListener('click',async()=>{const blob=await makePdfBlob('activity');const file=new File([blob],`${activity.title||'atividade'}.pdf`,{type:'application/pdf'});if(navigator.share&&(!navigator.canShare||navigator.canShare({files:[file]}))){try{await navigator.share({title:activity.title,text:'Atividade em PDF',files:[file]});return;}catch{}}downloadBlob(blob,file.name);toast('PDF baixado para compartilhar.');});
$('previewBtn').addEventListener('click',()=>{renderPreview();showDialog('previewDialog');});$('printBtn').addEventListener('click',()=>window.print());

// Gabarito
$('answerKeyBtn').addEventListener('click',()=>{$<HTMLTextAreaElement>('answerKeyEditor').value=stripHtml(activity.answerKeyHtml).replace(/\s*(?=\d+\.)/g,'\n').trim()||stripHtml(activity.answerKeyHtml);showDialog('answerKeyDialog');});
$('saveAnswerKeyBtn').addEventListener('click',()=>{const value=$<HTMLTextAreaElement>('answerKeyEditor').value;activity.answerKeyHtml=value.split('\n').filter(Boolean).map(line=>`<p>${escapeHtml(line)}</p>`).join('');scheduleSave();closeDialog('answerKeyDialog');toast('Gabarito salvo.');});

// Nova atividade
$('newActivityBtn').addEventListener('click',async()=>{if(!confirm('Criar uma nova atividade? A atual continuará salva em Minhas Atividades.'))return;await persist();const next=blankActivity(activity.component);next.school=activity.school;next.teacher=activity.teacher;next.grade=activity.grade;next.logoDataUrl=activity.logoDataUrl;next.personalLogoDataUrl=activity.personalLogoDataUrl;next.showPersonalLogo=activity.showPersonalLogo;next.showPageNumbers=activity.showPageNumbers;activity=next;activePageId=activity.pages[0].id;selectedObjectId=null;render();recordEdit();await persist();});

// Biblioteca
const deletedKey='marks-class-studio:deleted:v5';const deletedIds=()=>safeJson<string[]>(localStorage.getItem(deletedKey),[]);
const mergeRemoteLibrary=async(local:Activity[])=>{if(!navigator.onLine)return local;try{const res=await fetch('/.netlify/functions/list-activities');if(!res.ok)return local;const json=await res.json();const remote=Array.isArray(json?.data)?json.data.map(normalizeActivity):[];const map=new Map<string,Activity>();const deleted=new Set(deletedIds());[...remote,...getLibrary()].forEach((i:Activity)=>{if(i?.id&&!deleted.has(i.id)&&(!map.has(i.id)||map.get(i.id)!.updatedAt<=i.updatedAt))map.set(i.id,i);});const merged=[...map.values()].sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt));setLibrary(merged);return merged;}catch{return local;}};
let libraryCache:Activity[]=[];let libraryView:'activity'|'reference'='activity';
function cloneDocument(item:Activity,title:string,collection:Activity['collection']='activity'){const copy=structuredClone(item);copy.id=newId();copy.title=title;copy.collection=collection;copy.createdAt=copy.updatedAt=nowIso();const ids=new Map<string,string>();copy.pages=copy.pages.map(p=>{const id=newId();ids.set(p.id,id);return {...p,id};});copy.objects=copy.objects.map(o=>({...o,id:newId(),pageId:ids.get(o.pageId)||copy.pages[0].id}));return copy;}
const paintLibrary=()=>{const q=$<HTMLInputElement>('librarySearch').value.trim().toLocaleLowerCase('pt-BR');const filter=$<HTMLSelectElement>('libraryComponentFilter').value;const list=libraryCache.filter(i=>(i.collection===libraryView||i.collection==='both')&&(filter==='all'||i.component===filter)&&(!q||`${i.title} ${i.grade} ${i.subject}`.toLocaleLowerCase('pt-BR').includes(q)));const mount=$('libraryList');if(!list.length){mount.innerHTML='<div class="empty">Nenhuma atividade encontrada.</div>';return;}mount.innerHTML=list.map(i=>`<article class="library-card"><div><strong>${escapeHtml(i.title)}</strong><small>${escapeHtml(i.subject)} • ${escapeHtml(i.grade)} • ${i.pages.length} pág.</small></div><div class="card-actions"><button data-open="${i.id}">${libraryView==='reference'?'Editar cópia':'Abrir'}</button><button data-copy="${i.id}">Duplicar</button><button data-rename="${i.id}">Renomear</button><button data-reference="${i.id}">${libraryView==='reference'?'Copiar para atividades':'Copiar para referências'}</button><button class="danger" data-delete="${i.id}">Excluir</button></div></article>`).join('');mount.querySelectorAll<HTMLButtonElement>('[data-open]').forEach(b=>b.addEventListener('click',async()=>{const item=libraryCache.find(i=>i.id===b.dataset.open);if(!item)return;await persist();activity=libraryView==='reference'?cloneDocument(item,item.title):structuredClone(item);activePageId=activity.pages[0].id;selectedObjectId=null;render();recordEdit();closeDialog('libraryDialog');await persist();}));
const saveItem=async(item:Activity)=>{try{upsertLocalLibrary(item);markPending(item.id,true);if(navigator.onLine&&await saveRemote(item))markPending(item.id,false);libraryCache=getLibrary();paintLibrary();}catch{toast('Não foi possível salvar a cópia local.');}};
mount.querySelectorAll<HTMLButtonElement>('[data-copy]').forEach(b=>b.addEventListener('click',()=>{const item=libraryCache.find(i=>i.id===b.dataset.copy);if(item)void saveItem(cloneDocument(item,item.title+' — Cópia',libraryView));}));mount.querySelectorAll<HTMLButtonElement>('[data-reference]').forEach(b=>b.addEventListener('click',()=>{const item=libraryCache.find(i=>i.id===b.dataset.reference);if(item)void saveItem(cloneDocument(item,item.title,libraryView==='reference'?'activity':'reference'));}));mount.querySelectorAll<HTMLButtonElement>('[data-rename]').forEach(b=>b.addEventListener('click',()=>{const item=libraryCache.find(i=>i.id===b.dataset.rename);if(!item)return;const title=prompt('Novo nome:',item.title)?.trim();if(!title)return;if(activity.id===item.id){activity.title=title;render();scheduleSave();void saveItem(structuredClone(activity));}else void saveItem({...item,title,updatedAt:nowIso()});}));mount.querySelectorAll<HTMLButtonElement>('[data-delete]').forEach(b=>b.addEventListener('click',async()=>{const id=b.dataset.delete||'';const item=libraryCache.find(i=>i.id===id);if(!item||!confirm('Excluir deste acervo?'))return;if(item.collection==='both'){const next:Activity={...item,collection:libraryView==='activity'?'reference':'activity',updatedAt:nowIso()};if(activity.id===id){activity.collection=next.collection;scheduleSave();}await saveItem(next);return;}if(activity.id===id){window.clearTimeout(saveTimer);activity=blankActivity(activity.component);activePageId=activity.pages[0].id;selectedObjectId=null;render();recordEdit();}localStorage.setItem(deletedKey,JSON.stringify([...new Set([...deletedIds(),id])]));markPending(id,false);setLibrary(getLibrary().filter(i=>i.id!==id));libraryCache=getLibrary();paintLibrary();await remoteQueue;if(navigator.onLine)try{await fetch('/.netlify/functions/delete-activity',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id})});}catch{}if(activity.id!==id)void persist();}));};
async function openLibrary(view:'activity'|'reference'){libraryView=view;$('libraryHeading').textContent=view==='activity'?'Minhas Atividades':'Biblioteca de Referências';$('librarySubtitle').textContent=view==='activity'?'Documentos editáveis e salvos':'Exemplos pedagógicos para a IA';libraryCache=getLibrary();paintLibrary();showDialog('libraryDialog');libraryCache=await mergeRemoteLibrary(getLibrary());paintLibrary();}
$('libraryBtn').addEventListener('click',()=>void openLibrary('reference'));$('myActivitiesBtn').addEventListener('click',()=>void openLibrary('activity'));$('librarySearch').addEventListener('input',paintLibrary);$('libraryComponentFilter').addEventListener('change',paintLibrary);
$('fileNew').addEventListener('click',()=>$('newActivityBtn').click());$('fileOpen').addEventListener('click',()=>void openLibrary('activity'));$('fileSave').addEventListener('click',()=>{if(activity.collection==='reference')activity.collection='both';void persist();toast('Salvamento solicitado. Confira o status na barra superior.');});$('fileSaveAs').addEventListener('click',async()=>{const name=prompt('Nome da nova atividade:',activity.title+' — Cópia')?.trim();if(!name)return;await persist();activity=cloneDocument(activity,name);activePageId=activity.pages[0].id;selectedObjectId=null;render();recordEdit();await persist();toast('Cópia criada em Minhas Atividades.');});$('fileRename').addEventListener('click',()=>{const name=prompt('Nome da atividade:',activity.title)?.trim();if(name){activity.title=name;render();scheduleSave();}});$('filePdf').addEventListener('click',()=>$('pdfMenuBtn').click());$('fileHistory').addEventListener('click',()=>$('historyBtn').click());

// Modelos + layouts pessoais em localStorage
const LAYOUT_MODELS_KEY='marks-class-studio:layout-models:v4';
type LayoutModel={id:string;name:string;component:ComponentKind;orientation:Orientation;columns:1|2|3;pageCount:number;margins:Margins;showPageNumbers:boolean;showPersonalLogo:boolean};
const baseModels=[
  {name:'Inglês — Atividade 1 página',component:'english' as ComponentKind,orientation:'portrait' as Orientation,columns:1 as const,pageCount:1},
  {name:'Inglês — 2 páginas / 2 colunas',component:'english' as ComponentKind,orientation:'portrait' as Orientation,columns:2 as const,pageCount:2},
  {name:'Projeto de Vida — Reflexão 2 páginas',component:'life-project' as ComponentKind,orientation:'portrait' as Orientation,columns:1 as const,pageCount:2},
  {name:'Paisagem — atividade ampla',component:'english' as ComponentKind,orientation:'landscape' as Orientation,columns:2 as const,pageCount:1}
];
const getLayoutModels=():LayoutModel[]=>safeJson(localStorage.getItem(LAYOUT_MODELS_KEY),[]);
const applyLayoutModel=(m:Pick<LayoutModel,'component'|'orientation'|'columns'|'pageCount'> & Partial<LayoutModel>)=>{activity.component=m.component;activity.subject=profileDefaults[m.component].subject;activity.pages.forEach(p=>{p.orientation=m.orientation;p.columns=m.columns;});while(activity.pages.length<(m.pageCount||1))activity.pages.push(blankPage(m.orientation,m.columns,'<p><br></p>'));activity.originalLayout=false;activePageId=activity.pages[0].id;if(m.margins)activity.margins={...m.margins};if(typeof m.showPageNumbers==='boolean')activity.showPageNumbers=m.showPageNumbers;if(typeof m.showPersonalLogo==='boolean')activity.showPersonalLogo=m.showPersonalLogo;render();scheduleSave();};
const renderModels=()=>{const customs=getLayoutModels();const all=[...baseModels.map((m,i)=>({id:`base-${i}`,...m,margins:activity.margins,showPageNumbers:true,showPersonalLogo:true})),...customs];const mount=$('modelsList');mount.innerHTML=all.map(m=>`<button class="model-card" data-model="${m.id}"><span>${m.orientation==='landscape'?'▭':'▯'}</span><strong>${escapeHtml(m.name)}</strong><small>${m.pageCount} pág. • ${m.columns} coluna(s)</small></button>`).join('');mount.querySelectorAll<HTMLButtonElement>('[data-model]').forEach(b=>b.addEventListener('click',()=>{const m=all.find(x=>x.id===b.dataset.model);if(!m)return;if(confirm(`Aplicar “${m.name}”?`)){applyLayoutModel(m);closeDialog('modelsDialog');}}));};
const openModels=()=>{renderModels();showDialog('modelsDialog');};$('modelsBtn').addEventListener('click',openModels);$('openModelsRibbonBtn').addEventListener('click',openModels);
$('saveLayoutModelBtn').addEventListener('click',()=>{const name=prompt('Nome para este modelo de layout:','Meu modelo');if(!name)return;const p=activePage();if(!p)return;const list=getLayoutModels();list.unshift({id:newId(),name,component:activity.component,orientation:p.orientation,columns:p.columns,pageCount:activity.pages.length,margins:{...activity.margins},showPageNumbers:activity.showPageNumbers,showPersonalLogo:activity.showPersonalLogo});localStorage.setItem(LAYOUT_MODELS_KEY,JSON.stringify(list.slice(0,30)));toast('Modelo salvo.');});

// Banco de imagens
const saveRemoteImage=async(item:ImageBankItem)=>{try{await fetch('/.netlify/functions/save-image',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(item)});}catch{}};let imageBankCache:ImageBankItem[]=[];
const mergeRemoteImages=async()=>{const local=getImageBank();if(!navigator.onLine)return local;try{const res=await fetch('/.netlify/functions/list-images');if(!res.ok)return local;const json=await res.json();const remote=Array.isArray(json?.data)?json.data:[];const map=new Map<string,ImageBankItem>();[...remote,...local].forEach((i:any)=>i?.id&&map.set(i.id,i));const merged=[...map.values()].sort((a,b)=>b.createdAt.localeCompare(a.createdAt));setImageBank(merged);return merged;}catch{return local;}};
const paintImageBank=()=>{const mount=$('imageBankList');if(!imageBankCache.length){mount.innerHTML='<div class="empty">Banco de imagens vazio.</div>';return;}mount.innerHTML=imageBankCache.map(i=>`<article class="image-card"><img src="${i.dataUrl}" alt="${escapeHtml(i.name)}"><div><strong>${escapeHtml(i.name)}</strong><div class="card-actions"><button data-use-image="${i.id}">Inserir</button><button class="danger" data-delete-image="${i.id}">Excluir</button></div></div></article>`).join('');mount.querySelectorAll<HTMLButtonElement>('[data-use-image]').forEach(b=>b.addEventListener('click',()=>{const i=imageBankCache.find(x=>x.id===b.dataset.useImage);if(i){addFloatingImage(i.dataUrl,i.name);closeDialog('imageBankDialog');}}));mount.querySelectorAll<HTMLButtonElement>('[data-delete-image]').forEach(b=>b.addEventListener('click',async()=>{const id=b.dataset.deleteImage||'';imageBankCache=imageBankCache.filter(x=>x.id!==id);setImageBank(imageBankCache);paintImageBank();if(navigator.onLine)try{await fetch('/.netlify/functions/delete-image',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id})});}catch{}}));};
$('imageBankBtn').addEventListener('click',async()=>{showDialog('imageBankDialog');imageBankCache=await mergeRemoteImages();paintImageBank();});
$<HTMLInputElement>('imageBankUpload').addEventListener('change',async e=>{const input=e.target as HTMLInputElement;for(const f of [...(input.files||[])].filter(x=>x.type.startsWith('image/'))){const item={id:newId(),name:f.name,dataUrl:await fileToDataUrl(f),createdAt:nowIso()};imageBankCache.unshift(item);if(navigator.onLine)void saveRemoteImage(item);}setImageBank(imageBankCache);paintImageBank();input.value='';});
$('openGoogleImagesBtn').addEventListener('click',()=>{const q=$<HTMLInputElement>('webImageQuery').value.trim();if(!q){toast('Digite o tema da imagem.');return;}window.open(`https://www.google.com/search?tbm=isch&q=${encodeURIComponent(q)}`,'_blank','noopener,noreferrer');});

// Histórico
const renderHistory=()=>{const items=getHistory().filter(x=>x.activity.id===activity.id);const mount=$('historyList');if(!items.length){mount.innerHTML='<div class="empty">Ainda não há versões anteriores.</div>';return;}mount.innerHTML=items.map(i=>`<article class="history-card"><div><strong>${new Date(i.savedAt).toLocaleString('pt-BR')}</strong><small>${escapeHtml(i.activity.title)}</small></div><button data-restore="${i.id}">Restaurar</button></article>`).join('');mount.querySelectorAll<HTMLButtonElement>('[data-restore]').forEach(b=>b.addEventListener('click',async()=>{const v=getHistory().find(x=>x.id===b.dataset.restore);if(!v||!confirm('Restaurar esta versão?'))return;await persist();activity=structuredClone(v.activity);activePageId=activity.pages[0].id;render();recordEdit();await persist();closeDialog('historyDialog');}));};$('historyBtn').addEventListener('click',()=>{renderHistory();showDialog('historyDialog');});

// IA: criação completa + assistente de seleção
const openAi=()=>{$<HTMLSelectElement>('aiComponent').value=activity.component;$<HTMLInputElement>('aiGrade').value=activity.grade;$<HTMLSelectElement>('aiOrientation').value=activePage()?.orientation||'portrait';$<HTMLSelectElement>('aiColumns').value=String(activePage()?.columns||1);$<HTMLSelectElement>('aiPages').value=String(Math.min(4,Math.max(1,activity.pages.length)));$('aiStatus').textContent='A IA pode usar sua biblioteca para seguir seu padrão.';showDialog('aiDialog');};$('aiBtn').addEventListener('click',openAi);$('openAiRibbonBtn').addEventListener('click',openAi);
$<HTMLFormElement>('aiForm').addEventListener('submit',async e=>{e.preventDefault();const button=$<HTMLButtonElement>('aiGenerateBtn');const aiStatus=$('aiStatus');const component=$<HTMLSelectElement>('aiComponent').value as ComponentKind;const grade=$<HTMLInputElement>('aiGrade').value.trim();const topic=$<HTMLInputElement>('aiTopic').value.trim();const questionCount=Math.min(40,Math.max(1,Number($<HTMLInputElement>('aiQuestionCount').value)||8));const questionType=$<HTMLSelectElement>('aiQuestionType').value;const pageCount=Number($<HTMLSelectElement>('aiPages').value)||2;const orientation=$<HTMLSelectElement>('aiOrientation').value as Orientation;const columns=Number($<HTMLSelectElement>('aiColumns').value) as 1|2|3;const notes=$<HTMLTextAreaElement>('aiNotes').value.trim();const useLibrary=$<HTMLInputElement>('aiUseLibrary').checked;const includeKey=$<HTMLInputElement>('aiIncludeKey').checked;const references=useLibrary?getLibrary().filter(i=>i.component===component&&(i.collection==='reference'||i.collection==='both')).slice(0,5).map(i=>({title:i.title,grade:i.grade,text:stripHtml(i.pages.map(p=>p.html).join(' ')).slice(0,3500),pageCount:i.pages.length,orientations:i.pages.map(p=>p.orientation),columns:i.pages.map(p=>p.columns)})):[];button.disabled=true;aiStatus.textContent='Gerando e diagramando a atividade…';try{const res=await fetch('/.netlify/functions/generate-activity',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({component,grade,topic,questionCount,questionType,notes,references,pageCount,orientation,columns,includeKey,layout:{margins:activity.margins,showPageNumbers:activity.showPageNumbers}})});const json=await res.json().catch(()=>({}));if(!res.ok||!json?.ok||!Array.isArray(json.pages))throw new Error(json?.error||'IA não configurada.');await persist();activity=cloneDocument(activity,activity.title);activity.originalLayout=false;activity.component=component;activity.subject=profileDefaults[component].subject;activity.grade=grade||activity.grade;activity.title=String(json.title||profileDefaults[component].title);activity.pages=json.pages.slice(0,Math.max(1,pageCount)).map((p:any)=>normalizePage({html:sanitizeImportedHtml(String(p.html||'')),orientation:p.orientation==='landscape'?'landscape':orientation,columns:p.columns===2||p.columns===3?p.columns:columns}));while(activity.pages.length<pageCount)activity.pages.push(blankPage(orientation,columns,'<p><br></p>'));activity.objects=[];activity.answerKeyHtml=includeKey&&typeof json.answerKeyHtml==='string'?sanitizeImportedHtml(json.answerKeyHtml):'';activePageId=activity.pages[0].id;render();scheduleSave();closeDialog('aiDialog');toast('Atividade criada e diagramada.');}catch(err){aiStatus.textContent=err instanceof Error?err.message:'Falha ao gerar.';}finally{button.disabled=false;}});

const improveSelection=async(mode:'rewrite'|'similar')=>{restoreRange();const ed=activeEditor();const sel=window.getSelection();if(!ed||!sel||!sel.rangeCount||sel.isCollapsed){toast('Selecione primeiro o texto ou questão.');return;}const range=sel.getRangeAt(0);if(!ed.contains(range.commonAncestorContainer)){toast('Selecione um trecho da página ativa.');return;}const text=sel.toString().trim();if(!text)return;toast('Consultando a IA…');try{const res=await fetch('/.netlify/functions/assist-selection',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({component:activity.component,grade:activity.grade,mode,text})});const json=await res.json().catch(()=>({}));if(!res.ok||!json?.ok||typeof json.html!=='string')throw new Error(json?.error||'IA não configurada.');range.deleteContents();const frag=range.createContextualFragment(sanitizeImportedHtml(json.html));range.insertNode(frag);sel.removeAllRanges();activePage().html=ed.innerHTML;scheduleSave();toast('Trecho atualizado.');}catch(err){toast(err instanceof Error?err.message:'Falha na IA.');}};
$('aiRewriteBtn').addEventListener('click',()=>void improveSelection('rewrite'));$('aiSimilarBtn').addEventListener('click',()=>void improveSelection('similar'));

window.addEventListener('online',async()=>{await persist();for(const item of getLibrary().filter(i=>pending().includes(i.id))){if(await saveRemote(item))markPending(item.id,false);}for(const id of deletedIds())try{await fetch('/.netlify/functions/delete-activity',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id})});}catch{}});window.addEventListener('beforeunload',()=>{try{localStorage.setItem(STORAGE_KEY,compactJson(activity));}catch{}});
render();void persist();
