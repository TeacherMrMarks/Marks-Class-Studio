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
const setLibrary = (items: Activity[]) => { try { localStorage.setItem(LIBRARY_KEY, JSON.stringify(items.slice(0, MAX_LIBRARY))); } catch {} };
const getHistory = (): HistoryItem[] => safeJson<any[]>(localStorage.getItem(HISTORY_KEY), []).map(i => ({ ...i, activity: normalizeActivity(i.activity || {}) }));
const setHistory = (items: HistoryItem[]) => { try { localStorage.setItem(HISTORY_KEY, JSON.stringify(items.slice(0, MAX_HISTORY))); } catch {} };
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
    <div class="brand"><span class="brand-mark">MC</span><div><strong>Marks Class Studio</strong><small>Editor inteligente de atividades • V4</small></div></div>
    <span id="saveStatus" class="status saved">Salvo localmente</span>
    <div class="top-actions">
      <button class="btn ghost" id="previewBtn" type="button">Visualizar</button>
      <button class="btn primary" id="pdfMenuBtn" type="button">Gerar PDF ▾</button>
      <button class="btn" id="shareBtn" type="button">Compartilhar</button>
    </div>
  </header>

  <div class="workspace">
    <aside class="sidebar">
      <div class="sidebar-title"><h3>Documento</h3><button class="mini primary-mini" id="newActivityBtn" type="button">＋ Nova</button></div>
      <div class="field"><label>Componente</label><select id="componentInput"><option value="english">Língua Inglesa</option><option value="life-project">Projeto de Vida</option></select></div>
      <div class="field"><label>Escola</label><input id="schoolInput" /></div>
      <div class="field"><label>Professor</label><input id="teacherInput" /></div>
      <div class="field"><label>Disciplina</label><input id="subjectInput" /></div>
      <div class="field"><label>Série / turma</label><input id="gradeInput" /></div>
      <div class="field"><label>Título do cabeçalho</label><input id="titleInput" /></div>
      <div class="field"><label>Logo da escola</label><input id="logoInput" type="file" accept="image/*" /></div>
      <div class="field"><label>Minha logo (última página)</label><input id="personalLogoInput" type="file" accept="image/*" /></div>
      <label class="check-line"><input id="showPersonalLogo" type="checkbox" /> Mostrar minha logo na última página</label>
      <label class="check-line"><input id="showPageNumbers" type="checkbox" /> Numerar páginas no centro</label>

      <details class="details-box"><summary>Margens</summary><div class="margin-grid">
        <label>Sup.<input id="marginTop" type="number" min="5" max="35" step="1" /></label>
        <label>Dir.<input id="marginRight" type="number" min="5" max="35" step="1" /></label>
        <label>Inf.<input id="marginBottom" type="number" min="5" max="35" step="1" /></label>
        <label>Esq.<input id="marginLeft" type="number" min="5" max="35" step="1" /></label>
      </div></details>

      <div class="import-zone">
        <strong>Importação inteligente</strong>
        <span>PDF/DOCX → páginas editáveis, orientação e colunas.</span>
        <label class="check-line compact"><input id="smartImport" type="checkbox" checked /> Remontar com IA quando disponível</label>
        <input id="fileInput" type="file" accept=".pdf,.doc,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" multiple />
        <small id="importStatus">Nenhum arquivo importado.</small>
      </div>

      <nav class="side-menu">
        <button id="libraryBtn" type="button"><span>📚 Biblioteca</span><b>›</b></button>
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
          <button data-ribbon="home" class="active" type="button">Início</button>
          <button data-ribbon="insert" type="button">Inserir</button>
          <button data-ribbon="layout" type="button">Layout</button>
          <button data-ribbon="organize" type="button">Organizar</button>
          <button data-ribbon="models" type="button">Modelos</button>
          <button data-ribbon="ai" type="button">IA</button>
        </div>
        <div class="ribbon-panels">
          <section class="ribbon-panel active" data-panel="home">
            <div class="tool-group"><small>Fonte</small><div><select id="fontName"><option>Arial</option><option>Calibri</option><option>Times New Roman</option><option>Georgia</option><option>Verdana</option></select><select id="fontSize"><option value="2">10</option><option value="3" selected>12</option><option value="4">14</option><option value="5">18</option><option value="6">24</option></select></div></div>
            <div class="tool-group"><small>Estilo</small><div><button data-cmd="bold"><b>B</b></button><button data-cmd="italic"><i>I</i></button><button data-cmd="underline"><u>U</u></button><button data-cmd="strikeThrough"><s>S</s></button></div></div>
            <div class="tool-group"><small>Parágrafo</small><div><button data-cmd="justifyLeft">≡←</button><button data-cmd="justifyCenter">≡</button><button data-cmd="justifyRight">→≡</button><button data-cmd="justifyFull">☰</button><button data-cmd="insertUnorderedList">• Lista</button><button data-cmd="insertOrderedList">1. Lista</button><select id="lineHeight"><option value="1">1,0</option><option value="1.15">1,15</option><option value="1.5" selected>1,5</option><option value="2">2,0</option></select></div></div>
            <div class="tool-group"><small>Ações</small><div><button data-cmd="undo">↶</button><button data-cmd="redo">↷</button><button id="resetFormat">Arial 12</button></div></div>
          </section>
          <section class="ribbon-panel" data-panel="insert">
            <div class="tool-group"><small>Elementos</small><div><button id="insertImageBtn">🖼 Imagem</button><input id="editorImageInput" type="file" accept="image/*" hidden /><button id="insertTextboxBtn">▣ Caixa de texto</button><button id="insertAnswerLinesBtn">≣ Linhas de resposta</button><button id="insertTableBtn">▦ Tabela</button></div></div>
            <div class="tool-group"><small>Páginas</small><div><button id="addPageBtn">＋ Página</button><button id="duplicatePageBtn">⧉ Duplicar página</button><button id="deletePageBtn">🗑 Página</button></div></div>
          </section>
          <section class="ribbon-panel" data-panel="layout">
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

      <div class="ruler-shell"><div class="ruler-label">Régua</div><div class="ruler" id="ruler"><div id="rulerTicks" class="ruler-ticks"></div><button id="leftMarginHandle" class="margin-handle left-handle" type="button">▼</button><button id="rightMarginHandle" class="margin-handle right-handle" type="button">▼</button></div></div>

      <div class="document-wrap" id="documentWrap"><div id="pagesMount" class="pages-mount"></div><div class="hint">Clique em uma página para ativá-la. Retrato e Paisagem podem coexistir no mesmo documento.</div></div>
    </main>
  </div>
