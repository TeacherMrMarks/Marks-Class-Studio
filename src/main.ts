import './style.css';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import mammoth from 'mammoth';
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

type Activity = {
  id: string;
  school: string;
  teacher: string;
  subject: string;
  grade: string;
  title: string;
  content: string;
  logoDataUrl?: string;
  sourceName?: string;
  createdAt: string;
  updatedAt: string;
};

type HistoryItem = {
  id: string;
  savedAt: string;
  activity: Activity;
};

const STORAGE_KEY = 'marks-class-studio:draft:v2';
const LIBRARY_KEY = 'marks-class-studio:library:v2';
const HISTORY_KEY = 'marks-class-studio:history:v2';
const MAX_HISTORY = 15;

const nowIso = () => new Date().toISOString();
const newId = () => crypto.randomUUID();

const blankActivity = (): Activity => ({
  id: newId(),
  school: 'Escola',
  teacher: 'Prof. Adeilson Marks',
  subject: 'Língua Inglesa',
  grade: '2º Ano EM',
  title: 'Nova atividade',
  content: '<p><strong>1.</strong> Digite aqui a primeira questão da atividade.</p><p><strong>A)</strong> Alternativa A<br><strong>B)</strong> Alternativa B<br><strong>C)</strong> Alternativa C<br><strong>D)</strong> Alternativa D</p>',
  createdAt: nowIso(),
  updatedAt: nowIso()
});

const safeJson = <T>(value: string | null, fallback: T): T => {
  if (!value) return fallback;
  try { return JSON.parse(value) as T; } catch { return fallback; }
};

const loadLocal = (): Activity => {
  const saved = safeJson<Partial<Activity>>(localStorage.getItem(STORAGE_KEY), {});
  const base = blankActivity();
  return { ...base, ...saved, id: saved.id || base.id, createdAt: saved.createdAt || base.createdAt };
};

const getLibrary = (): Activity[] => safeJson<Activity[]>(localStorage.getItem(LIBRARY_KEY), []);
const setLibrary = (items: Activity[]) => {
  try { localStorage.setItem(LIBRARY_KEY, JSON.stringify(items.slice(0, 80))); } catch { /* quota: cloud save still works */ }
};
const getHistory = (): HistoryItem[] => safeJson<HistoryItem[]>(localStorage.getItem(HISTORY_KEY), []);
const setHistory = (items: HistoryItem[]) => {
  try { localStorage.setItem(HISTORY_KEY, JSON.stringify(items.slice(0, MAX_HISTORY))); } catch { /* ignore quota */ }
};

let activity = loadLocal();
let saveTimer: number | undefined;
let importBusy = false;

