"use strict";
const ui = {tab:"home", stack:[], sheet:null, wOpen:0, prog:"overview", progEx:null, range:"3m", cM:false, cC:false, calM:null, calSel:null, hx:null, q:"", tabPushed:false, skipPop:false, afterPop:null, cd:null};

/* ---------- shell ---------- */
function render(){
  const tp = ui.stack[ui.stack.length - 1], app = $("#app");
  if (tp){ app.innerHTML = PAGES[tp.p](tp); app.className = "page" + (tp.bar ? "" : " nobar"); }
  else { app.innerHTML = ({home:vHome, work:vWork, prog:vProg})[ui.tab](); app.className = ""; }
  renderNav(); renderResume(); afterRender();
}
function renderNav(){
  const n = $("#nav"); if (ui.stack.length){ n.classList.add("hidden"); return; } n.classList.remove("hidden");
  const a = S.act, t = ui.tab;
  n.firstElementChild.innerHTML = `
  <button class="${t === "work" ? "on" : ""}" data-a="tab" data-v="work" ${t === "work" ? 'aria-current="page"' : ""}><span class="dotw">${I.dumb({s:26, w:t === "work" ? 2.2 : 1.8})}${a ? "<i></i>" : ""}</span><span class="num" ${a ? "data-clock" : ""}>${a ? clockStr(Date.now() - a.st) : "Workout"}</span></button>
  <button class="home ${t === "home" ? "on" : ""}" data-a="tab" data-v="home" ${t === "home" ? 'aria-current="page"' : ""}><span class="c">${I.home({s:28, w:2.1})}</span>Home</button>
  <button class="${t === "prog" ? "on" : ""}" data-a="tab" data-v="prog" ${t === "prog" ? 'aria-current="page"' : ""}>${I.chart({s:26, w:t === "prog" ? 2.2 : 1.8})}Progress</button>`;
}
function renderResume(){
  const r = $("#resume");
  if (!S.act || ui.tab !== "home" || ui.stack.length){ r.classList.add("hidden"); return; }
  r.classList.remove("hidden");
  r.innerHTML = `<span class="pulse"></span><span class="f1 col"><span class="sm mu">Workout running</span><span class="b7" style="font-size:16px">${esc(S.act.n)} <span class="d num" style="font-size:19px;color:var(--tx2);margin-left:6px" data-clock>${clockStr(Date.now() - S.act.st)}</span></span></span><span class="btn sm">Resume</span>`;
}
const hdr = (title, opts = {}) => `<div class="top ${opts.right ? "sb" : ""}"><div class="row" style="gap:6px;min-width:0"><button class="ib" data-a="back" aria-label="Back">${I.back({s:24})}</button>${title ? `<h1 class="h1 f1" style="font-size:${opts.fs || 34}px">${title}</h1>` : ""}</div>${opts.right || ""}</div>`;
const fbar = inner => `<div class="fbar"><div class="in">${inner}</div></div>`;

/* ---------- home ---------- */
function vHome(){
  const now = Date.now(), t0 = wk0(now), trained = new Set(S.ses.map(s => dayStart(s.st))), today = dayStart(now);
  const week = "MTWTFSS".split("").map((l, i) => { const d = new Date(t0); d.setDate(d.getDate() + i); const ds = +d; return `<span class="${trained.has(ds) ? "on" : ""} ${ds === today ? "today" : ""}">${l}</span>`; }).join("");
  const nWeek = S.ses.filter(s => s.st >= t0).length, st = streak();
  let h = `<div class="row sb" style="min-height:48px"><div class="row">${LOGO}<span class="d" style="font-size:30px;font-weight:800">Take Tren</span></div><button class="ib bg" data-a="page" data-v="settings" aria-label="Settings">${I.gear()}</button></div><div class="col g12" style="margin-top:12px">`;
  if (bkDue()) h += `<div class="card col g10" style="box-shadow:inset 0 0 0 1px var(--acline)"><div class="col g6"><b>Back up your workouts</b><span class="sm mu">${S.lb ? "Last backup " + ago(S.lb).toLowerCase() : "You haven't made a backup yet"}. Everything is stored only on this phone.</span></div><div class="row"><button class="btn g sm f1" data-a="later">Later</button><button class="btn sm f1" data-a="backup">Download backup</button></div></div>`;
  if (!S.ses.length){
    h += `<div class="card col g10"><span class="h2">Welcome</span><span class="mu" style="line-height:1.5">${S.days.length ? "Tap the play button on a day below to start your first workout. Your sets, records and stats build up as you train." : "Make a day (like Chest or Legs), add your own exercises to it, then start it from here. Your sets, records and stats build up as you train."}</span>${S.days.length ? "" : `<button class="btn w" data-a="newday">${I.plus()}Make your first day</button>`}</div>`;
  } else {
    h += `<div class="card col g12"><div class="row" style="align-items:flex-end;gap:12px"><span class="act" style="margin-bottom:10px">${I.flame({s:34})}</span><span class="big">${st}</span><div class="col" style="padding-bottom:4px"><span style="font-size:17px;font-weight:600">week${st === 1 ? "" : "s"} in a row</span><span class="sm mu">${nWeek} workout${nWeek === 1 ? "" : "s"} this week</span></div></div><div class="wk">${week}</div></div>`;
    const kg = S.ses.reduce((a, s) => a + volOf(s), 0), hrs = S.ses.reduce((a, s) => a + s.dur, 0) / 36e5;
    const lifted = S.u === "kg" ? (kg >= 1000 ? nfmt(Math.round(kg / 100) / 10) + " t" : Math.round(kg) + " kg") : (Math.round(toU(kg) / 100) / 10 + "k lb");
    const cars = kg / 1500;
    h += `<div class="grid2"><div class="stat"><div class="sm mu">Lifted so far</div><b>${lifted}</b><div class="sm mu">${cars >= 1 ? "about " + Math.round(cars) + " car" + (Math.round(cars) === 1 ? "" : "s") : "about " + Math.max(1, Math.round(kg / 80)) + " people"}</div></div><div class="stat"><div class="sm mu">Time trained</div><b>${hrs < 1 ? Math.max(1, Math.round(hrs * 60)) + " min" : (hrs >= 10 ? Math.round(hrs) : nfmt(Math.round(hrs * 10) / 10)) + " h"}</b><div class="sm mu">across ${S.ses.length} workout${S.ses.length === 1 ? "" : "s"}</div></div></div>`;
    let lp = null;
    for (const s of S.ses){ if (s.st < now - 30 * DAY) break; for (const r of s.ex) for (const x of r.sets) if (x.pr && !lp) lp = {s, r, x}; if (lp) break; }
    if (lp){ const e = X(lp.r.e); h += `<div class="pr"><div class="ic gold">${I.trophy({s:24})}</div><div class="col f1" style="gap:2px"><span class="sm gold b6">New record, ${ago(lp.s.st).toLowerCase()}</span><span class="b6" style="font-size:15px">${esc(exName(lp.r.e, lp.r.n))}, ${fset(e ? e.mode : "wr", lp.x, true)}</span></div></div>`; }
  }
  h += `<div class="row sb" style="margin-top:12px"><h2 class="h2" style="font-size:28px">Your days</h2>${S.days.length ? `<button class="lk" data-a="newday">${I.plus()}New day</button>` : ""}</div>`;
  if (S.days.length){
    h += `<div class="grid2">` + S.days.map(d => { const last = S.ses.find(s => s.day === d.id); return `<div class="day" role="button" tabindex="0" data-a="daymenu" data-v="${d.id}" data-lp="dayedit" aria-label="${esc(d.n)} options"><div><div class="n">${esc(d.n)}</div><div class="sm mu" style="margin-top:4px">${d.items.length} exercise${d.items.length === 1 ? "" : "s"}</div></div><div class="row sb"><span class="sm mu">${last ? ago(last.st) : "Not done yet"}</span><button class="play" data-a="startday" data-v="${d.id}" aria-label="Start ${esc(d.n)}">${I.play()}</button></div></div>`; }).join("") + `</div><div class="sm mu2" style="text-align:center">Tap a day for options, hold it to edit</div>`;
  } else if (S.ses.length) h += `<button class="btn dash w" data-a="newday">${I.plus()}Make a day</button>`;
  const m = muscleSets(t0, t0 + 7 * DAY), tot = Object.values(m).reduce((a, b) => a + b, 0);
  h += `<section class="card col g10" style="margin-top:8px"><div class="row sb" style="align-items:baseline"><h2 class="h2" style="font-size:24px">Muscles this week</h2><span class="sm mu">${tot ? Math.round(tot) + " sets" : "Nothing yet"}</span></div>${bodySvg(m)}<div class="grid2 xs mu2" style="text-align:center;margin-top:-4px"><span>Front</span><span>Back</span></div><div class="legend"><span>None</span><i style="background:${LVL[0]}"></i><i style="background:${LVL[1]}"></i><i style="background:${LVL[2]}"></i><i style="background:${LVL[3]}"></i><span>Most sets</span></div></section>`;
  if (S.act) h += `<div style="height:76px"></div>`;
  return h + `</div>`;
}

