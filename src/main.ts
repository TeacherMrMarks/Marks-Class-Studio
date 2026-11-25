import './style.css';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import mammoth from 'mammoth';
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import defaultSchoolLogo from './logo-ione-v3.png?inline';

GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

type ComponentKind = 'english' | 'life-project';
type FloatingType = 'image' | 'textbox';

type FloatingObject = {
  id: string;
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

type Margins = { top: number; right: number; bottom: number; left: number };

type Activity = {
  id: string;
  component: ComponentKind;
  school: string;
  teacher: string;
  subject: string;
  grade: string;
  title: string;
  content: string;
  logoDataUrl?: string;
  sourceName?: string;
  tags?: string[];
  margins: Margins;
  objects: FloatingObject[];
  createdAt: string;
  updatedAt: string;
};

type HistoryItem = {
  id: string;
  savedAt: string;
  activity: Activity;
};

type ImageBankItem = {
  id: string;
  name: string;
  dataUrl: string;
  createdAt: string;
};

const STORAGE_KEY = 'marks-class-studio:draft:v3';
const LIBRARY_KEY = 'marks-class-studio:library:v3';
const HISTORY_KEY = 'marks-class-studio:history:v3';
const IMAGE_BANK_KEY = 'marks-class-studio:image-bank:v3';
const V2_STORAGE_KEY = 'marks-class-studio:draft:v2';
const V2_LIBRARY_KEY = 'marks-class-studio:library:v2';
const V2_HISTORY_KEY = 'marks-class-studio:history:v2';
const MAX_HISTORY = 25;
const MAX_LIBRARY = 120;
const MAX_IMAGE_BANK = 30;

const nowIso = () => new Date().toISOString();
const newId = () => crypto.randomUUID();

const profileDefaults: Record<ComponentKind, { subject: string; grade: string; title: string; short: string }> = {
  english: {
    subject: 'Língua Inglesa',
    grade: '1º Ano EM',
    title: 'ATIVIDADE DE LÍNGUA INGLESA / 2026',
    short: 'Língua Inglesa'
  },
  'life-project': {
    subject: 'Projeto de Vida',
    grade: '1º Ano EM',
    title: 'ATIVIDADE DE PROJETO DE VIDA / 2026',
    short: 'Projeto de Vida'
  }
};

const blankActivity = (component: ComponentKind = 'english'): Activity => ({
  id: newId(),
  component,
  school: 'ESCOLA ESTADUAL IONE SILVEIRA MENDES',
  teacher: 'Adeilson Marks',
  subject: profileDefaults[component].subject,
  grade: profileDefaults[component].grade,
  title: profileDefaults[component].title,
  content: component === 'english'
    ? '<p><strong>1.</strong> Digite aqui a primeira questão da atividade.</p><p><strong>A)</strong> Alternativa A<br><strong>B)</strong> Alternativa B<br><strong>C)</strong> Alternativa C<br><strong>D)</strong> Alternativa D</p>'
    : '<p><strong>1.</strong> Digite aqui a primeira questão de Projeto de Vida.</p><p>________________________________________________________________________________</p>',
  logoDataUrl: defaultSchoolLogo,
  margins: { top: 13, right: 14, bottom: 15, left: 14 },
  objects: [],
  tags: [],
  createdAt: nowIso(),
  updatedAt: nowIso()
});

const safeJson = <T>(value: string | null, fallback: T): T => {
  if (!value) return fallback;
  try { return JSON.parse(value) as T; } catch { return fallback; }
};

const normalizeActivity = (raw: Partial<Activity>): Activity => {
  const component: ComponentKind = raw.component === 'life-project' ? 'life-project' : 'english';
  const base = blankActivity(component);
  return {
    ...base,
    ...raw,
    component,
    id: raw.id || base.id,
    createdAt: raw.createdAt || base.createdAt,
    updatedAt: raw.updatedAt || base.updatedAt,
    margins: { ...base.margins, ...(raw.margins || {}) },
    objects: Array.isArray(raw.objects) ? raw.objects : [],
    tags: Array.isArray(raw.tags) ? raw.tags : [],
    logoDataUrl: raw.logoDataUrl || base.logoDataUrl
  };
};

const migrateV2IfNeeded = () => {
  if (!localStorage.getItem(STORAGE_KEY) && localStorage.getItem(V2_STORAGE_KEY)) {
    const oldDraft = safeJson<Partial<Activity>>(localStorage.getItem(V2_STORAGE_KEY), {});
    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizeActivity(oldDraft)));
  }
  if (!localStorage.getItem(LIBRARY_KEY) && localStorage.getItem(V2_LIBRARY_KEY)) {
    const oldLibrary = safeJson<Partial<Activity>[]>(localStorage.getItem(V2_LIBRARY_KEY), []);
    localStorage.setItem(LIBRARY_KEY, JSON.stringify(oldLibrary.map(normalizeActivity)));
  }
  if (!localStorage.getItem(HISTORY_KEY) && localStorage.getItem(V2_HISTORY_KEY)) {
    const oldHistory = safeJson<Array<{ id: string; savedAt: string; activity: Partial<Activity> }>>(localStorage.getItem(V2_HISTORY_KEY), []);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(oldHistory.map(item => ({ ...item, activity: normalizeActivity(item.activity) }))));
  }
};

migrateV2IfNeeded();

const loadLocal = (): Activity => normalizeActivity(safeJson<Partial<Activity>>(localStorage.getItem(STORAGE_KEY), {}));
const getLibrary = (): Activity[] => safeJson<Partial<Activity>[]>(localStorage.getItem(LIBRARY_KEY), []).map(normalizeActivity);
const setLibrary = (items: Activity[]) => {
  try { localStorage.setItem(LIBRARY_KEY, JSON.stringify(items.slice(0, MAX_LIBRARY))); } catch { /* remote save still works */ }
};
const getHistory = (): HistoryItem[] => safeJson<HistoryItem[]>(localStorage.getItem(HISTORY_KEY), []).map(item => ({ ...item, activity: normalizeActivity(item.activity) }));
const setHistory = (items: HistoryItem[]) => {
  try { localStorage.setItem(HISTORY_KEY, JSON.stringify(items.slice(0, MAX_HISTORY))); } catch { /* ignore */ }
};
const getImageBank = (): ImageBankItem[] => safeJson<ImageBankItem[]>(localStorage.getItem(IMAGE_BANK_KEY), []);
const setImageBank = (items: ImageBankItem[]) => {
  try { localStorage.setItem(IMAGE_BANK_KEY, JSON.stringify(items.slice(0, MAX_IMAGE_BANK))); } catch { toast('Banco de imagens local cheio. Exclua imagens antigas.'); }
};

let activity = loadLocal();
let saveTimer: number | undefined;
let importBusy = false;
let selectedObjectId: string | null = null;
let toastTimer: number | undefined;

