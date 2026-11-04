/* Western MBA – PSO · Form ứng tuyển (prototype front-end)
 * Vanilla JS, không phụ thuộc thư viện; trang tĩnh độc lập (deploy trên Vercel).
 * Mã trường (I01, P02, W01a…) theo BRD và là key khi xuất dữ liệu.
 * Form hiển thị tiếng Anh. Chuỗi viết dạng [Tiếng Việt, English]; đổi `lang` thành 'vi' nếu cần bản tiếng Việt.
 * Các chỗ cần backend (upload, kiểm tra trùng, nộp) nằm trong `api`.
 */
(function () {
  'use strict';

  // ---------------------------------------------------------------------------
  // Cấu hình — có thể ghi đè bằng window.WMBA_CONFIG trước khi nạp script.
  // Danh sách khoá dưới đây chỉ là giá trị ban đầu, Admission sửa được.
  // ---------------------------------------------------------------------------
  const CONFIG = Object.assign({
    program: 'Western MBA – PSO',
    intakes: [
      { v: '2027-01', label: ['Khoá 1/2027', 'Intake January 2027'] },
      { v: '2027-04', label: ['Khoá 4/2027', 'Intake April 2027'] },
      { v: '2027-07', label: ['Khoá 7/2027', 'Intake July 2027'] },
      { v: '2027-10', label: ['Khoá 10/2027', 'Intake October 2027'] },
      { v: 'other', label: ['Khác', 'Other'] },
    ],
    thresholds: { expYears: 5, mgmtYears: 2, ielts: 5.5, mismatchYears: 1, largeSizeMin: '200-999' },
    companySizes: [
      { v: 'lt50', label: ['Dưới 50 nhân sự', 'Under 50 employees'] },
      { v: '50-199', label: ['50–199 nhân sự', '50–199 employees'] },
      { v: '200-999', label: ['200–999 nhân sự', '200–999 employees'] },
      { v: '1000plus', label: ['Từ 1.000 nhân sự', '1,000+ employees'] },
    ],
    industries: [
      { v: 'banking_finance', label: ['Ngân hàng, tài chính & bảo hiểm', 'Banking, finance & insurance'] },
      { v: 'manufacturing', label: ['Sản xuất & công nghiệp', 'Manufacturing & industrial'] },
      { v: 'retail_fmcg', label: ['Bán lẻ & hàng tiêu dùng', 'Retail & FMCG'] },
      { v: 'technology', label: ['Công nghệ & viễn thông', 'Technology & telecoms'] },
      { v: 'real_estate', label: ['Bất động sản & xây dựng', 'Real estate & construction'] },
      { v: 'logistics', label: ['Logistics & chuỗi cung ứng', 'Logistics & supply chain'] },
      { v: 'energy', label: ['Năng lượng & tài nguyên', 'Energy & resources'] },
      { v: 'healthcare', label: ['Y tế & dược phẩm', 'Healthcare & pharmaceuticals'] },
      { v: 'education', label: ['Giáo dục', 'Education'] },
      { v: 'professional', label: ['Tư vấn & dịch vụ chuyên môn', 'Consulting & professional services'] },
      { v: 'media', label: ['Truyền thông & marketing', 'Media & marketing'] },
      { v: 'public_ngo', label: ['Khu vực công / Phi lợi nhuận', 'Public sector / NGO'] },
      { v: 'other', label: ['Khác', 'Other'] },
    ],
    levels: [
      { v: 'staff', label: ['Nhân viên (Staff)', 'Staff'] },
      { v: 'leader', label: ['Trưởng nhóm (Leader)', 'Leader'] },
      { v: 'manager', label: ['Quản lý (Manager)', 'Manager'] },
      { v: 'department_head', label: ['Trưởng phòng (Department Head)', 'Department Head'] },
      { v: 'director', label: ['Giám đốc (Director)', 'Director'] },
      { v: 'other', label: ['Khác', 'Other'] },
    ],
    mgmtLevels: ['leader', 'manager', 'department_head', 'director'],
    maxFileMB: 10,
    assetsUrl: 'assets/',   // đường dẫn thư mục assets (tương đối với trang)
    privacyUrl: 'https://pso.edu.vn/chinh-sach-bao-mat/',
    contact: ['Phòng Tuyển sinh Western MBA – PSO', 'the Western MBA – PSO Admission team'],
    storageKey: 'wmba-pso-draft-v5',   // đổi khi cấu trúc dữ liệu thay đổi để không đọc nhầm bản nháp cũ
  }, window.WMBA_CONFIG || {});

  // 34 tỉnh/thành sau sắp xếp 07/2025; value = mã đơn vị hành chính (dùng cho báo cáo)
  const PROVINCES = [
    ['1', 'Hanoi'], ['79', 'Ho Chi Minh City'], ['31', 'Hai Phong City'], ['48', 'Da Nang City'], ['92', 'Can Tho City'], ['46', 'Hue City'],
    ['91', 'An Giang'], ['24', 'Bac Ninh'], ['96', 'Ca Mau'], ['4', 'Cao Bang'], ['66', 'Dak Lak'], ['11', 'Dien Bien'], ['75', 'Dong Nai'], ['82', 'Dong Thap'],
    ['52', 'Gia Lai'], ['42', 'Ha Tinh'], ['33', 'Hung Yen'], ['56', 'Khanh Hoa'], ['12', 'Lai Chau'], ['68', 'Lam Dong'], ['20', 'Lang Son'], ['15', 'Lao Cai'],
    ['40', 'Nghe An'], ['37', 'Ninh Binh'], ['25', 'Phu Tho'], ['51', 'Quang Ngai'], ['22', 'Quang Ninh'], ['44', 'Quang Tri'], ['14', 'Son La'], ['80', 'Tay Ninh'],
    ['19', 'Thai Nguyen'], ['38', 'Thanh Hoa'], ['8', 'Tuyen Quang'], ['86', 'Vinh Long'],
  ].map(([v, en]) => ({ v, label: en }));

  // Phường/xã/đặc khu theo tỉnh: tải sau từ assets/vn-wards.json { mã tỉnh: [[mã, tên], …] }
  let WARDS = null, wardsFailed = false;
  const wardCache = {};
  const wardsOf = prov => WARDS && WARDS[prov] ? (wardCache[prov] = wardCache[prov] || WARDS[prov].map(([v, label]) => ({ v, label }))) : [];
  function loadWards() {
    if (WARDS) return;
    fetch(`${CONFIG.assetsUrl}vn-wards.json`).then(r => { if (!r.ok) throw new Error(r.status); return r.json(); }).then(d => {
      WARDS = d;
      const el = document.getElementById('wmba-A05');   // chỉ cập nhật gợi ý, không vẽ lại cả bước đang điền
      if (el && el.dataset.comboInput && state.A04 === 'VN' && state.A02) el.placeholder = tx(['Gõ để tìm…', 'Start typing to search…']);
    }).catch(() => { wardsFailed = true; if (typeof view === 'number' && document.getElementById('wmba-A05')) render(); });   // lỗi tải: cho nhập tay
  }

  const COUNTRY_CODES = ('AF AL DZ AD AO AG AR AM AU AT AZ BS BH BD BB BY BE BZ BJ BT BO BA BW BR BN BG BF BI CV KH CM CA ' +
    'CF TD CL CN CO KM CG CD CR CI HR CU CY CZ DK DJ DM DO EC EG SV GQ ER EE SZ ET FJ FI FR GA GM GE DE GH GR GD GT ' +
    'GN GW GY HT HN HK HU IS IN ID IR IQ IE IL IT JM JP JO KZ KE KI KP KR KW KG LA LV LB LS LR LY LI LT LU MO MG MW MY ' +
    'MV ML MT MH MR MU MX FM MD MC MN ME MA MZ MM NA NR NP NL NZ NI NE NG MK NO OM PK PW PS PA PG PY PE PH PL PT QA RO ' +
    'RU RW KN LC VC WS SM ST SA SN RS SC SL SG SK SI SB SO ZA SS ES LK SD SR SE CH SY TW TJ TZ TH TL TG TO TT TN TR TM ' +
    'TV UG UA AE GB US UY UZ VU VA VE VN YE ZM ZW').split(' ');

  // ---------------------------------------------------------------------------
  // Backend adapter — bản chính thức gọi REST API của backend tuyển sinh.
  // Server phải kiểm tra lại mọi thứ ở đây.
  // ---------------------------------------------------------------------------
  const MOCK_SUBMISSIONS = 'wmba-pso-mock-submissions';
  const api = {
    // POST multipart → server kiểm tra magic bytes + dung lượng, lưu ngoài thư mục public, trả id file.
    upload(file, docCode, onProgress) {
      return new Promise(resolve => {
        let p = 0;
        const t = setInterval(() => {
          p = Math.min(100, p + 10 + Math.random() * 22);
          onProgress(Math.round(p));
          if (p >= 100) { clearInterval(t); resolve({ id: uid() }); }
        }, 110);
      });
    },
    // BRD 4.5: cùng email hoặc cùng P08 trong cùng intake → cảnh báo, không lộ nội dung hồ sơ cũ.
    checkDuplicate({ email, idNo, intake }) {
      const list = readJSON(MOCK_SUBMISSIONS, []);
      return Promise.resolve(list.some(s => s.intake === intake &&
        (s.email.toLowerCase() === email.toLowerCase() || s.idNo === idNo)));
    },
    // Server dùng idempotencyKey để bấm/gửi lặp chỉ tạo 1 hồ sơ; Turnstile token gửi kèm.
    // Mã hồ sơ WMBA<2 số cuối năm nộp>-<4 chữ số>.
    submit(payload, idempotencyKey) {
      return new Promise(resolve => setTimeout(() => {
        const list = readJSON(MOCK_SUBMISSIONS, []);
        const prev = list.find(s => s.key === idempotencyKey);
        if (prev) return resolve({ code: prev.code });
        const code = `WMBA${String(NOW_Y).slice(2)}-${String(list.length + 1).padStart(4, '0')}`;
        list.push({ key: idempotencyKey, code, email: payload.P03, idNo: payload.P08, intake: payload.I02 });
        writeJSON(MOCK_SUBMISSIONS, list);
        resolve({ code });
      }, 1200));
    },
  };

  // ---------------------------------------------------------------------------
  // Tiện ích
  // ---------------------------------------------------------------------------
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const NOW = new Date();
  const NOW_Y = NOW.getFullYear();
  const NOW_IDX = NOW_Y * 12 + NOW.getMonth();
  const range = (a, b) => { const r = []; const s = a <= b ? 1 : -1; for (let i = a; s > 0 ? i <= b : i >= b; i += s) r.push(i); return r; };
  const pad = n => String(n).padStart(2, '0');
  const parseNum = v => (v === '' || v == null) ? NaN : Number(String(v).replace(',', '.').trim());
  const wordCount = s => (String(s).trim().match(/\S+/g) || []).length;
  const uid = () => (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2);
  const idOf = path => 'wmba-' + path.replace(/\./g, '-');
  const clone = o => JSON.parse(JSON.stringify(o));
  function readJSON(k, d) { try { return JSON.parse(localStorage.getItem(k)) || d; } catch (e) { return d; } }
  function writeJSON(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } }
  function getPath(o, path) { return path.split('.').reduce((x, k) => (x == null ? x : x[k]), o); }
  function setPath(o, path, v) { const ks = path.split('.'); const last = ks.pop(); ks.reduce((x, k) => x[k], o)[last] = v; }
  function lev(a, b) {
    const d = range(0, b.length);
    for (let i = 1; i <= a.length; i++) {
      let prev = d[0]; d[0] = i;
      for (let j = 1; j <= b.length; j++) { const t = d[j]; d[j] = Math.min(d[j] + 1, d[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1)); prev = t; }
    }
    return d[b.length];
  }
  function track(event, data) { (window.dataLayer = window.dataLayer || []).push(Object.assign({ event }, data)); }

  // ---------- Ngôn ngữ ----------
  const params = new URLSearchParams(location.search);
  const lang = 'en';
  const tx = x => Array.isArray(x) ? (lang === 'en' && x[1] != null ? x[1] : x[0]) : (x == null ? '' : String(x));
  const tf = (x, vars) => tx(x).replace(/\{(\w+)\}/g, (_, k) => vars[k]);
  const num = n => lang === 'vi' ? String(n).replace('.', ',') : String(n);
  const fmtSize = b => b < 1048576 ? `${Math.max(1, Math.round(b / 1024))} KB` : `${num((b / 1048576).toFixed(1))} MB`;
  const MONTHS_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthLabel = n => lang === 'en' ? MONTHS_EN[n - 1] : `Tháng ${n}`;

  const regionNames = {};
  function countries() {
    if (!regionNames[lang]) {
      let name = c => c;
      try { const dn = new Intl.DisplayNames([lang], { type: 'region' }); name = c => dn.of(c) || c; } catch (e) { /* trình duyệt cũ */ }
      regionNames[lang] = COUNTRY_CODES.map(c => ({ v: c, label: name(c) }))
        .sort((a, b) => a.v === 'VN' ? -1 : b.v === 'VN' ? 1 : a.label.localeCompare(b.label, lang));
    }
    return regionNames[lang];
  }

  // Ngày dạng {d,m,y}
  const validDate = v => {
    if (!v || !v.d || !v.m || !v.y) return false;
    const dt = new Date(+v.y, +v.m - 1, +v.d);
    return dt.getFullYear() === +v.y && dt.getMonth() === +v.m - 1 && dt.getDate() === +v.d;
  };
  const toDate = v => new Date(+v.y, +v.m - 1, +v.d);
  const startOfToday = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
  const fmtDate = v => validDate(v) ? `${pad(v.d)}/${pad(v.m)}/${v.y}` : '';

  // Giai đoạn công tác {from:{m,y}, to:{m,y}, current}
  const monthIdx = p => (+p.y) * 12 + (+p.m - 1);
  function periodRange(p) {
    if (!p || !p.from.m || !p.from.y) return null;
    const a = monthIdx(p.from);
    const b = p.current ? NOW_IDX : (p.to.m && p.to.y ? monthIdx(p.to) : null);
    if (b == null || b < a || a > NOW_IDX) return null;
    return [a, Math.min(b, NOW_IDX)];
  }
  // BRD 4.4: gộp giai đoạn chồng nhau, tính cả tháng đầu và cuối, chia 12, làm tròn xuống 1 chữ số thập phân.
  function yearsFrom(rows) {
    const months = new Set();
    rows.forEach(r => { const g = periodRange(r.period); if (g) for (let i = g[0]; i <= g[1]; i++) months.add(i); });
    return Math.floor(months.size * 10 / 12) / 10;
  }
  const periodText = p => {
    if (!p || !p.from.m) return '';
    return `${pad(p.from.m)}/${p.from.y} – ${p.current ? tx(['Hiện tại', 'Present']) : (p.to.m ? `${pad(p.to.m)}/${p.to.y}` : '…')}`;
  };

  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------
  const blankRow = {
    S01: () => ({ level: '', year: '', major: '', school: '' }),
    S02: () => ({ name: '', year: '', issuer: '' }),
    W01: () => ({ period: { from: { m: '', y: '' }, to: { m: '', y: '' }, current: false }, company: '', title: '', industry: '', size: '', level: '', reports: '', desc: '' }),
    L02: () => ({ lang: '', speak: '', read: '', write: '' }),
  };
  const emptyDate = () => ({ d: '', m: '', y: '' });
  function initialState() {
    return {
      I01: CONFIG.program, I02: '', I03: '',
      P01: '', P02: '', P03: '', P04: emptyDate(), P05: '', P07: 'VN', P08: '', P09: '',
      A04: 'VN', A02: '', A05: '', A01: '', A03: { cc: '+84', num: '' },
      S01: [blankRow.S01()], S02: [], S03: '', S05: '', S06: { L: '', R: '', W: '', S: '' }, S07: emptyDate(), S08: emptyDate(),
      W01: [blankRow.W01()], W02: '', W03: '',
      L01: '', L02: [], L03: '',
      Q01: '', Q02: '', Q03: '', Q04: '', Q05: '', Q06: '', Q07: '', Q08: [], Q08_other: '', Q09: { name: '', cohort: '', phone: '' }, Q10: [],
      C1: false, C2: false, C3: false,
      _utm: {}, _key: uid(),
    };
  }

  let state = initialState();
  let files = {};          // { U01: [{id,name,size,kind,progress,status,serverId}] }
  let uploadMsgs = {};     // file bị từ chối: { U01: [[vi, en], ...] }
  let errors = {};         // { path: [vi, en] }
  let view = 'intro';      // 'intro' | 0..6 | 'review' | 'done'
  let maxStep = 0;
  let reviewReached = false;
  let returnToReview = false;
  let submitted = null;
  let renderIndex = new Map();
  let rendering = false;
  let honeypot = '';

  // ---------------------------------------------------------------------------
  // Quy tắc validation (thông báo lỗi theo BRD 4.2)
  // ---------------------------------------------------------------------------
  const isHB = () => true;   // mọi ứng viên đều được xét học bổng
  // Thang điểm từng chứng chỉ (Overall; sub = trần điểm từng kỹ năng nếu khác Overall)
  const SCALES = {
    ielts: { min: 0, max: 9, step: 0.5, help: ['Từ 0 đến 9', 'From 0 to 9'] },
    toefl: { min: 0, max: 120, step: 1, sub: 30, help: ['Từ 0 đến 120', 'From 0 to 120'], subHelp: ['Mỗi kỹ năng từ 0 đến 30', 'Each skill from 0 to 30'] },
    pte: { min: 10, max: 90, step: 1, help: ['Từ 10 đến 90', 'From 10 to 90'] },
  };
  const hasCert = () => !!SCALES[state.S03];
  const isIelts = () => state.S03 === 'ielts';
  const M = {
    ielts: ['Điểm IELTS từ 0 đến 9, bước 0,5', 'IELTS scores range from 0 to 9, in steps of 0.5.'],
    phone: ['Số điện thoại chưa đúng', 'Please enter a valid phone number.'],
    years: ['Vui lòng nhập số năm hợp lệ', 'Please enter a valid number of years.'],
    essay: ['Bài viết vượt quá 250 từ', 'Your answer is over 250 words.'],
    period: ['Thời gian làm việc chưa hợp lệ', 'Please check the dates: “From” must be before “To”, and neither can be in the future.'],
  };
  const scaleRule = sub => v => {
    const sc = SCALES[state.S03];
    if (!sc) return '';
    const n = parseNum(v), max = sub && sc.sub ? sc.sub : sc.max;
    if (isNaN(n) || n < sc.min || n > max || Math.round(n / sc.step) !== n / sc.step) return isIelts() ? M.ielts : [`Điểm từ ${sc.min} đến ${max}`, `Scores range from ${sc.min} to ${max}.`];
    return '';
  };
  const scoreRule = scaleRule(false);
  const subRule = scaleRule(true);
  const phoneRule = v => /^\+?\d{9,15}$/.test(String(v).replace(/[\s.\-()]/g, '')) ? '' : M.phone;

  // Số di động {cc, num}. Với +84: số 10 chữ số bắt đầu bằng 0 tự bỏ số 0 (0912052459 → 912052459).
  const DIAL_CODES = [
    ['VN', '+84'], ['AU', '+61'], ['SG', '+65'], ['US / CA', '+1'], ['GB', '+44'], ['JP', '+81'], ['KR', '+82'],
    ['CN', '+86'], ['TW', '+886'], ['HK', '+852'], ['TH', '+66'], ['MY', '+60'], ['ID', '+62'], ['PH', '+63'],
    ['KH', '+855'], ['LA', '+856'], ['MM', '+95'], ['IN', '+91'], ['NZ', '+64'], ['FR', '+33'], ['DE', '+49'],
    ['NL', '+31'], ['CH', '+41'], ['AE', '+971'],
  ].map(([c, d]) => ({ v: d, label: `${c} ${d}` }));
  const phoneDigits = v => String(v.num || '').replace(/\D/g, '');
  const normalizeMobile = v => { const d = phoneDigits(v); return v.cc === '+84' && d.length === 10 && d[0] === '0' ? d.slice(1) : d; };
  const groupDigits = d => d.replace(/(\d{3})(?=\d)/g, '$1 ');
  const mobileRule = v => {
    const d = normalizeMobile(v);
    return (v.cc === '+84' ? /^[35789]\d{8}$/.test(d) : /^\d{6,14}$/.test(d)) ? '' : ['Số di động chưa đúng', 'Please enter a valid mobile number.'];
  };
  const yearsRule = v => { const n = parseNum(v); return isNaN(n) || n < 0 || n > 60 ? M.years : ''; };
  const essayRule = v => wordCount(v) > 250 ? M.essay : '';

  function emailSuggest(v) {
    const m = /^([^@\s]+)@([^@\s]+\.[^@\s]+)$/.exec(String(v).trim());
    if (!m) return '';
    const dom = m[2].toLowerCase();
    const known = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'icloud.com'];
    if (known.includes(dom)) return '';
    const best = known.find(d => lev(dom, d) <= 2);
    if (!best) return '';
    const s = `${m[1]}@${best}`;
    return `<span class="wmba-hint">${tf(['Có phải ý bạn là {s}?', 'Did you mean {s}?'], { s: `<b>${esc(s)}</b>` })} <button type="button" class="wmba-link" data-action="fix-email" data-value="${esc(s)}">${tx(['Sửa thành địa chỉ này', 'Use this address'])}</button></span>`;
  }

  function yearsHint(kind) {
    return () => {
      const mgmt = kind === 'mgmt';
      const rows = mgmt ? state.W01.filter(r => CONFIG.mgmtLevels.includes(r.level)) : state.W01;
      const computed = yearsFrom(rows);
      const declared = parseNum(mgmt ? state.W03 : state.W02);
      const n = `<b>${num(computed)}</b>`;
      let html = `<span class="wmba-hint">${mgmt
        ? tf(['Theo quá trình công tác: {n} năm', 'From your employment history: {n} years'], { n })
        : tf(['Theo quá trình công tác: {n} năm', 'From your employment history: {n} years'], { n })}</span>`;
      if (!isNaN(declared) && Math.abs(declared - computed) > CONFIG.thresholds.mismatchYears) {
        html += `<span class="wmba-warn">${tx(['Chưa khớp với quá trình công tác, vui lòng kiểm tra lại.', 'Doesn’t match your employment history. Please check.'])}</span>`;
      }
      return html;
    };
  }
  const counter = (n, max, unit) => `<span class="wmba-counter${n > max ? ' is-over' : n > max * 0.92 ? ' is-near' : ''}">${n}/${max} ${tx(unit)}</span>`;

  // ---------------------------------------------------------------------------
  // Schema 7 bước
  // ---------------------------------------------------------------------------
  const SKILL = [
    { v: 'beginner', label: ['Cơ bản (Beginner)', 'Beginner'] }, { v: 'fair', label: ['Khá (Fair)', 'Fair'] },
    { v: 'good', label: ['Tốt (Good)', 'Good'] }, { v: 'fluent', label: ['Thành thạo (Fluent)', 'Fluent'] },
  ];
  const YEARS_PAST = range(NOW_Y, NOW_Y - 50);
  const yearOpts = YEARS_PAST.map(n => ({ v: String(n), label: String(n) }));
  const OPTIONAL = ['(không bắt buộc)', '(optional)'];

  const ESSAYS = [
    ['Q01', ['Điều gì thúc đẩy bạn ứng tuyển chương trình MBA này?', 'What motivated you to apply for this MBA programme?'], ''],
    ['Q02', ['Mục tiêu nghề nghiệp ngắn hạn và dài hạn của bạn là gì?', 'What are your short-term and long-term career goals?'], ''],
    ['Q03', ['Chương trình WMBA sẽ hỗ trợ bạn đạt mục tiêu nghề nghiệp và cá nhân như thế nào?', 'How do you believe this WMBA programme will support you in achieving your professional and personal goals?'], ''],
    ['Q04', ['Bạn sẽ mang đến cohort WMBA những trải nghiệm, kỹ năng hoặc góc nhìn khác biệt nào?', 'What unique experiences, skills, or perspectives would you bring to the WMBA cohort?'], ''],
    ['Q05', ['Bạn dự định cân bằng công việc, việc cá nhân và việc học trong suốt chương trình như thế nào?', 'How do you plan to balance your professional responsibilities, personal commitments, and academic workload throughout the programme?'], ''],
    ['Q06', ['Nếu không nhận được học bổng, bạn có những phương án nào khác để theo đuổi mục tiêu nghề nghiệp và học tập?', 'If your scholarship application is unsuccessful, what alternative plans would you consider for pursuing your career and educational goals?'], ''],
    ['Q07', ['Ngoài hỗ trợ tài chính, học bổng này có ý nghĩa gì với bạn về chuyên môn và cá nhân?', 'Beyond financial assistance, what would receiving this scholarship mean to you professionally and personally?'], ''],
  ];

  // BRD mục 5: U01–U08
  const DOCS = [
    { code: 'U01', label: ['Ảnh thẻ', 'Passport-style photo'], note: ['3x4 hoặc 4x6, nền trơn', '3x4 or 4x6, plain background'], kinds: ['image'], max: 1, required: () => true },
    { code: 'U02', label: ['CV / Resume', 'CV / Resume'], kinds: ['pdf'], max: 1, required: () => true },
    { code: 'U03', label: ['Bằng tốt nghiệp Đại học/Thạc sĩ', 'Bachelor’s / Master’s degree certificate(s)'], kinds: ['pdf', 'image'], max: 3, required: () => true },
    { code: 'U04', label: ['Bảng điểm', 'Academic transcript(s)'], kinds: ['pdf', 'image'], max: 3, required: () => true },
    { code: 'U05', label: ['Chứng chỉ tiếng Anh', 'English certificate'], kinds: ['pdf', 'image'], max: 1, required: () => state.S03 !== 'none' },
    { code: 'U06', label: ['Minh chứng vị trí công tác', 'Proof of position'], note: ['Thư xác nhận nhân sự, quyết định bổ nhiệm hoặc hợp đồng lao động.', 'HR letter, appointment letter or employment contract.'], kinds: ['pdf'], max: 3, required: () => true, show: isHB },
    { code: 'U08', label: ['Thư xin học bổng', 'Scholarship Application Letter'], note: ['Viết bằng tiếng Anh: động lực ứng tuyển học bổng WMBA, lý do chọn chương trình và định hướng nghề nghiệp trong tương lai.', 'A letter written in English outlining the applicant’s motivation for applying for the WMBA scholarship, the reasons for choosing the programme, and their future professional and career aspirations.'], kinds: ['pdf'], max: 1, required: () => true, show: isHB },
    { code: 'U07', label: ['Tài liệu khác', 'Other documents'], kinds: ['pdf', 'image'], max: 3, required: () => false },
  ];
  const DOC_BY_CODE = Object.fromEntries(DOCS.map(d => [d.code, d]));
  const DOC_GROUPS = [
    [['Hồ sơ cá nhân', 'Personal'], ['U01', 'U02']],
    [['Học vấn & tiếng Anh', 'Education & English'], ['U03', 'U04', 'U05']],
    [['Học bổng', 'Scholarship'], ['U06', 'U08']],
    [['Khác', 'Other'], ['U07']],
  ];
  const docVisible = d => !d.show || d.show();

  const STEPS = [
    {
      short: ['Quan tâm', 'Interest'], title: ['Chương trình quan tâm', 'Programme interest'],
      lead: ['Chọn khoá học.', 'Choose your intake.'],
      fields: [
        { code: 'I02', label: ['Khoá / Intake', 'Intake'], type: 'select', required: true, options: CONFIG.intakes, placeholder: ['Chọn khoá', 'Select an intake'] },
        { code: 'I03', label: ['Khoá mong muốn', 'Preferred intake'], type: 'text', required: true, placeholder: ['Ví dụ: tháng 1/2028', 'e.g. January 2028'], show: () => state.I02 === 'other' },
        { type: 'info', html: () => scholarshipBox() },
      ],
    },
    {
      short: ['Cá nhân', 'Identity'], title: ['Thông tin cá nhân', 'Personal information'],
      lead: ['Điền như trên CCCD/hộ chiếu.', 'As shown on your ID card or passport.'],
      fields: [
        { code: 'P02', label: ['Họ và tên', 'Full name'], type: 'text', required: true, autocomplete: 'name', validate: v => v.trim().split(/\s+/).length < 2 ? ['Vui lòng nhập đầy đủ họ và tên', 'Please enter your full name.'] : '' },
        { code: 'P01', width: 'half', label: ['Giới tính', 'Gender'], type: 'radio', required: true, options: [{ v: 'male', label: ['Nam', 'Male'] }, { v: 'female', label: ['Nữ', 'Female'] }] },
        { code: 'P04', width: 'half', label: ['Ngày sinh', 'Date of birth'], type: 'datetext', min: `${NOW_Y - 99}-01-01`, required: true, validate: v => validDate(v) && /^\d{4}$/.test(v.y) && +v.y > NOW_Y - 100 && toDate(v) <= NOW ? '' : ['Ngày sinh không hợp lệ', 'Please enter a valid date of birth.'] },
        { code: 'P05', width: 'half', label: ['Nơi sinh (tỉnh/thành)', 'Place of birth (province/city)'], type: 'text', required: true },
        { code: 'P07', width: 'half', label: ['Quốc tịch', 'Nationality'], type: 'combo', options: countries, required: true },
        {
          code: 'P08', width: 'half', label: ['Số CCCD / Hộ chiếu', 'ID card / Passport number'], type: 'text', required: true, autocomplete: 'off', mask: true,
          help: ['Được bảo mật.', 'Kept confidential.'],
          validate: v => {
            const s = v.replace(/\s/g, '');
            if (state.P07 === 'VN') return /^\d{12}$/.test(s) || /^[A-Z]\d{7,8}$/i.test(s) ? '' : ['CCCD gồm 12 chữ số (hoặc nhập số hộ chiếu)', 'Vietnamese ID cards have 12 digits (or enter a passport number).'];
            return /^[A-Z0-9]{6,15}$/i.test(s) ? '' : ['Số hộ chiếu chưa đúng', 'Please enter a valid passport number.'];
          },
        },
        { code: 'P09', label: ['LinkedIn', 'LinkedIn profile'], type: 'url', placeholder: 'linkedin.com/in/…', optional: true, validate: v => /linkedin\.com\/.+/i.test(v) ? '' : ['Link LinkedIn chưa đúng', 'Please enter a valid LinkedIn URL.'] },
        { type: 'heading', label: ['Thông tin liên hệ', 'Contact details'] },
        { code: 'P03', width: 'half', label: ['Email', 'Email'], type: 'email', required: true, autocomplete: 'email', help: ['Để nhận email xác nhận.', 'For your confirmation email.'], validate: v => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) ? '' : ['Email chưa đúng định dạng', 'Please enter a valid email address.'], dyn: v => emailSuggest(v) },
        { code: 'A03', width: 'half', label: ['Số di động', 'Mobile phone'], type: 'phone', required: true, validate: mobileRule },
        { type: 'heading', label: ['Địa chỉ liên hệ', 'Address'] },
        { code: 'A04', width: 'half', label: ['Quốc gia', 'Country'], type: 'combo', options: countries, required: true },
        // Ngoài Việt Nam: khoá tỉnh/thành và phường/xã, chỉ nhập số nhà, tên đường
        { code: 'A02', width: 'half', label: ['Tỉnh / Thành phố', 'Province / City'], type: 'combo', options: PROVINCES, required: () => state.A04 === 'VN',
          disabled: () => state.A04 !== 'VN', placeholder: () => state.A04 === 'VN' ? ['Gõ để tìm…', 'Start typing to search…'] : ['Chỉ áp dụng tại Việt Nam', 'Only for addresses in Vietnam'] },
        { code: 'A05', width: 'half', label: ['Phường / Xã / Đặc khu', 'Ward / Commune'], type: 'combo', options: () => wardsOf(state.A02), required: () => state.A04 === 'VN', show: () => !wardsFailed,
          disabled: () => state.A04 !== 'VN' || !state.A02, placeholder: () => state.A04 !== 'VN' ? ['Chỉ áp dụng tại Việt Nam', 'Only for addresses in Vietnam'] : state.A02 ? (WARDS ? ['Gõ để tìm…', 'Start typing to search…'] : ['Đang tải…', 'Loading…']) : ['Chọn tỉnh/thành trước', 'Select a province first'] },
        { code: 'A05', width: 'half', label: ['Phường / Xã / Đặc khu', 'Ward / Commune'], type: 'text', required: () => state.A04 === 'VN', show: () => wardsFailed, disabled: () => state.A04 !== 'VN' },
        { code: 'A01', width: 'half', label: ['Số nhà, tên đường', 'House number and street'], type: 'text', required: true, autocomplete: 'address-line1' },
      ],
    },
    {
      short: ['Học vấn', 'Studies'], title: ['Học vấn & Tiếng Anh', 'Education & English proficiency'],
      lead: ['Bắt đầu từ bằng cao nhất.', 'Start with your highest degree.'],
      fields: [
        {
          code: 'S01', label: ['Bằng cấp', 'Degrees'], type: 'repeater', min: 1, rowTitle: ['Bằng', 'Degree'], addLabel: ['Thêm bằng cấp', 'Add another degree'], fields: [
            { key: 'level', code: 'S01_level', width: 'half', label: ['Bậc', 'Level'], type: 'select', options: [{ v: 'high_school', label: ['Tốt nghiệp THPT', 'High school diploma'] }, { v: 'bachelor', label: ['Tốt nghiệp Đại học', "Bachelor's degree"] }, { v: 'master', label: ['Thạc sĩ', "Master's degree"] }], required: true },
            { key: 'year', code: 'S01_year', width: 'half', label: ['Năm tốt nghiệp', 'Graduation year'], type: 'select', options: yearOpts, required: true },
            { key: 'major', code: 'S01_major', width: 'half', label: ['Chuyên ngành', 'Major'], type: 'text', required: true, show: row => row.level !== 'high_school' },
            { key: 'school', code: 'S01_school', width: 'half', label: ['Trường', 'Institution'], type: 'text', required: true,  },
          ],
        },
        {
          code: 'S02', label: ['Chứng chỉ chuyên môn', 'Professional certificates'], optional: true, type: 'repeater', min: 0, rowTitle: ['Chứng chỉ', 'Certificate'], addLabel: ['Thêm chứng chỉ', 'Add certificate'],
          empty: ['Bỏ qua nếu không có. Khi đã thêm, vui lòng điền đủ các trường.', 'Skip if not applicable. Once added, all fields are required.'], fields: [
            { key: 'name', code: 'S02_name', width: 'twothird', label: ['Tên chứng chỉ', 'Certificate name'], type: 'text', required: true,  },
            { key: 'year', code: 'S02_year', width: 'third', label: ['Năm', 'Year'], type: 'select', options: yearOpts, required: true },
            { key: 'issuer', code: 'S02_issuer', label: ['Đơn vị cấp', 'Issued by'], type: 'text', required: true },
          ],
        },
        { type: 'heading', label: ['Trình độ tiếng Anh', 'English proficiency'] },
        {
          code: 'S03', label: ['Chứng chỉ tiếng Anh', 'English certificate'], type: 'select', required: true, placeholder: ['Chọn chứng chỉ', 'Select a certificate'],
          options: [
            { v: 'ielts', label: 'IELTS Academic' },
            { v: 'toefl', label: 'TOEFL iBT' },
            { v: 'pte', label: 'PTE Academic' },
            { v: 'none', label: ['Chưa thi', 'Not yet taken'] },
          ],
        },
        { code: 'S05', width: 'half', label: ['Điểm tổng (Overall)', 'Overall score'], type: 'number', required: true, show: hasCert, help: () => hasCert() ? SCALES[state.S03].help : '', validate: scoreRule },
        {
          code: 'S07', width: 'half', label: ['Ngày thi', 'Test date'], type: 'date3', years: range(NOW_Y, NOW_Y - 10), required: true, show: hasCert,
          validate: v => validDate(v) && toDate(v) <= NOW ? '' : ['Ngày thi không hợp lệ', 'The test date cannot be in the future.'],
          dyn: v => {
            if (!isIelts() || !validDate(v)) return '';
            const exp = toDate(v); exp.setFullYear(exp.getFullYear() + 2);
            return exp < NOW ? `<span class="wmba-warn">${tx(['IELTS thường có hiệu lực 2 năm.', 'IELTS results are usually valid for 2 years.'])}</span>` : '';
          },
        },
        {
          code: 'S06', label: ['Điểm từng kỹ năng', 'Sub-scores'], optional: true, type: 'group', show: hasCert, help: () => state.S03 === 'toefl' ? SCALES.toefl.subHelp : '', fields: [
            { key: 'L', label: 'Listening', type: 'number', width: 'quarter', validate: subRule },
            { key: 'R', label: 'Reading', type: 'number', width: 'quarter', validate: subRule },
            { key: 'W', label: 'Writing', type: 'number', width: 'quarter', validate: subRule },
            { key: 'S', label: 'Speaking', type: 'number', width: 'quarter', validate: subRule },
          ],
        },
        {
          code: 'S08', label: ['Ngày dự kiến thi', 'Expected test date'], type: 'date3', years: range(NOW_Y, NOW_Y + 2), required: true, show: () => state.S03 === 'none',
          validate: v => validDate(v) && toDate(v) >= startOfToday() ? '' : ['Ngày dự kiến thi phải từ hôm nay trở đi', 'The expected test date must be today or later.'],
        },
      ],
    },
    {
      short: ['Công tác', 'Work'], title: ['Kinh nghiệm làm việc', 'Work experience'],
      lead: ['Vị trí gần nhất trước.', 'Most recent position first.'],
      fields: [
        { type: 'info', show: isHB, html: () => scholarshipBox() },
        {
          code: 'W01', label: ['Quá trình công tác', 'Employment history'], type: 'repeater', min: 1, rowTitle: ['Vị trí', 'Position'], addLabel: ['Thêm vị trí', 'Add another position'],
          help: ['Mỗi vị trí một mục.', 'One entry per role.'], fields: [
            { key: 'period', code: 'W01a', label: ['Thời gian', 'Period'], type: 'monthrange', required: true },
            { key: 'company', code: 'W01b', width: 'half', label: ['Tên công ty', 'Company name'], type: 'text', required: true, autocomplete: 'organization' },
            { key: 'title', code: 'W01e', width: 'half', label: ['Chức danh', 'Job title'], type: 'text', required: true, autocomplete: 'organization-title' },
            { key: 'industry', code: 'W01c', width: 'half', label: ['Ngành', 'Industry'], type: 'select', options: CONFIG.industries, required: true },
            { key: 'size', code: 'W01d', width: 'half', label: ['Quy mô nhân sự', 'Company size'], type: 'select', options: CONFIG.companySizes, required: true },
            { key: 'level', code: 'W01f', width: 'half', label: ['Cấp bậc', 'Level'], type: 'select', options: CONFIG.levels, required: true },
            { key: 'reports', code: 'W01g', width: 'half', label: ['Số người quản lý trực tiếp', 'Number of direct reports'], type: 'number', optional: true, validate: v => /^\d+$/.test(String(v).trim()) ? '' : ['Vui lòng nhập số nguyên', 'Please enter a whole number.'] },
            { key: 'desc', code: 'W01h', label: ['Mô tả ngắn trách nhiệm', 'Key responsibilities'], type: 'textarea', optional: true, rows: 3, maxlength: 300, dyn: v => counter(String(v).length, 300, ['ký tự', 'characters']) },
          ],
        },
        { code: 'W02', width: 'half', label: ['Tổng số năm kinh nghiệm', 'Total years of work experience'], type: 'number', required: true, validate: yearsRule, dyn: yearsHint('all') },
        {
          code: 'W03', width: 'half', label: ['Tổng số năm quản lý', 'Total years in management roles'], type: 'number', required: true, help: ['Từ cấp Leader trở lên.', 'Leader level and above.'],
          validate: v => yearsRule(v) || (parseNum(v) > parseNum(state.W02) ? ['Số năm quản lý không vượt tổng số năm kinh nghiệm', 'Years in management cannot exceed your total years of experience.'] : ''), dyn: yearsHint('mgmt'),
        },
      ],
    },
    {
      short: ['Quốc tế', 'International'], title: ['Ngoại ngữ & Trải nghiệm quốc tế', 'Languages & international exposure'],
      lead: ['Chỉ tiếng mẹ đẻ là bắt buộc.', 'Only your native language is required.'],
      fields: [
        { code: 'L01', label: ['Tiếng mẹ đẻ', 'Native language'], type: 'text', required: true, placeholder: ['Ví dụ: Tiếng Việt', 'e.g. Vietnamese'] },
        {
          code: 'L02', label: ['Ngoại ngữ khác', 'Other languages'], optional: true, type: 'repeater', min: 0, rowTitle: ['Ngoại ngữ', 'Language'], addLabel: ['Thêm ngoại ngữ', 'Add language'],
          empty: ['Bỏ qua nếu không có.', 'Skip if not applicable.'], fields: [
            { key: 'lang', label: ['Ngôn ngữ', 'Language'], type: 'text', required: true, placeholder: ['Ví dụ: Tiếng Anh, Tiếng Nhật', 'e.g. English, Japanese'] },
            { key: 'speak', label: ['Nói', 'Speaking'], type: 'select', options: SKILL, required: true, width: 'third' },
            { key: 'read', label: ['Đọc', 'Reading'], type: 'select', options: SKILL, required: true, width: 'third' },
            { key: 'write', label: ['Viết', 'Writing'], type: 'select', options: SKILL, required: true, width: 'third' },
          ],
        },
        { code: 'L03', label: ['Trải nghiệm quốc tế', 'International experience'], optional: true, type: 'textarea', rows: 4, help: ['Công việc, học tập hoặc dự án quốc tế.', 'Work, study or projects abroad.'] },
      ],
    },
    {
      short: ['Câu hỏi', 'Questions'], title: ['Câu hỏi bổ sung', 'Additional questions'],
      lead: ['Trả lời bằng tiếng Anh, tối đa 250 từ mỗi câu.', 'Answer in English, up to 250 words each.'],
      fields: [
        ...ESSAYS.map(([code, label, ph], i) => ({
          code, n: i + 1, label, short: label, type: 'essay', rows: 6, required: true, reqMsg: ['Vui lòng trả lời câu hỏi này', 'Please answer this question.'],
          placeholder: ph, note: 'Please answer in English.', validate: essayRule, dyn: v => counter(wordCount(v), 250, ['từ', 'words']),
        })),
        {
          code: 'Q08', label: ['Bạn biết đến chương trình qua kênh nào?', 'How did you hear about the programme?'], short: ['Kênh biết đến', 'How you heard about us'], type: 'checks', required: true,
          help: ['Có thể chọn nhiều kênh.', 'Select all that apply.'], reqMsg: ['Vui lòng chọn ít nhất một kênh', 'Please select at least one option.'],
          options: [{ v: 'website', label: 'Website' }, { v: 'facebook', label: 'Facebook' }, { v: 'zalo', label: 'Zalo' }, { v: 'friends', label: ['Bạn bè – đồng nghiệp', 'Friends / colleagues'] }, { v: 'seminar', label: ['Hội thảo', 'Seminar / event'] }, { v: 'other', label: ['Khác', 'Other'] }],
        },
        { code: 'Q08_other', label: ['Kênh khác', 'Other channel'], type: 'text', required: true, show: () => state.Q08.includes('other') },
        {
          code: 'Q09', label: ['Người giới thiệu (học viên hoặc cựu học viên)', 'Referred by a current student or alumnus?'], short: ['Người giới thiệu', 'Referrer'], optional: true, type: 'group', fields: [
            { key: 'name', label: ['Họ tên', 'Full name'], type: 'text', width: 'third' },
            { key: 'cohort', label: ['Khoá', 'Intake'], type: 'text', width: 'third' },
            { key: 'phone', label: ['Số điện thoại', 'Phone'], type: 'tel', width: 'third', validate: phoneRule },
          ],
        },
        {
          code: 'Q10', label: ['Khung giờ có thể phỏng vấn học bổng', 'When are you available for a scholarship interview?'], short: ['Khung giờ phỏng vấn HB', 'Interview availability'], type: 'grid', required: true,
          reqMsg: ['Vui lòng chọn ít nhất một khung giờ', 'Please select at least one time slot.'], show: isHB,
          rows: [{ v: 'morning', label: ['Sáng', 'Morning'] }, { v: 'afternoon', label: ['Chiều', 'Afternoon'] }, { v: 'evening', label: ['Tối', 'Evening'] }],
          cols: [{ v: 'weekday', label: ['Ngày thường', 'Weekday'] }, { v: 'weekend', label: ['Cuối tuần', 'Weekend'] }],
        },
      ],
    },
    {
      short: ['Tài liệu', 'Documents'], title: ['Tài liệu & Cam kết', 'Documents & declaration'],
      lead: [`Mỗi tài liệu một ô, tối đa ${CONFIG.maxFileMB} MB mỗi file.`, `One box per document, max ${CONFIG.maxFileMB} MB each.`],
      fields: [
        { type: 'uploads' },
        { type: 'heading', label: ['Cam kết', 'Declaration'] },
        { type: 'consents', items: ['C1', 'C2', 'C3'] },
      ],
    },
  ];

  const CONSENTS = {
    C1: ['Tôi cam kết thông tin khai là đúng sự thật.', 'I confirm that the information I have provided is true and accurate.'],
    C2: ['Tôi đồng ý để PSO xác minh thông tin với công ty và trường đào tạo.', 'I agree that PSO may verify my information with my employers and educational institutions.'],
    C3: ['Tôi đồng ý với {link} của PSO.', 'I agree to PSO’s {link}.'],
  };
  const PRIVACY = ['Chính sách bảo mật', 'Privacy Policy'];

  function scholarshipBox() {
    const T = CONFIG.thresholds;
    const items = [
      [`<strong>Kinh nghiệm:</strong> tối thiểu ${T.expYears} năm tại doanh nghiệp/tập đoàn lớn, trong đó tối thiểu ${T.mgmtYears} năm ở vị trí quản lý (cấp Leader trở lên).`, `<strong>Experience:</strong> at least ${T.expYears} years at large enterprises or corporations, including at least ${T.mgmtYears} years in a management role (Leader level or above).`],
      ['<strong>Minh chứng vị trí:</strong> thư xác nhận của Phòng Nhân sự, quyết định/thư bổ nhiệm, hoặc giấy tờ tương đương (hợp đồng lao động còn hiệu lực).', '<strong>Proof of position:</strong> an HR confirmation letter, an appointment decision/letter, or an equivalent document (e.g. a current employment contract).'],
      ['<strong>Phỏng vấn</strong> với Scholarship Selection Board: tiềm năng lãnh đạo, thành tích chuyên môn, động lực học MBA, khả năng đóng góp cho cohort.', '<strong>Interview</strong> with the Scholarship Selection Board on leadership potential, professional achievements, motivation for the MBA and contribution to the cohort.'],
      [`<strong>Tiếng Anh:</strong> IELTS Academic từ ${num(T.ielts)} trở lên hoặc chứng chỉ tương đương được Western Sydney University công nhận.`, `<strong>English:</strong> IELTS Academic ${T.ielts} or above, or an equivalent certificate recognised by Western Sydney University.`],
    ];
    return `<aside class="wmba-info"><strong>${tx(['Điều kiện xét học bổng', 'Scholarship requirements'])}</strong>
      <ol>${items.map(i => `<li>${tx(i)}</li>`).join('')}</ol>
    </aside>`;
  }

  // ---------------------------------------------------------------------------
  // Kiểm tra dữ liệu
  // ---------------------------------------------------------------------------
  const optionsOf = f => (typeof f.options === 'function' ? f.options() : f.options || []);
  const optLabel = (f, v) => { const o = optionsOf(f).find(x => String(x.v) === String(v)); return o ? tx(o.label) : v; };
  const isRequired = (f, row) => typeof f.required === 'function' ? f.required(row) : !!f.required;
  const isShown = (f, row) => !f.show || f.show(row);
  const CHOICE_TYPES = ['select', 'combo', 'radio', 'date3', 'monthrange', 'checks', 'grid'];
  const SKIP_TYPES = ['info', 'static', 'heading'];
  const both = x => Array.isArray(x) ? [x[0], x[1] != null ? x[1] : x[0]] : [x, x];

  function isEmpty(v, f) {
    if (f.type === 'date3' || f.type === 'datetext') return !v.d && !v.m && !v.y;
    if (f.type === 'phone') return !String(v.num).trim();
    if (f.type === 'monthrange') return !v.from.m && !v.from.y && !v.to.m && !v.to.y && !v.current;
    if (Array.isArray(v)) return v.length === 0;
    if (typeof v === 'boolean') return !v;
    return v == null || String(v).trim() === '';
  }

  function periodRule(p) {
    const fromOk = p.from.m && p.from.y;
    const toOk = p.current || (p.to.m && p.to.y);
    if (!fromOk || !toOk) return ['Vui lòng chọn đủ tháng/năm', 'Please select both month and year.'];
    const a = monthIdx(p.from);
    if (a > NOW_IDX) return M.period;
    if (!p.current) { const b = monthIdx(p.to); if (b < a || b > NOW_IDX) return M.period; }
    return '';
  }

  // Danh sách mọi ô cần kiểm tra của các field (đã lọc theo điều kiện hiển thị)
  function collect(fields, ctx, out) {
    fields.forEach(f => {
      if (SKIP_TYPES.includes(f.type) || !isShown(f, ctx.row)) return;
      if (f.type === 'uploads') {
        DOCS.filter(docVisible).forEach(d => out.push({ kind: 'upload', f: d, path: d.code, label: d.label }));
        return;
      }
      if (f.type === 'consents') {
        f.items.forEach(c => out.push({ kind: 'consent', f: { code: c }, path: c, label: ['Cam kết', 'Declaration'] }));
        return;
      }
      const path = ctx.prefix ? `${ctx.prefix}.${f.key}` : f.code;
      const own = both(f.short || f.label);
      const label = ctx.label ? [`${ctx.label[0]} · ${own[0]}`, `${ctx.label[1]} · ${own[1]}`] : own;
      if (f.type === 'repeater') {
        const rows = getPath(state, path);
        out.push({ kind: 'rows', f, path, label: f.label });
        rows.forEach((r, i) => collect(f.fields, { row: r, prefix: `${path}.${i}`, label: [`${f.rowTitle[0]} ${i + 1}`, `${f.rowTitle[1]} ${i + 1}`] }, out));
      } else if (f.type === 'group') {
        collect(f.fields, { row: getPath(state, path), prefix: path, label: own }, out);
      } else {
        out.push({ kind: 'field', f, path, row: ctx.row, label });
      }
    });
    return out;
  }
  const checksFor = i => collect(STEPS[i].fields, { row: state, prefix: '' }, []);

  function check(c) {
    const { f, path, row } = c;
    if (c.kind === 'upload') {
      const list = files[f.code] || [];
      if (list.some(x => x.status === 'uploading')) return ['Đang tải file lên, vui lòng đợi', 'Please wait until the upload has finished.'];
      if (list.some(x => x.status === 'error')) return ['Có file tải lên bị lỗi, vui lòng xoá và chọn lại', 'An upload failed. Please remove it and try again.'];
      return f.required() && !list.length ? ['Vui lòng tải lên tài liệu này', 'Please upload this document.'] : '';
    }
    if (c.kind === 'consent') return state[path] ? '' : ['Vui lòng đánh dấu cam kết này', 'Please tick this statement.'];
    const v = getPath(state, path);
    if (c.kind === 'rows') return v.length < f.min ? [`Vui lòng thêm ít nhất ${f.min} ${f.rowTitle[0].toLowerCase()}`, `Please add at least ${f.min} ${f.rowTitle[1].toLowerCase()}.`] : '';
    if (isEmpty(v, f)) {
      if (!isRequired(f, row)) return '';
      if (f.reqMsg) return f.reqMsg;
      const choice = CHOICE_TYPES.includes(f.type);
      return [`Vui lòng ${choice ? 'chọn' : 'nhập'} ${both(f.label)[0].toLowerCase()}`, choice ? 'Please select an option.' : 'This field is required.'];
    }
    if (f.type === 'monthrange') return periodRule(v);
    if ((f.type === 'date3' || f.type === 'datetext') && !validDate(v)) return f.validate ? f.validate(v, row) : ['Ngày chưa hợp lệ', 'Please enter a valid date.'];
    return f.validate ? (f.validate(v, row) || '') : '';
  }

  function validateStep(i) {
    const list = [];
    checksFor(i).forEach(c => {
      const m = check(c);
      if (m) { errors[c.path] = m; list.push({ c, m }); } else delete errors[c.path];
    });
    return list;
  }
  const issuesFor = i => checksFor(i).filter(c => check(c)).length;

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  let host, mainEl, stepperEl, printEl, dialogEl;

  function mount() {
    host = document.getElementById('wmba-app');
    if (!host) return;
    host.innerHTML = `
      <div class="wmba">
        <header class="wmba-banner">
          <img class="wmba-banner-img" src="${esc(CONFIG.assetsUrl)}banner-1600.jpg" srcset="${[800, 1600, 2400].map(w => `${esc(CONFIG.assetsUrl)}banner-${w}.jpg ${w}w`).join(', ')}" sizes="(min-width: 1440px) 1424px, 100vw" alt="" fetchpriority="high">
          <div class="wmba-banner-in">
            <div class="wmba-logos">
              <img class="wmba-logo is-program" src="${esc(CONFIG.assetsUrl)}western-mba-logo.png" alt="Western MBA, hosted by PSO Institute">
              <img class="wmba-logo is-pso" src="${esc(CONFIG.assetsUrl)}PSO.svg" alt="PSO Institute of Applied Science">
            </div>
            <h1 data-t="title"></h1>
          </div>
        </header>
        <div class="wmba-wrap">
          <div class="wmba-tools">
            <span class="wmba-save" aria-live="polite"></span>
          </div>
          <nav class="wmba-stepper"></nav>
          <form class="wmba-main" novalidate></form>
          <div class="wmba-print-area"></div>
        </div>
        <footer class="wmba-footer"></footer>
      </div>
      <dialog class="wmba-dialog" aria-labelledby="wmba-dlg-title"></dialog>`;
    mainEl = $('.wmba-main', host);
    stepperEl = $('.wmba-stepper', host);
    printEl = $('.wmba-print-area', host);
    dialogEl = $('dialog', host);
    bindEvents();
  }

  const CHROME = {
    title: ['Form ứng tuyển Western MBA', 'Western MBA Application Form'],
    progress: ['Tiến trình', 'Progress'],
  };

  function renderChrome() {
    $('.wmba', host).setAttribute('lang', lang);
    $$('[data-t]', host).forEach(el => { el.textContent = tx(CHROME[el.dataset.t]); });
    stepperEl.setAttribute('aria-label', tx(CHROME.progress));
    $('.wmba-footer', host).innerHTML = `<span>PSO Institute</span> · <a href="${esc(CONFIG.privacyUrl)}" target="_blank" rel="noopener">${tx(PRIVACY)}</a>`;
    updateSaveLabel();
  }

  function render(opts = {}) {
    rendering = true;
    renderIndex = new Map();
    renderChrome();
    renderStepper();
    if (view === 'intro') mainEl.innerHTML = renderIntro();
    else if (view === 'review') mainEl.innerHTML = renderReview();
    else if (view === 'done') mainEl.innerHTML = renderDone();
    else mainEl.innerHTML = renderStep(view, opts.summary);
    updateDyn();
    rendering = false;
  }

  function renderStepper() {
    const inSteps = typeof view === 'number';
    stepperEl.hidden = !(inSteps || view === 'review');
    if (stepperEl.hidden) return;
    const total = STEPS.length + 1;
    const cur = inSteps ? view : STEPS.length;
    const items = STEPS.map(s => s.short).concat([['Xem lại', 'Review']]);
    const reached = i => i < STEPS.length ? i <= maxStep : reviewReached;
    stepperEl.innerHTML = `<ol>${items.map((s, i) => {
      const cls = i === cur ? 'is-current' : reached(i) ? 'is-done' : '';
      const can = reached(i) && i !== cur;
      return `<li><button type="button" class="wmba-step-btn ${cls}" ${can ? `data-action="goto" data-step="${i}"` : 'tabindex="-1"'} ${i === cur ? 'aria-current="step"' : ''}>
        <span class="bar"></span><span class="num">${i + 1}</span><span class="name">${esc(tx(s))}</span></button></li>`;
    }).join('')}</ol>
      <div class="wmba-mstep"><p>${inSteps ? `${tf(['Bước {n}/{t}', 'Step {n} of {t}'], { n: cur + 1, t: STEPS.length })} · ${esc(tx(STEPS[cur].title))}` : tx(['Xem lại hồ sơ', 'Review your application'])}</p>
        <div class="track"><i style="width:${((cur + 1) / total) * 100}%"></i></div></div>`;
  }

  function attrs(o) { return Object.entries(o).filter(([, v]) => v !== false && v != null && v !== '').map(([k, v]) => v === true ? k : `${k}="${esc(v)}"`).join(' '); }

  // Dropdown theo design system: nút + listbox tự vẽ; <select> ẩn giữ giá trị để luồng change/readControl dùng chung
  let selSeq = 0;
  function selectHTML(a, options, value, placeholder) {
    const ph = tx(placeholder) || tx(['Chọn…', 'Select…']);
    const cur = options.find(o => String(o.v) === String(value));
    const lid = `wmba-sel-${++selSeq}`;
    const keys = { 'data-path': a['data-path'], 'data-part': a['data-part'] };
    return `<div class="wmba-select"><button type="button" class="wmba-input wmba-select-btn${cur ? '' : ' is-ph'}" ${attrs(Object.assign({}, a, { role: 'combobox', 'aria-haspopup': 'listbox', 'aria-expanded': 'false', 'aria-controls': lid, 'data-select': true }))}>${esc(cur ? tx(cur.label) : ph)}</button>`
      + `<select class="wmba-select-native" tabindex="-1" aria-hidden="true" ${attrs(keys)}><option value="">${esc(ph)}</option>${options.map(o => `<option value="${esc(o.v)}"${String(o.v) === String(value) ? ' selected' : ''}>${esc(tx(o.label))}</option>`).join('')}</select>`
      + `<ul class="wmba-combo-list wmba-select-list" id="${lid}" role="listbox" hidden></ul></div>`;
  }

  function labelHTML(f, row, forId, tag = 'label') {
    const req = isRequired(f, row);
    const inner = `${req ? '<span class="wmba-req" aria-hidden="true">*</span>' : ''}${esc(tx(f.label))}${!req && f.optional ? `<span class="wmba-opt">${tx(OPTIONAL)}</span>` : ''}`;
    return tag === 'legend' ? `<legend class="wmba-label">${inner}</legend>` : `<label class="wmba-label" for="${forId}">${inner}</label>`;
  }

  function renderField(f, ctx) {
    if (f.type === 'info') return isShown(f, ctx.row) ? `<div class="wmba-w-full">${f.html()}</div>` : '';
    if (f.type === 'heading') return `<h3 class="wmba-subh wmba-w-full">${esc(tx(f.label))}</h3>`;
    if (f.type === 'uploads') return `<div class="wmba-w-full">${renderUploads()}</div>`;
    if (f.type === 'consents') return `<div class="wmba-w-full">${renderConsents(f)}</div>`;
    if (!isShown(f, ctx.row)) return '';
    const path = ctx.prefix ? `${ctx.prefix}.${f.key}` : f.code;
    const v = getPath(state, path);
    const id = idOf(path);
    const err = errors[path] ? tx(errors[path]) : '';
    const w = `wmba-w-${f.width || 'full'}`;
    const req = isRequired(f, ctx.row);
    const helpText = tx(typeof f.help === 'function' ? f.help() : f.help);
    const described = [helpText && `${id}-help`, f.dyn && `${id}-dyn`, `${id}-err`].filter(Boolean).join(' ');
    const common = { 'data-path': path, 'aria-describedby': described, 'aria-invalid': err ? 'true' : false, 'aria-required': req ? 'true' : false };
    const help = helpText ? `<p class="wmba-help" id="${id}-help">${esc(helpText)}</p>` : '';
    const dyn = f.dyn ? `<div class="wmba-dyn" id="${id}-dyn" data-dyn="${path}" aria-live="polite"></div>` : '';
    const errEl = `<p class="wmba-err" id="${id}-err">${esc(err)}</p>`;
    const ph = tx(f.placeholder);
    renderIndex.set(path, { kind: f.type === 'repeater' ? 'rows' : 'field', f, path, row: ctx.row });

    const wrapDiv = control => `<div class="wmba-field ${w}${err ? ' has-err' : ''}" data-field="${path}">${labelHTML(f, ctx.row, id)}${f.note ? `<p class="wmba-note">${esc(f.note)}</p>` : ''}${control}${help}${dyn}${errEl}</div>`;
    const wrapSet = control => `<fieldset class="wmba-field ${w}${err ? ' has-err' : ''}" data-field="${path}">${labelHTML(f, ctx.row, id, 'legend')}${control}${help}${dyn}${errEl}</fieldset>`;

    switch (f.type) {
      case 'static':
        return `<div class="wmba-field ${w}"><span class="wmba-label">${esc(tx(f.label))}</span><div class="wmba-static">${esc(v)}</div></div>`;
      case 'text': case 'email': case 'tel': case 'url': case 'number':
        return wrapDiv(`<input class="wmba-input" ${attrs(Object.assign({
          id, type: f.type === 'number' ? 'text' : f.type, inputmode: f.type === 'number' ? 'decimal' : false,
          value: v, placeholder: ph, autocomplete: f.autocomplete, maxlength: f.maxlength, disabled: !!(f.disabled && f.disabled()),
        }, common))}>`);
      case 'essay':
        return `<div class="wmba-field wmba-essay ${w}${err ? ' has-err' : ''}" data-field="${path}">
          <div class="wmba-essay-head"><span class="wmba-essay-num">${tf(['Câu {n}/{t}', 'Question {n} of {t}'], { n: f.n, t: ESSAYS.length })}</span><span class="wmba-tag" data-essay-status="${path}"></span></div>
          ${labelHTML(f, ctx.row, id)}<p class="wmba-note">${esc(f.note)}</p>
          <textarea class="wmba-input is-essay" ${attrs(Object.assign({ id, rows: f.rows, placeholder: ph, lang: 'en' }, common))}>${esc(v)}</textarea>${help}${dyn}${errEl}</div>`;
      case 'datetext': {
        // Ô nhập dd/mm/yyyy + nút mở lịch tự vẽ (cal*)
        const iso = validDate(v) ? `${v.y}-${pad(v.m)}-${pad(v.d)}` : '';
        const shown = iso ? fmtDate(v) : [v.d, v.m, v.y].some(Boolean) ? [v.d, v.m, v.y].join('/').replace(/\/+$/, '') : '';
        return wrapDiv(`<div class="wmba-datepick"><input class="wmba-input" ${attrs(Object.assign({ id, type: 'text', inputmode: 'numeric', maxlength: 10, autocomplete: 'bday', placeholder: 'DD/MM/YYYY', value: shown, 'data-date': true }, common))}>
          <button type="button" class="wmba-datepick-btn" data-action="pick-date" data-target="${path}" aria-haspopup="dialog" aria-expanded="false" aria-label="${esc(tx(['Chọn ngày trên lịch', 'Choose date from calendar']))}"><svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true"><rect x="2.25" y="3.5" width="13.5" height="12" rx="2" stroke="currentColor" stroke-width="1.5"/><path d="M2.25 7.25h13.5M6 2v3M12 2v3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg></button>
          <div class="wmba-cal" role="dialog" aria-label="${esc(tx(['Chọn ngày', 'Choose date']))}" data-cal="${path}" data-min="${f.min || ''}" hidden></div></div>`);
      }
      case 'phone':
        return wrapDiv(`<div class="wmba-phone">${selectHTML(Object.assign({ 'data-part': 'cc', 'aria-label': tx(['Mã quốc gia', 'Country code']) }, common), DIAL_CODES, v.cc, '+')}<input class="wmba-input" ${attrs(Object.assign({ id, type: 'tel', inputmode: 'tel', autocomplete: 'tel-national', value: v.num, 'data-part': 'num' }, common))}></div>`);
      case 'combo': {
        const cur = optionsOf(f).find(o => o.v === v);
        return wrapDiv(`<div class="wmba-combo"><input class="wmba-input" ${attrs({
          id, type: 'text', role: 'combobox', autocomplete: 'off', spellcheck: 'false', 'aria-autocomplete': 'list', 'aria-expanded': 'false', 'aria-controls': `${id}-list`,
          'data-combo-input': path, value: cur ? tx(cur.label) : '', placeholder: tx(typeof f.placeholder === 'function' ? f.placeholder() : f.placeholder || ['Gõ để tìm…', 'Start typing to search…']),
          disabled: f.disabled && f.disabled(),
          'aria-describedby': described, 'aria-invalid': err ? 'true' : false, 'aria-required': req ? 'true' : false,
        })}><ul class="wmba-combo-list" id="${id}-list" role="listbox" aria-label="${esc(tx(f.label))}" hidden></ul></div>`);
      }
      case 'textarea':
        return wrapDiv(`<textarea class="wmba-input${f.type === 'essay' ? ' is-essay' : ''}" ${attrs(Object.assign({ id, rows: f.rows || 3, placeholder: ph, maxlength: f.maxlength, autocomplete: f.autocomplete, lang: f.type === 'essay' ? 'en' : false }, common))}>${esc(v)}</textarea>`);
      case 'select':
        return wrapDiv(selectHTML(Object.assign({ id }, common), optionsOf(f), v, f.placeholder));
      case 'radio':
        return wrapSet(`<div class="wmba-choices${f.stack ? ' is-stack' : ''}${f.cards ? ' is-cards' : ''}">${optionsOf(f).map((o, i) => `
          <label class="wmba-choice"><input type="radio" ${attrs(Object.assign({ id: i === 0 ? id : false, name: id, value: o.v, checked: o.v === v }, common))}>
          <span><span class="wmba-choice-label">${esc(tx(o.label))}</span>${o.desc ? `<span class="wmba-choice-desc">${esc(tx(o.desc))}</span>` : ''}</span></label>`).join('')}</div>`);
      case 'checks':
        return wrapSet(`<div class="wmba-checks">${optionsOf(f).map((o, i) => `
          <label class="wmba-choice"><input type="checkbox" data-multi ${attrs(Object.assign({ id: i === 0 ? id : false, value: o.v, checked: v.includes(o.v) }, common))}>
          <span class="wmba-choice-label">${esc(tx(o.label))}</span></label>`).join('')}</div>`);
      case 'grid':
        return wrapSet(`<table class="wmba-slots"><thead><tr><th></th>${f.cols.map(c => `<th scope="col">${esc(tx(c.label))}</th>`).join('')}</tr></thead><tbody>
          ${f.rows.map((r, ri) => `<tr><th scope="row">${esc(tx(r.label))}</th>${f.cols.map((c, ci) => {
            const val = `${c.v}_${r.v}`;
            return `<td><label class="wmba-slot"><input type="checkbox" data-multi ${attrs(Object.assign({ id: ri + ci === 0 ? id : false, value: val, checked: v.includes(val), 'aria-label': `${tx(c.label)} – ${tx(r.label)}` }, common))}></label></td>`;
          }).join('')}</tr>`).join('')}</tbody></table>`);
      case 'date3': {
        const part = (p, opts, label, first) => selectHTML(Object.assign({ id: first ? id : false, 'data-part': p, 'aria-label': tx(label) }, common), opts, v[p], label);
        return wrapSet(`<div class="wmba-parts">
          ${part('d', range(1, 31).map(n => ({ v: String(n), label: pad(n) })), ['Ngày', 'Day'], true)}
          ${part('m', range(1, 12).map(n => ({ v: String(n), label: monthLabel(n) })), ['Tháng', 'Month'])}
          ${part('y', f.years.map(n => ({ v: String(n), label: String(n) })), ['Năm', 'Year'])}
        </div>`);
      }
      case 'monthrange': {
        const months = range(1, 12).map(n => ({ v: String(n), label: monthLabel(n) }));
        const s = (p, opts, label, ph2, first) => selectHTML(Object.assign({ id: first ? id : false, 'data-part': p, 'aria-label': tx(label) }, common), opts, getPath(v, p), ph2);
        const MONTH = ['Tháng', 'Month'], YEAR = ['Năm', 'Year'];
        return wrapSet(`<div class="wmba-period">
          <div class="wmba-period-part"><span class="wmba-mini">${tx(['Từ', 'From'])}</span><div class="wmba-pair">${s('from.m', months, ['Tháng bắt đầu', 'Start month'], MONTH, true)}${s('from.y', yearOpts, ['Năm bắt đầu', 'Start year'], YEAR)}</div></div>
          <div class="wmba-period-part"><span class="wmba-mini">${tx(['Đến', 'To'])}</span>${v.current ? `<div class="wmba-now">${tx(['Hiện tại', 'Present'])}</div>` : `<div class="wmba-pair">${s('to.m', months, ['Tháng kết thúc', 'End month'], MONTH)}${s('to.y', yearOpts, ['Năm kết thúc', 'End year'], YEAR)}</div>`}</div>
          <label class="wmba-check-inline"><input type="checkbox" ${attrs({ 'data-path': path, 'data-part': 'current', checked: v.current })}> ${tx(['Tôi đang làm ở đây', 'I currently work here'])}</label>
        </div>`);
      }
      case 'group':
        return `<fieldset class="wmba-field ${w}" data-field="${path}">${labelHTML(f, ctx.row, id, 'legend')}<div class="wmba-grid">${f.fields.map(sf => renderField(sf, { row: v, prefix: path })).join('')}</div>${help}</fieldset>`;
      case 'repeater': {
        const rows = v;
        const body = rows.length ? rows.map((r, i) => `
          <div class="wmba-row">
            <div class="wmba-row-head"><span class="wmba-row-title">${esc(tx(f.rowTitle))} ${i + 1}</span>
              ${rows.length > f.min ? `<button type="button" class="wmba-remove" data-action="remove-row" data-path="${path}" data-index="${i}" aria-label="${esc(`${tx(['Xoá', 'Remove'])} ${tx(f.rowTitle)} ${i + 1}`)}"><svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M2.5 4h11M6.5 4V2.75h3V4M4 4l.6 8.6c.05.8.7 1.4 1.5 1.4h3.8c.8 0 1.45-.6 1.5-1.4L12 4M6.75 7v4.25M9.25 7v4.25" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>${tx(['Xoá', 'Remove'])}</button>` : ''}</div>
            <div class="wmba-grid">${f.fields.map(sf => renderField(sf, { row: r, prefix: `${path}.${i}` })).join('')}</div>
          </div>`).join('') : `<div class="wmba-row-empty">${esc(tx(f.empty))}</div>`;
        return `<fieldset class="wmba-field wmba-repeater ${w}${err ? ' has-err' : ''}" data-field="${path}">${labelHTML(f, ctx.row, id, 'legend')}${help}${body}
          <button type="button" class="wmba-add" id="${id}" data-action="add-row" data-path="${path}">+ ${esc(tx(f.addLabel))}</button>${errEl}</fieldset>`;
      }
    }
    return '';
  }

  // Cloudflare Turnstile (chế độ ẩn) gắn cạnh khối cam kết ở bản chính thức.
  function renderConsents(f) {
    return `<div class="wmba-consents" role="group" aria-label="${esc(tx(['Cam kết', 'Declaration']))}">${f.items.map(c => {
      const id = idOf(c);
      const text = c === 'C3'
        ? tf(CONSENTS.C3, { link: `<a href="${esc(CONFIG.privacyUrl)}" target="_blank" rel="noopener">${tx(PRIVACY)}</a>` })
        : esc(tx(CONSENTS[c]));
      renderIndex.set(c, { kind: 'consent', f: { code: c }, path: c });
      return `<div data-field="${c}"><label class="wmba-consent"><input type="checkbox" ${attrs({ id, 'data-path': c, checked: state[c], 'aria-describedby': `${id}-err`, 'aria-invalid': errors[c] ? 'true' : false })}> <span>${text}</span></label>
        <p class="wmba-err" id="${id}-err">${esc(errors[c] ? tx(errors[c]) : '')}</p></div>`;
    }).join('')}</div>
    <div class="wmba-hp" aria-hidden="true"><label>Website <input type="text" name="website" data-hp tabindex="-1" autocomplete="off"></label></div>`;
  }

  function renderStep(i, summary) {
    const s = STEPS[i];
    const last = i === STEPS.length - 1;
    const nextLabel = returnToReview ? ['Lưu & về trang xem lại', 'Save and back to review'] : last ? ['Lưu & xem lại hồ sơ', 'Save and review'] : ['Lưu & tiếp tục', 'Save and continue'];
    return `<section class="wmba-card">
      <div class="wmba-step-kicker">${tf(['Bước {n}/{t}', 'Step {n} of {t}'], { n: i + 1, t: STEPS.length })}</div>
      <h2 tabindex="-1">${esc(tx(s.title))}</h2>
      <p class="wmba-lead">${esc(tx(s.lead))}</p>
      ${summary && summary.length ? errorSummary(summary) : ''}
      <div class="wmba-grid">${s.fields.map(f => renderField(f, { row: state, prefix: '' })).join('')}</div>
      <div class="wmba-nav">
        <button type="button" class="wmba-btn is-ghost" data-action="back">${tx(['Quay lại', 'Back'])}</button>
        <button type="submit" class="wmba-btn is-primary" data-action="next">${tx(nextLabel)}</button>
      </div>
    </section>`;
  }

  function errorSummary(list) {
    return `<div class="wmba-alert is-err" tabindex="-1" data-summary role="alert">
      <p>${tf(['Còn {n} mục cần hoàn thiện trước khi tiếp tục:', '{n} item(s) need attention before you continue:'], { n: list.length })}</p>
      <ul>${list.map(({ c, m }) => `<li><a href="#${idOf(c.path)}" data-action="jump" data-target="${idOf(c.path)}">${esc(tx(c.label))}: ${esc(tx(m))}</a></li>`).join('')}</ul>
    </div>`;
  }

  // ---------- Upload ----------
  // 'image' nhận mọi định dạng ảnh (JPG, PNG, HEIC, WEBP…), trừ SVG vì có thể chứa script.
  const KIND_LABEL = { pdf: 'PDF', image: ['Ảnh (mọi định dạng)', 'Image (any format)'] };
  const ACCEPT = { pdf: 'application/pdf,.pdf', image: 'image/*,.heic,.heif' };
  const kindsLabel = d => d.kinds.map(k => tx(KIND_LABEL[k])).join(', ');

  function renderUploads() {
    return DOC_GROUPS.map(([title, codes]) => {
      const docs = codes.map(c => DOC_BY_CODE[c]).filter(docVisible);
      return docs.length ? `<div class="wmba-doc-group"><h3>${esc(tx(title))}</h3>${docs.map(renderDoc).join('')}</div>` : '';
    }).join('');
  }

  function renderDoc(d) {
    const list = files[d.code] || [];
    const req = d.required();
    const err = errors[d.code];
    const id = idOf(d.code);
    const left = d.max - list.length;
    return `<div class="wmba-doc${err ? ' has-err' : ''}" data-doc="${d.code}">
      <div class="wmba-doc-head">
        <div>
          <div class="wmba-doc-title">${req ? '<span class="wmba-req" aria-hidden="true">*</span>' : ''}${esc(tx(d.label))}${req ? '' : `<span class="wmba-opt">${tx(OPTIONAL)}</span>`}</div>
          ${d.note ? `<p class="wmba-help">${esc(tx(d.note))}</p>` : ''}
        </div>
        <div class="wmba-doc-meta">${tf(['{f} · tối đa {m} file', '{f} · up to {m} file(s)'], { f: kindsLabel(d), m: d.max })}</div>
      </div>
      <ul class="wmba-files">${list.map(x => fileItem(d.code, x)).join('')}</ul>
      ${left > 0 ? `<label class="wmba-drop" data-drop="${d.code}">
        <input type="file" ${attrs({ id, 'data-upload': d.code, accept: d.kinds.map(k => ACCEPT[k]).join(','), multiple: left > 1, 'aria-describedby': `${id}-err`, 'aria-label': `${tx(['Tải lên', 'Upload'])} ${tx(d.label)}` })}>
        <span>${tx(['Chọn file hoặc kéo thả vào đây', 'Choose file(s) or drag them here'])}</span>
        <span class="wmba-mini">${list.length ? tf(['Còn thêm được {n} file', '{n} more file(s) allowed'], { n: left }) : tf(['{f}, tối đa {mb} MB mỗi file', '{f}, max {mb} MB each'], { f: kindsLabel(d), mb: CONFIG.maxFileMB })}</span>
      </label>` : ''}
      ${uploadMsgs[d.code] && uploadMsgs[d.code].length ? `<p class="wmba-warn">${uploadMsgs[d.code].map(m => esc(tx(m))).join(' ')}</p>` : ''}
      <p class="wmba-err" id="${id}-err">${esc(err ? tx(err) : '')}</p>
    </div>`;
  }

  function fileStatus(x) {
    if (x.status === 'done') return tx(['Đã tải lên', 'Uploaded']);
    if (x.status === 'error') return tx(['Tải lên thất bại', 'Upload failed']);
    return `${tx(['Đang tải lên…', 'Uploading…'])} ${x.progress}%`;
  }

  function fileItem(code, x) {
    return `<li class="wmba-file is-${x.status}" data-file="${x.id}">
      <span class="wmba-file-icon is-${x.kind}">${esc(x.kind.toUpperCase())}</span>
      <span class="wmba-file-main"><span class="wmba-file-name">${esc(x.name)}</span>
        <span class="wmba-file-sub">${fmtSize(x.size)} · ${fileStatus(x)}</span>
        <span class="wmba-bar"><span style="width:${x.progress}%"></span></span></span>
      <button type="button" class="wmba-remove" data-action="remove-file" data-code="${code}" data-id="${x.id}" aria-label="${esc(`${tx(['Xoá', 'Remove'])} ${x.name}`)}">${tx(['Xoá', 'Remove'])}</button>
    </li>`;
  }

  function refreshDoc(code) {
    const el = $(`[data-doc="${code}"]`, mainEl);
    if (el) el.outerHTML = renderDoc(DOC_BY_CODE[code]);
  }

  async function sniff(file) {
    const b = new Uint8Array(await file.slice(0, 16).arrayBuffer());
    if (b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46) return 'pdf';
    if (b[0] === 0xFF && b[1] === 0xD8 && b[2] === 0xFF) return 'jpg';
    if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4E && b[3] === 0x47) return 'png';
    const head = String.fromCharCode.apply(null, b);
    if (/^GIF8/.test(head)) return 'gif';
    if (/^RIFF/.test(head) && head.slice(8, 12) === 'WEBP') return 'webp';
    if (/^BM/.test(head)) return 'bmp';
    if (/^(II\*\0|MM\0\*)/.test(head)) return 'tiff';
    if (/^ftyp(heic|heix|hevc|heif|mif1|msf1|avif)/.test(head.slice(4, 12))) return 'heic';
    // Định dạng ảnh khác mà trình duyệt nhận diện được (trừ SVG)
    if (/^image\//.test(file.type) && !/svg/.test(file.type)) return (file.name.split('.').pop() || 'img').toLowerCase().slice(0, 4);
    return '';
  }

  async function addFiles(code, fileList) {
    const d = DOC_BY_CODE[code];
    const list = files[code] || (files[code] = []);
    const msgs = [];
    const f = kindsLabel(d);
    for (const file of Array.from(fileList)) {
      const n = file.name;
      if (list.length >= d.max) { msgs.push([`Ô này chỉ nhận tối đa ${d.max} file.`, `You can upload up to ${d.max} file(s) here.`]); break; }
      if (file.size > CONFIG.maxFileMB * 1048576) { msgs.push([`“${n}” vượt quá ${CONFIG.maxFileMB} MB.`, `“${n}” is larger than ${CONFIG.maxFileMB} MB.`]); continue; }
      const kind = await sniff(file);
      const ok = kind === 'pdf' ? d.kinds.includes('pdf') : !!kind && d.kinds.includes('image');
      if (!ok) { msgs.push([`“${n}” không đúng định dạng (chỉ nhận ${f}).`, `“${n}” is not an accepted file type (${f} only).`]); continue; }
      const item = { id: uid(), name: n, size: file.size, kind, progress: 0, status: 'uploading' };
      list.push(item);
      track('wmba_file_upload', { doc: code });
      api.upload(file, code, p => {
        item.progress = p;
        const li = $(`[data-file="${item.id}"]`, mainEl);
        if (li) { $('.wmba-bar > span', li).style.width = `${p}%`; $('.wmba-file-sub', li).textContent = `${fmtSize(item.size)} · ${fileStatus(item)}`; }
      }).then(res => {
        item.status = 'done'; item.serverId = res.id;
      }).catch(() => { item.status = 'error'; }).then(() => {
        if (errors[code]) { const m = check({ kind: 'upload', f: d, path: code }); m ? errors[code] = m : delete errors[code]; }
        refreshDoc(code);
      });
    }
    uploadMsgs[code] = msgs;
    delete errors[code];
    refreshDoc(code);
  }

  // ---------- Intro ----------
  function renderIntro() {
    const draft = readJSON(CONFIG.storageKey, null);
    const when = draft && draft.savedAt ? new Date(draft.savedAt) : null;
    const whenText = when ? `${pad(when.getHours())}:${pad(when.getMinutes())}, ${pad(when.getDate())}/${pad(when.getMonth() + 1)}` : '';
    const cond = { U05: [' (nếu đã có)', ' (if available)'], U07: [' (không bắt buộc)', ' (optional)'] };
    const docs = DOCS.map(d => `<li>${esc(tx(d.label))}${cond[d.code] ? tx(cond[d.code]) : ''}<span class="wmba-mini">${kindsLabel(d)}${d.note ? ` · ${esc(tx(d.note))}` : ''}</span></li>`).join('');
    return `
      <section class="wmba-card wmba-launch">
        <div>
          <h2 tabindex="-1">${tx(draft ? ['Tiếp tục hồ sơ của bạn', 'Continue your application'] : ['Bắt đầu hồ sơ ứng tuyển', 'Start your application'])}</h2>
          <p class="wmba-lead">${draft
            ? tf(['Bạn có một bản nháp chưa nộp, lưu lúc {t}.', 'You have an unsubmitted draft saved at {t}.'], { t: whenText })
            : tx(['7 bước, khoảng 30–40 phút. Bản nháp được lưu trên trình duyệt này.', '7 steps, about 30–40 minutes. Your progress is saved in this browser.'])}</p>
        </div>
        <div class="wmba-launch-actions">${draft
          ? `<button type="button" class="wmba-btn is-ghost" data-action="start">${tx(['Bắt đầu hồ sơ mới', 'Start a new application'])}</button>
             <button type="button" class="wmba-btn is-primary" data-action="resume">${tx(['Tiếp tục điền', 'Continue application'])}</button>`
          : `<button type="button" class="wmba-btn is-primary" data-action="start">${tx(['Bắt đầu điền form', 'Start application'])}</button>`}</div>
      </section>
      <section class="wmba-card">
        <div><h3>${tx(['Giấy tờ cần chuẩn bị (bản scan/ảnh rõ nét)', 'Documents to prepare (clear scans or photos)'])}</h3><ul class="wmba-list">${docs}</ul></div>
      </section>`;
  }

  // ---------- Review ----------
  function fmtValue(f, v) {
    if (isEmpty(v, f)) return '<span class="wmba-empty">—</span>';
    switch (f.type) {
      case 'select': case 'radio': return esc(optLabel(f, v));
      case 'date3': case 'datetext': return esc(fmtDate(v) || tx(['Chưa đủ ngày/tháng/năm', 'Incomplete date']));
      case 'phone': return esc(`${v.cc} ${groupDigits(normalizeMobile(v))}`);
      case 'combo': return esc(optLabel(f, v));
      case 'monthrange': return esc(periodText(v));
      case 'checks': return esc(v.map(x => x === 'other' && f.code === 'Q08' && state.Q08_other ? `${optLabel(f, x)} (${state.Q08_other})` : optLabel(f, x)).join(', '));
      case 'grid': return esc(v.map(x => { const [c, r] = x.split('_'); return `${tx(f.cols.find(o => o.v === c).label)} – ${tx(f.rows.find(o => o.v === r).label)}`; }).join(', '));
      case 'essay': return `<div class="wmba-pre">${esc(v)}</div><span class="wmba-mini">${wordCount(v)} ${tx(['từ', 'words'])}</span>`;
      case 'textarea': return `<div class="wmba-pre">${esc(v)}</div>`;
      default:
        if (f.mask) { const s = String(v); return `<span class="wmba-screen-only">${esc(s)}</span><span class="wmba-print-only">••••${esc(s.slice(-4))}</span>`; }
        return esc(v);
    }
  }

  function reviewRows(fields, row, prefix) {
    return fields.map(f => {
      if (['info', 'uploads', 'heading', 'consents'].includes(f.type) || f.code === 'Q08_other' || !isShown(f, row)) return '';
      const path = prefix ? `${prefix}.${f.key}` : f.code;
      const v = getPath(state, path);
      const dt = esc(tx(f.short || f.label));
      if (f.type === 'repeater') {
        const body = v.length ? v.map((r, i) => `<div class="wmba-rv-sub"><div class="wmba-rv-subtitle">${esc(tx(f.rowTitle))} ${i + 1}</div><dl class="wmba-rv">${reviewRows(f.fields, r, `${path}.${i}`)}</dl></div>`).join('') : '<span class="wmba-empty">—</span>';
        return `<div class="wmba-rv-row"><dt>${dt}</dt><dd>${body}</dd></div>`;
      }
      if (f.type === 'group') {
        const parts = f.fields.filter(sf => !isEmpty(v[sf.key], sf)).map(sf => `${esc(tx(sf.label))}: ${esc(v[sf.key])}`);
        return `<div class="wmba-rv-row"><dt>${dt}</dt><dd>${parts.join(' · ') || '<span class="wmba-empty">—</span>'}</dd></div>`;
      }
      return `<div class="wmba-rv-row"><dt>${dt}</dt><dd>${fmtValue(f, v)}</dd></div>`;
    }).join('');
  }

  function reviewDocs() {
    return DOCS.filter(docVisible).map(d => {
      const list = (files[d.code] || []).filter(x => x.status === 'done');
      const val = list.length ? `<span class="wmba-ok-text">✓</span> ${list.map(x => esc(x.name)).join(', ')}`
        : d.required() ? `<span class="wmba-err-text">${tx(['Chưa tải lên', 'Not uploaded'])}</span>` : '<span class="wmba-empty">—</span>';
      return `<div class="wmba-rv-row"><dt>${esc(tx(d.label))}</dt><dd>${val}</dd></div>`;
    }).join('') + `<div class="wmba-rv-row"><dt>${tx(['Cam kết', 'Declaration'])}</dt><dd>${state.C1 && state.C2 && state.C3 ? `<span class="wmba-ok-text">✓</span> ${tx(['Đã đồng ý 3 cam kết', 'All 3 statements accepted'])}` : `<span class="wmba-err-text">${tx(['Chưa đủ', 'Incomplete'])}</span>`}</dd></div>`;
  }

  function reviewSections(editable) {
    return STEPS.map((s, i) => {
      const n = editable ? issuesFor(i) : 0;
      const badge = editable ? (n ? `<span class="wmba-badge is-err">${tf(['{n} mục cần bổ sung', '{n} to fix'], { n })}</span>` : `<span class="wmba-badge is-ok">${tx(['Đầy đủ', 'Complete'])}</span>`) : '';
      const body = i === STEPS.length - 1 ? reviewDocs() : reviewRows(s.fields, state, '');
      return `<section class="wmba-rv-sec">
        <header><h3>${i + 1}. ${esc(tx(s.title))}${badge}</h3>${editable ? `<button type="button" data-action="edit" data-step="${i}">${tx(['Sửa', 'Edit'])}</button>` : ''}</header>
        <dl class="wmba-rv">${body}</dl>
      </section>`;
    }).join('');
  }

  function renderReview() {
    const bad = STEPS.map((s, i) => issuesFor(i) ? `${i + 1}. ${tx(s.short)}` : '').filter(Boolean);
    return `<section class="wmba-card">
        <div class="wmba-step-kicker">${tx(['Bước cuối', 'Final step'])}</div>
        <h2 tabindex="-1">${tx(['Xem lại hồ sơ', 'Review your application'])}</h2>
        <p class="wmba-lead">${tx(['Vui lòng kiểm tra kỹ thông tin. Bấm “Sửa” để chỉnh từng phần.', 'Please check your information carefully. Use “Edit” to change any section.'])}</p>
        ${bad.length ? `<div class="wmba-alert is-err" role="alert"><p style="margin:0">${tf(['Còn thiếu thông tin bắt buộc ở: {s}. Vui lòng hoàn thành trước khi nộp.', 'Some required information is still missing in: {s}. Please complete it before submitting.'], { s: bad.join(', ') })}</p></div>` : ''}
        ${reviewSections(true)}
        <div class="wmba-nav">
          <button type="button" class="wmba-btn is-ghost" data-action="back">${tx(['Quay lại', 'Back'])}</button>
          <button type="button" class="wmba-btn is-accent" data-action="submit">${tx(['Nộp hồ sơ', 'Submit application'])}</button>
        </div>
      </section>`;
  }

  // ---------- Done ----------
  function renderDone() {
    const hb = isHB();
    printEl.innerHTML = `<section class="wmba-card"><h2>${tx(['Tóm tắt hồ sơ', 'Application summary'])} ${esc(submitted.code)}</h2><p class="wmba-lead">${esc(submitted.at)}</p>${reviewSections(false)}</section>`;
    const steps = [
      [['Xét hồ sơ', 'Application review'], ['Admission kiểm tra hồ sơ và có thể gửi bạn link bổ sung giấy tờ nếu còn thiếu.', 'Admission reviews your application and may send you a link to upload any missing documents.']],
      [['Phỏng vấn trực tiếp', 'Interview'], ['Với Academic và Industry expert/Alumni.', 'With an Academic and an Industry expert or Alumnus.']],
      hb ? [['Phỏng vấn học bổng', 'Scholarship interview'], ['Với Scholarship Selection Board, theo khung giờ bạn đã chọn.', 'With the Scholarship Selection Board, at one of the times you selected.']] : null,
      [['Nhận kết quả & offer', 'Result & offer'], ['Sau đó hoàn tất hồ sơ nhập học và tham dự orientation.', 'Then complete your enrolment documents and attend orientation.']],
    ].filter(Boolean);
    return `<section class="wmba-card wmba-done">
      <div class="wmba-done-icon" aria-hidden="true"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></div>
      <h2 tabindex="-1">${tx(['Cảm ơn bạn! Hồ sơ đã được nộp thành công.', 'Thank you! Your application has been submitted.'])}</h2>
      <p class="wmba-code-label">${tx(['Mã hồ sơ của bạn', 'Your application ID'])}</p>
      <div class="wmba-code">${esc(submitted.code)}</div>
      <p>${tf(['Email xác nhận kèm bản tóm tắt hồ sơ đã được gửi đến {e}. Vui lòng lưu lại mã hồ sơ khi liên hệ {c}.', 'A confirmation email with a summary of your application has been sent to {e}. Please quote your application ID when contacting {c}.'], { e: `<b>${esc(state.P03)}</b>`, c: esc(tx(CONFIG.contact)) })}</p>
      <button type="button" class="wmba-btn is-ghost" data-action="print">${tx(['Tải bản tóm tắt (PDF)', 'Download summary (PDF)'])}</button>
      <ol class="wmba-timeline">${steps.map(([t, d]) => `<li><b>${tx(t)}</b><span>${tx(d)}</span></li>`).join('')}</ol>
    </section>`;
  }

  // ---------- Dynamic hints ----------
  const essayState = code => { const n = wordCount(state[code]); return n === 0 ? 'todo' : n > 250 ? 'over' : 'done'; };
  function updateDyn() {
    $$('[data-dyn]', mainEl).forEach(el => {
      const entry = renderIndex.get(el.dataset.dyn);
      if (entry) el.innerHTML = entry.f.dyn(getPath(state, entry.path), entry.row, entry.path);
    });
    $$('[data-essay-status]', mainEl).forEach(el => {
      const st = essayState(el.dataset.essayStatus);
      el.className = `wmba-tag is-${st}`;
      el.textContent = tx({ todo: ['Chưa trả lời', 'Not started'], done: ['✓ Đã trả lời', '✓ Answered'], over: ['Quá 250 từ', 'Over 250 words'] }[st]);
    });
  }

  function paintError(path) {
    const m = errors[path] ? tx(errors[path]) : '';
    const errEl = document.getElementById(`${idOf(path)}-err`);
    if (errEl) errEl.textContent = m;
    const field = $(`[data-field="${CSS.escape(path)}"], [data-doc="${CSS.escape(path)}"]`, mainEl);
    if (field) field.classList.toggle('has-err', !!m);
    $$(`[data-path="${CSS.escape(path)}"]`, mainEl).forEach(el => m ? el.setAttribute('aria-invalid', 'true') : el.removeAttribute('aria-invalid'));
  }

  function validatePath(path) {
    const entry = renderIndex.get(path);
    if (!entry) return;
    const m = check(entry);
    if (m) errors[path] = m; else delete errors[path];
    paintError(path);
  }

  // ---------------------------------------------------------------------------
  // Lưu nháp (trên trình duyệt; file thật nằm trên server)
  // ---------------------------------------------------------------------------
  let saveTimer = null;
  let savedAt = null;
  function scheduleSave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(saveDraft, 400);
  }
  function saveDraft() {
    if (view === 'done' || view === 'intro') return;
    savedAt = new Date();
    if (!writeJSON(CONFIG.storageKey, { state, view, maxStep, reviewReached, savedAt: savedAt.toISOString() })) savedAt = null;
    updateSaveLabel();
  }
  function updateSaveLabel() {
    const el = $('.wmba-save', host);
    if (el) el.textContent = savedAt && view !== 'done' ? tf(['Đã lưu nháp lúc {t}', 'Draft saved at {t}'], { t: `${pad(savedAt.getHours())}:${pad(savedAt.getMinutes())}` }) : '';
  }

  // ---------------------------------------------------------------------------
  // Điều hướng
  // ---------------------------------------------------------------------------
  function go(next, opts = {}) {
    view = next;
    if (typeof next === 'number') maxStep = Math.max(maxStep, next);
    if (next === 'review') { maxStep = STEPS.length - 1; reviewReached = true; }
    render(opts);
    mainEl.classList.remove('is-entering'); void mainEl.offsetWidth; mainEl.classList.add('is-entering');
    host.scrollIntoView({ block: 'start' });
    const focusEl = opts.summary && opts.summary.length ? $('[data-summary]', mainEl) : $('h2', mainEl);
    if (focusEl) focusEl.focus({ preventScroll: true });
    track('wmba_view', { view: String(next) });
    scheduleSave();
  }

  function next() {
    const i = view;
    const list = validateStep(i);
    if (list.length) {
      render({ summary: list });
      const s = $('[data-summary]', mainEl);
      s.scrollIntoView({ block: 'center' }); s.focus({ preventScroll: true });
      track('wmba_step_error', { step: i + 1, count: list.length });
      return;
    }
    if (i === 3) state.W01.sort((a, b) => {
      const end = r => r.period.current ? Infinity : monthIdx(r.period.to);
      return end(b) - end(a) || monthIdx(b.period.from) - monthIdx(a.period.from);
    });
    if (returnToReview || i === STEPS.length - 1) { returnToReview = false; go('review'); }
    else go(i + 1);
  }

  function back() {
    if (view === 'review') return go(STEPS.length - 1);
    returnToReview = false;
    go(view === 0 ? 'intro' : view - 1);
  }

  async function submit(btn) {
    const firstBad = STEPS.findIndex((_, i) => issuesFor(i) > 0);
    if (firstBad >= 0) { returnToReview = true; go(firstBad, { summary: validateStep(firstBad) }); return; }
    if (honeypot) { submitted = { code: '—', at: '' }; return go('done'); } // honeypot: không tạo hồ sơ
    const label = btn.textContent;
    const errEl = btn.parentNode.querySelector('.wmba-submit-err');
    if (errEl) errEl.remove();
    btn.disabled = true; btn.textContent = tx(['Đang kiểm tra…', 'Checking…']);
    let res;
    try {
      const dup = await api.checkDuplicate({ email: state.P03, idNo: state.P08, intake: state.I02 });
      if (dup && !(await confirmDuplicate())) { btn.disabled = false; btn.textContent = label; return; }
      btn.textContent = tx(['Đang nộp…', 'Submitting…']);
      res = await api.submit(buildPayload(), state._key);   // idempotencyKey: nộp lại không tạo hồ sơ trùng
    } catch (err) {
      btn.disabled = false; btn.textContent = label;
      btn.insertAdjacentHTML('afterend', `<p class="wmba-err wmba-submit-err" role="alert">${tx(['Chưa nộp được hồ sơ. Bản nháp vẫn được lưu, vui lòng thử lại.', 'We couldn’t submit your application. Your draft is saved, please try again.'])}</p>`);
      return;
    }
    const at = new Date();
    submitted = { code: res.code, at: `${pad(at.getHours())}:${pad(at.getMinutes())} ${pad(at.getDate())}/${pad(at.getMonth() + 1)}/${at.getFullYear()}` };
    try { localStorage.removeItem(CONFIG.storageKey); } catch (e) { /* ignore */ }
    savedAt = null;
    track('wmba_submit', { intake: state.I02 });
    go('done');
  }

  function confirmDuplicate() {
    return new Promise(resolve => {
      dialogEl.innerHTML = `<h3 id="wmba-dlg-title">${tx(['Đã có hồ sơ', 'An application already exists'])}</h3>
        <p>${tx(['Email/CCCD này đã có hồ sơ cho intake này. Nếu nộp tiếp, hồ sơ mới sẽ thay thế hồ sơ cũ.', 'This email or ID number already has an application for this intake. If you continue, your new application will replace the previous one.'])}</p>
        <div class="wmba-dialog-actions"><button type="button" class="wmba-btn is-ghost" value="cancel">${tx(['Huỷ', 'Cancel'])}</button><button type="button" class="wmba-btn is-primary" value="ok">${tx(['Vẫn nộp', 'Submit anyway'])}</button></div>`;
      let settled = false;
      const done = ok => { if (settled) return; settled = true; if (dialogEl.open) dialogEl.close(); resolve(ok); };
      $$('button', dialogEl).forEach(b => b.addEventListener('click', () => done(b.value === 'ok')));
      dialogEl.addEventListener('close', () => done(false), { once: true });
      dialogEl.showModal();
    });
  }

  // ---------------------------------------------------------------------------
  // Xuất dữ liệu — key = mã trường (BRD mục 3), backend làm phẳng thành cột Excel
  // ---------------------------------------------------------------------------
  function buildPayload() {
    // I01 không hiển thị vì chỉ có 1 chương trình, vẫn xuất cột để khớp BRD
    const out = { _key: state._key, _utm: state._utm, I01: CONFIG.program };
    STEPS.forEach(s => s.fields.forEach(f => {
      if (!f.code) return;
      const v = state[f.code];
      if (f.type === 'repeater') {
        out[f.code] = v.map(r => {
          const o = {};
          f.fields.forEach(sf => {
            const k = sf.code || `${f.code}_${sf.key}`;
            if (sf.type === 'monthrange') {
              o[`${k}_from`] = r.period.from.m ? `${pad(r.period.from.m)}/${r.period.from.y}` : '';
              o[`${k}_to`] = r.period.current ? 'present' : (r.period.to.m ? `${pad(r.period.to.m)}/${r.period.to.y}` : '');
            } else o[k] = r[sf.key];
          });
          return o;
        });
      } else if (f.type === 'group') {
        if (isShown(f, state)) f.fields.forEach(sf => { out[`${f.code}_${sf.key}`] = v[sf.key]; });
      } else if (isShown(f, state)) {
        out[f.code] = f.type === 'date3' || f.type === 'datetext' ? fmtDate(v) : f.type === 'phone' ? `${v.cc}${normalizeMobile(v)}` : Array.isArray(v) ? v.join(';') : v;
        if (f.type === 'combo') out[`${f.code}_name`] = optLabel(f, v);
      }
    }));
    ['C1', 'C2', 'C3'].forEach(k => { out[k] = state[k]; });
    out.files = Object.fromEntries(DOCS.filter(docVisible).map(d => [d.code, (files[d.code] || []).filter(x => x.status === 'done').map(x => ({ id: x.serverId, name: x.name, size: x.size }))]));
    return out;
  }

  // BRD 4.3–4.4: cờ chỉ hiện ở trang quản trị. Trình duyệt không gọi hàm này; giữ làm bản tham chiếu để backend cài đặt giống hệt.
  function computeFlags(s) {
    const T = CONFIG.thresholds;
    const sizeIdx = CONFIG.companySizes.findIndex(x => x.v === T.largeSizeMin);
    const all = yearsFrom(s.W01);
    const mgmt = yearsFrom(s.W01.filter(r => CONFIG.mgmtLevels.includes(r.level)));
    const large = yearsFrom(s.W01.filter(r => CONFIG.companySizes.findIndex(x => x.v === r.size) >= sizeIdx));
    const decide = (computed, declared, thr, other) => {
      if (other) return 'review';
      const d = parseNum(declared);
      if (isNaN(d) || Math.abs(computed - d) > T.mismatchYears) return 'review';
      return computed >= thr ? 'ok' : 'no';
    };
    const score = parseNum(s.S05);
    return {
      F1: [decide(all, s.W02, T.expYears, false), `W01 = ${all}y, W02 = ${s.W02 || '—'}`],
      F2: [large >= T.expYears ? 'ok' : 'no', `${large}y at size ≥ ${T.largeSizeMin}`],
      F3: [decide(mgmt, s.W03, T.mgmtYears, s.W01.some(r => r.level === 'other')), `W01 Leader+ = ${mgmt}y, W03 = ${s.W03 || '—'}`],
      F4: [(files.U06 || []).some(x => x.status === 'done') ? 'ok' : 'no', 'Admission xác nhận nội dung thủ công'],
      F5: [s.S03 === 'ielts' ? (score >= T.ielts ? 'ok' : 'no') : 'review', `S03 = ${s.S03 || '—'}, S05 = ${s.S05 || '—'}`],
    };
  }

  // ---------------------------------------------------------------------------
  // Sự kiện
  // ---------------------------------------------------------------------------
  function readControl(el) {
    const path = el.dataset.path;
    let val;
    if (el.dataset.part) {
      val = clone(getPath(state, path));
      setPath(val, el.dataset.part, el.type === 'checkbox' ? el.checked : el.value);
    } else if ('multi' in el.dataset) {
      val = getPath(state, path).slice();
      const i = val.indexOf(el.value);
      if (el.checked && i < 0) val.push(el.value);
      if (!el.checked && i >= 0) val.splice(i, 1);
    } else if (el.type === 'checkbox') val = el.checked;
    else val = el.value;
    setPath(state, path, val);
    return path;
  }

  // dd/mm/yyyy: tự chèn dấu / khi gõ, lưu dạng {d,m,y}
  function readDateText(el, inputType) {
    const path = el.dataset.path;
    let parts = el.value.split('/').map(x => x.replace(/\D/g, ''));
    if (parts.length === 1) { const g = parts[0]; parts = [g.slice(0, 2), g.slice(2, 4), g.slice(4, 8)]; }
    const [d = '', m = '', y = ''] = parts;
    if (inputType && inputType.startsWith('insert') && el.selectionStart === el.value.length) {
      el.value = [d.slice(0, 2), m.slice(0, 2), y.slice(0, 4)].filter((x, i, a) => x || a.slice(i + 1).some(Boolean)).join('/') +
        ((d.length === 2 && !m && !y) || (m.length === 2 && !y) ? '/' : '');
    }
    setPath(state, path, { d: d.slice(0, 2), m: m.slice(0, 2), y: y.slice(0, 4) });
    if (errors[path]) validatePath(path);
    scheduleSave();
  }

  function rerenderKeepFocus(el) {
    const sel = `[data-path="${CSS.escape(el.dataset.path)}"]` + (el.dataset.part ? `[data-part="${CSS.escape(el.dataset.part)}"]` : '') +
      (el.type === 'radio' || (el.type === 'checkbox' && 'multi' in el.dataset) ? `[value="${CSS.escape(el.value)}"]` : '');
    const y = window.scrollY;
    render();
    const again = $(sel, mainEl);
    if (again) again.focus({ preventScroll: true });
    window.scrollTo(0, y);
  }

  // ---------- Combobox (quốc gia, quốc tịch): gõ để lọc, không phân biệt dấu ----------
  const norm = s => String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd').toLowerCase().trim();
  const combo = { input: null, items: [], active: -1 };
  const comboList = input => document.getElementById(input.getAttribute('aria-controls'));
  const comboField = input => renderIndex.get(input.dataset.comboInput).f;

  function comboOpen(input, query) {
    const path = input.dataset.comboInput;
    const q = norm(query);
    let items = optionsOf(comboField(input)).map(o => ({ v: o.v, label: tx(o.label) }));
    if (q) {
      items = items.filter(o => norm(o.label).includes(q));
      items.sort((a, b) => norm(b.label).startsWith(q) - norm(a.label).startsWith(q));
    }
    Object.assign(combo, { input, items, active: -1 });
    const list = comboList(input);
    list.innerHTML = items.length
      ? items.map((o, i) => `<li role="option" id="${list.id}-${i}" data-i="${i}" aria-selected="${o.v === getPath(state, path)}">${esc(o.label)}</li>`).join('')
      : `<li class="is-empty" role="presentation">${tx(['Không tìm thấy kết quả', 'No results found'])}</li>`;
    list.hidden = false;
    placePop(list);
    input.setAttribute('aria-expanded', 'true');
    input.removeAttribute('aria-activedescendant');
  }
  function comboClose(input) {
    comboList(input).hidden = true;
    input.setAttribute('aria-expanded', 'false');
    input.removeAttribute('aria-activedescendant');
    if (combo.input === input) combo.input = null;
  }
  function comboMove(input, dir) {
    if (combo.input !== input) comboOpen(input, '');
    if (!combo.items.length) return;
    combo.active = (combo.active + dir + combo.items.length) % combo.items.length;
    const list = comboList(input);
    $$('li', list).forEach((li, i) => li.classList.toggle('is-active', i === combo.active));
    const li = document.getElementById(`${list.id}-${combo.active}`);
    input.setAttribute('aria-activedescendant', li.id);
    li.scrollIntoView({ block: 'nearest' });
  }
  const CHILDREN = { A04: ['A02', 'A05'], A02: ['A05'] };
  let pointerDown = false, pendingRedraw = null;
  document.addEventListener('pointerdown', () => { pointerDown = true; }, true);
  document.addEventListener('pointerup', () => {
    pointerDown = false;
    if (pendingRedraw) { const r = pendingRedraw; pendingRedraw = null; setTimeout(r); }
  }, true);
  function cascade(path, before, sync) {
    if (!CHILDREN[path] || getPath(state, path) === before) return;
    CHILDREN[path].forEach(k => { state[k] = ''; delete errors[k]; });
    const redraw = () => {
      const a = document.activeElement, keep = a && mainEl.contains(a) && a.id;
      const y = window.scrollY;
      render();
      const again = keep && document.getElementById(keep);
      rendering = true;   // không mở lại danh sách khi trả focus
      if (again) again.focus({ preventScroll: true });
      rendering = false;
      window.scrollTo(0, y);
    };
    if (sync) redraw();
    else if (pointerDown) pendingRedraw = redraw;   // rời ô bằng chuột: vẽ lại sau click, không làm mất cú bấm
    else setTimeout(redraw);   // rời ô bằng Tab: đợi focus chuyển sang ô kế tiếp
  }
  function comboSelect(input, item) {
    const path = input.dataset.comboInput;
    const before = getPath(state, path);
    setPath(state, path, item.v);
    input.value = item.label;
    comboClose(input);
    validatePath(path); scheduleSave();
    cascade(path, before, true);
  }
  // Rời ô: khớp đúng tên (hoặc chỉ còn 1 kết quả) thì chọn; không khớp thì trả lại giá trị đã chọn trước đó
  function comboCommit(input) {
    const path = input.dataset.comboInput;
    const opts = optionsOf(comboField(input));
    const text = norm(input.value);
    const before = getPath(state, path);
    if (!text) setPath(state, path, '');
    else {
      const hit = opts.find(o => norm(tx(o.label)) === text) || (combo.input === input && combo.items.length === 1 ? combo.items[0] : null);
      if (hit) setPath(state, path, hit.v);
      const cur = opts.find(o => o.v === getPath(state, path));
      input.value = cur ? tx(cur.label) : '';
    }
    comboClose(input);
    validatePath(path); scheduleSave();
    cascade(path, before);
  }

  // Mở popover lên trên khi phía dưới không đủ chỗ
  function placePop(pop) {
    pop.classList.remove('is-up');
    const r = pop.getBoundingClientRect(), a = pop.parentNode.getBoundingClientRect();
    if (r.bottom > window.innerHeight - 8 && a.top - r.height - 8 > 0) pop.classList.add('is-up');
  }
  function keepInView(list, li) {
    if (li.offsetTop < list.scrollTop) list.scrollTop = li.offsetTop - 6;
    else if (li.offsetTop + li.offsetHeight > list.scrollTop + list.clientHeight) list.scrollTop = li.offsetTop + li.offsetHeight - list.clientHeight + 6;
  }

  // ---------- Dropdown (thay <select> hệ thống) ----------
  const sel = { btn: null, items: [], active: -1, typed: '', typedAt: 0 };
  const selNative = btn => btn.parentNode.querySelector('select');
  const selList = btn => document.getElementById(btn.getAttribute('aria-controls'));
  function selOpen(btn) {
    if (sel.btn) selClose();
    const nat = selNative(btn), list = selList(btn);
    const items = [...nat.options].slice(1).map(o => ({ v: o.value, label: o.textContent }));
    list.innerHTML = items.map((o, i) => `<li role="option" id="${list.id}-${i}" data-i="${i}" aria-selected="${o.v === nat.value}">${esc(o.label)}</li>`).join('');
    Object.assign(sel, { btn, items });
    list.hidden = false;
    btn.setAttribute('aria-expanded', 'true');
    placePop(list);
    const i = items.findIndex(o => o.v === nat.value);
    selActive(i < 0 ? 0 : i);
    if (i >= 0) list.scrollTop = list.children[i].offsetTop - (list.clientHeight - list.children[i].offsetHeight) / 2;
  }
  function selClose() {
    const btn = sel.btn;
    if (!btn) return;
    const list = selList(btn);
    if (list) list.hidden = true;
    btn.setAttribute('aria-expanded', 'false');
    btn.removeAttribute('aria-activedescendant');
    sel.btn = null;
  }
  function selActive(i) {
    const list = selList(sel.btn), li = list.children[i];
    if (!li) return;
    sel.active = i;
    $$('li', list).forEach((x, j) => x.classList.toggle('is-active', j === i));
    sel.btn.setAttribute('aria-activedescendant', li.id);
    keepInView(list, li);
  }
  function selPick(i) {
    const btn = sel.btn, nat = selNative(btn), item = sel.items[i];
    selClose();
    if (!item || item.v === nat.value) return;
    nat.value = item.v;
    btn.textContent = item.label; btn.classList.remove('is-ph');
    nat.dispatchEvent(new Event('change', { bubbles: true }));
  }
  function selKey(e, btn) {
    const open = sel.btn === btn, k = e.key;
    if (k === 'Tab') { if (open) selClose(); return; }
    if (!open && ['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(k)) { e.preventDefault(); selOpen(btn); return; }
    if (open && (k === 'ArrowDown' || k === 'ArrowUp')) { e.preventDefault(); selActive(Math.min(sel.items.length - 1, Math.max(0, sel.active + (k === 'ArrowDown' ? 1 : -1)))); }
    else if (open && (k === 'Home' || k === 'End')) { e.preventDefault(); selActive(k === 'Home' ? 0 : sel.items.length - 1); }
    else if (open && (k === 'Enter' || k === ' ')) { e.preventDefault(); selPick(sel.active); }
    else if (open && k === 'Escape') { e.preventDefault(); selClose(); }
    else if (k.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {   // gõ chữ/số để nhảy tới mục
      if (!open) selOpen(btn);
      const now = Date.now();
      sel.typed = (now - sel.typedAt < 700 ? sel.typed : '') + norm(k); sel.typedAt = now;
      const i = sel.items.findIndex(o => norm(o.label).startsWith(sel.typed));
      if (i >= 0) selActive(i);
    }
  }

  // ---------- Lịch chọn ngày (thay date picker hệ thống) ----------
  const cal = { el: null, path: '', view: 'days', y: 0, m: 0, focus: null, min: null, max: null };
  const sameDay = (a, b) => a && b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  const WEEK = [['T2', 'Mo'], ['T3', 'Tu'], ['T4', 'We'], ['T5', 'Th'], ['T6', 'Fr'], ['T7', 'Sa'], ['CN', 'Su']];
  const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const chev = d => `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="${d}" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  function calOpen(el) {
    selClose();
    const path = el.dataset.cal, v = getPath(state, path);
    const min = el.dataset.min ? new Date(`${el.dataset.min}T00:00`) : new Date(NOW_Y - 99, 0, 1), max = startOfToday();
    const cur = validDate(v) ? toDate(v) : null;
    const base = cur || new Date(Math.max(min, Math.min(max, new Date(NOW_Y - 30, 0, 1))));
    Object.assign(cal, { el, path, min, max, view: cur ? 'days' : 'years', y: base.getFullYear(), m: base.getMonth(), focus: base });
    el.hidden = false;
    el.parentNode.querySelector('.wmba-datepick-btn').setAttribute('aria-expanded', 'true');
    const f = calRender();
    placePop(el);
    if (f) f.focus({ preventScroll: true });
  }
  function calClose(refocus) {
    if (!cal.el) return;
    const btn = cal.el.parentNode.querySelector('.wmba-datepick-btn');
    cal.el.hidden = true; cal.el.innerHTML = '';
    btn.setAttribute('aria-expanded', 'false');
    cal.el = null;
    if (refocus) btn.focus();
  }
  function calRender() {
    const { y, m, view, min, max } = cal;
    const v = getPath(state, cal.path), cur = validDate(v) ? toDate(v) : null;
    const navBtn = (act, d, label, off) => `<button type="button" class="wmba-cal-nav" data-cal-act="${act}" aria-label="${esc(tx(label))}"${off ? ' disabled' : ''}>${chev(d)}</button>`;
    const title = (act, text, pressed) => `<button type="button" class="wmba-cal-title" data-cal-act="${act}" aria-pressed="${pressed}">${esc(text)}${chev('M4.5 6.5l3.5 3.5 3.5-3.5')}</button>`;
    let head, body;
    if (view === 'years') {
      head = `<span class="wmba-cal-caption">${tx(['Chọn năm', 'Select year'])}</span>`;
      body = `<div class="wmba-cal-grid is-years">${range(max.getFullYear(), min.getFullYear()).map(n =>
        `<button type="button" data-cal-year="${n}" aria-pressed="${!!cur && cur.getFullYear() === n}" tabindex="${n === y ? 0 : -1}">${n}</button>`).join('')}</div>`;
    } else if (view === 'months') {
      head = `${navBtn('prev-y', 'M10 4l-4 4 4 4', ['Năm trước', 'Previous year'], y <= min.getFullYear())}<div class="wmba-cal-titles">${title('years', String(y), false)}</div>${navBtn('next-y', 'M6 4l4 4-4 4', ['Năm sau', 'Next year'], y >= max.getFullYear())}`;
      body = `<div class="wmba-cal-grid is-months">${range(0, 11).map(i => {
        const off = new Date(y, i + 1, 0) < min || new Date(y, i, 1) > max;
        return `<button type="button" data-cal-month="${i}" aria-pressed="${!!cur && cur.getFullYear() === y && cur.getMonth() === i}" tabindex="${i === m ? 0 : -1}"${off ? ' disabled' : ''}>${MONTHS_EN[i]}</button>`;
      }).join('')}</div>`;
    } else {
      const first = new Date(y, m, 1), lead = (first.getDay() + 6) % 7, days = new Date(y, m + 1, 0).getDate(), today = startOfToday();
      head = `${navBtn('prev', 'M10 4l-4 4 4 4', ['Tháng trước', 'Previous month'], new Date(y, m, 0) < min)}<div class="wmba-cal-titles">${title('months', MONTHS_LONG[m], false)}${title('years', String(y), false)}</div>${navBtn('next', 'M6 4l4 4-4 4', ['Tháng sau', 'Next month'], new Date(y, m + 1, 1) > max)}`;
      body = `<div class="wmba-cal-week" aria-hidden="true">${WEEK.map(w => `<span>${tx(w)}</span>`).join('')}</div><div class="wmba-cal-days" role="grid">${'<span></span>'.repeat(lead)}${range(1, days).map(d => {
        const dt = new Date(y, m, d), off = dt < min || dt > max;
        return `<button type="button" data-cal-day="${d}" aria-label="${d} ${MONTHS_LONG[m]} ${y}" aria-pressed="${sameDay(dt, cur)}" tabindex="${sameDay(dt, cal.focus) ? 0 : -1}"${sameDay(dt, today) ? ' class="is-today"' : ''}${off ? ' disabled' : ''}>${d}</button>`;
      }).join('')}</div>`;
    }
    cal.el.innerHTML = `<div class="wmba-cal-head">${head}</div>${body}`;
    const grid = $('.wmba-cal-grid, .wmba-cal-days', cal.el);
    let f = $('[tabindex="0"]:not(:disabled)', grid) || $('button:not(:disabled)', grid);
    if (f) { f.tabIndex = 0; if (view === 'years') grid.scrollTop = f.offsetTop - (grid.clientHeight - f.offsetHeight) / 2; }
    return f;
  }
  // keep: giữ focus trên nút điều hướng vừa bấm (bấm Enter liên tiếp để lật tháng)
  function calShow(fn, keep) {
    if (fn) fn();
    const f = calRender(), k = keep && $(`[data-cal-act="${keep}"]:not(:disabled)`, cal.el);
    (k || f) && (k || f).focus();
  }
  function calClick(b) {
    const d = b.dataset, act = d.calAct;
    if (act === 'prev' || act === 'next') calShow(() => { const t = new Date(cal.y, cal.m + (act === 'next' ? 1 : -1), 1); cal.y = t.getFullYear(); cal.m = t.getMonth(); cal.focus = t; }, act);
    else if (act === 'prev-y' || act === 'next-y') calShow(() => { cal.y += act === 'next-y' ? 1 : -1; }, act);
    else if (act === 'months' || act === 'years') calShow(() => { cal.view = act; });
    else if (d.calYear) calShow(() => { cal.y = +d.calYear; cal.view = 'months'; });
    else if (d.calMonth) calShow(() => { cal.m = +d.calMonth; cal.view = 'days'; cal.focus = new Date(cal.y, cal.m, Math.min(cal.focus.getDate(), new Date(cal.y, cal.m + 1, 0).getDate())); });
    else if (d.calDay) {
      const path = cal.path, txt = $(`[data-path="${CSS.escape(path)}"][data-date]`, mainEl);
      setPath(state, path, { d: String(+d.calDay), m: String(cal.m + 1), y: String(cal.y) });
      txt.value = fmtDate(getPath(state, path));
      calClose();
      validatePath(path); scheduleSave(); txt.focus();
    }
  }
  function calKey(e, el) {
    const k = e.key;
    if (k === 'Escape') { e.preventDefault(); calClose(true); return; }
    const step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[k];
    if (cal.view === 'days' && el.dataset.calDay && (step || k === 'PageUp' || k === 'PageDown')) {
      e.preventDefault();
      const t = new Date(cal.y, cal.m, +el.dataset.calDay);
      if (step) t.setDate(t.getDate() + step); else t.setMonth(t.getMonth() + (k === 'PageDown' ? 1 : -1));
      if (t < cal.min || t > cal.max) return;
      if (t.getMonth() === cal.m && t.getFullYear() === cal.y) { const b = $(`[data-cal-day="${t.getDate()}"]`, cal.el); el.tabIndex = -1; b.tabIndex = 0; b.focus(); cal.focus = t; }
      else calShow(() => { cal.y = t.getFullYear(); cal.m = t.getMonth(); cal.focus = t; });
    } else if (step && (el.dataset.calYear || el.dataset.calMonth)) {   // lưới tháng/năm: 3 hoặc 4 cột
      e.preventDefault();
      const btns = $$('.wmba-cal-grid button:not(:disabled)', cal.el), cols = cal.view === 'years' ? 4 : 3;
      const b = btns[btns.indexOf(el) + (Math.abs(step) === 7 ? Math.sign(step) * cols : step)];
      if (b) { el.tabIndex = -1; b.tabIndex = 0; b.focus(); keepInView(b.parentNode, b); }
    }
  }

  function bindEvents() {
    host.addEventListener('focusin', e => {
      const el = e.target;
      if (el.dataset && el.dataset.comboInput && !rendering) { comboOpen(el, ''); el.select(); }
    });
    host.addEventListener('keydown', e => {
      const el = e.target;
      if (el.dataset && 'select' in el.dataset) { selKey(e, el); return; }
      if (cal.el && cal.el.contains(el)) { calKey(e, el); return; }
      if (!el.dataset || !el.dataset.comboInput) return;
      const open = combo.input === el;
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); comboMove(el, e.key === 'ArrowDown' ? 1 : -1); }
      else if (e.key === 'Enter') {
        e.preventDefault();   // không gửi form khi đang chọn trong danh sách
        if (open && combo.active >= 0) comboSelect(el, combo.items[combo.active]);
        else if (open && combo.items.length === 1) comboSelect(el, combo.items[0]);
      } else if (e.key === 'Escape' && open) {
        e.preventDefault();
        const cur = optionsOf(comboField(el)).find(o => o.v === getPath(state, el.dataset.comboInput));
        el.value = cur ? tx(cur.label) : '';
        comboClose(el);
      }
    });
    host.addEventListener('mousedown', e => {
      if (e.target.closest('.wmba-select-list')) {
        e.preventDefault();
        const li = e.target.closest('li[data-i]');
        if (li && sel.btn) selPick(+li.dataset.i);
        return;
      }
      const li = e.target.closest('.wmba-combo-list li[data-i]');
      if (!li || !combo.input) return;
      e.preventDefault();   // giữ focus trong ô để không kích hoạt commit trước khi chọn
      comboSelect(combo.input, combo.items[+li.dataset.i]);
    });

    host.addEventListener('input', e => {
      const el = e.target;
      if ('hp' in el.dataset) { honeypot = el.value; return; }
      if (el.dataset.comboInput) { comboOpen(el, el.value); return; }
      if ('date' in el.dataset) { readDateText(el, e.inputType); return; }
      if (!el.dataset.path || el.tagName === 'SELECT' || el.type === 'checkbox' || el.type === 'radio') return;
      const path = readControl(el);
      if (errors[path]) validatePath(path);   // xoá lỗi ngay khi đã sửa đúng
      updateDyn();
      scheduleSave();
    });

    host.addEventListener('change', e => {
      const el = e.target;
      if (el.dataset.upload) { addFiles(el.dataset.upload, el.files); el.value = ''; return; }
      if (!el.dataset.path || !(el.tagName === 'SELECT' || el.type === 'checkbox' || el.type === 'radio')) return;
      const path = readControl(el);
      if (/^C\d$/.test(path)) { if (errors[path]) validatePath(path); scheduleSave(); return; }
      if (errors[path] || (el.tagName === 'SELECT' && !el.dataset.part)) {
        const entry = renderIndex.get(path);
        if (entry) { const m = check(entry); m ? errors[path] = m : delete errors[path]; }
      }
      rerenderKeepFocus(el);   // field điều kiện (S03, Hiện tại, Khác…) hiện/ẩn ngay
      scheduleSave();
    });

    host.addEventListener('focusout', e => {
      const el = e.target;
      if (sel.btn === el) selClose();
      if (!rendering && el.dataset && el.dataset.comboInput) { comboCommit(el); return; }
      if (rendering || !el.dataset || !el.dataset.path || /^C\d$/.test(el.dataset.path)) return;
      const entry = renderIndex.get(el.dataset.path);
      if (entry && entry.f.type === 'phone' && el.dataset.part === 'num') {   // 0912… → 912… khi mã +84
        const v = getPath(state, el.dataset.path);
        const d = normalizeMobile(v);
        if (d && d !== phoneDigits(v)) { setPath(state, el.dataset.path, Object.assign({}, v, { num: groupDigits(d) })); el.value = groupDigits(d); updateDyn(); scheduleSave(); }
      }
      const field = el.closest('[data-field]');
      if (field && e.relatedTarget && field.contains(e.relatedTarget)) return; // còn trong cùng nhóm ngày/tháng
      if (el.type === 'url' && el.value && !/^https?:\/\//i.test(el.value)) { el.value = `https://${el.value.replace(/^\/+/, '')}`; readControl(el); }
      validatePath(el.dataset.path);
    });

    const outsideCal = e => {
      if (cal.el && !cal.el.parentNode.contains(e.target)) calClose();
      if (sel.btn && !sel.btn.parentNode.contains(e.target)) selClose();
    };
    document.addEventListener('mousedown', outsideCal);
    document.addEventListener('focusin', outsideCal);

    host.addEventListener('submit', e => { e.preventDefault(); if (typeof view === 'number') next(); });

    host.addEventListener('click', e => {
      const sb = e.target.closest('[data-select]');
      if (sb) { sb.focus(); sel.btn === sb ? selClose() : selOpen(sb); return; }   // Safari không tự focus nút khi bấm
      const cb = e.target.closest('.wmba-cal button');
      if (cb) { calClick(cb); return; }
      const btn = e.target.closest('[data-action]');
      if (!btn) return;
      const a = btn.dataset.action;
      if (a === 'next') { e.preventDefault(); next(); }
      else if (a === 'back') back();
      else if (a === 'start') {
        if (readJSON(CONFIG.storageKey, null) && !confirm(tx(['Bắt đầu hồ sơ mới sẽ xoá bản nháp hiện có. Tiếp tục?', 'Starting a new application will discard your saved draft. Continue?']))) return;
        resetAll(); go(0);
      } else if (a === 'resume') resume();
      else if (a === 'goto') { const s = +btn.dataset.step; returnToReview = false; go(s === STEPS.length ? 'review' : s); }
      else if (a === 'edit') { returnToReview = true; go(+btn.dataset.step); }
      else if (a === 'add-row') {
        const path = btn.dataset.path;
        getPath(state, path).push(blankRow[path]());
        delete errors[path];
        render();
        const rows = $$(`[data-field="${path}"] .wmba-row`, mainEl);
        const first = rows.length && $('input, .wmba-select-btn, textarea', rows[rows.length - 1]);
        if (first) { first.focus(); first.scrollIntoView({ block: 'center' }); }
        scheduleSave();
      } else if (a === 'remove-row') {
        const path = btn.dataset.path;
        getPath(state, path).splice(+btn.dataset.index, 1);
        Object.keys(errors).forEach(k => { if (k.startsWith(`${path}.`)) delete errors[k]; });
        render();
        const add = document.getElementById(idOf(path)); if (add) add.focus();
        scheduleSave();
      } else if (a === 'remove-file') {
        const code = btn.dataset.code;
        files[code] = (files[code] || []).filter(x => x.id !== btn.dataset.id);
        delete uploadMsgs[code];
        refreshDoc(code);
        const input = document.getElementById(idOf(code)); if (input) input.focus();
      } else if (a === 'fix-email') {
        state.P03 = btn.dataset.value;
        const input = document.getElementById(idOf('P03')); input.value = state.P03; input.focus();
        validatePath('P03'); updateDyn(); scheduleSave();
      } else if (a === 'jump') {
        e.preventDefault();
        const t = document.getElementById(btn.dataset.target);
        if (t) { t.scrollIntoView({ block: 'center' }); t.focus({ preventScroll: true }); }
      } else if (a === 'submit') submit(btn);
      else if (a === 'print') window.print();
      else if (a === 'pick-date') { const p = btn.closest('.wmba-datepick').querySelector('.wmba-cal'); cal.el === p ? calClose(true) : calOpen(p); }
    });

    // Kéo thả file
    host.addEventListener('dragover', e => { const z = e.target.closest('[data-drop]'); if (z) { e.preventDefault(); z.classList.add('is-over'); } });
    host.addEventListener('dragleave', e => { const z = e.target.closest('[data-drop]'); if (z) z.classList.remove('is-over'); });
    host.addEventListener('drop', e => {
      const z = e.target.closest('[data-drop]');
      if (!z) return;
      e.preventDefault(); z.classList.remove('is-over');
      addFiles(z.dataset.drop, e.dataTransfer.files);
    });

    window.addEventListener('beforeunload', e => {
      const hasFiles = Object.values(files).some(l => l.length);
      if (hasFiles && view !== 'done') { e.preventDefault(); e.returnValue = ''; }
    });
  }

  function resetAll() {
    try { localStorage.removeItem(CONFIG.storageKey); } catch (e) { /* ignore */ }
    const utm = state._utm;
    state = initialState(); state._utm = utm;
    files = {}; uploadMsgs = {}; errors = {}; maxStep = 0; reviewReached = false; returnToReview = false; honeypot = ''; savedAt = null;
  }

  function resume() {
    const d = readJSON(CONFIG.storageKey, null);
    if (!d) return;
    state = Object.assign(initialState(), d.state);
    maxStep = d.maxStep || 0;
    reviewReached = !!d.reviewReached;
    savedAt = d.savedAt ? new Date(d.savedAt) : null;
    go(typeof d.view === 'number' || d.view === 'review' ? d.view : 0);
  }

  // ---------------------------------------------------------------------------
  // Khởi động
  // ---------------------------------------------------------------------------
  function init() {
    mount();
    if (!host) return;
    loadWards();
    const utm = {};
    params.forEach((v, k) => { if (k.startsWith('utm_')) utm[k] = v; });
    state._utm = utm;
    render();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