const app = document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML = `
<div class="app">
  <header class="topbar">
    <div class="brand">Marks Class Studio<small>Atividades • avaliações • materiais pedagógicos • V2</small></div>
    <span id="saveStatus" class="status saved">Salvo localmente</span>
    <div class="actions">
      <button class="btn ghost" id="previewBtn">Prévia</button>
      <button class="btn primary" id="pdfBtn">Gerar PDF</button>
      <button class="btn" id="shareBtn">Compartilhar</button>
    </div>
  </header>

  <div class="workspace">
    <aside class="sidebar">
      <div class="sidebar-title">
        <h3>Dados da atividade</h3>
        <button class="mini primary-mini" id="newActivityBtn" type="button">＋ Nova</button>
      </div>
      <div class="field"><label>Escola</label><input id="schoolInput" /></div>
      <div class="field"><label>Professor</label><input id="teacherInput" /></div>
      <div class="field"><label>Disciplina</label><input id="subjectInput" /></div>
      <div class="field"><label>Série / turma</label><input id="gradeInput" /></div>
      <div class="field"><label>Título</label><input id="titleInput" /></div>
      <div class="field">
        <label>Logomarca</label>
        <input id="logoInput" type="file" accept="image/*" />
      </div>
      <div class="import-zone" id="importZone">
        <strong>Importar atividade</strong>
        <span>PDF e DOCX entram como conteúdo editável e aparecem imediatamente na folha A4.</span>
        <input id="fileInput" type="file" accept=".pdf,.doc,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" multiple />
        <small id="importStatus">Nenhum arquivo importado.</small>
      </div>
      <div class="menu">
        <button id="libraryBtn" type="button">📚 Biblioteca de atividades <span>›</span></button>
        <button id="modelsBtn" type="button">🧩 Modelos <span>›</span></button>
        <button id="historyBtn" type="button">🕘 Histórico de versões <span>›</span></button>
      </div>
    </aside>

    <main class="main">
      <div class="editing-head">
        <div><strong>Edição A4</strong><span>O que você digita ou importa aparece na hora.</span></div>
        <span class="live-badge"><i></i> Prévia em tempo real</span>
      </div>
      <div class="toolbar" id="toolbar">
        <select id="fontName" title="Fonte">
          <option>Arial</option><option>Calibri</option><option>Times New Roman</option><option>Georgia</option><option>Verdana</option>
        </select>
        <select id="fontSize" title="Tamanho">
          <option value="2">10</option><option value="3" selected>12</option><option value="4">14</option><option value="5">18</option><option value="6">24</option>
        </select>
        <span class="sep"></span>
        <button data-cmd="bold" title="Negrito"><b>B</b></button>
        <button data-cmd="italic" title="Itálico"><i>I</i></button>
        <button data-cmd="underline" title="Sublinhado"><u>U</u></button>
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
        <span class="sep"></span>
        <select id="lineHeight" title="Espaçamento entre linhas">
          <option value="1">1,0</option><option value="1.15">1,15</option><option value="1.5" selected>1,5</option><option value="2">2,0</option>
        </select>
        <button id="insertImageBtn" title="Inserir imagem">🖼 Imagem</button>
        <input id="editorImageInput" type="file" accept="image/*" hidden />
        <button data-cmd="undo" title="Desfazer">↶</button>
        <button data-cmd="redo" title="Refazer">↷</button>
        <button id="resetFormat" title="Restaurar padrão">Arial 12</button>
      </div>

      <div class="document-wrap">
        <section class="page" id="page">
          <div class="school-head">
            <img id="schoolLogo" class="logo" alt="Logomarca da escola" />
            <h1 id="schoolText"></h1>
            <p><span id="teacherText"></span> • <span id="subjectText"></span></p>
          </div>
          <div class="meta">
            <div><strong>Aluno(a):</strong> <span class="line"></span></div>
            <div><strong>Data:</strong> ____/____/________</div>
            <div><strong>Turma:</strong> <span id="gradeText"></span></div>
            <div><strong>Nota:</strong> ________</div>
            <div class="full activity-title"><strong id="titleText"></strong></div>
          </div>
          <div id="editor" contenteditable="true" spellcheck="true" aria-label="Editor da atividade"></div>
        </section>
        <div class="hint">Arial 12 e texto justificado como padrão. Autosave após cada alteração.</div>
      </div>
    </main>
  </div>
</div>

<div id="toast" class="toast" role="status" aria-live="polite"></div>

<dialog id="previewDialog" class="modal preview-modal">
  <div class="modal-head"><div><strong>Prévia da atividade</strong><small>Atualizada com o conteúdo atual</small></div><button data-close="previewDialog">✕</button></div>
  <div class="preview-stage"><div id="previewMount"></div></div>
  <div class="modal-actions"><button class="btn" data-close="previewDialog">Voltar à edição</button><button class="btn primary" id="printBtn">Imprimir</button></div>
</dialog>

<dialog id="libraryDialog" class="modal">
  <div class="modal-head"><div><strong>Biblioteca de atividades</strong><small>Atividades salvas localmente e sincronizadas</small></div><button data-close="libraryDialog">✕</button></div>
  <div id="libraryList" class="card-list"></div>
  <div class="modal-actions"><button class="btn" data-close="libraryDialog">Fechar</button></div>
</dialog>

<dialog id="modelsDialog" class="modal">
  <div class="modal-head"><div><strong>Modelos</strong><small>Escolha uma estrutura para começar</small></div><button data-close="modelsDialog">✕</button></div>
  <div id="modelsList" class="model-grid"></div>
  <div class="modal-actions"><button class="btn" data-close="modelsDialog">Fechar</button></div>
</dialog>

<dialog id="historyDialog" class="modal">
  <div class="modal-head"><div><strong>Histórico de versões</strong><small>Restaure uma versão anterior da atividade atual</small></div><button data-close="historyDialog">✕</button></div>
  <div id="historyList" class="card-list"></div>
  <div class="modal-actions"><button class="btn" data-close="historyDialog">Fechar</button></div>
</dialog>
`;

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const editor = $('editor') as HTMLDivElement;
const status = $('saveStatus');
const inputs = {
  school: $('schoolInput') as HTMLInputElement,
  teacher: $('teacherInput') as HTMLInputElement,
  subject: $('subjectInput') as HTMLInputElement,
  grade: $('gradeInput') as HTMLInputElement,
  title: $('titleInput') as HTMLInputElement
};

