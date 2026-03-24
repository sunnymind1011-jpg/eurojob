// .github/scripts/scrape-visa.mjs
// GitHub Actions에서 실행 — Ubuntu 환경이라 Puppeteer 정상 작동

import puppeteer from 'puppeteer';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

const COUNTRIES = [
  { vsName: 'Germany',        code: 'DE' },
  { vsName: 'Netherlands',    code: 'NL' },
  { vsName: 'Ireland',        code: 'IE' },
  { vsName: 'United-Kingdom', code: 'GB' },
  { vsName: 'Portugal',       code: 'PT' },
];

// 수집할 직종 분류 (visasponsor.jobs classification 파라미터)
const CLASSIFICATIONS = [
  'Information-Technology',
  'Marketing-and-Media',
  'Human-Resources',
  'Engineering',
  'Financial-Services',
  'Management-and-Strategy',
  'Research-and-Science',
];

async function scrapePage(page, url) {
  const jobs = [];
  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

    const pageJobs = await page.evaluate(() => {
      const results = [];
      // 각 공고는 /api/jobs/[32자 hex]/[slug] 링크
      const jobLinks = [...document.querySelectorAll('a[href]')].filter(a => {
        const href = a.getAttribute('href') || '';
        return /\/api\/jobs\/[a-f0-9]{32}\/[^/?#]+$/.test(href);
      });

      jobLinks.forEach(link => {
        const href = link.getAttribute('href');
        const match = href.match(/\/api\/jobs\/([a-f0-9]{32})\/([^/?#]+)$/);
        if (!match) return;

        const id = match[1];
        const slug = match[2];

        // 링크 텍스트 = 제목 (숫자 jobs 텍스트 제외)
        const rawTitle = link.innerText?.trim() || '';
        // "1555 jobs" 같은 게 title이면 slug에서 복원
        const isCountText = /^\d+\s+jobs?$/i.test(rawTitle);
        const title = isCountText
          ? decodeURIComponent(slug).replace(/-/g, ' ').replace(/[()]/g, '').trim()
          : rawTitle;

        // 공고 컨테이너: 링크 주변 구조에서 회사명/위치/비자타입 추출
        // visasponsor.jobs 구조: 링크 → 그 안에 또는 바로 다음 sibling에 회사명
        const container = link.parentElement;
        const allText = container?.innerText || '';
        const lines = allText.split('\n').map(l => l.trim()).filter(l => l.length > 1 && !/^\d+\s+jobs?$/i.test(l));

        // 회사명: title 다음 줄 (단, 비자타입/날짜/국가 아닌 것)
        const skipPatterns = /Skilled Worker|EU Blue Card|Highly Skilled Migrant|Critical Skills|Tech Visa|Publish date|Information Technology|Marketing|Human Resources|Engineering|Financial|Management|Research|All other/i;
        const titleIdx = lines.findIndex(l => l === title || l.startsWith(title.slice(0, 20)));
        let company = '';
        for (let i = (titleIdx >= 0 ? titleIdx + 1 : 1); i < lines.length; i++) {
          if (!skipPatterns.test(lines[i]) && lines[i].length > 1 && lines[i].length < 80) {
            company = lines[i];
            break;
          }
        }

        // 위치
        const locMatch = allText.match(/([A-Z][a-zA-Z\s\-\.]+),\s*([A-Za-z][a-zA-Z\s]+),\s*(Germany|Netherlands|Ireland|United Kingdom|Portugal|England|Scotland|Wales)/);
        const location = locMatch ? `${locMatch[1].trim()}, ${locMatch[3]}` : '';

        // 비자타입
        const visaMatch = allText.match(/(Skilled Worker|EU Blue Card|Highly Skilled Migrant|Critical Skills|Tech Visa|Health and Care Worker)/i);

        // 날짜
        const dateMatch = allText.match(/Publish date\s+(\d{2})-(\d{2})-(\d{4})/);

        if (!title || title.length < 3) return;

        results.push({
          id, slug, title, company,
          location,
          visa_type: visaMatch ? visaMatch[1] : 'Sponsored',
          date_str: dateMatch ? `${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}` : null,
          url: `https://visasponsor.jobs${href}`,
        });
      });
      return results;
    });

    jobs.push(...pageJobs);
    console.log(`    ${url.split('?')[1] || 'page0'}: ${pageJobs.length}개`);
  } catch(e) {
    console.log(`    오류: ${e.message}`);
  }
  return jobs;
}

async function scrapeCountryClassification(page, country, classification) {
  const jobs = [];
  const seen = new Set();

  for (let p = 0; p <= 2; p++) {
    const url = p === 0
      ? `https://visasponsor.jobs/api/jobs?country=${country.vsName}&classification=${classification}`
      : `https://visasponsor.jobs/api/jobs?country=${country.vsName}&classification=${classification}&page=${p}`;

    const pageJobs = await scrapePage(page, url);
    if (pageJobs.length === 0) break;

    for (const j of pageJobs) {
      if (seen.has(j.id)) continue;
      seen.add(j.id);
      jobs.push(j);
    }
    await new Promise(r => setTimeout(r, 800));
  }
  return jobs;
}

async function main() {
  console.log('🚀 visasponsor.jobs 스크래핑 시작 (직종 필터 적용)...');
  console.log(`   국가: ${COUNTRIES.map(c=>c.vsName).join(', ')}`);
  console.log(`   직종: ${CLASSIFICATIONS.join(', ')}`);

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

  const allJobs = [];
  const seen = new Set();

  for (const country of COUNTRIES) {
    let countryTotal = 0;
    for (const cls of CLASSIFICATIONS) {
      const jobs = await scrapeCountryClassification(page, country, cls);
      for (const j of jobs) {
        if (seen.has(j.id)) continue;
        seen.add(j.id);
        allJobs.push({
          id:         j.id,
          title:      j.title.slice(0, 120),
          company:    j.company || 'Unknown',
          location:   j.location || country.vsName.replace(/-/g, ' '),
          country:    country.code,
          visa_type:  j.visa_type,
          url:        j.url,
          posted_at:  j.date_str ? new Date(j.date_str).toISOString() : new Date().toISOString(),
          scraped_at: new Date().toISOString(),
        });
        countryTotal++;
      }
      await new Promise(r => setTimeout(r, 500));
    }
    console.log(`✅ ${country.vsName}: ${countryTotal}개`);
  }

  await browser.close();
  console.log(`\n총 ${allJobs.length}개 수집. Supabase에 저장 중...`);

  if (allJobs.length === 0) {
    console.log('저장할 데이터 없음');
    process.exit(0);
  }

  // 기존 데이터 전체 삭제 후 새로 삽입
  const { error: delErr } = await sb.from('visa_jobs').delete().neq('id', '00000000');
  if (delErr) console.log('삭제 오류:', delErr.message);

  // 100개씩 upsert
  const CHUNK = 100;
  for (let i = 0; i < allJobs.length; i += CHUNK) {
    const chunk = allJobs.slice(i, i + CHUNK);
    const { error } = await sb.from('visa_jobs').upsert(chunk, { onConflict: 'id' });
    if (error) console.log(`upsert 오류:`, error.message);
    else console.log(`  저장 ${i + chunk.length}/${allJobs.length}`);
  }

  console.log('✅ 완료!');
}

main().catch(e => {
  console.error('치명적 오류:', e);
  process.exit(1);
});
