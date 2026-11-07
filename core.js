"use strict";
/* ---------- constants ---------- */
const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const KEY = "taketren.v2";
const MUSCLES = [["chest","Chest"],["fdelts","Front delts"],["sdelts","Side delts"],["rdelts","Rear delts"],["biceps","Biceps"],["triceps","Triceps"],["forearms","Forearms"],["lats","Lats"],["upperback","Upper back"],["traps","Traps"],["lowerback","Lower back"],["abs","Abs"],["obliques","Obliques"],["glutes","Glutes"],["quads","Quads"],["hamstrings","Hamstrings"],["calves","Calves"],["adductors","Adductors"],["abductors","Abductors"]];
const MN = Object.fromEntries(MUSCLES);
const SLUG = {chest:"chest",fdelts:"deltoids",sdelts:"deltoids",rdelts:"deltoids",biceps:"biceps",triceps:"triceps",forearms:"forearm",lats:"upper-back",upperback:"upper-back",traps:"trapezius",lowerback:"lower-back",abs:"abs",obliques:"obliques",glutes:"gluteal",quads:"quadriceps",hamstrings:"hamstring",calves:"calves",adductors:"adductors",abductors:"gluteal"};
const EQUIP = [["barbell","Barbell"],["dumbbell","Dumbbell"],["machine","Machine"],["cable","Cable"],["bodyweight","Bodyweight"],["other","Other"]];
const EN = Object.fromEntries(EQUIP);
const MODES = [["wr","Weight × reps","Bench press, curls, rows"],["r","Reps only","Pull-ups, push-ups"],["wbw","Weighted bodyweight","Weighted dips, weighted pull-ups"],["ast","Assisted","Assisted pull-up machine"],["td","Time and distance","Running, rowing, cycling"]];
const MODEN = Object.fromEntries(MODES.map(m => [m[0], m[1]]));
const PLATE_SIZES = [25, 20, 15, 10, 5, 2.5, 2, 1.25, 1, 0.5];
const PLATE_COL = {25:"#d9534f",20:"#4f7fd9",15:"#e0b43c",10:"#4caf6e",5:"#e5e7eb",2.5:"#d9534f",2:"#4f7fd9",1.25:"#a1a1aa",1:"#4caf6e",0.5:"#e5e7eb"};
const DEF = {v:2,u:"kg",ex:[],days:[],ses:[],act:null,bw:[],set:{awake:true,vib:true,wuStats:false,rpe:false,rest:false,restSec:90,defSets:3,remind:true},lb:0,lz:0};
const DAY = 864e5;

/* ---------- state + storage ---------- */
let S = load();
function clone(o){ return JSON.parse(JSON.stringify(o)); }
function load(){
  try { const d = JSON.parse(localStorage.getItem(KEY)); if (d && d.v === 2) return Object.assign(clone(DEF), d, {set: Object.assign({}, DEF.set, d.set || {})}); } catch (e) {}
  return clone(DEF);
}
let svT = 0;
function save(now){
  clearTimeout(svT);
  const f = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { toast("Couldn't save: phone storage is full"); } };
  if (now) f(); else svT = setTimeout(f, 200);
}
addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") save(true); });
addEventListener("pagehide", () => save(true));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

/* photos in IndexedDB */
let PH = {};
const idb = new Promise(r => { try { const q = indexedDB.open("taketren", 1); q.onupgradeneeded = () => q.result.createObjectStore("p"); q.onsuccess = () => r(q.result); q.onerror = () => r(null); } catch (e) { r(null); } });
async function phLoad(){ const d = await idb; if (!d) return; await new Promise(r => { const o = {}, q = d.transaction("p").objectStore("p").openCursor(); q.onsuccess = () => { const c = q.result; if (c) { o[c.key] = c.value; c.continue(); } else { PH = o; r(); } }; q.onerror = () => r(); }); }
async function phSet(k, v){ if (v) PH[k] = v; else delete PH[k]; try { const d = await idb; if (!d) return; const s = d.transaction("p", "readwrite").objectStore("p"); v ? s.put(v, k) : s.delete(k); } catch (e) {} }
async function phClear(){ PH = {}; try { const d = await idb; if (d) d.transaction("p", "readwrite").objectStore("p").clear(); } catch (e) {} }
function shrinkImage(file, cb){
  const r = new FileReader();
  r.onload = () => { const i = new Image(); i.onload = () => { const k = Math.min(1, 900 / Math.max(i.width, i.height)), c = document.createElement("canvas"); c.width = Math.round(i.width * k); c.height = Math.round(i.height * k); c.getContext("2d").drawImage(i, 0, 0, c.width, c.height); cb(c.toDataURL("image/jpeg", .82)); }; i.onerror = () => cb(null); i.src = r.result; };
  r.onerror = () => cb(null); r.readAsDataURL(file);
}

