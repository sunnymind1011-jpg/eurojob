// api/jobs.js — Adzuna API 기반 유럽 채용공고 수집

export const maxDuration = 60;

const ADZUNA_APP_ID  = '22308f32';
const ADZUNA_APP_KEY = '4902733d7210f0c75a0ad5a8d38a3c17';

// 유럽 국가 코드 (Adzuna 지원 국가)
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
];

// 데이터 직군 키워드 검색 (it-jobs에서 what 파라미터로 추가 수집)
const DATA_KEYWORDS = ['data analyst', 'data scientist', 'data engineer'];
const MAJOR_COUNTRIES = ['gb', 'de', 'es', 'nl', 'fr'];

// 직군 카테고리 (Adzuna 실제 카테고리 태그)
const CATEGORIES = [
  { tag: 'it-jobs',                       label: 'IT / 개발 / 데이터' },
  { tag: 'pr-advertising-marketing-jobs', label: '마케팅 / 광고 / PR' },
  { tag: 'hr-jobs',                       label: 'HR / 채용'          },
  { tag: 'scientific-qa-jobs',            label: '데이터 / 분석 / 과학' },
];

function fetchAdzuna(countryCode, categoryTag) {
  return new Promise((resolve) => {
    const https = require('https');
    const params = new URLSearchParams({
      app_id:           ADZUNA_APP_ID,
      app_key:          ADZUNA_APP_KEY,
      results_per_page: '20',
      max_days_old:     '21',
    });

    const path = `/v1/api/jobs/${countryCode}/search/1?${params}&category=${categoryTag}`;

    const req = https.request({
      hostname: 'api.adzuna.com',
      path,
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve(parsed.results || []);
        } catch(e) {
          resolve([]);
        }
      });
    });

    req.on('error', () => resolve([]));
    req.setTimeout(10000, () => { req.destroy(); resolve([]); });
    req.end();
  });
}

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
};

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
    company:      raw.company?.display_name || '',
    location:     location,
    country:      info.code,
    flag:         info.flag,
    logo:         companyEmoji(raw.company?.display_name || ''),
    description:  desc,
    url:          raw.redirect_url || '#',
    salary,
    postedAt:     raw.created || new Date().toISOString(),
    source:       'Adzuna',
    skills:       [],
    visaSponsored: false,
    relocation:   detectRelocation(desc),
    remoteType:   detectRemote(desc),
    languageReqs: detectLangs(desc),
  };
}

function companyEmoji(name) {
  const e = ['🏢','💼','🏗️','🔬','⚡','🚀','🌐','🎯','📊','🏨'];
  return e[(name.charCodeAt(0) || 0) % e.length] || '🏢';
}
function detectRelocation(d) {
  return /relocation (package|support|assistance|allowance)|we (will|can) relocate|relocation provided/i.test(d);
}
function detectRemote(t) {
  if (/remote/i.test(t)) return 'Remote';
  if (/hybrid/i.test(t)) return 'Hybrid';
  return 'On-site';
}
function detectLangs(d) {
  const l = [];
  if (/english/i.test(d)) l.push('English');
  if (/spanish|español/i.test(d)) l.push('Spanish');
  if (/german|deutsch/i.test(d)) l.push('German');
  if (/dutch|nederlands/i.test(d)) l.push('Dutch');
  if (/french|français/i.test(d)) l.push('French');
  if (/korean|한국어/.test(d)) l.push('Korean');
  return l.length ? l : ['English'];
}
function removeDups(jobs) {
  const seen = new Set();
  return jobs.filter(j => {
    const key = `${j.title}__${j.company}`.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// 메모리 캐시
let cache = { jobs: [], fetchedAt: null };


function fetchAdzunaKeyword(countryCode, keyword) {
  return new Promise((resolve) => {
    const https = require('https');
    const params = new URLSearchParams({
      app_id:           ADZUNA_APP_ID,
      app_key:          ADZUNA_APP_KEY,
      results_per_page: '20',
      max_days_old:     '21',
      what:             keyword,
    });

    const req = https.request({
      hostname: 'api.adzuna.com',
      path:     `/v1/api/jobs/${countryCode}/search/1?${params}`,
      method:   'GET',
      headers:  { 'Content-Type': 'application/json' },
    }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve((JSON.parse(data).results || []).map(j => normalizeAdzuna(j, countryCode))); }
        catch(e) { resolve([]); }
      });
    });
    req.on('error', () => resolve([]));
    req.setTimeout(10000, () => { req.destroy(); resolve([]); });
    req.end();
  });
}

function fetchRemotive() {
  return new Promise((resolve) => {
    const https = require('https');
    // 마케팅, 데이터, HR 카테고리
    const categories = ['marketing', 'data', 'hr'];
    let allJobs = [];
    let done = 0;

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
            const parsed = JSON.parse(data);
            const jobs = (parsed.jobs || []).map(r => ({
              id:           String(r.id),
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
      req.setTimeout(8000, () => { req.destroy(); done++; if (done === categories.length) resolve(allJobs); });
      req.end();
    });
  });
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }

  const { refresh } = req.query;
  const cacheAgeHours = cache.fetchedAt
    ? (Date.now() - new Date(cache.fetchedAt)) / 3600000
    : 999;

  if (cache.jobs.length > 0 && cacheAgeHours < 6 && refresh !== '1') {
    return res.status(200).json({
      ok: true, count: cache.jobs.length,
      fetchedAt: cache.fetchedAt, cached: true, jobs: cache.jobs,
    });
  }

  console.log('🔄 Adzuna 수집 시작...');
  let allJobs = [];

  for (const country of COUNTRIES) {
    for (const cat of CATEGORIES) {
      const jobs = await fetchAdzuna(country.code, cat.tag);
      const normalized = jobs.map(j => normalizeAdzuna(j, country.code));
      allJobs.push(...normalized);
      console.log(`${country.flag} ${country.name} / ${cat.label}: ${jobs.length}개`);
      await new Promise(r => setTimeout(r, 150));
    }
  }

  // 데이터 직군 키워드 검색 추가 (it-jobs에서 what 파라미터)
  console.log('🔄 데이터 직군 키워드 검색...');
  for (const country of MAJOR_COUNTRIES) {
    for (const kw of DATA_KEYWORDS) {
      const jobs = await fetchAdzunaKeyword(country, kw);
      allJobs.push(...jobs);
      console.log(`${country} / "${kw}": ${jobs.length}개`);
      await new Promise(r => setTimeout(r, 150));
    }
  }

  // Remotive API 추가 (무료, API Key 불필요)
  console.log('🔄 Remotive 수집 중...');
  const remotive = await fetchRemotive();
  allJobs.push(...remotive);
  console.log(`Remotive: ${remotive.length}개`);

  cache.jobs = removeDups(allJobs);
  cache.fetchedAt = new Date().toISOString();
  console.log(`✅ 완료: ${cache.jobs.length}개`);

  res.status(200).json({
    ok: true, count: cache.jobs.length,
    fetchedAt: cache.fetchedAt, cached: false, jobs: cache.jobs,
  });
}