/* ---------- workout ---------- */
function vWork(){
  const a = S.act;
  if (!a){
    let h = `<h1 class="h1">Workout</h1><p class="mu" style="margin:8px 0 18px">No workout running. Pick a day to start.</p><div class="col g8">`;
    h += S.days.map(d => `<div class="cardlink"><span class="f1 col"><span class="h3">${esc(d.n)}</span><span class="sm mu">${d.items.length} exercises</span></span><button class="play" data-a="startday" data-v="${d.id}" aria-label="Start ${esc(d.n)}">${I.play()}</button></div>`).join("");
    return h + `<button class="btn g w" data-a="startempty" style="margin-top:6px">Start an empty workout</button></div>` + finishedList();
  }
  const doneEx = a.ex.filter(r => r.sets.length && r.sets.every(s => s.done)).length;
  let h = `<div class="wtop"><div class="col" style="min-width:0"><span class="mu b6" style="font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(a.n)}</span><span class="clock" data-clock>${clockStr(Date.now() - a.st)}</span></div><button class="btn sm" data-a="finish" style="border-radius:22px;padding:0 22px">Finish</button></div>
  <div class="row" style="margin:12px 0 14px"><div class="bar"><i style="width:${a.ex.length ? doneEx / a.ex.length * 100 : 0}%"></i></div><span class="sm mu">${doneEx} of ${a.ex.length} done</span></div><div class="col g10">`;
  let i = 0;
  while (i < a.ex.length){
    const g = a.ex[i].g;
    if (g && a.ex[i + 1] && a.ex[i + 1].g === g){
      let j = i; let inner = "";
      while (j < a.ex.length && a.ex[j].g === g){ inner += exCard(a.ex[j], j); j++; }
      h += `<div class="ssg"><div class="ssl">${I.link()}Superset</div>${inner}</div>`; i = j;
    } else { h += exCard(a.ex[i], i); i++; }
  }
  if (!a.ex.length) h += `<div class="empty">No exercises yet.</div>`;
  h += `<button class="btn dash w" data-a="addex">${I.plus()}Add exercise</button></div>`;
  return h + finishedList();
}
function finishedList(){
  if (!S.ses.length) return "";
  return `<section class="col g8" style="margin-top:28px"><div class="col" style="gap:2px;margin:0 4px 2px"><h2 class="h2" style="font-size:24px">Finished workouts</h2><span class="sm mu">Tap one to see its sets or delete it</span></div>${S.ses.slice(0, 10).map(s => sesCard(s)).join("")}${S.ses.length > 10 ? `<button class="lk" data-a="prog" data-v="history" style="align-self:center">See all ${S.ses.length} in Progress</button>` : ""}</section>`;
}
function colsFor(e){
  const m = e.mode;
  if (m === "wr") return [["w", S.u]]
    .concat([["r", "Reps"]]);
  if (m === "r") return [["r", "Reps"]];
  if (m === "wbw") return [["w", "+" + S.u], ["r", "Reps"]];
  if (m === "ast") return [["w", "−" + S.u], ["r", "Reps"]];
  return [["t", "Min"], ["d", "Km"]];
}
function gridFor(e){
  const c = colsFor(e).length, rpe = S.set.rpe && e.mode !== "td";
  const cw = rpe ? 56 : 64;
  return `38px minmax(0,1fr) ${Array(c).fill(cw + "px").join(" ")}${rpe ? " 44px" : ""} 46px`;
}
function exCard(r, i){
  const e = X(r.e) || {n:r.n || "Deleted exercise", mode:"wr", note:""};
  const done = r.sets.filter(s => s.done).length, all = r.sets.length && done === r.sets.length, open = ui.wOpen === i;
  const hasPr = r.sets.some(s => s.pr);
  const L = lastRec(r.e);
  let sub;
  if (all){ const w = r.sets.filter(s => !s.wu); const topS = w.length ? (isW(e.mode) ? w.reduce((a, b) => (e.mode === "ast" ? b.w < a.w : b.w > a.w) ? b : a) : w[0]) : null; sub = w.length + " set" + (w.length === 1 ? "" : "s") + (topS ? ", top " + fset(e.mode, topS, true) : ""); }
  else if (done) sub = done + " of " + r.sets.length + " sets done";
  else sub = L ? "Last time: " + L.r.sets.filter(s => !s.wu).length + " sets, " + ago(L.s.st).toLowerCase() : r.sets.length + " sets, first time";
  let h = `<div class="ex" id="ex${i}"><div class="row" style="gap:0;padding-right:4px"><button class="exh f1" data-a="wopen" data-i="${i}" aria-expanded="${open}"><span class="ck ${all ? "on" : ""}">${all ? I.check({s:18}) : ""}</span><span class="f1 col" style="min-width:0"><span class="h3" style="font-size:${open ? 25 : 21}px">${esc(e.n)}</span><span class="sm mu">${sub}</span></span>${hasPr ? `<span class="gold" role="img" aria-label="New record">${I.trophy({s:20})}</span>` : ""}</button><button class="ib" data-a="exmenu" data-i="${i}" aria-label="Options for ${esc(e.n)}">${I.more()}</button></div>`;
  if (!open) return h + `</div>`;
  const cols = colsFor(e), rpe = S.set.rpe && e.mode !== "td", grid = gridFor(e);
  h += `<div class="exb">`;
  if (e.note) h += `<div class="note">${I.note()}<span>${esc(e.note)}</span></div>`;
  h += `<div class="tbl" style="grid-template-columns:${grid}"><span class="th c">Set</span><span class="th">Last time</span>${cols.map(c => `<span class="th c">${c[1]}</span>`).join("")}${rpe ? '<span class="th c">RPE</span>' : ""}<span></span></div>`;
  let n = 0;
  r.sets.forEach((s, j) => {
    const lab = s.wu ? "W" : ++n;
    const ls = L && L.r.sets[j] ? fset(e.mode, L.r.sets[j]) : "–";
    const cls = s.done ? (s.pr ? "srow prr" : "srow done") : "srow";
    h += `<div class="${cls}" style="grid-template-columns:${grid}" data-swipe data-i="${i}" data-j="${j}">
      <button class="sbadge ${s.wu ? "wu" : ""}" data-a="wu" data-i="${i}" data-j="${j}" aria-label="${s.wu ? "Warm-up set, tap to make it a working set" : "Set " + lab + ", tap to mark as warm-up"}">${lab}</button>
      <span class="last">${ls}</span>
      ${cols.map(c => { const v = s[c[0]]; const val = v == null ? "" : (c[0] === "w" ? wv(v) : nfmt(v)); return `<input class="cell" data-i="${i}" data-j="${j}" data-k="${c[0]}" inputmode="${c[0] === "r" ? "numeric" : "decimal"}" enterkeyhint="done" value="${val}" placeholder="–" aria-label="${c[1]}, set ${lab}">`; }).join("")}
      ${rpe ? `<input class="cell" style="font-size:18px" data-i="${i}" data-j="${j}" data-k="rpe" inputmode="decimal" value="${s.rpe ?? ""}" placeholder="–" aria-label="Effort 1 to 10, set ${lab}">` : ""}
      <button class="tick ${s.done ? (s.pr ? "gold" : "on") : ""}" data-a="tick" data-i="${i}" data-j="${j}" aria-label="${s.done ? "Set done, tap to undo" : "Mark set done"}">${s.done && s.pr ? I.trophy({s:20, w:2.2}) : I.check()}</button></div>`;
  });
  h += `<button class="btn dash sm w" data-a="addset" data-i="${i}">${I.plus()}Add set</button>`;
  if (!S._swipeTip) h += `<div class="xs mu2" style="padding:0 4px">Tip: swipe a set left to delete it. Tap the set number to mark a warm-up.</div>`;
  return h + `</div></div>`;
}

