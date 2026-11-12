/* Game code for Spell with Hen */

// Everything is wrapped in a function so none of our variables leak into the page.
(function(){

/* ---------- Little helpers ---------- */

// Shorthand for finding something on the page
const $ = s => document.querySelector(s);
// Make text safe to put into the page (so a word like <b> shows as text, not as HTML)
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// A short random id for each list
const uid = () => Math.random().toString(36).slice(2, 10);
// "1 word" / "3 words"
const plural = (n, w) => n + ' ' + w + (n === 1 ? '' : 's');

// Names used for saving in the browser. They all start with "lcwc-" so they never clash with
// other sites on the same address (handy on GitHub Pages, where all your sites share one).
// The "-v1" means that if the saved format ever changes, we can use v2 without breaking old data.
const LK = 'lcwc-lists-v1', SK = 'lcwc-settings-v1', SELK = 'lcwc-selected-v1';
// Read and write saved data. Some browsers (e.g. certain private-browsing modes) block storage,
// so every call is wrapped in try/catch: the game still works, it just forgets things when closed.
const store = {
  get(k, d){ try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch(e){ return d; } },
  set(k, v){ try { localStorage.setItem(k, JSON.stringify(v)); } catch(e){} }
};


// Small icons drawn in SVG, plus a few cheerful messages for correct answers
const TICK = '<svg width="16" height="16" viewBox="0 0 16 16"><path d="M3 8.5 6.5 12 13 4.5" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const STAR = '<svg width="84" height="84" viewBox="0 0 24 24"><path d="M12 2.6l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 17.4l-5.8 3.1 1.1-6.5L2.6 9.4l6.5-.9z" fill="#FFC531" stroke="#E0A400" stroke-width="1.2" stroke-linejoin="round"/></svg>';
const PRAISE = ['Brilliant!', 'Spot on!', 'Super spelling!', 'You got it!', 'Fantastic!', 'Well done!', 'Amazing!'];

/* ---------- Saved data ---------- */

// All the spelling lists: [{ id, name, words: [...] }, ...]
// The very first time someone opens the game there is nothing saved, so we add an example list.
let lists = store.get(LK, null);
if (!Array.isArray(lists)) {
  lists = [{ id: uid(), name: 'Example: tricky words', words: ['because','friend','said','people','could','would','school','beautiful'] }];
  store.set(LK, lists);
}
// Which lists are ticked. By default, the first list.
// The filter drops ids of any lists that have since been deleted.
let selected = new Set((store.get(SELK, null) || (lists[0] ? [lists[0].id] : [])).filter(id => lists.some(l => l.id === id)));
// Game options. Saved settings are laid over the defaults, so new options get sensible values.
// autoCover is in seconds (0 means the child taps "Cover it" themselves).
let settings = Object.assign({ shuffle: true, showLength: false, autoCover: 0 }, store.get(SK, {}));
// Which list is open in the editor: a list id, 'new' for a new list, or null when not editing
let editing = null;       // list id or 'new'
let confirmDelete = false; // Delete needs two taps, so lists are not lost by accident

const saveLists = () => store.set(LK, lists);
const saveSel = () => store.set(SELK, [...selected]);
const saveSettings = () => store.set(SK, settings);

// Turn whatever was typed or pasted into a clean list of words.
// - If there are line breaks, commas or semicolons, split on those (so phrases like "a lot" stay together).
// - Otherwise split on spaces (so "cat dog sun" works too).
// - Curly apostrophes from Word/Google Docs become plain ones, so they match the keyboard.
// - Anything that is not a letter, apostrophe, hyphen or space is removed (e.g. "1. cat" becomes "cat").
// - Duplicates are dropped, ignoring capitals.
function parseWords(text){
  text = text.replace(/[‘’ʼ]/g, "'");
  const parts = /[\n,;]/.test(text) ? text.split(/[\n,;]+/) : text.split(/\s+/);
  const seen = new Set(), out = [];
  for (let p of parts) {
    p = p.replace(/[^A-Za-z' \-]/g, '').replace(/\s+/g, ' ').trim().replace(/^[-']+|-+$/g, '');
    if (!p) continue;
    const k = p.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k); out.push(p);
  }
  return out;
}

// All the words from the ticked lists, in order, without repeats
function chosenWords(){
  const seen = new Set(), out = [];
  for (const l of lists) {
    if (!selected.has(l.id)) continue;
    for (const w of l.words) { const k = w.toLowerCase(); if (!seen.has(k)) { seen.add(k); out.push(w); } }
  }
  return out;
}

/* ---------- Setup screen ---------- */

// Each render function rebuilds its part of the page from the current data.
// This keeps things simple: change the data, then redraw.
function renderSetup(){ renderLists(); editing ? renderEditor() : renderChosen(); }

// The left-hand panel: one row per list
function renderLists(){
  $('#lists').innerHTML = lists.length ? lists.map(l => {
    const sel = selected.has(l.id);
    return `<div class="list-item">
      <button class="list-row ${sel ? 'sel' : ''}" data-act="toggle" data-id="${l.id}" aria-pressed="${sel}">
        <span class="tick">${TICK}</span>
        <span class="grow"><span class="list-name">${esc(l.name)}</span><span class="list-count">${plural(l.words.length, 'word')}</span></span>
      </button>
      <button class="btn small" data-act="edit" data-id="${l.id}">Edit</button>
    </div>`;
  }).join('') : '<p class="empty">No lists yet. Make your first one below.</p>';
}

// The right-hand panel when not editing: the chosen words, the settings and the Go button
function renderChosen(){
  const w = chosenWords();
  const tog = (k, label) => `<button class="toggle" data-act="set" data-k="${k}" aria-pressed="${!!settings[k]}"><span class="switch"></span>${label}</button>`;
  const coverLabel = settings.autoCover ? `after ${settings.autoCover}s` : 'when I tap';
  $('#right').innerHTML = `
    <h2>Words chosen <span class="count-badge">${w.length}</span></h2>
    <p class="sub">${w.length ? 'These are the words you will practise.' : 'Tap a list on the left to choose its words.'}</p>
    <div class="chips chosen">${w.map(x => `<span class="chip">${esc(x)}</span>`).join('')}</div>
    <div class="settings">
      ${tog('shuffle', 'Mix up the order')}
      ${tog('showLength', 'Show how many letters')}
      <button class="toggle" data-act="cycle">Cover the word<span class="val">${coverLabel}</span></button>
    </div>
    <div class="go-wrap"><button class="btn primary big" data-act="go" ${w.length ? '' : 'disabled'}>Go! →</button></div>`;
}

// The right-hand panel when making or editing a list
function renderEditor(){
  const isNew = editing === 'new';
  const l = isNew ? { name: '', words: [] } : lists.find(x => x.id === editing);
  if (!l) { editing = null; return renderChosen(); }
  confirmDelete = false;
  $('#right').innerHTML = `
    <h2>${isNew ? 'New list' : 'Edit list'}</h2>
    <p class="sub">Type or paste your spelling words.</p>
    <label class="field" for="ed-name">List name</label>
    <input id="ed-name" type="text" maxlength="60" autocomplete="off" placeholder="e.g. Week 3: 'ai' words" value="${esc(l.name)}">
    <label class="field" for="ed-words" style="margin-top:16px">Words</label>
    <textarea id="ed-words" spellcheck="false" placeholder="rain&#10;train&#10;paint&#10;snail">${esc(l.words.join('\n'))}</textarea>
    <p class="hint">One word per line, or separate them with commas. Letters, apostrophes and hyphens only. Capitals are kept, so “Monday” has to be written with a capital M.</p>
    <div class="chips" id="ed-preview"></div>
    <p class="err" id="ed-err" hidden></p>
    <div class="row" style="margin-top:18px">
      <button class="btn primary" data-act="save">Save list</button>
      <button class="btn" data-act="cancel">Cancel</button>
      ${isNew ? '' : '<button class="btn danger" data-act="delete" id="delBtn" style="margin-left:auto">Delete</button>'}
    </div>`;
  // Show a live preview of the words as they are typed, so it is clear how they will be split up
  const upd = () => {
    const w = parseWords($('#ed-words').value);
    $('#ed-preview').innerHTML = w.length
      ? `<span class="hint" style="width:100%;margin:0 0 2px">${plural(w.length, 'word')} found:</span>` + w.map(x => `<span class="chip">${esc(x)}</span>`).join('')
      : '';
  };
  $('#ed-words').addEventListener('input', upd);
  upd();
  if (isNew) $('#ed-name').focus();
}

// Save the list being edited. A new list is ticked straight away, ready to play.
function saveEditor(){
  const name = $('#ed-name').value.trim() || 'My list';
  const words = parseWords($('#ed-words').value);
  if (!words.length) { const e = $('#ed-err'); e.textContent = 'Add at least one word first.'; e.hidden = false; return; }
  if (editing === 'new') {
    const l = { id: uid(), name, words };
    lists.push(l); selected.add(l.id);
  } else {
    const l = lists.find(x => x.id === editing);
    if (l) { l.name = name; l.words = words; }
  }
  saveLists(); saveSel();
  editing = null; renderSetup();
}

/* ---------- Game ---------- */

// Everything about the round being played. null when no game is running.
//   words     - the words for this round (shuffled if that setting is on)
//   i         - which word we are on
//   res       - one result per word: how many tries, and state null / 'right' / 'skip'
//   phase     - which step we are on: look, cover, write or check
//   attempt   - what the child has typed so far
//   shift     - whether the next letter will be a capital
//   timer     - the pending timeout (auto-cover, or the pause while covering)
//   needSpace - only show a space key if some word in this round has a space in it
let G = null;

// Mix up a list fairly (the Fisher-Yates shuffle)
function shuffle(a){ for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

// Show one screen (setup, game or done) and hide the others
function show(id){
  for (const s of ['setup', 'game', 'done']) $('#' + s).hidden = s !== id;
  window.scrollTo(0, 0);
}

function startGame(words){
  words = words.slice();
  if (settings.shuffle) shuffle(words);
  G = { words, i: 0, res: words.map(w => ({ word: w, tries: 0, state: null })),
        phase: 'look', attempt: '', shift: false, timer: null, needSpace: words.some(w => w.includes(' ')) };
  resetQuit();
  show('game'); goLook();
}

// The result entry for the current word
const cur = () => G.res[G.i];

// Update the left-hand panel: words left, and the row of lights
function renderRail(){
  const left = G.res.filter(r => !r.state).length;
  $('#togo').textContent = left;
  $('#togo-label').textContent = left === 1 ? 'word to go' : 'words to go';
  $('#lights').innerHTML = G.res.map((r, i) =>
    `<span class="light ${r.state === 'right' ? 'on' : r.state === 'skip' ? 'miss' : ''} ${i === G.i && !r.state ? 'current' : ''}"></span>`).join('');
  $('#wordnum').textContent = `Word ${Math.min(G.i + 1, G.words.length)} of ${G.words.length}`;
}

// Highlight the current step in the "Look, Cover, Write, Check" bar
function setSteps(p){
  const order = ['look', 'cover', 'write', 'check'], idx = order.indexOf(p);
  document.querySelectorAll('#steps .step').forEach((el, i) => {
    el.className = 'step ' + order[i] + (i === idx ? ' active' : i < idx ? ' past' : '');
  });
}

// Pick a font size so long words still fit on the card: shorter words get bigger letters.
// It is limited both in pixels and by screen width, so it works on phones too.
function wordSize(w){
  const len = Math.max(w.length, 4);
  const px = Math.max(26, Math.min(84, Math.floor(820 / len)));
  return `min(${px}px, ${(115 / len).toFixed(1)}vw)`;
}

// Step 1: LOOK. Show the word, and start the countdown if auto-cover is on.
function goLook(){
  clearTimeout(G.timer);
  G.phase = 'look'; setSteps('look'); renderRail();
  const r = cur(), w = r.word;
  $('#stage').innerHTML = `
    <div class="wordcard" id="card">
      <div class="word" style="font-size:${wordSize(w)}">${esc(w)}</div>
      <div class="flap"><span>Covered!</span></div>
      ${settings.autoCover ? `<div class="autobar" style="animation-duration:${settings.autoCover}s"></div>` : ''}
    </div>
    <p class="prompt" id="prompt">${r.tries ? 'Have another good look. Spot the tricky part.' : 'Look carefully. Say the word, then spell it out in your head.'}</p>
    <div class="actions" id="lookActions"><button class="btn blue big" data-act="cover">Cover it</button></div>`;
  if (settings.autoCover) G.timer = setTimeout(cover, settings.autoCover * 1000);
}

// Step 2: COVER. Slide the flap down over the word, then move on to writing after a short pause.
function cover(){
  if (!G || G.phase !== 'look') return;
  clearTimeout(G.timer);
  G.phase = 'cover'; setSteps('cover');
  const card = $('#card');
  card.classList.add('covered');
  const bar = card.querySelector('.autobar'); if (bar) bar.remove();
  $('#prompt').textContent = 'Now it’s hidden. Can you remember it?';
  $('#lookActions').innerHTML = '';
  G.timer = setTimeout(goWrite, 900);
}

// Step 3: WRITE. The word stays hidden; show the answer area and the keyboard.
function goWrite(){
  G.phase = 'write'; G.attempt = ''; G.shift = false; setSteps('write');
  $('#stage').innerHTML = `
    <div class="covered-mini">
      <span>Write the word from memory</span>
    </div>
    <div class="answer" id="answer"></div>
    <div class="kb" id="kb"></div>
    <div class="actions"><button class="btn green big" data-act="check" id="checkBtn" disabled>Check ✓</button></div>`;
  renderKb(); renderAnswer();
}

// Draw the on-screen keyboard. Letters show as capitals while shift is on.
function renderKb(){
  const up = G.shift;
  const key = c => `<button class="key" data-key="${c}" aria-label="${c}">${up ? c.toUpperCase() : c}</button>`;
  const rows = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm'];
  $('#kb').innerHTML = `
    <div class="kb-row">${[...rows[0]].map(key).join('')}</div>
    <div class="kb-row">${[...rows[1]].map(key).join('')}</div>
    <div class="kb-row">
      <button class="key wide shift ${up ? 'on' : ''}" data-key="shift" aria-label="Capital letter" aria-pressed="${up}">⇧</button>
      ${[...rows[2]].map(key).join('')}
      <button class="key wide" data-key="back" aria-label="Delete">⌫</button>
    </div>
    <div class="kb-row">
      <button class="key sym" data-key="'" aria-label="apostrophe">'</button>
      <button class="key sym" data-key="-" aria-label="hyphen">-</button>
      ${G.needSpace ? '<button class="key space" data-key=" ">space</button>' : ''}
    </div>`;
}

// Show what has been typed so far, either as letter boxes or as plain text with a blinking cursor
function renderAnswer(){
  const a = G.attempt, w = cur().word, el = $('#answer');
  if (settings.showLength) {
    let h = '';
    const n = Math.max(w.length, a.length + (a.length >= w.length ? 0 : 0));
    for (let i = 0; i < n; i++) {
      const ch = a[i];
      const cls = ['box'];
      if (i === a.length) cls.push('next');
      if (w[i] === ' ' && ch === undefined) cls.push('gap');
      if (i >= w.length) cls.push('extra');
      h += `<span class="${cls.join(' ')}">${ch === undefined ? '' : ch === ' ' ? '&nbsp;' : esc(ch)}</span>`;
    }
    el.innerHTML = `<div class="boxes">${h}</div>`;
  } else {
    el.innerHTML = a
      ? `<div class="typed">${esc(a).replace(/ /g, '&nbsp;')}<span class="caret"></span></div>`
      : `<div class="typed"><span class="caret"></span> <span class="placeholder">Tap the letters below</span></div>`;
  }
  $('#checkBtn').disabled = !a.trim();
}

// Add one character to the answer. There is a length limit so the answer cannot run off forever,
// and no double spaces or leading spaces.
function typeChar(c){
  if (!G || G.phase !== 'write') return;
  if (G.attempt.length >= cur().word.length + 8) return;
  if (c === ' ' && (!G.attempt || G.attempt.endsWith(' '))) return;
  G.attempt += c;
  renderAnswer();
}

// Handle a tap on the on-screen keyboard.
// Shift works like on a phone: it applies to the next letter only, then switches off.
function press(k){
  if (!G || G.phase !== 'write') return;
  if (k === 'shift') { G.shift = !G.shift; renderKb(); return; }
  if (k === 'back') { G.attempt = G.attempt.slice(0, -1); renderAnswer(); return; }
  let c = k;
  if (G.shift && /[a-z]/.test(c)) { c = c.toUpperCase(); G.shift = false; renderKb(); }
  typeChar(c);
}

// Work out which letters the child got right, even if they missed or added a letter.
// Comparing position by position would mark everything after a missing letter as wrong
// ("rian" vs "rain" would look mostly wrong), so instead we find the longest run of letters
// the two have in common, in order (the "longest common subsequence").
// Returns two lists of true/false: which typed letters matched, and which letters of the real word were matched.
function lcsMarks(a, b, eq){
  const n = a.length, m = b.length;
  const d = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--)
    d[i][j] = eq(a[i], b[j]) ? d[i + 1][j + 1] + 1 : Math.max(d[i + 1][j], d[i][j + 1]);
  const ma = new Array(n).fill(false), mb = new Array(m).fill(false);
  let i = 0, j = 0;
  while (i < n && j < m) {
    if (eq(a[i], b[j])) { ma[i] = mb[j] = true; i++; j++; }
    else if (d[i + 1][j] >= d[i][j + 1]) i++; else j++;
  }
  return [ma, mb];
}

// Step 4: CHECK. Compare the answer with the word.
// Capitals only count if the word itself has a capital (so "Monday" needs a capital M,
// but "rain" can be typed as "RAIN").
function check(){
  if (!G || G.phase !== 'write' || !G.attempt.trim()) return;
  G.phase = 'check'; setSteps('check');
  const r = cur(), w = r.word;
  const a = G.attempt.trim().replace(/\s+/g, ' ');
  r.tries++;
  const caseSensitive = /[A-Z]/.test(w);
  const eq = (x, y) => caseSensitive ? x === y : x.toLowerCase() === y.toLowerCase();
  const right = a.length === w.length && [...a].every((ch, i) => eq(ch, w[i]));

  if (right) {
    // Spelled right: the light turns on, a bit of praise, and confetti
    r.state = 'right'; renderRail();
    const last = G.res.every(x => x.state);
    $('#stage').innerHTML = `
      <div class="wordcard good"><div class="word ok" style="font-size:${wordSize(w)}">${esc(w)}</div></div>
      <p class="verdict good">${PRAISE[Math.floor(Math.random() * PRAISE.length)]}</p>
      <div class="actions"><button class="btn primary big" data-act="next">${last ? 'Finish ★' : 'Next word →'}</button></div>`;
    confetti($('#stage'));
  } else {
    // Not quite: show their attempt above the real word, marking what went wrong.
    // Nothing is recorded as a fail here. They can look again as many times as they like.
    const [ma, mb] = lcsMarks([...a], [...w], eq);
    const mine = [...a].map((ch, i) => `<span class="l ${ma[i] ? 'ok' : 'bad'}">${ch === ' ' ? '&nbsp;' : esc(ch)}</span>`).join('');
    const target = [...w].map((ch, i) => `<span class="l ${mb[i] ? '' : 'watch'}">${ch === ' ' ? '&nbsp;' : esc(ch)}</span>`).join('');
    const anyWatch = mb.some(x => !x);
    $('#stage').innerHTML = `
      <p class="verdict bad">Nearly! Let’s compare.</p>
      <div class="cmp">
        <span class="lab">You<br>wrote</span><span class="w">${mine}</span>
        <span class="lab">The word<br>is</span><span class="w">${target}</span>
        <p class="cmp-note">${anyWatch ? 'The <mark>highlighted</mark> letters are the ones to watch.' : 'Look for the extra or mixed-up letters in red.'}</p>
      </div>
      <div class="actions">
        <button class="btn primary big" data-act="again">Look again</button>
        <button class="btn" data-act="skip">Move on</button>
      </div>`;
  }
}

// Move to the next word that has not been finished yet, or end the round if they are all done
function nextWord(){
  if (G.res.every(x => x.state)) return finish();
  let i = G.i;
  do { i = (i + 1) % G.res.length; } while (G.res[i].state);
  G.i = i;
  goLook();
}

// The end screen. A word counts as "tricky" if it took more than one try or was skipped,
// and those can be practised again on their own.
function finish(){
  clearTimeout(G.timer);
  const total = G.res.length;
  const first = G.res.filter(r => r.state === 'right' && r.tries === 1).length;
  const tricky = G.res.filter(r => r.tries > 1 || r.state === 'skip').map(r => r.word);
  G.lastTricky = tricky; G.lastAll = G.words.slice();
  show('done');
  $('#done-inner').innerHTML = `
    ${STAR}
    <h2 class="done-title">${first === total ? 'Perfect! Every word right first time!' : 'All done. Well played!'}</h2>
    <p class="done-stat"><b>${first}</b> of <b>${total}</b> right first time</p>
    ${tricky.length ? `<h3>Words to practise</h3><div class="chips center">${tricky.map(x => `<span class="chip">${esc(x)}</span>`).join('')}</div>` : ''}
    <div class="actions" style="margin-top:26px">
      ${tricky.length ? '<button class="btn primary big" data-act="practise">Practise these again</button>' : ''}
      <button class="btn ${tricky.length ? '' : 'primary big'}" data-act="replay">Play all the words again</button>
      <button class="btn ghost" data-act="home">Back to my lists</button>
    </div>`;
  if (first === total) confetti($('#done-inner'));
}

// Throw some confetti pieces out from the middle in random directions.
// Skipped for anyone who has "reduce motion" turned on.
function confetti(host){
  try { if (matchMedia('(prefers-reduced-motion: reduce)').matches) return; } catch(e){}
  const cols = ['#FFC531', '#E8573F', '#3D6FD6', '#2A9D68', '#7B57C8'];
  for (let i = 0; i < 30; i++) {
    const s = document.createElement('span');
    s.className = 'confetti';
    const ang = Math.random() * Math.PI * 2, dist = 110 + Math.random() * 170;
    s.style.setProperty('--x', (Math.cos(ang) * dist).toFixed(0) + 'px');
    s.style.setProperty('--y', (Math.sin(ang) * dist - 40).toFixed(0) + 'px');
    s.style.setProperty('--r', (Math.random() * 720 - 360).toFixed(0) + 'deg');
    s.style.background = cols[i % cols.length];
    host.appendChild(s);
    setTimeout(() => s.remove(), 1200);
  }
}

// The Stop button needs two taps (so a stray tap does not end the game).
// If the second tap does not come within 3 seconds, it resets.
let quitTimer = null;
function resetQuit(){ clearTimeout(quitTimer); const b = $('#quitBtn'); b.textContent = '← Stop'; b.dataset.armed = ''; }
// Leave the game and go back to the lists
function goHome(){ if (G) clearTimeout(G.timer); G = null; show('setup'); renderSetup(); }

/* ---------- Taps, clicks and key presses ---------- */

// Rather than attaching a handler to every button, there is one handler for the whole page.
// Buttons say what they do with data-act="..." (or data-key="..." for keyboard keys).
// Keep on-screen keys from taking focus (so Enter on a real keyboard still means "Check")
document.addEventListener('mousedown', e => { if (e.target.closest('.key')) e.preventDefault(); });

document.addEventListener('click', e => {
  const k = e.target.closest('[data-key]');
  if (k) { press(k.dataset.key); return; }
  const b = e.target.closest('[data-act]');
  if (!b || b.disabled) return;
  const id = b.dataset.id;
  switch (b.dataset.act) {
    case 'toggle':
      selected.has(id) ? selected.delete(id) : selected.add(id);
      saveSel(); renderLists(); if (!editing) renderChosen();
      break;
    case 'edit': editing = id; renderSetup(); break;
    case 'new': editing = 'new'; renderSetup(); break;
    case 'cancel': editing = null; renderSetup(); break;
    case 'save': saveEditor(); break;
    case 'delete':
      if (!confirmDelete) { confirmDelete = true; b.textContent = 'Tap again to delete'; return; }
      lists = lists.filter(l => l.id !== editing); selected.delete(editing);
      saveLists(); saveSel(); editing = null; renderSetup();
      break;
    case 'set': settings[b.dataset.k] = !settings[b.dataset.k]; saveSettings(); renderChosen(); break;
    case 'cycle': {
      const opts = [0, 3, 5, 10];
      settings.autoCover = opts[(opts.indexOf(settings.autoCover) + 1) % opts.length];
      saveSettings(); renderChosen(); break;
    }
    case 'go': { const w = chosenWords(); if (w.length) startGame(w); break; }
    case 'cover': cover(); break;
    case 'check': check(); break;
    case 'next': nextWord(); break;
    case 'again': goLook(); break;
    case 'skip': cur().state = 'skip'; nextWord(); break;
    case 'quit':
      if (!b.dataset.armed) {
        b.dataset.armed = '1'; b.textContent = 'Tap again to stop';
        quitTimer = setTimeout(resetQuit, 3000);
        return;
      }
      resetQuit(); goHome();
      break;
    case 'practise': startGame(G.lastTricky); break;
    case 'replay': startGame(G.lastAll); break;
    case 'home': goHome(); break;
  }
});

// A real keyboard works too (useful on a laptop).
// While writing, letters type, Backspace deletes and Enter checks.
// At other steps, Enter or Space presses the main button (Cover it / Next word).
document.addEventListener('keydown', e => {
  if (!G || $('#game').hidden) return;
  if (e.target.matches && e.target.matches('input, textarea')) return;
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  if (G.phase === 'write') {
    if (e.key === 'Backspace') { e.preventDefault(); press('back'); }
    else if (e.key === 'Enter') { e.preventDefault(); check(); }
    else if (e.key.length === 1 && /[A-Za-z'\- ]/.test(e.key)) {
      e.preventDefault();
      if (e.key === ' ' && !G.needSpace) return;
      typeChar(e.key);
    }
    return;
  }
  if (e.target.closest && e.target.closest('button')) return; // let the focused button handle it
  if (e.key === 'Enter' || e.key === ' ') {
    if (G.phase === 'look') { e.preventDefault(); cover(); }
    else if (G.phase === 'check') { e.preventDefault(); const btn = document.querySelector('#stage .actions .btn'); if (btn) btn.click(); }
  }
});

// Draw the setup screen when the page first opens
renderSetup();
})();
