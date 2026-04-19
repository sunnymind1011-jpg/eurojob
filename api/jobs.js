// api/jobs.js — Adzuna + Remotive + Himalayas + WorldJob + VisaSponsor
import https from 'https';
 
export const maxDuration = 60;
 
const ADZUNA_APP_ID  = process.env.ADZUNA_APP_ID  || '22308f32';
const ADZUNA_APP_KEY = process.env.ADZUNA_APP_KEY || '4902733d7210f0c75a0ad5a8d38a3c17';
const WORLDJOB_API_KEY = process.env.WORLDJOB_API_KEY || '';
 
const COUNTRIES = [
  { code: 'gb', name: 'United Kingdom', flag: '🇬🇧' },
  { code: 'de', name: 'Germany',        flag: '🇩🇪' },
  { code: 'es', name: 'Spain',          flag: '🇪🇸' },
  { code: 'nl', name: 'Netherlands',    flag: '🇳🇱' },
  { code: 'fr', name: 'France',         flag: '🇫🇷' },
  { code: 'at', name: 'Austria',        flag: '🇦🇹' },
  { code: 'be', name: 'Belgium',        flag: '🇧🇪' },
  { code: 'it', name: 'Italy',          flag: '🇮🇹' },
  { code: 'pl', name: 'Poland',         flag: '🇵🇱' },
  { code: 'ch', name: 'Switzerland',    flag: '🇨🇭' },
  { code: 'ie', name: 'Ireland',        flag: '🇮🇪' },
];
 
const DATA_KEYWORDS = ['data analyst', 'data scientist', 'data engineer', 'bi analyst', 'data steward', 'data governance', 'data quality', 'analytics engineer', 'business intelligence'];
const MAJOR_COUNTRIES = ['gb', 'de', 'es', 'nl', 'fr'];
// 운영/물류 키워드 — 확장된 국가 대상
const OPS_KEYWORDS = ['logistics manager', 'supply chain manager', 'warehouse manager', 'operations manager', 'procurement manager', 'inventory manager'];
const OPS_COUNTRIES = ['es', 'de', 'nl', 'gb', 'fr'];
 
// 경영/전략 키워드
const MGMT_KEYWORDS = ['business development', 'project manager'];
const MGMT_COUNTRIES = ['es', 'de', 'nl', 'gb'];
 
// HR 키워드
const HR_KEYWORDS = ['hr manager', 'human resources', 'talent acquisition', 'recruiter', 'people operations'];
const HR_COUNTRIES = ['gb', 'de', 'nl', 'es', 'fr'];
 
// 마케팅 키워드
const MARKETING_KEYWORDS = ['marketing manager', 'digital marketing', 'performance marketing', 'growth marketing', 'marketing specialist'];
const MARKETING_COUNTRIES = ['gb', 'de', 'nl', 'es', 'fr'];
 
const CATEGORIES = [
  { tag: 'it-jobs',                       label: 'IT / 개발 / 데이터' },
  { tag: 'pr-advertising-marketing-jobs', label: '마케팅 / 광고 / PR' },
  { tag: 'hr-jobs',                       label: 'HR / 채용'          },
  { tag: 'scientific-qa-jobs',            label: '데이터 / 분석 / 과학' },
  { tag: 'transport-logistics-jobs',      label: '운송 / 물류'         },
];
 
const COUNTRY_INFO = {
  gb: { name: 'United Kingdom', flag: '🇬🇧', code: 'GB' },
  de: { name: 'Germany',        flag: '🇩🇪', code: 'DE' },
  es: { name: 'Spain',          flag: '🇪🇸', code: 'ES' },
  nl: { name: 'Netherlands',    flag: '🇳🇱', code: 'NL' },
  fr: { name: 'France',         flag: '🇫🇷', code: 'FR' },
  at: { name: 'Austria',        flag: '🇦🇹', code: 'AT' },
  be: { name: 'Belgium',        flag: '🇧🇪', code: 'BE' },
  it: { name: 'Italy',          flag: '🇮🇹', code: 'IT' },
  pl: { name: 'Poland',         flag: '🇵🇱', code: 'PL' },
  ch: { name: 'Switzerland',    flag: '🇨🇭', code: 'CH' },
  ie: { name: 'Ireland',        flag: '🇮🇪', code: 'IE' },
};
 
function companyEmoji(name) {
  const e = ['🏢','💼','🏗️','🔬','⚡','🚀','🌐','🎯','📊','🏨'];
  return e[(name.charCodeAt(0) || 0) % e.length] || '🏢';
}
 
