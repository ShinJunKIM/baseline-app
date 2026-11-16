/* 베이스라인 · 참조 데이터: 근육 지도, 근육군, 운동 라이브러리, 목표, 제약, 테스트 */
window.BL = window.BL || {};
(function (BL) {
  'use strict';

  // ───────── 근육 그림 (앞/뒤 실루엣 + 근육 모양) ─────────
  BL.SIL = 'M100,50 L90,50 L88,62 Q72,66 58,72 Q44,78 42,96 Q40,112 42,130 L36,170 Q30,188 28,210 L24,246 Q18,262 24,280 Q30,284 34,276 L36,248 Q42,214 46,188 L50,172 Q58,150 60,120 L62,108 Q66,140 68,160 Q72,186 68,200 Q62,218 62,236 Q60,270 64,300 L68,330 Q64,350 66,380 L70,420 Q62,430 64,438 L96,440 L94,424 Q96,380 92,340 L94,326 Q98,290 98,262 L100,254 Z';
  BL.MIR = 'matrix(-1 0 0 1 200 0)';

  // sh: [view(f/b), layer(s=겉/d=속), path]
  BL.MUSCLES = [
    { id: 'scm', n: '흉쇄유돌근', en: 'Sternocleidomastoid', g: 'core', sh: [['f', 's', 'M86,42 L90,41 L99,65 L95,66 Z']] },
    { id: 'trap-upper', n: '승모근 상부', en: 'Upper trapezius', g: 'back', sh: [['f', 's', 'M88,50 L91,61 L74,72 L63,73 Q74,62 88,50 Z'], ['b', 's', 'M100,46 L94,50 L90,60 Q74,66 62,74 L70,80 L100,82 Z']] },
    { id: 'trap-mid', n: '승모근 중부', en: 'Middle trapezius', g: 'back', sh: [['b', 's', 'M70,80 L100,82 L100,112 L88,106 Q80,94 70,80 Z']] },
    { id: 'trap-lower', n: '승모근 하부', en: 'Lower trapezius', g: 'shoulder', sh: [['b', 's', 'M88,106 L100,112 L100,172 L93,142 Z']] },
    { id: 'rhomboid', n: '능형근', en: 'Rhomboids', g: 'back', sh: [['b', 'd', 'M100,84 L92,88 L88,124 L100,130 Z']] },
    { id: 'pec', n: '대흉근', en: 'Pectoralis major', g: 'chest', sh: [['f', 's', 'M99,70 L72,72 Q64,78 62,92 L62,100 Q76,112 88,118 L99,118 Z']] },
    { id: 'pec-minor', n: '소흉근', en: 'Pectoralis minor', g: 'chest', sh: [['f', 'd', 'M66,82 L71,80 L88,100 L86,112 L80,110 Z']] },
    { id: 'serratus', n: '전거근', en: 'Serratus anterior', g: 'shoulder', sh: [['f', 's', 'M64,110 L76,116 L75,121 L64,117 Z M65,121 L78,128 L77,133 L65,128 Z M66,132 L79,139 L78,144 L67,139 Z']] },
    { id: 'intercostal', n: '늑간근', en: 'Intercostals', g: 'core', sh: [['f', 'd', 'M66,104 L88,116 L88,152 L70,150 Q68,128 66,104 Z']] },
    { id: 'ext-oblique', n: '외복사근', en: 'External oblique', g: 'core', sh: [['f', 's', 'M68,146 L80,148 L86,196 L76,212 L71,203 Q72,182 69,162 Z'], ['b', 's', 'M70,168 L74,172 Q76,190 76,204 L70,204 Q72,186 70,168 Z']] },
    { id: 'int-oblique', n: '내복사근', en: 'Internal oblique', g: 'core', sh: [['f', 'd', 'M68,150 L86,152 L88,200 L76,214 L69,204 Q71,180 68,160 Z']] },
    { id: 'transversus', n: '복횡근', en: 'Transversus abdominis', g: 'core', sh: [['f', 'd', 'M86,168 L98.5,168 L98.5,236 L90,228 Q86,210 86,168 Z']] },
    { id: 'rectus-ab', n: '복직근', en: 'Rectus abdominis', g: 'core', sh: [['f', 's', 'M88,120 L98.5,120 L98.5,140 L87,140 Z M87,143 L98.5,143 L98.5,163 L86.5,163 Z M86.5,166 L98.5,166 L98.5,188 L86.5,188 Z M86.5,191 L98.5,191 L98.5,238 Q92,232 88,212 Z']] },
    { id: 'lat', n: '광배근', en: 'Latissimus dorsi', g: 'back', sh: [['b', 's', 'M62,114 L80,134 L92,140 L100,150 L100,196 L84,200 Q72,190 70,176 Q66,150 65,128 Z']] },
    { id: 'erector', n: '척추기립근', en: 'Erector spinae', g: 'core', sh: [['b', 'd', 'M90,96 L99,96 L99,230 L89,230 Q86,160 90,96 Z']] },
    { id: 'ql', n: '요방형근', en: 'Quadratus lumborum', g: 'core', sh: [['b', 'd', 'M78,188 L88,190 L88,214 L79,212 Z']] },
    { id: 'tlf', n: '흉요근막', en: 'Thoracolumbar fascia', g: 'back', sh: [['b', 's', 'M100,182 L86,196 L88,222 L100,232 Z']] },
    { id: 'delt-front', n: '삼각근 (앞·옆)', en: 'Anterior/lateral deltoid', g: 'shoulder', sh: [['f', 's', 'M68,70 Q54,70 47,80 Q42,92 43,108 L46,122 Q52,112 56,97 Q60,84 68,76 Z']] },
    { id: 'delt-rear', n: '삼각근 (뒤)', en: 'Posterior deltoid', g: 'shoulder', sh: [['b', 's', 'M62,72 Q50,74 47,82 Q42,94 43,108 L46,122 Q50,110 56,98 Q62,88 70,82 Z']] },
    { id: 'supraspinatus', n: '극상근', en: 'Supraspinatus', g: 'shoulder', sh: [['b', 'd', 'M70,78 L94,84 L92,90 L72,86 Z']] },
    { id: 'infraspinatus', n: '극하근', en: 'Infraspinatus', g: 'shoulder', sh: [['b', 's', 'M74,92 L88,100 L88,118 L80,122 Q72,110 74,92 Z']] },
    { id: 'teres-minor', n: '소원근', en: 'Teres minor', g: 'shoulder', sh: [['b', 's', 'M77,118 L62,104 L60,110 L75,124 Z']] },
    { id: 'teres-major', n: '대원근', en: 'Teres major', g: 'back', sh: [['b', 's', 'M80,126 L61,112 L61,120 L79,134 Z']] },
    { id: 'biceps', n: '상완이두근', en: 'Biceps brachii', g: 'arms', sh: [['f', 's', 'M48,112 Q58,122 55,150 Q51,166 46,168 Q40,160 41,140 Q42,120 48,112 Z']] },
    { id: 'triceps', n: '상완삼두근', en: 'Triceps brachii', g: 'arms', sh: [['b', 's', 'M48,112 Q58,122 55,150 Q51,166 46,168 Q40,160 41,140 Q42,120 48,112 Z']] },
    { id: 'forearm-flex', n: '전완 굴곡근', en: 'Forearm flexors', g: 'arms', sh: [['f', 's', 'M40,174 Q48,178 44,194 L36,244 L30,244 Q30,214 34,192 Q36,180 40,174 Z']] },
    { id: 'forearm-ext', n: '전완 신전근', en: 'Forearm extensors', g: 'arms', sh: [['b', 's', 'M40,174 Q48,178 44,194 L36,244 L30,244 Q30,214 34,192 Q36,180 40,174 Z']] },
    { id: 'glute-max', n: '대둔근', en: 'Gluteus maximus', g: 'glute', sh: [['b', 's', 'M100,212 L82,206 Q66,214 64,236 Q66,256 80,262 L99,256 Z']] },
    { id: 'glute-med', n: '중둔근', en: 'Gluteus medius', g: 'glute', sh: [['b', 's', 'M70,198 L88,200 L80,208 Q68,214 64,226 Q62,210 70,198 Z']] },
    { id: 'piriformis', n: '이상근', en: 'Piriformis', g: 'glute', sh: [['b', 'd', 'M98,228 L72,236 L72,242 L98,236 Z']] },
    { id: 'iliopsoas', n: '장요근', en: 'Iliopsoas', g: 'hipflex', sh: [['f', 'd', 'M92,178 L98,180 L97,230 L88,256 L82,252 L90,226 Z']] },
    { id: 'tfl', n: '대퇴근막장근', en: 'Tensor fasciae latae', g: 'hipflex', sh: [['f', 's', 'M65,212 L73,220 L73,238 L65,246 Q63,230 65,212 Z']] },
    { id: 'itb', n: '장경인대', en: 'Iliotibial band', g: 'hipflex', sh: [['b', 's', 'M62,244 L66,244 Q66,290 70,328 L67,328 Q61,290 62,244 Z']] },
    { id: 'rectus-fem', n: '대퇴직근', en: 'Rectus femoris', g: 'quad', sh: [['f', 's', 'M80,238 Q88,244 88,272 L84,318 L78,318 Q73,284 75,252 Z']] },
    { id: 'vastus-lat', n: '외측광근', en: 'Vastus lateralis', g: 'quad', sh: [['f', 's', 'M64,246 Q72,250 74,264 Q74,292 78,322 L71,326 Q63,304 62,272 Q62,256 64,246 Z']] },
    { id: 'vastus-med', n: '내측광근', en: 'Vastus medialis', g: 'quad', sh: [['f', 's', 'M88,292 Q96,300 93,318 Q87,328 82,322 L86,298 Z']] },
    { id: 'sartorius', n: '봉공근', en: 'Sartorius', g: 'hipflex', sh: [['f', 's', 'M70,228 L75,228 Q86,268 93,326 L89,328 Q80,272 70,228 Z']] },
    { id: 'adductors', n: '내전근', en: 'Adductors', g: 'add', sh: [['f', 's', 'M92,250 L99,256 Q98,272 93,292 L89,292 Q88,266 92,250 Z'], ['b', 's', 'M93,262 L98,260 L96,300 L93,300 Z']] },
    { id: 'biceps-fem', n: '대퇴이두근', en: 'Biceps femoris', g: 'ham', sh: [['b', 's', 'M70,262 Q78,268 79,296 L77,326 L72,326 Q68,300 68,276 Z']] },
    { id: 'semi', n: '반건양근·반막양근', en: 'Semitendinosus/semimembranosus', g: 'ham', sh: [['b', 's', 'M82,262 Q92,266 92,290 L88,326 L82,326 Q80,296 80,264 Z']] },
    { id: 'gastroc', n: '비복근', en: 'Gastrocnemius', g: 'calf', sh: [['f', 's', 'M86,340 Q94,350 93,374 L88,382 Q85,362 86,340 Z'], ['b', 's', 'M70,336 Q66,354 72,374 L79,378 L79,340 Z M81,340 L81,378 L88,374 Q96,356 90,336 Z']] },
    { id: 'soleus', n: '가자미근', en: 'Soleus', g: 'calf', sh: [['b', 's', 'M68,370 Q68,390 74,402 L86,402 Q92,390 92,370 L88,378 L72,378 Z']] },
    { id: 'achilles', n: '아킬레스건', en: 'Achilles tendon', g: 'calf', sh: [['b', 's', 'M77,400 L84,400 L83,424 L78,424 Z']] },
    { id: 'tib-ant', n: '전경골근', en: 'Tibialis anterior', g: 'calf', sh: [['f', 's', 'M74,340 Q81,344 80,362 L78,412 L75,412 Q72,372 72,352 Z']] },
    { id: 'peroneus', n: '비골근', en: 'Peroneals', g: 'calf', sh: [['f', 's', 'M67,344 L71,344 Q72,368 72,396 L69,396 Q65,370 67,344 Z']] }
  ];
  BL.M = Object.fromEntries(BL.MUSCLES.map(m => [m.id, m]));

  // 근육군 (주간 볼륨 집계 단위)
  BL.GROUPS = {
    quad: { n: '대퇴사두', short: '앞허벅지' },
    ham: { n: '햄스트링', short: '뒤허벅지' },
    glute: { n: '둔근', short: '엉덩이' },
    add: { n: '내전근', short: '안허벅지' },
    calf: { n: '종아리·정강이', short: '종아리' },
    hipflex: { n: '고관절 굴곡근', short: '고관절 앞' },
    chest: { n: '가슴', short: '가슴' },
    back: { n: '등', short: '등' },
    shoulder: { n: '어깨·회전근개', short: '어깨' },
    arms: { n: '팔·전완', short: '팔' },
    core: { n: '코어', short: '코어' }
  };
  BL.GROUP_ORDER = ['quad', 'ham', 'glute', 'add', 'calf', 'hipflex', 'back', 'chest', 'shoulder', 'arms', 'core'];
  // 목표별 주간 권장 세트 범위 (근육군당, 직접+간접 0.5 가중)
  BL.VOLUME_BAND = {
    tennis: { lower: [8, 16], upper: [6, 12], core: [6, 12] },
    strength: { lower: [8, 15], upper: [8, 15], core: [4, 10] },
    hypertrophy: { lower: [10, 20], upper: [10, 20], core: [6, 12] },
    fatloss: { lower: [8, 16], upper: [8, 16], core: [6, 12] },
    rehab: { lower: [6, 12], upper: [4, 10], core: [6, 12] },
    general: { lower: [6, 12], upper: [6, 12], core: [4, 10] }
  };
  BL.GROUP_CLASS = { quad: 'lower', ham: 'lower', glute: 'lower', add: 'lower', calf: 'lower', hipflex: 'lower', chest: 'upper', back: 'upper', shoulder: 'upper', arms: 'upper', core: 'core' };

  // ───────── 목표 ─────────
  BL.GOALS = {
    tennis: { n: '테니스 퍼포먼스', d: '폭발력, 방향 전환, 회전 파워, 부상 예방. 코트에서 더 빠르고 오래 뛰기.' },
    strength: { n: '근력', d: '스쿼트·데드리프트·프레스 같은 주요 리프트의 중량을 올리기.' },
    hypertrophy: { n: '근비대', d: '근육량을 늘리기. 세트 수와 반복 수를 충분히 쌓는다.' },
    fatloss: { n: '체지방 감량', d: '근육을 지키면서 체지방을 줄이기. 밀도 높은 근력 + 유산소.' },
    rehab: { n: '통증 회복·복귀', d: '아픈 부위를 피해 기초를 다지고 단계적으로 돌아오기.' },
    general: { n: '기초 체력', d: '전신 균형, 체력, 건강. 부담 없이 꾸준히.' }
  };

  BL.LEVELS = { 1: '초급 (근력 운동 6개월 미만)', 2: '중급 (6개월~2년)', 3: '상급 (2년 이상)' };

  BL.EQUIP = {
    db: '덤벨', bb: '바벨·랙', kb: '케틀벨', band: '밴드 (루프·미니)', bench: '벤치', box: '박스·스텝', cable: '케이블', machine: '머신', mb: '메디신볼', bar: '철봉', bike: '실내 자전거', rower: '로잉 머신', trapbar: '트랩바', rope: '줄넘기'
  };

  // 제약 → 제외할 운동 플래그
  BL.RESTRICTIONS = {
    rib: { n: '갈비·옆구리 통증', ex: ['trunk_rot', 'overhead', 'push', 'plank', 'core_flex', 'core_lat', 'impact_upper'], note: '몸통 비틀기, 머리 위 동작, 밀기, 플랭크 계열을 뺀다.' },
    shoulder: { n: '어깨 통증', ex: ['overhead', 'push', 'dip', 'shoulder_abd'], note: '머리 위 동작과 무거운 밀기를 뺀다.' },
    elbow: { n: '팔꿈치 통증 (테니스 엘보)', ex: ['grip_heavy', 'wrist', 'dip'], note: '무거운 그립과 손목 부담 동작을 뺀다.' },
    wrist: { n: '손목 통증', ex: ['wrist', 'push', 'grip_heavy'], note: '손목을 꺾어 체중을 싣는 동작을 뺀다.' },
    lowback: { n: '허리 통증', ex: ['spinal_load', 'core_flex', 'hinge_heavy', 'impact'], note: '척추에 큰 하중이 걸리는 동작과 허리 굽히기를 뺀다.' },
    hip: { n: '고관절 통증', ex: ['deep_hip', 'knee_deep', 'impact'], note: '깊은 고관절 굴곡과 충격 동작을 뺀다.' },
    knee: { n: '무릎 통증', ex: ['knee_deep', 'impact', 'plyo'], note: '깊은 무릎 굽힘과 점프를 뺀다.' },
    ankle: { n: '발목 통증', ex: ['impact', 'plyo', 'lateral_cut'], note: '점프와 옆 방향 급정지를 뺀다.' }
  };

  // 약점 → 가중치 줄 패턴
  BL.WEAK = {
    hips: { n: '고관절·둔근', pats: ['hip_iso', 'lateral', 'hinge'] },
    core: { n: '코어', pats: ['core_anti', 'core_rot'] },
    shoulder_health: { n: '어깨 건강 (서브)', pats: ['cuff'] },
    calves: { n: '종아리·발목', pats: ['calf'] },
    posterior: { n: '햄스트링', pats: ['ham_iso', 'hinge'] },
    upper_back: { n: '등·자세', pats: ['pull_h', 'cuff'] },
    grip: { n: '그립·전완', pats: ['carry', 'arm_fore'] },
    power: { n: '폭발력', pats: ['plyo', 'power', 'plyo_lat'] },
    conditioning: { n: '심폐 지구력', pats: ['cond'] },
    mobility: { n: '가동성', pats: ['mob'] }
  };

  BL.PATTERNS = {
    squat: '스쿼트', hinge: '힙힌지', lunge: '런지·한 발', lateral: '옆 방향', push_h: '수평 밀기', push_v: '수직 밀기', pull_h: '수평 당기기', pull_v: '수직 당기기',
    core_anti: '코어 (버티기)', core_rot: '코어 (회전)', core_flex: '코어 (굽힘)', core_ext: '코어 (신전)', plyo: '점프·파워', plyo_lat: '옆 점프', power: '파워 (힌지)', sprint: '스프린트·민첩성', cond: '유산소',
    calf: '종아리', cuff: '어깨 건강', arm_bi: '이두', arm_tri: '삼두', arm_fore: '전완', delt: '어깨 측면', mob: '가동성', carry: '캐리', hip_iso: '둔근 분리', ham_iso: '햄스트링 분리', quad_iso: '대퇴사두 분리'
  };

  // ───────── 운동 라이브러리 ─────────
  // eq: 필요한 장비 (배열 안의 배열은 "이 중 하나"). mode: reps(무게×회) | bw(맨몸 회수) | time(초) | cardio(분)
  // inc: 진행 단위 bb_l(+5) bb_u(+2.5) db(+2) kb(+4) mach(+5) bw(회수) band(밴드 단계) time(+5초) cardio(+분)
  // f: 플래그. g: 목표별 우선순위 0~3. m.p 주동근, m.s 보조근 (근육 id)
  const E = [];
  const add = (o) => { o.g = Object.assign({ tennis: 1, strength: 1, hypertrophy: 1, fatloss: 1, rehab: 1, general: 1 }, o.g || {}); o.f = o.f || []; o.eq = o.eq || []; o.mode = o.mode || 'reps'; o.lv = o.lv || 1; o.m = o.m || { p: [], s: [] }; E.push(o); };

  // 스쿼트 계열
  add({ id: 'goblet', n: '고블릿 스쿼트', en: 'Goblet squat', pat: 'squat', eq: [['db', 'kb']], lv: 1, inc: 'db', m: { p: ['rectus-fem', 'vastus-lat', 'vastus-med', 'glute-max'], s: ['adductors', 'rectus-ab', 'erector'] }, f: ['knee_deep'], g: { tennis: 2, strength: 1, hypertrophy: 2, fatloss: 2, rehab: 3, general: 3 }, cue: '덤벨을 가슴에 붙여 들고 앉는다. 뒤꿈치가 뜨지 않게, 무릎은 발끝 방향.', v: ['8_67S2zKfvE', '스쿼트 중 가장 쉬운 가블릿스쿼트', '3분 운동과학', '3:56'] });
  add({ id: 'bb_back_squat', n: '바벨 백스쿼트', en: 'Barbell back squat', pat: 'squat', eq: [['bb']], lv: 2, inc: 'bb_l', m: { p: ['rectus-fem', 'vastus-lat', 'vastus-med', 'glute-max'], s: ['adductors', 'erector', 'biceps-fem'] }, f: ['knee_deep', 'spinal_load'], g: { tennis: 2, strength: 3, hypertrophy: 3, fatloss: 1, rehab: 0, general: 1 }, cue: '바를 승모근 위에 얹고, 숨을 들이마셔 배를 단단히 한 뒤 앉는다. 올라올 때 엉덩이와 가슴이 같이 올라온다.', v: ['Rbccyr0voHY', '헬린이 탈출! 바벨 스쿼트 제대로 하는법', '제로범TV', '8:04'] });
  add({ id: 'front_squat', n: '프론트 스쿼트', en: 'Front squat', pat: 'squat', eq: [['bb']], lv: 3, inc: 'bb_l', m: { p: ['rectus-fem', 'vastus-lat', 'vastus-med', 'glute-max'], s: ['erector', 'rectus-ab', 'trap-upper'] }, f: ['knee_deep', 'spinal_load', 'wrist'], g: { tennis: 2, strength: 2, hypertrophy: 2, rehab: 0 }, cue: '팔꿈치를 높이 들어 바를 어깨 앞에 얹는다. 상체를 세운 채 앉는다.', v: ['MHlbYZgOlEQ', '초보자가 프론트 스쿼트를 잘하기 위해 꼭 필요한 2가지 자세', '상피코치', '3:45'] });
  add({ id: 'box_squat', n: '박스 스쿼트', en: 'Box squat', pat: 'squat', eq: [['box', 'bench']], lv: 1, inc: 'db', m: { p: ['glute-max', 'rectus-fem', 'vastus-lat'], s: ['biceps-fem', 'adductors'] }, f: [], g: { tennis: 1, strength: 1, rehab: 3, general: 2 }, cue: '박스에 엉덩이가 살짝 닿을 때까지 앉았다가 튕기지 않고 일어난다. 무릎이 아플 때 깊이를 조절하기 좋다.' });
  add({ id: 'leg_press', n: '레그 프레스', en: 'Leg press', pat: 'squat', eq: [['machine']], lv: 1, inc: 'mach', m: { p: ['rectus-fem', 'vastus-lat', 'vastus-med', 'glute-max'], s: ['adductors'] }, f: ['knee_deep'], g: { tennis: 1, strength: 2, hypertrophy: 3, fatloss: 2, rehab: 2, general: 2 }, cue: '허리가 패드에서 말려 올라오지 않는 깊이까지만. 무릎을 끝까지 잠그지 않는다.', v: ['_DMpbsVyphs', '헬린이 가이드 / 시티드 레그프레스 사용법 / 발 위치 포인트', '쁨기적', '2:54'] });

  // 런지·한 발
  add({ id: 'split_squat', n: '스플릿 스쿼트', en: 'Split squat', pat: 'lunge', uni: true, eq: [], lv: 1, inc: 'db', m: { p: ['rectus-fem', 'vastus-med', 'glute-max'], s: ['adductors', 'glute-med'] }, f: [], g: { tennis: 2, rehab: 3, general: 2, hypertrophy: 1 }, cue: '앞뒤로 벌리고 제자리에서 내려갔다 올라온다. 앞발 뒤꿈치로 민다.' });
  add({ id: 'bss', n: '불가리안 스플릿 스쿼트', en: 'Bulgarian split squat', pat: 'lunge', uni: true, eq: [['bench', 'box']], lv: 2, inc: 'db', m: { p: ['rectus-fem', 'vastus-lat', 'vastus-med', 'glute-max'], s: ['adductors', 'glute-med', 'biceps-fem'] }, f: ['knee_deep'], g: { tennis: 3, strength: 2, hypertrophy: 3, fatloss: 2, rehab: 1, general: 2 }, cue: '뒷발을 벤치에 올리고 앞발 뒤꿈치로 바닥을 민다. 무릎이 안으로 무너지지 않게.', v: ['pL9EFLzraYk', '허리에 안전한 하체 운동 - 불가리안 스플릿 스쿼트', '채코치의 운동생활', '3:21'] });
  add({ id: 'rev_lunge', n: '리버스 런지', en: 'Reverse lunge', pat: 'lunge', uni: true, eq: [], lv: 1, inc: 'db', m: { p: ['glute-max', 'rectus-fem', 'vastus-med'], s: ['biceps-fem', 'glute-med'] }, f: [], g: { tennis: 2, fatloss: 2, general: 2, rehab: 2 }, cue: '뒤로 딛고 앞다리로 일어난다. 앞으로 딛는 런지보다 무릎 부담이 적다.', v: ['7erin-2cpRo', '런지! 잘못하시면 무릎박살납니다', '이득근', '7:37'] });
  add({ id: 'walking_lunge', n: '워킹 런지', en: 'Walking lunge', pat: 'lunge', uni: true, eq: [], lv: 1, inc: 'db', m: { p: ['glute-max', 'rectus-fem', 'vastus-lat'], s: ['biceps-fem', 'glute-med', 'gastroc'] }, f: [], g: { tennis: 2, hypertrophy: 2, fatloss: 3, general: 2 }, cue: '보폭은 무릎이 90도가 되는 정도. 상체는 세우고 시선은 앞.', v: ['gltEwrNd5Z8', '엉짱 심으뜸이 알려주는 런지의 정석', '힙으뜸', '15:37'] });
  add({ id: 'stepup', n: '덤벨 스텝업', en: 'Step-up', pat: 'lunge', uni: true, eq: [['box', 'bench']], lv: 1, inc: 'db', m: { p: ['glute-max', 'rectus-fem', 'vastus-med'], s: ['glute-med', 'gastroc'] }, f: [], g: { tennis: 3, fatloss: 2, rehab: 2, general: 2 }, cue: '올린 다리로만 밀어 올라간다. 아래 발로 튕기지 않는다. 박스는 무릎 높이.', v: ['6XoY-PAKcjI', '스텝업 - 하체운동 루틴에 꼭 넣는 힙업운동', '핏블리 FITVELY', '7:14'] });

  // 옆 방향
  add({ id: 'lat_lunge', n: '사이드 런지', en: 'Lateral lunge', pat: 'lateral', uni: true, lat: true, eq: [], lv: 1, inc: 'db', m: { p: ['adductors', 'glute-max', 'rectus-fem', 'vastus-lat'], s: ['glute-med', 'biceps-fem'] }, f: ['lateral_cut'], g: { tennis: 3, rehab: 2, general: 2, fatloss: 2 }, cue: '옆으로 크게 딛고 엉덩이를 뒤로 빼며 앉는다. 반대 다리는 쭉. 와이드 볼을 받는 자세.', v: ['BJ8llND5uWY', '사이드런지 3분 자세교정 핵심강좌', '김기웅PT이야기', '3:12'] });
  add({ id: 'cossack', n: '코사크 스쿼트', en: 'Cossack squat', pat: 'lateral', uni: true, lat: true, eq: [], lv: 2, inc: 'db', m: { p: ['adductors', 'glute-max', 'vastus-med'], s: ['glute-med', 'biceps-fem'] }, f: ['knee_deep', 'deep_hip'], g: { tennis: 2, general: 1 }, cue: '넓게 서서 한쪽으로 끝까지 앉고 반대 다리는 펴서 발끝을 든다. 가동성 운동을 겸한다.' });
  add({ id: 'lateral_stepup', n: '래터럴 스텝업', en: 'Lateral step-up', pat: 'lateral', uni: true, lat: true, eq: [['box', 'bench']], lv: 1, inc: 'db', m: { p: ['glute-med', 'glute-max', 'vastus-med'], s: ['adductors'] }, f: [], g: { tennis: 2, rehab: 3 }, cue: '박스 옆에 서서 옆으로 올라간다. 골반이 기울지 않게 수평 유지.' });

  // 힙힌지
  add({ id: 'rdl', n: '덤벨 루마니안 데드리프트', en: 'Dumbbell RDL', pat: 'hinge', eq: [['db', 'kb']], lv: 1, inc: 'db', m: { p: ['biceps-fem', 'semi', 'glute-max'], s: ['erector', 'forearm-flex', 'lat'] }, f: ['hinge_heavy'], g: { tennis: 3, strength: 2, hypertrophy: 3, fatloss: 2, rehab: 3, general: 3 }, cue: '무릎은 살짝만 굽히고 엉덩이를 뒤로 민다. 허벅지 뒤가 당기면 거기서 올라온다. 등은 일자.', v: ['hRVNKm9K4zU', '루마니안 데드리프트 정석 (허리 통증 없이 운동하는 법)', '채코치의 운동생활', '4:36'] });
  add({ id: 'bb_rdl', n: '바벨 루마니안 데드리프트', en: 'Barbell RDL', pat: 'hinge', eq: [['bb']], lv: 2, inc: 'bb_l', m: { p: ['biceps-fem', 'semi', 'glute-max'], s: ['erector', 'forearm-flex', 'lat'] }, f: ['spinal_load', 'hinge_heavy'], g: { tennis: 2, strength: 3, hypertrophy: 3, rehab: 0 }, cue: '바를 허벅지에 붙여 내린다. 정강이 중간쯤에서 햄스트링이 당기면 엉덩이를 밀어 올라온다.', v: ['ApwgInFmCjg', '데드리프트 제대로 구별하기 루마니안 & 스티프', '양선수의 온라인PT', '4:06'] });
  add({ id: 'trapbar_dl', n: '트랩바 데드리프트', en: 'Trap bar deadlift', pat: 'hinge', eq: [['trapbar']], lv: 2, inc: 'bb_l', m: { p: ['glute-max', 'rectus-fem', 'vastus-lat', 'biceps-fem', 'erector'], s: ['trap-upper', 'forearm-flex'] }, f: ['spinal_load'], g: { tennis: 3, strength: 3, hypertrophy: 2, rehab: 0, general: 2 }, cue: '손잡이를 잡고 가슴을 들며 다리로 바닥을 민다. 허리 부담이 적어 운동선수들이 많이 쓴다.', v: ['A6qPH34NgWQ', '허리통증 절대 없는 데드리프트, 트랩바 완벽 가이드', '파워게르만POGER', '5:28'] });
  add({ id: 'conv_dl', n: '컨벤셔널 데드리프트', en: 'Conventional deadlift', pat: 'hinge', eq: [['bb']], lv: 3, inc: 'bb_l', m: { p: ['glute-max', 'biceps-fem', 'erector', 'rectus-fem'], s: ['lat', 'trap-upper', 'forearm-flex'] }, f: ['spinal_load', 'hinge_heavy', 'grip_heavy'], g: { tennis: 1, strength: 3, hypertrophy: 2, rehab: 0 }, cue: '바를 정강이에 붙이고, 등을 편 채 다리로 민다. 바가 무릎을 지나면 엉덩이를 앞으로.', v: ['HX9WJ6-b1to', '데드리프트 이거 하나로 정리 끝! (루마니안·컨벤셔널·스티프)', '철든보라', '16:44'] });
  add({ id: 'kb_swing', n: '케틀벨 스윙', en: 'Kettlebell swing', pat: 'power', eq: [['kb']], lv: 2, inc: 'kb', m: { p: ['glute-max', 'biceps-fem', 'semi'], s: ['erector', 'lat', 'forearm-flex', 'rectus-ab'] }, f: ['hinge_heavy', 'grip_heavy'], g: { tennis: 3, strength: 1, fatloss: 3, general: 2, rehab: 0 }, cue: '팔이 아니라 엉덩이로 던진다. 가슴 높이까지만. 바닥에서 엉덩이를 세게 펴는 순간이 핵심.', v: ['4GYcTFp-1sw', '케틀벨 스윙 한번 배워보쟈!!', '운동하는의사, 닥터스핏', '3:10'] });
  add({ id: 'sl_rdl', n: '싱글레그 루마니안 데드리프트', en: 'Single-leg RDL', pat: 'hinge', uni: true, eq: [], lv: 2, inc: 'db', m: { p: ['biceps-fem', 'semi', 'glute-max', 'glute-med'], s: ['peroneus', 'erector', 'tib-ant'] }, f: [], g: { tennis: 3, rehab: 2, general: 2, hypertrophy: 1 }, cue: '한 발로 서서 몸을 시소처럼 숙인다. 골반이 열리지 않게 수평. 처음엔 벽을 짚고.', v: ['FLizONunPyI', '데드리프트 VS 한다리데드리프트', '3분 운동과학', '3:57'] });
  add({ id: 'hip_thrust', n: '힙 쓰러스트', en: 'Hip thrust', pat: 'hinge', eq: [['bench']], lv: 1, inc: 'bb_l', m: { p: ['glute-max'], s: ['biceps-fem', 'semi', 'rectus-ab'] }, f: [], g: { tennis: 2, strength: 1, hypertrophy: 3, fatloss: 2, rehab: 2, general: 2 }, cue: '등 윗부분을 벤치에 걸치고 엉덩이로 들어 1초 멈춘다. 허리를 꺾지 않고 턱은 당긴다.', v: ['oKvKNXfmdY0', '엉덩이 키우려면 스쿼트말고 힙쓰러스트 먼저하세요', '핏블리 FITVELY', '8:10'] });
  add({ id: 'glute_bridge', n: '글루트 브릿지', en: 'Glute bridge', pat: 'hinge', eq: [], lv: 1, inc: 'bw', mode: 'bw', m: { p: ['glute-max'], s: ['biceps-fem', 'rectus-ab'] }, f: [], g: { tennis: 1, rehab: 3, general: 2 }, cue: '누워서 무릎을 세우고 엉덩이를 들어 올린다. 갈비뼈가 들리지 않게 배에 힘.', v: ['9Ej9hh-D0is', '90%가 모르는 브릿지의 정석 / 통증없는 브릿지', '문쌤재활', '4:49'] });
  add({ id: 'nordic', n: '노르딕 햄스트링 컬', en: 'Nordic hamstring curl', pat: 'ham_iso', eq: [], lv: 3, inc: 'bw', mode: 'bw', m: { p: ['biceps-fem', 'semi'], s: ['glute-max', 'gastroc'] }, f: [], g: { tennis: 3, strength: 1, rehab: 0, general: 0 }, cue: '무릎을 꿇고 발목을 고정한 뒤 몸을 천천히 앞으로 넘어뜨리며 버틴다. 손으로 받고 돌아온다. 햄스트링 부상 예방 1순위.', v: ['kzIs4XnBklo', '햄스트링 부상 예방 운동 / 노르딕햄스트링', 'YMCA체대입시', '1:36'] });
  add({ id: 'leg_curl', n: '레그 컬', en: 'Leg curl', pat: 'ham_iso', eq: [['machine']], lv: 1, inc: 'mach', m: { p: ['biceps-fem', 'semi'], s: ['gastroc'] }, f: [], g: { tennis: 1, hypertrophy: 3, rehab: 2, general: 2 }, cue: '엉덩이가 들리지 않게 패드에 붙이고 천천히 당긴다. 내릴 때 3초.', v: ['kndkQhbvgTU', '레그컬 머신 사용방법', '요무브YoMove', '6:25'] });
  add({ id: 'leg_ext', n: '레그 익스텐션', en: 'Leg extension', pat: 'quad_iso', eq: [['machine']], lv: 1, inc: 'mach', m: { p: ['rectus-fem', 'vastus-lat', 'vastus-med'], s: [] }, f: [], g: { tennis: 1, hypertrophy: 3, rehab: 2, general: 1 }, cue: '맨 위에서 1초 멈추고 천천히 내린다. 무릎 재활에서도 가볍게 쓴다.', v: ['Cj90QrlXiLM', '무릎이 10개면 해라! 레그익스텐션(대퇴사두)', '양선수의 온라인PT', '3:58'] });
  add({ id: 'back_ext', n: '백 익스텐션', en: 'Back extension', pat: 'core_ext', eq: [['machine', 'bench']], lv: 1, inc: 'db', mode: 'bw', m: { p: ['erector', 'glute-max', 'biceps-fem'], s: [] }, f: ['spinal_load'], g: { strength: 2, hypertrophy: 2, general: 2, rehab: 1 }, cue: '허리를 과하게 젖히지 않고 몸이 일직선이 되는 데서 멈춘다. 엉덩이로 올라온다.' });

  // 둔근 분리·옆 엉덩이
  add({ id: 'monster', n: '밴드 몬스터 워크', en: 'Banded monster walk', pat: 'hip_iso', lat: true, eq: [['band']], lv: 1, inc: 'band', mode: 'bw', m: { p: ['glute-med'], s: ['tfl', 'glute-max'] }, f: [], g: { tennis: 2, rehab: 3, general: 2 }, cue: '무릎 위나 발목에 밴드를 걸고 반쯤 앉은 자세로 옆·앞으로 걷는다. 발끝은 정면.', v: ['z_RIjEknuz8', '무릎 안아프게 엉덩이 근육 운동하는 법 | 몬스터 워킹', '혁쌤의 운동개혁', '6:32'] });
  add({ id: 'clamshell', n: '클램쉘', en: 'Clamshell', pat: 'hip_iso', uni: true, eq: [], lv: 1, inc: 'band', mode: 'bw', m: { p: ['glute-med', 'piriformis'], s: [] }, f: [], g: { tennis: 1, rehab: 3, general: 1 }, cue: '옆으로 누워 무릎을 굽히고 발뒤꿈치를 붙인 채 위 무릎을 연다. 골반이 뒤로 넘어가지 않게.', v: ['dblzx_5PLdU', '중둔근 운동 베스트 운동 5가지', '힙으뜸', '20:05'] });
  add({ id: 'side_abd', n: '사이드 라잉 힙 어브덕션', en: 'Side-lying hip abduction', pat: 'hip_iso', uni: true, lat: true, eq: [], lv: 1, inc: 'bw', mode: 'bw', m: { p: ['glute-med'], s: ['tfl', 'ql'] }, f: [], g: { tennis: 1, rehab: 3, general: 1 }, cue: '옆으로 누워 위 다리를 발끝이 살짝 아래를 보게 한 채 들어 올린다. 천천히.' });
  add({ id: 'copenhagen', n: '코펜하겐 플랭크', en: 'Copenhagen plank', pat: 'core_anti', uni: true, lat: true, eq: [['bench', 'box']], lv: 2, inc: 'time', mode: 'time', m: { p: ['adductors', 'ext-oblique', 'int-oblique'], s: ['ql', 'glute-med'] }, f: ['plank', 'core_lat'], g: { tennis: 3, rehab: 1, strength: 1 }, cue: '위 다리를 벤치에 걸치고 옆으로 몸을 든다. 사타구니 부상 예방에 가장 근거가 많은 운동.', v: ['Iy2K3evcSQI', '코펜하겐 플랭크 내전근에 정말 좋아', '프리웨이트매니아', '0:28'] });

  // 종아리
  add({ id: 'calf_raise', n: '카프 레이즈', en: 'Calf raise', pat: 'calf', eq: [], lv: 1, inc: 'db', m: { p: ['gastroc', 'soleus', 'achilles'], s: [] }, f: [], g: { tennis: 3, hypertrophy: 2, rehab: 2, general: 2 }, cue: '맨 위에서 1초 멈추고 3초에 걸쳐 내려온다. 계단 끝에서 하면 범위가 커진다.', v: ['-azhxuWVYCM', '종아리 근육을 키우는 가장 빠른 방법', '쇠질연구소', '5:45'] });
  add({ id: 'sl_calf', n: '한 발 카프 레이즈', en: 'Single-leg calf raise', pat: 'calf', uni: true, eq: [], lv: 2, inc: 'db', m: { p: ['gastroc', 'soleus', 'achilles'], s: ['peroneus'] }, f: [], g: { tennis: 3, rehab: 2, general: 1 }, cue: '벽을 짚고 한 발로. 발목이 바깥으로 꺾이지 않게 엄지발가락 쪽으로 민다.', v: ['QdAtQJMKi0U', '종아리근육의 모든것 (카프 레이즈)', '김명섭의 헬스교실', '11:46'] });
  add({ id: 'seated_calf', n: '시티드 카프 레이즈', en: 'Seated calf raise', pat: 'calf', eq: [['machine']], lv: 1, inc: 'mach', m: { p: ['soleus'], s: ['gastroc'] }, f: [], g: { tennis: 2, hypertrophy: 2 }, cue: '무릎을 굽힌 자세라 가자미근을 따로 자극한다. 느리게, 끝까지.', v: ['DCWICgITcq4', '1분 안에 운동 정복 - 시티드 카프 레이즈', '바디웍피트니스', '0:37'] });
  add({ id: 'tib_raise', n: '티비알리스 레이즈', en: 'Tibialis raise', pat: 'calf', eq: [], lv: 1, inc: 'bw', mode: 'bw', m: { p: ['tib-ant'], s: [] }, f: [], g: { tennis: 2, rehab: 2 }, cue: '벽에 기대 발끝을 최대한 들어 올린다. 정강이 앞 통증(신 스플린트) 예방.' });

  // 밀기
  add({ id: 'pushup', n: '푸시업', en: 'Push-up', pat: 'push_h', eq: [], lv: 1, inc: 'bw', mode: 'bw', m: { p: ['pec', 'triceps', 'delt-front'], s: ['serratus', 'rectus-ab'] }, f: ['push', 'wrist', 'plank'], g: { tennis: 2, strength: 1, hypertrophy: 2, fatloss: 3, rehab: 1, general: 3 }, cue: '손은 어깨 바로 아래보다 약간 넓게. 몸은 일직선, 팔꿈치는 45도.', v: ['-_DUjHxgmWk', '팔굽혀펴기의 정석. 가장 완벽한 푸쉬업 자세', '바벨라토르', '4:18'] });
  add({ id: 'incline_pushup', n: '인클라인 푸시업', en: 'Incline push-up', pat: 'push_h', eq: [['bench', 'box']], lv: 1, inc: 'bw', mode: 'bw', m: { p: ['pec', 'triceps', 'delt-front'], s: ['serratus'] }, f: ['push', 'wrist'], g: { rehab: 2, general: 3, fatloss: 2 }, cue: '손을 벤치에 짚어 부하를 줄인 푸시업. 바닥 푸시업이 10개 안 되면 여기서부터.' });
  add({ id: 'bench', n: '바벨 벤치프레스', en: 'Barbell bench press', pat: 'push_h', eq: [['bb', 'bench']], lv: 2, inc: 'bb_u', m: { p: ['pec', 'triceps', 'delt-front'], s: ['serratus', 'lat'] }, f: ['push'], g: { tennis: 1, strength: 3, hypertrophy: 3, general: 1, rehab: 0 }, cue: '날개뼈를 모아 벤치에 고정하고, 바를 가슴 아래쪽으로 내렸다가 민다. 발은 바닥을 누른다.', v: ['FN4zDtiy3Gg', '벤치프레스, 초보자를 위한 완벽정리', '보통트레이너', '2:59'] });
  add({ id: 'db_bench', n: '덤벨 벤치프레스', en: 'Dumbbell bench press', pat: 'push_h', eq: [['db', 'bench']], lv: 1, inc: 'db', m: { p: ['pec', 'triceps', 'delt-front'], s: ['serratus'] }, f: ['push'], g: { tennis: 2, strength: 2, hypertrophy: 3, general: 2, rehab: 0 }, cue: '덤벨을 가슴 옆까지 내렸다가 위로 모으듯 민다. 어깨가 으쓱 올라가지 않게.', v: ['4CzMB7o7nUc', '[덤벨 벤치프레스] 운동 자세 영상', 'Planfit', '1:53'] });
  add({ id: 'db_incline', n: '인클라인 덤벨 프레스', en: 'Incline dumbbell press', pat: 'push_h', eq: [['db', 'bench']], lv: 2, inc: 'db', m: { p: ['pec', 'delt-front', 'triceps'], s: ['serratus'] }, f: ['push'], g: { hypertrophy: 3, strength: 2, general: 1, rehab: 0 }, cue: '벤치를 30도 정도 세운다. 윗가슴 자극. 팔꿈치는 몸통에서 45도.' });
  add({ id: 'ohp', n: '오버헤드 프레스', en: 'Overhead press', pat: 'push_v', eq: [['bb']], lv: 2, inc: 'bb_u', m: { p: ['delt-front', 'triceps'], s: ['trap-upper', 'serratus', 'rectus-ab'] }, f: ['overhead', 'push'], g: { tennis: 1, strength: 3, hypertrophy: 2, general: 1, rehab: 0 }, cue: '엉덩이와 배를 조여 허리가 젖혀지지 않게. 바가 얼굴을 지나면 머리를 앞으로 넣는다.', v: ['uUpwPcSpPew', 'OHP 자극 안오면 이 자세부터 바꾸세요', '제로범TV', '6:38'] });
  add({ id: 'db_sh_press', n: '덤벨 숄더 프레스', en: 'Dumbbell shoulder press', pat: 'push_v', eq: [['db']], lv: 1, inc: 'db', m: { p: ['delt-front', 'triceps'], s: ['trap-upper', 'serratus'] }, f: ['overhead', 'push'], g: { tennis: 1, hypertrophy: 3, general: 2, strength: 2, rehab: 0 }, cue: '앉아서 해도 좋다. 덤벨을 귀 높이에서 시작해 위로 모은다.', v: ['OMCJoZfKhxM', '[덤벨숄더프레스] 완전 기초 자세', '탄단지혜', '2:48'] });
  add({ id: 'landmine_press', n: '하프 닐링 랜드마인 프레스', en: 'Half-kneeling landmine press', pat: 'push_v', uni: true, eq: [['bb']], lv: 2, inc: 'bb_u', m: { p: ['delt-front', 'pec', 'serratus', 'triceps'], s: ['rectus-ab', 'glute-max'] }, f: ['push'], g: { tennis: 3, strength: 2, hypertrophy: 2, rehab: 1, general: 2 }, cue: '바 한쪽 끝을 바닥 모서리에 두고, 한쪽 무릎을 꿇은 채 비스듬히 밀어 올린다. 어깨가 편한 수직 밀기.', v: ['jInQ7uh1K8s', '랜드마인 프레스 (아프면 금지)', '최송근 - 재활1cm', '6:37'] });
  add({ id: 'dip', n: '딥스', en: 'Dips', pat: 'push_v', eq: [['bar']], lv: 3, inc: 'bw', mode: 'bw', m: { p: ['pec', 'triceps', 'delt-front'], s: [] }, f: ['push', 'dip'], g: { strength: 2, hypertrophy: 2, rehab: 0 }, cue: '어깨가 팔꿈치 높이까지만 내려간다. 더 깊으면 어깨 앞이 다친다.' });
  add({ id: 'lateral_raise', n: '사이드 레터럴 레이즈', en: 'Lateral raise', pat: 'delt', eq: [['db']], lv: 1, inc: 'db', m: { p: ['delt-front', 'supraspinatus'], s: ['trap-upper'] }, f: ['shoulder_abd'], g: { hypertrophy: 3, general: 1, tennis: 0, rehab: 0 }, cue: '팔꿈치를 살짝 굽힌 채 옆으로 어깨 높이까지. 승모근이 올라오면 무게가 무겁다.', v: ['YdhHnZxcpgY', '사이드 레터럴 레이즈 자세 완벽정리', '핏블리 FITVELY', '5:47'] });
  add({ id: 'tri_pushdown', n: '트라이셉 푸시다운', en: 'Triceps pushdown', pat: 'arm_tri', eq: [['cable']], lv: 1, inc: 'mach', m: { p: ['triceps'], s: [] }, f: [], g: { hypertrophy: 3, strength: 1, general: 1, tennis: 0 }, cue: '팔꿈치를 옆구리에 고정하고 아래로 편다. 몸통으로 누르지 않는다.', v: ['cF9NczPANp4', '1분만에 완벽이해! 케이블푸쉬다운', '권혁', '1:02'] });

  // 당기기
  add({ id: 'pullup', n: '턱걸이', en: 'Pull-up', pat: 'pull_v', eq: [['bar']], lv: 2, inc: 'bw', mode: 'bw', m: { p: ['lat', 'biceps', 'teres-major'], s: ['rhomboid', 'trap-lower', 'rectus-ab', 'forearm-flex'] }, f: ['overhead', 'grip_heavy'], g: { tennis: 2, strength: 3, hypertrophy: 3, general: 2, rehab: 0 }, cue: '매달린 상태에서 날개뼈를 먼저 내리고 가슴을 바로 당긴다. 반동 없이.', v: ['JmNypmBVBRQ', '풀업(턱걸이) 정자세 10개 이하 꼭 보세요 (단계별 루틴)', '성철봉', '3:33'] });
  add({ id: 'neg_pullup', n: '네거티브 턱걸이', en: 'Negative pull-up', pat: 'pull_v', eq: [['bar']], lv: 1, inc: 'bw', mode: 'bw', m: { p: ['lat', 'biceps'], s: ['rhomboid', 'forearm-flex'] }, f: ['overhead', 'grip_heavy'], g: { strength: 2, general: 2, hypertrophy: 1, rehab: 0 }, cue: '점프해서 올라간 뒤 3~5초에 걸쳐 내려온다. 턱걸이 0개에서 1개로 가는 길.', v: ['nWhS28U6bCY', '턱걸이의 정석. 가장 완벽한 풀업 자세', '바벨라토르', '5:49'] });
  add({ id: 'lat_pulldown', n: '랫풀다운', en: 'Lat pulldown', pat: 'pull_v', eq: [['machine', 'cable']], lv: 1, inc: 'mach', m: { p: ['lat', 'biceps', 'teres-major'], s: ['rhomboid', 'trap-lower'] }, f: ['overhead'], g: { tennis: 2, strength: 2, hypertrophy: 3, general: 3, rehab: 1 }, cue: '상체를 살짝 뒤로 기울여 바를 쇄골 쪽으로. 팔꿈치를 옆구리로 끌어내린다.', v: ['ly-YZnGu9Ys', '랫풀다운 자세 3가지 포인트', '워아투', '4:58'] });
  add({ id: 'db_row', n: '원암 덤벨 로우', en: 'One-arm dumbbell row', pat: 'pull_h', uni: true, eq: [['db', 'bench']], lv: 1, inc: 'db', m: { p: ['lat', 'rhomboid', 'trap-mid', 'biceps', 'delt-rear'], s: ['erector', 'forearm-flex'] }, f: [], g: { tennis: 3, strength: 2, hypertrophy: 3, fatloss: 2, rehab: 2, general: 3 }, cue: '벤치에 한 손·한 무릎을 짚고 덤벨을 골반 쪽으로 당긴다. 몸통은 돌리지 않는다.', v: ['2i1v1UvsP_w', '원암 덤벨 로우 기초', '강경원', '6:02'] });
  add({ id: 'bb_row', n: '바벨 로우', en: 'Barbell row', pat: 'pull_h', eq: [['bb']], lv: 2, inc: 'bb_u', m: { p: ['lat', 'rhomboid', 'trap-mid', 'biceps'], s: ['erector', 'delt-rear', 'forearm-flex'] }, f: ['spinal_load', 'grip_heavy'], g: { strength: 3, hypertrophy: 3, tennis: 1, rehab: 0 }, cue: '상체를 45도 이상 숙이고 바를 배꼽 쪽으로 당긴다. 허리는 일자 고정.', v: ['tN7QirI_Vlg', '참 말 많은 바벨로우 도대체 뭐가 맞는 걸까?', '세계적으로 유명한 운동 정보', '3:34'] });
  add({ id: 'cable_row', n: '시티드 케이블 로우', en: 'Seated cable row', pat: 'pull_h', eq: [['cable', 'machine']], lv: 1, inc: 'mach', m: { p: ['lat', 'rhomboid', 'trap-mid', 'biceps'], s: ['delt-rear', 'erector'] }, f: [], g: { tennis: 2, strength: 2, hypertrophy: 3, general: 3, rehab: 2 }, cue: '가슴을 펴고 손잡이를 배꼽으로. 날개뼈를 뒤로 모았다가 천천히 풀어 준다.', v: ['hX5rsvfpZBg', '시티드 로우(롱풀) 기구 사용법', '바디메이커', '4:11'] });
  add({ id: 'band_row', n: '밴드 로우', en: 'Band row', pat: 'pull_h', eq: [['band']], lv: 1, inc: 'band', mode: 'bw', m: { p: ['rhomboid', 'trap-mid', 'lat', 'biceps'], s: ['delt-rear'] }, f: [], g: { rehab: 3, general: 2, tennis: 1 }, cue: '밴드를 기둥에 걸고 팔꿈치를 뒤로 당긴다. 어깨가 올라가지 않게.' });
  add({ id: 'inverted_row', n: '인버티드 로우', en: 'Inverted row', pat: 'pull_h', eq: [['bb', 'bar']], lv: 1, inc: 'bw', mode: 'bw', m: { p: ['lat', 'rhomboid', 'trap-mid', 'biceps'], s: ['rectus-ab', 'glute-max', 'delt-rear'] }, f: ['plank'], g: { tennis: 2, general: 3, fatloss: 2, strength: 1 }, cue: '낮게 걸린 바 아래에 누워 몸을 일직선으로 유지하며 가슴을 바로 당긴다. 몸을 세울수록 쉽다.' });
  add({ id: 'face_pull', n: '페이스 풀', en: 'Face pull', pat: 'cuff', eq: [['cable', 'band']], lv: 1, inc: 'mach', m: { p: ['delt-rear', 'infraspinatus', 'teres-minor', 'trap-mid'], s: ['rhomboid'] }, f: [], g: { tennis: 3, strength: 1, hypertrophy: 2, rehab: 2, general: 2 }, cue: '로프를 얼굴 쪽으로 당기며 손이 귀 옆으로 오게 벌린다. 어깨 뒤와 회전근개.', v: ['-asNNES5taw', '페이스풀 제대로 하는 법', '제로범TV', '3:43'] });
  add({ id: 'band_pull_apart', n: '밴드 풀어파트', en: 'Band pull-apart', pat: 'cuff', eq: [['band']], lv: 1, inc: 'band', mode: 'bw', m: { p: ['delt-rear', 'rhomboid', 'trap-mid'], s: ['infraspinatus'] }, f: [], g: { tennis: 2, rehab: 3, general: 2 }, cue: '팔을 앞으로 뻗어 밴드를 잡고 가슴 높이에서 양옆으로 벌린다. 날개뼈를 모은다.', v: ['TmyqnEkfXvc', '어깨 펴서 상체 프레임을 넓혀주는 간단한 운동 [Band Pull-Apart]', '세계적으로 유명한 운동 정보', '2:16'] });
  add({ id: 'band_er', n: '밴드 외회전', en: 'Band external rotation', pat: 'cuff', uni: true, eq: [['band']], lv: 1, inc: 'band', mode: 'bw', m: { p: ['infraspinatus', 'teres-minor'], s: ['delt-rear'] }, f: [], g: { tennis: 3, rehab: 3, general: 1, strength: 0 }, cue: '팔꿈치를 옆구리에 붙인 채 손을 바깥으로 돌린다. 겨드랑이에 수건을 끼우면 자세가 잡힌다.', v: ['Op6ep4HeYhk', '어깨 회전근개 재활운동 - 세라밴드 운동 따라하기', '정형외과 전문의 선지호', '11:38'] });
  add({ id: 'ytw', n: 'Y-T-W 레이즈', en: 'Y-T-W raise', pat: 'cuff', eq: [], lv: 1, inc: 'db', mode: 'bw', m: { p: ['trap-lower', 'trap-mid', 'delt-rear'], s: ['infraspinatus', 'rhomboid'] }, f: ['overhead'], g: { tennis: 3, rehab: 3, general: 1 }, cue: '엎드려서 팔을 Y, T, W 모양으로 들어 올린다. 맨손이나 1~2kg. 날개뼈 아래쪽을 쓴다.' });
  add({ id: 'wall_slide', n: '월 슬라이드', en: 'Wall slide', pat: 'cuff', eq: [], lv: 1, inc: 'bw', mode: 'bw', m: { p: ['serratus', 'trap-lower'], s: ['delt-front'] }, f: ['overhead'], g: { tennis: 2, rehab: 2, general: 1 }, cue: '팔뚝을 벽에 대고 위로 밀어 올리며 날개뼈를 갈비 쪽으로 감싼다.', v: ['7WtoLkVm73k', '전거근 운동 월슬라이드 하나로 종결 합니다', '물리트니스-김선생', '6:38'] });
  add({ id: 'bicep_curl', n: '덤벨 바이셉 컬', en: 'Dumbbell biceps curl', pat: 'arm_bi', eq: [['db']], lv: 1, inc: 'db', m: { p: ['biceps', 'forearm-flex'], s: [] }, f: [], g: { hypertrophy: 3, general: 1, tennis: 0 }, cue: '팔꿈치를 몸통 옆에 고정하고 반동 없이. 내릴 때 천천히.', v: ['B8fgn9RfIjE', '덤벨 바이셉스 컬, 초보자를 위한 영상', '짐핏GymFit', '0:33'] });
  add({ id: 'hammer_curl', n: '해머 컬', en: 'Hammer curl', pat: 'arm_bi', eq: [['db']], lv: 1, inc: 'db', m: { p: ['biceps', 'forearm-ext'], s: ['forearm-flex'] }, f: [], g: { hypertrophy: 2, tennis: 1, general: 1 }, cue: '손바닥이 마주 보게 잡고 올린다. 전완까지 같이 쓰여 라켓 잡는 힘에 도움.' });
  add({ id: 'wrist_ext', n: '손목 신전 (리스트 익스텐션)', en: 'Wrist extension', pat: 'arm_fore', eq: [['db']], lv: 1, inc: 'db', m: { p: ['forearm-ext'], s: [] }, f: [], g: { tennis: 3, rehab: 2, general: 0, hypertrophy: 1 }, cue: '팔뚝을 허벅지에 올리고 손등을 위로 든다. 1~3kg으로 느리게 내리는 것이 핵심. 테니스 엘보 예방.' });
  add({ id: 'farmer', n: '파머스 캐리', en: "Farmer's carry", pat: 'carry', eq: [['db', 'kb']], lv: 1, inc: 'db', mode: 'time', m: { p: ['forearm-flex', 'trap-upper', 'rectus-ab', 'erector'], s: ['glute-med', 'gastroc'] }, f: ['grip_heavy'], g: { tennis: 2, strength: 2, general: 3, fatloss: 2 }, cue: '무거운 덤벨을 양손에 들고 어깨를 내린 채 걷는다. 30~40m 또는 30~45초.' });
  add({ id: 'suitcase', n: '수트케이스 캐리', en: 'Suitcase carry', pat: 'carry', uni: true, lat: true, eq: [['db', 'kb']], lv: 1, inc: 'db', mode: 'time', m: { p: ['ql', 'ext-oblique', 'int-oblique', 'forearm-flex'], s: ['glute-med', 'trap-upper'] }, f: ['grip_heavy', 'core_lat'], g: { tennis: 3, general: 2, strength: 1 }, cue: '한 손에만 들고 몸이 기울지 않게 걷는다. 옆구리가 버틴다.', v: ['7a7lbBTvG-0', 'Suit Case Carry // CORE', 'Inside Out', '0:17'] });

  // 코어
  add({ id: 'deadbug', n: '데드버그', en: 'Dead bug', pat: 'core_anti', eq: [], lv: 1, inc: 'bw', mode: 'bw', m: { p: ['rectus-ab', 'transversus'], s: ['iliopsoas', 'ext-oblique', 'int-oblique'] }, f: [], g: { tennis: 2, rehab: 3, general: 3, strength: 1, hypertrophy: 1 }, cue: '누워 팔다리를 들고 반대쪽 팔과 다리를 천천히 뻗는다. 허리가 바닥에서 뜨지 않게.', v: ['bOCqXx0_tTs', '허리통증 이제 안녕! 데드버그 운동 3분 따라하기', '건강의학전문채널 하이닥', '3:20'] });
  add({ id: 'birddog', n: '버드독', en: 'Bird dog', pat: 'core_anti', eq: [], lv: 1, inc: 'bw', mode: 'bw', m: { p: ['erector', 'glute-max', 'transversus'], s: ['delt-front', 'biceps-fem'] }, f: [], g: { tennis: 1, rehab: 3, general: 2 }, cue: '네발 자세에서 반대 팔·다리를 뻗고 2초 멈춘다. 골반이 돌아가지 않게.', v: ['SfjFnlwBwgE', '필수 코어 운동! 버드독 제대로 하는 법', '라이프에이드', '1:09'] });
  add({ id: 'pallof', n: '팔로프 프레스', en: 'Pallof press', pat: 'core_anti', uni: true, eq: [['band', 'cable']], lv: 1, inc: 'band', mode: 'bw', m: { p: ['ext-oblique', 'int-oblique', 'transversus'], s: ['rectus-ab', 'glute-med'] }, f: ['core_lat'], g: { tennis: 3, strength: 1, hypertrophy: 1, rehab: 2, general: 2 }, cue: '옆에서 당기는 밴드를 가슴 앞에서 앞으로 밀어내고 2초 버틴다. 돌아가지 않게 막는 것이 전부.', v: ['OOpz4I9e13E', '최강코어 만들기, 팔로프 프레스를 배워봅시다', '수행자TV', '4:30'] });
  add({ id: 'plank', n: '플랭크', en: 'Plank', pat: 'core_anti', eq: [], lv: 1, inc: 'time', mode: 'time', m: { p: ['rectus-ab', 'transversus', 'serratus'], s: ['delt-front', 'glute-max'] }, f: ['plank'], g: { general: 3, fatloss: 2, rehab: 2, tennis: 1 }, cue: '팔꿈치를 어깨 아래. 엉덩이를 살짝 조이고 갈비뼈를 내린다. 흔들리기 시작하면 끝.' });
  add({ id: 'side_plank', n: '사이드 플랭크', en: 'Side plank', pat: 'core_anti', uni: true, lat: true, eq: [], lv: 1, inc: 'time', mode: 'time', m: { p: ['ext-oblique', 'int-oblique', 'ql', 'glute-med'], s: ['delt-front'] }, f: ['core_lat', 'plank'], g: { tennis: 3, rehab: 2, general: 2, strength: 1 }, cue: '처음엔 무릎을 대고. 머리부터 무릎(또는 발)까지 일직선.', v: ['BVMT4eqjmSc', '홈 트레이닝 2분! 사이드 플랭크 운동 따라하기', '건강의학전문채널 하이닥', '3:05'] });
  add({ id: 'hanging_leg_raise', n: '행잉 레그 레이즈', en: 'Hanging leg raise', pat: 'core_flex', eq: [['bar']], lv: 3, inc: 'bw', mode: 'bw', m: { p: ['rectus-ab', 'iliopsoas'], s: ['lat', 'forearm-flex'] }, f: ['overhead', 'core_flex', 'grip_heavy'], g: { hypertrophy: 2, strength: 1, tennis: 1, rehab: 0 }, cue: '매달려서 골반을 말아 올리듯 다리를 든다. 흔들리면 무릎을 굽혀서.', v: ['6MBYFdfyhIM', '행잉 레그 레이즈 헬린이 여러분에게는 복근운동이 아닙니다', '트리거', '3:06'] });
  add({ id: 'cable_woodchop', n: '케이블 우드촙', en: 'Cable woodchop', pat: 'core_rot', uni: true, eq: [['cable']], lv: 2, inc: 'mach', m: { p: ['ext-oblique', 'int-oblique'], s: ['glute-max', 'adductors', 'lat', 'delt-front'] }, f: ['trunk_rot'], g: { tennis: 3, hypertrophy: 1, strength: 1, rehab: 0 }, cue: '발을 바닥에 박고 엉덩이부터 돌린다. 팔은 몸통을 따라갈 뿐. 포핸드 궤적.', v: ['9-B8aRo12DY', '옆구리 운동 케이블우드춉', '피티아메리카', '6:20'] });
  add({ id: 'mb_rot_throw', n: '메디신볼 회전 던지기', en: 'Medicine ball rotational throw', pat: 'core_rot', uni: true, eq: [['mb']], lv: 2, inc: 'kb', m: { p: ['ext-oblique', 'int-oblique', 'glute-max', 'adductors'], s: ['lat', 'pec', 'biceps-fem'] }, f: ['trunk_rot', 'impact_upper'], g: { tennis: 3, strength: 1, rehab: 0, general: 0 }, cue: '벽 옆에 서서 뒷다리로 바닥을 밀고 엉덩이부터 돌려 던진다. 다리 → 엉덩이 → 몸통 → 팔 순서.', v: ['Bnrlj8KsrMc', '메디슨 볼을 이용한 테니스 훈련', 'Amir', '3:03'] });
  add({ id: 'mb_slam', n: '메디신볼 슬램', en: 'Medicine ball slam', pat: 'power', eq: [['mb']], lv: 2, inc: 'kb', m: { p: ['lat', 'rectus-ab', 'triceps'], s: ['glute-max', 'delt-front'] }, f: ['overhead', 'core_flex', 'impact_upper'], g: { tennis: 2, fatloss: 3, general: 1, rehab: 0 }, cue: '공을 머리 위로 들었다가 온몸으로 바닥에 내리꽂는다. 서브 가속과 비슷한 패턴.' });

  // 점프·파워·민첩성
  add({ id: 'squat_jump', n: '스쿼트 점프', en: 'Squat jump', pat: 'plyo', eq: [], lv: 2, inc: 'bw', mode: 'bw', m: { p: ['rectus-fem', 'vastus-lat', 'glute-max', 'gastroc'], s: ['biceps-fem', 'soleus'] }, f: ['impact', 'plyo', 'knee_deep'], g: { tennis: 3, fatloss: 1, strength: 1, rehab: 0, general: 1 }, cue: '반쯤 앉았다가 최대한 높이. 착지는 소리 없이, 무릎을 굽혀 받는다. 세트당 3~5회만.', v: ['SL-reYwCRes', '점프 스쿼트, 무릎 통증 예방하기', '채코치의 운동생활', '2:20'] });
  add({ id: 'box_jump', n: '박스 점프', en: 'Box jump', pat: 'plyo', eq: [['box']], lv: 2, inc: 'bw', mode: 'bw', m: { p: ['glute-max', 'rectus-fem', 'vastus-lat', 'gastroc'], s: ['biceps-fem'] }, f: ['impact', 'plyo'], g: { tennis: 3, strength: 1, rehab: 0, general: 1 }, cue: '팔을 휘둘러 올라가 박스 위에 부드럽게 착지. 뛰어내리지 말고 걸어 내려온다.', v: ['xrBTtAHgF6k', '박스 점프 올라가기', 'The Sweat Project 땀제작소', '3:31'] });
  add({ id: 'broad_jump', n: '제자리 멀리뛰기', en: 'Broad jump', pat: 'plyo', eq: [], lv: 2, inc: 'bw', mode: 'bw', m: { p: ['glute-max', 'rectus-fem', 'biceps-fem', 'gastroc'], s: ['erector'] }, f: ['impact', 'plyo'], g: { tennis: 3, rehab: 0, general: 1 }, cue: '팔 반동으로 앞으로 최대한 멀리. 착지에서 2초 버티고 다음 반복. 거리를 기록한다.' });
  add({ id: 'pogo', n: '포고 점프', en: 'Pogo jump', pat: 'plyo', eq: [], lv: 1, inc: 'bw', mode: 'bw', m: { p: ['gastroc', 'soleus', 'achilles'], s: ['tib-ant'] }, f: ['impact'], g: { tennis: 3, rehab: 0, general: 1 }, cue: '무릎을 거의 굽히지 않고 발목으로만 통통 뛴다. 바닥 접촉을 짧게. 아킬레스건 용수철.' });
  add({ id: 'skater', n: '스케이터 점프', en: 'Skater (lateral bound)', pat: 'plyo_lat', uni: true, lat: true, eq: [], lv: 2, inc: 'bw', mode: 'bw', m: { p: ['glute-med', 'glute-max', 'adductors', 'vastus-lat'], s: ['gastroc', 'peroneus'] }, f: ['impact', 'plyo', 'lateral_cut'], g: { tennis: 3, fatloss: 2, rehab: 0 }, cue: '옆으로 멀리 뛰어 한 발로 착지하고 1초 버틴다. 쇼트트랙 코너링과 같은 근육.', v: ['Xz27DudBfSs', 'Lateral Skater Jumps', 'The Active Life', '0:13'] });
  add({ id: 'split_step', n: '스플릿 스텝 드릴', en: 'Split step drill', pat: 'plyo', eq: [], lv: 1, inc: 'bw', mode: 'bw', m: { p: ['gastroc', 'soleus', 'glute-med'], s: ['rectus-fem'] }, f: ['impact'], g: { tennis: 3, rehab: 0, general: 0 }, cue: '작게 뛰어 양발로 착지하는 순간 바로 좌·우·앞으로 첫 발. 파트너가 방향을 가리켜 주면 좋다.', v: ['JbKH96L16JI', '테린이 99%가 모르는 올바른 스플릿스텝 타이밍 찾기!', '스까치자', '7:34'] });
  add({ id: 'shuttle', n: '5-10-5 셔틀', en: '5-10-5 pro agility', pat: 'sprint', lat: true, eq: [], lv: 2, inc: 'bw', mode: 'bw', m: { p: ['rectus-fem', 'glute-max', 'adductors', 'gastroc'], s: ['glute-med', 'biceps-fem'] }, f: ['impact', 'lateral_cut'], g: { tennis: 3, fatloss: 2, rehab: 0 }, cue: '가운데서 출발, 한쪽 5m 터치, 반대쪽 10m 터치, 가운데 복귀. 시간을 잰다. 세트 사이 충분히 쉰다.' });
  add({ id: 'sprint20', n: '20m 스프린트', en: '20 m sprint', pat: 'sprint', eq: [], lv: 2, inc: 'bw', mode: 'bw', m: { p: ['glute-max', 'biceps-fem', 'rectus-fem', 'gastroc'], s: ['iliopsoas'] }, f: ['impact'], g: { tennis: 3, fatloss: 2, rehab: 0 }, cue: '정지 상태에서 전력으로 20m. 걸어서 돌아오며 60~90초 회복. 햄스트링이 데워진 뒤에만.' });
  add({ id: 'lateral_shuffle', n: '래터럴 셔플', en: 'Lateral shuffle', pat: 'sprint', lat: true, eq: [], lv: 1, inc: 'bw', mode: 'bw', m: { p: ['glute-med', 'adductors', 'vastus-lat'], s: ['gastroc'] }, f: ['impact', 'lateral_cut'], g: { tennis: 3, fatloss: 2, rehab: 1 }, cue: '낮은 자세로 발이 교차하지 않게 옆으로 5m 왕복. 베이스라인 커버 동작.' });
  add({ id: 'ladder', n: '래더 드릴', en: 'Agility ladder', pat: 'sprint', eq: [], lv: 1, inc: 'bw', mode: 'bw', m: { p: ['gastroc', 'tib-ant', 'rectus-fem'], s: ['glute-med'] }, f: ['impact'], g: { tennis: 2, fatloss: 1, general: 1 }, cue: '래더가 없으면 코트 라인으로. 빠른 발, 낮은 중심. 발소리가 작게.', v: ['6jgcYyJWTp0', '선수처럼 움직이는 방법! 코트를 넓게 쓰셔야 합니다', '건강의 벗', '6:51'] });

  // 유산소
  add({ id: 'bike_z2', n: '실내 자전거 (존2)', en: 'Stationary bike, zone 2', pat: 'cond', eq: [['bike']], lv: 1, inc: 'cardio', mode: 'cardio', m: { p: ['rectus-fem', 'vastus-lat', 'glute-max'], s: ['gastroc', 'biceps-fem'] }, f: [], g: { tennis: 2, fatloss: 3, general: 3, rehab: 3, strength: 1, hypertrophy: 1 }, cue: '문장으로 대화가 되는 강도. 최대심박의 60~70%. 상체를 세우고 탄다.' });
  add({ id: 'bike_int', n: '자전거 인터벌', en: 'Bike intervals', pat: 'cond', eq: [['bike']], lv: 2, inc: 'cardio', mode: 'cardio', m: { p: ['rectus-fem', 'vastus-lat', 'glute-max'], s: ['gastroc'] }, f: [], g: { tennis: 3, fatloss: 3, general: 2, rehab: 1 }, cue: '30초 전력 / 90초 천천히 × 8. 테니스 포인트 길이와 비슷한 리듬.' });
  add({ id: 'row_erg', n: '로잉 머신', en: 'Rowing ergometer', pat: 'cond', eq: [['rower']], lv: 1, inc: 'cardio', mode: 'cardio', m: { p: ['lat', 'erector', 'rectus-fem', 'glute-max'], s: ['biceps', 'biceps-fem'] }, f: ['spinal_load'], g: { fatloss: 3, general: 2, tennis: 1 }, cue: '다리 → 몸통 → 팔 순서로 당기고 반대로 돌아온다. 분당 24~28 스트로크.' });
  add({ id: 'run_easy', n: '가벼운 달리기', en: 'Easy run', pat: 'cond', eq: [], lv: 1, inc: 'cardio', mode: 'cardio', m: { p: ['gastroc', 'soleus', 'rectus-fem', 'glute-max'], s: ['biceps-fem', 'tib-ant'] }, f: ['impact'], g: { fatloss: 3, general: 3, tennis: 2, rehab: 1 }, cue: '대화 가능한 속도. 처음엔 20분부터, 주 10%씩만 늘린다.' });
  add({ id: 'run_int', n: '달리기 인터벌', en: 'Run intervals', pat: 'cond', eq: [], lv: 2, inc: 'cardio', mode: 'cardio', m: { p: ['gastroc', 'glute-max', 'biceps-fem', 'rectus-fem'], s: ['iliopsoas'] }, f: ['impact'], g: { tennis: 3, fatloss: 3, general: 1, rehab: 0 }, cue: '1분 빠르게 / 1분 걷기 × 8~10. 경기 중 반복 스프린트 회복력.' });
  add({ id: 'jump_rope', n: '줄넘기', en: 'Jump rope', pat: 'cond', eq: [['rope']], lv: 1, inc: 'cardio', mode: 'cardio', m: { p: ['gastroc', 'soleus', 'achilles'], s: ['delt-front', 'forearm-flex'] }, f: ['impact'], g: { tennis: 3, fatloss: 3, general: 2, rehab: 0 }, cue: '발끝으로 낮게, 손목으로 돌린다. 1분 뛰고 30초 쉬기 × 10.' });

  // 가동성
  add({ id: 'hip_9090', n: '90/90 힙 스위치', en: '90/90 hip switch', pat: 'mob', eq: [], lv: 1, inc: 'bw', mode: 'bw', m: { p: ['piriformis', 'glute-med', 'glute-max'], s: ['adductors'] }, f: [], g: { tennis: 2, rehab: 3, general: 2, strength: 1, hypertrophy: 1, fatloss: 1 }, cue: '앉아서 양 무릎을 90도로 접고 좌우로 넘긴다. 손은 뒤를 짚어도 된다.', v: ['8rGQzOeemRI', '고관절 스트레칭만 하면 안 되는 이유 (내회전·외회전 90/90 루틴)', '하루 5분', '5:34'] });
  add({ id: 'hk_hipflexor', n: '하프 닐링 고관절 굴곡근 스트레칭', en: 'Half-kneeling hip flexor stretch', pat: 'mob', uni: true, eq: [], lv: 1, inc: 'time', mode: 'time', m: { p: ['iliopsoas', 'rectus-fem'], s: ['tfl'] }, f: [], g: { tennis: 3, rehab: 3, general: 2, strength: 1, hypertrophy: 1, fatloss: 1 }, cue: '한쪽 무릎을 꿇고 뒷다리 엉덩이에 힘을 준 채 골반을 앞으로. 허리를 꺾지 않는다. 팔을 올리는 버전은 옆구리가 아프면 생략.', v: ['Lx3C7pYNX7U', '건강한 허리를 만들어주는 하프 닐링 스트레칭 동작', '건강배송센터 : 건배', '0:51'] });
  add({ id: 'hip_cars', n: '고관절 CARs', en: 'Hip CARs', pat: 'mob', uni: true, eq: [], lv: 1, inc: 'bw', mode: 'bw', m: { p: ['iliopsoas', 'glute-med', 'piriformis'], s: ['adductors', 'tfl'] }, f: [], g: { tennis: 2, rehab: 3, general: 2, strength: 1, hypertrophy: 1, fatloss: 1 }, cue: '몸통은 고정하고 고관절만 가장 큰 원을 그리며 천천히 돌린다. 방향마다 5회.', v: ['ogqL1OExsRU', '고관절 CARs (Controlled Articular Rotations)', '채코치의 운동생활', '4:36'] });
  add({ id: 'knee_to_wall', n: '발목 니투월', en: 'Knee-to-wall ankle mobilization', pat: 'mob', uni: true, eq: [], lv: 1, inc: 'bw', mode: 'bw', m: { p: ['soleus', 'gastroc', 'achilles'], s: ['tib-ant'] }, f: [], g: { tennis: 3, rehab: 3, general: 2, strength: 1, hypertrophy: 1, fatloss: 1 }, cue: '벽 앞 런지 자세에서 뒤꿈치를 붙인 채 무릎을 벽에 댄다. 닿는 최대 거리(cm)를 테스트로 기록.', v: ['sInxFgCZ9Uc', 'Knee to Wall Test I 발목관절가동범위 평가', '스포츠의학연구소', '2:43'] });
  add({ id: 'openbook', n: '오픈북 (흉추 회전)', en: 'Open book', pat: 'mob', uni: true, eq: [], lv: 1, inc: 'bw', mode: 'bw', m: { p: ['pec', 'intercostal', 'ext-oblique'], s: ['erector'] }, f: ['trunk_rot'], g: { tennis: 3, rehab: 2, general: 2, strength: 1, hypertrophy: 1, fatloss: 1 }, cue: '옆으로 누워 무릎을 접고, 위쪽 팔을 책 펼치듯 반대편으로 연다. 무릎이 바닥에서 떨어지지 않게.', v: ['93Io-ADYFf0', '도수치료 홈트레이닝 - 흉추오픈북 운동법', '코끼리통증TV', '3:53'] });
  add({ id: 'cat_cow', n: '캣카우', en: 'Cat-cow', pat: 'mob', eq: [], lv: 1, inc: 'bw', mode: 'bw', m: { p: ['erector', 'rectus-ab'], s: ['serratus'] }, f: [], g: { rehab: 3, general: 2, tennis: 1, strength: 1, hypertrophy: 1, fatloss: 1 }, cue: '네발 자세에서 등을 둥글게 말았다가 천천히 편다. 숨과 함께 한 마디씩.' });
  add({ id: 'worlds_greatest', n: '월드 그레이티스트 스트레치', en: "World's greatest stretch", pat: 'mob', uni: true, eq: [], lv: 1, inc: 'bw', mode: 'bw', m: { p: ['iliopsoas', 'adductors', 'biceps-fem'], s: ['pec', 'ext-oblique'] }, f: ['trunk_rot'], g: { tennis: 3, general: 2, fatloss: 1, strength: 1, hypertrophy: 1, rehab: 1 }, cue: '깊은 런지에서 같은 쪽 팔꿈치를 바닥으로, 그 팔을 하늘로 열고, 앞다리를 펴 햄스트링까지. 준비운동 하나로 충분하다.' });
  add({ id: 'couch_stretch', n: '카우치 스트레치', en: 'Couch stretch', pat: 'mob', uni: true, eq: [], lv: 1, inc: 'time', mode: 'time', m: { p: ['rectus-fem', 'iliopsoas'], s: ['tfl'] }, f: ['knee_deep'], g: { tennis: 2, rehab: 2, general: 2, strength: 1, hypertrophy: 1, fatloss: 1 }, cue: '뒷발을 벽이나 소파에 올리고 무릎을 꿇는다. 엉덩이에 힘을 주면 허벅지 앞이 더 늘어난다.' });
  add({ id: 'adductor_rock', n: '내전근 락백', en: 'Adductor rock-back', pat: 'mob', uni: true, eq: [], lv: 1, inc: 'bw', mode: 'bw', m: { p: ['adductors'], s: ['glute-max'] }, f: ['deep_hip'], g: { tennis: 2, rehab: 2, general: 1, strength: 1, hypertrophy: 1, fatloss: 1 }, cue: '네발 자세에서 한 다리를 옆으로 펴고 엉덩이를 뒤로 민다. 와이드 스탠스 가동성.' });
  add({ id: 'pigeon', n: '피전 스트레치', en: 'Pigeon stretch', pat: 'mob', uni: true, eq: [], lv: 1, inc: 'time', mode: 'time', m: { p: ['piriformis', 'glute-max'], s: ['tfl'] }, f: ['deep_hip'], g: { tennis: 1, rehab: 2, general: 2, strength: 1, hypertrophy: 1, fatloss: 1 }, cue: '앞다리를 접어 바닥에 두고 뒷다리는 뒤로 길게. 골반을 정면으로 유지한다.' });
  add({ id: 'thoracic_ext', n: '폼롤러 흉추 신전', en: 'Foam roller thoracic extension', pat: 'mob', eq: [], lv: 1, inc: 'bw', mode: 'bw', m: { p: ['erector', 'pec'], s: ['lat'] }, f: [], g: { tennis: 2, rehab: 2, general: 2, strength: 1, hypertrophy: 1, fatloss: 1 }, cue: '폼롤러(없으면 말아 둔 수건)를 날개뼈 아래에 두고 머리를 받친 채 등을 뒤로 젖힌다. 서브 아치를 등 윗부분에서 만드는 연습.' });
  add({ id: 'ham_floss', n: '햄스트링 플로싱', en: 'Hamstring flossing', pat: 'mob', uni: true, eq: [], lv: 1, inc: 'bw', mode: 'bw', m: { p: ['biceps-fem', 'semi'], s: ['gastroc'] }, f: [], g: { tennis: 2, rehab: 2, general: 2, strength: 1, hypertrophy: 1, fatloss: 1 }, cue: '누워 허벅지를 잡고 무릎을 폈다 굽혔다 반복한다. 발끝을 당기면 더 강하다.' });

  BL.EX = E;
  BL.X = Object.fromEntries(E.map(e => [e.id, e]));

  // ───────── 체력 테스트 ─────────
  BL.TESTS = [
    { id: 'broad_jump', n: '제자리멀리뛰기', unit: 'cm', better: 'higher', hint: '3회 중 최고. 하체 폭발력.' },
    { id: 'vertical_jump', n: '제자리높이뛰기', unit: 'cm', better: 'higher', hint: '손 끝 도달 높이 차이.' },
    { id: 'pushup_max', n: '팔굽혀펴기 최대 횟수', unit: '회', better: 'higher', hint: '자세가 무너지기 전까지.' },
    { id: 'plank_max', n: '플랭크 최대 시간', unit: '초', better: 'higher', hint: '엉덩이가 처지거나 들리면 끝.' },
    { id: 'shuttle_5_10_5', n: '5-10-5 셔틀', unit: '초', better: 'lower', hint: '방향 전환 민첩성.' },
    { id: 'run_2400', n: '2.4km 달리기', unit: '초', better: 'lower', hint: '분:초를 초로 환산해 입력 (12:30 → 750).' },
    { id: 'knee_to_wall_l', n: '발목 니투월 (왼쪽)', unit: 'cm', better: 'higher', hint: '발끝에서 벽까지. 10cm 미만이면 발목 가동성 부족.' },
    { id: 'knee_to_wall_r', n: '발목 니투월 (오른쪽)', unit: 'cm', better: 'higher', hint: '좌우 차이 2cm 이상이면 기록해 둔다.' },
    { id: 'deep_squat', n: '딥 스쿼트 (뒤꿈치 붙이고)', unit: '점', better: 'higher', hint: '0 불가 / 1 뒤꿈치 뜸 / 2 가능 / 3 팔 올리고도 가능.' },
    { id: 'sl_balance', n: '한 발 서기 (눈 감고)', unit: '초', better: 'higher', hint: '좌우 중 낮은 쪽.' },
    { id: 'grip_r', n: '악력 (오른손)', unit: 'kg', better: 'higher', hint: '악력계가 있을 때.' },
    { id: 'serve_speed', n: '서브 속도', unit: 'km/h', better: 'higher', hint: '스피드건이나 앱 측정값.' }
  ];

  // 체크인 척도
  BL.CHECKIN = [
    { id: 'sleepH', n: '수면 시간', type: 'number', unit: '시간', min: 0, max: 14, step: 0.5 },
    { id: 'sleepQ', n: '수면 질', type: 'scale', labels: ['최악', '나쁨', '보통', '좋음', '최고'] },
    { id: 'soreness', n: '근육통', type: 'scale', labels: ['없음', '약간', '보통', '심함', '극심'] , invert: true },
    { id: 'fatigue', n: '피로', type: 'scale', labels: ['없음', '약간', '보통', '심함', '극심'], invert: true },
    { id: 'stress', n: '스트레스', type: 'scale', labels: ['없음', '약간', '보통', '심함', '극심'], invert: true },
    { id: 'mood', n: '기분', type: 'scale', labels: ['최악', '나쁨', '보통', '좋음', '최고'] }
  ];
  BL.PAIN_SITES = ['오른쪽 갈비·옆구리', '왼쪽 갈비·옆구리', '어깨', '팔꿈치', '손목', '허리', '고관절', '무릎', '발목', '기타'];
  BL.PAIN_SITE_RESTRICTION = { '오른쪽 갈비·옆구리': 'rib', '왼쪽 갈비·옆구리': 'rib', '어깨': 'shoulder', '팔꿈치': 'elbow', '손목': 'wrist', '허리': 'lowback', '고관절': 'hip', '무릎': 'knee', '발목': 'ankle' };
  BL.WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

  // ───────── 동작 단계 · 흔한 실수 (주요 운동) ─────────
  BL.DETAIL = {
    goblet: { steps: ['덤벨 한쪽 머리를 양손으로 받쳐 가슴 위에 붙인다. 발은 어깨너비보다 약간 넓게, 발끝은 15~30도 바깥.', '숨을 들이마셔 배를 단단히 하고 엉덩이와 무릎을 동시에 접어 내려간다. 팔꿈치가 무릎 안쪽을 지나도록.', '뒤꿈치로 바닥을 밀어 올라오며 숨을 내쉰다. 맨 위에서 엉덩이를 꽉 조인다.'], mistakes: ['뒤꿈치가 뜬다 → 발목 가동성 부족. 뒤꿈치 밑에 2.5kg 원판을 받치고, 니투월을 매일.', '무릎이 안으로 모인다 → 발끝 방향으로 무릎을 벌리며 내려간다. 밴드 몬스터 워크로 중둔근 깨우기.'] },
    bb_back_squat: { steps: ['바를 승모근 위(하이바)에 얹고 날개뼈를 모아 선반을 만든다. 손은 편한 만큼 좁게.', '랙에서 두 걸음 빠져 발을 어깨너비, 발끝 15~30도. 숨을 들이마셔 복압을 만든다.', '엉덩이와 무릎을 동시에 접어 허벅지가 수평이 될 때까지. 올라올 때 엉덩이와 가슴이 같은 속도로.'], mistakes: ['엉덩이만 먼저 올라오며 허리가 숙여진다(굿모닝 스쿼트) → 무게를 낮추고 가슴을 먼저 들어 올린다.', '깊이가 세트마다 다르다 → 박스나 거울로 깊이를 고정. 영상으로 옆에서 확인.'] },
    front_squat: { steps: ['바를 쇄골과 앞어깨 위에 얹고 팔꿈치를 앞으로 높이 든다. 손가락 2~3개로만 받친다.', '상체를 최대한 세운 채 무릎을 앞으로 보내며 깊게 앉는다.', '팔꿈치가 떨어지지 않게 유지하며 올라온다.'], mistakes: ['팔꿈치가 떨어져 바가 앞으로 굴러간다 → 손목·광배 가동성 부족. 스트랩을 바에 걸어 잡는 변형으로.', '뒤꿈치가 들린다 → 발목 가동성. 역도화나 원판 받침.'] },
    box_squat: { steps: ['무릎 높이 박스 앞에 서서 엉덩이를 뒤로 보내며 앉는다.', '박스에 엉덩이가 가볍게 닿으면 1초 멈춘다. 힘을 풀지 않는다.', '뒤꿈치로 밀어 일어난다.'], mistakes: ['박스에 털썩 앉았다가 튕겨 올라온다 → 허리 부담. 닿기만 하고 긴장을 유지.', '박스가 너무 낮거나 높다 → 무릎 통증이 없는 가장 낮은 높이로.'] },
    leg_press: { steps: ['발판 가운데에 어깨너비로 발을 두고 등과 엉덩이를 패드에 붙인다.', '허리가 패드에서 말리기 직전까지만 내린다.', '뒤꿈치로 밀어 올리되 무릎을 끝까지 잠그지 않는다.'], mistakes: ['너무 깊이 내려 허리가 말린다 → 깊이를 줄이고 발 위치를 위로.', '무릎을 완전히 펴고 잠근다 → 관절에 하중이 쏠린다. 살짝 굽힌 채 멈춤.'] },
    split_squat: { steps: ['앞뒤로 크게 벌리고 뒷발 뒤꿈치를 든다. 상체는 세운다.', '뒷무릎이 바닥에 닿기 직전까지 수직으로 내려간다.', '앞발 전체로 밀어 올라온다.'], mistakes: ['보폭이 좁아 앞무릎이 발끝을 한참 지난다 → 보폭을 넓힌다.', '상체가 앞으로 쏠린다 → 시선을 앞에, 가슴을 든다.'] },
    bss: { steps: ['벤치에서 한 걸음 반 앞에 서서 뒷발 발등을 벤치에 올린다.', '앞무릎을 굽혀 수직으로 내려간다. 앞발 뒤꿈치가 뜨지 않게.', '앞발 전체로 밀어 올라온다. 뒷다리는 거들 뿐.'], mistakes: ['뒷다리로 밀어 올린다 → 앞발 뒤꿈치에 체중을 두고 뒷다리는 힘을 뺀다.', '골반이 열리고 몸이 옆으로 기운다 → 덤벨을 내려놓고 맨몸으로 균형부터.'] },
    rev_lunge: { steps: ['한 발을 뒤로 크게 딛는다. 상체는 세운 채.', '뒷무릎이 바닥에 닿기 직전까지 내려간다.', '앞발 뒤꿈치로 밀어 처음 자세로 돌아온다.'], mistakes: ['앞무릎이 안으로 꺾인다 → 무릎을 새끼발가락 방향으로.', '뒤로 딛는 발이 가운데 선을 넘어 꼬인다 → 양발을 각자의 레일 위에 둔다.'] },
    walking_lunge: { steps: ['한 발을 앞으로 크게 딛으며 양 무릎을 90도로 굽힌다.', '앞발로 밀며 뒷발을 앞으로 끌어와 다음 걸음으로 잇는다.', '보폭과 속도를 일정하게.'], mistakes: ['걸음이 좁아 앞무릎이 많이 나간다 → 보폭을 넓힌다.', '상체가 흔들린다 → 시선을 멀리, 코어에 힘.'] },
    stepup: { steps: ['무릎 높이 박스에 한 발을 올린다. 발 전체가 박스 위에.', '올린 발로만 밀어 올라가고 반대 다리는 들어 올릴 뿐.', '천천히 내려오며 아래 발로 착지한다.'], mistakes: ['아래 발로 튕겨 올라간다 → 아래 발끝을 들어 못 밀게 한다.', '상체를 숙여 반동을 쓴다 → 가슴을 든 채 천천히.'] },
    lat_lunge: { steps: ['옆으로 크게 딛으며 그쪽 무릎을 굽히고 엉덩이를 뒤로 뺀다. 반대 다리는 쭉.', '양 발끝은 정면을 향하게 유지한다.', '딛은 발로 밀어 가운데로 돌아온다.'], mistakes: ['굽힌 쪽 무릎이 발끝을 한참 넘는다 → 엉덩이를 더 뒤로.', '편 다리 발끝이 바깥으로 돌아간다 → 정면 유지.'] },
    rdl: { steps: ['덤벨을 허벅지 앞에 들고 무릎을 살짝 굽힌다.', '엉덩이를 뒤로 밀며 덤벨을 다리에 붙여 내린다. 햄스트링이 당기는 지점까지.', '엉덩이를 앞으로 밀어 올라오며 맨 위에서 엉덩이를 조인다.'], mistakes: ['등이 둥글게 말린다 → 깊이를 줄이고 가슴을 편다.', '무릎을 많이 굽혀 스쿼트처럼 된다 → 무릎 각도는 고정, 엉덩이만 뒤로.'] },
    bb_rdl: { steps: ['바를 허벅지에 붙여 들고 무릎을 살짝 굽힌다.', '엉덩이를 뒤로 밀며 바를 정강이 중간까지 내린다. 바가 몸에서 떨어지지 않게.', '엉덩이를 앞으로 밀어 올라온다.'], mistakes: ['바가 몸에서 멀어진다 → 광배근으로 바를 몸 쪽으로 당긴 채.', '허리를 젖혀 마무리한다 → 몸이 일직선이면 끝.'] },
    trapbar_dl: { steps: ['트랩바 안에 서서 손잡이를 잡고 가슴을 든다.', '다리로 바닥을 밀며 일어난다. 엉덩이와 어깨가 같이 올라온다.', '엉덩이를 뒤로 보내며 바를 내린다.'], mistakes: ['허리가 둥글게 말린 채 시작한다 → 시작 전 가슴을 들고 날개뼈를 내린다.', '무릎을 먼저 펴 엉덩이가 솟는다 → 다리로 민다는 느낌.'] },
    conv_dl: { steps: ['바가 발 가운데 위에 오게 서서 정강이가 바에 닿을 때까지 엉덩이를 내린다.', '등을 편 채 다리로 바닥을 민다. 바는 정강이를 타고 올라온다.', '바가 무릎을 지나면 엉덩이를 앞으로 밀어 선다.'], mistakes: ['엉덩이가 먼저 솟아 허리로 든다 → 무게를 낮추고 가슴을 들어 시작.', '맨 위에서 허리를 젖힌다 → 엉덩이를 조이며 똑바로 선다.'] },
    kb_swing: { steps: ['케틀벨을 앞에 두고 하이크하듯 다리 사이로 당긴다.', '엉덩이를 세게 펴서 케틀벨을 가슴 높이까지 띄운다. 팔은 거든다.', '내려올 때 엉덩이를 뒤로 빼며 받는다.'], mistakes: ['팔로 들어 올린다 → 엉덩이 스냅으로. 케틀벨이 떠오르는 느낌.', '스쿼트처럼 무릎을 많이 굽힌다 → 힌지(엉덩이 접기).'] },
    sl_rdl: { steps: ['한 발로 서서 무릎을 살짝 굽힌다.', '상체와 반대 다리가 시소처럼 같이 기울며 내려간다. 골반은 수평.', '디딘 발 엉덩이로 밀어 돌아온다.'], mistakes: ['골반이 열려 몸이 옆으로 돈다 → 뒷발 발끝이 바닥을 보게.', '디딘 발이 흔들린다 → 처음엔 벽이나 봉을 짚고.'] },
    hip_thrust: { steps: ['등 윗부분(날개뼈 아래)을 벤치에 걸치고 발은 무릎이 90도가 되는 위치.', '턱을 당기고 엉덩이로 밀어 올려 몸통이 수평이 되게.', '맨 위에서 1초 조이고 천천히 내린다.'], mistakes: ['허리를 젖혀 올린다 → 갈비를 내리고 골반을 살짝 말아 올린다.', '발이 멀어 햄스트링만 쓴다 → 맨 위에서 정강이가 수직이 되게.'] },
    glute_bridge: { steps: ['누워 무릎을 세우고 발은 엉덩이 가까이.', '엉덩이를 조이며 들어 올려 무릎-골반-어깨가 일직선.', '천천히 내린다.'], mistakes: ['허리로 들어 올린다 → 갈비를 내리고 엉덩이에 집중.', '너무 높이 올려 허리가 꺾인다 → 일직선에서 멈춤.'] },
    nordic: { steps: ['무릎을 꿇고 발목을 고정한다(파트너·바벨·벤치).', '엉덩이를 편 채 몸을 천천히 앞으로 넘어뜨리며 햄스트링으로 버틴다.', '손으로 받고 밀어 돌아온다.'], mistakes: ['엉덩이를 접어 쉽게 한다 → 몸통과 허벅지를 일직선으로.', '너무 빨리 떨어진다 → 버티는 구간을 3초 이상.'] },
    monster: { steps: ['무릎 위에 미니밴드를 걸고 반쯤 앉은 자세.', '발끝을 정면으로 둔 채 옆으로 작게 걷는다. 밴드 장력을 유지.', '앞·뒤로도 걷는다.'], mistakes: ['상체가 좌우로 흔들린다 → 걸음을 작게.', '발끝이 바깥으로 돈다 → 정면 유지.'] },
    copenhagen: { steps: ['옆으로 누워 위쪽 다리 정강이를 벤치에 걸친다.', '팔꿈치로 지지하며 몸을 들어 일직선을 만든다. 아래 다리는 띄운다.', '버틴 뒤 천천히 내린다.'], mistakes: ['엉덩이가 처진다 → 몸을 일직선으로.', '처음부터 발목으로 건다 → 무릎 쪽으로 걸어 쉬운 버전부터.'] },
    calf_raise: { steps: ['계단 끝에 앞발을 걸치고 발뒤꿈치를 아래로 내린다.', '엄지발가락 쪽으로 밀어 최대한 높이 올라 1초.', '3초에 걸쳐 내린다.'], mistakes: ['반동으로 빠르게 튕긴다 → 느리게, 맨 위 정지.', '발목이 바깥으로 꺾인다 → 엄지발가락 쪽으로.'] },
    pushup: { steps: ['손은 어깨보다 약간 넓게, 몸은 머리부터 발뒤꿈치까지 일직선.', '팔꿈치를 몸통에서 45도로 벌리며 가슴이 바닥 가까이.', '바닥을 밀어 올라온다.'], mistakes: ['허리가 처진다 → 엉덩이와 배를 조인다.', '팔꿈치가 옆으로 90도 벌어진다 → 어깨 부담. 45도로.'] },
    bench: { steps: ['날개뼈를 모아 벤치에 고정하고 발은 바닥을 누른다.', '바를 가슴 아래쪽으로 내린다. 팔꿈치는 45~60도.', '발로 바닥을 밀며 바를 위로 민다.'], mistakes: ['엉덩이가 벤치에서 뜬다 → 발 위치를 조정하고 복압.', '바가 목 쪽으로 내려온다 → 가슴 아래, 팔꿈치 각도 확인.'] },
    db_bench: { steps: ['덤벨을 허벅지에 올리고 누우며 가슴 위로 올린다.', '팔꿈치를 45도로 벌리며 가슴 옆까지 내린다.', '위로 모으듯 밀어 올린다.'], mistakes: ['어깨가 으쓱 올라간다 → 날개뼈를 내리고 모은다.', '덤벨이 너무 깊이 내려간다 → 어깨 앞 통증. 팔꿈치가 벤치 높이에서 멈춤.'] },
    ohp: { steps: ['바를 쇄골 높이에서 잡고 팔꿈치는 바 아래.', '엉덩이와 배를 조여 허리가 젖혀지지 않게.', '바가 얼굴을 지나면 머리를 앞으로 넣으며 끝까지 민다.'], mistakes: ['허리를 젖혀 민다 → 엉덩이를 조이고 무게를 낮춘다.', '바가 앞으로 나간다 → 머리를 뒤로 뺐다가 바 아래로 넣는다.'] },
    db_sh_press: { steps: ['덤벨을 귀 높이에서 손바닥이 앞을 보게.', '위로 밀어 올리며 머리 위에서 살짝 모은다.', '천천히 귀 높이까지 내린다.'], mistakes: ['허리를 젖힌다 → 앉아서 하거나 복압.', '팔꿈치가 너무 뒤로 간다 → 몸 약간 앞쪽에.'] },
    landmine_press: { steps: ['바 한쪽을 코너나 랜드마인에 두고 한쪽 무릎을 꿇는다.', '바 끝을 어깨 앞에서 잡고 비스듬히 밀어 올린다.', '천천히 돌아온다.'], mistakes: ['몸통이 돌아간다 → 복압, 뒷발 엉덩이 조이기.', '어깨가 으쓱 올라간다 → 날개뼈를 내린 채.'] },
    pullup: { steps: ['어깨너비보다 약간 넓게 잡고 매달린다.', '날개뼈를 아래로 내린 뒤 가슴을 바로 당긴다.', '천천히 내려와 팔을 다 편다.'], mistakes: ['반동으로 올라간다 → 네거티브 턱걸이로 돌아가기.', '턱만 넘기려 고개를 든다 → 가슴을 바에.'] },
    lat_pulldown: { steps: ['허벅지 패드를 조절하고 바를 넓게 잡는다.', '상체를 살짝 뒤로 기울이고 팔꿈치를 옆구리로 끌어내린다.', '천천히 올리며 광배를 늘린다.'], mistakes: ['상체를 많이 눕혀 로우처럼 된다 → 10~15도만.', '바를 목 뒤로 당긴다 → 어깨 부담. 쇄골 앞으로.'] },
    db_row: { steps: ['벤치에 한 손·한 무릎을 짚고 등을 수평으로.', '덤벨을 골반 쪽으로 당긴다. 팔꿈치는 몸통에 가깝게.', '천천히 내리며 어깨를 늘린다.'], mistakes: ['몸통을 비틀어 당긴다 → 어깨를 수평으로.', '팔꿈치가 옆으로 벌어진다 → 골반 쪽으로.'] },
    cable_row: { steps: ['손잡이를 잡고 무릎을 살짝 굽혀 앉는다. 가슴을 편다.', '팔꿈치를 뒤로 당겨 손잡이를 배꼽으로. 날개뼈를 모은다.', '천천히 풀어 주며 어깨를 앞으로 늘린다.'], mistakes: ['상체를 앞뒤로 흔든다 → 몸통 고정, 팔만.', '어깨가 올라간다 → 날개뼈를 내린 채.'] },
    face_pull: { steps: ['로프를 얼굴 높이에 걸고 양손으로 잡는다.', '팔꿈치를 높인 채 얼굴 쪽으로 당기며 손을 귀 옆으로 벌린다.', '천천히 돌아온다.'], mistakes: ['무게가 무거워 몸이 끌려간다 → 가볍게, 15회 이상.', '팔꿈치가 내려간다 → 어깨 높이 유지.'] },
    band_er: { steps: ['팔꿈치를 옆구리에 붙이고 90도로 굽힌다. 겨드랑이에 수건.', '손을 바깥으로 천천히 돌린다.', '천천히 돌아온다. 가볍게 15~20회.'], mistakes: ['팔꿈치가 옆구리에서 떨어진다 → 수건을 떨어뜨리지 않게.', '너무 세게 당긴다 → 회전근개는 가벼운 저항.'] },
    deadbug: { steps: ['누워 팔은 천장, 무릎은 90도로 든다. 허리를 바닥에 붙인다.', '반대 팔과 다리를 천천히 뻗는다. 허리가 뜨지 않는 범위까지.', '돌아와 반대쪽.'], mistakes: ['허리가 바닥에서 뜬다 → 범위를 줄인다.', '숨을 참는다 → 뻗을 때 내쉰다.'] },
    pallof: { steps: ['밴드를 가슴 높이에 옆으로 걸고 양손으로 잡는다.', '가슴 앞에서 팔을 앞으로 쭉 민다. 몸이 돌아가지 않게 버틴다.', '2초 버티고 돌아온다.'], mistakes: ['몸통이 밴드 쪽으로 돌아간다 → 장력을 줄인다.', '어깨를 으쓱한다 → 날개뼈를 내린 채.'] },
    side_plank: { steps: ['옆으로 누워 팔꿈치를 어깨 아래. 처음엔 무릎을 바닥에.', '엉덩이를 들어 머리부터 무릎(발)까지 일직선.', '버틴다.'], mistakes: ['엉덩이가 뒤로 빠진다 → 몸을 벽에 붙인다고 생각.', '어깨가 귀로 올라간다 → 바닥을 밀어 어깨를 내린다.'] },
    cable_woodchop: { steps: ['케이블을 위(또는 아래)에 걸고 옆으로 선다.', '발을 바닥에 박고 엉덩이부터 돌리며 반대 방향으로 끌어내린다.', '팔은 몸통을 따라간다.'], mistakes: ['팔로만 돌린다 → 엉덩이·몸통이 먼저.', '허리를 꺾어 돌린다 → 흉추(등 윗부분)와 고관절에서.'] },
    mb_rot_throw: { steps: ['벽에서 1~2m 옆으로 선다. 공은 골반 옆.', '뒷다리로 바닥을 밀고 엉덩이 → 몸통 → 팔 순서로 돌려 던진다.', '공을 받아 반복.'], mistakes: ['팔로 던진다 → 다리를 먼저 쓴다.', '공이 너무 무겁다 → 2~3kg으로 빠르게.'] },
    squat_jump: { steps: ['반쯤 앉았다가 팔을 휘두르며 최대한 높이 뛴다.', '발 앞쪽으로 소리 없이 착지하며 무릎을 굽힌다.', '2초 쉬고 다음 반복.'], mistakes: ['착지 때 무릎이 안으로 모인다 → 착지만 따로 연습.', '연속으로 튕긴다 → 세트당 3~5회, 매 회 리셋.'] },
    box_jump: { steps: ['박스 앞에 서서 팔을 뒤로 뺐다가 휘두르며 뛴다.', '박스 위에 부드럽게 착지, 무릎을 굽혀 받는다.', '걸어 내려온다.'], mistakes: ['뛰어내려 착지한다 → 아킬레스건 부담. 걸어 내려오기.', '박스가 너무 높아 다리를 접어 올린다 → 높이를 낮춘다.'] },
    skater: { steps: ['한 발로 서서 옆으로 멀리 뛴다.', '반대 발 하나로 착지해 1초 버틴다.', '반대쪽으로.'], mistakes: ['착지가 흔들린다 → 거리를 줄이고 착지 안정부터.', '무릎이 안으로 꺾인다 → 엉덩이로 받는다.'] },
    split_step: { steps: ['상대 임팩트 직전 작게 뛰어 양발로 착지한다.', '착지와 동시에 첫 발을 공 방향으로.', '파트너가 좌·우·앞을 가리키면 반응.'], mistakes: ['너무 높이 뛴다 → 발이 살짝 떨어질 정도.', '타이밍이 늦다 → 상대 라켓이 공에 닿기 직전에 점프.'] },
    bike_int: { steps: ['5분 가볍게 워밍업.', '30초 전력 / 90초 천천히 × 8.', '5분 쿨다운.'], mistakes: ['전력 구간이 전력이 아니다 → 8회를 못 채울 강도로.', '회복 구간에 멈춘다 → 가볍게 계속 돌린다.'] },
    hip_9090: { steps: ['앉아서 앞 다리는 90도로 앞에, 뒷다리는 90도로 옆에.', '상체를 세운 채 양 무릎을 반대쪽으로 넘긴다.', '좌우 번갈아.'], mistakes: ['상체가 둥글게 말린다 → 손으로 뒤를 짚어 세운다.', '무릎이 바닥에서 많이 뜬다 → 괜찮다. 천천히 범위를 늘린다.'] },
    hk_hipflexor: { steps: ['한쪽 무릎을 꿇고 반대 발을 앞에.', '뒷다리 엉덩이에 힘을 주고 골반을 앞으로 민다.', '허벅지 앞·고관절 앞이 당기는 데서 40초.'], mistakes: ['허리를 젖힌다 → 엉덩이를 조이면 허리가 안 젖혀진다.', '골반만 앞으로 밀고 엉덩이 힘이 없다 → 늘어나는 느낌이 허리로 간다.'] },
    knee_to_wall: { steps: ['벽 앞에서 런지 자세. 앞발 발끝을 벽에서 10cm.', '뒤꿈치를 붙인 채 무릎을 벽에 댄다.', '닿으면 발을 1cm씩 뒤로. 안 닿는 거리를 기록.'], mistakes: ['뒤꿈치가 뜬다 → 뜨기 직전 거리가 기록.', '무릎이 안으로 꺾여 닿는다 → 둘째 발가락 방향으로.'] }
  };
})(window.BL);
