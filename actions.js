"use strict";
/* ---------- navigation (Android back aware) ---------- */
function pushPage(p){ ui.cd = null; ui.stack.push(p); history.pushState({tt:1}, ""); render(); scrollTo(0, 0); }
function openSheet(s){ ui.cd = null; if (!ui.sheet) history.pushState({tt:1}, ""); ui.sheet = s; renderSheet(); }
function goBack(){ history.back(); }
function backThen(fn){ ui.afterPop = fn; history.back(); }
const closeSheetThen = backThen;
function goTab(t){
  if (t === ui.tab){ scrollTo({top:0, behavior:"smooth"}); return; }
  if (t !== "home" && !ui.tabPushed){ history.pushState({tt:1}, ""); ui.tabPushed = true; }
  else if (t === "home" && ui.tabPushed){ ui.tabPushed = false; ui.skipPop = true; history.back(); }
  ui.tab = t; ui.cd = null; render(); scrollTo(0, 0);
}
addEventListener("popstate", () => {
  if (ui.skipPop){ ui.skipPop = false; return; }
  if (ui.sheet){ ui.sheet = null; renderSheet(); if (ui.needRender){ ui.needRender = false; render(); } }
  else if (ui.stack.length){ let n = 1 + (ui.popN || 0); ui.popN = 0; while (n-- && ui.stack.length) ui.stack.pop(); ui.cd = null; render(); }
  else if (ui.tabPushed){ ui.tabPushed = false; ui.tab = "home"; render(); scrollTo(0, 0); }
  if (ui.afterPop){ const f = ui.afterPop; ui.afterPop = null; f(); }
  else if (!ui.sheet && !ui.stack.length && ui.tab === "home" && ui.tabPushed){ ui.tabPushed = false; ui.skipPop = true; history.back(); }
});
const curPage = () => ui.stack[ui.stack.length - 1];

/* ---------- toast ---------- */
let toastT = 0, toastFn = null;
function toast(html, undo){
  const t = $("#toast"); toastFn = undo || null;
  t.innerHTML = `<span>${html}</span>${undo ? '<button data-a="undo">Undo</button>' : ""}`;
  t.classList.add("on"); clearTimeout(toastT); toastT = setTimeout(() => { t.classList.remove("on"); toastFn = null; }, undo ? 5000 : 2800);
}

/* ---------- wake lock + clock + rest timer ---------- */
let wl = null;
async function wake(){
  try {
    if (S.act && S.set.awake && document.visibilityState === "visible" && "wakeLock" in navigator){ if (!wl){ wl = await navigator.wakeLock.request("screen"); wl.addEventListener("release", () => { wl = null; }); } }
    else if (wl){ await wl.release(); wl = null; }
  } catch (e) { wl = null; }
}
document.addEventListener("visibilitychange", wake);
function tickClock(){
  if (S.act){ const s = clockStr(Date.now() - S.act.st); $$("[data-clock]").forEach(el => { if (el.textContent !== s) el.textContent = s; }); }
  let p = $("#restp");
  if (S.act && S.act.restEnd){
    const left = S.act.restEnd - Date.now();
    if (left <= 0){ S.act.restEnd = null; save(); if (p) p.remove(); vib([200, 100, 200]); toast("Rest over"); return; }
    if (!p){ p = document.createElement("div"); p.id = "restp"; p.className = "restp"; document.body.appendChild(p); }
    p.innerHTML = `<span class="act">Rest</span><span class="d num" style="font-size:22px">${clockStr(left + 999)}</span><button class="chip s" data-a="restadd">+15s</button><button class="chip s" data-a="restskip">Skip</button>`;
  } else if (p) p.remove();
}