const app = document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML = `
<div class="app">
  <header class="topbar">
    <div class="brand"><span class="brand-mark">TM</span><div><strong>Marks Class Studio</strong><small>Editor pedagógico • biblioteca • criação inteligente • V3</small></div></div>
    <span id="saveStatus" class="status saved">Salvo localmente</span>
    <div class="actions">
      <button class="btn ghost" id="previewBtn" type="button">Visualizar</button>
      <button class="btn primary" id="pdfBtn" type="button">Gerar PDF</button>
      <button class="btn" id="shareBtn" type="button">Compartilhar</button>
    </div>
  </header>

  <div class="workspace">
    <aside class="sidebar">
      <div class="sidebar-title"><h3>Documento</h3><button class="mini primary-mini" id="newActivityBtn" type="button">＋ Nova</button></div>

      <div class="field">
        <label>Componente</label>
        <select id="componentInput">
          <option value="english">Língua Inglesa</option>
          <option value="life-project">Projeto de Vida</option>
        </select>
      </div>
      <div class="field"><label>Escola</label><input id="schoolInput" /></div>
      <div class="field"><label>Professor</label><input id="teacherInput" /></div>
      <div class="field"><label>Disciplina</label><input id="subjectInput" /></div>
      <div class="field"><label>Série / turma</label><input id="gradeInput" /></div>
      <div class="field"><label>Título do cabeçalho</label><input id="titleInput" /></div>
      <div class="field"><label>Logomarca</label><input id="logoInput" type="file" accept="image/*" /></div>

      <details class="details-box">
        <summary>Margens da folha</summary>
        <div class="margin-grid">
          <label>Sup.<input id="marginTop" type="number" min="5" max="35" step="1" /></label>
          <label>Dir.<input id="marginRight" type="number" min="5" max="35" step="1" /></label>
          <label>Inf.<input id="marginBottom" type="number" min="5" max="35" step="1" /></label>
          <label>Esq.<input id="marginLeft" type="number" min="5" max="35" step="1" /></label>
        </div>
      </details>

      <div class="import-zone" id="importZone">
        <strong>Importar atividade</strong>
        <span>PDF e DOCX entram na biblioteca e o primeiro arquivo abre na edição.</span>
        <input id="fileInput" type="file" accept=".pdf,.doc,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" multiple />
        <small id="importStatus">Nenhum arquivo importado.</small>
      </div>

      <div class="menu">
        <button id="libraryBtn" type="button"><span>📚 Biblioteca</span><b>›</b></button>
        <button id="modelsBtn" type="button"><span>🧩 Modelos</span><b>›</b></button>
        <button id="imageBankBtn" type="button"><span>🖼 Banco de imagens</span><b>›</b></button>
        <button id="aiBtn" type="button"><span>✨ Criar com IA</span><b>›</b></button>
        <button id="historyBtn" type="button"><span>🕘 Histórico de versões</span><b>›</b></button>
      </div>
    </aside>

    <main class="main">
      <div class="editing-head">
        <div><strong>Edição A4 em tempo real</strong><span>Texto, cabeçalho, imagens e caixas são atualizados imediatamente.</span></div>
        <span class="live-badge"><i></i> Prévia ao vivo</span>
      </div>

      <div class="toolbar" id="toolbar">
        <select id="fontName" title="Fonte"><option>Arial</option><option>Calibri</option><option>Times New Roman</option><option>Georgia</option><option>Verdana</option></select>
        <select id="fontSize" title="Tamanho"><option value="2">10</option><option value="3" selected>12</option><option value="4">14</option><option value="5">18</option><option value="6">24</option></select>
        <span class="sep"></span>
        <button data-cmd="bold" title="Negrito"><b>B</b></button>
        <button data-cmd="italic" title="Itálico"><i>I</i></button>
        <button data-cmd="underline" title="Sublinhado"><u>U</u></button>
        <button data-cmd="strikeThrough" title="Tachado"><s>S</s></button>
        <span class="sep"></span>
        <button data-cmd="justifyLeft" title="Alinhar à esquerda">≡←</button>
        <button data-cmd="justifyCenter" title="Centralizar">≡</button>
        <button data-cmd="justifyRight" title="Alinhar à direita">→≡</button>
        <button data-cmd="justifyFull" title="Justificar">☰</button>
        <span class="sep"></span>
        <button data-cmd="insertUnorderedList" title="Marcadores">• Lista</button>
        <button data-cmd="insertOrderedList" title="Lista numerada">1. Lista</button>
        <button data-cmd="outdent" title="Diminuir recuo">⇤</button>
        <button data-cmd="indent" title="Aumentar recuo">⇥</button>
        <select id="lineHeight" title="Espaçamento"><option value="1">1,0</option><option value="1.15">1,15</option><option value="1.5" selected>1,5</option><option value="2">2,0</option></select>
        <span class="sep"></span>
        <button id="insertImageBtn" title="Inserir imagem">🖼 Imagem</button>
        <input id="editorImageInput" type="file" accept="image/*" hidden />
        <button id="insertTextboxBtn" title="Inserir caixa de texto">▣ Caixa de texto</button>
        <button id="insertAnswerLinesBtn" title="Inserir linhas de resposta">≣ Resposta</button>
        <button data-cmd="undo" title="Desfazer">↶</button>
        <button data-cmd="redo" title="Refazer">↷</button>
        <button id="resetFormat" title="Restaurar padrão">Arial 12</button>
      </div>

      <div class="ruler-shell">
        <div class="ruler-label">Régua</div>
        <div class="ruler" id="ruler" aria-label="Régua horizontal">
          <div id="rulerTicks" class="ruler-ticks"></div>
          <button id="leftMarginHandle" class="margin-handle left-handle" title="Margem esquerda" type="button">▼</button>
          <button id="rightMarginHandle" class="margin-handle right-handle" title="Margem direita" type="button">▼</button>
        </div>
      </div>

      <div class="document-wrap" id="documentWrap">
        <section class="page" id="page">
          <div class="page-flow" id="pageFlow">
            <div class="school-head">
              <img id="schoolLogo" class="logo" alt="Logomarca da escola" />
              <div id="schoolText" class="editable-header school-name" contenteditable="true" spellcheck="false"></div>
              <div id="titleText" class="editable-header header-title" contenteditable="true" spellcheck="false"></div>
            </div>
            <div class="meta" id="metaBlock">
              <div><strong id="teacherLabel">Teacher:</strong> <span id="teacherText" class="editable-header" contenteditable="true"></span></div>
              <div><strong id="gradeLabel">Grade/Class:</strong> <span id="gradeText" class="editable-header" contenteditable="true"></span></div>
              <div><strong id="subjectLabel">Subject:</strong> <span id="subjectText" class="editable-header" contenteditable="true"></span></div>
              <div class="full"><strong id="studentLabel">Student:</strong> <span class="student-line"></span></div>
            </div>
            <div id="editor" contenteditable="true" spellcheck="true" aria-label="Editor da atividade"></div>
          </div>
          <div id="floatingLayer" class="floating-layer" aria-label="Objetos flutuantes"></div>
        </section>
        <div class="hint">Arraste as alças da régua para mudar as margens. Imagens e caixas de texto podem ser movidas e redimensionadas.</div>
      </div>
    </main>
  </div>
</div>

<div id="toast" class="toast" role="status" aria-live="polite"></div>

<dialog id="previewDialog" class="modal preview-modal">
  <div class="modal-head"><div><strong>Prévia da atividade</strong><small>Exatamente com o conteúdo atual</small></div><button data-close="previewDialog" type="button">✕</button></div>
  <div class="preview-stage"><div id="previewMount"></div></div>
  <div class="modal-actions"><button class="btn" data-close="previewDialog" type="button">Voltar</button><button class="btn primary" id="printBtn" type="button">Imprimir</button></div>
</dialog>

<dialog id="libraryDialog" class="modal">
  <div class="modal-head"><div><strong>Biblioteca de atividades</strong><small>Seu banco de Inglês e Projeto de Vida</small></div><button data-close="libraryDialog" type="button">✕</button></div>
  <div class="library-tools"><input id="librarySearch" placeholder="Pesquisar título, série ou disciplina" /><select id="libraryComponentFilter"><option value="all">Todos</option><option value="english">Língua Inglesa</option><option value="life-project">Projeto de Vida</option></select></div>
  <div id="libraryList" class="card-list"></div>
  <div class="modal-actions"><button class="btn" data-close="libraryDialog" type="button">Fechar</button></div>
</dialog>

<dialog id="modelsDialog" class="modal">
  <div class="modal-head"><div><strong>Modelos</strong><small>Estruturas editáveis para começar mais rápido</small></div><button data-close="modelsDialog" type="button">✕</button></div>
  <div id="modelsList" class="model-grid"></div>
  <div class="modal-actions"><button class="btn" data-close="modelsDialog" type="button">Fechar</button></div>
</dialog>

<dialog id="imageBankDialog" class="modal wide-modal">
  <div class="modal-head"><div><strong>Banco de imagens</strong><small>Salve imagens e reutilize em qualquer atividade</small></div><button data-close="imageBankDialog" type="button">✕</button></div>
  <div class="image-bank-tools">
    <input id="imageBankUpload" type="file" accept="image/*" multiple />
    <div class="web-image-search"><input id="webImageQuery" placeholder="Tema para pesquisar imagens" /><button id="openGoogleImagesBtn" class="btn" type="button">Pesquisar no Google Imagens</button></div>
  </div>
  <div id="imageBankList" class="image-grid"></div>
  <div class="modal-note">A busca abre o Google Imagens em outra aba. Depois, baixe a imagem ou arraste o arquivo salvo para o editor. A integração direta com resultados do Google exige uma API própria.</div>
  <div class="modal-actions"><button class="btn" data-close="imageBankDialog" type="button">Fechar</button></div>
</dialog>

<dialog id="aiDialog" class="modal wide-modal">
  <div class="modal-head"><div><strong>Criar com IA</strong><small>Usa suas atividades da biblioteca como referência</small></div><button data-close="aiDialog" type="button">✕</button></div>
  <form id="aiForm" class="ai-form">
    <div class="form-row"><label>Componente<select id="aiComponent"><option value="english">Língua Inglesa</option><option value="life-project">Projeto de Vida</option></select></label><label>Série / turma<input id="aiGrade" /></label></div>
    <label>Tema / conteúdo<input id="aiTopic" required placeholder="Ex.: Simple Past, Projeto de Vida e escolhas..." /></label>
    <div class="form-row"><label>Quantidade de questões<input id="aiQuestionCount" type="number" min="1" max="30" value="8" /></label><label>Tipo<select id="aiQuestionType"><option value="mista">Mista</option><option value="objetiva">Objetiva</option><option value="aberta">Aberta</option></select></label></div>
    <label>Orientações adicionais<textarea id="aiNotes" rows="4" placeholder="Habilidade, nível, texto de apoio, estilo desejado..."></textarea></label>
    <label class="switch-line"><input id="aiUseLibrary" type="checkbox" checked /> Usar minhas atividades semelhantes como referência</label>
    <div id="aiStatus" class="ai-status">A IA funciona quando a variável OPENAI_API_KEY estiver configurada no Netlify.</div>
    <button class="btn primary" id="aiGenerateBtn" type="submit">Gerar atividade</button>
  </form>
</dialog>

<dialog id="historyDialog" class="modal">
  <div class="modal-head"><div><strong>Histórico de versões</strong><small>Restaure um ponto anterior</small></div><button data-close="historyDialog" type="button">✕</button></div>
  <div id="historyList" class="card-list"></div>
  <div class="modal-actions"><button class="btn" data-close="historyDialog" type="button">Fechar</button></div>
</dialog>
`;

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const editor = $<HTMLDivElement>('editor');
const page = $<HTMLElement>('page');
const floatingLayer = $<HTMLDivElement>('floatingLayer');
const status = $('saveStatus');
const inputs = {
  component: $<HTMLSelectElement>('componentInput'),
  school: $<HTMLInputElement>('schoolInput'),
  teacher: $<HTMLInputElement>('teacherInput'),
  subject: $<HTMLInputElement>('subjectInput'),
  grade: $<HTMLInputElement>('gradeInput'),
  title: $<HTMLInputElement>('titleInput')
};
const marginInputs = {
  top: $<HTMLInputElement>('marginTop'),
  right: $<HTMLInputElement>('marginRight'),
  bottom: $<HTMLInputElement>('marginBottom'),
  left: $<HTMLInputElement>('marginLeft')
};