const toast = (message: string) => {
  const el = $('toast');
  el.textContent = message;
  el.classList.add('show');
  window.setTimeout(() => el.classList.remove('show'), 2600);
};

const escapeHtml = (value: string) => value.replace(/[&<>'"]/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
}[char] || char));

const stripExtension = (name: string) => name.replace(/\.[^.]+$/, '');

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

const renderHeader = () => {
  $('schoolText').textContent = activity.school;
  $('teacherText').textContent = activity.teacher;
  $('subjectText').textContent = activity.subject;
  $('gradeText').textContent = activity.grade;
  $('titleText').textContent = activity.title;
  const logo = $('schoolLogo') as HTMLImageElement;
  if (activity.logoDataUrl) {
    logo.src = activity.logoDataUrl;
    logo.style.display = 'block';
  } else {
    logo.removeAttribute('src');
    logo.style.display = 'none';
  }
};

const render = () => {
  inputs.school.value = activity.school;
  inputs.teacher.value = activity.teacher;
  inputs.subject.value = activity.subject;
  inputs.grade.value = activity.grade;
  inputs.title.value = activity.title;
  renderHeader();
  editor.innerHTML = activity.content;
  renderPreview();
};

const renderPreview = () => {
  const mount = $('previewMount');
  const page = $('page');
  const clone = page.cloneNode(true) as HTMLElement;
  clone.removeAttribute('id');
  clone.querySelectorAll('[contenteditable]').forEach(el => el.removeAttribute('contenteditable'));
  mount.innerHTML = '';
  mount.appendChild(clone);
};

const updateHeader = () => {
  activity.school = inputs.school.value;
  activity.teacher = inputs.teacher.value;
  activity.subject = inputs.subject.value;
  activity.grade = inputs.grade.value;
  activity.title = inputs.title.value;
  renderHeader();
  renderPreview();
  scheduleSave();
};

const upsertLocalLibrary = (item: Activity) => {
  const items = getLibrary().filter(x => x.id !== item.id);
  items.unshift(structuredClone(item));
  setLibrary(items);
};

const addHistorySnapshot = (item: Activity) => {
  const list = getHistory();
  const signature = `${item.title}|${item.content}|${item.school}|${item.subject}|${item.grade}`;
  const first = list[0];
  const firstSignature = first ? `${first.activity.title}|${first.activity.content}|${first.activity.school}|${first.activity.subject}|${first.activity.grade}` : '';
  if (signature === firstSignature) return;
  list.unshift({ id: newId(), savedAt: nowIso(), activity: structuredClone(item) });
  setHistory(list);
};

const saveRemote = async (payload: Activity) => {
  try {
    const res = await fetch('/.netlify/functions/save-activity', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
    });
    return res.ok;
  } catch { return false; }
};

const persist = async () => {
  activity.content = editor.innerHTML;
  activity.updatedAt = nowIso();
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(activity)); } catch { toast('O armazenamento local ficou cheio; tentando salvar na nuvem.'); }
  upsertLocalLibrary(activity);
  addHistorySnapshot(activity);
  status.textContent = 'Salvo localmente';
  status.className = 'status saved';
  if (navigator.onLine) {
    const ok = await saveRemote(activity);
    status.textContent = ok ? 'Sincronizado' : 'Salvo localmente';
    if (ok) status.className = 'status synced';
  }
  renderPreview();
};

