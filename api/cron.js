// api/cron.js — 매일 자동 실행 (한국시간 오전 9시)
// vercel.json: "schedule": "0 0 * * *"

export const maxDuration = 60;

const ADZUNA_APP_ID  = '22308f32';
const ADZUNA_APP_KEY = '4902733d7210f0c75a0ad5a8d38a3c17';

const COUNTRIES = ['gb','de','es','nl','fr','at','be','it','pl','ch','ie'];
const MAJOR_COUNTRIES = ['gb','de','es','nl','fr'];

const CATEGORIES = [
  'it-jobs',
  'pr-advertising-marketing-jobs',
  'hr-jobs',
  'scientific-qa-jobs',
];

const DATA_KEYWORDS = ['data analyst', 'data scientist', 'data engineer'];

const VISA_SPONSOR_COUNTRIES = [
  { vsName: 'Germany',        code: 'DE' },
  { vsName: 'Netherlands',    code: 'NL' },
  { vsName: 'Ireland',        code: 'IE' },
  { vsName: 'United-Kingdom', code: 'GB' },
  { vsName: 'Portugal',       code: 'PT' },
];

// ── 개선된 감지 함수들 ──────────────────────────────────────

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
  return /relocation (package|support|assistance|allowance|provided|offered|available|benefit)|we (will|can) relocate|full relocation|relocation supported|moving (costs|expenses) (covered|provided|reimbursed)|(relocation|moving).{0,40}(eligible|qualified|successful|selected) (candidates?|applicants?)|(eligible|successful|selected) candidates?.{0,40}(relocation|moving)|(package|support|assistance).{0,30}relocation|relo (package|support|benefit)/i.test(text);
}

function detectRemote(t) {
  if (/remote/i.test(t)) return 'Remote';
  if (/hybrid/i.test(t)) return 'Hybrid';
  return 'On-site';
}

function detectLevel(title, desc) {
  const t = (title + ' ' + (desc||'')).toLowerCase();
  if (/\bdirector\b|\bvp\b|\bvice president\b|\bhead of\b/i.test(t)) return 'Director';
  if (/\blead\b|\bprincipal\b|\bstaff\b/i.test(t)) return 'Lead';
  if (/\bsenior\b|\bsr\.\b|\bsr\b/i.test(t)) return 'Senior';
  if (/\bjunior\b|\bjr\.\b|\bjr\b/i.test(t)) return 'Junior';
  if (/\bentry.level\b|\bgraduate\b|\binternship\b|\bintern\b|\btraineee?\b/i.test(t)) return 'Entry';
  if (/\bassociate\b/i.test(t)) return 'Associate';
  if (/\bmid.level\b|\bmedior\b/i.test(t)) return 'Mid';
  return '';
}

