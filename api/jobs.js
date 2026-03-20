const { createClient } = require('@supabase/supabase-js');

// 1. Supabase 설정
const SUPABASE_URL = 'https://rorckellupiapjrfaqsp.supabase.co';
const SUPABASE_KEY = 'sb_publishable_kAK6n7JyQJUyf72RcIZqIQ_dsAlQ2L3';
const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

export const maxDuration = 60;

const ADZUNA_APP_ID  = '22308f32';
const ADZUNA_APP_KEY = '4902733d7210f0c75a0ad5a8d38a3c17';

// --- [데이터 설정] ---
const COUNTRIES = [
  { code: 'gb', name: 'United Kingdom', flag: '🇬🇧' },
  { code: 'de', name: 'Germany', flag: '🇩🇪' },
  { code: 'es', name: 'Spain', flag: '🇪🇸' },
  { code: 'nl', name: 'Netherlands', flag: '🇳🇱' },
  { code: 'fr', name: 'France', flag: '🇫🇷' },
  { code: 'at', name: 'Austria', flag: '🇦🇹' },
  { code: 'be', name: 'Belgium', flag: '🇧🇪' },
  { code: 'it', name: 'Italy', flag: '🇮🇹' },
  { code: 'pl', name: 'Poland', flag: '🇵🇱' },
  { code: 'ch', name: 'Switzerland', flag: '🇨🇭' },
];

const DATA_KEYWORDS = ['data analyst', 'data scientist', 'data engineer'];
const MAJOR_COUNTRIES = ['gb', 'de', 'es', 'nl', 'fr'];

const CATEGORIES = [
  { tag: 'it-jobs', label: 'IT / 개발 / 데이터' },
  { tag: 'pr-advertising-marketing-jobs', label: '마케팅 / 광고 / PR' },
  { tag: 'hr-jobs', label: 'HR / 채용' },
  { tag: 'scientific-qa-jobs', label: '데이터 / 분석 / 과학' },
];

const COUNTRY_INFO = {
  gb: { name: 'United Kingdom', flag: '🇬🇧', code: 'GB' },
  de: { name: 'Germany', flag: '🇩🇪', code: 'DE' },
  es: { name: 'Spain', flag: '🇪🇸', code: 'ES' },
  nl: { name: 'Netherlands', flag: '🇳🇱', code: 'NL' },
  fr: { name: 'France', flag: '🇫🇷', code: 'FR' },
  at: { name: 'Austria', flag: '🇦🇹', code: 'AT' },
  be: { name: 'Belgium', flag: '🇧🇪', code: 'BE' },
  it: { name: 'Italy', flag: '🇮🇹', code: 'IT' },
  pl: { name: 'Poland', flag: '🇵🇱', code: 'PL' },
  ch: { name: 'Switzerland', flag: '🇨🇭', code: 'CH' },
};

// --- [도우미 함수들: 원본 로직 그대로] ---
function detectRelocation(d) { return /relocation (package|support|assistance|allowance)|we (will|can) relocate|relocation provided/i.test(d); }
function detectRemote(t) { if (/remote/i.test(t)) return 'Remote'; if (/hybrid/i.test(t)) return 'Hybrid'; return 'On-site'; }
function detectLangs(d) {
  const l = [];
  if (/english/i.test(d)) l.push('English');
  if (/spanish|español/i.test(d)) l.push('Spanish');
  if (/german|deutsch/i.test(d)) l.push('German');
  if (/french|français/i.test(d)) l.push('French');
  return l.length ? l : ['English'];
}
function companyEmoji(name) { return ['🏢','💼','🏗️','🔬','⚡','🚀','🌐','🎯','📊','🏨'][(name.charCodeAt(0) || 0) % 10]; }

function normalizeAdzuna(raw, countryCode) {
  const info = COUNTRY_INFO[countryCode] || { name: countryCode, flag: '🌍', code: countryCode.toUpperCase() };
  const desc = raw.description || '';
  return {
    id: String(raw.id || Math.random()),
    title: raw.title || '',
    company: raw.company?.display_name || '',
    location: raw.location?.display_name || info.name,
    country: info.code,
    flag: info.flag,
    logo: companyEmoji(raw.company?.display_name || ''),
    description: desc,
    url: raw.redirect_url || '#',
    postedAt: raw.created || new Date().toISOString(),
    source: 'Adzuna',
    relocation: detectRelocation(desc),
    remoteType: detectRemote(desc),
    languageReqs: detectLangs(desc),
  };
}

// --- [API 수집 함수들] ---
function fetchAdzuna(countryCode, categoryTag) {
  return new Promise((resolve) => {
    const https = require('https');
    const params = new URLSearchParams({ app_id: ADZUNA_APP_ID, app_key: ADZUNA_APP_KEY, results_per_page: '20', max_days_old: '21' });
    const req = https.request({ hostname: 'api.adzuna.com', path: `/v1/api/jobs/${countryCode}/search/1?${params}&category=${categoryTag}`, method: 'GET' }, res => {
      let data = ''; res.on('data', c => data += c);
      res.on('end', () => { try { resolve(JSON.parse(data).results || []); } catch(e) { resolve([]); } });
    });
    req.on('error', () => resolve([]));
    req.end();
  });
}

function fetchRemotive() {
  return new Promise((resolve) => {
    const https = require('https');
    const categories = ['marketing', 'data', 'hr'];
    let allJobs = []; let done = 0;
    categories.forEach(cat => {
      const req = https.request({ hostname: 'remotive.com', path: `/api/remote-jobs?category=${cat}&limit=50`, method: 'GET' }, res => {
        let data = ''; res.on('data', c => data += c);
        res.on('end', () => {
          try {
            const jobs = (JSON.parse(data).jobs || []).map(r => ({
              id: String(r.id), title: r.title, company: r.company_name, location: r.candidate_required_location || 'Remote',
              country: 'EU', flag: '🌍', logo: '🚀', description: r.description, url: r.url, postedAt: r.publication_date,
              source: 'Remotive', remoteType: 'Remote', languageReqs: ['English']
            }));
            allJobs.push(...jobs);
          } catch(e) {}
          done++; if (done === categories.length) resolve(allJobs);
        });
      });
      req.on('error', () => { done++; if (done === categories.length) resolve(allJobs); });
      req.end();
    });
  });
}

// --- [메인 핸들러] ---
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    // 1. DB 조회
    const { data: dbJobs, error } = await sb.from('jobs_cache').select('*').order('created_at', { ascending: false });

    if (!error && dbJobs && dbJobs.length > 0) {
      return res.status(200).json({ ok: true, count: dbJobs.length, jobs: dbJobs, cached: true });
    }

    // 2. 비상시 실시간 수집 (Remotive 포함)
    let allJobs = [];
    // Adzuna 수집
    for (const country of COUNTRIES.slice(0, 3)) {
      for (const cat of CATEGORIES.slice(0, 2)) {
        const jobs = await fetchAdzuna(country.code, cat.tag);
        allJobs.push(...jobs.map(j => normalizeAdzuna(j, country.code)));
      }
    }
    // Remotive 수집
    const remotive = await fetchRemotive();
    allJobs.push(...remotive);

    res.status(200).json({ ok: true, count: allJobs.length, jobs: allJobs, cached: false });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
}