/* ---------- helpers ---------- */
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const X = id => S.ex.find(e => e.id === id);
const exName = (id, fb) => (X(id) || {}).n || fb || "Deleted exercise";
const LBF = 2.20462;
const toU = kg => S.u === "lb" ? kg * LBF : kg;
const fromU = v => S.u === "lb" ? v / LBF : v;
const nfmt = n => { if (n == null || isNaN(n)) return ""; const r = Math.round(n * 100) / 100; return String(r); };
const wv = kg => nfmt(S.u === "lb" ? Math.round(toU(kg) * 10) / 10 : kg);
const fw = kg => wv(kg) + " " + S.u;
const parseNum = v => { const n = parseFloat(String(v).replace(",", ".")); return isNaN(n) ? null : n; };
const orm = (w, r) => r <= 1 ? w : w * (1 + r / 30);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
function fset(mode, s, long){
  const x = long ? " × " : "×";
  if (mode === "wr") return wv(s.w) + (long ? " " + S.u : "") + x + s.r;
  if (mode === "r") return s.r + (long ? " reps" : "");
  if (mode === "wbw") return "+" + wv(s.w) + (long ? " " + S.u : "") + x + s.r;
  if (mode === "ast") return "−" + wv(s.w) + (long ? " " + S.u : "") + x + s.r;
  if (mode === "td") return nfmt(s.t) + (long ? " min, " : "′ ") + nfmt(s.d) + " km";
  return "";
}
function dayStart(t){ const d = new Date(t); d.setHours(0, 0, 0, 0); return +d; }
function wk0(t){ const d = new Date(dayStart(t)); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return +d; }
const prevWk = t => wk0(t - 3 * DAY);
function ago(t){
  const k = Math.round((dayStart(Date.now()) - dayStart(t)) / DAY);
  if (k <= 0) return "Today"; if (k === 1) return "Yesterday"; if (k < 7) return k + " days ago";
  if (k < 14) return "1 week ago"; if (k < 60) return Math.floor(k / 7) + " weeks ago";
  return new Date(t).toLocaleDateString(undefined, {day:"numeric", month:"short"});
}
const dstr = (t, o) => new Date(t).toLocaleDateString(undefined, o || {weekday:"long", day:"numeric", month:"short"});
const tstr = t => new Date(t).toLocaleTimeString(undefined, {hour:"2-digit", minute:"2-digit"});
function clockStr(ms){ const s = Math.max(0, Math.floor(ms / 1000)), p = n => String(n).padStart(2, "0"); return (s >= 3600 ? Math.floor(s / 3600) + ":" + p(Math.floor(s / 60) % 60) : Math.floor(s / 60)) + ":" + p(s % 60); }
function vib(p){ try { if (S.set.vib && navigator.vibrate) navigator.vibrate(p); } catch (e) {} }