function scheduleSave() {
  status.textContent = 'Salvando…';
  status.className = 'status saving';
  window.clearTimeout(saveTimer);
  saveTimer = window.setTimeout(persist, 650);
}

Object.values(inputs).forEach(i => i.addEventListener('input', updateHeader));
editor.addEventListener('input', () => { activity.content = editor.innerHTML; renderPreview(); scheduleSave(); });

$('toolbar').querySelectorAll<HTMLButtonElement>('button[data-cmd]').forEach(btn => {
  btn.addEventListener('click', () => {
    editor.focus();
    document.execCommand(btn.dataset.cmd || '');
    activity.content = editor.innerHTML;
    renderPreview();
    scheduleSave();
  });
});

($('fontName') as HTMLSelectElement).addEventListener('change', (e) => {
  editor.focus(); document.execCommand('fontName', false, (e.target as HTMLSelectElement).value); scheduleSave();
});
($('fontSize') as HTMLSelectElement).addEventListener('change', (e) => {
  editor.focus(); document.execCommand('fontSize', false, (e.target as HTMLSelectElement).value); scheduleSave();
});
($('lineHeight') as HTMLSelectElement).addEventListener('change', (e) => {
  const value = (e.target as HTMLSelectElement).value;
  const sel = window.getSelection();
  if (!sel?.rangeCount) return;
  let node: Node | null = sel.anchorNode;
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

$('logoInput').addEventListener('change', (e) => {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    activity.logoDataUrl = String(reader.result || '');
    renderHeader(); renderPreview(); scheduleSave();
  };
  reader.readAsDataURL(file);
});

$('insertImageBtn').addEventListener('click', () => ($('editorImageInput') as HTMLInputElement).click());
$('editorImageInput').addEventListener('change', (e) => {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    editor.focus();
    document.execCommand('insertImage', false, String(reader.result || ''));
    activity.content = editor.innerHTML;
    renderPreview(); scheduleSave();
    (e.target as HTMLInputElement).value = '';
  };
  reader.readAsDataURL(file);
});

const extractPdfHtml = async (file: File) => {
  const data = new Uint8Array(await file.arrayBuffer());
  const pdf = await getDocument({ data }).promise;
  const pages: string[] = [];
  for (let pageNo = 1; pageNo <= pdf.numPages; pageNo++) {
    const page = await pdf.getPage(pageNo);
    const text = await page.getTextContent();
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
    convertImage: mammoth.images.imgElement(async image => ({
      src: `data:${image.contentType};base64,${await image.read('base64')}`
    }))
  });
  if (result.messages.length) console.info('Mammoth:', result.messages);
  return sanitizeImportedHtml(result.value || '<p>Documento sem conteúdo reconhecível.</p>');
};

const importFile = async (file: File): Promise<Activity> => {
  const ext = file.name.toLowerCase().split('.').pop() || '';
  let content = '';
  if (ext === 'pdf' || file.type === 'application/pdf') content = await extractPdfHtml(file);
  else if (ext === 'docx') content = await extractDocxHtml(file);
  else if (ext === 'doc') throw new Error('O formato .DOC antigo não permite conversão confiável no navegador. Salve como .DOCX ou PDF.');
  else throw new Error('Formato não suportado. Use PDF ou DOCX.');

  const created = nowIso();
  return {
    ...activity,
    id: newId(),
    title: stripExtension(file.name),
    content,
    sourceName: file.name,
    createdAt: created,
    updatedAt: created
  };
};