/* ---------- progress ---------- */
function vProg(){
  const tabs = [["overview","Overview"],["exercises","Exercises"],["history","History"],["body","Body"]];
  let h = `<h1 class="h1" style="font-size:42px">Progress</h1><div class="hs" role="tablist" style="margin-top:12px;margin-bottom:14px">${tabs.map(t => `<button class="chip ${ui.prog === t[0] ? "on" : ""}" role="tab" aria-selected="${ui.prog === t[0]}" data-a="prog" data-v="${t[0]}">${t[1]}</button>`).join("")}</div>`;
  return h + ({overview:pOverview, exercises:pExercises, history:pHistory, body:pBody})[ui.prog]();
}
function pOverview(){
  if (!S.ses.length) return `<div class="card empty">Finish a workout to see your progress here.</div>` + bwCard(true);
  const t0 = wk0(Date.now()), m = muscleSets(t0, t0 + 7 * DAY);
  const entries = Object.entries(m).sort((a, b) => b[1] - a[1]);
  const used = new Set(S.ex.map(e => e.m).filter(Boolean)), skipped = [...used].filter(k => !m[k]);
  let summary = entries.length ? "Most: " + MN[entries[0][0]] : "Nothing trained yet this week";
  if (entries.length && skipped.length) summary += ". Not yet: " + skipped.slice(0, 3).map(k => MN[k]).join(", ") + (skipped.length > 3 ? "…" : "");
  let h = `<div class="col g12"><div class="card"><button class="coll" data-a="coll" data-v="cM" aria-expanded="${ui.cM}"><span class="col" style="gap:2px"><span class="h2" style="font-size:24px">Sets per muscle</span><span class="sm mu">This week. ${summary}</span></span>${I.chevD()}</button>`;
  if (ui.cM){ const mx = entries.length ? entries[0][1] : 1;
    h += `<div class="col g6" style="margin-top:12px">` + entries.map(([k, v]) => `<div class="mrow"><span class="sm" style="color:var(--tx2)">${MN[k]}</span><div class="tr"><i style="width:${v / mx * 100}%"></i></div><span class="d" style="text-align:right;font-size:17px">${nfmt(v)}</span></div>`).join("") + skipped.map(k => `<div class="mrow"><span class="sm" style="color:var(--tx2)">${MN[k]}</span><div class="tr"></div><span class="d bad" style="text-align:right;font-size:17px">0</span></div>`).join("") + `<span class="xs mu2" style="margin-top:4px">Secondary muscles count as half a set.</span></div>`; }
  h += `</div>`;
  const withHist = S.ex.filter(e => S.ses.some(s => s.ex.some(r => r.e === e.id && r.sets.some(x => !x.wu))));
  if (withHist.length){
    if (!withHist.some(e => e.id === ui.progEx)) ui.progEx = (S.ses[0].ex.find(r => withHist.some(e => e.id === r.e)) || {e:withHist[0].id}).e;
    h += exProgressCard(ui.progEx, withHist);
  }
  h += calendarCard() + bwCard(false) + `</div>`;
  return h;
}
function exProgressCard(id, list){
  const e = X(id), ser = metricSeries(id), ranges = [["1m","1M",30],["3m","3M",91],["1y","1Y",365],["all","All",1e5]];
  const rd = (ranges.find(r => r[0] === ui.range) || ranges[1])[2], pts = ser.pts.filter(p => p.t >= Date.now() - rd * DAY);
  const last = pts[pts.length - 1], first = pts[0];
  let delta = "";
  if (pts.length > 1){ const d = Math.round((last.v - first.v) * 10) / 10; const good = ser.lowerBetter ? d < 0 : d > 0; delta = `<span class="sm b6 ${good ? "good" : "mu"}">${d === 0 ? "No change" : (d > 0 ? "+" : "") + nfmt(d) + " in this range"}</span>`; }
  const rec = records(id);
  return `<div class="card col g12">${list ? `<select id="progSel" class="chip" style="align-self:flex-start;border:0;padding-right:10px;max-width:100%" aria-label="Exercise">${list.map(x => `<option value="${x.id}" ${x.id === id ? "selected" : ""}>${esc(x.n)}</option>`).join("")}</select>` : ""}
    <div class="col" style="gap:2px"><span class="sm mu">${ser.title}</span><div class="row" style="align-items:baseline;gap:10px;flex-wrap:wrap"><span class="d" style="font-size:48px;font-weight:800;line-height:1">${last ? nfmt(Math.round(last.v * 10) / 10) : "–"}<span style="font-size:22px;color:var(--mu)"> ${ser.unit.split(" ")[0]}</span></span>${delta}</div></div>
    <div class="row g6">${ranges.map(r => `<button class="chip s ${ui.range === r[0] ? "on" : ""}" data-a="range" data-v="${r[0]}">${r[1]}</button>`).join("")}</div>
    ${lineChart(pts, {lowerBetter:ser.lowerBetter, label:(e ? e.n : "") + " progress"})}
    ${rec.length ? `<div style="display:grid;grid-template-columns:repeat(${rec.length},minmax(0,1fr));gap:8px">${rec.map(r => `<div class="rec"><div class="xs mu">${r[0]}</div><b>${r[1]}</b></div>`).join("")}</div>` : ""}
    ${list ? `<button class="lk" data-a="exdetail" data-v="${id}" style="align-self:flex-start">Open ${esc(e ? e.n : "exercise")}${I.chevR({s:18})}</button>` : ""}</div>`;
}
function calendarCard(){
  const now = new Date(), cm = ui.calM ? new Date(ui.calM) : new Date(now.getFullYear(), now.getMonth(), 1);
  const y = cm.getFullYear(), mo = cm.getMonth(), first = new Date(y, mo, 1), dim = new Date(y, mo + 1, 0).getDate(), off = (first.getDay() + 6) % 7;
  const inMonth = S.ses.filter(s => { const d = new Date(s.st); return d.getFullYear() === y && d.getMonth() === mo; });
  const label = first.toLocaleDateString(undefined, {month:"long", year:"numeric"});
  let h = `<div class="card"><button class="coll" data-a="coll" data-v="cC" aria-expanded="${ui.cC}"><span class="col" style="gap:2px"><span class="h2" style="font-size:24px">Calendar</span><span class="sm mu">${label}: ${inMonth.length} workout${inMonth.length === 1 ? "" : "s"}</span></span>${I.chevD()}</button>`;
  if (ui.cC){
    const days = new Set(inMonth.map(s => new Date(s.st).getDate())), today = dayStart(Date.now());
    h += `<div class="row sb" style="margin:12px 0 8px"><button class="ib" data-a="calm" data-v="-1" aria-label="Previous month">${I.left()}</button><span class="b6">${label}</span><button class="ib" data-a="calm" data-v="1" aria-label="Next month">${I.right()}</button></div><div class="cal">${"MTWTFSS".split("").map(l => `<span class="h">${l}</span>`).join("")}`;
    for (let i = 0; i < off; i++) h += `<span></span>`;
    for (let d = 1; d <= dim; d++){ const ds = +new Date(y, mo, d); const cls = [days.has(d) ? "on" : "", ds === today ? "today" : "", ds > today ? "fut" : "", ui.calSel === ds ? "sel" : ""].join(" "); h += `<button class="${cls}" data-a="calday" data-v="${ds}" ${days.has(d) ? "" : "tabindex=\"-1\""}>${d}</button>`; }
    h += `</div>`;
    if (ui.calSel){ const list = S.ses.filter(s => dayStart(s.st) === ui.calSel); h += `<div class="col g8" style="margin-top:12px">${list.length ? list.map(s => sesCard(s, true)).join("") : `<span class="sm mu">No workout that day.</span>`}</div>`; }
  }
  return h + `</div>`;
}
function bwCard(full){
  const L = S.bw.slice().sort((a, b) => a.d - b.d), last = L[L.length - 1];
  const ref = L.find(x => x.d >= Date.now() - 30 * DAY);
  const df = last && ref && ref !== last ? toU(last.w - ref.w) : null;
  return `<div class="card col g10"><div class="row sb" style="align-items:baseline"><h2 class="h2" style="font-size:24px">Bodyweight</h2>${last ? `<span class="sm mu">${ago(last.d)}</span>` : ""}</div>
    ${last ? `<div class="row sb"><div><div class="d" style="font-size:40px;font-weight:800;line-height:1">${fw(last.w)}</div>${df !== null ? `<div class="sm mu" style="margin-top:4px">${df > 0 ? "+" : ""}${nfmt(Math.round(df * 10) / 10)} ${S.u} in 30 days</div>` : ""}</div></div>` : `<span class="sm mu">Log your weight now and then to see the trend.</span>`}
    <button class="btn g sm" data-a="prog" data-v="body">${last ? "Log or view weight" : "Log your weight"}</button></div>`;
}
function pExercises(){
  const q = ui.q.trim().toLowerCase();
  const list = S.ex.filter(e => !q || (e.n + " " + (MN[e.m] || "") + " " + (EN[e.eq] || "")).toLowerCase().includes(q)).sort((a, b) => a.n.localeCompare(b.n));
  let h = `<div class="col g10"><div class="row"><input id="exq" class="inp f1" placeholder="Search your exercises" value="${esc(ui.q)}" style="height:48px;font-size:16px" aria-label="Search your exercises"><button class="btn sm" data-a="newex" style="height:48px">${I.plus()}New</button></div>`;
  if (!S.ex.length) return h + `<div class="card empty">No exercises yet. Tap New to make your first one.</div></div>`;
  h += `<div class="list" id="exlist">` + (list.map(exRow).join("") || `<div class="li mu">No matches.</div>`) + `</div></div>`;
  return h;
}
function exRow(e){
  const L = lastRec(e.id);
  return `<button class="li" style="width:100%;text-align:left" data-a="exdetail" data-v="${e.id}"><span class="th1">${PH[e.id] ? `<img src="${PH[e.id]}" alt="">` : esc(e.n[0] || "?")}</span><span class="f1 col" style="min-width:0"><span class="b6">${esc(e.n)}</span><span class="sm mu">${[MN[e.m], EN[e.eq]].filter(Boolean).join(", ")}${L ? ". " + ago(L.s.st) : ""}</span></span>${I.chevR()}</button>`;
}
function sesCard(s, compact){
  const open = ui.hx === s.id, v = volOf(s);
  let h = `<div class="${compact ? "" : "card tight"}" style="${compact ? "background:var(--c2);border-radius:16px;padding:12px 14px" : ""}"><button class="coll" data-a="hx" data-v="${s.id}" aria-expanded="${open}"><span class="col" style="gap:2px;min-width:0"><span class="h3">${esc(s.n)}</span><span class="sm mu">${dstr(s.st)}, ${Math.max(1, Math.round(s.dur / 6e4))} min, ${setsOf(s)} sets${v ? ", " + Math.round(toU(v)).toLocaleString() + " " + S.u : ""}</span></span>${I.chevD()}</button>`;
  if (open){
    h += `<div class="col g10" style="margin-top:12px">` + s.ex.map(r => { const e = X(r.e), mode = e ? e.mode : "wr"; return `<div class="col g6"><span class="b6">${esc(exName(r.e, r.n))}</span><div class="row wrap g6" style="gap:6px">${r.sets.map(x => `<span class="hset ${x.wu ? "wu" : x.pr ? "p" : ""}">${x.wu ? "W " : ""}${fset(mode, x)}</span>`).join("")}</div></div>`; }).join("");
    h += `<button class="lk" style="color:var(--bad)" data-a="delses" data-v="${s.id}">${ui.cd === s.id ? "Tap again to delete this workout" : "Delete workout"}</button></div>`;
  }
  return h + `</div>`;
}
function pHistory(){
  if (!S.ses.length) return `<div class="card empty">Your finished workouts show up here.</div>`;
  let h = `<div class="col g10">`, lastM = "";
  for (const s of S.ses.slice(0, 200)){ const m = new Date(s.st).toLocaleDateString(undefined, {month:"long", year:"numeric"}); if (m !== lastM){ h += `<span class="lbl" style="margin:6px 4px 0">${m}</span>`; lastM = m; } h += sesCard(s); }
  return h + `</div>`;
}
function pBody(){
  const L = S.bw.slice().sort((a, b) => a.d - b.d), last = L[L.length - 1];
  const pts = L.filter(x => x.d >= Date.now() - 90 * DAY).map(x => ({t:x.d, v:toU(x.w)}));
  let h = `<div class="col g12"><div class="card col g12"><h2 class="h2" style="font-size:24px">Log bodyweight</h2><div class="row"><div class="stepper f1" style="justify-content:space-between"><button data-a="bwstep" data-v="-1" aria-label="Less">−</button><input id="bwi" inputmode="decimal" value="${last ? wv(last.w) : (S.u === "kg" ? 75 : 165)}" aria-label="Bodyweight in ${S.u}"><button data-a="bwstep" data-v="1" aria-label="More">+</button></div><button class="btn" data-a="bwlog">Log ${S.u}</button></div><span class="xs mu2">One entry per day. Logging again today replaces it.</span></div>`;
  if (pts.length) h += `<div class="card col g8"><div class="row sb"><span class="h2" style="font-size:24px">Last 90 days</span></div>${lineChart(pts, {label:"Bodyweight"})}</div>`;
  if (L.length) h += `<div class="list">` + L.slice().reverse().slice(0, 60).map(x => `<div class="li"><span class="f1 mu">${dstr(x.d)}</span><span class="b6">${fw(x.w)}</span><button class="ib" data-a="bwdel" data-v="${x.d}" aria-label="Delete entry">${I.close({s:18})}</button></div>`).join("") + `</div>`;
  return h + `</div>`;
}