/* ---------- weights setups ---------- */
function defSetup(e){
  if (e.eq === "barbell") return {t:"plates", bar:20, pl:{25:2,20:1,15:1,10:2,5:2,2.5:2,1.25:2}};
  if (e.eq === "dumbbell"){ const l = []; for (let v = 1; v <= 10; v++) l.push(v); for (let v = 12; v <= 50; v += 2) l.push(v); return {t:"db", list:l}; }
  if (e.eq === "machine" || e.eq === "cable"){ const l = []; for (let v = 5; v <= 100; v += 5) l.push(v); return {t:"stack", list:l, add:[]}; }
  return {t:"step", s:e.step || 2.5};
}
const setupOf = e => e.ws || defSetup(e);
const AKC = new Map();
function plateTable(s){
  const key = "p" + JSON.stringify(s);
  if (AKC.has(key)) return AKC.get(key);
  let reach = new Map([[0, []]]);
  const sizes = Object.keys(s.pl).map(Number).filter(p => s.pl[p] > 0).sort((a, b) => b - a);
  for (const p of sizes){
    const c = s.pl[p], pc = Math.round(p * 100), next = new Map(reach);
    for (const [sum, combo] of reach){
      for (let k = 1; k <= c; k++){
        const ns = sum + pc * k; if (ns > 40000) break;
        if (!next.has(ns) || next.get(ns).length > combo.length + k) next.set(ns, combo.concat(Array(k).fill(p)));
      }
    }
    reach = next;
  }
  AKC.set(key, reach); return reach;
}
function achievable(e){
  const s = setupOf(e), key = JSON.stringify(s);
  if (AKC.has(key)) return AKC.get(key);
  let out = [];
  if (s.t === "plates"){ for (const sum of plateTable(s).keys()) out.push(Math.round((s.bar * 100 + 2 * sum)) / 100); }
  else if (s.t === "stack"){
    let adds = [0]; for (const a of (s.add || [])) adds = adds.concat(adds.map(x => x + a));
    for (const b of s.list) for (const a of adds) out.push(Math.round((b + a) * 100) / 100);
    if (e.mode === "wbw" || e.mode === "ast") out.push(0);
  }
  else if (s.t === "db"){ out = s.list.slice(); if (e.mode === "wbw") out.push(0); }
  else { const st = s.s > 0 ? s.s : 2.5; for (let v = 0; v <= 500 + 1e-9; v += st) out.push(Math.round(v * 100) / 100); }
  out = [...new Set(out)].sort((a, b) => a - b);
  AKC.set(key, out); return out;
}
function nextUp(e, w){ const l = achievable(e); for (const a of l) if (a > w + 1e-6) return a; return w; }
function nextDown(e, w){ const l = achievable(e); for (let i = l.length - 1; i >= 0; i--) if (l[i] < w - 1e-6) return l[i]; return w; }
function plateMath(e, w){
  const s = setupOf(e); if (s.t !== "plates" || w == null) return null;
  const side = Math.round((w - s.bar) * 100 / 2); if (side < 0) return null;
  const combo = plateTable(s).get(side); if (!combo) return null;
  return {bar:s.bar, side:combo};
}
function setupSummary(e){
  const s = setupOf(e), l = achievable(e);
  if (s.t === "plates"){ const n = Object.values(s.pl).filter(c => c > 0).length; return "Plates: " + wv(s.bar) + " " + S.u + " bar, " + n + " plate size" + (n === 1 ? "" : "s"); }
  if (s.t === "stack") return "Weight stack: " + wv(l[0] ?? 0) + " to " + fw(l[l.length - 1] ?? 0) + ((s.add || []).length ? ", with add-ons" : "");
  if (s.t === "db") return "Dumbbells: " + s.list.length + " pairs, " + wv(s.list[0] ?? 0) + " to " + fw(s.list[s.list.length - 1] ?? 0);
  return "Fixed steps of " + fw(s.s);
}

/* ---------- history lookups ---------- */
function lastRec(id, skipSid){
  for (const s of S.ses){ if (s.id === skipSid) continue; const r = s.ex.find(x => x.e === id); if (r && r.sets.length) return {s, r}; }
  return null;
}
const isW = mode => mode === "wr" || mode === "wbw" || mode === "ast";
function rowsFor(id){
  const e = X(id), L = lastRec(id);
  if (!e) return [];
  if (!L) return Array.from({length:S.set.defSets}, () => ({}));
  return L.r.sets.map(s => {
    const o = {w:s.w, r:s.r, t:s.t, d:s.d};
    if (s.wu) o.wu = 1;
    if (!s.wu && L.r.hit){ if (e.mode === "wr" || e.mode === "wbw") o.w = nextUp(e, s.w); else if (e.mode === "ast") o.w = nextDown(e, s.w); }
    o.tw = o.w; o.tr = o.r;
    return o;
  });
}
function countsInStats(s){ return S.set.wuStats || !s.wu; }