function detectVisaSponsorship(d) {
  if (!d) return false;
  const text = d.toLowerCase();
  const noSponsor = /no visa sponsorship|not able to sponsor|unable to (provide|offer|support) (visa|sponsorship)|visa sponsorship (is not|not) (available|provided|offered)|we do not sponsor|cannot sponsor|won't sponsor|does not (offer|provide) (visa|work permit)|must (already |)(have|hold|possess) (the |)(right to work|valid visa|work authorization)|only (candidates|applicants).{0,40}(right to work|eu|eligible to work)/i;
  const negPattern = /\b(no|not|without|unable to|cannot|can't|won't|do not|don't|never|unfortunately)\b.{0,60}(visa|sponsor|work permit|right to work)/i;
  if (noSponsor.test(text) || negPattern.test(text)) return false;
  return /visa sponsorship (available|provided|offered|supported|possible|considered)|we (will|can|do) sponsor|sponsor(ing|ed|ship for) (non-eu|non eu|international|overseas|foreign|candidates|applicants)|skilled worker visa|work permit (provided|supported|assistance|included)|right to work (provided|sponsored|supported)|eu blue card|tier 2 (visa|sponsor)|sponsorship (available|provided|offered)|open to sponsoring|happy to sponsor|able to sponsor|(visa|sponsorship|work permit).{0,50}(eligible|qualified|successful|selected) (candidates?|applicants?)|(eligible|successful|selected) candidates?.{0,50}(visa|sponsorship|work permit)/i.test(text);
}
 
function detectRelocation(d) {
  if (!d) return false;
  const text = d.toLowerCase();
  if (/no relocation|relocation (not|is not) (provided|offered|available|supported)/i.test(text)) return false;
  return /relocation (package|support|assistance|allowance|provided|offered|available|benefit)|we (will|can) relocate|full relocation|relocation supported|moving (costs|expenses) (covered|provided|reimbursed)/i.test(text);
}
 
function detectRemote(t) {
  if (/remote/i.test(t)) return 'Remote';
  if (/hybrid/i.test(t)) return 'Hybrid';
  return 'On-site';
}
 
function detectLevel(title, desc) {
  // title만 우선 체크 — desc 전체 스캔하면 오탐 많음
  const ti = title.toLowerCase();
  if (/\bsenior\b|\bsr\.\b|\bsr\b/i.test(ti)) return 'Senior'; // Senior Manager 등 → Senior 우선
  if (/\bdirector\b|\bvp\b|\bvice president\b/i.test(ti)) return 'Director';
  if (/\bhead of\b/i.test(ti)) return 'Director';
  if (/\blead\b|\bprincipal\b|\bstaff\b/i.test(ti)) return 'Lead';
  if (/\bjunior\b|\bjr\.\b|\bjr\b/i.test(ti)) return 'Junior';
  if (/\bentry.level\b|\binternship\b|\bintern\b|\btraineee?\b/i.test(ti)) return 'Entry';
  if (/\bassociate\b/i.test(ti)) return 'Associate';
  if (/\bmid.level\b|\bmedior\b|\bintermediate\b/i.test(ti)) return 'Mid';
  // title에서 못 찾으면 desc의 'experience level' 섹션만 제한 확인
  const expMatch = desc.match(/experience level[\s\S]{0,30}(senior|director|lead|junior|mid|entry|associate)/i);
  if (expMatch) {
    const l = expMatch[1].toLowerCase();
    if (l === 'senior') return 'Senior';
    if (l === 'director') return 'Director';
    if (l === 'lead') return 'Lead';
    if (l === 'junior') return 'Junior';
    if (l === 'mid') return 'Mid';
    if (l === 'entry') return 'Entry';
    if (l === 'associate') return 'Associate';
  }
  return '';
}
 
function detectWritingLang(d) {
  if (/\b(nous|vous|notre|votre|les|des|une|dans|avec|pour|sur|par|qui|que)\b/gi.test(d) &&
      (d.match(/\b(nous|vous|notre|votre|les|des|une|dans|avec|pour)\b/gi)||[]).length > 3) return 'French';
  if (/\b(und|die|der|das|ist|wir|Sie|mit|für|auf|von|als|bei|zur)\b/g.test(d) &&
      (d.match(/\b(und|die|der|das|ist|wir|Sie|mit|für)\b/g)||[]).length > 3) return 'German';
  if (/\b(nuestro|nuestros|para|con|los|las|del|una|que|como|más|por)\b/gi.test(d) &&
      (d.match(/\b(nuestro|para|con|los|las|del|que|como)\b/gi)||[]).length > 3) return 'Spanish';
  if (/\b(della|delle|degli|questo|nostro|siamo|lavoro|azienda|team)\b/gi.test(d) &&
      (d.match(/\b(della|delle|nostro|siamo|lavoro|azienda)\b/gi)||[]).length > 2) return 'Italian';
  if (/\b(wij|ons|onze|voor|met|een|van|het|zijn|wordt)\b/g.test(d) &&
      (d.match(/\b(wij|ons|onze|voor|met|een|van)\b/g)||[]).length > 3) return 'Dutch';
  return 'English';
}
 
function detectLangs(d, title = '', company = '') {
  const writingLang = detectWritingLang(d);
  const l = [writingLang];
  if (writingLang !== 'English' && /english.*(required|must|essential|fluent|only|preferred|working language|is a must)|fluent.*english|strong.*english/i.test(d)) l.push('English');
  if (writingLang !== 'Spanish' && /spanish.*(required|must|fluent)|fluent.*spanish/i.test(d)) l.push('Spanish');
  // 한국어 언어 요구 키워드
  const koreanLang = /korean\s*(speaker|speaking|language|proficiency|fluency|native|required|preferred|is a (plus|must|bonus|asset))|fluent\s*in\s*korean|bilingual.*korean|korean.*bilingual|한국어|korean\s*and\s*english|english\s*and\s*korean/i;
  // 유럽 진출 한국 기업 (상점 제외, 법인/오피스 있는 기업)
  const koreanCompany = /\b(samsung|hyundai|lg\s*(electronics|energy|chem|display|innotek|uplus)|kia\s*(motors|europe)?|sk\s*(hynix|innovation|telecom|bioscience|ecoplant|on\s*semiconductor)?|posco|lotte\s*(chemical|shopping|global|hotel|holdings)?|hanwha\s*(q\s*cells|aerospace|solutions|vision)?|doosan\s*(bobcat|heavy|fuel\s*cell)?|krafton|nexon|netmarble|kakao|kakaobank|kakaogames|naver|coupang|krafton|celltrion|hugel|hy?undai\s*(mobis|glovis|rotem|capital|wia|steel|merchant|marine)?|korean\s*air|asiana|hana\s*(bank|financial)?|kb\s*(financial|securities|insurance)?|shinhan|woori\s*(bank|financial)?|hanhwa|korail|kogas|kepco|korea\s*(electric|gas|expressway|railroad|telecom|aerospace)|ks\s*edition|innocean|kolon|kumho|hyosung|daelim|ssamzie|kotra|posco\s*(international|holdings|future\s*m)?|doosaninfo?)\b/i;
 
  if (koreanLang.test(d)) l.push('Korean');
  else if (koreanCompany.test(title + ' ' + company)) l.push('Korean');
  return l;
}
 
function removeDups(jobs) {
  const seen = new Set();
  return jobs.filter(j => {
    if (!j) return false;
    
    // 수정된 부분: Himalayas 공고도 ID가 고유하므로 ID를 기준으로 중복을 체크하게 합니다.
    const key = (j.source === 'VisaSponsor' || j.source === 'Himalayas')
      ? j.id
      : `${j.title}__${j.company}`.toLowerCase();
      
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
// ── Adzuna ────────────────────────────────────────────────
 
function normalizeAdzuna(raw, countryCode) {
  const info = COUNTRY_INFO[countryCode] || { name: countryCode, flag: '🌍', code: countryCode.toUpperCase() };
  const location = raw.location?.display_name || info.name;
  const desc = raw.description || '';
  const salary = (() => {
    const mn = raw.salary_min, mx = raw.salary_max;
    if (!mn || !mx) return null;
    // 폴란드 공고는 currency 무관하게 급여 표시 안 함 (오탐 많음)
    if (countryCode === 'pl') return null;
    const cur = (raw.currency || 'EUR').toUpperCase();
    // PLN — 환산 오탐 많아서 표시 안 함
    if (cur === 'PLN') return null;
    // 연봉으로 보기에 너무 작은 값 (10,000 미만) — 시급/일당/월급 오탐 방지
    if (mn < 10000) return null;
    // USD → EUR 환산 (1 USD ≈ 0.92 EUR)
    if (cur === 'USD') {
      const eurMin = Math.round(mn * 0.92 / 1000) * 1000;
      const eurMax = Math.round(mx * 0.92 / 1000) * 1000;
      return `€${eurMin.toLocaleString()}–${eurMax.toLocaleString()}/yr`;
    }
    const sym = cur === 'GBP' ? '£' : '€';
    return `${sym}${Math.round(mn).toLocaleString()}–${Math.round(mx).toLocaleString()}/yr`;
  })();
  return {
    id:           String(raw.id || Math.random()),
    title:        raw.title || '',
    level:        detectLevel(raw.title || '', desc),
    company:      raw.company?.display_name || '',
    location,
    country:      info.code,
    flag:         info.flag,
    logo:         companyEmoji(raw.company?.display_name || ''),
    description:  desc,
    url:          raw.redirect_url || '#',
    salary,
    postedAt:     raw.created || new Date().toISOString(),
    source:       'Adzuna',
    skills:       [],
    visaSponsored: detectVisaSponsorship(desc),
    relocation:   detectRelocation(desc),
    remoteType:   detectRemote(desc),
    languageReqs: detectLangs(desc, raw.title || '', raw.company?.display_name || ''),
  };
}
 
function fetchAdzuna(countryCode, categoryTag) {
  return new Promise((resolve) => {
    const params = new URLSearchParams({
      app_id: ADZUNA_APP_ID, app_key: ADZUNA_APP_KEY,
      results_per_page: '20', max_days_old: '21', 'content-type': 'full_time',
    });
    const req = https.request({
      hostname: 'api.adzuna.com',
      path: `/v1/api/jobs/${countryCode}/search/1?${params}&category=${categoryTag}`,
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve(JSON.parse(data).results || []); }
        catch(e) { resolve([]); }
      });
    });
    req.on('error', () => resolve([]));
    req.setTimeout(10000, () => { req.destroy(); resolve([]); });
    req.end();
  });
}
 
function fetchAdzunaKeyword(countryCode, keyword) {
  return new Promise((resolve) => {
    const params = new URLSearchParams({
      app_id: ADZUNA_APP_ID, app_key: ADZUNA_APP_KEY,
      results_per_page: '20', max_days_old: '21', what: keyword, 'content-type': 'full_time',
    });
    const req = https.request({
      hostname: 'api.adzuna.com',
      path: `/v1/api/jobs/${countryCode}/search/1?${params}`,
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve((JSON.parse(data).results || []).map(j => normalizeAdzuna(j, countryCode)).filter(Boolean)); }
        catch(e) { resolve([]); }
      });
    });
    req.on('error', () => resolve([]));
    req.setTimeout(10000, () => { req.destroy(); resolve([]); });
    req.end();
  });
}
 