/* ---------- pages ---------- */
const PAGES = {};
PAGES.settings = () => {
  const t = (k, title, sub) => `<div class="li"><span class="f1 col" style="gap:2px"><span class="b6">${title}</span><span class="sm mu">${sub}</span></span><button class="sw" role="switch" aria-checked="${!!S.set[k]}" aria-label="${title}" data-a="tog" data-v="${k}"></button></div>`;
  return hdr("Settings") + `<div class="col g20" style="margin-top:12px">
  <section class="col g8"><h2 class="lbl" style="margin:0 4px">Units</h2><div class="card" style="padding:6px;display:grid;grid-template-columns:1fr 1fr;gap:6px;border-radius:18px"><button class="btn sm ${S.u === "kg" ? "" : "g"}" style="${S.u === "kg" ? "" : "background:none"}" data-a="unit" data-v="kg" aria-pressed="${S.u === "kg"}">Kilograms</button><button class="btn sm ${S.u === "lb" ? "" : "g"}" style="${S.u === "lb" ? "" : "background:none"}" data-a="unit" data-v="lb" aria-pressed="${S.u === "lb"}">Pounds</button></div></section>
  <section class="col g8"><h2 class="lbl" style="margin:0 4px">During a workout</h2><div class="list">
    ${t("awake", "Keep screen on", "Your phone won't lock while a workout is running")}
    ${t("vib", "Vibration", "A tick on each set, a buzz on records")}
    ${t("wuStats", "Count warm-ups in stats", "Warm-ups never count towards records")}
    ${t("rpe", "Effort column (RPE)", "Rate how hard each set felt, 1 to 10")}
    ${t("rest", "Rest timer", "Countdown after each set you tick")}
    ${S.set.rest ? `<div class="li"><span class="f1 b6">Rest length</span><div class="stepper"><button data-a="rest" data-v="-15" aria-label="Shorter">−</button><span>${clockStr(S.set.restSec * 1000)}</span><button data-a="rest" data-v="15" aria-label="Longer">+</button></div></div>` : ""}
    <div class="li"><span class="f1 col" style="gap:2px"><span class="b6">Sets for a new exercise</span><span class="sm mu">Empty rows the first time you do it</span></span><div class="stepper"><button data-a="defsets" data-v="-1" aria-label="Fewer">−</button><span>${S.set.defSets}</span><button data-a="defsets" data-v="1" aria-label="More">+</button></div></div>
  </div></section>
  <section class="col g8"><h2 class="lbl" style="margin:0 4px">Exercises</h2><button class="cardlink" data-a="page" data-v="exlist"><span class="f1 col" style="gap:2px"><span class="b6">My exercises</span><span class="sm mu">${S.ex.length} exercise${S.ex.length === 1 ? "" : "s"}. Edit them or add new ones</span></span>${I.chevR()}</button></section>
  <section class="col g8"><h2 class="lbl" style="margin:0 4px">Backup</h2><div class="card col g12" style="border-radius:18px">
    <span>${S.lb ? `<span class="good">${I.check({s:18})}</span> Last backup ${ago(S.lb).toLowerCase()}` : "No backup yet"}</span>
    <span class="sm mu" style="line-height:1.5">Everything lives only on this phone. A backup file holds your workouts, days, exercises, photos and bodyweight.</span>
    <div class="grid2" style="gap:8px"><button class="btn sm" data-a="backup">Download backup</button><button class="btn g sm" data-a="restore">Restore from file</button></div>
    <div class="row"><span class="f1 col" style="gap:2px"><span class="b6">Remind me to back up</span><span class="sm mu">On Home, after 14 days without one</span></span><button class="sw" role="switch" aria-checked="${!!S.set.remind}" aria-label="Remind me to back up" data-a="tog" data-v="remind"></button></div></div></section>
  <section class="col g8"><h2 class="lbl" style="margin:0 4px">About</h2><div class="card col g8 sm mu" style="border-radius:18px;line-height:1.5"><span class="b6" style="font-size:16px;color:var(--tx)">Take Tren 2.0</span><span>Muscle map drawing from react-native-body-highlighter by Hicham El Abbassi, MIT licence.</span><span>Flexed arm logo based on Twemoji, CC-BY 4.0.</span><span>Fonts: Barlow Condensed and Inter, SIL Open Font Licence.</span></div></section>
  <button class="btn danger" data-a="erase">${ui.cd === "erase" ? "Tap again to erase everything" : "Erase all data"}</button></div>`;
};
PAGES.exlist = () => hdr("My exercises") + `<div style="margin-top:12px">${pExercises()}</div>`;
PAGES.exedit = p => {
  const d = p.d, chip = (on, a, v, l) => `<button class="chip ${on ? "on" : ""}" data-a="${a}" data-v="${v}" aria-pressed="${on}">${l}</button>`;
  const photo = d.photo === undefined ? PH[p.id] : d.photo;
  return hdr(p.id ? "Edit exercise" : "New exercise") + `<div class="col g20" style="margin-top:8px">
  <div class="row" style="align-items:flex-end;gap:12px"><button class="photo ${photo ? "has" : ""}" style="width:92px;height:92px;border-radius:20px;flex:none;font-size:12px;font-weight:600" data-a="photo" data-v="draft" aria-label="${photo ? "Change photo" : "Add photo"}">${photo ? `<img src="${photo}" alt="">` : I.camera({s:26}) + "Add photo"}</button>
  <label class="f1 col g6"><span class="lbl">Name</span><input class="inp" data-f="n" value="${esc(d.n)}" placeholder="e.g. Incline Dumbbell Press" autocomplete="off"></label></div>
  <div class="col g8"><span class="lbl">How it's logged</span>${MODES.map(m => `<button class="radio ${d.mode === m[0] ? "on" : ""}" data-a="emode" data-v="${m[0]}" role="radio" aria-checked="${d.mode === m[0]}"><span class="dot"></span><span class="col" style="gap:2px"><span class="b6">${m[1]}</span><span class="sm mu">${m[2]}</span></span></button>`).join("")}</div>
  <div class="col g10"><span class="lbl">Equipment</span><div class="chips">${EQUIP.map(q => chip(d.eq === q[0], "eeq", q[0], q[1])).join("")}</div></div>
  <div class="col g10"><span class="lbl">Main muscle${p.auto ? ` <span class="act" style="font-weight:500">picked from the name, tap to change</span>` : ""}</span><div class="chips">${MUSCLES.map(m => chip(d.m === m[0], "em", m[0], m[1])).join("")}</div></div>
  <div class="col g10"><span class="lbl">Also works (optional)</span><div class="chips">${MUSCLES.filter(m => m[0] !== d.m).map(m => `<button class="chip ${d.m2.includes(m[0]) ? "out" : "dash"}" data-a="em2" data-v="${m[0]}" aria-pressed="${d.m2.includes(m[0])}">${m[1]}</button>`).join("")}</div></div>
  <label class="col g6"><span class="lbl">Note (shows during every workout)</span><textarea class="inp" data-f="note" placeholder="Seat height, grip, cues…">${esc(d.note)}</textarea></label>
  ${p.id ? `<button class="btn danger" data-a="exdel">${ui.cd === "exdel" ? "Tap again to delete this exercise" : "Delete exercise"}</button><span class="xs mu2" style="margin-top:-12px;text-align:center">Past workouts keep their sets.</span>` : ""}
  </div>` + fbar(`<button class="btn f1" data-a="exsave">Save exercise</button>`);
};
PAGES.exdetail = p => {
  const e = X(p.id); if (!e) return hdr("") + `<div class="empty">This exercise was deleted.</div>`;
  const L = lastRec(e.id), rec = records(e.id), ser = metricSeries(e.id);
  const hist = [];
  for (const s of S.ses){ const r = s.ex.find(x => x.e === e.id); if (r) hist.push({s, r}); if (hist.length >= 30) break; }
  return hdr("", {right:`<button class="chip" data-a="exedit" data-v="${e.id}">${I.edit({s:16})}Edit</button>`}) + `<div class="col g16" style="margin-top:4px">
  <button class="photo ${PH[e.id] ? "has" : ""}" data-a="photo" data-v="${e.id}" aria-label="${PH[e.id] ? "Change photo" : "Add a photo"}">${PH[e.id] ? `<img src="${PH[e.id]}" alt="Photo of ${esc(e.n)}">` : I.camera({s:30}) + "Add your photo of the exercise or machine"}</button>
  <div class="col g10"><h1 class="h1">${esc(e.n)}</h1><div class="chips" style="gap:6px">${e.m ? `<span class="chip s on">${MN[e.m]}</span>` : ""}${(e.m2 || []).map(k => `<span class="chip s" style="background:var(--tint2);color:var(--ac2)">${MN[k]}</span>`).join("")}<span class="chip s">${EN[e.eq] || "Other"}</span><span class="chip s">${MODEN[e.mode]}</span></div>${e.note ? `<div class="note">${I.note()}<span>${esc(e.note)}</span></div>` : ""}</div>
  ${rec.length ? `<div style="display:grid;grid-template-columns:repeat(${rec.length},minmax(0,1fr));gap:8px">${rec.map(r => `<div class="rec" style="background:var(--c1)"><div class="xs mu">${r[0]}</div><b>${r[1]}</b></div>`).join("")}</div>` : ""}
  ${ser.pts.length > 1 ? `<section class="card col g8"><h2 class="h2" style="font-size:24px">${ser.title}</h2>${lineChart(ser.pts, {lowerBetter:ser.lowerBetter, label:ser.title})}</section>` : ""}
  <section class="col g8"><h2 class="h2" style="font-size:24px">History</h2>${hist.length ? hist.map(({s, r}) => `<div class="card tight col g6" style="border-radius:16px"><div class="row sb sm mu"><span>${dstr(s.st)}</span><span>${esc(s.n)}</span></div><div class="row wrap" style="gap:6px">${r.sets.map(x => `<span class="hset ${x.wu ? "wu" : x.pr ? "p" : ""}">${x.wu ? "W " : ""}${fset(e.mode, x)}</span>`).join("")}</div></div>`).join("") : `<span class="sm mu">Nothing logged yet.</span>`}</section></div>`;
};
PAGES.day = p => {
  const d = p.d;
  let h = hdr(p.id ? "Edit day" : "New day") + `<div class="col g16" style="margin-top:8px"><label class="col g6"><span class="lbl">Day name</span><input class="inp" data-f="n" value="${esc(d.n)}" placeholder="e.g. Chest, Legs, Push" style="font:700 26px var(--d);height:56px" autocomplete="off"></label>
  <div class="row sb" style="align-items:baseline"><h2 class="h2" style="font-size:24px">Exercises</h2><span class="sm mu">${d.items.length}</span></div><div class="col g8" id="dlist">`;
  d.items.forEach((it, i) => {
    const e = X(it.e), L = lastRec(it.e), ss = it.g && ((d.items[i - 1] || {}).g === it.g || (d.items[i + 1] || {}).g === it.g);
    const sub = L ? "Last time: " + L.r.sets.filter(s => !s.wu).length + " sets" + (isW(e ? e.mode : "") ? ", top " + fset(e.mode, L.r.sets.filter(s => !s.wu).reduce((a, b) => b.w > a.w ? b : a, L.r.sets.filter(s => !s.wu)[0] || L.r.sets[0]), true) : "") : "New, starts with " + S.set.defSets + " empty sets";
    h += `<div class="ditem" data-i="${i}" style="background:${ss ? "#17131f" : "var(--c1)"};border-radius:16px;min-height:66px;display:flex;align-items:center;gap:2px;padding:0 4px 0 2px;${ss ? "box-shadow:inset 0 0 0 1.5px var(--acline)" : ""}"><button class="ib drag" data-grip="${i}" aria-label="Drag to reorder ${esc(e ? e.n : "")}" style="color:#71717a">${I.grip()}</button><span class="f1 col" style="min-width:0;padding:8px 0"><span class="h3">${esc(e ? e.n : "Deleted exercise")}</span><span class="sm mu">${ss ? `<span class="act">Superset.</span> ` : ""}${sub}</span></span><button class="ib" data-a="ditem" data-i="${i}" aria-label="Options">${I.more()}</button></div>`;
  });
  h += `</div><button class="btn dash w" data-a="daddex">${I.plus()}Add exercise</button><p class="sm mu2" style="margin:0;line-height:1.5">Drag the dots to reorder. The ⋮ menu links an exercise with the next one as a superset, swaps it, or removes it.</p></div>`;
  return h + fbar(`${p.id ? `<button class="btn danger f1" data-a="ddel">${ui.cd === "ddel" ? "Tap again" : "Delete day"}</button>` : ""}<button class="btn" style="flex:1.6" data-a="dsave">Save</button>`);
};