/* ---------- records ---------- */
function bests(id, exclude){
  const e = X(id), b = {has:false, w:-Infinity, o:-Infinity, r:-Infinity, d:-Infinity, aw:Infinity};
  if (!e) return b;
  const f = s => { if (s.wu) return; b.has = true;
    if (e.mode === "wr"){ b.w = Math.max(b.w, s.w); b.o = Math.max(b.o, orm(s.w, s.r)); }
    else if (e.mode === "r") b.r = Math.max(b.r, s.r);
    else if (e.mode === "wbw"){ b.w = Math.max(b.w, s.w); b.r = Math.max(b.r, s.r); }
    else if (e.mode === "ast") b.aw = Math.min(b.aw, s.w);
    else if (e.mode === "td") b.d = Math.max(b.d, s.d); };
  for (const x of S.ses) for (const r of x.ex) if (r.e === id) r.sets.forEach(f);
  if (S.act) for (const r of S.act.ex) if (r.e === id) for (const s of r.sets) if (s.done && s !== exclude) f(s);
  return b;
}
function prFor(id, s){
  if (s.wu) return null;
  const b = bests(id, s); if (!b.has) return null;
  const e = X(id), E = 1e-6;
  if (e.mode === "wr"){ if (s.w > b.w + E) return "Heaviest weight: " + fw(s.w); if (orm(s.w, s.r) > b.o + E) return "Best est. 1RM: " + fw(Math.round(orm(s.w, s.r) * 10) / 10); }
  if (e.mode === "r" && s.r > b.r) return "Most reps: " + s.r;
  if (e.mode === "wbw"){ if (s.w > b.w + E) return "Heaviest added: +" + fw(s.w); }
  if (e.mode === "ast" && s.w < b.aw - E) return "Least assistance: " + fw(s.w);
  if (e.mode === "td" && s.d > b.d + E) return "Longest distance: " + nfmt(s.d) + " km";
  return null;
}
function records(id){
  const e = X(id), out = []; if (!e) return out;
  let best = null, bo = null, br = null, bd = null, ba = null;
  for (const x of S.ses) for (const r of x.ex) if (r.e === id) for (const s of r.sets){ if (s.wu) continue;
    if (!best || s.w > best.w || (s.w === best.w && s.r > best.r)) best = s;
    if (!bo || orm(s.w, s.r) > orm(bo.w, bo.r)) bo = s;
    if (!br || s.r > br.r || (s.r === br.r && s.w > br.w)) br = s;
    if (!bd || s.d > bd.d) bd = s;
    if (!ba || s.w < ba.w) ba = s; }
  if (!best) return out;
  if (e.mode === "wr"){ out.push(["Heaviest", wv(best.w) + " × " + best.r]); out.push(["Est. 1RM", fw(Math.round(orm(bo.w, bo.r) * 10) / 10)]); out.push(["Most reps", wv(br.w) + " × " + br.r]); }
  else if (e.mode === "r"){ out.push(["Most reps", br.r]); }
  else if (e.mode === "wbw"){ out.push(["Heaviest", "+" + wv(best.w) + " × " + best.r]); out.push(["Most reps", br.r]); }
  else if (e.mode === "ast"){ out.push(["Least help", "−" + wv(ba.w) + " × " + ba.r]); out.push(["Most reps", br.r]); }
  else if (e.mode === "td"){ out.push(["Longest", nfmt(bd.d) + " km"]); }
  return out;
}
function metricSeries(id){
  const e = X(id); if (!e) return {pts:[], unit:""};
  const pts = [];
  for (const x of S.ses.slice().reverse()){ const r = x.ex.find(y => y.e === id); if (!r) continue; const w = r.sets.filter(s => !s.wu); if (!w.length) continue;
    let v; if (e.mode === "wr") v = Math.max(...w.map(s => orm(s.w, s.r))); else if (e.mode === "r") v = Math.max(...w.map(s => s.r)); else if (e.mode === "wbw") v = Math.max(...w.map(s => s.w)); else if (e.mode === "ast") v = Math.min(...w.map(s => s.w)); else v = Math.max(...w.map(s => s.d));
    pts.push({t:x.st, v}); }
  const conv = isW(e.mode);
  return {pts:pts.map(p => ({t:p.t, v:conv ? toU(p.v) : p.v})), unit:e.mode === "wr" ? S.u + " est. 1RM" : e.mode === "r" ? "reps" : e.mode === "wbw" ? S.u + " added" : e.mode === "ast" ? S.u + " assistance" : "km", lowerBetter:e.mode === "ast", title:e.mode === "wr" ? "Estimated 1RM" : e.mode === "r" ? "Most reps" : e.mode === "wbw" ? "Heaviest added weight" : e.mode === "ast" ? "Assistance (lower is better)" : "Distance"};
}