/* ---------- workout logic ---------- */
function startWorkout(day){
  const a = {id:uid(), day:day ? day.id : null, n:day ? day.n : "Workout", st:Date.now(), ex:[]};
  if (day) a.ex = day.items.filter(it => X(it.e)).map(it => ({e:it.e, g:it.g || null, sets:rowsFor(it.e)}));
  S.act = a; ui.wOpen = 0; save(true); wake(); vib(20);
  ui.tab = "home"; goTab("work");
  if (!day) openSheet({k:"picker", mode:"act", sel:[], q:""});
}
function valid(e, s){
  if (e.mode === "wr") return s.w != null && s.r > 0;
  if (e.mode === "r") return s.r > 0;
  if (e.mode === "wbw" || e.mode === "ast"){ if (s.w == null) s.w = 0; return s.r > 0; }
  if (e.mode === "td") return (s.t > 0) || (s.d > 0);
  return true;
}
function finishWorkout(upd){
  const a = S.act;
  const ex = a.ex.map(r => {
    const e = X(r.e), done = r.sets.filter(s => s.done); if (!done.length || !e) return null;
    const work = r.sets.filter(s => !s.wu);
    return {e:r.e, n:e.n, g:r.g || null, sets:done.map(s => { const o = {}; for (const k of ["w","r","t","d","rpe"]) if (s[k] != null) o[k] = s[k]; if (s.wu) o.wu = 1; if (s.pr) o.pr = s.pr; return o; })};
  }).filter(Boolean);
  if (upd && a.day){ const d = S.days.find(x => x.id === a.day); if (d) d.items = a.ex.filter(r => X(r.e)).map(r => ({e:r.e, g:r.g || null})); }
  S.act = null; wake();
  if (!ex.length){ save(true); return null; }
  const ses = {id:a.id, day:a.day, n:a.n, st:a.st, dur:Date.now() - a.st, ex};
  S.ses.unshift(ses); S.ses.sort((x, y) => y.st - x.st); save(true);
  return ses.id;
}
function nextOpen(i, j){
  const a = S.act, r = a.ex[i];
  if (r.g){ const mem = a.ex.map((x, k) => x.g === r.g ? k : -1).filter(k => k >= 0); const pos = mem.indexOf(i);
    for (let n = 1; n <= mem.length; n++){ const k = mem[(pos + n) % mem.length]; if (a.ex[k].sets.some(s => !s.done)) return k; } }
  if (r.sets.every(s => s.done)){ for (let k = i + 1; k < a.ex.length; k++) if (a.ex[k].sets.some(s => !s.done)) return k; for (let k = 0; k < i; k++) if (a.ex[k].sets.some(s => !s.done)) return k; return -1; }
  return i;
}
function scrollToEx(k){ requestAnimationFrame(() => { const el = $("#ex" + k); if (el){ const y = el.getBoundingClientRect().top + scrollY - 12; if (Math.abs(y - scrollY) > 60) scrollTo({top:y, behavior:"smooth"}); } }); }

/* ---------- backup ---------- */
function downloadBackup(){
  const d = new Date(), p = n => String(n).padStart(2, "0");
  S.lb = Date.now(); save(true);
  const blob = new Blob([JSON.stringify({app:"taketren", v:2, at:Date.now(), data:S, photos:PH})], {type:"application/json"});
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `take-tren-backup-${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}.json`;
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  toast("Backup saved to your Downloads"); render();
}
async function restoreBackup(txt){
  let d; try { d = JSON.parse(txt); } catch (e) { d = null; }
  if (!d || d.app !== "taketren" || !d.data || d.data.v !== 2){ toast("That file isn't a Take Tren backup"); return; }
  S = Object.assign(clone(DEF), d.data, {set:Object.assign({}, DEF.set, d.data.set || {}), lb:Date.now()});
  await phClear(); for (const k in (d.photos || {})) await phSet(k, d.photos[k]);
  save(true); ui.stack = []; ui.sheet = null; renderSheet(); ui.tab = "home"; render(); toast("Backup restored");
}
$("#fileBackup").addEventListener("change", e => { const f = e.target.files[0]; e.target.value = ""; if (f) f.text().then(restoreBackup); });
let photoTarget = null;
$("#filePhoto").addEventListener("change", e => {
  const f = e.target.files[0]; e.target.value = ""; if (!f) return;
  shrinkImage(f, u => { if (!u) { toast("Couldn't read that image"); return; } if (photoTarget === "draft"){ const p = curPage(); if (p && p.d){ p.d.photo = u; render(); } } else if (photoTarget){ phSet(photoTarget, u).then(render); } });
});