</div>
<div id="toast" class="toast" role="status" aria-live="polite"></div>

<dialog id="previewDialog" class="modal preview-modal"><div class="modal-head"><div><strong>Prévia</strong><small>Documento atual</small></div><button data-close="previewDialog">✕</button></div><div class="preview-stage"><div id="previewMount"></div></div><div class="modal-actions"><button class="btn" data-close="previewDialog">Voltar</button><button class="btn primary" id="printBtn">Imprimir</button></div></dialog>

<dialog id="libraryDialog" class="modal"><div class="modal-head"><div><strong>Biblioteca</strong><small>Banco de atividades</small></div><button data-close="libraryDialog">✕</button></div><div class="library-tools"><input id="librarySearch" placeholder="Pesquisar título, série ou disciplina" /><select id="libraryComponentFilter"><option value="all">Todos</option><option value="english">Língua Inglesa</option><option value="life-project">Projeto de Vida</option></select></div><div id="libraryList" class="card-list"></div><div class="modal-actions"><button class="btn" data-close="libraryDialog">Fechar</button></div></dialog>

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
  $<HTMLInputElement>('showPersonalLogo').checked = activity.showPersonalLogo;
  $<HTMLInputElement>('showPageNumbers').checked = activity.showPageNumbers;
};

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
    item.addEventListener('pointerdown', () => { selectedObjectId = obj.id; renderPages(); });
    item.querySelector<HTMLElement>('[data-drag]')?.addEventListener('pointerdown', e => startObjectDrag(e, obj.id, pageEl, dims.width, dims.height));
    item.querySelector<HTMLElement>('.resize-handle')?.addEventListener('pointerdown', e => startObjectResize(e, obj.id, pageEl, dims.width, dims.height));
    item.querySelector<HTMLButtonElement>('[data-front]')?.addEventListener('click', e => { e.stopPropagation(); obj.z = Math.max(0,...activity.objects.map(o=>o.z))+1; renderPages(); scheduleSave(); });
    item.querySelector<HTMLButtonElement>('[data-delete]')?.addEventListener('click', e => { e.stopPropagation(); activity.objects = activity.objects.filter(o=>o.id!==obj.id); selectedObjectId = null; renderPages(); scheduleSave(); });
    item.querySelector<HTMLButtonElement>('[data-border]')?.addEventListener('click', e => { e.stopPropagation(); obj.border = !obj.border; renderPages(); scheduleSave(); });
    const text = item.querySelector<HTMLElement>('.textbox-content'); if (text) { text.style.border = obj.border ? '1px solid #111827' : '1px solid transparent'; text.addEventListener('input', () => { obj.html = text.innerHTML; scheduleSave(); }); }
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
  pagesMount.innerHTML = '';
  activity.pages.forEach((p, index) => {
    const dims = pageDims(p.orientation);
    const page = document.createElement('section');
    page.className = `page ${p.orientation}${p.id === activePageId ? ' active-page' : ''}`;
    page.dataset.pageId = p.id;
    page.style.setProperty('--page-width', `${dims.width}mm`); page.style.setProperty('--page-height', `${dims.height}mm`);
    page.style.setProperty('--page-margin-top', `${activity.margins.top}mm`); page.style.setProperty('--page-margin-right', `${activity.margins.right}mm`); page.style.setProperty('--page-margin-bottom', `${activity.margins.bottom}mm`); page.style.setProperty('--page-margin-left', `${activity.margins.left}mm`);
    const isFirst = index === 0; const isLast = index === activity.pages.length - 1;
    page.innerHTML = `<div class="page-flow">${isFirst ? headerHtml() : ''}<div class="editor cols-${p.columns}" data-editor-page="${p.id}" contenteditable="true" spellcheck="true">${p.html}</div></div><div class="floating-layer"></div>${activity.showPageNumbers ? `<div class="page-number">${index+1}</div>` : ''}${isLast && activity.showPersonalLogo && activity.personalLogoDataUrl ? `<img class="personal-logo" src="${activity.personalLogoDataUrl}" alt="Logo do professor">` : ''}`;
    page.addEventListener('pointerdown', () => { activePageId = p.id; document.querySelectorAll('.page').forEach(x=>x.classList.remove('active-page')); page.classList.add('active-page'); updateRulerHandles(); });
    page.querySelectorAll<HTMLElement>('.editable-header').forEach(el => el.addEventListener('input', () => {
      const key = el.dataset.header as 'school'|'teacher'|'subject'|'grade'|'title'; if (!key) return; (activity as any)[key] = el.textContent?.trim() || ''; renderSidebar(); scheduleSave();
    }));
    const editor = page.querySelector<HTMLDivElement>('[data-editor-page]')!;
    editor.addEventListener('focus', () => { activePageId = p.id; });
    editor.addEventListener('input', () => { p.html = editor.innerHTML; scheduleSave(); window.setTimeout(() => rebalanceOverflow(p.id), 0); });
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
      if (!node) break;
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
  const first = list[0]; const firstSig = first ? JSON.stringify({title:first.activity.title,pages:first.activity.pages,objects:first.activity.objects,margins:first.activity.margins,answerKeyHtml:first.activity.answerKeyHtml,logo:first.activity.logoDataUrl,personal:first.activity.personalLogoDataUrl}) : '';
  if (sig === firstSig) return; list.unshift({ id:newId(), savedAt:nowIso(), activity:structuredClone(item) }); setHistory(list);
};
const saveRemote = async (payload: Activity) => { try { const r=await fetch('/.netlify/functions/save-activity',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)}); return r.ok; } catch { return false; } };
const persist = async () => {
  activity.updatedAt = nowIso(); activity.content = activity.pages.map(p=>p.html).join('<hr class="soft-break">');
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(activity)); } catch { toast('Armazenamento local cheio.'); }
  upsertLocalLibrary(activity); addHistorySnapshot(activity); status.textContent='Salvo localmente'; status.className='status saved';
  if (navigator.onLine) { const ok = await saveRemote(activity); status.textContent = ok ? 'Sincronizado' : 'Salvo localmente'; status.className = ok ? 'status synced' : 'status saved'; }
  renderPreview();
};
function scheduleSave(){ status.textContent='Salvando…'; status.className='status saving'; window.clearTimeout(saveTimer); saveTimer=window.setTimeout(()=>void persist(),700); }