$('fileInput').addEventListener('change', async (e) => {
  const input = e.target as HTMLInputElement;
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
      activity = imported[0];
      render();
      await persist();
      editor.focus();
      importStatus.textContent = `${imported.length} atividade(s) importada(s). Conteúdo aberto na edição.`;
      toast('Importação concluída: a atividade já está editável na folha A4.');
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
  const page = $('page');
  const canvas = await html2canvas(page, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
  const imgData = canvas.toDataURL('image/jpeg', 0.96);
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
};

const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
};

const showDialog = (id: string) => {
  const dialog = $(id) as HTMLDialogElement;
  if (typeof dialog.showModal === 'function') dialog.showModal(); else dialog.setAttribute('open', '');
};
const closeDialog = (id: string) => {
  const dialog = $(id) as HTMLDialogElement;
  if (typeof dialog.close === 'function') dialog.close(); else dialog.removeAttribute('open');
};

document.querySelectorAll<HTMLElement>('[data-close]').forEach(btn => btn.addEventListener('click', () => closeDialog(btn.dataset.close || '')));

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
  toast('O PDF foi baixado para você compartilhar pelo WhatsApp.');
});

$('newActivityBtn').addEventListener('click', async () => {
  if (!confirm('Criar uma nova atividade? A atividade atual já está salva na biblioteca.')) return;
  await persist();
  activity = { ...blankActivity(), school: activity.school, teacher: activity.teacher, subject: activity.subject, grade: activity.grade, logoDataUrl: activity.logoDataUrl };
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
    [...json.data, ...local].forEach((item: Activity) => {
      if (!item?.id) return;
      const current = map.get(item.id);
      if (!current || String(item.updatedAt) > String(current.updatedAt)) map.set(item.id, item);
    });
    const merged = [...map.values()].sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
    setLibrary(merged);
    return merged;
  } catch { return local; }
};

const renderLibrary = async () => {
  const list = $('libraryList');
  list.innerHTML = '<div class="empty">Carregando biblioteca…</div>';
  const items = await mergeRemoteLibrary(getLibrary());
  if (!items.length) { list.innerHTML = '<div class="empty">Sua biblioteca ainda está vazia.</div>'; return; }
  list.innerHTML = items.map(item => `
    <article class="activity-card" data-id="${escapeHtml(item.id)}">
      <div><strong>${escapeHtml(item.title || 'Sem título')}</strong><small>${escapeHtml(item.subject || '')} • ${escapeHtml(item.grade || '')}</small><em>${new Date(item.updatedAt).toLocaleString('pt-BR')}</em></div>
      <div class="card-actions"><button data-open="${escapeHtml(item.id)}">Abrir</button><button data-duplicate="${escapeHtml(item.id)}">Duplicar</button><button class="danger" data-delete="${escapeHtml(item.id)}">Excluir</button></div>
    </article>`).join('');

  list.querySelectorAll<HTMLButtonElement>('[data-open]').forEach(btn => btn.addEventListener('click', async () => {
    const item = getLibrary().find(x => x.id === btn.dataset.open);
    if (!item) return;
    await persist(); activity = structuredClone(item); render(); closeDialog('libraryDialog'); await persist(); toast('Atividade aberta.');
  }));
  list.querySelectorAll<HTMLButtonElement>('[data-duplicate]').forEach(btn => btn.addEventListener('click', async () => {
    const item = getLibrary().find(x => x.id === btn.dataset.duplicate);
    if (!item) return;
    const copy = { ...structuredClone(item), id: newId(), title: `${item.title} — cópia`, createdAt: nowIso(), updatedAt: nowIso() };
    upsertLocalLibrary(copy); if (navigator.onLine) void saveRemote(copy); await renderLibrary(); toast('Cópia criada.');
  }));
  list.querySelectorAll<HTMLButtonElement>('[data-delete]').forEach(btn => btn.addEventListener('click', async () => {
    const id = btn.dataset.delete || '';
    const item = getLibrary().find(x => x.id === id);
    if (!item || !confirm(`Excluir “${item.title}” da biblioteca?`)) return;
    setLibrary(getLibrary().filter(x => x.id !== id));
    if (navigator.onLine) {
      try { await fetch('/.netlify/functions/delete-activity', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) }); } catch { /* local deletion still happened */ }
    }
    await renderLibrary(); toast('Atividade excluída.');
  }));
};

$('libraryBtn').addEventListener('click', async () => { showDialog('libraryDialog'); await renderLibrary(); });

