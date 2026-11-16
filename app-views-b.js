/* 베이스라인 · 화면 B: 프로그램, 진행, 도감, 설정 */
(function (BL) {
  'use strict';
  const { S, esc, n0, n1, fmtD, fmtShort, activeSession, activeProgram, todayMetric, lineChart, barChart, figure, miniFigs, rxText } = BL;
  const E = BL.engine, X = BL.X;

  // ───────── 프로그램 ─────────
  BL.views.program = function () {
    const prog = activeProgram(); const P = S.profile;
    const out = [BL.subnav('프로그램', P ? '<button class="btn sm primary" data-act="wizard">새 프로그램 만들기</button>' : '<button class="btn sm primary" data-act="go" data-v="profile">먼저 프로필 만들기</button>'), BL.notes.loadingNote()];
    if (!prog) { out.push(`<div class="empty"><div>프로그램이 없어요.</div><div class="xs">목표, 주당 일수, 장비, 아픈 곳을 입력하면 분할과 운동, 세트·회수·휴식까지 짜 드려요.</div></div>`); return out.join(''); }
    const wi = E.weekInfo(prog); const rd = E.readiness(todayMetric());
    out.push(`<div class="card"><div class="card-h"><div><div class="eyebrow">${esc(BL.GOALS[prog.goal]?.n || prog.goal)} · 주 ${prog.daysPerWeek}일 · ${prog.sessionMinutes}분</div><h2>${esc(prog.name)}</h2><div class="small muted">${fmtShort(prog.startDate)} 시작 · ${wi.week}주차 (주기 ${wi.inCycle}/${prog.weeks || 4})${wi.deload ? ' · <span class="tag warn">디로드 주</span>' : ''}${wi.intro ? ' · <span class="tag acc">첫 주: 세트 -1</span>' : ''}</div></div><div class="row"><button class="btn sm" data-act="program-rename" data-id="${prog.id}">이름</button><button class="btn sm" data-act="program-restart" data-id="${prog.id}">1주차부터 다시</button></div></div>
      <div class="stack-s">${prog.days.map((d, di) => programDay(prog, d, di, wi, rd)).join('')}</div></div>`);
    out.push(`<div class="card"><div class="card-h"><h2>왜 이렇게 짰나</h2></div><ol class="rationale">${(prog.rationale || []).map(r => `<li>${esc(r)}</li>`).join('')}</ol></div>`);
    const others = S.programs.filter(p => p.id !== prog.id).sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    if (others.length) out.push(`<div class="card"><div class="card-h"><h2>다른 프로그램</h2></div><div class="slist">${others.map(p => `<div class="srow" style="cursor:default"><span class="dt">${fmtShort((p.createdAt || '').slice(0, 10))}</span><span><span class="ti">${esc(p.name)}</span><span class="me">${esc(BL.GOALS[p.goal]?.n || '')} · 주 ${p.daysPerWeek}일</span></span><span class="row"><button class="btn sm" data-act="program-activate" data-id="${p.id}">사용</button><button class="btn sm danger" data-act="program-delete" data-id="${p.id}">삭제</button></span></div>`).join('')}</div></div>`);
    return out.join('');
  };
  function programDay(prog, d, di, wi, rd) {
    const open = !!S.ui.openDays[d.id];
    const body = !open ? '' : `<div class="pday-b">${d.blocks.map((b, bi) => `<div class="pblock"><div class="bh">${b.super ? `<span class="lbl soft">${String.fromCharCode(65 + bi)}</span> 번갈아 (슈퍼세트)` : `<span class="lbl soft">${String.fromCharCode(65 + bi)}</span>`}</div>${b.items.map((it, ii) => { const x = X[it.exId]; if (!x) return ''; const adj = E.adjustItem(it, wi, rd); return `<div class="pitem"><span class="xs muted num">${String.fromCharCode(65 + bi)}${b.items.length > 1 ? ii + 1 : ''}</span><button class="nm" data-act="ex-info" data-ex="${x.id}">${esc(x.n)}${it.opt ? ' <span class="tag">선택</span>' : ''}</button><span class="rx">${rxText(adj)}${adj.tags.length ? ` <span class="tag">${adj.tags.join('·')}</span>` : ''}${it.rest ? ` · 휴식 ${it.rest}s` : ''}</span><span class="row" style="gap:3px"><button class="btn sm ghost" data-act="item-edit" data-pid="${prog.id}" data-did="${d.id}" data-iid="${it.id}">수정</button><button class="btn sm ghost" data-act="item-swap" data-pid="${prog.id}" data-did="${d.id}" data-iid="${it.id}">교체</button></span></div>`; }).join('')}</div>`).join('')}<div class="row"><button class="btn primary sm" data-act="start-day" data-i="${di}">이 운동 시작</button><button class="btn sm" data-act="item-add" data-pid="${prog.id}" data-did="${d.id}">+ 운동 추가</button></div></div>`;
    return `<div class="pday"><button class="pday-h" data-act="day-toggle" data-id="${d.id}" aria-expanded="${open}"><span class="dn">${di + 1}</span><span><b>${esc(d.name)}</b><div class="fo">${esc(d.focus)} · ${d.blocks.reduce((a, b) => a + b.items.length, 0)}개 운동</div></span><span class="est">약 ${d.est || E.estimateDay(d)}분 ${open ? '▴' : '▾'}</span></button>${body}</div>`;
  }

  // 프로그램 마법사
  BL.wizardHtml = function (w) {
    const steps = w.onboard ? ['기본 정보', '목표', '일정', '장비·제약', '미리보기'] : ['목표', '일정', '장비·제약', '미리보기'];
    const off = w.onboard ? 1 : 0; const st = w.step - off;
    const head = `<div class="wizard-steps">${steps.map((s, i) => `<span class="${w.step === i ? 'on' : ''}">${i + 1}. ${s}</span>`).join('<span>›</span>')}</div>`;
    let body = '';
    if (w.onboard && w.step === 0) body = `<div class="onb-hero"><h2>반가워요. 몇 가지만 알려 주세요</h2><p class="muted">무게 제안과 부하 계산의 기준이 돼요. 나중에 설정에서 바꿀 수 있어요.</p></div><div class="fgrid"><div class="field"><label for="ob-name">이름 (선택)</label><input class="inp" id="ob-name" data-wz="name" value="${BL.esc(w.name || '')}" placeholder="신준"></div><div class="field"><label for="ob-age">나이</label><input class="inp" id="ob-age" data-wz="age" type="number" inputmode="numeric" value="${w.age ?? ''}" placeholder="23"></div><div class="field"><label for="ob-h">키 (cm)</label><input class="inp" id="ob-h" data-wz="heightCm" type="number" inputmode="decimal" value="${w.heightCm ?? ''}" placeholder="175"></div><div class="field"><label for="ob-w">몸무게 (kg)</label><input class="inp" id="ob-w" data-wz="weightKg" type="number" inputmode="decimal" step="0.1" value="${w.weightKg ?? ''}" placeholder="70"></div></div><div class="field"><span class="flabel">근력 운동 요일</span><div class="dayboxes">${[1, 2, 3, 4, 5, 6, 0].map(d => `<label><input type="checkbox" data-wz-day="trainDays" value="${d}" ${(w.trainDays || []).includes(d) ? 'checked' : ''}>${BL.WEEKDAYS[d]}</label>`).join('')}</div></div><div class="field"><span class="flabel">테니스 요일</span><div class="dayboxes">${[1, 2, 3, 4, 5, 6, 0].map(d => `<label><input type="checkbox" data-wz-day="tennisWeekdays" value="${d}" ${(w.tennisWeekdays || []).includes(d) ? 'checked' : ''}>${BL.WEEKDAYS[d]}</label>`).join('')}</div></div>`;
    else if (st === 0) body = `<div class="opt-grid">${Object.entries(BL.GOALS).map(([k, g]) => `<button class="opt ${w.goal === k ? 'on' : ''}" data-act="wz-set" data-k="goal" data-v="${k}"><b>${g.n}</b><span>${g.d}</span></button>`).join('')}</div>
      <div class="field"><span class="flabel">근력 운동 경험</span><div class="opt-grid">${Object.entries(BL.LEVELS).map(([k, n]) => `<button class="opt ${w.level == k ? 'on' : ''}" data-act="wz-set" data-k="level" data-v="${k}"><b>${n.split(' (')[0]}</b><span>${n.split(' (')[1]?.replace(')', '') || ''}</span></button>`).join('')}</div></div>`;
    else if (st === 1) body = `<div class="field"><span class="flabel">주당 근력 운동 일수</span><div class="seg">${[2, 3, 4, 5, 6].map(n => `<button class="${w.daysPerWeek === n ? 'on' : ''}" data-act="wz-set" data-k="daysPerWeek" data-v="${n}">${n}일</button>`).join('')}</div></div>
      <div class="field"><span class="flabel">한 세션 시간</span><div class="seg">${[30, 45, 60, 75, 90].map(n => `<button class="${w.sessionMinutes === n ? 'on' : ''}" data-act="wz-set" data-k="sessionMinutes" data-v="${n}">${n}분</button>`).join('')}</div></div>
      <div class="field"><span class="flabel">테니스(또는 다른 종목) 주당 일수</span><div class="seg">${[0, 1, 2, 3, 4, 5].map(n => `<button class="${w.tennisDays === n ? 'on' : ''}" data-act="wz-set" data-k="tennisDays" data-v="${n}">${n}일</button>`).join('')}</div><span class="xs muted">테니스를 많이 칠수록 근력 볼륨을 보수적으로 잡고, 하체 파워 날은 코트 가는 날과 떨어뜨려요.</span></div>
      <div class="field"><span class="flabel">약점·우선순위 (최대 3개)</span><div class="chips">${Object.entries(BL.WEAK).map(([k, v]) => `<button class="chip ${w.weakPoints.includes(k) ? 'on' : ''}" data-act="wz-toggle" data-k="weakPoints" data-v="${k}">${v.n}</button>`).join('')}</div></div>`;
    else if (st === 2) body = `<div class="field"><span class="flabel">쓸 수 있는 장비 (맨몸은 항상 포함)</span><div class="chips">${Object.entries(BL.EQUIP).map(([k, v]) => `<button class="chip ${w.equipment.includes(k) ? 'on' : ''}" data-act="wz-toggle" data-k="equipment" data-v="${k}">${v}</button>`).join('')}</div><div class="row" style="margin-top:4px"><button class="btn sm ghost" data-act="wz-equip-preset" data-p="gym">헬스장 전부</button><button class="btn sm ghost" data-act="wz-equip-preset" data-p="home">집 (덤벨·밴드)</button><button class="btn sm ghost" data-act="wz-equip-preset" data-p="none">맨몸만</button></div></div>
      <div class="field"><span class="flabel">지금 아픈 곳 (해당 동작을 뺍니다)</span><div class="chips">${Object.entries(BL.RESTRICTIONS).map(([k, v]) => `<button class="chip ${w.restrictions.includes(k) ? 'on' : ''}" data-act="wz-toggle" data-k="restrictions" data-v="${k}">${v.n}</button>`).join('')}</div>${w.restrictions.length ? `<div class="xs muted">${w.restrictions.map(k => BL.RESTRICTIONS[k].note).join(' ')}</div>` : ''}</div>`;
    else if (st === 3) {
      const p = w.preview;
      body = p ? `<div class="stack-s"><div class="row between"><div><b>${esc(p.name)}</b><div class="xs muted">${p.days.map(d => `${d.name} (${d.est}분)`).join(' · ')}</div></div><button class="btn sm" data-act="wz-regen">다른 조합</button></div>
        ${p.days.map((d, di) => `<div class="pblock"><div class="bh"><span class="lbl soft">${di + 1}</span>${esc(d.name)} <span class="muted">· ${esc(d.focus)}</span></div>${d.blocks.map(b => b.items.map(it => { const x = X[it.exId]; return `<div class="pitem" style="grid-template-columns:minmax(0,1fr) auto"><span>${esc(x.n)}${b.super ? ' <span class="tag">짝</span>' : ''}${it.opt ? ' <span class="tag">선택</span>' : ''}</span><span class="rx">${rxText(it)}</span></div>`; }).join('')).join('')}</div>`).join('')}
        <ol class="rationale">${p.rationale.map(r => `<li>${esc(r)}</li>`).join('')}</ol></div>` : '<p>생성 중…</p>';
    }
    const nav = `<div class="row between"><button class="btn ghost" data-act="wz-step" data-d="-1" ${w.step === 0 ? 'disabled' : ''}>이전</button>${st < 3 ? `<button class="btn primary" data-act="wz-step" data-d="1">다음 ${BL.ico('right')}</button>` : `<button class="btn primary" data-act="wz-apply">${BL.ico('check')} 이 프로그램 사용</button>`}</div>`;
    return `${BL.sheetHead(w.onboard ? '시작하기' : '프로그램 만들기', '답에 맞춰 분할·운동·세트를 짜고 이유를 설명해요')}${head}${body}${nav}`;
  };

  // ───────── 진행 ─────────
  BL.views.progress = function () {
    const prog = activeProgram(); const range = S.ui.range; const t = E.today();
    const out = [BL.subnav('진행', `<div class="seg">${[[4, '4주'], [12, '12주'], [52, '1년']].map(([k, n]) => `<button class="${range === k ? 'on' : ''}" data-act="range" data-r="${k}">${n}</button>`).join('')}</div>`), BL.notes.loadingNote()];
    const done = E.doneSessions(S.sessions);
    if (!done.length) { out.push(`<div class="empty"><div>아직 그래프를 그릴 기록이 없어요.</div><div class="xs">세션을 2~3개 쌓으면 주간 부하, 추정 1RM, 근육별 세트 수가 여기에 나타나요.</div><button class="btn primary" data-act="go" data-v="train">운동 시작</button></div>`); }
    // KPI
    const wl = E.weeklyLoads(S.sessions, range); const a = E.acwr(S.sessions); const mono = E.monotony(S.sessions);
    const cur = wl[wl.length - 1]; const prev = wl[wl.length - 2] || { total: 0 };
    const nStrength = done.filter(s => s.type === 'strength' && s.date >= E.addDays(t, -range * 7)).length;
    const prs = E.prTable(S.sessions); const prCount = Object.values(prs).filter(p => p.e1rm > 0).length;
    out.push(`<div class="kpis"><div class="kpi"><div class="k">기간 내 근력 세션</div><div class="v">${nStrength}</div><div class="d">${range}주 기준</div></div><div class="kpi"><div class="k">이번 주 부하</div><div class="v">${n0(cur.total)}</div><div class="d">${prev.total ? `지난주 대비 ${cur.total >= prev.total ? '+' : ''}${n0((cur.total - prev.total) / prev.total * 100)}%` : '–'}</div></div><div class="kpi"><div class="k">ACWR</div><div class="v">${a.ratio != null && a.status !== 'insufficient' ? a.ratio.toFixed(2) : '–'}</div><div class="d">${{ none: '–', insufficient: `${a.days}일째, 21일부터 계산`, low: '0.8 미만: 부하 낮음', ok: '0.8~1.3 적정', caution: '1.3~1.5 주의', danger: '1.5 초과 위험' }[a.status]}${mono && mono.monotony > 2 ? ' · 단조로움 높음' : ''}</div></div><div class="kpi"><div class="k">기록 있는 운동</div><div class="v">${prCount}</div><div class="d">e1RM 추적 중</div></div></div>`);
    if (done.length) {
      // 주간 부하
      const xs = wl.map(w => fmtShort(w.weekStart)); const xFull = wl.map(w => `${w.weekStart} 주`);
      out.push(`<div class="card">${barChart({ id: 'load', title: '주간 훈련 부하', sub: '세션 RPE × 분. 근력·테니스·유산소를 합쳐 몸이 받은 총량', xs, xFull, xName: '주', series: [{ name: '근력', cls: 1, ys: wl.map(w => w.strength) }, { name: '테니스', cls: 2, ys: wl.map(w => w.tennis) }, { name: '유산소', cls: 3, ys: wl.map(w => w.cond) }] })}</div>`);
      // ACWR 추이
      const days = Array.from({ length: Math.min(range * 7, 84) }, (_, i) => E.addDays(t, -(Math.min(range * 7, 84) - 1 - i)));
      const ratios = days.map(d => { const r = E.acwr(S.sessions, d); return r.status === 'insufficient' || r.ratio == null ? null : +r.ratio.toFixed(2); });
      if (ratios.some(v => v != null)) out.push(`<div class="card">${lineChart({ id: 'acwr', title: '급성:만성 부하비 (ACWR)', sub: '최근 7일 부하 ÷ 최근 28일 주평균. 초록 띠(0.8~1.3)가 부상 위험이 낮은 구간', xs: days.map(d => fmtShort(d)), xFull: days, xName: '날짜', series: [{ name: 'ACWR', cls: 1, ys: ratios }], yMin: 0, yMax: Math.max(2, ...ratios.filter(v => v != null)), band: { lo: 0.8, hi: 1.3 }, fmt: v => v.toFixed(1), endLabels: true })}</div>`);
      else out.push(`<div class="card"><h3>급성:만성 부하비 (ACWR)</h3><p class="small muted" style="margin-top:6px">${a.days}일째 데이터를 모으는 중이에요. 21일이 지나면 최근 7일 부하 ÷ 28일 평균을 그려요. 이 비율이 1.5를 넘는 주에 부상이 집중된다는 연구가 많아요.</p></div>`);
      // e1RM
      const exIds = Object.keys(prs).filter(k => X[k] && prs[k].e1rm > 0).sort((p, q) => X[p].n.localeCompare(X[q].n, 'ko'));
      if (exIds.length) {
        const exId = S.ui.progEx && exIds.includes(S.ui.progEx) ? S.ui.progEx : exIds[0]; const ser = E.e1rmSeries(S.sessions, exId).filter(p => p.date >= E.addDays(t, -range * 7));
        out.push(`<div class="card"><div class="row between" style="margin-bottom:8px"><h2>추정 1RM</h2><select class="inp sm" data-act="prog-ex" aria-label="운동 선택">${exIds.map(k => `<option value="${k}" ${k === exId ? 'selected' : ''}>${esc(X[k].n)}</option>`).join('')}</select></div>${ser.length ? lineChart({ id: 'e1rm', title: X[exId].n, sub: `최고 세트에서 Epley 공식(무게 × (1 + 유효 반복/30))으로 추정. 최고 ${n1(prs[exId].e1rm)}kg (${prs[exId].w}×${prs[exId].r}, ${fmtShort(prs[exId].date)})`, xs: ser.map(p => fmtShort(p.date)), xFull: ser.map(p => p.date), xName: '날짜', series: [{ name: 'e1RM', cls: 1, ys: ser.map(p => +p.e1rm.toFixed(1)) }], fmt: v => n1(v) + 'kg', endLabels: true, area: true }) : '<p class="small muted">기간 내 기록이 없어요.</p>'}</div>`);
      }
      // 근육 히트맵 + 볼륨
      const hw = S.ui.heatWeek; const ws = E.addDays(E.weekStart(t), -7 * hw), we = E.addDays(ws, 6);
      const heat = E.muscleHeat(S.sessions, ws, we); const gv = E.groupVolume(S.sessions, ws, we); const band = BL.VOLUME_BAND[prog ? prog.goal : 'general'];
      const maxV = Math.max(20, ...Object.values(gv));
      out.push(`<div class="card"><div class="card-h"><div><h2>근육별 주간 세트</h2><div class="small muted">주동근 1, 보조근 0.5로 센다. 초록 띠는 목표 기준 권장 범위</div></div><div class="seg">${[[0, '이번 주'], [1, '지난주'], [2, '2주 전']].map(([k, n]) => `<button class="${hw === k ? 'on' : ''}" data-act="heat-week" data-w="${k}">${n}</button>`).join('')}</div></div>
        <div class="heat-wrap"><div><div class="figs">${figure('f', { heat })}${figure('b', { heat })}</div><div class="heat-legend"><span>0</span><i style="background:var(--h1)"></i><i style="background:var(--h2)"></i><i style="background:var(--h3)"></i><i style="background:var(--h4)"></i><i style="background:var(--h5)"></i><span>많음</span></div></div>
        <div class="vol">${BL.GROUP_ORDER.map(g => { const v = gv[g] || 0; const b = band[BL.GROUP_CLASS[g]]; const lo = b[0] / maxV * 100, hi = Math.min(100, b[1] / maxV * 100); return `<div class="vrow"><span class="nm">${BL.GROUPS[g].n}</span><div class="vbar"><b style="left:${lo}%;width:${hi - lo}%"></b><i style="width:${Math.min(100, v / maxV * 100)}%"></i></div><span class="vv ${v < b[0] ? 'lo' : v > b[1] ? 'hi' : ''}">${n1(v)}</span></div>`; }).join('')}</div></div></div>`);
    }
    // 통증·체중
    const ms = S.metrics.filter(m => m.date >= E.addDays(t, -range * 7)).sort((x, y) => x.date.localeCompare(y.date));
    const pain = ms.filter(m => m.pain != null); const wts = ms.filter(m => m.weightKg);
    const sessPain = done.filter(s => s.painPost != null && s.date >= E.addDays(t, -range * 7)).sort((x, y) => x.date.localeCompare(y.date));
    if (pain.length >= 2 || sessPain.length >= 2) {
      const dates = [...new Set([...pain.map(m => m.date), ...sessPain.map(s => s.date)])].sort();
      out.push(`<div class="card">${lineChart({ id: 'pain', title: '통증 추이', sub: '아침 체크인 통증과 운동 직후 통증 (0~10)', xs: dates.map(fmtShort), xFull: dates, xName: '날짜', series: [{ name: '아침 체크인', cls: 1, ys: dates.map(d => { const m = pain.find(x => x.date === d); return m ? m.pain : null; }) }, { name: '운동 후', cls: 2, ys: dates.map(d => { const s = sessPain.filter(x => x.date === d).pop(); return s ? s.painPost : null; }) }], yMin: 0, yMax: 10, fmt: v => String(Math.round(v)) })}</div>`);
    }
    const serves = done.filter(s => s.type === 'tennis' && s.serves != null && s.date >= E.addDays(t, -range * 7)).sort((x, y) => x.date.localeCompare(y.date));
    if (serves.length >= 2) out.push(`<div class="card">${lineChart({ id: 'serves', title: '테니스 세션당 서브 개수', sub: '갈비·어깨 부담의 대리 지표. 통증이 있을 때는 주당 서브 총량을 천천히 늘린다', xs: serves.map(s => fmtShort(s.date)), xFull: serves.map(s => s.date), xName: '날짜', series: [{ name: '서브', cls: 2, ys: serves.map(s => +s.serves) }], fmt: v => n0(v) + '개', endLabels: true, area: true })}</div>`);
    if (wts.length >= 2) out.push(`<div class="card">${lineChart({ id: 'weight', title: '체중', sub: '아침 체크인 기준', xs: wts.map(m => fmtShort(m.date)), xFull: wts.map(m => m.date), xName: '날짜', series: [{ name: '체중', cls: 1, ys: wts.map(m => +m.weightKg) }], fmt: v => n1(v) + 'kg', endLabels: true })}</div>`);
    // 신체 치수 · 진행 사진
    const meas = S.metrics.filter(m => m.waist || m.chest || m.thigh || m.arm || m.hip).sort((x, y) => y.date.localeCompare(x.date));
    const photos = S.photos.slice().sort((x, y) => y.date.localeCompare(x.date));
    out.push(`<div class="card"><div class="card-h"><div><h2>몸의 변화</h2><div class="small muted">치수는 2주마다, 사진은 같은 장소·같은 조명으로 4주마다</div></div><div class="row"><button class="btn sm" data-act="measure-add">${BL.ico('ruler')} 치수</button>${BL.store.assets || BL.store.mode === 'local' ? `<button class="btn sm" data-act="photo-pick">${BL.ico('camera')} 사진</button><input type="file" accept="image/*" id="photo-file" data-act-change="photo-file" hidden>` : ''}</div></div>
      ${meas.length ? `<div class="tscroll" style="margin-bottom:14px"><table class="ctable"><thead><tr><th>날짜</th><th>체중</th><th>허리</th><th>가슴</th><th>엉덩이</th><th>허벅지</th><th>팔</th></tr></thead><tbody>${meas.slice(0, 8).map(m => `<tr><td>${fmtShort(m.date)}</td><td>${m.weightKg || '–'}</td><td>${m.waist || '–'}</td><td>${m.chest || '–'}</td><td>${m.hip || '–'}</td><td>${m.thigh || '–'}</td><td>${m.arm || '–'}</td></tr>`).join('')}</tbody></table></div>` : '<p class="small muted" style="margin-bottom:14px">허리·허벅지 둘레는 체중보다 몸 변화를 정직하게 보여 줘요. 아직 기록이 없어요.</p>'}
      ${photos.length ? `<div class="photos">${photos.slice(0, 12).map(p => `<div class="photo"><img src="${p.src || ('/_blob/' + p.assetId)}" alt="${fmtD(p.date)} 진행 사진" loading="lazy"><div class="pd">${fmtShort(p.date)}${p.note ? ' · ' + esc(p.note) : ''}</div><button class="pdel" data-act="photo-delete" data-id="${p.id}" aria-label="삭제">${BL.ico('x')}</button></div>`).join('')}</div>` : (BL.store.assets || BL.store.mode === 'local' ? `<button class="photo-add" data-act="photo-pick" style="max-width:140px">${BL.ico('camera')}<span>첫 진행 사진</span></button>` : '<p class="small muted">진행 사진은 편집 권한이 있을 때 올릴 수 있어요.</p>')}</div>`);
    // 테스트
    const tests = S.tests.slice().sort((a, b) => b.date.localeCompare(a.date));
    out.push(`<div class="card"><div class="card-h"><h2>체력 테스트</h2><button class="btn sm" data-act="test-add">+ 기록</button></div>${tests.length ? `<div class="tscroll"><table class="ctable"><thead><tr><th>테스트</th><th>최근</th><th>최고</th><th>횟수</th></tr></thead><tbody>${BL.TESTS.filter(d => tests.some(x => x.testId === d.id)).map(d => { const rows = tests.filter(x => x.testId === d.id); const latest = rows[0]; const best = rows.reduce((a, b) => (d.better === 'lower' ? +b.value < +a.value : +b.value > +a.value) ? b : a, rows[0]); return `<tr><td>${d.n}</td><td>${latest.value}${d.unit} <span class="xs muted">${fmtShort(latest.date)}</span></td><td>${best.value}${d.unit}</td><td>${rows.length}</td></tr>`; }).join('')}</tbody></table></div>` : `<p class="small muted">제자리멀리뛰기, 5-10-5 셔틀, 2.4km 달리기, 발목 니투월 같은 테스트를 4~6주마다 다시 재면 운동이 코트 능력으로 이어지는지 보여요.</p>`}</div>`);
    // PR
    const prList = Object.entries(prs).filter(([k, p]) => X[k] && (p.e1rm > 0 || p.reps > 0 || p.t > 0)).sort((a, b) => b[1].e1rm - a[1].e1rm);
    if (prList.length) out.push(`<div class="card"><div class="card-h"><h2>개인 기록</h2></div><div class="tscroll"><table class="ctable"><thead><tr><th>운동</th><th>e1RM</th><th>최고 세트</th><th>날짜</th></tr></thead><tbody>${prList.map(([k, p]) => `<tr><td>${esc(X[k].n)}</td><td>${p.e1rm ? n1(p.e1rm) + 'kg' : '–'}</td><td>${p.e1rm ? `${p.w}×${p.r}` : p.reps ? `${p.reps}회` : `${p.t}초`}</td><td>${fmtShort(p.date)}</td></tr>`).join('')}</tbody></table></div></div>`);
    return out.join('');
  };

  // ───────── 도감 ─────────
  BL.views.library = function () {
    const q = S.ui.libQ.trim().toLowerCase(); const pat = S.ui.libPat; const P = S.profile || {};
    const exSet = E.excludedFlags(P.restrictions);
    let list = BL.EX.filter(x => (!q || x.n.toLowerCase().includes(q) || x.en.toLowerCase().includes(q) || (BL.PATTERNS[x.pat] || '').includes(q)) && (!pat || x.pat === pat || (pat === 'core' && x.pat.startsWith('core')) || (pat === 'power' && ['plyo', 'plyo_lat', 'power', 'sprint'].includes(x.pat)) || (pat === 'push' && x.pat.startsWith('push')) || (pat === 'pull' && x.pat.startsWith('pull')) || (pat === 'arm' && (x.pat.startsWith('arm') || x.pat === 'delt'))));
    if (S.ui.libMine && P.equipment) list = list.filter(x => E.hasEquip(x, P.equipment));
    const groups = [['', '전체'], ['squat', '스쿼트'], ['hinge', '힌지'], ['lunge', '한 발'], ['lateral', '옆'], ['push', '밀기'], ['pull', '당기기'], ['core', '코어'], ['power', '파워·민첩'], ['calf', '종아리'], ['cuff', '어깨 건강'], ['hip_iso', '둔근'], ['arm', '팔·어깨'], ['cond', '유산소'], ['mob', '가동성'], ['carry', '캐리']];
    const prs = E.prTable(S.sessions);
    return `${BL.subnav('운동 도감', `<span class="pill"><i></i>${list.length} / ${BL.EX.length}</span>`)}
      <div class="row"><input class="inp pill" style="max-width:300px" data-act-input="lib-q" value="${esc(S.ui.libQ)}" placeholder="이름 검색 (예: 런지, squat)" aria-label="검색"><label class="chip ${S.ui.libMine ? 'on' : ''}"><input type="checkbox" data-act-change="lib-mine" ${S.ui.libMine ? 'checked' : ''} hidden>내 장비만</label><label class="chip ${S.ui.libSafe ? 'on' : ''}"><input type="checkbox" data-act-change="lib-safe" ${S.ui.libSafe ? 'checked' : ''} hidden>제약 표시</label></div>
      <div class="chips">${groups.map(([k, n]) => `<button class="chip tiny ${pat === k ? 'on' : ''}" data-act="lib-pat" data-p="${k}">${n}</button>`).join('')}</div>
      <div class="lib-grid">${list.map(x => { const bad = S.ui.libSafe && E.isExcluded(x, exSet); const pr = prs[x.id]; return `<button class="libcard ${bad ? 'off' : ''}" data-act="ex-info" data-ex="${x.id}">${miniFigs(x)}<span><b>${esc(x.n)}</b><span class="meta"><span>${BL.PATTERNS[x.pat] || x.pat}</span><span>Lv${x.lv}</span>${x.eq.length ? `<span>${x.eq.map(g => BL.EQUIP[g[0]]).join('·')}</span>` : '<span>맨몸</span>'}${pr && pr.e1rm ? `<span class="tag ball">${n1(pr.e1rm)}kg</span>` : ''}${bad ? '<span class="tag crit">제약</span>' : ''}</span></span></button>`; }).join('')}</div>`;
  };

  BL.exInfoHtml = function (x) {
    const act = activeSession(); const hist = E.exerciseHistory(x.id, S.sessions, 6); const pr = E.prTable(S.sessions)[x.id];
    const P = S.profile || {}; const exSet = E.excludedFlags(P.restrictions); const bad = E.isExcluded(x, exSet);
    const yt = x.v ? `<a class="vid" href="https://www.youtube.com/watch?v=${x.v[0]}" target="_blank" rel="noopener"><svg viewBox="0 0 26 26" aria-hidden="true"><circle cx="13" cy="13" r="12" fill="var(--accent)"/><path d="M10.5 8.5 L18 13 L10.5 17.5 Z" fill="var(--surface)"/></svg><span class="vt">${esc(x.v[1])}</span><span class="vm">${esc(x.v[2])} · ${x.v[3]}</span></a>` : `<a class="vid" href="https://www.youtube.com/results?search_query=${encodeURIComponent(x.n + ' 자세')}" target="_blank" rel="noopener"><svg viewBox="0 0 26 26" aria-hidden="true"><circle cx="13" cy="13" r="12" fill="var(--surface-2)"/><path d="M10.5 8.5 L18 13 L10.5 17.5 Z" fill="var(--muted)"/></svg><span class="vt">유튜브에서 "${esc(x.n)} 자세" 검색</span><span class="vm">이 운동엔 아직 고른 영상이 없어요</span></a>`;
    const ser = E.e1rmSeries(S.sessions, x.id);
    const dt = BL.DETAIL[x.id];
    const pctTable = pr && pr.e1rm ? `<div><div class="xs muted" style="font-weight:600;margin-bottom:6px">e1RM ${n1(pr.e1rm)}kg 기준 무게표</div><div class="pct-table">${[60, 65, 70, 75, 80, 85, 90, 95].map(p => `<div class="pct"><div class="p">${p}%</div><div class="w">${(Math.round(pr.e1rm * p / 100 / (E.ROUND[x.inc] || 1)) * (E.ROUND[x.inc] || 1)).toFixed(E.ROUND[x.inc] === 2.5 ? 1 : 0)}</div></div>`).join('')}</div><div class="xs muted" style="margin-top:4px">대략 60% ≈ 15회, 70% ≈ 12회, 80% ≈ 8회, 90% ≈ 4회</div></div>` : '';
    return `${BL.sheetHead(x.n, `${esc(x.en)} · ${BL.PATTERNS[x.pat] || x.pat} · Lv${x.lv}${x.uni ? ' · 한 발/한 팔' : ''}${x.eq.length ? ' · ' + x.eq.map(g => g.map(e => BL.EQUIP[e]).join('/')).join(', ') : ' · 맨몸'}`)}
      ${bad ? `<div class="banner crit"><div><b>지금 제약과 겹치는 동작</b>${P.restrictions.filter(k => (BL.RESTRICTIONS[k]?.ex || []).some(f => x.f.includes(f))).map(k => BL.RESTRICTIONS[k].n).join(', ')} 때문에 프로그램에서 자동으로 뺐어요.</div></div>` : ''}
      <div class="row" style="gap:16px;align-items:flex-start"><div class="figs" style="flex:none">${figure('f', { hit: x.m.p.concat(x.m.s) })}${figure('b', { hit: x.m.p.concat(x.m.s) })}</div><div class="stack-s" style="flex:1;min-width:0"><p>${esc(x.cue)}</p>${x.warn ? `<p class="small" style="color:var(--crit)">${esc(x.warn)}</p>` : ''}<div><div class="xs muted" style="font-weight:700">주동근</div><div class="mlist">${x.m.p.map(m => `<span class="tag acc">${esc(BL.M[m]?.n || m)}</span>`).join('')}</div></div>${x.m.s.length ? `<div><div class="xs muted" style="font-weight:700">보조근</div><div class="mlist">${x.m.s.map(m => `<span class="tag">${esc(BL.M[m]?.n || m)}</span>`).join('')}</div></div>` : ''}</div></div>
      ${dt ? `<div class="stack"><div><h3 style="margin-bottom:8px">동작 순서</h3><ol class="steps">${dt.steps.map(s => `<li>${esc(s)}</li>`).join('')}</ol></div><div><h3 style="margin-bottom:8px">흔한 실수</h3><ul class="mistakes">${dt.mistakes.map(s => `<li>${esc(s)}</li>`).join('')}</ul></div></div>` : ''}
      ${yt}
      ${pctTable}
      ${pr && (pr.e1rm || pr.reps || pr.t) ? `<div class="pr">🏆 최고 기록 <b>${pr.e1rm ? `e1RM ${n1(pr.e1rm)}kg (${pr.w}×${pr.r})` : pr.reps ? `${pr.reps}회` : `${pr.t}초`}</b> <span class="xs muted">${fmtShort(pr.date)}</span></div>` : ''}
      ${ser.length >= 2 ? lineChart({ id: 'exmini', title: '추정 1RM 추이', xs: ser.map(p => fmtShort(p.date)), xFull: ser.map(p => p.date), xName: '날짜', series: [{ name: 'e1RM', cls: 1, ys: ser.map(p => +p.e1rm.toFixed(1)) }], fmt: v => n1(v) + 'kg', endLabels: true, height: 150 }) : ''}
      ${hist.length ? `<div><div class="xs muted" style="font-weight:700;margin-bottom:4px">최근 기록</div><div class="hist-mini">${hist.map(h => `<div><span class="d">${fmtShort(h.date)}</span><span class="s">${h.sets.map(st => st.t && x.mode === 'cardio' ? `${Math.round(st.t / 60)}분@${st.rpe || '-'}` : st.t ? `${st.t}초` : `${st.w || 0}×${st.r}${st.rpe ? '@' + st.rpe : ''}`).join(' · ')}</span></div>`).join('')}</div></div>` : ''}
      <div class="row">${act && act.type === 'strength' ? `<button class="btn primary" data-act="ex-add-to-session" data-ex="${x.id}">진행 중인 운동에 추가</button>` : ''}</div>`;
  };

  // ───────── 설정 ─────────
  BL.views.profile = function () {
    const P = S.profile || {};
    const chk = (name, key, items, selected) => `<div class="field"><span class="flabel">${name}</span><div class="checks">${Object.entries(items).map(([k, v]) => `<label><input type="checkbox" name="${key}" value="${k}" ${(selected || []).includes(k) ? 'checked' : ''}>${typeof v === 'string' ? v : v.n}</label>`).join('')}</div></div>`;
    const out = [BL.subnav('설정'), BL.notes.readOnlyNote(), BL.notes.localNote()];
    const dayboxes = (name, sel) => `<div class="dayboxes">${[1, 2, 3, 4, 5, 6, 0].map(d => `<label><input type="checkbox" name="${name}" value="${d}" ${(sel || []).includes(d) ? 'checked' : ''}>${BL.WEEKDAYS[d]}</label>`).join('')}</div>`;
    out.push(`<form class="card stack" id="profile-form" data-act-submit="profile-save">
      <div class="card-h"><h2>프로필</h2><span class="small muted">프로그램 추천과 부하 계산의 기준</span></div>
      <div class="fgrid">
        <div class="field"><label for="pf-name">이름 (선택)</label><input class="inp" id="pf-name" name="name" value="${esc(P.name || '')}"></div>
        <div class="field"><label for="pf-age">나이</label><input class="inp" id="pf-age" name="age" type="number" inputmode="numeric" min="10" max="90" value="${P.age ?? ''}"></div>
        <div class="field"><label for="pf-h">키 (cm)</label><input class="inp" id="pf-h" name="heightCm" type="number" inputmode="decimal" min="120" max="230" value="${P.heightCm ?? ''}"></div>
        <div class="field"><label for="pf-w">몸무게 (kg)</label><input class="inp" id="pf-w" name="weightKg" type="number" inputmode="decimal" step="0.1" min="30" max="200" value="${P.weightKg ?? ''}"></div>
        <div class="field"><label for="pf-hand">주로 쓰는 손</label><select class="inp" id="pf-hand" name="dominantHand"><option value="R" ${P.dominantHand !== 'L' ? 'selected' : ''}>오른손</option><option value="L" ${P.dominantHand === 'L' ? 'selected' : ''}>왼손</option></select></div>
      </div>
      <div class="fgrid">
        <div class="field"><label for="pf-goal">목표</label><select class="inp" id="pf-goal" name="goal">${Object.entries(BL.GOALS).map(([k, g]) => `<option value="${k}" ${P.goal === k ? 'selected' : ''}>${g.n}</option>`).join('')}</select></div>
        <div class="field"><label for="pf-level">근력 운동 경험</label><select class="inp" id="pf-level" name="level">${Object.entries(BL.LEVELS).map(([k, n]) => `<option value="${k}" ${String(P.level || 1) === k ? 'selected' : ''}>${n}</option>`).join('')}</select></div>
        <div class="field"><label for="pf-days">주당 근력 일수</label><select class="inp" id="pf-days" name="daysPerWeek">${[2, 3, 4, 5, 6].map(n => `<option value="${n}" ${(P.daysPerWeek || 3) === n ? 'selected' : ''}>${n}일</option>`).join('')}</select></div>
        <div class="field"><label for="pf-min">세션 시간</label><select class="inp" id="pf-min" name="sessionMinutes">${[30, 45, 60, 75, 90].map(n => `<option value="${n}" ${(P.sessionMinutes || 60) === n ? 'selected' : ''}>${n}분</option>`).join('')}</select></div>
        <div class="field"><label for="pf-tennis">테니스 주당 일수</label><select class="inp" id="pf-tennis" name="tennisDays">${[0, 1, 2, 3, 4, 5, 6].map(n => `<option value="${n}" ${(P.tennisDays || 0) === n ? 'selected' : ''}>${n}일</option>`).join('')}</select></div>
        <div class="field"><label for="pf-rest">기본 휴식 (초)</label><input class="inp" id="pf-rest" name="restDefault" type="number" inputmode="numeric" min="15" max="300" step="15" value="${P.restDefault ?? 90}"></div>
      </div>
      <div class="fgrid"><div class="field"><span class="flabel">근력 운동 요일</span>${dayboxes('trainDays', P.trainDays)}<span class="help">홈 주간 달력에 계획으로 표시돼요. 근력 날 사이는 하루 이상 띄우는 게 좋아요.</span></div><div class="field"><span class="flabel">테니스 요일</span>${dayboxes('tennisWeekdays', P.tennisWeekdays)}<span class="help">테니스 치는 날에는 하체 파워 날을 피해요.</span></div></div>
      ${chk('장비', 'equipment', BL.EQUIP, P.equipment)}
      ${chk('아픈 곳·제약', 'restrictions', BL.RESTRICTIONS, P.restrictions)}
      ${chk('약점·우선순위 (최대 3)', 'weakPoints', BL.WEAK, P.weakPoints)}
      <div class="row"><label class="chip ${P.sound !== false ? 'on' : ''}"><input type="checkbox" name="sound" ${P.sound !== false ? 'checked' : ''} hidden>휴식 끝 알림음</label><label class="chip ${P.autoRest !== false ? 'on' : ''}"><input type="checkbox" name="autoRest" ${P.autoRest !== false ? 'checked' : ''} hidden>세트 완료하면 휴식 타이머 자동 시작</label></div>
      <div class="row"><button class="btn primary" type="submit">저장</button><span class="small muted">저장 후 "프로그램 만들기"를 누르면 바뀐 조건으로 다시 짜요.</span></div></form>`);
    out.push(`<div class="card stack"><div class="card-h"><h2>코치에게 보내기</h2><span class="small muted">최근 7일 세션, 부하, 통증, PR을 글로 정리</span></div><div class="row"><button class="btn" data-act="report">보고서 보기·복사</button>${BL.store.sample ? '<button class="btn" data-act="ai-feedback">AI 코치 피드백</button>' : ''}</div><p class="small muted">${BL.store.mode === 'db' ? '클라우드에 저장되므로 Claude가 이 페이지의 데이터를 직접 읽을 수도 있어요. 채팅에서 "베이스라인 기록 봐 줘"라고 하면 돼요.' : '복사한 보고서를 채팅에 붙여 넣으면 코치가 분석해요.'}</p></div>`);
    out.push(`<div class="card stack"><div class="card-h"><h2>데이터</h2><span class="small muted">${BL.store.mode === 'db' ? '클라우드 저장' : '이 브라우저 저장'} · 세션 ${S.sessions.length} · 체크인 ${S.metrics.length} · 테스트 ${S.tests.length}</span></div><div class="row"><button class="btn" data-act="export-json">JSON 내보내기</button><button class="btn" data-act="export-csv">세트 CSV 내보내기</button><button class="btn" data-act="import-open">가져오기</button></div><div class="row"><button class="btn danger" data-act="wipe-open">모든 기록 삭제</button></div></div>`);
    out.push(`<div class="card stack"><div class="card-h"><h2>계산 방식</h2></div><ul class="rationale" style="list-style:disc"><li><b>추정 1RM</b>: 무게 × (1 + (반복 + 여유 반복) / 30). RPE 8이면 여유 반복 2.</li><li><b>부하</b>: 세션 RPE × 시간(분). 테니스·유산소도 같은 단위라 합산할 수 있다.</li><li><b>ACWR</b>: 최근 7일 부하 ÷ (최근 28일 부하 ÷ 4). 0.8~1.3 적정, 1.5 초과면 그 주 부상 위험이 높다는 연구가 많다. 21일치가 있어야 계산.</li><li><b>진행 규칙</b>: 모든 세트가 반복 상단에 닿고 RPE가 목표 이하면 무게 ↑ (바벨 하체 +5, 상체 +2.5, 덤벨 +2kg). 하단 미달이거나 RPE가 1.5 이상 넘치면 5% ↓. 그 사이면 무게 유지하고 반복 +1.</li><li><b>컨디션 점수</b>: 수면·근육통·피로·스트레스·기분의 평균. 55 미만이면 그날 세트 -1, RPE -1을 권한다.</li><li><b>디로드</b>: 4주마다 세트 40% 감소, RPE -1.</li></ul></div>`);
    return out.join('');
  };
})(window.BL);