/* ---------- share summary as image ---------- */
async function shareSummary(sid){
  const x = S.ses.find(y => y.id === sid); if (!x) return;
  try { await document.fonts.ready; } catch (e) {}
  const c = document.createElement("canvas"); c.width = 1080; c.height = 1350; const g = c.getContext("2d");
  g.fillStyle = "#000"; g.fillRect(0, 0, 1080, 1350);
  const img = new Image(); img.src = "icons/icon-192.png"; await new Promise(r => { img.onload = r; img.onerror = r; });
  try { g.drawImage(img, 80, 80, 110, 110); } catch (e) {}
  g.fillStyle = "#a78bfa"; g.font = "800 56px 'Barlow Condensed'"; g.fillText("TAKE TREN", 215, 155);
  g.fillStyle = "#f4f4f5"; g.font = "800 150px 'Barlow Condensed'"; g.fillText(x.n.slice(0, 18), 80, 360);
  g.fillStyle = "#a1a1aa"; g.font = "500 40px Inter"; g.fillText(dstr(x.st), 84, 430);
  const v = volOf(x), stats = [["Time", Math.max(1, Math.round(x.dur / 6e4)) + " min"], ["Volume", v ? Math.round(toU(v)).toLocaleString() + " " + S.u : "–"], ["Working sets", String(setsOf(x))], ["Exercises", String(x.ex.length)]];
  stats.forEach((s, i) => { const cx = 80 + (i % 2) * 470, cy = 500 + Math.floor(i / 2) * 230; g.fillStyle = "#121214"; roundRect(g, cx, cy, 450, 200, 36); g.fill(); g.fillStyle = "#a1a1aa"; g.font = "500 34px Inter"; g.fillText(s[0], cx + 36, cy + 66); g.fillStyle = "#f4f4f5"; g.font = "800 84px 'Barlow Condensed'"; g.fillText(s[1], cx + 36, cy + 160); });
  const prs = x.ex.flatMap(r => r.sets.filter(y => y.pr).map(y => [exName(r.e, r.n), y.pr]));
  let y = 1010;
  if (prs.length){ g.fillStyle = "#f2c14e"; g.font = "800 56px 'Barlow Condensed'"; g.fillText(prs.length + " new record" + (prs.length === 1 ? "" : "s"), 80, y); y += 66; g.font = "500 36px Inter"; for (const p of prs.slice(0, 4)){ g.fillStyle = "#e4e4e7"; g.fillText((p[0] + ": " + p[1]).slice(0, 52), 80, y); y += 52; } }
  const blob = await new Promise(r => c.toBlob(r, "image/png")), file = new File([blob], "take-tren-workout.png", {type:"image/png"});
  try { if (navigator.canShare && navigator.canShare({files:[file]})){ await navigator.share({files:[file], title:"Take Tren workout"}); return; } } catch (e) { if (e && e.name === "AbortError") return; }
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "take-tren-workout.png"; document.body.appendChild(a); a.click(); a.remove(); toast("Image saved to your Downloads");
}
function roundRect(g, x, y, w, h, r){ g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }

/* ---------- actions ---------- */
const A = {};
const twoTap = (key, fn) => { if (ui.cd === key){ ui.cd = null; fn(); } else { ui.cd = key; ui.sheet ? renderSheet() : render(); } };
A.tab = el => goTab(el.dataset.v);
A.page = el => pushPage({p:el.dataset.v});
A.back = () => goBack();
A.closesheet = () => goBack();
A.undo = () => { if (toastFn){ const f = toastFn; toastFn = null; $("#toast").classList.remove("on"); f(); } };
A.later = () => { S.lz = Date.now(); save(); render(); };
A.backup = () => downloadBackup();
A.restore = () => $("#fileBackup").click();
/* days */
A.newday = () => pushPage({p:"day", id:null, d:{n:"", items:[]}, bar:1});
A.dayedit = el => { const d = S.days.find(x => x.id === el.dataset.v); if (d) pushPage({p:"day", id:d.id, d:clone(d), bar:1}); };
A.daymenu = el => openSheet({k:"daymenu", id:el.dataset.v});
A.dayup = el => { const i = S.days.findIndex(x => x.id === el.dataset.v); if (i > 0){ const [d] = S.days.splice(i, 1); S.days.splice(i - 1, 0, d); save(); } render(); };
A.startday = el => {
  const d = S.days.find(x => x.id === el.dataset.v); if (!d) return;
  if (S.act){ openSheet({k:"confirm", title:"A workout is already running", body:`Finish or discard ${esc(S.act.n)} before starting ${esc(d.n)}.`, btns:[{a:"tab", v:"work", l:"Go to current workout"}, {a:"closesheet", l:"Cancel", g:1}]}); return; }
  if (!d.items.length){ toast("Add exercises to this day first"); pushPage({p:"day", id:d.id, d:clone(d), bar:1}); return; }
  startWorkout(d);
};
A.startempty = () => startWorkout(null);
A.ditem = el => openSheet({k:"ditem", i:+el.dataset.i});
A.daddex = () => openSheet({k:"picker", mode:"day", sel:[], q:""});
A.dlink = el => { const d = curPage().d, i = +el.dataset.i, g = d.items[i].g || d.items[i + 1].g || uid(); d.items[i].g = g; d.items[i + 1].g = g; render(); };
A.dunlink = el => { const d = curPage().d, i = +el.dataset.i, g = d.items[i].g; d.items[i].g = null; const rest = d.items.filter(x => x.g === g); if (rest.length < 2) rest.forEach(x => x.g = null); render(); };
A.dremove = el => { const d = curPage().d, i = +el.dataset.i, [it] = d.items.splice(i, 1); const rest = d.items.filter(x => it.g && x.g === it.g); if (rest.length < 2) rest.forEach(x => x.g = null); render(); };
A.dreplace = el => openSheet({k:"picker", mode:"dayrep", i:+el.dataset.i, single:1, sel:[], q:""});
A.dsave = () => {
  const p = curPage(), d = p.d; d.n = d.n.trim();
  if (!d.n){ toast("Give the day a name"); const f = $('[data-f="n"]'); if (f) f.focus(); return; }
  if (p.id){ const i = S.days.findIndex(x => x.id === p.id); if (i >= 0) S.days[i] = d; } else { d.id = uid(); S.days.push(d); }
  save(true); toast(p.id ? "Day saved" : "Day created"); goBack();
};
A.ddel = () => twoTap("ddel", () => { const p = curPage(); S.days = S.days.filter(x => x.id !== p.id); save(true); toast("Day deleted"); goBack(); });
/* workout */
A.wopen = el => { const i = +el.dataset.i; ui.wOpen = ui.wOpen === i ? -1 : i; render(); if (ui.wOpen === i) scrollToEx(i); };
A.exmenu = el => openSheet({k:"exmenu", i:+el.dataset.i});
A.addex = () => openSheet({k:"picker", mode:"act", sel:[], q:""});
A.wu = el => { const s = S.act.ex[+el.dataset.i].sets[+el.dataset.j]; if (s.wu){ delete s.wu; if (s.done){ const pr = prFor(S.act.ex[+el.dataset.i].e, s); if (pr) s.pr = pr; } } else { s.wu = 1; delete s.pr; } vib(10); save(); render(); };
A.tick = el => {
  const i = +el.dataset.i, j = +el.dataset.j, r = S.act.ex[i], s = r.sets[j], e = X(r.e);
  if (!e) return;
  if (s.done){ delete s.done; delete s.pr; vib(10); save(); render(); return; }
  if (!valid(e, s)){ toast("Fill in the numbers first"); const f = [...document.querySelectorAll(`.cell[data-i="${i}"][data-j="${j}"]`)].find(x => !x.value) || document.querySelector(`.cell[data-i="${i}"][data-j="${j}"]`); if (f) f.focus(); return; }
  s.done = 1; const pr = prFor(r.e, s); if (pr) s.pr = pr;
  vib(pr ? [30, 50, 120] : 25);
  if (S.set.rest) S.act.restEnd = Date.now() + S.set.restSec * 1000;
  const k = nextOpen(i, j); if (k !== i){ ui.wOpen = k; }
  save(); render(); tickClock();
  if (k !== i && k >= 0) scrollToEx(k);
  if (pr) toast(`<span class="gold">${I.trophy({s:18})}</span> New record! ${esc(pr)}`);
};
A.addset = el => { const r = S.act.ex[+el.dataset.i], l = r.sets[r.sets.length - 1] || {}; const n = {}; for (const k of ["w","r","t","d"]) if (l[k] != null) n[k] = l[k]; r.sets.push(n); save(); render(); };
A.restskip = () => { if (S.act){ S.act.restEnd = null; save(); tickClock(); } };
A.restadd = () => { if (S.act && S.act.restEnd){ S.act.restEnd += 15000; save(); tickClock(); } };
A.finish = () => openSheet({k:"finish", upd:false});
A.finupd = () => { ui.sheet.upd = !ui.sheet.upd; renderSheet(); };
A.finyes = () => {
  const sid = finishWorkout(ui.sheet.upd); $("#restp") && $("#restp").remove();
  ui.tab = "home"; ui.wOpen = 0; render(); scrollTo(0, 0);
  if (sid){ ui.sheet = {k:"summary", sid}; renderSheet(); vib([20, 40, 20]); } else goBack();
};
A.discard = () => twoTap("discard", () => { S.act = null; save(true); wake(); $("#restp") && $("#restp").remove(); closeSheetThen(() => { ui.tab = "home"; render(); scrollTo(0, 0); }); });
A.wreplace = el => openSheet({k:"picker", mode:"actrep", i:+el.dataset.i, single:1, sel:[], q:""});
A.wmove = el => { const a = S.act, i = +el.dataset.i, k = i + (+el.dataset.v); const [r] = a.ex.splice(i, 1); a.ex.splice(k, 0, r); ui.wOpen = k; save(); ui.needRender = true; goBack(); };
A.wlink = el => { const a = S.act, i = +el.dataset.i, g = a.ex[i].g || a.ex[i + 1].g || uid(); a.ex[i].g = g; a.ex[i + 1].g = g; save(); ui.needRender = true; goBack(); };
A.wunlink = el => { const a = S.act, i = +el.dataset.i, g = a.ex[i].g; a.ex[i].g = null; const rest = a.ex.filter(x => x.g === g); if (rest.length < 2) rest.forEach(x => x.g = null); save(); ui.needRender = true; goBack(); };
A.wremove = el => { const a = S.act, i = +el.dataset.i, [r] = a.ex.splice(i, 1); const rest = a.ex.filter(x => r.g && x.g === r.g); if (rest.length < 2) rest.forEach(x => x.g = null); if (ui.wOpen >= a.ex.length) ui.wOpen = a.ex.length - 1; save(); ui.needRender = true; goBack(); toast("Exercise removed", () => { a.ex.splice(i, 0, r); save(); render(); }); };
/* picker */
A.pk = el => { const s = ui.sheet, id = el.dataset.v; if (s.single) s.sel = [id]; else { const k = s.sel.indexOf(id); k < 0 ? s.sel.push(id) : s.sel.splice(k, 1); } const keep = $("#plist").scrollTop; renderSheet(); $("#plist").scrollTop = keep; };
A.pnew = () => { const s = ui.sheet; closeSheetThen(() => pushPage({p:"exedit", id:null, d:newExDraft(), ret:s, bar:1})); };
A.pdone = () => {
  const s = ui.sheet; if (!s.sel.length) return;
  if (s.mode === "act"){ const a = S.act; if (!a) return; const start = a.ex.length; for (const id of s.sel) a.ex.push({e:id, g:null, sets:rowsFor(id)}); ui.wOpen = start; save(); closeSheetThen(() => { render(); scrollToEx(start); }); }
  else if (s.mode === "actrep"){ const r = S.act.ex[s.i]; r.e = s.sel[0]; r.sets = rowsFor(s.sel[0]); ui.wOpen = s.i; save(); closeSheetThen(render); }
  else if (s.mode === "day"){ const d = curPage().d; for (const id of s.sel) d.items.push({e:id, g:null}); closeSheetThen(render); }
  else if (s.mode === "dayrep"){ curPage().d.items[s.i].e = s.sel[0]; closeSheetThen(render); }
};
/* exercises */
function newExDraft(){ return {n:"", mode:"wr", eq:"barbell", m:"chest", m2:[], step:2.5, note:""}; }
A.newex = () => pushPage({p:"exedit", id:null, d:newExDraft(), bar:1});
A.exedit = el => { const e = X(el.dataset.v); if (e) pushPage({p:"exedit", id:e.id, touched:1, d:{n:e.n, mode:e.mode, eq:e.eq, m:e.m, m2:(e.m2 || []).slice(), step:e.step || 2.5, note:e.note || ""}, bar:1}); };
A.exdetail = el => pushPage({p:"exdetail", id:el.dataset.v});
A.emode = el => { curPage().d.mode = el.dataset.v; render(); };
A.eeq = el => { const d = curPage().d; d.eq = el.dataset.v; render(); };
A.em = el => { curPage().touched = 1; curPage().auto = 0; const d = curPage().d; d.m = el.dataset.v; d.m2 = d.m2.filter(x => x !== d.m); render(); };
A.em2 = el => { curPage().touched = 1; curPage().auto = 0; const d = curPage().d, v = el.dataset.v, k = d.m2.indexOf(v); k < 0 ? d.m2.push(v) : d.m2.splice(k, 1); render(); };
A.photo = el => { photoTarget = el.dataset.v; $("#filePhoto").click(); };
A.exsave = () => {
  const p = curPage(), d = p.d, n = d.n.trim();
  if (!n){ toast("Give the exercise a name"); const f = $('[data-f="n"]'); if (f) f.focus(); return; }
  let id = p.id;
  if (id){ const e = X(id); Object.assign(e, {n, mode:d.mode, eq:d.eq, m:d.m, m2:d.m2, step:d.step, note:d.note.trim()}); }
  else { id = uid(); S.ex.push({id, n, mode:d.mode, eq:d.eq, m:d.m, m2:d.m2, step:d.step, note:d.note.trim()}); }
  if (d.photo !== undefined) phSet(id, d.photo);
  save(true); toast(p.id ? "Exercise saved" : "Exercise created");
  if (p.ret){ const s = p.ret; if (s.single) s.sel = [id]; else s.sel.push(id); s.q = ""; backThen(() => openSheet(s)); } else goBack();
};
A.exdel = () => twoTap("exdel", () => {
  const p = curPage(), id = p.id; S.ex = S.ex.filter(e => e.id !== id);
  for (const d of S.days) d.items = d.items.filter(it => it.e !== id);
  phSet(id, null); save(true); toast("Exercise deleted");
  const prev = ui.stack[ui.stack.length - 2];
  if (prev && prev.p === "exdetail" && prev.id === id){ ui.popN = 1; history.go(-2); } else goBack();
});
/* progress */
A.prog = el => { ui.prog = el.dataset.v; ui.cd = null; if (ui.tab !== "prog") goTab("prog"); else { render(); } };
A.coll = el => { ui[el.dataset.v] = !ui[el.dataset.v]; render(); };
A.range = el => { ui.range = el.dataset.v; render(); };
A.calm = el => { const n = new Date(), c = ui.calM ? new Date(ui.calM) : new Date(n.getFullYear(), n.getMonth(), 1); ui.calM = +new Date(c.getFullYear(), c.getMonth() + (+el.dataset.v), 1); ui.calSel = null; render(); };
A.calday = el => { const v = +el.dataset.v; ui.calSel = ui.calSel === v ? null : v; render(); };
A.hx = el => { ui.hx = ui.hx === el.dataset.v ? null : el.dataset.v; ui.cd = null; render(); };
A.delses = el => twoTap(el.dataset.v, () => { S.ses = S.ses.filter(s => s.id !== el.dataset.v); ui.hx = null; save(true); render(); toast("Workout deleted"); });
A.bwstep = el => { const i = $("#bwi"), st = S.u === "kg" ? .1 : .2; i.value = nfmt(Math.round(((parseNum(i.value) || 0) + (+el.dataset.v) * st) * 10) / 10); };
A.bwlog = () => { const v = parseNum($("#bwi").value); if (!(v > 0)){ toast("Enter your weight"); return; } const t = dayStart(Date.now()); S.bw = S.bw.filter(x => dayStart(x.d) !== t); S.bw.push({d:Date.now(), w:fromU(v)}); save(true); vib(15); toast("Logged " + nfmt(v) + " " + S.u); render(); };
A.bwdel = el => { const d = +el.dataset.v, old = S.bw.find(x => x.d === d); S.bw = S.bw.filter(x => x.d !== d); save(); render(); toast("Entry deleted", () => { S.bw.push(old); save(); render(); }); };
/* settings */
A.tog = el => { const k = el.dataset.v; S.set[k] = !S.set[k]; save(); if (k === "awake") wake(); if (k === "rest" && !S.set.rest && S.act){ S.act.restEnd = null; tickClock(); } render(); };
A.unit = el => { S.u = el.dataset.v; save(); render(); };
A.rest = el => { S.set.restSec = clamp(S.set.restSec + (+el.dataset.v), 15, 600); save(); render(); };
A.defsets = el => { S.set.defSets = clamp(S.set.defSets + (+el.dataset.v), 1, 10); save(); render(); };
A.erase = () => twoTap("erase", async () => { localStorage.removeItem(KEY); await phClear(); location.replace(location.pathname); });
A.share = el => shareSummary(el.dataset.v);
const STAY = new Set(["pk","pdone","pnew","finupd","discard","closesheet","share","finyes","undo","restskip","restadd","wmove","wlink","wunlink","wremove","dayup"]);