const toast = (message: string) => {
  const el = $('toast');
  window.clearTimeout(toastTimer);
  el.textContent = message;
  el.classList.add('show');
  toastTimer = window.setTimeout(() => el.classList.remove('show'), 2800);
};

const escapeHtml = (value: string) => value.replace(/[&<>'"]/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
}[char] || char));

const stripExtension = (name: string) => name.replace(/\.[^.]+$/, '');
const stripHtml = (html: string) => {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return (doc.body.textContent || '').replace(/\s+/g, ' ').trim();
};

const sanitizeImportedHtml = (html: string) => {
  const doc = new DOMParser().parseFromString(`<div id="safe-root">${html}</div>`, 'text/html');
  const root = doc.getElementById('safe-root')!;
  root.querySelectorAll('script,style,iframe,object,embed,form,input,button,textarea,select').forEach(el => el.remove());
  root.querySelectorAll<HTMLElement>('*').forEach(el => {
    [...el.attributes].forEach(attr => {
      const name = attr.name.toLowerCase();
      const value = attr.value.trim().toLowerCase();
      if (name.startsWith('on') || (['href', 'src'].includes(name) && value.startsWith('javascript:'))) el.removeAttribute(attr.name);
    });
  });
  return root.innerHTML;
};

const showDialog = (id: string) => {
  const dialog = $<HTMLDialogElement>(id);
  if (typeof dialog.showModal === 'function') dialog.showModal(); else dialog.setAttribute('open', '');
};
const closeDialog = (id: string) => {
  const dialog = $<HTMLDialogElement>(id);
  if (typeof dialog.close === 'function') dialog.close(); else dialog.removeAttribute('open');
};

document.querySelectorAll<HTMLElement>('[data-close]').forEach(btn => btn.addEventListener('click', () => closeDialog(btn.dataset.close || '')));

const profileLabels = () => activity.component === 'english'
  ? { teacher: 'Teacher:', subject: 'Subject:', grade: 'Grade/Class:', student: 'Student:' }
  : { teacher: 'Professor(a):', subject: 'Componente:', grade: 'Turma:', student: 'Aluno(a):' };

const renderHeader = () => {
  $<HTMLElement>('schoolText').textContent = activity.school;
  $<HTMLElement>('teacherText').textContent = activity.teacher;
  $<HTMLElement>('subjectText').textContent = activity.subject;
  $<HTMLElement>('gradeText').textContent = activity.grade;
  $<HTMLElement>('titleText').textContent = activity.title;
  const labels = profileLabels();
  $('teacherLabel').textContent = labels.teacher;
  $('subjectLabel').textContent = labels.subject;
  $('gradeLabel').textContent = labels.grade;
  $('studentLabel').textContent = labels.student;
  const logo = $<HTMLImageElement>('schoolLogo');
  if (activity.logoDataUrl) {
    logo.src = activity.logoDataUrl;
    logo.style.display = 'block';
  } else {
    logo.removeAttribute('src');
    logo.style.display = 'none';
  }
};

const renderMargins = () => {
  page.style.setProperty('--page-margin-top', `${activity.margins.top}mm`);
  page.style.setProperty('--page-margin-right', `${activity.margins.right}mm`);
  page.style.setProperty('--page-margin-bottom', `${activity.margins.bottom}mm`);
  page.style.setProperty('--page-margin-left', `${activity.margins.left}mm`);
  marginInputs.top.value = String(activity.margins.top);
  marginInputs.right.value = String(activity.margins.right);
  marginInputs.bottom.value = String(activity.margins.bottom);
  marginInputs.left.value = String(activity.margins.left);
  updateRulerHandles();
};

