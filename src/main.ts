import './style.css';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

type Activity = {
  id: string;
  school: string;
  teacher: string;
  subject: string;
  grade: string;
  title: string;
  content: string;
  updatedAt: string;
};

const STORAGE_KEY = 'teacher-marks-edu-studio:draft:v1';
const defaultActivity: Activity = {
  id: crypto.randomUUID(),
  school: 'Escola',
  teacher: 'Prof. Adeilson Marks',
  subject: 'Língua Inglesa',
  grade: '2º Ano EM',
  title: 'Atividade',
  content: `<p><strong>1.</strong> Digite aqui a primeira questão da atividade.</p><p><strong>A)</strong> Alternativa A<br><strong>B)</strong> Alternativa B<br><strong>C)</strong> Alternativa C<br><strong>D)</strong> Alternativa D</p>`,
  updatedAt: new Date().toISOString()
};

const loadLocal = (): Activity => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...defaultActivity, ...JSON.parse(raw) } : defaultActivity;
  } catch { return defaultActivity; }
};

let activity = loadLocal();
let saveTimer: number | undefined;

const app = document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML = `
<div class="app">
  <header class="topbar">
    <div class="brand">Teacher Marks Edu Studio<small>Editor pedagógico • V1</small></div>
    <span id="saveStatus" class="status saved">Salvo localmente</span>
    <div class="actions">
      <button class="btn ghost" id="previewBtn">Visualizar impressão</button>
      <button class="btn primary" id="pdfBtn">Baixar PDF</button>
      <button class="btn" id="shareBtn">Compartilhar</button>
    </div>
  </header>

  <div class="workspace">
    <aside class="sidebar">
      <h3>Dados da atividade</h3>
      <div class="field"><label>Escola</label><input id="schoolInput" /></div>
      <div class="field"><label>Professor</label><input id="teacherInput" /></div>
      <div class="field"><label>Disciplina</label><input id="subjectInput" /></div>
      <div class="field"><label>Série / turma</label><input id="gradeInput" /></div>
      <div class="field"><label>Título</label><input id="titleInput" /></div>
      <div class="field">
        <label>Logomarca</label>
        <input id="logoInput" type="file" accept="image/*" />
      </div>
      <div class="import-zone">
        <strong>Importar material</strong><br>
        PDF e Word entram na biblioteca nesta base; a leitura inteligente será ligada no próximo módulo.
        <input id="fileInput" type="file" accept=".pdf,.doc,.docx" multiple />
      </div>
      <div class="menu">
        <button type="button">📚 Biblioteca de atividades</button>
        <button type="button">🧩 Modelos</button>
        <button type="button">🕘 Histórico de versões</button>
      </div>
    </aside>

    <main class="main">
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
            <div class="full"><strong id="titleText"></strong></div>
          </div>
          <div id="editor" contenteditable="true" spellcheck="true"></div>
        </section>
        <div class="hint">Padrão: Arial 12, texto justificado. O conteúdo é salvo automaticamente.</div>
      </div>
    </main>
  </div>
</div>`;

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const editor = $('editor') as HTMLDivElement;
const status = $('saveStatus');
const inputs = {
  school: $('schoolInput') as HTMLInputElement,
  teacher: $('teacherInput') as HTMLInputElement,
  subject: $('subjectInput') as HTMLInputElement,
  grade: $('gradeInput') as HTMLInputElement,
  title: $('titleInput') as HTMLInputElement,
};

const render = () => {
  inputs.school.value = activity.school;
  inputs.teacher.value = activity.teacher;
  inputs.subject.value = activity.subject;
  inputs.grade.value = activity.grade;
  inputs.title.value = activity.title;
  $('schoolText').textContent = activity.school;
  $('teacherText').textContent = activity.teacher;
  $('subjectText').textContent = activity.subject;
  $('gradeText').textContent = activity.grade;
  $('titleText').textContent = activity.title;
  editor.innerHTML = activity.content;
};

const updateHeader = () => {
  activity.school = inputs.school.value;
  activity.teacher = inputs.teacher.value;
  activity.subject = inputs.subject.value;
  activity.grade = inputs.grade.value;
  activity.title = inputs.title.value;
  $('schoolText').textContent = activity.school;
  $('teacherText').textContent = activity.teacher;
  $('subjectText').textContent = activity.subject;
  $('gradeText').textContent = activity.grade;
  $('titleText').textContent = activity.title;
  scheduleSave();
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
  activity.updatedAt = new Date().toISOString();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(activity));
  status.textContent = 'Salvo localmente';
  status.className = 'status saved';
  if (navigator.onLine) {
    const ok = await saveRemote(activity);
    if (ok) status.textContent = 'Sincronizado';
  }
};

function scheduleSave() {
  status.textContent = 'Salvando…';
  status.className = 'status saving';
  window.clearTimeout(saveTimer);
  saveTimer = window.setTimeout(persist, 700);
}

Object.values(inputs).forEach(i => i.addEventListener('input', updateHeader));
editor.addEventListener('input', scheduleSave);

$('toolbar').querySelectorAll<HTMLButtonElement>('button[data-cmd]').forEach(btn => {
  btn.addEventListener('click', () => {
    editor.focus();
    document.execCommand(btn.dataset.cmd || '');
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
  scheduleSave();
});

$('resetFormat').addEventListener('click', () => {
  editor.focus(); document.execCommand('removeFormat'); document.execCommand('fontName', false, 'Arial'); document.execCommand('fontSize', false, '3'); document.execCommand('justifyFull'); scheduleSave();
});

$('logoInput').addEventListener('change', (e) => {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    const img = $('schoolLogo') as HTMLImageElement;
    img.src = String(reader.result);
    img.style.display = 'block';
    localStorage.setItem('teacher-marks-edu-studio:logo', String(reader.result));
  };
  reader.readAsDataURL(file);
});

const savedLogo = localStorage.getItem('teacher-marks-edu-studio:logo');
if (savedLogo) { const img = $('schoolLogo') as HTMLImageElement; img.src = savedLogo; img.style.display = 'block'; }

$('fileInput').addEventListener('change', (e) => {
  const files = Array.from((e.target as HTMLInputElement).files || []);
  if (!files.length) return;
  alert(`${files.length} arquivo(s) selecionado(s). Nesta V1 eles ficam preparados para o módulo de biblioteca/importação inteligente.`);
});

const makePdfBlob = async (): Promise<Blob> => {
  await persist();
  const page = $('page');
  const canvas = await html2canvas(page, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = 210;
  const pageHeight = 297;
  const imgWidth = pageWidth;
  const imgHeight = canvas.height * imgWidth / canvas.width;
  const imgData = canvas.toDataURL('image/jpeg', 0.95);
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

$('previewBtn').addEventListener('click', () => window.print());
$('pdfBtn').addEventListener('click', async () => {
  const blob = await makePdfBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = `${activity.title || 'atividade'}.pdf`; a.click();
  URL.revokeObjectURL(url);
});
$('shareBtn').addEventListener('click', async () => {
  const blob = await makePdfBlob();
  const file = new File([blob], `${activity.title || 'atividade'}.pdf`, { type: 'application/pdf' });
  if (navigator.share && (!navigator.canShare || navigator.canShare({ files: [file] }))) {
    await navigator.share({ title: activity.title, text: 'Atividade em PDF', files: [file] });
    return;
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = file.name; a.click(); URL.revokeObjectURL(url);
  alert('O compartilhamento direto de arquivos não está disponível neste navegador. O PDF foi baixado para você compartilhar pelo WhatsApp.');
});

window.addEventListener('online', persist);
render();