/* ---------- events ---------- */
let suppressClick = false;
document.addEventListener("click", ev => {
  if (suppressClick){ suppressClick = false; ev.preventDefault(); ev.stopPropagation(); return; }
  if (ev.target.id === "sheet"){ goBack(); return; }
  const el = ev.target.closest("[data-a]"); if (!el) return;
  const name = el.dataset.a, f = A[name]; if (!f) return;
  if (ui.sheet && el.closest("#sheet") && !STAY.has(name)){
    const snap = {dataset:Object.assign({}, el.dataset)};
    if (name === "dayup"){ f(snap, ev); return; }
    closeSheetThen(() => f(snap, ev)); return;
  }
  f(el, ev);
});
document.addEventListener("input", ev => {
  const t = ev.target;
  if (t.classList.contains("cell") && t.dataset.k && S.act && ui.tab === "work" && !ui.stack.length){
    const s = S.act.ex[+t.dataset.i].sets[+t.dataset.j], k = t.dataset.k, v = parseNum(t.value);
    s[k] = v == null ? null : (k === "w" ? fromU(v) : v);
    if (s.done && (k === "w" || k === "r")){ const pr = prFor(S.act.ex[+t.dataset.i].e, s); if (pr) s.pr = pr; else delete s.pr; }
    save(); return;
  }
  if (t.dataset.f){ const p = curPage(); if (!p || !p.d) return; p.d[t.dataset.f] = t.value;
    if (p.p === "exedit" && t.dataset.f === "n" && !p.touched){ const g = guessMuscles(t.value);
      if (g && (g.m !== p.d.m || g.m2.join() !== p.d.m2.join())){ p.d.m = g.m; p.d.m2 = g.m2; p.auto = 1; const pos = t.selectionStart; render(); const f = $('[data-f="n"]'); if (f){ f.focus(); try { f.setSelectionRange(pos, pos); } catch (e) {} } } }
    return; }
  if (t.dataset.wf === "bar"){ const v = parseNum(t.value); if (v != null) curPage().d.bar = fromU(v); return; }
  if (t.dataset.wq){ const v = parseNum(t.value); if (v != null) curPage().q[t.dataset.wq] = fromU(v); return; }
  if (t.id === "exq"){ ui.q = t.value; const q = ui.q.trim().toLowerCase(); const list = S.ex.filter(e => !q || (e.n + " " + (MN[e.m] || "") + " " + (EN[e.eq] || "")).toLowerCase().includes(q)).sort((a, b) => a.n.localeCompare(b.n)); $("#exlist").innerHTML = list.map(exRow).join("") || `<div class="li mu">No matches.</div>`; return; }
  if (t.id === "pq"){ ui.sheet.q = t.value; const q = t.value.trim().toLowerCase(); const recent = new Map(); S.ses.forEach((x, i) => x.ex.forEach(r => { if (!recent.has(r.e)) recent.set(r.e, i); })); const list = S.ex.filter(e => !q || (e.n + " " + (MN[e.m] || "")).toLowerCase().includes(q)).sort((a, b) => (recent.get(a.id) ?? 1e9) - (recent.get(b.id) ?? 1e9) || a.n.localeCompare(b.n)); $("#plist").innerHTML = pickList(list, ui.sheet); }
});
document.addEventListener("keydown", ev => { if (ev.key === "Enter" && ev.target.classList.contains("cell")) ev.target.blur(); });
document.addEventListener("focusin", ev => { if (ev.target.classList.contains("cell")) setTimeout(() => { try { ev.target.select(); } catch (e) {} }, 0); });