// ── Remotive ──────────────────────────────────────────────
 
function fetchRemotive() {
  return new Promise((resolve) => {
    const categories = ['marketing', 'data', 'hr', 'software-dev', 'product', 'business-finance', 'writing-editing'];
    // 명확한 비EU 전용만 제외 (블랙리스트) — 나머지는 전부 통과
    // 비EU 국가/타임존 패턴 — loc이 이것들만으로 구성되면 제외
    const NON_EU_PATTERNS = [
      'usa', 'us only', 'united states', 'canada', 'australia', 'new zealand',
      'latin america', 'south america', 'north america', 'india', 'brazil',
      'mexico', 'argentina', 'colombia', 'chile', 'nigeria', 'south africa',
      'japan', 'china', 'south korea', 'philippines', 'indonesia', 'vietnam',
      'thailand', 'malaysia', 'pakistan', 'egypt', 'turkey',
      'usa timezones', 'us timezones', 'american timezones', 'pst', 'est', 'cst', 'mst',
    ];
    // EU/글로벌 키워드가 하나라도 있으면 무조건 통과
    const EU_PASS = ['europe', 'worldwide', 'emea', 'european', 'global', 'anywhere', 'eu timezone', 'cet', 'cest'];

    let allJobs = [];
    let done = 0;
    categories.forEach(cat => {
      const req = https.request({
        hostname: 'remotive.com',
        path: `/api/remote-jobs?category=${cat}&limit=100`,
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      }, res => {
        let data = '';
        res.on('data', c => data += c);
        res.on('end', () => {
          try {
            const raw = JSON.parse(data).jobs || [];
            const filtered = raw.filter(r => {
              const loc = (r.candidate_required_location || '').toLowerCase().trim();
              if (!loc) return true; // 빈값 → Worldwide 간주
              // EU/글로벌 키워드 있으면 무조건 통과
              if (EU_PASS.some(kw => loc.includes(kw))) return true;
              // 비EU 패턴이 포함되면 제외
              return !NON_EU_PATTERNS.some(kw => loc.includes(kw));
            });
            const jobs = filtered.map(r => ({
              id:           'rm_' + String(r.id),
              title:        r.title || '',
              company:      r.company_name || '',
              location:     r.candidate_required_location || 'Remote',
              country:      'EU',
              flag:         '🌍',
              logo:         '🚀',
              description:  r.description || '',
              url:          r.url || '#',
              salary:       r.salary || null,
              postedAt:     r.publication_date || new Date().toISOString(),
              source:       'Remotive',
              skills:       (r.tags || []).slice(0, 6),
              visaSponsored: false,
              relocation:   false,
              remoteType:   'Remote',
              languageReqs: ['English'],
            }));
            allJobs.push(...jobs);
          } catch(e) {}
          done++;
          if (done === categories.length) resolve(allJobs);
        });
      });
      req.on('error', () => { done++; if (done === categories.length) resolve(allJobs); });
      req.setTimeout(10000, () => { req.destroy(); done++; if (done === categories.length) resolve(allJobs); });
      req.end();
    });
  });
}
 