const models = [
  { name: 'Atividade', title: 'Atividade', description: 'Estrutura simples para aula e exercício.', content: '<p><strong>Orientações:</strong> Leia com atenção e responda às questões.</p><p><strong>1.</strong> Digite aqui a primeira questão.</p><p><strong>2.</strong> Digite aqui a segunda questão.</p>' },
  { name: 'Avaliação', title: 'Avaliação Trimestral', description: 'Modelo para prova com enunciados e espaço de resposta.', content: '<p><strong>Orientações:</strong> Leia todas as questões com atenção antes de responder.</p><p><strong>1.</strong> Questão 1.</p><p><strong>2.</strong> Questão 2.</p><p><strong>3.</strong> Questão 3.</p>' },
  { name: 'Recuperação', title: 'Atividade de Recuperação Trimestral', description: 'Modelo de recuperação com revisão de conteúdos.', content: '<p><strong>Orientações:</strong> Retome os conteúdos trabalhados e responda com atenção.</p><p><strong>1.</strong> Questão de revisão.</p><p><strong>2.</strong> Questão de consolidação.</p>' },
  { name: 'Simulado', title: 'Simulado', description: 'Modelo para questões objetivas de múltipla escolha.', content: '<p><strong>1.</strong> Enunciado da questão.</p><p>A) Alternativa A<br>B) Alternativa B<br>C) Alternativa C<br>D) Alternativa D<br>E) Alternativa E</p>' },
  { name: 'Pesquisa', title: 'Atividade de Pesquisa', description: 'Roteiro para investigação e produção do aluno.', content: '<p><strong>Tema da pesquisa:</strong> ____________________________________</p><p><strong>Objetivo:</strong> Pesquisar, organizar e apresentar informações sobre o tema proposto.</p><p><strong>Questões norteadoras:</strong></p><ol><li>O que é?</li><li>Quais são suas principais características?</li><li>Qual a importância do tema?</li></ol>' }
];

const renderModels = () => {
  const list = $('modelsList');
  list.innerHTML = models.map((model, index) => `<button class="model-card" data-model="${index}"><span>${index === 0 ? '📝' : index === 1 ? '✅' : index === 2 ? '🔁' : index === 3 ? '🎯' : '🔎'}</span><strong>${model.name}</strong><small>${model.description}</small></button>`).join('');
  list.querySelectorAll<HTMLButtonElement>('[data-model]').forEach(btn => btn.addEventListener('click', async () => {
    const model = models[Number(btn.dataset.model || 0)];
    if (!confirm(`Aplicar o modelo “${model.name}”? O conteúdo atual continuará salvo no histórico.`)) return;
    await persist();
    activity.title = model.title;
    activity.content = model.content;
    render(); scheduleSave(); closeDialog('modelsDialog'); toast(`Modelo ${model.name} aplicado.`);
  }));
};
$('modelsBtn').addEventListener('click', () => { renderModels(); showDialog('modelsDialog'); });

const renderHistory = () => {
  const list = $('historyList');
  const items = getHistory().filter(x => x.activity.id === activity.id);
  if (!items.length) { list.innerHTML = '<div class="empty">Ainda não há versões anteriores desta atividade.</div>'; return; }
  list.innerHTML = items.map(item => `<article class="history-card"><div><strong>${new Date(item.savedAt).toLocaleString('pt-BR')}</strong><small>${escapeHtml(item.activity.title)}</small></div><button data-restore="${escapeHtml(item.id)}">Restaurar</button></article>`).join('');
  list.querySelectorAll<HTMLButtonElement>('[data-restore]').forEach(btn => btn.addEventListener('click', async () => {
    const version = getHistory().find(x => x.id === btn.dataset.restore);
    if (!version || !confirm('Restaurar esta versão? A versão atual será preservada no histórico.')) return;
    await persist(); activity = structuredClone(version.activity); activity.updatedAt = nowIso(); render(); await persist(); closeDialog('historyDialog'); toast('Versão restaurada.');
  }));
};
$('historyBtn').addEventListener('click', () => { renderHistory(); showDialog('historyDialog'); });

window.addEventListener('online', () => { void persist(); });
window.addEventListener('beforeunload', () => {
  activity.content = editor.innerHTML;
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(activity)); } catch { /* ignore */ }
});

render();
void persist();