/* long press (days) */
let lp = null;
document.addEventListener("pointerdown", ev => {
  const el = ev.target.closest("[data-lp]"); if (!el || ev.target.closest(".play")) return;
  el.classList.add("press");
  lp = {el, x:ev.clientX, y:ev.clientY, t:setTimeout(() => { el.classList.remove("press"); suppressClick = true; setTimeout(() => { suppressClick = false; }, 700); vib(15); A[el.dataset.lp]({dataset:{v:el.dataset.v}}); lp = null; }, 480)};
});
const lpCancel = () => { if (lp){ clearTimeout(lp.t); lp.el.classList.remove("press"); lp = null; } };
document.addEventListener("pointermove", ev => { if (lp && Math.hypot(ev.clientX - lp.x, ev.clientY - lp.y) > 10) lpCancel(); });
document.addEventListener("pointerup", lpCancel); document.addEventListener("pointercancel", lpCancel);
document.addEventListener("contextmenu", ev => { if (ev.target.closest("[data-lp]")) ev.preventDefault(); });

/* swipe a set left to delete */
let sw = null;
document.addEventListener("pointerdown", ev => {
  const row = ev.target.closest("[data-swipe]"); if (!row || ev.pointerType === "mouse" && ev.button !== 0) return;
  sw = {row, x:ev.clientX, y:ev.clientY, dx:0, on:false};
});
document.addEventListener("pointermove", ev => {
  if (!sw) return; const dx = ev.clientX - sw.x, dy = ev.clientY - sw.y;
  if (!sw.on){ if (Math.abs(dy) > 12){ sw = null; return; } if (dx < -14 && Math.abs(dx) > Math.abs(dy) * 1.4){ sw.on = true; sw.row.style.transition = "none"; if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); } else return; }
  sw.dx = Math.min(0, dx); sw.row.style.transform = `translateX(${sw.dx}px)`; sw.row.style.opacity = String(1 + sw.dx / 300);
});
const swEnd = () => {
  if (!sw) return; const {row, dx, on} = sw; sw = null; if (!on) return;
  suppressClick = true; setTimeout(() => { suppressClick = false; }, 350);
  row.style.transition = "";
  if (dx < -90){
    row.classList.add("out"); vib(15);
    const i = +row.dataset.i, j = +row.dataset.j;
    setTimeout(() => { const r = S.act.ex[i], [s] = r.sets.splice(j, 1); S._swipeTip = 1; save(); render(); toast("Set deleted", () => { r.sets.splice(j, 0, s); save(); render(); }); }, 180);
  } else { row.style.transform = ""; row.style.opacity = ""; }
};
document.addEventListener("pointerup", swEnd); document.addEventListener("pointercancel", () => { if (sw){ sw.row.style.transform = ""; sw.row.style.opacity = ""; sw = null; } });