// ── Himalayas ─────────────────────────────────────────────
 
const HIMALAYAS_COUNTRY_MAP = {
  'germany':'DE','netherlands':'NL','spain':'ES','united kingdom':'GB','united-kingdom':'GB',
  'france':'FR','portugal':'PT','ireland':'IE','belgium':'BE','switzerland':'CH','italy':'IT',
  'norway':'NO','sweden':'SE','denmark':'DK','finland':'FI','austria':'AT','poland':'PL',
};
const HIMALAYAS_FLAG = {
  DE:'🇩🇪',NL:'🇳🇱',ES:'🇪🇸',GB:'🇬🇧',FR:'🇫🇷',PT:'🇵🇹',IE:'🇮🇪',
  BE:'🇧🇪',CH:'🇨🇭',IT:'🇮🇹',NO:'🇳🇴',SE:'🇸🇪',DK:'🇩🇰',FI:'🇫🇮',
  AT:'🇦🇹',PL:'🇵🇱',
};
const NON_EU_HM = [
  'united states','usa','canada','australia','new zealand',
  'latin america','south america','africa','asia',
  'india','china','japan','brazil','mexico','argentina','colombia',
  'chile','peru','nigeria','kenya','south africa','egypt','pakistan',
  'philippines','indonesia','vietnam','thailand','malaysia',
  'south korea','taiwan','hong kong','middle east','gulf',
];
 