/* ---------- stats ---------- */
function volOf(x){ let v = 0; for (const r of x.ex){ const e = X(r.e); if (!e || e.mode !== "wr") continue; for (const s of r.sets) if (countsInStats(s)) v += s.w * s.r; } return v; }
function setsOf(x){ let n = 0; for (const r of x.ex) for (const s of r.sets) if (!s.wu) n++; return n; }
function muscleSets(from, to){
  const m = {};
  for (const x of S.ses){ if (x.st < from || x.st >= to) continue;
    for (const r of x.ex){ const e = X(r.e); if (!e) continue; const n = r.sets.filter(countsInStats).length; if (!n) continue;
      if (e.m) m[e.m] = (m[e.m] || 0) + n; for (const s of (e.m2 || [])) m[s] = (m[s] || 0) + n * .5; } }
  return m;
}
function streak(){ const w = new Set(S.ses.map(s => wk0(s.st))); let c = 0, t = wk0(Date.now()); if (!w.has(t)) t = prevWk(t); while (w.has(t)){ c++; t = prevWk(t); } return c; }
function bkDue(){ if (!S.set.remind || !S.ses.length) return false; const n = Date.now(), base = S.lb || S.ses[S.ses.length - 1].st; return n - base > 14 * DAY && n - (S.lz || 0) > 3 * DAY; }