const renderFloatingObjects = () => {
  floatingLayer.innerHTML = '';
  const sorted = [...activity.objects].sort((a, b) => a.z - b.z);
  for (const obj of sorted) {
    const item = document.createElement('div');
    item.className = `floating-object ${obj.type} ${obj.id === selectedObjectId ? 'selected' : ''}`;
    item.dataset.id = obj.id;
    item.style.left = `${obj.x}mm`;
    item.style.top = `${obj.y}mm`;
    item.style.width = `${obj.width}mm`;
    item.style.height = `${obj.height}mm`;
    item.style.zIndex = String(obj.z);

    if (obj.type === 'image') {
      const img = document.createElement('img');
      img.src = obj.src || '';
      img.alt = 'Imagem inserida';
      item.appendChild(img);
    } else {
      const text = document.createElement('div');
      text.className = `textbox-content ${obj.border ? 'with-border' : 'no-border'}`;
      text.contentEditable = 'true';
      text.spellcheck = true;
      text.innerHTML = obj.html || 'Digite aqui';
      text.addEventListener('input', () => {
        const current = activity.objects.find(o => o.id === obj.id);
        if (current) current.html = text.innerHTML;
        scheduleSave();
      });
      item.appendChild(text);
    }

    const controls = document.createElement('div');
    controls.className = 'object-controls';
    controls.innerHTML = `<button class="drag-grip" type="button" title="Arrastar">✥</button><button class="object-front" type="button" title="Trazer para frente">↑</button>${obj.type === 'textbox' ? '<button class="object-border" type="button" title="Mostrar/ocultar borda">□</button>' : ''}<button class="object-delete" type="button" title="Excluir">×</button>`;
    item.appendChild(controls);
    const resize = document.createElement('button');
    resize.type = 'button';
    resize.className = 'resize-handle';
    resize.title = 'Redimensionar';
    item.appendChild(resize);

    item.addEventListener('pointerdown', (event) => {
      selectedObjectId = obj.id;
      floatingLayer.querySelectorAll('.floating-object').forEach(el => el.classList.toggle('selected', (el as HTMLElement).dataset.id === obj.id));
      if ((event.target as HTMLElement).closest('.drag-grip')) startObjectDrag(event, obj.id);
      if ((event.target as HTMLElement).closest('.resize-handle')) startObjectResize(event, obj.id);
    });

    controls.querySelector<HTMLButtonElement>('.object-delete')?.addEventListener('click', (event) => {
      event.stopPropagation();
      activity.objects = activity.objects.filter(o => o.id !== obj.id);
      selectedObjectId = null;
      renderFloatingObjects();
      scheduleSave();
    });
    controls.querySelector<HTMLButtonElement>('.object-front')?.addEventListener('click', (event) => {
      event.stopPropagation();
      const current = activity.objects.find(o => o.id === obj.id);
      if (current) current.z = Math.max(1, ...activity.objects.map(o => o.z)) + 1;
      renderFloatingObjects();
      scheduleSave();
    });
    controls.querySelector<HTMLButtonElement>('.object-border')?.addEventListener('click', (event) => {
      event.stopPropagation();
      const current = activity.objects.find(o => o.id === obj.id);
      if (current) current.border = !current.border;
      renderFloatingObjects();
      scheduleSave();
    });

    floatingLayer.appendChild(item);
  }
};

const render = () => {
  inputs.component.value = activity.component;
  inputs.school.value = activity.school;
  inputs.teacher.value = activity.teacher;
  inputs.subject.value = activity.subject;
  inputs.grade.value = activity.grade;
  inputs.title.value = activity.title;
  renderHeader();
  renderMargins();
  editor.innerHTML = activity.content;
  renderFloatingObjects();
  renderPreview();
};

const renderPreview = () => {
  const mount = $('previewMount');
  if (!mount) return;
  const clone = page.cloneNode(true) as HTMLElement;
  clone.removeAttribute('id');
  clone.classList.add('preview-page');
  clone.querySelectorAll('[contenteditable]').forEach(el => el.removeAttribute('contenteditable'));
  clone.querySelectorAll('.object-controls,.resize-handle').forEach(el => el.remove());
  clone.querySelectorAll('.floating-object.selected').forEach(el => el.classList.remove('selected'));
  mount.innerHTML = '';
  mount.appendChild(clone);
};

const updateHeaderFromSidebar = () => {
  activity.school = inputs.school.value;
  activity.teacher = inputs.teacher.value;
  activity.subject = inputs.subject.value;
  activity.grade = inputs.grade.value;
  activity.title = inputs.title.value;
  renderHeader();
  renderPreview();
  scheduleSave();
};

const updateSidebarFromHeader = () => {
  activity.school = $<HTMLElement>('schoolText').textContent?.trim() || activity.school;
  activity.teacher = $<HTMLElement>('teacherText').textContent?.trim() || activity.teacher;
  activity.subject = $<HTMLElement>('subjectText').textContent?.trim() || activity.subject;
  activity.grade = $<HTMLElement>('gradeText').textContent?.trim() || activity.grade;
  activity.title = $<HTMLElement>('titleText').textContent?.trim() || activity.title;
  inputs.school.value = activity.school;
  inputs.teacher.value = activity.teacher;
  inputs.subject.value = activity.subject;
  inputs.grade.value = activity.grade;
  inputs.title.value = activity.title;
  scheduleSave();
};

Object.values(inputs).forEach(input => {
  if (input === inputs.component) return;
  input.addEventListener('input', updateHeaderFromSidebar);
});

document.querySelectorAll<HTMLElement>('.editable-header').forEach(el => el.addEventListener('input', updateSidebarFromHeader));

inputs.component.addEventListener('change', () => {
  const previous = activity.component;
  const next = inputs.component.value as ComponentKind;
  activity.component = next;
  if (activity.subject === profileDefaults[previous].subject) activity.subject = profileDefaults[next].subject;
  if (activity.title === profileDefaults[previous].title) activity.title = profileDefaults[next].title;
  render();
  scheduleSave();
});

const clampMargin = (value: number) => Math.min(35, Math.max(5, Number.isFinite(value) ? value : 14));
Object.entries(marginInputs).forEach(([key, input]) => input.addEventListener('input', () => {
  activity.margins[key as keyof Margins] = clampMargin(Number(input.value));
  renderMargins();
  renderPreview();
  scheduleSave();
}));

const upsertLocalLibrary = (item: Activity) => {
  const items = getLibrary().filter(x => x.id !== item.id);
  items.unshift(structuredClone(item));
  setLibrary(items);
};

const addHistorySnapshot = (item: Activity) => {
  const list = getHistory();
  const signature = JSON.stringify({ title: item.title, content: item.content, school: item.school, subject: item.subject, grade: item.grade, component: item.component, margins: item.margins, objects: item.objects });
  const first = list[0];
  const firstSignature = first ? JSON.stringify({ title: first.activity.title, content: first.activity.content, school: first.activity.school, subject: first.activity.subject, grade: first.activity.grade, component: first.activity.component, margins: first.activity.margins, objects: first.activity.objects }) : '';
  if (signature === firstSignature) return;
  list.unshift({ id: newId(), savedAt: nowIso(), activity: structuredClone(item) });
  setHistory(list);
};