function fetchHimalayasCountry(country, code) {
  return new Promise((resolve) => {
    const params = new URLSearchParams({ country, limit: '20', sort: 'recent' });
    const req = https.request({
      hostname: 'himalayas.app',
      path: `/jobs/api/search?${params}`,
      method: 'GET',
      headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' },
    }, res => {
      let raw = '';
      res.on('data', c => raw += c);
      res.on('end', () => {
        try {
          const data = JSON.parse(raw);
          const jobs = (data.jobs || [])
            .filter(j => {
              const restrictions = j.locationRestrictions || [];
              if (restrictions.length === 0) return true;
              const keys = restrictions.map(r => r.toLowerCase());
              const hasEu = keys.some(k =>
                k.includes('europe') || k.includes('worldwide') ||
                k === 'anywhere' || k === 'remote' ||
                HIMALAYAS_COUNTRY_MAP[k]
              );
              if (hasEu) return true;
              return !keys.every(k => NON_EU_HM.some(n => k.includes(n)));
            })
            .map(j => {
              // 1. 공고마다 절대 겹치지 않도록 제목, 회사명, 랜덤 숫자를 조합해서 새 ID를 만듭니다.
              const uniqueId = `${j.title}-${j.companyName}-${Math.random().toString(36).slice(2, 9)}`;
              const safeId = uniqueId.replace(/[^a-zA-Z0-9_-]/g, '_'); 
 
              return {
                // 2. 이제 각 공고는 'hm_ES_제목_회사_랜덤값' 형태의 고유한 ID를 가집니다.
                id:          `hm_${code}_${safeId}`,
                title:       j.title || '',
                level:       detectLevel(j.title || '', j.description || ''),
                company:     j.companyName || '',
                location:    country,
                country:     code,
                flag:        HIMALAYAS_FLAG[code] || '🌍',
                logo:        companyEmoji(j.companyName || ''),
                description: j.description || '',
                url:         j.applyUrl || j.applicationLink || `https://himalayas.app/jobs/${j.slug}`,
                salary:      j.salary ? `${j.salary}` : null,
                postedAt:    j.createdAt || j.publishedAt || new Date().toISOString(),
                source:      'Himalayas',
                skills:      (j.categories || []).slice(0, 5).map(c => c.replace(/-/g, ' ')),
                visaSponsored: false, 
                relocation:   false, 
                remoteType:   'Remote', 
                languageReqs: ['English'],
              };
            });
          console.log(`  Himalayas ${country}: ${jobs.length}개`);
          resolve(jobs);
        } catch(e) { resolve([]); }
      });
    });
    req.on('error', () => resolve([]));
    req.setTimeout(5000, () => { req.destroy(); resolve([]); });
    req.end();
  });
}
 