function detectLangs(d) {
  const writingLang = detectWritingLang(d);
  const l = [writingLang];
  if (writingLang !== 'English' && /english.*(required|must|essential|fluent|only|preferred|working language|is a must)|fluent.*english|strong.*english|(cv|resume|application|cover letter).{0,20}(in english|english only|written in english)|english.*(cv|resume)|please (apply|send|submit).{0,30}english|(working|business|professional).{0,10}english/i.test(d)) l.push('English');
  if (writingLang !== 'Spanish' && /spanish.*(required|must|fluent)|fluent.*spanish/i.test(d)) l.push('Spanish');
  if (/korean|한국어/i.test(d)) l.push('Korean');
  return l;
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

function companyEmoji(name) {
  const e = ['🏢','💼','🏗️','🔬','⚡','🚀','🌐','🎯','📊','🏨'];
  return e[(name.charCodeAt(0) || 0) % e.length] || '🏢';
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

function fetchAdzuna(countryCode, categoryTag) {
  return new Promise((resolve) => {
    const https = require('https');
    const params = new URLSearchParams({
      app_id:           ADZUNA_APP_ID,
      app_key:          ADZUNA_APP_KEY,
      results_per_page: '20',
      max_days_old:     '21',
    });
    const req = https.request({
      hostname: 'api.adzuna.com',
      path:     `/v1/api/jobs/${countryCode}/search/1?${params}&category=${categoryTag}`,
      method:   'GET',
      headers:  { 'Content-Type': 'application/json' },
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
        try { resolve(JSON.parse(data).results || []); }
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
    const https = require('https');
    const categories = ['marketing', 'data', 'hr'];
    let allJobs = [];
    let done = 0;
    categories.forEach(cat => {
      const req = https.request({
        hostname: 'remotive.com',
        path:     `/api/remote-jobs?category=${cat}&limit=50`,
        method:   'GET',
        headers:  { 'Content-Type': 'application/json' },
      }, res => {
        let data = '';
        res.on('data', c => data += c);
        res.on('end', () => {
          try { allJobs.push(...(JSON.parse(data).jobs || [])); } catch(e) {}
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

async function fetchVisaSponsorPage(countryInfo) {
  const allJobs = [];
  for (let page = 0; page <= 2; page++) {
    const pageJobs = await fetchVisaSponsorSinglePage(countryInfo, page);
    allJobs.push(...pageJobs);
    if (pageJobs.length === 0) break;
    await new Promise(r => setTimeout(r, 300));
  }
  return allJobs;
}

function fetchVisaSponsorSinglePage(countryInfo, page = 0) {
  return new Promise((resolve) => {
    const https = require('https');
    const path = page === 0
      ? `/api/jobs?country=${countryInfo.vsName}`
      : `/api/jobs?country=${countryInfo.vsName}&page=${page}`;
    const req = https.request({
      hostname: 'visasponsor.jobs',
      path,
      method:   'GET',
      headers:  {
        'User-Agent': 'Mozilla/5.0 (compatible; EuroJobBot/1.0)',
        'Accept':     'text/html',
      },
    }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve(parseVisaSponsorHTML(data, countryInfo)); }
        catch(e) { resolve([]); }
      });
    });
    req.on('error', () => resolve([]));
    req.setTimeout(12000, () => { req.destroy(); resolve([]); });
    req.end();
  });
}

function parseVisaSponsorHTML(html, countryInfo) {
  const jobs = [];
  const linkRegex = /href="(https:\/\/visasponsor\.jobs\/api\/jobs\/([a-f0-9]+)\/([^"]+))"/g;
  const seen = new Set();
  let match;
  while ((match = linkRegex.exec(html)) !== null) {
    const url = match[1];
    const id  = match[2];
    const slug = match[3];
    if (seen.has(id)) continue;
    seen.add(id);
    const title = decodeURIComponent(slug.replace(/-/g, ' ')).replace(/\(.*?\)/g, '').trim();
    const pos = html.indexOf(`href="${url}"`);
    const block = html.slice(Math.max(0, pos - 100), pos + 600);
    const companyMatch = block.match(/alt="([^"]+?)"\s*\/?>\s*\n?\s*([A-Z][^\n<]{2,60}?)\s*\n?\s*---/);
    const company = companyMatch ? companyMatch[2].trim() : '';
    const locationMatch = block.match(/([A-Z][a-zA-Z\s]+),\s*\n?\s*([A-Z][a-zA-Z\s]+),\s*\n?\s*([A-Z][a-zA-Z\s]+)/);
    const location = locationMatch ? `${locationMatch[1].trim()}, ${countryInfo.vsName.replace(/-/g,' ')}` : countryInfo.vsName.replace(/-/g,' ');
    const visaMatch = block.match(/(Skilled Worker|EU Blue Card|Highly Skilled Migrant|Critical Skills|Tech Visa|Health and Care Worker|All other\/unspecified)/i);
    const visaType = visaMatch ? visaMatch[1] : 'Sponsored';
    const dateMatch = block.match(/Publish date\s+(\d{2}-\d{2}-\d{4})/);
    let postedAt = new Date().toISOString();
    if (dateMatch) {
      const [d, m, y] = dateMatch[1].split('-');
      postedAt = new Date(`${y}-${m}-${d}`).toISOString();
    }
    if (!title || title.length < 3) continue;
    const COUNTRY_FLAGS = { DE:'🇩🇪', NL:'🇳🇱', IE:'🇮🇪', GB:'🇬🇧', PT:'🇵🇹' };
    jobs.push({
      id:           `vs_${id}`,
      title:        title.slice(0, 100),
      level:        detectLevel(title, ''),
      company:      company || 'Unknown',
      location,
      country:      countryInfo.code,
      flag:         COUNTRY_FLAGS[countryInfo.code] || '🌍',
      logo:         companyEmoji(company || 'V'),
      description:  `Visa sponsorship confirmed: ${visaType}. This position offers visa sponsorship for eligible candidates.`,
      url,
      salary:       null,
      postedAt,
      source:       'VisaSponsor',
      skills:       [],
      visaSponsored: true,
      relocation:   false,
      remoteType:   'On-site',
      languageReqs: ['English'],
      visaType,
    });
  }
  return jobs;
}

// ── Main Cron Handler ─────────────────────────────────────

export default async function handler(req, res) {
  if (process.env.CRON_SECRET &&
      req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  console.log('⏰ Cron 시작:', new Date().toISOString());
  let total = 0;

  for (const country of COUNTRIES) {
    for (const cat of CATEGORIES) {
      const jobs = await fetchAdzuna(country, cat);
      total += jobs.length;
      await new Promise(r => setTimeout(r, 150));
    }
  }

  for (const country of MAJOR_COUNTRIES) {
    for (const kw of DATA_KEYWORDS) {
      const jobs = await fetchAdzunaKeyword(country, kw);
      total += jobs.length;
      await new Promise(r => setTimeout(r, 150));
    }
  }

  const remotive = await fetchRemotive();
  total += remotive.length;
  console.log(`  Remotive: ${remotive.length}개`);

  // visasponsor.jobs 수집
  const vsJobs = await Promise.allSettled(
    VISA_SPONSOR_COUNTRIES.map(c => fetchVisaSponsorPage(c))
  );
  vsJobs.forEach((r, i) => {
    if (r.status === 'fulfilled') {
      total += r.value.length;
      console.log(`  visasponsor ${VISA_SPONSOR_COUNTRIES[i].vsName}: ${r.value.length}개`);
    }
  });

  console.log(`⏰ Cron 완료: 총 ${total}개`);
  res.status(200).json({
    ok: true,
    message: `Cron 완료: ${total}개 수집`,
    timestamp: new Date().toISOString(),
  });
}