Object.values(inputs).forEach(input => { if (input===inputs.component) return; input.addEventListener('input',()=>{ activity.school=inputs.school.value; activity.teacher=inputs.teacher.value; activity.subject=inputs.subject.value; activity.grade=inputs.grade.value; activity.title=inputs.title.value; renderPages(); scheduleSave(); }); });
inputs.component.addEventListener('change',()=>{ const prev=activity.component; const next=inputs.component.value as ComponentKind; activity.component=next; if(activity.subject===profileDefaults[prev].subject) activity.subject=profileDefaults[next].subject; if(activity.title===profileDefaults[prev].title) activity.title=profileDefaults[next].title; render(); scheduleSave(); });
const clampMargin=(v:number)=>Math.min(35,Math.max(5,Number.isFinite(v)?v:14));
Object.entries(marginInputs).forEach(([key,input])=>input.addEventListener('input',()=>{ activity.margins[key as keyof Margins]=clampMargin(Number(input.value)); renderPages(); scheduleSave(); }));
$<HTMLInputElement>('showPersonalLogo').addEventListener('change',e=>{activity.showPersonalLogo=(e.target as HTMLInputElement).checked;renderPages();scheduleSave();});
$<HTMLInputElement>('showPageNumbers').addEventListener('change',e=>{activity.showPageNumbers=(e.target as HTMLInputElement).checked;renderPages();scheduleSave();});

const fileToDataUrl = (file: File) => new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result||''));reader.onerror=()=>reject(reader.error||new Error('Falha ao ler arquivo.'));reader.readAsDataURL(file);});
$<HTMLInputElement>('logoInput').addEventListener('change',async e=>{const f=(e.target as HTMLInputElement).files?.[0];if(!f)return;activity.logoDataUrl=await fileToDataUrl(f);renderPages();scheduleSave();});
$<HTMLInputElement>('personalLogoInput').addEventListener('change',async e=>{const f=(e.target as HTMLInputElement).files?.[0];if(!f)return;activity.personalLogoDataUrl=await fileToDataUrl(f);activity.showPersonalLogo=true;render();scheduleSave();});

const activeEditor = () => pagesMount.querySelector<HTMLDivElement>(`[data-editor-page="${CSS.escape(activePageId)}"]`);
const execCmd = (cmd:string,value?:string) => { const ed=activeEditor(); if(!ed)return; ed.focus(); document.execCommand(cmd,false,value); const p=activePage(); if(p) p.html=ed.innerHTML; scheduleSave(); };
document.querySelectorAll<HTMLButtonElement>('[data-cmd]').forEach(btn=>btn.addEventListener('click',()=>execCmd(btn.dataset.cmd||'')));
$<HTMLSelectElement>('fontName').addEventListener('change',e=>execCmd('fontName',(e.target as HTMLSelectElement).value));
$<HTMLSelectElement>('fontSize').addEventListener('change',e=>execCmd('fontSize',(e.target as HTMLSelectElement).value));
$<HTMLSelectElement>('lineHeight').addEventListener('change',e=>{const ed=activeEditor();if(!ed)return;const v=(e.target as HTMLSelectElement).value;const sel=window.getSelection();let node:Node|null=sel?.anchorNode||null;if(node?.nodeType===Node.TEXT_NODE)node=node.parentNode;const el=node instanceof HTMLElement?node.closest('p,div,li') as HTMLElement|null:null;(el||ed).style.lineHeight=v;activePage().html=ed.innerHTML;scheduleSave();});
$('resetFormat').addEventListener('click',()=>{execCmd('removeFormat');execCmd('fontName','Arial');execCmd('fontSize','3');execCmd('justifyFull');});