function fetchHimalayasWorldwide() {
  return new Promise((resolve) => {
    const params = new URLSearchParams({ remote: 'true', limit: '100', sort: 'recent' });
    const req = https.request({
      hostname: 'himalayas.app',
      path: `/jobs/api/search?${params}`,
      method: 'GET',
      headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' },
    }, res => {
      let raw = '';
      res.on('data', c => raw += c);
      res.on('end', () => {
        try {
          const data = JSON.parse(raw);
          const jobs = (data.jobs || [])
            .filter(j => {
              const restrictions = j.locationRestrictions || [];
              if (restrictions.length === 0) return true;
              const keys = restrictions.map(r => r.toLowerCase());
              // Worldwide/Europe/EMEA 포함이면 통과, 명확한 비EU 전용이면 제외
              const hasGlobal = keys.some(k =>
                k.includes('worldwide') || k.includes('europe') ||
                k.includes('emea') || k.includes('european') ||
                k === 'anywhere' || k === 'remote'
              );
              if (hasGlobal) return true;
              return !keys.every(k => NON_EU_HM.some(n => k.includes(n)));
            })
            .map(j => {
              const uniqueId = `${j.title}-${j.companyName}-${Math.random().toString(36).slice(2, 9)}`;
              const safeId = uniqueId.replace(/[^a-zA-Z0-9_-]/g, '_');
              return {
                id:          `hm_WW_${safeId}`,
                title:       j.title || '',
                level:       detectLevel(j.title || '', j.description || ''),
                company:     j.companyName || '',
                location:    'Worldwide',
                country:     'EU',
                flag:        '🌍',
                logo:        companyEmoji(j.companyName || ''),
                description: j.description || '',
                url:         j.applyUrl || j.applicationLink || `https://himalayas.app/jobs/${j.slug}`,
                salary:      j.salary ? `${j.salary}` : null,
                postedAt:    j.createdAt || j.publishedAt || new Date().toISOString(),
                source:      'Himalayas',
                skills:      (j.categories || []).slice(0, 5).map(c => c.replace(/-/g, ' ')),
                visaSponsored: false,
                relocation:   false,
                remoteType:   'Remote',
                languageReqs: ['English'],
              };
            });
          console.log(`  Himalayas Worldwide: ${jobs.length}개`);
          resolve(jobs);
        } catch(e) { resolve([]); }
      });
    });
    req.on('error', () => resolve([]));
    req.setTimeout(8000, () => { req.destroy(); resolve([]); });
    req.end();
  });
}
 
async function fetchHimalayas() {
  const targets = [
    ['Germany','DE'], ['Spain','ES'], ['Netherlands','NL'],
    ['United Kingdom','GB'], ['France','FR'], ['Ireland','IE'],
  ];
  try {
    const [countryResults, worldwideJobs] = await Promise.all([
      Promise.all(targets.map(([c, code]) => fetchHimalayasCountry(c, code))),
      fetchHimalayasWorldwide(),
    ]);
    const jobs = [...countryResults.flat(), ...worldwideJobs];
    console.log(`  Himalayas 합계: ${jobs.length}개`);
    return jobs;
  } catch(e) {
    console.log(`  Himalayas 실패: ${e.message}`);
    return [];
  }
}
 
 
// ── WorldJob (공공데이터포털) ─────────────────────────────
 
const WORLDJOB_EU_NATIONS = [
  '독일', '영국', '프랑스', '스페인', '네덜란드', '아일랜드',
  '벨기에', '스위스', '이탈리아', '폴란드', '오스트리아',
  '포르투갈', '스웨덴', '덴마크', '핀란드', '노르웨이',
];
 
const WORLDJOB_COUNTRY_MAP = {
  '독일': 'DE', '영국': 'GB', '프랑스': 'FR', '스페인': 'ES',
  '네덜란드': 'NL', '아일랜드': 'IE', '벨기에': 'BE', '스위스': 'CH',
  '이탈리아': 'IT', '폴란드': 'PL', '오스트리아': 'AT', '포르투갈': 'PT',
  '스웨덴': 'SE', '덴마크': 'DK', '핀란드': 'FI', '노르웨이': 'NO',
};
 
const WORLDJOB_FLAG_MAP = {
  'DE':'🇩🇪','GB':'🇬🇧','FR':'🇫🇷','ES':'🇪🇸','NL':'🇳🇱','IE':'🇮🇪',
  'BE':'🇧🇪','CH':'🇨🇭','IT':'🇮🇹','PL':'🇵🇱','AT':'🇦🇹','PT':'🇵🇹',
  'SE':'🇸🇪','DK':'🇩🇰','FI':'🇫🇮','NO':'🇳🇴',
};
 