const saveRemote = async (payload: Activity) => {
  try {
    const res = await fetch('/.netlify/functions/save-activity', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    return res.ok;
  } catch { return false; }
};

const persist = async () => {
  activity.content = editor.innerHTML;
  activity.updatedAt = nowIso();
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(activity)); } catch { toast('Armazenamento local cheio; mantendo a tentativa de sincronização.'); }
  upsertLocalLibrary(activity);
  addHistorySnapshot(activity);
  status.textContent = 'Salvo localmente';
  status.className = 'status saved';
  if (navigator.onLine) {
    const ok = await saveRemote(activity);
    status.textContent = ok ? 'Sincronizado' : 'Salvo localmente';
    status.className = ok ? 'status synced' : 'status saved';
  }
  renderPreview();
};

function scheduleSave() {
  status.textContent = 'Salvando…';
  status.className = 'status saving';
  window.clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => void persist(), 700);
}

editor.addEventListener('input', () => {
  activity.content = editor.innerHTML;
  renderPreview();
  scheduleSave();
});

editor.addEventListener('paste', (event) => {
  const clipboard = event.clipboardData;
  if (!clipboard) return;
  const imageFile = [...clipboard.files].find(file => file.type.startsWith('image/'));
  if (!imageFile) return;
  event.preventDefault();
  void fileToDataUrl(imageFile).then(src => addFloatingImage(src, imageFile.name || 'Imagem colada'));
});

page.addEventListener('dragover', event => {
  if (event.dataTransfer?.types.includes('Files')) {
    event.preventDefault();
    page.classList.add('drop-target');
  }
});
page.addEventListener('dragleave', () => page.classList.remove('drop-target'));
page.addEventListener('drop', event => {
  page.classList.remove('drop-target');
  const imageFile = [...(event.dataTransfer?.files || [])].find(file => file.type.startsWith('image/'));
  if (!imageFile) return;
  event.preventDefault();
  void fileToDataUrl(imageFile).then(src => addFloatingImage(src, imageFile.name));
});

$('toolbar').querySelectorAll<HTMLButtonElement>('button[data-cmd]').forEach(btn => {
  btn.addEventListener('click', () => {
    editor.focus();
    document.execCommand(btn.dataset.cmd || '');
    activity.content = editor.innerHTML;
    renderPreview();
    scheduleSave();
  });
});

$<HTMLSelectElement>('fontName').addEventListener('change', event => {
  editor.focus(); document.execCommand('fontName', false, (event.target as HTMLSelectElement).value); scheduleSave();
});
$<HTMLSelectElement>('fontSize').addEventListener('change', event => {
  editor.focus(); document.execCommand('fontSize', false, (event.target as HTMLSelectElement).value); scheduleSave();
});
$<HTMLSelectElement>('lineHeight').addEventListener('change', event => {
  const value = (event.target as HTMLSelectElement).value;
  const sel = window.getSelection();
  let node: Node | null = sel?.anchorNode || null;
  if (node?.nodeType === Node.TEXT_NODE) node = node.parentNode;
  const el = node instanceof HTMLElement ? node.closest('p,div,li') as HTMLElement | null : null;
  (el || editor).style.lineHeight = value;
  renderPreview(); scheduleSave();
});

$('resetFormat').addEventListener('click', () => {
  editor.focus();
  document.execCommand('removeFormat');
  document.execCommand('fontName', false, 'Arial');
  document.execCommand('fontSize', false, '3');
  document.execCommand('justifyFull');
  renderPreview(); scheduleSave();
});

const fileToDataUrl = (file: File) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result || ''));
  reader.onerror = () => reject(reader.error || new Error('Falha ao ler arquivo.'));
  reader.readAsDataURL(file);
});

$('logoInput').addEventListener('change', async event => {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file) return;
  activity.logoDataUrl = await fileToDataUrl(file);
  renderHeader(); renderPreview(); scheduleSave();
});

const addFloatingImage = (src: string, name = 'Imagem') => {
  const obj: FloatingObject = {
    id: newId(), type: 'image', x: 45, y: 92, width: 60, height: 45, src, z: Math.max(0, ...activity.objects.map(o => o.z)) + 1
  };
  activity.objects.push(obj);
  selectedObjectId = obj.id;
  renderFloatingObjects();
  renderPreview();
  scheduleSave();
  toast(`${name} inserida. Use ✥ para mover e a alça inferior para redimensionar.`);
};

const addTextbox = () => {
  const obj: FloatingObject = {
    id: newId(), type: 'textbox', x: 35, y: 100, width: 75, height: 25, html: 'Digite aqui', border: false, z: Math.max(0, ...activity.objects.map(o => o.z)) + 1
  };
  activity.objects.push(obj);
  selectedObjectId = obj.id;
  renderFloatingObjects();
  renderPreview();
  scheduleSave();
  toast('Caixa de texto inserida. Ela pode ser movida, redimensionada e ficar sem borda.');
};

$('insertImageBtn').addEventListener('click', () => $<HTMLInputElement>('editorImageInput').click());
$<HTMLInputElement>('editorImageInput').addEventListener('change', async event => {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  addFloatingImage(await fileToDataUrl(file), file.name);
  input.value = '';
});
$('insertTextboxBtn').addEventListener('click', addTextbox);
$('insertAnswerLinesBtn').addEventListener('click', () => {
  editor.focus();
  document.execCommand('insertHTML', false, '<p class="answer-lines">________________________________________________________________________________<br>________________________________________________________________________________<br>________________________________________________________________________________</p>');
  activity.content = editor.innerHTML;
  scheduleSave();
});

function startObjectDrag(event: PointerEvent, id: string) {
  event.preventDefault();
  event.stopPropagation();
  const obj = activity.objects.find(o => o.id === id);
  if (!obj) return;
  const startX = event.clientX;
  const startY = event.clientY;
  const startObjX = obj.x;
  const startObjY = obj.y;
  const mmPerPx = 210 / page.getBoundingClientRect().width;
  const pointerId = event.pointerId;
  const onMove = (move: PointerEvent) => {
    if (move.pointerId !== pointerId) return;
    const pageHeightMm = page.getBoundingClientRect().height * mmPerPx;
    obj.x = Math.max(0, Math.min(210 - obj.width, startObjX + (move.clientX - startX) * mmPerPx));
    obj.y = Math.max(0, Math.min(pageHeightMm - obj.height, startObjY + (move.clientY - startY) * mmPerPx));
    const el = floatingLayer.querySelector<HTMLElement>(`[data-id="${CSS.escape(id)}"]`);
    if (el) { el.style.left = `${obj.x}mm`; el.style.top = `${obj.y}mm`; }
  };
  const onUp = (up: PointerEvent) => {
    if (up.pointerId !== pointerId) return;
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
    renderPreview(); scheduleSave();
  };
  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);
}

function startObjectResize(event: PointerEvent, id: string) {
  event.preventDefault();
  event.stopPropagation();
  const obj = activity.objects.find(o => o.id === id);
  if (!obj) return;
  const startX = event.clientX;
  const startY = event.clientY;
  const startW = obj.width;
  const startH = obj.height;
  const mmPerPx = 210 / page.getBoundingClientRect().width;
  const pointerId = event.pointerId;
  const onMove = (move: PointerEvent) => {
    if (move.pointerId !== pointerId) return;
    obj.width = Math.max(18, Math.min(210 - obj.x, startW + (move.clientX - startX) * mmPerPx));
    obj.height = Math.max(10, startH + (move.clientY - startY) * mmPerPx);
    const el = floatingLayer.querySelector<HTMLElement>(`[data-id="${CSS.escape(id)}"]`);
    if (el) { el.style.width = `${obj.width}mm`; el.style.height = `${obj.height}mm`; }
  };
  const onUp = (up: PointerEvent) => {
    if (up.pointerId !== pointerId) return;
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
    renderPreview(); scheduleSave();
  };
  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);
}

