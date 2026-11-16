/* 베이스라인 · 엔진: 프로그램 생성, 처방, 진행(프로그레션), 부하·볼륨 분석 */
window.BL = window.BL || {};
(function (BL) {
  'use strict';
  const X = BL.X, EX = BL.EX, M = BL.M, GROUPS = BL.GROUPS;

  // ───────── 공통 유틸 ─────────
  const pad = n => String(n).padStart(2, '0');
  const dstr = d => { d = d instanceof Date ? d : new Date(d); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
  const parse = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
  const addDays = (s, n) => { const d = parse(s); d.setDate(d.getDate() + n); return dstr(d); };
  const diffDays = (a, b) => Math.round((parse(b) - parse(a)) / 86400000);
  const weekStart = s => { const d = parse(s); const wd = (d.getDay() + 6) % 7; d.setDate(d.getDate() - wd); return dstr(d); };
  const today = () => dstr(new Date());
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const mean = a => a.length ? a.reduce((s, v) => s + v, 0) / a.length : 0;
  const sum = a => a.reduce((s, v) => s + v, 0);
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  function mulberry32(seed) { let a = seed >>> 0; return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  const hashStr = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
  const ROUND = { bb_l: 2.5, bb_u: 2.5, db: 1, kb: 2, mach: 2.5 };

  // 추정 1RM: Epley + RPE(여유 반복 수) 보정. RPE가 없으면 반복 수만 사용.
  function e1rm(w, r, rpe) {
    if (!w || !r) return 0;
    const rir = (rpe && rpe >= 5 && rpe <= 10) ? (10 - rpe) : 0;
    const effReps = r + rir;
    if (effReps <= 1) return w;
    return w * (1 + effReps / 30);
  }

  // 완료된 본 세트만 (워밍업 제외)
  const isWork = st => !!st && !!st.done && st.type !== 'warm';
  // 워밍업 세트 계획: 본 세트 무게 기준
  function warmupPlan(w, ex) {
    if (!w || w <= 0) return [];
    const step = ROUND[ex.inc] || 1;
    const r = v => Math.max(step, Math.round(v / step) * step);
    if (w < 20) return [{ w: r(w * 0.6), r: 8, type: 'warm' }];
    if (w < 40) return [{ w: r(w * 0.5), r: 8, type: 'warm' }, { w: r(w * 0.75), r: 4, type: 'warm' }];
    return [{ w: r(w * 0.5), r: 8, type: 'warm' }, { w: r(w * 0.7), r: 5, type: 'warm' }, { w: r(w * 0.85), r: 3, type: 'warm' }];
  }

  // ───────── 처방표 (목표 × 역할) ─────────
  const RX = {
    strength: { main: [4, [4, 6], 8, 180], secondary: [3, [6, 8], 7.5, 150], accessory: [3, [8, 12], 8, 90], core: [3, [8, 12], 7, 60], cuff: [2, [15, 20], 6, 45], calf: [3, [10, 15], 8, 60], power: [4, [3, 5], 0, 120], cond: [15, 6], mob: [2, 45] },
    hypertrophy: { main: [4, [6, 10], 8, 120], secondary: [3, [8, 12], 8, 90], accessory: [3, [12, 15], 8.5, 60], core: [3, [10, 15], 8, 60], cuff: [2, [15, 20], 6, 45], calf: [4, [12, 15], 8, 60], power: [3, [3, 5], 0, 120], cond: [15, 6], mob: [2, 45] },
    tennis: { main: [3, [5, 8], 7, 150], secondary: [3, [6, 8], 7, 120], accessory: [3, [8, 12], 7, 75], core: [3, [8, 12], 7, 60], cuff: [2, [15, 20], 6, 45], calf: [3, [12, 15], 7, 60], power: [4, [3, 5], 0, 120], cond: [20, 7], mob: [2, 45] },
    fatloss: { main: [3, [8, 12], 8, 75], secondary: [3, [10, 15], 8, 60], accessory: [3, [12, 15], 8, 45], core: [3, [12, 15], 8, 45], cuff: [2, [15, 20], 6, 30], calf: [3, [15, 20], 8, 45], power: [3, [5, 8], 0, 90], cond: [25, 7], mob: [1, 45] },
    rehab: { main: [3, [8, 12], 6, 120], secondary: [3, [10, 15], 6, 90], accessory: [2, [12, 15], 6, 60], core: [3, [8, 12], 6, 60], cuff: [2, [15, 20], 5, 45], calf: [3, [12, 15], 6, 60], power: [2, [3, 5], 0, 120], cond: [25, 5], mob: [2, 45] },
    general: { main: [3, [6, 10], 7, 120], secondary: [3, [8, 12], 7, 90], accessory: [3, [10, 15], 7, 60], core: [3, [10, 15], 7, 60], cuff: [2, [15, 20], 6, 45], calf: [3, [12, 15], 7, 60], power: [3, [3, 5], 0, 120], cond: [20, 6], mob: [2, 45] }
  };
  const ROLE_N = { main: '메인', secondary: '보조', accessory: '보강', core: '코어', cuff: '어깨 건강', calf: '종아리', power: '파워', cond: '유산소', mob: '가동성' };

  function rx(goal, role, ex, level) {
    const t = (RX[goal] || RX.general)[role] || RX.general.accessory;
    const item = { role, sets: 0, reps: null, time: null, min: null, rpe: 0, rest: 90 };
    if (role === 'cond' || ex.mode === 'cardio') { item.role = 'cond'; item.sets = 1; item.min = t[0] || 20; item.rpe = t[1] || 6; item.rest = 0; return item; }
    if (role === 'mob' || ex.pat === 'mob') { item.role = 'mob'; item.sets = (RX[goal] || RX.general).mob[0]; if (ex.mode === 'time') item.time = 45; else item.reps = [8, 10]; item.rpe = 0; item.rest = 15; return item; }
    item.sets = t[0]; item.rpe = t[2]; item.rest = t[3];
    if (ex.mode === 'time') { item.time = role === 'core' ? (level >= 2 ? 40 : 25) : 30; }
    else if (ex.pat === 'plyo' || ex.pat === 'plyo_lat' || ex.pat === 'power' || ex.pat === 'sprint') { item.role = 'power'; const p = (RX[goal] || RX.general).power; item.sets = p[0]; item.reps = ex.pat === 'sprint' ? [1, 1] : p[1].slice(); item.rpe = 0; item.rest = p[3]; if (ex.id === 'kb_swing' || ex.id === 'mb_slam') item.reps = [8, 12]; if (ex.pat === 'sprint') item.sets = 6; }
    else item.reps = t[1].slice();
    if (ex.pat === 'cuff' || ex.pat === 'arm_fore') { const c = (RX[goal] || RX.general).cuff; item.role = 'cuff'; item.sets = c[0]; item.reps = c[1].slice(); item.rpe = c[2]; item.rest = c[3]; }
    if (ex.pat === 'calf') { const c = (RX[goal] || RX.general).calf; item.role = 'calf'; item.sets = c[0]; item.reps = c[1].slice(); item.rpe = c[2]; item.rest = c[3]; }
    if (ex.pat === 'carry') { item.time = 40; item.reps = null; }
    return item;
  }

  // ───────── 분할 템플릿 ─────────
  const S = (role, pats, o) => Object.assign({ role, pats: [].concat(pats) }, o || {});
  const D = (name, focus, blocks) => ({ name, focus, blocks });

  function tennisDays(n) {
    const A = D('양발 기본기', '스쿼트와 힌지로 하체 엔진을 깨운다', [[S('power', 'plyo')], [S('main', 'squat')], [S('secondary', 'hinge'), S('accessory', 'pull_h')], [S('core', 'core_anti'), S('calf', 'calf', { uni: false })], [S('cuff', 'cuff', { opt: true })]]);
    const B = D('한 발로 버티기', '한 발 착지와 버티기, 테니스 스텝의 기본 자세', [[S('power', 'plyo', { prefer: ['pogo', 'split_step', 'squat_jump'] })], [S('main', 'lunge', { uni: true })], [S('secondary', 'hinge', { uni: true }), S('accessory', ['push_h', 'push_v'])], [S('core', ['core_anti', 'core_rot']), S('calf', 'calf', { uni: true, opt: true })], [S('accessory', 'hip_iso', { opt: true })]]);
    const C = D('옆으로, 더 세게', '옆 방향 힘과 회전 파워', [[S('power', ['plyo_lat', 'power'])], [S('main', 'hinge', { uni: false })], [S('secondary', 'lateral'), S('accessory', ['pull_v', 'pull_h'])], [S('core', ['core_rot', 'core_anti']), S('cuff', 'cuff')], [S('cond', 'cond', { opt: true })]]);
    const L1 = D('하체 파워', '점프 후 무거운 스쿼트, 한 발 힌지', [[S('power', 'plyo')], [S('main', 'squat')], [S('secondary', 'hinge', { uni: true }), S('calf', 'calf')], [S('core', 'core_anti')]]);
    const U1 = D('상체 당기고 밀기', '등과 어깨 뒤를 먼저, 밀기는 그 다음', [[S('main', 'pull_h')], [S('secondary', 'push_h'), S('accessory', 'pull_v')], [S('cuff', 'cuff'), S('core', 'core_rot')]]);
    const L2 = D('한 발·옆 방향', '코트 커버 동작 그대로', [[S('power', 'plyo_lat')], [S('main', 'hinge')], [S('secondary', 'lunge', { uni: true }), S('accessory', 'lateral')], [S('calf', 'calf', { uni: true }), S('accessory', 'hip_iso', { opt: true })]]);
    const U2 = D('상체 + 컨디셔닝', '어깨 건강과 심폐', [[S('main', ['push_v', 'push_h'])], [S('secondary', 'pull_h'), S('cuff', 'cuff')], [S('core', 'core_anti')], [S('cond', 'cond')]]);
    const CD = D('민첩성·컨디셔닝', '스프린트, 방향 전환, 인터벌', [[S('power', 'sprint', { lat: true })], [S('power', 'sprint')], [S('cond', 'cond')], [S('mob', 'mob'), S('mob', 'mob')]]);
    const MB = D('회복·가동성', '고관절, 발목, 흉추 풀기', [[S('mob', 'mob'), S('mob', 'mob')], [S('mob', 'mob'), S('mob', 'mob')], [S('cond', 'cond', { opt: true, prefer: ['bike_z2', 'run_easy'] })]]);
    if (n <= 2) return [D('하체 파워 + 당기기', '점프, 스쿼트, 한 발 힌지, 등', [[S('power', 'plyo')], [S('main', 'squat')], [S('secondary', ['lunge', 'hinge'], { uni: true }), S('accessory', 'pull_h')], [S('core', 'core_anti'), S('calf', 'calf')], [S('cuff', 'cuff', { opt: true })]]),
      D('한 발·옆 + 밀기', '옆 점프, 힌지, 옆 방향, 밀기', [[S('power', ['plyo_lat', 'plyo'])], [S('main', 'hinge')], [S('secondary', 'lateral'), S('accessory', ['push_h', 'push_v'])], [S('core', ['core_rot', 'core_anti']), S('cuff', 'cuff')], [S('accessory', 'hip_iso', { opt: true })]])];
    if (n === 3) return [A, B, C];
    if (n === 4) return [L1, U1, L2, U2];
    if (n === 5) return [L1, U1, L2, U2, CD];
    return [L1, U1, L2, U2, CD, MB];
  }

  function strengthDays(n) {
    const sq = D('스쿼트 데이', '메인 스쿼트, 보조 힌지', [[S('main', 'squat')], [S('secondary', 'hinge')], [S('accessory', 'push_h'), S('accessory', 'pull_h')], [S('core', 'core_anti')]]);
    const pr = D('프레스 데이', '메인 밀기, 등으로 균형', [[S('main', 'push_h')], [S('secondary', 'push_v')], [S('accessory', 'pull_v'), S('accessory', 'pull_h')], [S('accessory', 'arm_tri', { opt: true }), S('cuff', 'cuff', { opt: true })]]);
    const dl = D('데드리프트 데이', '메인 힌지, 한 발 보조', [[S('main', 'hinge')], [S('secondary', 'lunge', { uni: true })], [S('accessory', 'pull_h'), S('calf', 'calf')], [S('core', 'core_anti')]]);
    const LA = D('하체 A', '스쿼트 중심', [[S('main', 'squat')], [S('secondary', 'hinge')], [S('accessory', 'lunge', { uni: true }), S('calf', 'calf')], [S('core', 'core_anti')]]);
    const UA = D('상체 A', '수평 밀기 중심', [[S('main', 'push_h')], [S('secondary', 'pull_h')], [S('accessory', 'push_v'), S('accessory', 'arm_bi', { opt: true })], [S('cuff', 'cuff')]]);
    const LB = D('하체 B', '힌지 중심', [[S('main', 'hinge')], [S('secondary', 'squat')], [S('accessory', ['lateral', 'lunge']), S('accessory', 'ham_iso', { opt: true })], [S('core', 'core_anti')]]);
    const UB = D('상체 B', '수직 밀기·당기기 중심', [[S('main', ['push_v', 'push_h'])], [S('secondary', 'pull_v')], [S('accessory', 'push_h'), S('accessory', 'arm_tri', { opt: true })], [S('cuff', 'cuff')]]);
    const WK = D('약점 보강', '작은 근육과 코어', [[S('accessory', 'hip_iso'), S('core', 'core_anti')], [S('cuff', 'cuff'), S('calf', 'calf')], [S('accessory', 'carry', { opt: true })], [S('cond', 'cond', { opt: true })]]);
    const MB = D('회복·가동성', '관절 풀기와 가벼운 유산소', [[S('mob', 'mob'), S('mob', 'mob')], [S('mob', 'mob'), S('mob', 'mob')], [S('cond', 'cond', { opt: true, prefer: ['bike_z2'] })]]);
    if (n <= 2) return [D('전신 A', '스쿼트와 밀기', [[S('main', 'squat')], [S('secondary', 'push_h')], [S('accessory', 'hinge'), S('accessory', 'pull_h')], [S('core', 'core_anti')]]), D('전신 B', '힌지와 당기기', [[S('main', 'hinge')], [S('secondary', ['push_v', 'push_h'])], [S('accessory', 'lunge', { uni: true }), S('accessory', 'pull_v')], [S('core', 'core_anti')]])];
    if (n === 3) return [sq, pr, dl];
    if (n === 4) return [LA, UA, LB, UB];
    if (n === 5) return [LA, UA, LB, UB, WK];
    return [LA, UA, LB, UB, WK, MB];
  }

  function hypertrophyDays(n) {
    const full = (v) => D(`전신 ${v}`, v === 'A' ? '스쿼트로 시작' : v === 'B' ? '힌지로 시작' : '한 발로 시작', [[S('main', v === 'A' ? 'squat' : v === 'B' ? 'hinge' : 'lunge', v === 'C' ? { uni: true } : {})], [S('secondary', 'push_h'), S('secondary', 'pull_h')], [S('accessory', v === 'A' ? 'hinge' : 'squat'), S('accessory', v === 'B' ? 'push_v' : 'pull_v')], [S('accessory', ['delt', 'arm_bi', 'arm_tri'], { opt: true }), S('core', 'core_anti')]]);
    const UA = D('상체 A', '가슴·등 중심', [[S('main', 'push_h')], [S('secondary', 'pull_h')], [S('accessory', 'push_v'), S('accessory', 'pull_v')], [S('accessory', 'arm_bi'), S('accessory', 'arm_tri')]]);
    const LA = D('하체 A', '스쿼트 중심', [[S('main', 'squat')], [S('secondary', 'hinge')], [S('accessory', 'lunge', { uni: true }), S('accessory', 'ham_iso')], [S('calf', 'calf'), S('core', 'core_anti')]]);
    const UB = D('상체 B', '등·어깨 중심', [[S('main', 'pull_v')], [S('secondary', 'push_h')], [S('accessory', 'pull_h'), S('accessory', 'delt')], [S('accessory', 'arm_tri'), S('accessory', 'arm_bi')]]);
    const LB = D('하체 B', '힌지 중심', [[S('main', 'hinge')], [S('secondary', 'squat')], [S('accessory', ['lunge', 'lateral']), S('accessory', 'quad_iso')], [S('calf', 'calf'), S('core', 'core_anti')]]);
    const PUSH = D('푸시', '가슴·어깨·삼두', [[S('main', 'push_h')], [S('secondary', 'push_v')], [S('accessory', 'push_h'), S('accessory', 'delt')], [S('accessory', 'arm_tri'), S('accessory', 'arm_tri', { opt: true })]]);
    const PULL = D('풀', '등·어깨 뒤·이두', [[S('main', 'pull_v')], [S('secondary', 'pull_h')], [S('accessory', 'pull_h'), S('cuff', 'cuff')], [S('accessory', 'arm_bi'), S('accessory', 'arm_bi', { opt: true })]]);
    const LEGS = D('하체', '스쿼트·힌지·종아리', [[S('main', 'squat')], [S('secondary', 'hinge')], [S('accessory', 'lunge', { uni: true }), S('accessory', 'ham_iso')], [S('calf', 'calf'), S('core', 'core_anti')]]);
    if (n <= 2) return [full('A'), full('B')];
    if (n === 3) return [full('A'), full('B'), full('C')];
    if (n === 4) return [UA, LA, UB, LB];
    if (n === 5) return [PUSH, PULL, LEGS, UA, LB];
    return [PUSH, PULL, LEGS, PUSH, PULL, LB];
  }

  function fatlossDays(n) {
    const circ = (v) => D(`서킷 ${v}`, '짝지은 운동을 쉬지 않고 번갈아', [[S('main', v === 'A' ? 'squat' : v === 'B' ? 'hinge' : 'lunge', v === 'C' ? { uni: true } : {}), S('secondary', v === 'B' ? 'push_h' : 'pull_h')], [S('secondary', v === 'A' ? 'hinge' : 'squat'), S('accessory', v === 'B' ? 'pull_v' : 'push_h')], [S('accessory', ['lateral', 'lunge']), S('core', ['core_anti', 'core_rot'])], [S('cond', 'cond', { prefer: ['bike_int', 'run_int', 'jump_rope'] })]]);
    const cond = D('컨디셔닝', '인터벌 + 존2', [[S('cond', 'cond', { prefer: ['bike_int', 'run_int', 'jump_rope'] })], [S('cond', 'cond', { prefer: ['bike_z2', 'run_easy', 'row_erg'] })], [S('mob', 'mob'), S('mob', 'mob')]]);
    const z2 = D('존2 유산소', '길고 편하게', [[S('cond', 'cond', { prefer: ['bike_z2', 'run_easy', 'row_erg'] })], [S('mob', 'mob'), S('mob', 'mob')]]);
    if (n <= 2) return [circ('A'), circ('B')];
    if (n === 3) return [circ('A'), circ('B'), circ('C')];
    if (n === 4) return [circ('A'), cond, circ('B'), circ('C')];
    if (n === 5) return [circ('A'), cond, circ('B'), z2, circ('C')];
    return [circ('A'), cond, circ('B'), z2, circ('C'), cond];
  }

  function rehabDays(n) {
    const A = D('기초 A', '양발, 낮은 부하, 정확한 자세', [[S('main', 'squat', { prefer: ['goblet', 'box_squat'] })], [S('secondary', 'hinge', { prefer: ['rdl', 'glute_bridge', 'hip_thrust'] }), S('accessory', 'pull_h', { prefer: ['band_row', 'db_row', 'cable_row'] })], [S('core', 'core_anti', { prefer: ['deadbug', 'birddog'] }), S('calf', 'calf')], [S('mob', 'mob'), S('mob', 'mob')]]);
    const B = D('기초 B', '한 발, 엉덩이 옆, 어깨 건강', [[S('main', 'lunge', { uni: true, prefer: ['split_squat', 'stepup'] })], [S('secondary', 'hinge', { uni: true }), S('accessory', 'hip_iso')], [S('cuff', 'cuff'), S('core', 'core_anti')], [S('mob', 'mob'), S('mob', 'mob')]]);
    const C = D('기초 C', '옆 방향과 유산소', [[S('main', 'lateral', { prefer: ['lat_lunge', 'lateral_stepup'] })], [S('secondary', 'hinge', { prefer: ['hip_thrust', 'rdl'] }), S('accessory', 'pull_h')], [S('cuff', 'cuff'), S('core', 'core_anti')], [S('cond', 'cond', { prefer: ['bike_z2'] })]]);
    const MB = D('가동성·유산소', '아픈 데 없이 움직이기', [[S('mob', 'mob'), S('mob', 'mob')], [S('mob', 'mob'), S('mob', 'mob')], [S('cond', 'cond', { prefer: ['bike_z2'] })]]);
    if (n <= 2) return [A, B];
    if (n === 3) return [A, B, C];
    if (n === 4) return [A, MB, B, C];
    if (n === 5) return [A, MB, B, MB, C];
    return [A, MB, B, MB, C, MB];
  }

  function generalDays(n) {
    const full = (v) => D(`전신 ${v}`, v === 'A' ? '스쿼트·밀기·당기기' : v === 'B' ? '힌지·밀기·당기기' : '한 발·코어', [[S('main', v === 'A' ? 'squat' : v === 'B' ? 'hinge' : 'lunge', v === 'C' ? { uni: true } : {})], [S('secondary', v === 'B' ? 'push_v' : 'push_h'), S('secondary', v === 'C' ? 'pull_v' : 'pull_h')], [S('accessory', v === 'A' ? 'lunge' : v === 'B' ? 'lateral' : 'hinge', v === 'A' ? { uni: true } : {}), S('core', 'core_anti')], [S('calf', 'calf', { opt: true }), S('cuff', 'cuff', { opt: true })]]);
    const UP = D('상체', '밀기·당기기 균형', [[S('main', 'push_h')], [S('secondary', 'pull_h')], [S('accessory', 'push_v'), S('accessory', 'pull_v')], [S('cuff', 'cuff'), S('core', 'core_anti')]]);
    const LO = D('하체', '스쿼트·힌지·한 발', [[S('main', 'squat')], [S('secondary', 'hinge')], [S('accessory', 'lunge', { uni: true }), S('calf', 'calf')], [S('core', 'core_anti')]]);
    const CD = D('유산소·가동성', '심폐와 관절', [[S('cond', 'cond')], [S('mob', 'mob'), S('mob', 'mob')]]);
    if (n <= 2) return [full('A'), full('B')];
    if (n === 3) return [full('A'), full('B'), full('C')];
    if (n === 4) return [LO, UP, full('C'), CD];
    if (n === 5) return [LO, UP, LO, UP, CD];
    return [LO, UP, CD, LO, UP, CD];
  }

  const TEMPLATES = { tennis: tennisDays, strength: strengthDays, hypertrophy: hypertrophyDays, fatloss: fatlossDays, rehab: rehabDays, general: generalDays };

  // ───────── 후보 필터와 선택 ─────────
  function hasEquip(ex, equip) {
    const set = new Set(equip || []);
    return (ex.eq || []).every(group => group.some(e => set.has(e)));
  }
  function excludedFlags(restrictions) {
    const s = new Set();
    (restrictions || []).forEach(r => (BL.RESTRICTIONS[r]?.ex || []).forEach(f => s.add(f)));
    return s;
  }
  function isExcluded(ex, exSet) { return (ex.f || []).some(f => exSet.has(f)); }
  function weakPats(weak) { const s = new Set(); (weak || []).forEach(w => (BL.WEAK[w]?.pats || []).forEach(p => s.add(p))); return s; }

  function candidates(slot, ctx, relax) {
    relax = relax || 0;
    return EX.filter(e => {
      if (!slot.pats.includes(e.pat)) return false;
      if (slot.uni !== undefined && !!e.uni !== slot.uni && relax < 2) return false;
      if (slot.lat && !e.lat && relax < 2) return false;
      if (isExcluded(e, ctx.exSet)) return false;
      if (!hasEquip(e, ctx.equip) && relax < 3) return false;
      if (e.lv > ctx.level + (relax >= 1 ? 1 : 0)) return false;
      if ((e.g[ctx.goal] || 0) === 0 && relax < 1) return false;
      return true;
    });
  }
  function pick(slot, ctx, dayUsed) {
    let cands = [], relax = 0;
    while (cands.length === 0 && relax <= 3) { cands = candidates(slot, ctx, relax); relax++; }
    if (!cands.length) return null;
    let best = null, bestScore = -Infinity;
    for (const e of cands) {
      let s = (e.g[ctx.goal] || 0) * 3;
      if (ctx.weakSet.has(e.pat)) s += 2;
      if (slot.prefer && slot.prefer.includes(e.id)) s += 3;
      if (dayUsed.has(e.id)) s -= 12;
      s -= (ctx.used.get(e.id) || 0) * 3;
      // 같은 날 같은 주동근이 이미 많으면 약간 감점
      const dayP = ctx.dayPrimary;
      const overlap = e.m.p.filter(m => dayP.has(m)).length;
      s -= overlap * 0.6;
      if (slot.role === 'main' && e.lv === ctx.level) s += 0.5;
      s += ctx.rng() * 1.5;
      if (s > bestScore) { bestScore = s; best = e; }
    }
    return best;
  }

  // 소요 시간 추정 (분)
  function estimateDay(day) {
    let min = 8;
    for (const b of day.blocks) {
      if (!b.items.length) continue;
      if (b.items.length === 1) {
        const it = b.items[0];
        if (it.min) { min += it.min; continue; }
        const work = it.time ? it.time + 10 : 40;
        min += it.sets * (work + it.rest) / 60;
      } else {
        const sets = Math.max(...b.items.map(i => i.sets));
        const work = sum(b.items.map(i => i.time ? i.time + 10 : 40));
        const rest = Math.max(...b.items.map(i => i.rest)) * 0.75;
        min += sets * (work + rest) / 60;
      }
    }
    return Math.round(min);
  }

  function fitToTime(day, limit, notes) {
    let est = estimateDay(day);
    if (est <= limit) return est;
    // 1) 선택 슬롯 제거 (뒤에서부터)
    for (let i = day.blocks.length - 1; i >= 0 && est > limit; i--) {
      const b = day.blocks[i];
      const keep = b.items.filter(it => !it.opt);
      if (keep.length !== b.items.length) { b.items = keep; est = estimateDay(day); }
    }
    day.blocks = day.blocks.filter(b => b.items.length);
    if (est > limit) { notes.add('time_opt'); }
    // 2) 보강·코어 세트 -1
    if (est > limit) {
      day.blocks.forEach(b => b.items.forEach(it => { if (['accessory', 'core', 'cuff', 'calf'].includes(it.role) && it.sets > 2) it.sets -= 1; }));
      est = estimateDay(day); notes.add('time_sets');
    }
    // 3) 휴식 25% 단축
    if (est > limit) {
      day.blocks.forEach(b => b.items.forEach(it => { if (it.rest > 45) it.rest = Math.round(it.rest * 0.75 / 15) * 15; }));
      est = estimateDay(day); notes.add('time_rest');
    }
    return est;
  }

  // ───────── 프로그램 생성 ─────────
  function generateProgram(profile, opts) {
    opts = opts || {};
    const goal = BL.GOALS[profile.goal] ? profile.goal : 'general';
    const days = clamp(profile.daysPerWeek || 3, 2, 6);
    const level = clamp(profile.level || 1, 1, 3);
    const minutes = clamp(profile.sessionMinutes || 60, 30, 120);
    const seed = opts.seed != null ? opts.seed : hashStr(JSON.stringify([goal, days, level, profile.equipment, profile.restrictions, Date.now()]));
    const ctx = {
      goal, level, equip: profile.equipment || [], exSet: excludedFlags(profile.restrictions), weakSet: weakPats(profile.weakPoints),
      used: new Map(), rng: mulberry32(seed), dayPrimary: new Set()
    };
    const tmpl = TEMPLATES[goal](days);
    const notes = new Set();
    const missing = [];
    const outDays = tmpl.map((td, di) => {
      const dayUsed = new Set(); ctx.dayPrimary = new Set();
      const blocks = [];
      td.blocks.forEach(bslots => {
        const items = [];
        bslots.forEach(slot => {
          const e = pick(slot, ctx, dayUsed);
          if (!e) { missing.push(slot); return; }
          dayUsed.add(e.id); ctx.used.set(e.id, (ctx.used.get(e.id) || 0) + 1);
          e.m.p.forEach(m => ctx.dayPrimary.add(m));
          const it = rx(goal, slot.role, e, level);
          it.id = uid(); it.exId = e.id; it.opt = !!slot.opt;
          if (e.uni && it.reps) it.perSide = true;
          items.push(it);
        });
        if (items.length) blocks.push({ id: uid(), super: items.length > 1, items });
      });
      const day = { id: uid(), name: td.name, focus: td.focus, blocks };
      day.est = fitToTime(day, minutes, notes);
      return day;
    });

    // 근거 문장
    const r = [];
    r.push(`목표 "${BL.GOALS[goal].n}"에 맞춰 주 ${days}일 분할: ${outDays.map(d => d.name).join(' · ')}.`);
    if (goal === 'tennis') r.push('테니스는 한 발과 옆 방향 운동이라 모든 근력 날에 한 발 또는 옆 방향 동작을 넣고, 점프·파워를 세션 앞머리에 둔다.');
    if (goal === 'strength') r.push('메인 리프트는 4~6회 RPE 8, 보조는 6~8회. 주요 리프트는 주 2회 이상 반복해서 기술을 익힌다.');
    if (goal === 'hypertrophy') r.push('근육군당 주 10~20세트를 목표로 보조 운동을 많이 넣었다. 12~15회 구간에서 RPE 8~9까지 밀어붙인다.');
    if (goal === 'fatloss') r.push('짝지은 운동을 번갈아 하는 서킷으로 세션 밀도를 높이고 인터벌을 붙였다. 식단이 70%다.');
    if (goal === 'rehab') r.push('부하는 낮게(RPE 5~6), 범위는 통증 없는 만큼. 2~3주 통증 0이면 다음 단계로 올린다.');
    const rs = (profile.restrictions || []).filter(k => BL.RESTRICTIONS[k]);
    if (rs.length) r.push(`제약 (${rs.map(k => BL.RESTRICTIONS[k].n).join(', ')}): ${rs.map(k => BL.RESTRICTIONS[k].note).join(' ')}`);
    const ws = (profile.weakPoints || []).filter(k => BL.WEAK[k]);
    if (ws.length) r.push(`약점으로 고른 ${ws.map(k => BL.WEAK[k].n).join(', ')} 관련 운동에 가중치를 줘서 우선 배치했다.`);
    if ((profile.tennisDays || 0) >= 3 && goal !== 'rehab') r.push(`테니스를 주 ${profile.tennisDays}일 치므로 근력 날 사이에 하루 이상 띄우고, 테니스 당일에는 하체 파워 날을 피한다.`);
    if (level === 1) r.push('첫 주는 모든 운동 세트 수 -1로 자세를 익히고(앱이 자동 적용), 2주차부터 표대로 간다.');
    r.push('4주차는 디로드: 세트 수 40% 감소, RPE -1. 5주차에 프로그램을 다시 만들거나 무게를 올려 이어 간다.');
    if (notes.has('time_opt')) r.push(`세션 ${minutes}분에 맞추려고 선택 운동을 뺐다.`);
    if (notes.has('time_sets')) r.push('시간에 맞추려고 보강 운동 세트를 1세트씩 줄였다.');
    if (notes.has('time_rest')) r.push('시간에 맞추려고 휴식을 25% 줄였다. 메인 리프트는 휴식을 지키는 편이 낫다.');
    if (missing.length) r.push(`장비나 제약 때문에 채우지 못한 슬롯 ${missing.length}개는 비워 뒀다 (${[...new Set(missing.map(s => BL.PATTERNS[s.pats[0]] || s.pats[0]))].join(', ')}).`);

    return {
      id: uid(), name: opts.name || `${BL.GOALS[goal].n} · 주 ${days}일`, goal, level, daysPerWeek: days, sessionMinutes: minutes,
      createdAt: new Date().toISOString(), startDate: today(), active: true, weeks: 4, deloadWeek: 4, intro: level === 1,
      equipment: profile.equipment || [], restrictions: profile.restrictions || [], weakPoints: profile.weakPoints || [], seed,
      days: outDays, rationale: r
    };
  }

  // 같은 슬롯의 대안 (교체용)
  function alternatives(item, program, excludeIds) {
    const e = X[item.exId]; if (!e) return [];
    const ctx = { goal: program.goal, level: program.level, equip: program.equipment || [], exSet: excludedFlags(program.restrictions), weakSet: weakPats(program.weakPoints) };
    const slot = { pats: [e.pat], uni: e.uni ? true : undefined, lat: !!e.lat, role: item.role };
    let c = candidates(slot, ctx, 0); if (c.length < 3) c = candidates(slot, ctx, 1); if (c.length < 3) c = candidates(slot, ctx, 2);
    const ex = new Set(excludeIds || []);
    return c.filter(x => x.id !== e.id && !ex.has(x.id)).sort((a, b) => (b.g[program.goal] || 0) - (a.g[program.goal] || 0)).slice(0, 8);
  }

  // ───────── 주차·디로드·컨디션 보정 ─────────
  function programWeek(program, date) {
    if (!program || !program.startDate) return 1;
    return Math.floor(Math.max(0, diffDays(program.startDate, date || today())) / 7) + 1;
  }
  function weekInfo(program, date) {
    const w = programWeek(program, date);
    const cyc = program.weeks || 4;
    const inCycle = ((w - 1) % cyc) + 1;
    return { week: w, inCycle, deload: !!program.deloadWeek && inCycle === program.deloadWeek, intro: !!program.intro && w === 1 };
  }
  function readiness(m) {
    if (!m) return null;
    const parts = [];
    if (m.sleepH != null) parts.push(clamp(m.sleepH / 8, 0, 1));
    const sc = (v, inv) => v == null ? null : inv ? (5 - v) / 4 : (v - 1) / 4;
    [['sleepQ', false], ['soreness', true], ['fatigue', true], ['stress', true], ['mood', false]].forEach(([k, inv]) => { const v = sc(m[k], inv); if (v != null) parts.push(v); });
    if (!parts.length) return null;
    let score = Math.round(mean(parts) * 100);
    if (m.pain != null && m.pain >= 5) score = Math.min(score, 50);
    const label = score >= 75 ? '좋음' : score >= 55 ? '보통' : '낮음';
    const adjust = score < 55 ? { sets: -1, rpe: -1, note: '컨디션이 낮다. 오늘은 세트 1개 줄이고 RPE 1 낮춰서 가볍게.' } : (score < 75 ? { sets: 0, rpe: 0, note: '보통 컨디션. 표대로 하되 마지막 세트는 여유를 남긴다.' } : { sets: 0, rpe: 0, note: '컨디션 좋음. 표대로, 메인 리프트에서 무게를 올려 볼 날.' });
    return { score, label, adjust };
  }
  function adjustItem(item, info, ready) {
    const out = Object.assign({}, item);
    let sets = item.sets, rpe = item.rpe;
    const tags = [];
    if (info?.intro && item.role !== 'cond' && item.role !== 'mob') { sets -= 1; tags.push('첫 주 -1세트'); }
    if (info?.deload) { sets = Math.ceil(sets * 0.6); if (rpe) rpe -= 1; tags.push('디로드'); }
    if (ready?.adjust?.sets && item.role !== 'cond' && item.role !== 'mob') { sets += ready.adjust.sets; if (rpe) rpe += ready.adjust.rpe; tags.push('컨디션 보정'); }
    out.sets = Math.max(item.role === 'cond' ? 1 : 1, sets); out.rpe = rpe ? clamp(rpe, 5, 10) : 0; out.tags = tags;
    return out;
  }

  // ───────── 세션 분석 ─────────
  const INC = { bb_l: 5, bb_u: 2.5, db: 2, kb: 4, mach: 5, bw: 0, band: 0, time: 5, cardio: 0 };
  function roundTo(v, step) { return step ? Math.round(v / step) * step : v; }

  function workSets(s) {
    const out = [];
    (s.exercises || []).forEach(ex => (ex.sets || []).forEach(st => { if (isWork(st) && (st.w > 0 || st.r > 0 || st.t > 0)) out.push({ exId: ex.exId, w: +st.w || 0, r: +st.r || 0, t: +st.t || 0, rpe: +st.rpe || 0 }); }));
    return out;
  }
  function sessionLoad(s) {
    const dur = s.durationMin || (s.startedAt && s.endedAt ? Math.max(5, Math.round((new Date(s.endedAt) - new Date(s.startedAt)) / 60000)) : (s.type === 'strength' ? 50 : 60));
    let rpe = s.sRPE;
    if (!rpe) { const r = workSets(s).map(x => x.rpe).filter(Boolean); rpe = r.length ? mean(r) : (s.type === 'tennis' ? 6 : 6); }
    return Math.round(dur * rpe);
  }
  function tonnage(s) { return Math.round(sum(workSets(s).map(x => x.w * x.r))); }
  function doneSessions(sessions) { return sessions.filter(s => s.status === 'done'); }
  function lastPerformance(exId, sessions, beforeId) {
    const list = doneSessions(sessions).filter(s => s.id !== beforeId && (s.exercises || []).some(e => e.exId === exId && (e.sets || []).some(st => isWork(st)))).sort((a, b) => (b.date + b.endedAt).localeCompare(a.date + a.endedAt));
    if (!list.length) return null;
    const s = list[0]; const ex = s.exercises.find(e => e.exId === exId);
    const sets = ex.sets.filter(st => isWork(st)).map(st => ({ w: +st.w || 0, r: +st.r || 0, t: +st.t || 0, rpe: +st.rpe || 0 }));
    return { date: s.date, sets, note: ex.note || '', e1rm: Math.max(0, ...sets.map(st => e1rm(st.w, st.r, st.rpe))) };
  }
  function exerciseHistory(exId, sessions, n) {
    return doneSessions(sessions).filter(s => (s.exercises || []).some(e => e.exId === exId && (e.sets || []).some(st => isWork(st)))).sort((a, b) => b.date.localeCompare(a.date)).slice(0, n || 10).map(s => { const ex = s.exercises.find(e => e.exId === exId); const sets = ex.sets.filter(st => isWork(st)); return { date: s.date, sets, e1rm: Math.max(0, ...sets.map(st => e1rm(+st.w, +st.r, +st.rpe))), top: sets.reduce((a, b) => ((+b.w || 0) > (+a.w || 0) ? b : a), sets[0]) }; });
  }

  // 다음 세션 제안 (이중 진행 + RPE 자동조절)
  function suggestNext(ex, item, sessions, activeId) {
    const last = lastPerformance(ex.id, sessions, activeId);
    const out = { w: null, reps: null, note: '', last, dir: 0 };
    if (ex.mode === 'cardio') { out.note = last ? `지난번 ${last.sets[0]?.t ? Math.round(last.sets[0].t / 60) + '분' : ''} RPE ${last.sets[0]?.rpe || '-'}.` : '첫 세션: 대화 가능한 강도로 시작.'; return out; }
    if (!last) { out.note = ex.mode === 'reps' ? '첫 세션: 가볍게 시작해 RPE ' + (item.rpe || 7) + '이 되는 무게를 찾는다.' : '첫 세션: 자세가 유지되는 만큼만.'; return out; }
    const lastW = Math.max(...last.sets.map(s => s.w));
    const rpes = last.sets.map(s => s.rpe).filter(Boolean);
    const avgR = rpes.length ? mean(rpes) : null;
    const target = item.rpe || 7;
    if (ex.mode === 'time') {
      const lastT = Math.max(...last.sets.map(s => s.t));
      out.reps = null; out.time = lastT ? lastT + INC.time : item.time; out.note = `지난번 ${lastT}초 → ${out.time}초.`; out.dir = 1; return out;
    }
    const lo = item.reps ? item.reps[0] : 8, hi = item.reps ? item.reps[1] : 12;
    const allTop = last.sets.every(s => s.r >= hi);
    const anyBelow = last.sets.some(s => s.r < lo);
    const inc = INC[ex.inc] || 0;
    if (ex.mode === 'bw' || !inc) {
      if (allTop && (avgR == null || avgR <= target + 0.5)) { out.w = lastW || 0; out.reps = hi; out.dir = 1; out.note = lastW ? `모든 세트 ${hi}회 달성 → 무게를 조금 올리거나 더 어려운 변형으로.` : `모든 세트 ${hi}회 달성 → 덤벨·조끼로 부하를 더하거나 어려운 변형으로.`; }
      else if (anyBelow) { out.w = lastW || 0; out.reps = lo; out.dir = -1; out.note = `${lo}회 미달 세트가 있었다 → 같은 조건에서 반복 수 채우기.`; }
      else { out.w = lastW || 0; out.reps = Math.min(hi, Math.max(...last.sets.map(s => s.r)) + 1); out.dir = 0; out.note = `지난번 최대 ${Math.max(...last.sets.map(s => s.r))}회 → 오늘 ${out.reps}회 목표.`; }
      return out;
    }
    if (allTop && (avgR == null || avgR <= target + 0.5)) {
      const step = (ex.inc === 'bb_l' && lastW < 40) ? 2.5 : inc;
      out.w = roundTo(lastW + step, ROUND[ex.inc] || 1); out.reps = lo; out.dir = 1;
      out.note = `지난번 ${lastW}kg로 모든 세트 ${hi}회 (RPE ${avgR ? avgR.toFixed(1) : '-'}) → ${out.w}kg로 올리고 ${lo}회부터.`;
    } else if (anyBelow || (avgR != null && avgR >= target + 1.5)) {
      out.w = roundTo(lastW * 0.95, ROUND[ex.inc] || 1); out.reps = lo; out.dir = -1;
      out.note = anyBelow ? `${lo}회 미달 세트가 있었다 → ${out.w}kg로 5% 낮춰 반복 수부터.` : `RPE ${avgR.toFixed(1)}로 너무 힘들었다 → ${out.w}kg로 5% 낮춘다.`;
    } else {
      out.w = lastW; out.reps = Math.min(hi, Math.max(...last.sets.map(s => s.r)) + 1); out.dir = 0;
      out.note = `${lastW}kg 유지, 반복 수 +1 (목표 ${out.reps}회). 모든 세트 ${hi}회가 되면 무게를 올린다.`;
    }
    return out;
  }

  // PR 계산
  function prTable(sessions, beforeDate) {
    const t = {};
    doneSessions(sessions).forEach(s => {
      if (beforeDate && s.date > beforeDate) return;
      (s.exercises || []).forEach(ex => (ex.sets || []).forEach(st => {
        if (!isWork(st)) return; const w = +st.w || 0, r = +st.r || 0, tt = +st.t || 0;
        const rec = t[ex.exId] || (t[ex.exId] = { e1rm: 0, w: 0, r: 0, t: 0, reps: 0, date: null });
        const e = e1rm(w, r, +st.rpe);
        if (e > rec.e1rm) { rec.e1rm = e; rec.w = w; rec.r = r; rec.date = s.date; }
        if (w === 0 && r > rec.reps) { rec.reps = r; rec.date = rec.date || s.date; }
        if (tt > rec.t) { rec.t = tt; rec.date = rec.date || s.date; }
      }));
    });
    return t;
  }
  function sessionPRs(session, sessions) {
    const before = prTable(sessions.filter(s => s.id !== session.id && (s.date < session.date || (s.date === session.date && (s.endedAt || '') < (session.endedAt || '')))));
    const out = [];
    (session.exercises || []).forEach(ex => {
      const prev = before[ex.exId];
      let best = { e: 0, w: 0, r: 0, t: 0, reps: 0 };
      (ex.sets || []).forEach(st => { if (!isWork(st)) return; const e = e1rm(+st.w, +st.r, +st.rpe); if (e > best.e) best = { e, w: +st.w, r: +st.r }; if (!(+st.w) && +st.r > best.reps) best.reps = +st.r; if (+st.t > best.t) best.t = +st.t; });
      const x = X[ex.exId]; if (!x) return;
      if (best.e > 0 && (!prev || best.e > prev.e1rm + 0.01)) out.push({ exId: ex.exId, kind: 'e1rm', value: best.e, w: best.w, r: best.r, prev: prev ? prev.e1rm : 0 });
      else if (best.reps > 0 && (!prev || best.reps > prev.reps)) out.push({ exId: ex.exId, kind: 'reps', value: best.reps, prev: prev ? prev.reps : 0 });
      else if (best.t > 0 && (!prev || best.t > prev.t)) out.push({ exId: ex.exId, kind: 'time', value: best.t, prev: prev ? prev.t : 0 });
    });
    return out;
  }

  // 부하 (sRPE × 분) 일별·주별, ACWR
  function dailyLoads(sessions, from, to) {
    const map = {};
    doneSessions(sessions).forEach(s => {
      if (s.date < from || s.date > to) return;
      const d = map[s.date] || (map[s.date] = { total: 0, strength: 0, tennis: 0, cond: 0 });
      const L = sessionLoad(s); const k = s.type === 'tennis' ? 'tennis' : (s.type === 'strength' ? 'strength' : 'cond');
      d[k] += L; d.total += L;
    });
    return map;
  }
  function weeklyLoads(sessions, nWeeks, asOf) {
    asOf = asOf || today();
    const ws0 = weekStart(asOf);
    const out = [];
    for (let i = nWeeks - 1; i >= 0; i--) {
      const ws = addDays(ws0, -7 * i); const we = addDays(ws, 6);
      const dl = dailyLoads(sessions, ws, we);
      const agg = { weekStart: ws, strength: 0, tennis: 0, cond: 0, total: 0, sessions: 0 };
      Object.values(dl).forEach(d => { agg.strength += d.strength; agg.tennis += d.tennis; agg.cond += d.cond; agg.total += d.total; });
      agg.sessions = doneSessions(sessions).filter(s => s.date >= ws && s.date <= we).length;
      out.push(agg);
    }
    return out;
  }
  function acwr(sessions, asOf) {
    asOf = asOf || today();
    const done = doneSessions(sessions);
    if (!done.length) return { ratio: null, acute: 0, chronic: 0, status: 'none', days: 0 };
    const first = done.map(s => s.date).sort()[0];
    const days = diffDays(first, asOf) + 1;
    const dl = dailyLoads(sessions, addDays(asOf, -27), asOf);
    let acute = 0, total28 = 0;
    Object.entries(dl).forEach(([d, v]) => { total28 += v.total; if (diffDays(d, asOf) <= 6) acute += v.total; });
    const chronic = total28 / 4;
    const ratio = chronic > 0 ? acute / chronic : null;
    let status = 'ok';
    if (days < 21) status = 'insufficient';
    else if (ratio == null) status = 'none';
    else if (ratio > 1.5) status = 'danger';
    else if (ratio > 1.3) status = 'caution';
    else if (ratio < 0.8) status = 'low';
    return { ratio, acute: Math.round(acute), chronic: Math.round(chronic), status, days };
  }
  // 단조로움·긴장 (Foster)
  function monotony(sessions, asOf) {
    asOf = asOf || today();
    const ws = weekStart(asOf);
    const dl = dailyLoads(sessions, ws, addDays(ws, 6));
    const vals = []; for (let i = 0; i < 7; i++) { const d = addDays(ws, i); if (d > asOf) break; vals.push(dl[d]?.total || 0); }
    if (vals.length < 3) return null;
    const m = mean(vals); const sd = Math.sqrt(mean(vals.map(v => (v - m) ** 2)));
    const mono = sd > 0 ? m / sd : (m > 0 ? 9 : 0);
    return { monotony: mono, strain: Math.round(sum(vals) * mono) };
  }

  // 주간 근육군 세트 (주동 1, 보조 0.5)
  function groupVolume(sessions, from, to) {
    const g = {}; Object.keys(GROUPS).forEach(k => g[k] = 0);
    doneSessions(sessions).forEach(s => {
      if (s.date < from || s.date > to) return;
      (s.exercises || []).forEach(ex => {
        const x = X[ex.exId]; if (!x || x.mode === 'cardio' || x.pat === 'mob') return;
        const n = (ex.sets || []).filter(st => isWork(st)).length; if (!n) return;
        const pg = new Set(x.m.p.map(m => M[m]?.g).filter(Boolean)), sg = new Set(x.m.s.map(m => M[m]?.g).filter(Boolean));
        pg.forEach(k => g[k] += n); sg.forEach(k => { if (!pg.has(k)) g[k] += n * 0.5; });
      });
    });
    return g;
  }
  function muscleHeat(sessions, from, to) {
    const h = {};
    doneSessions(sessions).forEach(s => {
      if (s.date < from || s.date > to) return;
      (s.exercises || []).forEach(ex => {
        const x = X[ex.exId]; if (!x || x.mode === 'cardio') return;
        const n = (ex.sets || []).filter(st => isWork(st)).length; if (!n) return;
        x.m.p.forEach(m => h[m] = (h[m] || 0) + n); x.m.s.forEach(m => h[m] = (h[m] || 0) + n * 0.5);
      });
    });
    return h;
  }
  function e1rmSeries(sessions, exId) {
    return doneSessions(sessions).filter(s => (s.exercises || []).some(e => e.exId === exId)).sort((a, b) => a.date.localeCompare(b.date)).map(s => { const ex = s.exercises.find(e => e.exId === exId); const sets = (ex.sets || []).filter(st => isWork(st)); const best = Math.max(0, ...sets.map(st => e1rm(+st.w, +st.r, +st.rpe))); const topW = Math.max(0, ...sets.map(st => +st.w || 0)); const reps = Math.max(0, ...sets.map(st => +st.r || 0)); const t = Math.max(0, ...sets.map(st => +st.t || 0)); return { date: s.date, e1rm: best, w: topW, r: reps, t, sets: sets.length }; }).filter(p => p.e1rm > 0 || p.r > 0 || p.t > 0);
  }
  function adherence(program, sessions, asOf) {
    asOf = asOf || today(); const ws = weekStart(asOf), we = addDays(ws, 6);
    const done = doneSessions(sessions).filter(s => s.type === 'strength' && s.date >= ws && s.date <= we).length;
    return { planned: program ? program.daysPerWeek : 0, done };
  }
  function weekStreak(program, sessions, asOf) {
    if (!program) return 0;
    let streak = 0; let ws = weekStart(asOf || today());
    // 이번 주는 진행 중이므로 지난 주부터 센다
    for (let i = 1; i < 52; i++) {
      const s = addDays(ws, -7 * i), e = addDays(s, 6);
      if (s < weekStart(program.startDate)) break;
      const n = doneSessions(sessions).filter(x => x.type === 'strength' && x.date >= s && x.date <= e).length;
      if (n >= program.daysPerWeek) streak++; else break;
    }
    const cur = doneSessions(sessions).filter(x => x.type === 'strength' && x.date >= ws).length;
    if (cur >= program.daysPerWeek) streak++;
    return streak;
  }
  function nextDayIndex(program, sessions) {
    if (!program || !program.days.length) return 0;
    const n = doneSessions(sessions).filter(s => s.programId === program.id).length;
    return n % program.days.length;
  }

  // ───────── 코치 보고서 (마크다운) ─────────
  function buildReport(st) {
    const { profile, program, sessions, metrics, tests } = st;
    const t = today(); const d7 = addDays(t, -6), d28 = addDays(t, -27);
    const L = [];
    L.push(`# 베이스라인 주간 보고 (${d7} ~ ${t})`);
    if (profile) L.push(`- 프로필: ${profile.age || '?'}세 · ${profile.heightCm || '?'}cm · ${profile.weightKg || '?'}kg · 목표 ${BL.GOALS[profile.goal]?.n || '-'} · 수준 ${profile.level || '-'} · 제약 ${(profile.restrictions || []).map(k => BL.RESTRICTIONS[k]?.n).filter(Boolean).join(', ') || '없음'}`);
    if (program) { const wi = weekInfo(program); L.push(`- 프로그램: ${program.name} (${wi.week}주차${wi.deload ? ', 디로드' : ''}) · 주 ${program.daysPerWeek}일 · ${program.days.map(d => d.name).join(' / ')}`); }
    const a = acwr(sessions); const wl = weeklyLoads(sessions, 4);
    L.push(`- 주간 부하(AU = RPE×분): ${wl.map(w => `${w.weekStart.slice(5)}주 ${w.total} (근력 ${w.strength}, 테니스 ${w.tennis}, 유산소 ${w.cond})`).join(' · ')}`);
    L.push(`- ACWR: ${a.ratio != null ? a.ratio.toFixed(2) : '-'} (급성 ${a.acute} / 만성 ${a.chronic}) · 상태 ${a.status}`);
    const ad = adherence(program, sessions); L.push(`- 이번 주 근력 세션 ${ad.done}/${ad.planned}`);
    const recent = doneSessions(sessions).filter(s => s.date >= d7).sort((x, y) => x.date.localeCompare(y.date));
    L.push(''); L.push('## 최근 7일 세션');
    if (!recent.length) L.push('- 없음');
    recent.forEach(s => {
      if (s.type !== 'strength') { L.push(`- ${s.date} ${s.title || s.type}: ${s.durationMin || '?'}분, RPE ${s.sRPE || '?'}${s.serves ? `, 서브 ${s.serves}개` : ''}${s.painPost != null ? `, 통증 후 ${s.painPost}` : ''}${s.notes ? ` — ${s.notes}` : ''}`); return; }
      L.push(`- ${s.date} ${s.title || '근력'} (${s.durationMin || '?'}분, sRPE ${s.sRPE || '?'}, 통증 전 ${s.painPre ?? '-'} → 후 ${s.painPost ?? '-'})`);
      (s.exercises || []).forEach(ex => { const x = X[ex.exId]; const sets = (ex.sets || []).filter(st => isWork(st)); if (!sets.length) return; L.push(`  - ${x ? x.n : ex.exId}: ${sets.map(st => st.t ? `${st.t}초` : `${st.w || 0}×${st.r}${st.rpe ? '@' + st.rpe : ''}`).join(', ')}`); });
      if (s.notes) L.push(`  - 메모: ${s.notes}`);
    });
    const prs = prTable(sessions); const recentPR = recent.flatMap(s => sessionPRs(s, sessions).map(p => ({ ...p, date: s.date })));
    if (recentPR.length) { L.push(''); L.push('## 이번 주 PR'); recentPR.forEach(p => L.push(`- ${p.date} ${X[p.exId]?.n}: ${p.kind === 'e1rm' ? `e1RM ${p.value.toFixed(1)}kg (${p.w}×${p.r})` : p.kind === 'reps' ? `${p.value}회` : `${p.value}초`}`)); }
    const ms = (metrics || []).filter(m => m.date >= d28).sort((x, y) => x.date.localeCompare(y.date));
    if (ms.length) {
      L.push(''); L.push('## 컨디션·통증 (28일)');
      const pains = ms.filter(m => m.pain != null); if (pains.length) L.push(`- 통증 추이: ${pains.map(m => `${m.date.slice(5)} ${m.pain}`).join(', ')}`);
      const ws = ms.filter(m => m.weightKg); if (ws.length) L.push(`- 체중: ${ws[0].weightKg} → ${ws[ws.length - 1].weightKg}kg`);
      const last = ms[ms.length - 1]; const rd = readiness(last); if (rd) L.push(`- 최근 컨디션 점수 ${rd.score} (${rd.label}), 수면 ${last.sleepH ?? '-'}h`);
      const notes = ms.filter(m => m.notes).slice(-5); notes.forEach(m => L.push(`- ${m.date} 메모: ${m.notes}`));
    }
    const ts = (tests || []).sort((x, y) => y.date.localeCompare(x.date));
    if (ts.length) { L.push(''); L.push('## 체력 테스트 (최근)'); const seen = new Set(); ts.forEach(x => { if (seen.has(x.testId)) return; seen.add(x.testId); const def = BL.TESTS.find(d => d.id === x.testId); L.push(`- ${def ? def.n : x.testId}: ${x.value}${def ? def.unit : ''} (${x.date})`); }); }
    L.push(''); L.push('## 질문·요청'); L.push('- ');
    return L.join('\n');
  }

  BL.engine = {
    dstr, parse, addDays, diffDays, weekStart, today, clamp, mean, sum, uid, e1rm, isWork, warmupPlan, ROUND,
    rx, RX, ROLE_N, generateProgram, alternatives, hasEquip, excludedFlags, isExcluded, programWeek, weekInfo, readiness, adjustItem, INC,
    workSets, sessionLoad, tonnage, doneSessions, lastPerformance, exerciseHistory, suggestNext, prTable, sessionPRs,
    dailyLoads, weeklyLoads, acwr, monotony, groupVolume, muscleHeat, e1rmSeries, adherence, weekStreak, nextDayIndex, buildReport, estimateDay
  };
})(window.BL);