function fetchWorldJobPage(pageNo) {
  return new Promise((resolve) => {
    if (!WORLDJOB_API_KEY) return resolve({ jobs: [], total: 0 });
    const params = new URLSearchParams({
      serviceKey: WORLDJOB_API_KEY,
      numOfRows: '100',
      pageNo: String(pageNo),
    });
    const req = https.request({
      hostname: 'apis.data.go.kr',
      path: `/B490007/worldjob31/openApi31?${params}`,
      method: 'GET',
      headers: { 'Accept': 'application/xml' },
    }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          const totalMatch = data.match(/<totalCount>(\d+)<\/totalCount>/);
          const total = totalMatch ? parseInt(totalMatch[1]) : 0;
          const items = [...data.matchAll(/<ITEM>([\s\S]*?)<\/ITEM>/g)];
          const jobs = items.map(m => {
            const xml = m[1];
            const get = tag => {
              const match = xml.match(new RegExp('<' + tag + '>(.*?)<\/' + tag + '>'));
              return match ? match[1].trim() : '';
            };
            const nationNm = get('rctntcNationNm');
            // 유럽 국가만 필터
            const countryCode = WORLDJOB_COUNTRY_MAP[nationNm];
            if (!countryCode) return null;
            const endDe = get('rctntcEndDe');
            // 마감된 공고 제외
            if (endDe && new Date(endDe) < new Date()) return null;
            const title = get('rctntcSj');
            const company = get('entNm');
            const flag = WORLDJOB_FLAG_MAP[countryCode] || '🌍';
            const joCrtfcNo = get('joCrtfcNo');
            const lang = get('rctntcLang');
            // 회사명으로 월드잡 검색 URL 생성 (joCrtfcNo가 API에 없어서 검색으로 대체)
            const jobUrl = `https://www.google.com/search?q=site:worldjob.or.kr+${encodeURIComponent('"' + title + '"')}`;
            // WorldJob 공고는 한국어로 작성되어 있으므로 항상 Korean 태그
            const langReqs = ['Korean'];
            if (lang && !lang.includes('한국어')) langReqs.push('English');
            else langReqs.push('English');
            return {
              id:           `wj_${countryCode}_${(title + company).replace(/[^a-zA-Z0-9가-힣]/g, '_').slice(0, 60)}`,
              title,
              level:        detectLevel(title, ''),
              company,
              location:     nationNm,
              country:      countryCode,
              flag,
              logo:         companyEmoji(company),
              description:  `직종: ${get('rctntcKscoNm')} | 업종: ${get('lplcKscoNm')} | 경력: ${get('careerStleNm')} | 필수언어: ${lang} | 모집인원: ${get('rctntcNmprCo')}명`,
              url:          jobUrl,
              salary:       null,
              postedAt:     get('rctntcBgnDe') || new Date().toISOString(),
              source:       'WorldJob',
              skills:       [],
              visaSponsored: get('rctntcVisaNm').includes('취업비자'),
              relocation:   false,
              remoteType:   'On-site',
              languageReqs: langReqs,
            };
          }).filter(Boolean);
          resolve({ jobs, total });
        } catch(e) {
          console.log(`  WorldJob 페이지${pageNo} 파싱 실패: ${e.message}`);
          resolve({ jobs: [], total: 0 });
        }
      });
    });
    req.on('error', () => resolve({ jobs: [], total: 0 }));
    req.setTimeout(10000, () => { req.destroy(); resolve({ jobs: [], total: 0 }); });
    req.end();
  });
}
 
async function fetchWorldJob() {
  if (!WORLDJOB_API_KEY) {
    console.log('  WorldJob: API 키 없음, 스킵');
    return [];
  }
  // 1페이지로 전체 개수 파악 후 필요시 추가 페이지 요청
  const first = await fetchWorldJobPage(1);
  const allJobs = [...first.jobs];
  const totalPages = Math.ceil(first.total / 100);
  if (totalPages > 1) {
    for (let p = 2; p <= Math.min(totalPages, 10); p++) {
      const { jobs } = await fetchWorldJobPage(p);
      allJobs.push(...jobs);
      await new Promise(r => setTimeout(r, 200));
    }
  }
  console.log(`  WorldJob 합계: ${allJobs.length}개 (유럽 필터 후)`);
  return allJobs;
}
 
// ── VisaSponsor (Supabase) ────────────────────────────────
 
const SUPABASE_URL = 'https://rorckellupiapjrfaqsp.supabase.co';
const SUPABASE_KEY = 'sb_publishable_kAK6n7JyQJUyf72RcIZqIQ_dsAlQ2L3';
 
async function fetchVisaSponsorFromSupabase() {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/visa_jobs?select=*&order=posted_at.desc&limit=500`,
      { headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` } }
    );
    if (!res.ok) throw new Error(`Supabase HTTP ${res.status}`);
    const rows = await res.json();
    if (!Array.isArray(rows) || rows.length === 0) return [];
    console.log(`  visasponsor (Supabase): ${rows.length}개`);
    return rows.map(r => ({
      id:           `vs_${r.id}`,
      title:        r.title || '',
      level:        detectLevel(r.title || '', ''),
      company:      r.company || 'Unknown',
      location:     r.location || '',
      country:      r.country || 'EU',
      flag:         ({DE:'🇩🇪',NL:'🇳🇱',IE:'🇮🇪',GB:'🇬🇧',PT:'🇵🇹'})[r.country] || '🌍',
      logo:         companyEmoji(r.company || ''),
      description:  `[비자 스폰서 확정 - ${r.visa_type||'Sponsored'}] Visa sponsor jobs 검증 공고. 원문에서 상세 내용을 확인하세요.`,
      url:          r.url || '#',
      salary:       null,
      postedAt:     r.posted_at || new Date().toISOString(),
      source:       'VisaSponsor',
      skills:       [],
      visaSponsored: true,
      relocation:   false,
      remoteType:   'On-site',
      languageReqs: ['English'],
      visaType:     r.visa_type || 'Sponsored',
    }));
  } catch(e) {
    console.log(`  visasponsor Supabase 실패: ${e.message}`);
    return [];
  }
}
 