const rulerTicks = $<HTMLDivElement>('rulerTicks');
rulerTicks.innerHTML = Array.from({ length: 22 }, (_, i) => `<span style="left:${(i / 21) * 100}%">${i * 10}</span>`).join('');

function updateRulerHandles() {
  const ruler = $<HTMLDivElement>('ruler');
  if (!ruler) return;
  $<HTMLButtonElement>('leftMarginHandle').style.left = `${(activity.margins.left / 210) * 100}%`;
  $<HTMLButtonElement>('rightMarginHandle').style.left = `${((210 - activity.margins.right) / 210) * 100}%`;
}

const startMarginDrag = (event: PointerEvent, side: 'left' | 'right') => {
  event.preventDefault();
  const ruler = $<HTMLDivElement>('ruler');
  const rect = ruler.getBoundingClientRect();
  const move = (ev: PointerEvent) => {
    const x = Math.max(0, Math.min(rect.width, ev.clientX - rect.left));
    const mm = (x / rect.width) * 210;
    if (side === 'left') activity.margins.left = clampMargin(Math.round(mm));
    else activity.margins.right = clampMargin(Math.round(210 - mm));
    renderMargins(); renderPreview();
  };
  const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); scheduleSave(); };
  window.addEventListener('pointermove', move);
  window.addEventListener('pointerup', up);
};
$<HTMLButtonElement>('leftMarginHandle').addEventListener('pointerdown', event => startMarginDrag(event, 'left'));
$<HTMLButtonElement>('rightMarginHandle').addEventListener('pointerdown', event => startMarginDrag(event, 'right'));

const extractPdfHtml = async (file: File) => {
  const data = new Uint8Array(await file.arrayBuffer());
  const pdf = await getDocument({ data }).promise;
  const pages: string[] = [];
  for (let pageNo = 1; pageNo <= pdf.numPages; pageNo++) {
    const currentPage = await pdf.getPage(pageNo);
    const text = await currentPage.getTextContent();
    const rows = new Map<number, Array<{ x: number; str: string }>>();
    for (const raw of text.items as any[]) {
      if (!raw || typeof raw.str !== 'string') continue;
      const y = Math.round(Number(raw.transform?.[5] || 0) / 3) * 3;
      const x = Number(raw.transform?.[4] || 0);
      const row = rows.get(y) || [];
      row.push({ x, str: raw.str });
      rows.set(y, row);
    }
    const lines = [...rows.entries()]
      .sort((a, b) => b[0] - a[0])
      .map(([, items]) => items.sort((a, b) => a.x - b.x).map(i => i.str).join(' ').replace(/\s+/g, ' ').trim())
      .filter(Boolean);
    pages.push(`<div class="imported-page"><p class="imported-page-label">Página ${pageNo}</p>${lines.map(line => `<p>${escapeHtml(line)}</p>`).join('')}</div>`);
  }
  return pages.join('<hr class="soft-break">') || '<p>Não foi possível extrair texto deste PDF. Ele pode ser composto somente por imagens.</p>';
};

const extractDocxHtml = async (file: File) => {
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.convertToHtml({ arrayBuffer }, {
    convertImage: mammoth.images.imgElement(async image => ({ src: `data:${image.contentType};base64,${await image.read('base64')}` }))
  });
  return sanitizeImportedHtml(result.value || '<p>Documento sem conteúdo reconhecível.</p>');
};

const importFile = async (file: File): Promise<Activity> => {
  const ext = file.name.toLowerCase().split('.').pop() || '';
  let content = '';
  if (ext === 'pdf' || file.type === 'application/pdf') content = await extractPdfHtml(file);
  else if (ext === 'docx') content = await extractDocxHtml(file);
  else if (ext === 'doc') throw new Error('O formato .DOC antigo precisa ser salvo como .DOCX ou PDF.');
  else throw new Error('Formato não suportado. Use PDF ou DOCX.');
  const created = nowIso();
  return normalizeActivity({
    ...activity,
    id: newId(),
    title: stripExtension(file.name),
    content,
    objects: [],
    sourceName: file.name,
    createdAt: created,
    updatedAt: created
  });
};

$<HTMLInputElement>('fileInput').addEventListener('change', async event => {
  const input = event.target as HTMLInputElement;
  const files = [...(input.files || [])];
  if (!files.length || importBusy) return;
  importBusy = true;
  const importStatus = $('importStatus');
  const imported: Activity[] = [];
  try {
    for (let i = 0; i < files.length; i++) {
      importStatus.textContent = `Lendo ${i + 1} de ${files.length}: ${files[i].name}…`;
      const item = await importFile(files[i]);
      imported.push(item);
      upsertLocalLibrary(item);
      if (navigator.onLine) void saveRemote(item);
    }
    if (imported[0]) {
      await persist();
      activity = imported[0];
      selectedObjectId = null;
      render();
      await persist();
      editor.focus();
      importStatus.textContent = `${imported.length} atividade(s) adicionada(s). A primeira está aberta para edição.`;
      toast('Importação concluída. O material já está no banco e aberto para editar.');
    }
  } catch (error) {
    importStatus.textContent = error instanceof Error ? error.message : 'Falha ao importar.';
    toast(importStatus.textContent);
  } finally {
    importBusy = false;
    input.value = '';
  }
});

const makePdfBlob = async () => {
  page.classList.add('exporting');
  try {
    const canvas = await html2canvas(page, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
    const imgData = canvas.toDataURL('image/jpeg', 0.97);
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = 210;
    const pageHeight = 297;
    const imgWidth = pageWidth;
    const imgHeight = canvas.height * imgWidth / canvas.width;
    let heightLeft = imgHeight;
    let position = 0;
    pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;
    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }
    return pdf.output('blob');
  } finally {
    page.classList.remove('exporting');
  }
};

const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1200);
};

$('previewBtn').addEventListener('click', () => { renderPreview(); showDialog('previewDialog'); });
$('printBtn').addEventListener('click', () => window.print());
$('pdfBtn').addEventListener('click', async () => {
  toast('Gerando PDF…');
  const blob = await makePdfBlob();
  downloadBlob(blob, `${activity.title || 'atividade'}.pdf`);
  toast('PDF gerado.');
});
$('shareBtn').addEventListener('click', async () => {
  const blob = await makePdfBlob();
  const file = new File([blob], `${activity.title || 'atividade'}.pdf`, { type: 'application/pdf' });
  if (navigator.share && (!navigator.canShare || navigator.canShare({ files: [file] }))) {
    try { await navigator.share({ title: activity.title, text: 'Atividade em PDF', files: [file] }); return; } catch { /* user cancelled */ }
  }
  downloadBlob(blob, file.name);
  toast('PDF baixado. Você pode anexá-lo no WhatsApp.');
});

$('newActivityBtn').addEventListener('click', async () => {
  if (!confirm('Criar uma nova atividade? A atual continuará salva na biblioteca.')) return;
  await persist();
  const next = blankActivity(activity.component);
  next.school = activity.school;
  next.teacher = activity.teacher;
  next.grade = activity.grade;
  next.logoDataUrl = activity.logoDataUrl || defaultSchoolLogo;
  activity = next;
  selectedObjectId = null;
  render(); await persist(); editor.focus();
  toast('Nova atividade criada.');
});