/* ---------- sheets ---------- */
function renderSheet(){
  const el = $("#sheet"), s = ui.sheet;
  if (!s){ el.classList.add("hidden"); el.innerHTML = ""; return; }
  el.classList.remove("hidden");
  el.innerHTML = `<div class="sc" role="dialog" aria-modal="true"><div class="grab" data-a="closesheet"></div>${SHEETS[s.k](s)}</div>`;
  const f = el.querySelector("[data-autofocus]"); if (f) setTimeout(() => f.focus(), 50);
}
const SHEETS = {};
const mi = (a, icon, label, attrs = "", style = "") => `<button class="mi" data-a="${a}" ${attrs} style="${style}">${icon}${label}</button>`;
SHEETS.picker = s => {
  const q = s.q.trim().toLowerCase();
  const recent = new Map(); S.ses.forEach((x, i) => x.ex.forEach(r => { if (!recent.has(r.e)) recent.set(r.e, i); }));
  const list = S.ex.filter(e => !q || (e.n + " " + (MN[e.m] || "")).toLowerCase().includes(q)).sort((a, b) => (recent.get(a.id) ?? 1e9) - (recent.get(b.id) ?? 1e9) || a.n.localeCompare(b.n));
  return `<div class="row sb"><h2 class="h2">${s.single ? "Choose exercise" : "Add exercises"}</h2><button class="lk" data-a="pnew">${I.plus()}New</button></div>
  <input id="pq" class="inp" placeholder="Search your exercises" value="${esc(s.q)}" style="height:48px;font-size:16px;margin:10px 0" aria-label="Search">
  <div class="scroll" id="plist" style="min-height:140px">${pickList(list, s)}</div>
  <button class="btn w" data-a="pdone" id="pdone" style="margin-top:10px" ${s.sel.length ? "" : "disabled"}>${s.single ? "Choose" : "Add"}${s.sel.length && !s.single ? " (" + s.sel.length + ")" : ""}</button>`;
};
function pickList(list, s){
  if (!S.ex.length) return `<div class="empty">You haven't made any exercises yet.<br><br><button class="btn sm" data-a="pnew">${I.plus()}Make one</button></div>`;
  return list.map(e => `<button class="pick ${s.sel.includes(e.id) ? "on" : ""}" data-a="pk" data-v="${e.id}" aria-pressed="${s.sel.includes(e.id)}"><span class="th1">${PH[e.id] ? `<img src="${PH[e.id]}" alt="">` : esc(e.n[0] || "?")}</span><span class="f1 col" style="min-width:0"><span class="b6">${esc(e.n)}</span><span class="sm mu">${[MN[e.m], EN[e.eq]].filter(Boolean).join(", ")}</span></span></button>`).join("") || `<div class="empty">No matches.</div>`;
}
SHEETS.exmenu = s => {
  const a = S.act, r = a.ex[s.i], e = X(r.e), g = r.g, inSS = g && a.ex.some((x, k) => k !== s.i && x.g === g);
  return `<h2 class="h2" style="margin:0 6px 8px">${esc(e ? e.n : r.n)}</h2>
  ${e ? mi("exdetail", I.info(), "Details, records and history", `data-v="${e.id}"`) : ""}
  ${mi("wreplace", I.swap(), "Replace with another exercise", `data-i="${s.i}"`)}
  ${s.i > 0 ? mi("wmove", I.up(), "Move up", `data-i="${s.i}" data-v="-1"`) : ""}
  ${s.i < a.ex.length - 1 ? mi("wmove", I.down(), "Move down", `data-i="${s.i}" data-v="1"`) : ""}
  ${inSS ? mi("wunlink", I.unlink(), "Remove from superset", `data-i="${s.i}"`) : s.i < a.ex.length - 1 ? mi("wlink", I.link({s:22}), "Superset with the next exercise", `data-i="${s.i}"`) : ""}
  ${mi("wremove", I.trash(), "Remove from this workout", `data-i="${s.i}"`, "color:var(--bad)")}`;
};
SHEETS.daymenu = s => {
  const d = S.days.find(x => x.id === s.id); if (!d) return "";
  return `<h2 class="h2" style="margin:0 6px 4px">${esc(d.n)}</h2><p class="sm mu" style="margin:0 6px 10px">${d.items.map(it => esc(exName(it.e))).join(", ") || "No exercises yet"}</p>
  ${mi("startday", I.play({s:22}), "Start workout", `data-v="${d.id}"`)}${mi("dayedit", I.edit({s:22}), "Edit day", `data-v="${d.id}"`)}${mi("dayup", I.up(), "Move earlier in the list", `data-v="${d.id}"`)}`;
};
SHEETS.ditem = s => {
  const p = ui.stack[ui.stack.length - 1], d = p.d, it = d.items[s.i], linked = it.g && d.items.some((x, k) => k !== s.i && x.g === it.g);
  return `<h2 class="h2" style="margin:0 6px 8px">${esc(exName(it.e))}</h2>
  ${linked ? mi("dunlink", I.unlink(), "Remove from superset", `data-i="${s.i}"`) : s.i < d.items.length - 1 ? mi("dlink", I.link({s:22}), "Superset with the next exercise", `data-i="${s.i}"`) : ""}
  ${mi("dreplace", I.swap(), "Replace with another exercise", `data-i="${s.i}"`)}${mi("exdetail", I.info(), "Exercise details", `data-v="${it.e}"`)}${mi("dremove", I.trash(), "Remove from day", `data-i="${s.i}"`, "color:var(--bad)")}`;
};
SHEETS.confirm = s => `<h2 class="h2" style="margin:4px 6px 6px">${s.title}</h2><p class="mu" style="margin:0 6px 16px;line-height:1.5">${s.body}</p><div class="col g8">${s.btns.map(b => `<button class="btn ${b.g ? "g" : ""} ${b.danger ? "danger" : ""}" data-a="${b.a}" ${b.v ? `data-v="${b.v}"` : ""}>${b.l}</button>`).join("")}</div>`;
SHEETS.finish = s => {
  const a = S.act, open = a.ex.reduce((n, r) => n + r.sets.filter(x => !x.done).length, 0), done = a.ex.reduce((n, r) => n + r.sets.filter(x => x.done).length, 0);
  const day = S.days.find(d => d.id === a.day);
  const changed = day && JSON.stringify(day.items.map(i => [i.e, i.g || null])) !== JSON.stringify(a.ex.map(r => [r.e, r.g || null]));
  return `<h2 class="h2" style="margin:4px 6px 6px">Finish workout?</h2><p class="mu" style="margin:0 6px 14px;line-height:1.5">${done ? `${done} set${done === 1 ? "" : "s"} done${open ? `. ${open} unticked set${open === 1 ? "" : "s"} won't be saved.` : "."}` : "You haven't ticked any sets yet, so there's nothing to save."}</p>
  ${changed ? `<div class="card row" style="margin-bottom:12px;border-radius:16px;padding:12px 14px"><span class="f1 col" style="gap:2px"><span class="b6">Update ${esc(day.n)}</span><span class="sm mu">Save today's exercise list to the day</span></span><button class="sw" role="switch" aria-checked="${!!s.upd}" data-a="finupd" aria-label="Update day"></button></div>` : ""}
  <div class="col g8">${done ? `<button class="btn" data-a="finyes">Finish workout</button>` : ""}<button class="btn g" data-a="closesheet">Keep going</button><button class="btn danger" data-a="discard">${ui.cd === "discard" ? "Tap again to discard" : "Discard workout"}</button></div>`;
};
SHEETS.summary = s => {
  const x = S.ses.find(y => y.id === s.sid); if (!x) return "";
  const p = S.ses.find(y => y.id !== x.id && y.st < x.st && ((x.day && y.day === x.day) || (!x.day && y.n === x.n)));
  const mins = t => Math.max(1, Math.round(t.dur / 6e4)), v = volOf(x);
  const dd = (a, b, u) => { if (!p) return ""; const d = a - b; return `<div class="xs ${d > 0 ? "good b6" : "mu"}">${d === 0 ? "Same as last time" : (d > 0 ? "+" : "") + d + u + " vs last"}</div>`; };
  const dv = () => { if (!p || !v) return ""; const b = volOf(p); if (!b) return ""; const c = Math.round((v - b) / b * 100); return `<div class="xs ${c > 0 ? "good b6" : "mu"}">${c === 0 ? "Same as last time" : (c > 0 ? "+" : "") + c + "% vs last"}</div>`; };
  const prs = x.ex.flatMap(r => r.sets.filter(y => y.pr).map(y => [exName(r.e, r.n), y.pr]));
  const ms = Object.entries(muscleSets(x.st, x.st + 1)).sort((a, b) => b[1] - a[1]);
  return `<div class="scroll"><div class="row sb"><span class="sm act b7">Workout complete</span><button class="ib" data-a="closesheet" aria-label="Close">${I.close()}</button></div>
  <div class="d" style="font-size:52px;font-weight:800;line-height:1">${esc(x.n)}</div><div class="mu sm" style="margin-top:6px">${dstr(x.st)}, ${tstr(x.st)} to ${tstr(x.st + x.dur)}</div>${prs.length ? `<img src="img/pr.jpg" alt="Celebrating a new record" style="width:100%;height:auto;border-radius:18px;display:block;margin-top:14px">` : ""}
  <div class="grid2" style="gap:10px;margin:14px 0"><div class="stat"><div class="sm mu">Time</div><b>${mins(x)} min</b>${dd(mins(x), p ? mins(p) : 0, " min")}</div><div class="stat"><div class="sm mu">Volume</div><b>${v ? Math.round(toU(v)).toLocaleString() : "–"}${v ? `<span style="font-size:20px"> ${S.u}</span>` : ""}</b>${dv()}</div><div class="stat"><div class="sm mu">Working sets</div><b>${setsOf(x)}</b>${dd(setsOf(x), p ? setsOf(p) : 0, "")}</div><div class="stat"><div class="sm mu">Exercises</div><b>${x.ex.length}</b></div></div>
  ${prs.length ? `<div class="pr" style="flex-direction:column;align-items:stretch;gap:8px;margin-bottom:12px"><div class="row gold">${I.trophy({s:22})}<span class="h3">${prs.length} new record${prs.length === 1 ? "" : "s"}</span></div>${prs.map(r => `<div class="row sb sm"><span class="b6">${esc(r[0])}</span><span style="color:#e4e4e7;text-align:right">${esc(r[1])}</span></div>`).join("")}</div>` : ""}
  ${ms.length ? `<div class="col g8"><span class="lbl">Muscles worked</span><div class="chips" style="gap:6px">${ms.map(([k, n], i) => `<span class="chip s ${i === 0 ? "on" : ""}" style="${i ? "background:var(--tint2);color:var(--ac2)" : ""}">${MN[k]}, ${nfmt(n)}</span>`).join("")}</div></div>` : ""}
  <p class="sm mu">${p ? "Compared with your last " + esc(x.n) + ", " + ago(p.st).toLowerCase() + "." : "First time logging this, so next time you'll see a comparison."}</p></div>
  <div class="row" style="margin-top:10px"><button class="btn g f1" data-a="share" data-v="${x.id}">${I.share({s:20})}Share</button><button class="btn" style="flex:1.4" data-a="closesheet">Done</button></div>`;
};

/* ---------- after render ---------- */
function afterRender(){
  const pq = $("#progSel"); if (pq) pq.onchange = () => { ui.progEx = pq.value; render(); };
}