/* drag to reorder (day editor) */
let dg = null;
document.addEventListener("pointerdown", ev => {
  const h = ev.target.closest("[data-grip]"); if (!h) return;
  ev.preventDefault(); const el = h.closest(".ditem"), items = $$("#dlist .ditem");
  const i = items.indexOf(el), rect = el.getBoundingClientRect();
  dg = {el, items, i, to:i, y:ev.clientY, h:rect.height + 8, mids:items.map(x => { const r = x.getBoundingClientRect(); return r.top + r.height / 2; })};
  el.classList.add("dragging"); h.setPointerCapture && h.setPointerCapture(ev.pointerId); vib(10);
});
document.addEventListener("pointermove", ev => {
  if (!dg) return; ev.preventDefault();
  const dy = ev.clientY - dg.y, mid = dg.mids[dg.i] + dy;
  let to = dg.i; for (let k = 0; k < dg.mids.length; k++){ if (k < dg.i && mid < dg.mids[k]) { to = k; break; } } for (let k = dg.mids.length - 1; k > dg.i; k--){ if (mid > dg.mids[k]) { to = k; break; } }
  dg.to = to; dg.el.style.transform = `translateY(${dy}px)`;
  dg.items.forEach((x, k) => { if (k === dg.i) return; let t = 0; if (dg.i < to && k > dg.i && k <= to) t = -dg.h; if (dg.i > to && k < dg.i && k >= to) t = dg.h; x.style.transition = "transform .15s"; x.style.transform = t ? `translateY(${t}px)` : ""; });
}, {passive:false});
const dgEnd = () => { if (!dg) return; const {i, to} = dg; dg = null; const d = curPage().d; if (i !== to){ const [it] = d.items.splice(i, 1); d.items.splice(to, 0, it); vib(10); } render(); };
document.addEventListener("pointerup", dgEnd); document.addEventListener("pointercancel", dgEnd);

/* ---------- start ---------- */
(async () => {
  await phLoad();
  render();
  if (S.act){ goTab("work"); const k = S.act.ex.findIndex(r => r.sets.some(s => !s.done)); ui.wOpen = k < 0 ? 0 : k; render(); }
  const q = new URLSearchParams(location.search).get("tab");
  if (q === "prog") goTab("prog"); else if (q === "work") goTab("work");
  wake(); setInterval(tickClock, 1000); tickClock();
  const sp = $("#splash"), hide = () => { if (!sp.isConnected) return; sp.style.opacity = 0; setTimeout(() => sp.remove(), 400); };
  const img = sp.querySelector("img"), shown = () => setTimeout(hide, Math.max(0, 1600 - performance.now()) + 800);
  sp.addEventListener("click", hide);
  if (img.complete) shown(); else { img.onload = shown; img.onerror = hide; setTimeout(hide, 5000); }
})();
if ("serviceWorker" in navigator) addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