const applySelectionColumns = (cols:2|3) => { const ed=activeEditor();const sel=window.getSelection();if(!ed||!sel||!sel.rangeCount||sel.isCollapsed){toast('Selecione primeiro o trecho que ficará em colunas.');return;}const range=sel.getRangeAt(0);if(!ed.contains(range.commonAncestorContainer)){toast('A seleção precisa estar na página ativa.');return;}const frag=range.extractContents();const wrap=document.createElement('div');wrap.className=`column-section cols-${cols}`;wrap.appendChild(frag);range.insertNode(wrap);sel.removeAllRanges();activePage().html=ed.innerHTML;scheduleSave();};
document.querySelectorAll<HTMLButtonElement>('[data-selection-cols]').forEach(btn=>btn.addEventListener('click',()=>applySelectionColumns(Number(btn.dataset.selectionCols) as 2|3)));
document.querySelectorAll<HTMLButtonElement>('[data-page-cols]').forEach(btn=>btn.addEventListener('click',()=>{const p=activePage();if(!p)return;p.columns=Number(btn.dataset.pageCols) as 1|2|3;renderPages();scheduleSave();}));

const sortSelection = (direction:'az'|'za'|'num') => { const ed=activeEditor();const sel=window.getSelection();if(!ed||!sel||!sel.rangeCount||sel.isCollapsed){toast('Selecione uma lista ou linhas de texto.');return;}const range=sel.getRangeAt(0);if(!ed.contains(range.commonAncestorContainer)){toast('A seleção precisa estar na página ativa.');return;}const text=sel.toString();const lines=text.split(/\n+/).map(s=>s.trim()).filter(Boolean);if(lines.length<2){toast('Selecione pelo menos duas linhas.');return;}if(direction==='num')lines.sort((a,b)=>(parseFloat(a)||0)-(parseFloat(b)||0));else lines.sort((a,b)=>a.localeCompare(b,'pt-BR',{numeric:true,sensitivity:'base'})*(direction==='az'?1:-1));range.deleteContents();const frag=document.createDocumentFragment();lines.forEach(line=>{const p=document.createElement('p');p.textContent=line;frag.appendChild(p);});range.insertNode(frag);sel.removeAllRanges();activePage().html=ed.innerHTML;scheduleSave();};
$('sortAzBtn').addEventListener('click',()=>sortSelection('az'));$('sortZaBtn').addEventListener('click',()=>sortSelection('za'));$('sortNumericBtn').addEventListener('click',()=>sortSelection('num'));

