// api/jobs.js — Adzuna + Remotive + visasponsor.jobs 유럽 채용공고 수집
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

// ── 개선된 감지 함수들 ──────────────────────────────────────

function detectVisaSponsorship(d) {
  if (!d) return false;
  const text = d.toLowerCase();
  // 부정 표현 먼저 차단
  const noSponsor = /no visa sponsorship|not able to sponsor|unable to (provide|offer|support) (visa|sponsorship)|visa sponsorship (is not|not) (available|provided|offered)|we do not sponsor|cannot sponsor|won't sponsor|does not (offer|provide) (visa|work permit)|must (already |)(have|hold|possess) (the |)(right to work|valid visa|work authorization)|only (candidates|applicants).{0,40}(right to work|eu|eligible to work)/i;
  const negPattern = /\b(no|not|without|unable to|cannot|can't|won't|do not|don't|never|unfortunately)\b.{0,60}(visa|sponsor|work permit|right to work)/i;
  if (noSponsor.test(text) || negPattern.test(text)) return false;
  // 긍정 표현
  return /visa sponsorship (available|provided|offered|supported|possible|considered)|we (will|can|do) sponsor|sponsor(ing|ed|ship for) (non-eu|non eu|international|overseas|foreign|candidates|applicants)|skilled worker visa|work permit (provided|supported|assistance|included)|right to work (provided|sponsored|supported)|eu blue card|tier 2 (visa|sponsor)|sponsorship (available|provided|offered)|open to sponsoring|happy to sponsor|able to sponsor|(visa|sponsorship|work permit).{0,50}(eligible|qualified|successful|selected) (candidates?|applicants?)|(eligible|successful|selected) candidates?.{0,50}(visa|sponsorship|work permit)/i.test(text);
}

function detectRelocation(d) {
  if (!d) return false;
  const text = d.toLowerCase();
  if (/no relocation|relocation (not|is not) (provided|offered|available|supported)/i.test(text)) return false;
  return /relocation (package|support|assistance|allowance|provided|offered|available|benefit)|we (will|can) relocate|full relocation|relocation supported|moving (costs|expenses) (covered|provided|reimbursed)|(relocation|moving).{0,40}(eligible|qualified|successful|selected) (candidates?|applicants?)|(eligible|successful|selected) candidates?.{0,40}(relocation|moving)|(package|support|assistance).{0,30}relocation|relo (package|support|benefit)/i.test(text);
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

function detectLangs(d) {
  const writingLang = detectWritingLang(d);
  const l = [writingLang];
  if (writingLang !== 'English' && /english.*(required|must|essential|fluent|only|preferred|working language|is a must)|fluent.*english|strong.*english|(cv|resume|application|cover letter).{0,20}(in english|english only|written in english)|english.*(cv|resume)|please (apply|send|submit).{0,30}english|(working|business|professional).{0,10}english/i.test(d)) l.push('English');
  if (writingLang !== 'Spanish' && /spanish.*(required|must|fluent)|fluent.*spanish/i.test(d)) l.push('Spanish');
  if (/korean|한국어/i.test(d)) l.push('Korean');
  return l;
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
    languageReqs: detectLangs(desc),
  };
}

function fetchAdzuna(countryCode, categoryTag) {
  return new Promise((resolve) => {
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

// ── Remotive ──────────────────────────────────────────────

function fetchRemotive() {
  return new Promise((resolve) => {
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
            const desc = '';
            const jobs = (JSON.parse(data).jobs || []).map(r => ({
              id:           String(r.id),
              title:        r.title || '',
              level:        detectLevel(r.title || '', r.description || ''),
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

// ── visasponsor.jobs ──────────────────────────────────────
// Puppeteer로 직접 스크래핑

const VISA_SPONSOR_COUNTRIES = [
  { vsName: 'Germany',        code: 'DE', flag: '🇩🇪' },
  { vsName: 'Netherlands',    code: 'NL', flag: '🇳🇱' },
  { vsName: 'Ireland',        code: 'IE', flag: '🇮🇪' },
  { vsName: 'United-Kingdom', code: 'GB', flag: '🇬🇧' },
  { vsName: 'Portugal',       code: 'PT', flag: '🇵🇹' },
];

async function getBrowser() {
  const chromium = (await import('@sparticuz/chromium')).default;
  const puppeteer = (await import('puppeteer-core')).default;
  return puppeteer.launch({
    args: chromium.args,
    defaultViewport: chromium.defaultViewport,
    executablePath: await chromium.executablePath(),
    headless: chromium.headless,
    ignoreHTTPSErrors: true,
  });
}

async function scrapeVisaSponsorCountry(page, countryInfo) {
  const jobs = [];
  const seen = new Set();

  for (let p = 0; p <= 2; p++) {
    try {
      const url = p === 0
        ? `https://visasponsor.jobs/api/jobs?country=${countryInfo.vsName}`
        : `https://visasponsor.jobs/api/jobs?country=${countryInfo.vsName}&page=${p}`;

      await page.goto(url, { waitUntil: 'networkidle2', timeout: 20000 });

      const pageJobs = await page.evaluate(() => {
        const links = document.querySelectorAll('a[href*="/api/jobs/"]');
        const results = [];
        links.forEach(link => {
          const href = link.getAttribute('href') || '';
          const match = href.match(/\/api\/jobs\/([a-f0-9]{32})\/([^/?#]+)/);
          if (!match) return;
          const id = match[1];
          const slug = match[2];
          const container = link.closest('article, li, [class*="job"], [class*="card"]') || link.parentElement;
          const text = container?.textContent || '';
          const visaMatch = text.match(/(Skilled Worker|EU Blue Card|Highly Skilled Migrant|Critical Skills|Tech Visa|Health and Care Worker)/i);
          const dateMatch = text.match(/Publish date\s+(\d{2})-(\d{2})-(\d{4})/);
          const companyMatch = text.match(/---\s*([\s\S]{2,80}?)\s*---/);
          results.push({
            id, slug,
            title: link.textContent?.trim() || '',
            company: companyMatch ? companyMatch[1].trim().split('\n')[0].trim() : '',
            visaType: visaMatch ? visaMatch[1] : 'Sponsored',
            dateStr: dateMatch ? `${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}` : null,
            url: `https://visasponsor.jobs${href}`,
          });
        });
        return results;
      });

      if (pageJobs.length === 0) break;

      for (const j of pageJobs) {
        if (seen.has(j.id)) continue;
        seen.add(j.id);
        const title = (j.title || decodeURIComponent(j.slug.replace(/-/g,' '))).trim();
        if (!title || title.length < 3) continue;
        jobs.push({
          id:           `vs_${j.id}`,
          title:        title.slice(0, 120),
          level:        detectLevel(title, ''),
          company:      j.company || 'Unknown',
          location:     countryInfo.vsName.replace(/-/g,' '),
          country:      countryInfo.code,
          flag:         countryInfo.flag,
          logo:         companyEmoji(j.company || 'V'),
          description:  `[비자 스폰서 확정 - ${j.visaType}] visasponsor.jobs 검증 공고. 원문에서 상세 내용을 확인하세요.`,
          url:          j.url,
          salary:       null,
          postedAt:     j.dateStr ? new Date(j.dateStr).toISOString() : new Date().toISOString(),
          source:       'VisaSponsor',
          skills:       [],
          visaSponsored: true,
          relocation:   false,
          remoteType:   'On-site',
          languageReqs: ['English'],
          visaType:     j.visaType,
        });
      }
      console.log(`  [${countryInfo.vsName}] page ${p}: ${pageJobs.length}개`);
      await new Promise(r => setTimeout(r, 500));
    } catch(e) {
      console.log(`  [${countryInfo.vsName}] page ${p} 오류: ${e.message}`);
      break;
    }
  }
  return jobs;
}

async function fetchAllVisaSponsor() {
  let browser;
  try {
    browser = await getBrowser();
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    const allJobs = [];
    for (const country of VISA_SPONSOR_COUNTRIES) {
      const jobs = await scrapeVisaSponsorCountry(page, country);
      allJobs.push(...jobs);
      console.log(`  visasponsor ${country.vsName}: ${jobs.length}개`);
    }
    return allJobs;
  } catch(e) {
    console.log(`  visasponsor.jobs Puppeteer 실패: ${e.message}`);
    return [];
  } finally {
    if (browser) await browser.close().catch(() => {});
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

  console.log('🔄 수집 시작 (Adzuna + Remotive + VisaSponsor)...');
  let allJobs = [];

  // Adzuna 카테고리별 수집
  for (const country of COUNTRIES) {
    for (const cat of CATEGORIES) {
      const jobs = await fetchAdzuna(country.code, cat.tag);
      allJobs.push(...jobs.map(j => normalizeAdzuna(j, country.code)));
      await new Promise(r => setTimeout(r, 150));
    }
  }

  // Adzuna 데이터 키워드 수집
  for (const country of MAJOR_COUNTRIES) {
    for (const kw of DATA_KEYWORDS) {
      allJobs.push(...await fetchAdzunaKeyword(country, kw));
      await new Promise(r => setTimeout(r, 150));
    }
  }

  // Remotive 수집
  allJobs.push(...await fetchRemotive());

  // visasponsor.jobs 수집 (비자스폰서 확정 공고)
  console.log('🛂 visasponsor.jobs 수집 시작...');
  allJobs.push(...await fetchAllVisaSponsor());

  cache.jobs = removeDups(allJobs);
  cache.fetchedAt = new Date().toISOString();
  console.log(`✅ 완료: ${cache.jobs.length}개 (비자스폰서 확정: ${cache.jobs.filter(j=>j.visaSponsored).length}개)`);

  res.status(200).json({
    ok: true, count: cache.jobs.length,
    fetchedAt: cache.fetchedAt, cached: false, jobs: cache.jobs,
  });
}
