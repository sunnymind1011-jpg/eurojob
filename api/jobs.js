// api/jobs.js — Adzuna + Remotive + Himalayas + VisaSponsor
import https from 'https';

export const maxDuration = 60;

const ADZUNA_APP_ID  = '22308f32';
const ADZUNA_APP_KEY = '4902733d7210f0c75a0ad5a8d38a3c17';

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

const DATA_KEYWORDS = ['data analyst', 'data scientist', 'data engineer'];
const MAJOR_COUNTRIES = ['gb', 'de', 'es', 'nl', 'fr'];
const BIZ_KEYWORDS = ['business development', 'project manager', 'logistics manager'];
const BIZ_COUNTRIES = ['es'];

const CATEGORIES = [
  { tag: 'it-jobs',                       label: 'IT / 개발 / 데이터' },
  { tag: 'pr-advertising-marketing-jobs', label: '마케팅 / 광고 / PR' },
  { tag: 'hr-jobs',                       label: 'HR / 채용'          },
  { tag: 'scientific-qa-jobs',            label: '데이터 / 분석 / 과학' },
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
  const t = (title + ' ' + desc).toLowerCase();
  if (/\bdirector\b|\bvp\b|\bvice president\b|\bhead of\b/i.test(t)) return 'Director';
  if (/\blead\b|\bprincipal\b|\bstaff\b/i.test(t)) return 'Lead';
  if (/\bsenior\b|\bsr\.\b|\bsr\b/i.test(t)) return 'Senior';
  if (/\bjunior\b|\bjr\.\b|\bjr\b/i.test(t)) return 'Junior';
  if (/\bentry.level\b|\bgraduate\b|\binternship\b|\bintern\b|\btraineee?\b/i.test(t)) return 'Entry';
  if (/\bassociate\b/i.test(t)) return 'Associate';
  if (/\bmid.level\b|\bmedior\b/i.test(t)) return 'Mid';
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
  const salary = raw.salary_min && raw.salary_max
    ? `${raw.currency || '€'}${Math.round(raw.salary_min).toLocaleString()}–${Math.round(raw.salary_max).toLocaleString()}/yr`
    : null;
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
      results_per_page: '20', max_days_old: '21',
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
      results_per_page: '20', max_days_old: '21', what: keyword,
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
    const categories = ['marketing', 'data', 'hr'];
    let allJobs = [];
    let done = 0;
    const NON_EU = [
      'united states','usa','us only','canada','australia','new zealand',
      'latin america','south america','africa','asia',
      'india','china','japan','brazil','mexico','argentina','colombia',
      'chile','peru','venezuela','ecuador','bolivia','paraguay','uruguay',
      'nigeria','kenya','south africa','egypt','pakistan','bangladesh',
      'philippines','indonesia','vietnam','thailand','malaysia',
      'south korea','taiwan','hong kong','middle east','gulf',
    ];
    categories.forEach(cat => {
      const req = https.request({
        hostname: 'remotive.com',
        path: `/api/remote-jobs?category=${cat}&limit=50`,
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      }, res => {
        let data = '';
        res.on('data', c => data += c);
        res.on('end', () => {
          try {
            const jobs = (JSON.parse(data).jobs || [])
              .filter(r => {
                const loc = (r.candidate_required_location || '').toLowerCase();
                if (!loc || loc === 'remote' || loc === 'worldwide' || loc === 'anywhere') return true;
                if (loc.includes('europe') || loc.includes('worldwide')) return true;
                return !NON_EU.some(n => loc.includes(n));
              })
              .map(r => ({
                id:           String(r.id),
                title:        r.title || '',
                level:        detectLevel(r.title || '', r.description || ''),
                company:      r.company_name || '',
                location:     r.candidate_required_location || 'Remote',
                country:      'EU',
                flag:         '🌍',
                logo:         '🚀',
                description:  (r.description || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim(),
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
      req.setTimeout(8000, () => { req.destroy(); done++; if (done === categories.length) resolve(allJobs); });
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
              const uniqueId = `${j.title}-${j.company?.name}-${Math.random().toString(36).slice(2, 9)}`;
              const safeId = uniqueId.replace(/[^a-zA-Z0-9_-]/g, '_'); 

              return {
                // 2. 이제 각 공고는 'hm_ES_제목_회사_랜덤값' 형태의 고유한 ID를 가집니다.
                id:          `hm_${code}_${safeId}`,
                title:       j.title || '',
                level:       detectLevel(j.title || '', j.description || ''),
                company:     j.company?.name || '',
                location:    country,
                country:     code,
                flag:        HIMALAYAS_FLAG[code] || '🌍',
                logo:        companyEmoji(j.company?.name || ''),
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

async function fetchHimalayas() {
  const targets = [
    ['Germany','DE'], ['Spain','ES'], ['Netherlands','NL'],
    ['United Kingdom','GB'], ['France','FR'], ['Ireland','IE'],
  ];
  try {
    const results = await Promise.all(targets.map(([c, code]) => fetchHimalayasCountry(c, code)));
    const jobs = results.flat();
    console.log(`  Himalayas 합계: ${jobs.length}개`);
    return jobs;
  } catch(e) {
    console.log(`  Himalayas 실패: ${e.message}`);
    return [];
  }
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
      ...BIZ_COUNTRIES.flatMap(country =>
        BIZ_KEYWORDS.map(kw => () => fetchAdzunaKeyword(country, kw))
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