const addFloatingImage=(src:string,name='Imagem',pageId=activePageId)=>{const p=activity.pages.find(x=>x.id===pageId)||activePage();if(!p)return;const d=pageDims(p.orientation);const obj:FloatingObject={id:newId(),pageId:p.id,type:'image',x:Math.max(15,d.width/2-30),y:85,width:60,height:45,src,z:Math.max(0,...activity.objects.map(o=>o.z))+1};activity.objects.push(obj);selectedObjectId=obj.id;renderPages();scheduleSave();toast(`${name} inserida.`);};
const addTextbox=()=>{const p=activePage();if(!p)return;const d=pageDims(p.orientation);const obj:FloatingObject={id:newId(),pageId:p.id,type:'textbox',x:Math.max(15,d.width/2-38),y:95,width:76,height:25,html:'Digite aqui',border:false,z:Math.max(0,...activity.objects.map(o=>o.z))+1};activity.objects.push(obj);selectedObjectId=obj.id;renderPages();scheduleSave();};
$('insertImageBtn').addEventListener('click',()=>$<HTMLInputElement>('editorImageInput').click());
$<HTMLInputElement>('editorImageInput').addEventListener('change',async e=>{const i=e.target as HTMLInputElement;const f=i.files?.[0];if(!f)return;addFloatingImage(await fileToDataUrl(f),f.name);i.value='';});
$('insertTextboxBtn').addEventListener('click',addTextbox);
$('insertAnswerLinesBtn').addEventListener('click',()=>execCmd('insertHTML','<p class="answer-lines">________________________________________________________________________________<br>________________________________________________________________________________<br>________________________________________________________________________________</p>'));
$('insertTableBtn').addEventListener('click',()=>execCmd('insertHTML','<table class="editor-table"><tbody><tr><td>Campo 1</td><td>Campo 2</td></tr><tr><td>&nbsp;</td><td>&nbsp;</td></tr></tbody></table><p></p>'));

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
const rulerTicks=$<HTMLDivElement>('rulerTicks');rulerTicks.innerHTML=Array.from({length:31},(_,i)=>`<span style="left:${(i/30)*100}%">${i}</span>`).join('');
function updateRulerHandles(){const p=activePage();if(!p)return;const d=pageDims(p.orientation);$<HTMLButtonElement>('leftMarginHandle').style.left=`${(activity.margins.left/d.width)*100}%`;$<HTMLButtonElement>('rightMarginHandle').style.left=`${((d.width-activity.margins.right)/d.width)*100}%`;}
const startMarginDrag=(event:PointerEvent,side:'left'|'right')=>{event.preventDefault();const ruler=$<HTMLDivElement>('ruler');const rect=ruler.getBoundingClientRect();const d=pageDims(activePage()?.orientation||'portrait');const move=(e:PointerEvent)=>{const x=Math.max(0,Math.min(rect.width,e.clientX-rect.left));const mm=(x/rect.width)*d.width;if(side==='left')activity.margins.left=clampMargin(Math.round(mm));else activity.margins.right=clampMargin(Math.round(d.width-mm));renderSidebar();renderPages();};const up=()=>{window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',up);scheduleSave();};window.addEventListener('pointermove',move);window.addEventListener('pointerup',up);};
$('leftMarginHandle').addEventListener('pointerdown',e=>startMarginDrag(e,'left'));$('rightMarginHandle').addEventListener('pointerdown',e=>startMarginDrag(e,'right'));

// Importação: PDF preserva número e orientação das páginas; DOCX tenta preservar HTML e divide por quebras explícitas.
const extractPdfCandidate=async(file:File):Promise<ImportCandidate>=>{const data=new Uint8Array(await file.arrayBuffer());const pdf=await getDocument({data}).promise;const pages:ImportCandidate['pages']=[];for(let pageNo=1;pageNo<=pdf.numPages;pageNo++){const pg=await pdf.getPage(pageNo);const viewport=pg.getViewport({scale:1});const orientation:Orientation=viewport.width>viewport.height?'landscape':'portrait';const text=await pg.getTextContent();const rows=new Map<number,Array<{x:number,str:string}>>();for(const raw of text.items as any[]){if(!raw||typeof raw.str!=='string')continue;const y=Math.round(Number(raw.transform?.[5]||0)/3)*3;const x=Number(raw.transform?.[4]||0);const row=rows.get(y)||[];row.push({x,str:raw.str});rows.set(y,row);}const lines=[...rows.entries()].sort((a,b)=>b[0]-a[0]).map(([,items])=>items.sort((a,b)=>a.x-b.x).map(i=>i.str).join(' ').replace(/\s+/g,' ').trim()).filter(Boolean);const midpoint=viewport.width/2;let left=0,right=0;for(const raw of text.items as any[]){const x=Number(raw?.transform?.[4]||0);if(x<midpoint*.9)left++;if(x>midpoint*1.1)right++;}const columns:1|2|3=(left>10&&right>10)?2:1;pages.push({html:lines.map(line=>`<p>${escapeHtml(line)}</p>`).join('')||'<p>PDF sem texto extraível. Use Inserir imagem para adicionar a página escaneada.</p>',orientation,columns});}return{sourceName:file.name,pages};};
const extractDocxCandidate=async(file:File):Promise<ImportCandidate>=>{const arrayBuffer=await file.arrayBuffer();const result=await mammoth.convertToHtml({arrayBuffer},{convertImage:mammoth.images.imgElement(async image=>({src:`data:${image.contentType};base64,${await image.read('base64')}`}))});const html=sanitizeImportedHtml(result.value||'<p>Documento sem conteúdo reconhecível.</p>');const doc=new DOMParser().parseFromString(html,'text/html');const chunks:string[]=[];let current=document.createElement('div');[...doc.body.childNodes].forEach(node=>{const el=node instanceof HTMLElement?node:null;const explicit=el?.style?.breakBefore==='page'||el?.style?.pageBreakBefore==='always'||el?.classList.contains('page-break');if(explicit&&current.innerHTML.trim()){chunks.push(current.innerHTML);current=document.createElement('div');}current.appendChild(node.cloneNode(true));});if(current.innerHTML.trim())chunks.push(current.innerHTML);return{sourceName:file.name,pages:(chunks.length?chunks:[html]).map(h=>({html:h,orientation:'portrait' as Orientation,columns:1 as const}))};};
const analyzeImportWithAI=async(candidate:ImportCandidate,component:ComponentKind)=>{try{const res=await fetch('/.netlify/functions/analyze-import',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({component,sourceName:candidate.sourceName,pages:candidate.pages.map(p=>({orientation:p.orientation,columns:p.columns||1,text:stripHtml(p.html).slice(0,9000),html:p.html.slice(0,16000)}))})});const json=await res.json().catch(()=>({}));if(!res.ok||!json?.ok||!Array.isArray(json.pages))return candidate;return{sourceName:candidate.sourceName,pages:json.pages.map((p:any)=>({html:sanitizeImportedHtml(String(p.html||'')),orientation:p.orientation==='landscape'?'landscape':'portrait',columns:p.columns===2||p.columns===3?p.columns:1}))};}catch{return candidate;}};
const importCandidateToActivity=(candidate:ImportCandidate):Activity=>{const created=nowIso();return normalizeActivity({...activity,id:newId(),title:stripExtension(candidate.sourceName),sourceName:candidate.sourceName,pages:candidate.pages.map(p=>normalizePage({html:p.html,orientation:p.orientation,columns:p.columns||1})),objects:[],answerKeyHtml:'',createdAt:created,updatedAt:created});};
$<HTMLInputElement>('fileInput').addEventListener('change',async e=>{const input=e.target as HTMLInputElement;const files=[...(input.files||[])];if(!files.length||importBusy)return;importBusy=true;const label=$('importStatus');const imported:Activity[]=[];try{for(let i=0;i<files.length;i++){const file=files[i];label.textContent=`Lendo ${i+1}/${files.length}: ${file.name}…`;const ext=file.name.toLowerCase().split('.').pop()||'';let candidate:ImportCandidate;if(ext==='pdf'||file.type==='application/pdf')candidate=await extractPdfCandidate(file);else if(ext==='docx')candidate=await extractDocxCandidate(file);else if(ext==='doc')throw new Error('O formato .DOC antigo precisa ser salvo como .DOCX ou PDF.');else throw new Error('Formato não suportado.');if($<HTMLInputElement>('smartImport').checked){label.textContent=`Remontando ${file.name} de forma inteligente…`;candidate=await analyzeImportWithAI(candidate,activity.component);}const item=importCandidateToActivity(candidate);imported.push(item);upsertLocalLibrary(item);if(navigator.onLine)void saveRemote(item);}if(imported[0]){await persist();activity=imported[0];activePageId=activity.pages[0].id;selectedObjectId=null;render();await persist();label.textContent=`${imported.length} atividade(s) importada(s). A primeira está aberta.`;toast('Importação concluída.');}}catch(err){label.textContent=err instanceof Error?err.message:'Falha ao importar.';toast(label.textContent);}finally{importBusy=false;input.value='';}});

// PDF multipágina misto (portrait/landscape)
const pageToCanvas=async(el:HTMLElement)=>{el.classList.add('exporting');try{return await html2canvas(el,{scale:2,useCORS:true,backgroundColor:'#ffffff'});}finally{el.classList.remove('exporting');}};
const buildAnswerKeyPage=()=>{const page=document.createElement('section');page.className='page portrait answer-key-page';page.style.setProperty('--page-width','210mm');page.style.setProperty('--page-height','297mm');page.style.setProperty('--page-margin-top','16mm');page.style.setProperty('--page-margin-right','16mm');page.style.setProperty('--page-margin-bottom','18mm');page.style.setProperty('--page-margin-left','16mm');page.innerHTML=`<div class="page-flow"><div class="key-title">GABARITO — ${escapeHtml(activity.title)}</div><div class="key-meta">${escapeHtml(activity.subject)} • ${escapeHtml(activity.grade)}</div><div class="key-content">${activity.answerKeyHtml ? sanitizeImportedHtml(activity.answerKeyHtml) : '<p>Gabarito ainda não preenchido.</p>'}</div></div>`;document.body.appendChild(page);return page;};
const makePdfBlob=async(mode:PdfMode='activity')=>{const sourcePages=[...pagesMount.querySelectorAll<HTMLElement>('.page')];const targets:HTMLElement[]=[];let keyPage:HTMLElement|null=null;if(mode!=='key')targets.push(...sourcePages);if(mode!=='activity'){keyPage=buildAnswerKeyPage();targets.push(keyPage);}if(!targets.length)throw new Error('Nenhuma página para exportar.');let pdf:jsPDF|null=null;for(let i=0;i<targets.length;i++){const el=targets[i];const orientation:Orientation=el.classList.contains('landscape')?'landscape':'portrait';const dims=pageDims(orientation);const canvas=await pageToCanvas(el);const data=canvas.toDataURL('image/jpeg',0.97);if(!pdf)pdf=new jsPDF(orientation==='landscape'?'l':'p','mm','a4');else pdf.addPage('a4',orientation==='landscape'?'l':'p');pdf.addImage(data,'JPEG',0,0,dims.width,dims.height);}keyPage?.remove();return pdf!.output('blob');};
const downloadBlob=(blob:Blob,filename:string)=>{const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();window.setTimeout(()=>URL.revokeObjectURL(url),1200);};
$('pdfMenuBtn').addEventListener('click',()=>showDialog('pdfDialog'));
document.querySelectorAll<HTMLButtonElement>('[data-pdf-mode]').forEach(btn=>btn.addEventListener('click',async()=>{const mode=btn.dataset.pdfMode as PdfMode;closeDialog('pdfDialog');toast('Gerando PDF…');try{const blob=await makePdfBlob(mode);const suffix=mode==='activity'?'':mode==='key'?' - Gabarito':' - Com Gabarito';downloadBlob(blob,`${activity.title||'atividade'}${suffix}.pdf`);toast('PDF gerado.');}catch(e){toast(e instanceof Error?e.message:'Falha ao gerar PDF.');}}));
$('shareBtn').addEventListener('click',async()=>{const blob=await makePdfBlob('activity');const file=new File([blob],`${activity.title||'atividade'}.pdf`,{type:'application/pdf'});if(navigator.share&&(!navigator.canShare||navigator.canShare({files:[file]}))){try{await navigator.share({title:activity.title,text:'Atividade em PDF',files:[file]});return;}catch{}}downloadBlob(blob,file.name);toast('PDF baixado para compartilhar.');});
$('previewBtn').addEventListener('click',()=>{renderPreview();showDialog('previewDialog');});$('printBtn').addEventListener('click',()=>window.print());

// Gabarito
$('answerKeyBtn').addEventListener('click',()=>{$<HTMLTextAreaElement>('answerKeyEditor').value=stripHtml(activity.answerKeyHtml).replace(/\s*(?=\d+\.)/g,'\n').trim()||stripHtml(activity.answerKeyHtml);showDialog('answerKeyDialog');});
$('saveAnswerKeyBtn').addEventListener('click',()=>{const value=$<HTMLTextAreaElement>('answerKeyEditor').value;activity.answerKeyHtml=value.split('\n').filter(Boolean).map(line=>`<p>${escapeHtml(line)}</p>`).join('');scheduleSave();closeDialog('answerKeyDialog');toast('Gabarito salvo.');});

// Nova atividade
$('newActivityBtn').addEventListener('click',async()=>{if(!confirm('Criar uma nova atividade? A atual continuará salva na biblioteca.'))return;await persist();const next=blankActivity(activity.component);next.school=activity.school;next.teacher=activity.teacher;next.grade=activity.grade;next.logoDataUrl=activity.logoDataUrl;next.personalLogoDataUrl=activity.personalLogoDataUrl;next.showPersonalLogo=activity.showPersonalLogo;next.showPageNumbers=activity.showPageNumbers;activity=next;activePageId=activity.pages[0].id;render();await persist();});

// Biblioteca
const mergeRemoteLibrary=async(local:Activity[])=>{if(!navigator.onLine)return local;try{const res=await fetch('/.netlify/functions/list-activities');if(!res.ok)return local;const json=await res.json();const remote=Array.isArray(json?.data)?json.data.map(normalizeActivity):[];const map=new Map<string,Activity>();[...remote,...local].forEach((i:Activity)=>i?.id&&map.set(i.id,i));const merged=[...map.values()].sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt));setLibrary(merged);return merged;}catch{return local;}};
let libraryCache:Activity[]=[];
const paintLibrary=()=>{const q=$<HTMLInputElement>('librarySearch').value.trim().toLocaleLowerCase('pt-BR');const filter=$<HTMLSelectElement>('libraryComponentFilter').value;const list=libraryCache.filter(i=>(filter==='all'||i.component===filter)&&(!q||`${i.title} ${i.grade} ${i.subject}`.toLocaleLowerCase('pt-BR').includes(q)));const mount=$('libraryList');if(!list.length){mount.innerHTML='<div class="empty">Nenhuma atividade encontrada.</div>';return;}mount.innerHTML=list.map(i=>`<article class="library-card"><div><strong>${escapeHtml(i.title)}</strong><small>${escapeHtml(i.subject)} • ${escapeHtml(i.grade)} • ${i.pages.length} pág.</small></div><div class="card-actions"><button data-open="${i.id}">Abrir</button><button data-copy="${i.id}">Duplicar</button><button class="danger" data-delete="${i.id}">Excluir</button></div></article>`).join('');mount.querySelectorAll<HTMLButtonElement>('[data-open]').forEach(b=>b.addEventListener('click',async()=>{const item=libraryCache.find(i=>i.id===b.dataset.open);if(!item)return;await persist();activity=structuredClone(item);activePageId=activity.pages[0].id;selectedObjectId=null;render();closeDialog('libraryDialog');await persist();}));mount.querySelectorAll<HTMLButtonElement>('[data-copy]').forEach(b=>b.addEventListener('click',()=>{const item=libraryCache.find(i=>i.id===b.dataset.copy);if(!item)return;const copy=structuredClone(item);copy.id=newId();copy.title=`${copy.title} — Cópia`;copy.createdAt=nowIso();copy.updatedAt=nowIso();const pageMap=new Map<string,string>();copy.pages=copy.pages.map(p=>{const id=newId();pageMap.set(p.id,id);return{...p,id};});copy.objects=copy.objects.map(o=>({...o,id:newId(),pageId:pageMap.get(o.pageId)||copy.pages[0].id}));upsertLocalLibrary(copy);libraryCache=getLibrary();paintLibrary();}));mount.querySelectorAll<HTMLButtonElement>('[data-delete]').forEach(b=>b.addEventListener('click',async()=>{const id=b.dataset.delete||'';if(!confirm('Excluir esta atividade?'))return;libraryCache=libraryCache.filter(i=>i.id!==id);setLibrary(libraryCache);paintLibrary();if(navigator.onLine)try{await fetch('/.netlify/functions/delete-activity',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id})});}catch{}}));};
const renderLibrary=async()=>{libraryCache=await mergeRemoteLibrary(getLibrary());paintLibrary();};
$('libraryBtn').addEventListener('click',async()=>{showDialog('libraryDialog');await renderLibrary();});$('librarySearch').addEventListener('input',paintLibrary);$('libraryComponentFilter').addEventListener('change',paintLibrary);

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
const applyLayoutModel=(m:Pick<LayoutModel,'component'|'orientation'|'columns'|'pageCount'> & Partial<LayoutModel>)=>{activity.component=m.component;activity.subject=profileDefaults[m.component].subject;const first=activity.pages[0]?.html||'<p><br></p>';activity.pages=Array.from({length:m.pageCount||1},(_,i)=>blankPage(m.orientation,m.columns,i===0?first:'<p><br></p>'));activePageId=activity.pages[0].id;if(m.margins)activity.margins={...m.margins};if(typeof m.showPageNumbers==='boolean')activity.showPageNumbers=m.showPageNumbers;if(typeof m.showPersonalLogo==='boolean')activity.showPersonalLogo=m.showPersonalLogo;render();scheduleSave();};
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
const renderHistory=()=>{const items=getHistory().filter(x=>x.activity.id===activity.id);const mount=$('historyList');if(!items.length){mount.innerHTML='<div class="empty">Ainda não há versões anteriores.</div>';return;}mount.innerHTML=items.map(i=>`<article class="history-card"><div><strong>${new Date(i.savedAt).toLocaleString('pt-BR')}</strong><small>${escapeHtml(i.activity.title)}</small></div><button data-restore="${i.id}">Restaurar</button></article>`).join('');mount.querySelectorAll<HTMLButtonElement>('[data-restore]').forEach(b=>b.addEventListener('click',async()=>{const v=getHistory().find(x=>x.id===b.dataset.restore);if(!v||!confirm('Restaurar esta versão?'))return;await persist();activity=structuredClone(v.activity);activePageId=activity.pages[0].id;render();await persist();closeDialog('historyDialog');}));};$('historyBtn').addEventListener('click',()=>{renderHistory();showDialog('historyDialog');});