// ── 메모리 캐시 ───────────────────────────────────────────
 
let cache = { jobs: [], fetchedAt: null };
 
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
 
  const { refresh } = req.query;
  const cacheAgeHours = cache.fetchedAt
    ? (Date.now() - new Date(cache.fetchedAt)) / 3600000
    : 999;
 
  if (cache.jobs.length > 0 && cacheAgeHours < 12 && refresh !== '1') {
    return res.status(200).json({
      ok: true, count: cache.jobs.length,
      fetchedAt: cache.fetchedAt, cached: true, jobs: cache.jobs,
    });
  }
 
  console.log('🔄 수집 시작 (Adzuna + Remotive + Himalayas + VisaSponsor)...');
 
  // Adzuna(메인) + Himalayas + Remotive 동시 시작
  const adzunaPromise = (async () => {
    // 배치 병렬 헬퍼: 한 번에 BATCH_SIZE개씩, 배치 사이 딜레이
    async function batchAll(tasks, batchSize = 5, delay = 300) {
      const results = [];
      for (let i = 0; i < tasks.length; i += batchSize) {
        const batch = tasks.slice(i, i + batchSize);
        const batchResults = await Promise.all(batch.map(fn => fn().catch(() => [])));
        results.push(...batchResults);
        if (i + batchSize < tasks.length) await new Promise(r => setTimeout(r, delay));
      }
      return results;
    }
 
    const catTasks = COUNTRIES.flatMap(country =>
      CATEGORIES.map(cat => () =>
        fetchAdzuna(country.code, cat.tag)
          .then(r => r.map(j => normalizeAdzuna(j, country.code)).filter(Boolean))
      )
    );
    const kwTasks = [
      ...MAJOR_COUNTRIES.flatMap(country =>
        DATA_KEYWORDS.map(kw => () => fetchAdzunaKeyword(country, kw))
      ),
      ...OPS_COUNTRIES.flatMap(country =>
        OPS_KEYWORDS.map(kw => () => fetchAdzunaKeyword(country, kw))
      ),
      ...MGMT_COUNTRIES.flatMap(country =>
        MGMT_KEYWORDS.map(kw => () => fetchAdzunaKeyword(country, kw))
      ),
      ...HR_COUNTRIES.flatMap(country =>
        HR_KEYWORDS.map(kw => () => fetchAdzunaKeyword(country, kw))
      ),
      ...MARKETING_COUNTRIES.flatMap(country =>
        MARKETING_KEYWORDS.map(kw => () => fetchAdzunaKeyword(country, kw))
      ),
    ];
 
    const results = await batchAll([...catTasks, ...kwTasks], 5, 300);
    return results.flat();
  })();
 
  const himalayasPromise = fetchHimalayas().catch(() => []);
  const remotivePromise  = fetchRemotive().catch(() => []);
 
  // Adzuna 완료 기다리고, Himalayas/Remotive는 15초 안에 끝나면 포함
  const [adzunaJobs, himalayasJobs, remotiveJobs] = await Promise.all([
    adzunaPromise,
    Promise.race([himalayasPromise, new Promise(r => setTimeout(() => r([]), 15000))]),
    remotivePromise,
  ]);
 
  console.log(`  Adzuna: ${adzunaJobs.length}개, Himalayas: ${himalayasJobs.length}개, Remotive: ${remotiveJobs.length}개`);
 
  let allJobs = [...adzunaJobs, ...himalayasJobs, ...remotiveJobs];
 
  // WorldJob
  console.log('🇰🇷 WorldJob (공공데이터포털) 로드...');
  allJobs.push(...await fetchWorldJob());
 
  // VisaSponsor
  console.log('🛂 visasponsor.jobs (Supabase) 로드...');
  allJobs.push(...await fetchVisaSponsorFromSupabase());
 
  cache.jobs = removeDups(allJobs);
  cache.fetchedAt = new Date().toISOString();
  console.log(`✅ 완료: ${cache.jobs.length}개 (비자스폰서 확정: ${cache.jobs.filter(j=>j.visaSponsored).length}개)`);
 
  res.status(200).json({
    ok: true, count: cache.jobs.length,
    fetchedAt: cache.fetchedAt, cached: false, jobs: cache.jobs,
  });
}