const mergeRemoteLibrary = async (local: Activity[]) => {
  if (!navigator.onLine) return local;
  try {
    const res = await fetch('/.netlify/functions/list-activities');
    if (!res.ok) return local;
    const json = await res.json();
    if (!json?.ok || !Array.isArray(json.data)) return local;
    const map = new Map<string, Activity>();
    [...json.data.map((x: Partial<Activity>) => normalizeActivity(x)), ...local].forEach((item: Activity) => {
      const current = map.get(item.id);
      if (!current || String(item.updatedAt) > String(current.updatedAt)) map.set(item.id, item);
    });
    const merged = [...map.values()].sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
    setLibrary(merged);
    return merged;
  } catch { return local; }
};

let libraryCache: Activity[] = [];
const paintLibrary = () => {
  const list = $('libraryList');
  const query = $<HTMLInputElement>('librarySearch').value.trim().toLowerCase();
  const filter = $<HTMLSelectElement>('libraryComponentFilter').value;
  const items = libraryCache.filter(item => {
    const matchesComponent = filter === 'all' || item.component === filter;
    const haystack = `${item.title} ${item.subject} ${item.grade} ${item.sourceName || ''}`.toLowerCase();
    return matchesComponent && (!query || haystack.includes(query));
  });
  if (!items.length) { list.innerHTML = '<div class="empty">Nenhuma atividade encontrada.</div>'; return; }
  list.innerHTML = items.map(item => `
    <article class="activity-card" data-id="${escapeHtml(item.id)}">
      <div><span class="component-chip ${item.component}">${item.component === 'english' ? 'Inglês' : 'Projeto de Vida'}</span><strong>${escapeHtml(item.title || 'Sem título')}</strong><small>${escapeHtml(item.subject || '')} • ${escapeHtml(item.grade || '')}</small><em>${new Date(item.updatedAt).toLocaleString('pt-BR')}</em></div>
      <div class="card-actions"><button data-open="${escapeHtml(item.id)}">Abrir</button><button data-duplicate="${escapeHtml(item.id)}">Duplicar</button><button class="danger" data-delete="${escapeHtml(item.id)}">Excluir</button></div>
    </article>`).join('');

  list.querySelectorAll<HTMLButtonElement>('[data-open]').forEach(btn => btn.addEventListener('click', async () => {
    const item = libraryCache.find(x => x.id === btn.dataset.open);
    if (!item) return;
    await persist(); activity = structuredClone(item); selectedObjectId = null; render(); closeDialog('libraryDialog'); await persist(); toast('Atividade aberta.');
  }));
  list.querySelectorAll<HTMLButtonElement>('[data-duplicate]').forEach(btn => btn.addEventListener('click', async () => {
    const item = libraryCache.find(x => x.id === btn.dataset.duplicate);
    if (!item) return;
    const copy = normalizeActivity({ ...structuredClone(item), id: newId(), title: `${item.title} — cópia`, createdAt: nowIso(), updatedAt: nowIso() });
    upsertLocalLibrary(copy); if (navigator.onLine) void saveRemote(copy); libraryCache = getLibrary(); paintLibrary(); toast('Cópia criada.');
  }));
  list.querySelectorAll<HTMLButtonElement>('[data-delete]').forEach(btn => btn.addEventListener('click', async () => {
    const id = btn.dataset.delete || '';
    const item = libraryCache.find(x => x.id === id);
    if (!item || !confirm(`Excluir “${item.title}” da biblioteca?`)) return;
    setLibrary(getLibrary().filter(x => x.id !== id));
    libraryCache = libraryCache.filter(x => x.id !== id);
    if (navigator.onLine) {
      try { await fetch('/.netlify/functions/delete-activity', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) }); } catch { /* local deletion remains */ }
    }
    paintLibrary(); toast('Atividade excluída.');
  }));
};

const renderLibrary = async () => {
  const list = $('libraryList');
  list.innerHTML = '<div class="empty">Carregando biblioteca…</div>';
  libraryCache = await mergeRemoteLibrary(getLibrary());
  paintLibrary();
};
$('librarySearch').addEventListener('input', paintLibrary);
$('libraryComponentFilter').addEventListener('change', paintLibrary);
$('libraryBtn').addEventListener('click', async () => { showDialog('libraryDialog'); await renderLibrary(); });

const models = [
  { component: 'english' as ComponentKind, name: 'Atividade de Inglês', title: 'ENGLISH ACTIVITY / 2026', description: 'Estrutura simples para aula e exercício.', content: '<p><strong>Read the instructions and answer the questions.</strong></p><p><strong>1.</strong> Write the first question here.</p><p><strong>2.</strong> Write the second question here.</p>' },
  { component: 'english' as ComponentKind, name: 'Avaliação de Inglês', title: 'ENGLISH ASSESSMENT / 2026', description: 'Modelo de avaliação com cabeçalho em inglês.', content: '<p><strong>Read all questions carefully before answering.</strong></p><p><strong>1.</strong> Question 1.</p><p><strong>2.</strong> Question 2.</p><p><strong>3.</strong> Question 3.</p>' },
  { component: 'english' as ComponentKind, name: 'Simulado', title: 'ENGLISH MOCK TEST / 2026', description: 'Questões objetivas com alternativas.', content: '<p><strong>1.</strong> Question statement.</p><p>A) Alternative A<br>B) Alternative B<br>C) Alternative C<br>D) Alternative D<br>E) Alternative E</p>' },
  { component: 'life-project' as ComponentKind, name: 'Atividade de Projeto de Vida', title: 'ATIVIDADE DE PROJETO DE VIDA / 2026', description: 'Questões reflexivas e espaço para resposta.', content: '<p><strong>Orientações:</strong> Reflita sobre o tema e responda com atenção.</p><p><strong>1.</strong> Digite aqui a primeira questão.</p><p class="answer-lines">________________________________________________________________________________<br>________________________________________________________________________________</p>' },
  { component: 'life-project' as ComponentKind, name: 'Atividade de Conclusão', title: 'ATIVIDADE DE CONCLUSÃO / 2026', description: 'Modelo para fechamento de unidade ou trimestre.', content: '<p><strong>Orientações:</strong> Retome as aprendizagens desenvolvidas e responda de forma reflexiva.</p><p><strong>1.</strong> Qual aprendizagem foi mais significativa?</p><p class="answer-lines">________________________________________________________________________________<br>________________________________________________________________________________</p>' },
  { component: 'life-project' as ComponentKind, name: 'Roteiro de Pesquisa', title: 'ATIVIDADE DE PESQUISA / 2026', description: 'Investigação, organização e apresentação.', content: '<p><strong>Tema:</strong> ____________________________________</p><p><strong>Questões norteadoras:</strong></p><ol><li>O que é?</li><li>Como se relaciona ao Projeto de Vida?</li><li>Que aprendizados podem ser aplicados na prática?</li></ol>' }
];

const renderModels = () => {
  const list = $('modelsList');
  list.innerHTML = models.map((model, index) => `<button class="model-card" data-model="${index}" type="button"><span>${model.component === 'english' ? '🇬🇧' : '🧭'}</span><strong>${model.name}</strong><small>${model.description}</small></button>`).join('');
  list.querySelectorAll<HTMLButtonElement>('[data-model]').forEach(btn => btn.addEventListener('click', async () => {
    const model = models[Number(btn.dataset.model || 0)];
    if (!confirm(`Aplicar o modelo “${model.name}”? O conteúdo atual continuará no histórico.`)) return;
    await persist();
    activity.component = model.component;
    activity.subject = profileDefaults[model.component].subject;
    activity.title = model.title;
    activity.content = model.content;
    activity.objects = [];
    selectedObjectId = null;
    render(); scheduleSave(); closeDialog('modelsDialog'); toast(`Modelo ${model.name} aplicado.`);
  }));
};
$('modelsBtn').addEventListener('click', () => { renderModels(); showDialog('modelsDialog'); });