// IA: criação completa + assistente de seleção
const openAi=()=>{$<HTMLSelectElement>('aiComponent').value=activity.component;$<HTMLInputElement>('aiGrade').value=activity.grade;$<HTMLSelectElement>('aiOrientation').value=activePage()?.orientation||'portrait';$<HTMLSelectElement>('aiColumns').value=String(activePage()?.columns||1);$<HTMLSelectElement>('aiPages').value=String(Math.min(4,Math.max(1,activity.pages.length)));$('aiStatus').textContent='A IA pode usar sua biblioteca para seguir seu padrão.';showDialog('aiDialog');};$('aiBtn').addEventListener('click',openAi);$('openAiRibbonBtn').addEventListener('click',openAi);
$<HTMLFormElement>('aiForm').addEventListener('submit',async e=>{e.preventDefault();const button=$<HTMLButtonElement>('aiGenerateBtn');const aiStatus=$('aiStatus');const component=$<HTMLSelectElement>('aiComponent').value as ComponentKind;const grade=$<HTMLInputElement>('aiGrade').value.trim();const topic=$<HTMLInputElement>('aiTopic').value.trim();const questionCount=Math.min(40,Math.max(1,Number($<HTMLInputElement>('aiQuestionCount').value)||8));const questionType=$<HTMLSelectElement>('aiQuestionType').value;const pageCount=Number($<HTMLSelectElement>('aiPages').value)||2;const orientation=$<HTMLSelectElement>('aiOrientation').value as Orientation;const columns=Number($<HTMLSelectElement>('aiColumns').value) as 1|2|3;const notes=$<HTMLTextAreaElement>('aiNotes').value.trim();const useLibrary=$<HTMLInputElement>('aiUseLibrary').checked;const includeKey=$<HTMLInputElement>('aiIncludeKey').checked;const references=useLibrary?getLibrary().filter(i=>i.component===component).slice(0,5).map(i=>({title:i.title,grade:i.grade,text:stripHtml(i.pages.map(p=>p.html).join(' ')).slice(0,3500),pageCount:i.pages.length,orientations:i.pages.map(p=>p.orientation),columns:i.pages.map(p=>p.columns)})):[];button.disabled=true;aiStatus.textContent='Gerando e diagramando a atividade…';try{const res=await fetch('/.netlify/functions/generate-activity',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({component,grade,topic,questionCount,questionType,notes,references,pageCount,orientation,columns,includeKey,layout:{margins:activity.margins,showPageNumbers:activity.showPageNumbers}})});const json=await res.json().catch(()=>({}));if(!res.ok||!json?.ok||!Array.isArray(json.pages))throw new Error(json?.error||'IA não configurada.');await persist();activity.component=component;activity.subject=profileDefaults[component].subject;activity.grade=grade||activity.grade;activity.title=String(json.title||profileDefaults[component].title);activity.pages=json.pages.slice(0,Math.max(1,pageCount)).map((p:any)=>normalizePage({html:sanitizeImportedHtml(String(p.html||'')),orientation:p.orientation==='landscape'?'landscape':orientation,columns:p.columns===2||p.columns===3?p.columns:columns}));while(activity.pages.length<pageCount)activity.pages.push(blankPage(orientation,columns,'<p><br></p>'));activity.objects=[];activity.answerKeyHtml=includeKey&&typeof json.answerKeyHtml==='string'?sanitizeImportedHtml(json.answerKeyHtml):'';activePageId=activity.pages[0].id;render();scheduleSave();closeDialog('aiDialog');toast('Atividade criada e diagramada.');}catch(err){aiStatus.textContent=err instanceof Error?err.message:'Falha ao gerar.';}finally{button.disabled=false;}});