/* ---------- icons ---------- */
const sv = (d, o = {}) => `<svg width="${o.s || 22}" height="${o.s || 22}" viewBox="0 0 24 24" fill="${o.fill || "none"}" stroke="${o.fill ? "none" : "currentColor"}" stroke-width="${o.w || 2}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const I = {
  home: o => sv('<path d="M3.5 10.5 12 3.5l8.5 7V20a1 1 0 0 1-1 1H15v-6H9v6H4.5a1 1 0 0 1-1-1z"/>', o),
  dumb: o => sv('<path d="M6 7v10M3 9.5v5M18 7v10M21 9.5v5M6 12h12"/>', o),
  chart: o => sv('<path d="M3 17l6-6 4 4 8-8M15 7h6v6"/>', o),
  gear: o => sv('<circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="7"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1"/>', Object.assign({w:1.8}, o)),
  back: o => sv('<path d="M15 6l-6 6 6 6"/>', Object.assign({w:2.2}, o)),
  chevR: o => sv('<path d="M9 6l6 6-6 6"/>', Object.assign({w:2.2, s:20}, o)),
  chevD: o => sv('<path d="M6 9l6 6 6-6"/>', Object.assign({w:2.2, s:22}, o)),
  plus: o => sv('<path d="M12 5v14M5 12h14"/>', Object.assign({w:2.2, s:18}, o)),
  more: o => sv('<circle cx="12" cy="5" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="12" cy="19" r="1.8"/>', Object.assign({fill:"currentColor"}, o)),
  check: o => sv('<path d="M5 12.5l4.5 4.5L19 7.5"/>', Object.assign({w:2.6, s:20}, o)),
  trophy: o => sv('<path d="M8 4h8v5a4 4 0 0 1-8 0zM8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8 20h8M10 17h4"/>', Object.assign({w:1.8}, o)),
  flame: o => sv('<path d="M12 3c1 3 5 5 5 10a5 5 0 0 1-10 0c0-3 2-4 2-6 1 1 1.5 2 1.5 3 0-3 .5-5 1.5-7z"/>', Object.assign({w:1.8}, o)),
  link: o => sv('<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>', Object.assign({s:16}, o)),
  note: o => sv('<path d="M5 4h14v11l-5 5H5zM14 20v-5h5"/>', Object.assign({s:16, w:1.8}, o)),
  play: o => sv('<path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z"/>', Object.assign({fill:"currentColor", s:18}, o)),
  camera: o => sv('<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>', Object.assign({w:1.7, s:28}, o)),
  share: o => sv('<path d="M12 3v12M7 8l5-5 5 5M5 14v6h14v-6"/>', o),
  edit: o => sv('<path d="M4 20h4L19 9l-4-4L4 16z"/>', Object.assign({s:18}, o)),
  trash: o => sv('<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>', o),
  grip: o => sv('<circle cx="9" cy="6" r="1.6"/><circle cx="15" cy="6" r="1.6"/><circle cx="9" cy="12" r="1.6"/><circle cx="15" cy="12" r="1.6"/><circle cx="9" cy="18" r="1.6"/><circle cx="15" cy="18" r="1.6"/>', Object.assign({fill:"currentColor", s:20}, o)),
  close: o => sv('<path d="M6 6l12 12M18 6 6 18"/>', Object.assign({w:2.2, s:20}, o)),
  swap: o => sv('<path d="M7 7h12l-3-3M17 17H5l3 3"/>', o),
  up: o => sv('<path d="M12 19V5M6 11l6-6 6 6"/>', o),
  down: o => sv('<path d="M12 5v14M6 13l6 6 6-6"/>', o),
  info: o => sv('<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>', o),
  bars: o => sv('<path d="M2 12h20M5 7v10M8 5v14M16 5v14M19 7v10"/>', o),
  unlink: o => sv('<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1M3 3l18 18"/>', o),
  left: o => sv('<path d="M15 6l-6 6 6 6"/>', Object.assign({s:20}, o)),
  right: o => sv('<path d="M9 6l6 6-6 6"/>', Object.assign({s:20}, o))
};
const LOGO = `<svg viewBox="0 0 180 180" width="42" height="42" role="img" aria-label="Take Tren logo"><rect width="180" height="180" rx="40" fill="#16121f"/><g transform="translate(154,22) scale(-3.6,3.6)"><path fill="#a78bfa" d="M12.804 22.277a9.192 9.192 0 0 0-.206-.973c-.62-2.223-1.14-3.164-.918-5.494.29-1.584.273-4.763 4.483-4.268 1.112.131 2.843.927 3.834.91.567-.01.98-1.157 1.017-1.539.051-.526-.865-1.42-1.248-1.554a94.35 94.35 0 0 0-2.681-.824c-1.039-.301-.985-1.705-1.051-2.205a.597.597 0 0 1 .294-.591c.21-.124.375-.008.579.125l.885.648c.497.426-.874 1.24-.503 1.376 0 0 1.755.659 2.507.796.412.075 1.834-1.529 1.917-2.47.065-.74-3.398-4.083-5.867-5.381-.868-.456-1.377-.721-1.949-.694-.683.032-.898.302-1.748 1.03C8.302 4.46 4.568 11.577 4.02 13.152c-2.246 6.461-2.597 9.865-2.677 11.788a21.26 21.26 0 0 0-.076 1.758c.065 0-1 5 0 6s5.326 1 5.326 1c10 3.989 28.57 2.948 28.57-7.233 0-12.172-18.813-10.557-22.359-4.188z"/><path fill="#16121f" d="M20.63 32.078c-3.16-.332-5.628-1.881-5.767-1.97a1 1 0 0 1 1.075-1.687c.04.025 4.003 2.492 7.846 1.467 2.125-.566 3.867-2.115 5.177-4.601a1 1 0 0 1 1.77.932c-1.585 3.006-3.754 4.893-6.447 5.606-1.257.332-2.502.374-3.654.253z"/></g></svg>`;

/* ---------- drawing helpers ---------- */
const LVL = ["#2a2a30", "rgba(167,139,250,0.35)", "rgba(167,139,250,0.65)", "#a78bfa"];
const NEUTRAL = new Set(["hair","head","neck","hands","feet","knees","ankles","tibialis"]);
function bodySvg(m){
  const sl = {}; let mx = 0;
  for (const k in m){ const s = SLUG[k]; if (!s) continue; sl[s] = Math.max(sl[s] || 0, m[k]); }
  for (const k in sl) mx = Math.max(mx, sl[k]);
  const lv = s => { const v = sl[s] || 0; if (!v) return 0; const r = v / mx; return r > .66 ? 3 : r > .33 ? 2 : 1; };
  const g = parts => parts.map(p => { const fill = p.s === "hair" ? "#1c1c20" : NEUTRAL.has(p.s) ? "#26262c" : LVL[lv(p.s)]; return p.d.map(d => `<path d="${d}" fill="${fill}"/>`).join(""); }).join("");
  return `<svg viewBox="20 60 1408 1310" width="100%" role="img" aria-label="Body map of muscles trained" style="display:block"><g stroke="#000" stroke-width="2">${g(BODY.front)}${g(BODY.back)}</g></svg>`;
}
function lineChart(pts, opt = {}){
  if (!pts.length) return `<div class="empty sm">No data yet</div>`;
  const W = 340, H = 150, pl = 30, pr = 12, pt = 12, pb = 24;
  const ys = pts.map(p => p.v); let mn = Math.min(...ys), mx = Math.max(...ys); if (mx - mn < 1e-6){ mn -= 1; mx += 1; }
  const t0 = pts[0].t, t1 = pts[pts.length - 1].t, span = t1 - t0 || 1;
  const X_ = t => pts.length === 1 ? (pl + W - pr) / 2 : pl + (t - t0) / span * (W - pl - pr);
  const Y_ = v => pt + (1 - (v - mn) / (mx - mn)) * (H - pt - pb);
  const P = pts.map(p => [X_(p.t), Y_(p.v)]);
  const best = opt.lowerBetter ? Math.min(...ys) : Math.max(...ys);
  const bi = ys.lastIndexOf(best);
  const lab = v => nfmt(Math.round(v * 10) / 10);
  const dl = t => new Date(t).toLocaleDateString(undefined, {day:"numeric", month:"short"});
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="${esc(opt.label || "Chart")}" style="display:block">
  <line x1="${pl}" y1="${Y_(mx)}" x2="${W - pr}" y2="${Y_(mx)}" stroke="#26262b" stroke-dasharray="4 4"/><line x1="${pl}" y1="${Y_(mn)}" x2="${W - pr}" y2="${Y_(mn)}" stroke="#26262b"/>
  <text x="0" y="${Y_(mx) + 4}" fill="#8b8b94" font-size="11" font-family="Inter">${lab(mx)}</text><text x="0" y="${Y_(mn) + 4}" fill="#8b8b94" font-size="11" font-family="Inter">${lab(mn)}</text>
  <polyline fill="none" stroke="#a78bfa" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round" points="${P.map(p => p.join(",")).join(" ")}"/>
  ${P.length <= 40 ? P.map(p => `<circle cx="${p[0]}" cy="${p[1]}" r="3.5" fill="#a78bfa"/>`).join("") : ""}
  <circle cx="${P[bi][0]}" cy="${P[bi][1]}" r="6" fill="#f2c14e" stroke="#121214" stroke-width="3"/>
  <text x="${pl}" y="${H - 6}" fill="#8b8b94" font-size="11" font-family="Inter">${dl(t0)}</text><text x="${W - pr}" y="${H - 6}" fill="#8b8b94" font-size="11" font-family="Inter" text-anchor="end">${dl(t1)}</text></svg>`;
}
function barbellSvg(pm){
  if (!pm) return "";
  const H = 110, cx = 190; let L = "", x = 132, R = "", xr = 248;
  const h = p => 30 + Math.min(1, p / 25) * 60, w = p => p >= 15 ? 18 : p >= 5 ? 11 : 8;
  for (const p of pm.side){ const hh = h(p), ww = w(p); L += `<rect x="${x - ww}" y="${(H - hh) / 2}" width="${ww}" height="${hh}" rx="3" fill="${PLATE_COL[p] || "#a1a1aa"}"/>`; R += `<rect x="${xr}" y="${(H - hh) / 2}" width="${ww}" height="${hh}" rx="3" fill="${PLATE_COL[p] || "#a1a1aa"}"/>`; x -= ww + 2; xr += ww + 2; }
  return `<svg viewBox="0 0 380 ${H}" width="100%" role="img" aria-label="Plates per side: ${pm.side.join(", ")}" style="display:block"><rect x="0" y="${H / 2 - 4}" width="380" height="8" rx="4" fill="#71717a"/><rect x="132" y="${H / 2 - 11}" width="10" height="22" rx="2" fill="#a1a1aa"/><rect x="238" y="${H / 2 - 11}" width="10" height="22" rx="2" fill="#a1a1aa"/>${L}${R}<text x="${cx}" y="${H / 2 - 14}" fill="#a1a1aa" font-size="12" font-family="Inter" text-anchor="middle">${wv(pm.bar)} ${S.u} bar</text></svg>`;
}