const saveRemoteImage = async (item: ImageBankItem) => {
  try {
    await fetch('/.netlify/functions/save-image', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(item) });
  } catch { /* local bank remains */ }
};
const deleteRemoteImage = async (id: string) => {
  try { await fetch('/.netlify/functions/delete-image', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) }); } catch { /* ignore */ }
};
const mergeRemoteImages = async () => {
  const local = getImageBank();
  if (!navigator.onLine) return local;
  try {
    const res = await fetch('/.netlify/functions/list-images');
    if (!res.ok) return local;
    const json = await res.json();
    const remote = Array.isArray(json?.data) ? json.data as ImageBankItem[] : [];
    const map = new Map<string, ImageBankItem>();
    [...remote, ...local].forEach(item => item?.id && map.set(item.id, item));
    const merged = [...map.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    setImageBank(merged);
    return merged;
  } catch { return local; }
};

let imageBankCache: ImageBankItem[] = [];
const paintImageBank = () => {
  const list = $('imageBankList');
  if (!imageBankCache.length) { list.innerHTML = '<div class="empty">Seu banco de imagens está vazio.</div>'; return; }
  list.innerHTML = imageBankCache.map(item => `<article class="image-card"><img src="${item.dataUrl}" alt="${escapeHtml(item.name)}"><div><strong>${escapeHtml(item.name)}</strong><div class="card-actions"><button data-use-image="${item.id}" type="button">Inserir</button><button data-delete-image="${item.id}" class="danger" type="button">Excluir</button></div></div></article>`).join('');
  list.querySelectorAll<HTMLButtonElement>('[data-use-image]').forEach(btn => btn.addEventListener('click', () => {
    const item = imageBankCache.find(x => x.id === btn.dataset.useImage);
    if (!item) return;
    addFloatingImage(item.dataUrl, item.name);
    closeDialog('imageBankDialog');
  }));
  list.querySelectorAll<HTMLButtonElement>('[data-delete-image]').forEach(btn => btn.addEventListener('click', () => {
    const id = btn.dataset.deleteImage || '';
    imageBankCache = imageBankCache.filter(x => x.id !== id);
    setImageBank(imageBankCache);
    if (navigator.onLine) void deleteRemoteImage(id);
    paintImageBank();
  }));
};
$('imageBankBtn').addEventListener('click', async () => {
  showDialog('imageBankDialog');
  $('imageBankList').innerHTML = '<div class="empty">Carregando imagens…</div>';
  imageBankCache = await mergeRemoteImages();
  paintImageBank();
});
$<HTMLInputElement>('imageBankUpload').addEventListener('change', async event => {
  const input = event.target as HTMLInputElement;
  const files = [...(input.files || [])].filter(file => file.type.startsWith('image/'));
  for (const file of files) {
    const item: ImageBankItem = { id: newId(), name: file.name, dataUrl: await fileToDataUrl(file), createdAt: nowIso() };
    imageBankCache.unshift(item);
    if (navigator.onLine) void saveRemoteImage(item);
  }
  setImageBank(imageBankCache);
  paintImageBank();
  input.value = '';
});
$('openGoogleImagesBtn').addEventListener('click', () => {
  const query = $<HTMLInputElement>('webImageQuery').value.trim();
  if (!query) { toast('Digite primeiro o tema da imagem.'); return; }
  window.open(`https://www.google.com/search?tbm=isch&q=${encodeURIComponent(query)}`, '_blank', 'noopener,noreferrer');
});

const renderHistory = () => {
  const list = $('historyList');
  const items = getHistory().filter(x => x.activity.id === activity.id);
  if (!items.length) { list.innerHTML = '<div class="empty">Ainda não há versões anteriores desta atividade.</div>'; return; }
  list.innerHTML = items.map(item => `<article class="history-card"><div><strong>${new Date(item.savedAt).toLocaleString('pt-BR')}</strong><small>${escapeHtml(item.activity.title)}</small></div><button data-restore="${escapeHtml(item.id)}" type="button">Restaurar</button></article>`).join('');
  list.querySelectorAll<HTMLButtonElement>('[data-restore]').forEach(btn => btn.addEventListener('click', async () => {
    const version = getHistory().find(x => x.id === btn.dataset.restore);
    if (!version || !confirm('Restaurar esta versão? A atual será preservada no histórico.')) return;
    await persist(); activity = structuredClone(version.activity); selectedObjectId = null; activity.updatedAt = nowIso(); render(); await persist(); closeDialog('historyDialog'); toast('Versão restaurada.');
  }));
};
$('historyBtn').addEventListener('click', () => { renderHistory(); showDialog('historyDialog'); });

$('aiBtn').addEventListener('click', () => {
  $<HTMLSelectElement>('aiComponent').value = activity.component;
  $<HTMLInputElement>('aiGrade').value = activity.grade;
  $<HTMLElement>('aiStatus').textContent = 'A IA usa sua biblioteca como referência quando a chave da API estiver configurada no Netlify.';
  showDialog('aiDialog');
});

$<HTMLFormElement>('aiForm').addEventListener('submit', async event => {
  event.preventDefault();
  const aiStatus = $('aiStatus');
  const button = $<HTMLButtonElement>('aiGenerateBtn');
  const component = $<HTMLSelectElement>('aiComponent').value as ComponentKind;
  const grade = $<HTMLInputElement>('aiGrade').value.trim();
  const topic = $<HTMLInputElement>('aiTopic').value.trim();
  const questionCount = Math.min(30, Math.max(1, Number($<HTMLInputElement>('aiQuestionCount').value) || 8));
  const questionType = $<HTMLSelectElement>('aiQuestionType').value;
  const notes = $<HTMLTextAreaElement>('aiNotes').value.trim();
  const useLibrary = $<HTMLInputElement>('aiUseLibrary').checked;
  if (!topic) return;
  const references = useLibrary ? getLibrary().filter(item => item.component === component).slice(0, 4).map(item => ({ title: item.title, grade: item.grade, text: stripHtml(item.content).slice(0, 2500) })) : [];
  button.disabled = true;
  aiStatus.textContent = 'Gerando atividade…';
  try {
    const res = await fetch('/.netlify/functions/generate-activity', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ component, grade, topic, questionCount, questionType, notes, references })
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json?.ok || typeof json.html !== 'string') throw new Error(json?.error || 'A IA ainda não está configurada.');
    await persist();
    activity.component = component;
    activity.subject = profileDefaults[component].subject;
    activity.grade = grade || activity.grade;
    activity.title = json.title || (component === 'english' ? 'ENGLISH ACTIVITY / 2026' : 'ATIVIDADE DE PROJETO DE VIDA / 2026');
    activity.content = sanitizeImportedHtml(json.html);
    activity.objects = [];
    selectedObjectId = null;
    render(); scheduleSave(); closeDialog('aiDialog');
    toast('Atividade criada pela IA e aberta para edição.');
  } catch (error) {
    aiStatus.textContent = error instanceof Error ? error.message : 'Não foi possível gerar.';
  } finally {
    button.disabled = false;
  }
});

window.addEventListener('online', () => { void persist(); });
window.addEventListener('beforeunload', () => {
  activity.content = editor.innerHTML;
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(activity)); } catch { /* ignore */ }
});

render();
void persist();