const improveSelection=async(mode:'rewrite'|'similar')=>{const ed=activeEditor();const sel=window.getSelection();if(!ed||!sel||!sel.rangeCount||sel.isCollapsed){toast('Selecione primeiro o texto ou questão.');return;}const range=sel.getRangeAt(0);if(!ed.contains(range.commonAncestorContainer)){toast('Selecione um trecho da página ativa.');return;}const text=sel.toString().trim();if(!text)return;toast('Consultando a IA…');try{const res=await fetch('/.netlify/functions/assist-selection',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({component:activity.component,grade:activity.grade,mode,text})});const json=await res.json().catch(()=>({}));if(!res.ok||!json?.ok||typeof json.html!=='string')throw new Error(json?.error||'IA não configurada.');range.deleteContents();const frag=range.createContextualFragment(sanitizeImportedHtml(json.html));range.insertNode(frag);sel.removeAllRanges();activePage().html=ed.innerHTML;scheduleSave();toast('Trecho atualizado.');}catch(err){toast(err instanceof Error?err.message:'Falha na IA.');}};
$('aiRewriteBtn').addEventListener('click',()=>void improveSelection('rewrite'));$('aiSimilarBtn').addEventListener('click',()=>void improveSelection('similar'));

window.addEventListener('online',()=>void persist());window.addEventListener('beforeunload',()=>{try{localStorage.setItem(STORAGE_KEY,JSON.stringify(activity));}catch{}});
render();void persist();
