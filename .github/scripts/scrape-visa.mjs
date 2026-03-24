// .github/scripts/scrape-visa.mjs
// GitHub Actions에서 실행 — Ubuntu 환경이라 Puppeteer 정상 작동

import puppeteer from 'puppeteer';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY; // service_role 키 (쓰기 권한)

const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

const COUNTRIES = [
  { vsName: 'Germany',        code: 'DE' },
  { vsName: 'Netherlands',    code: 'NL' },
  { vsName: 'Ireland',        code: 'IE' },
  { vsName: 'United-Kingdom', code: 'GB' },
  { vsName: 'Portugal',       code: 'PT' },
];

async function scrapeCountry(page, countryInfo) {
  const jobs = [];
  const seen = new Set();

  for (let p = 0; p <= 3; p++) {
    try {
      const url = p === 0
        ? `https://visasponsor.jobs/api/jobs?country=${countryInfo.vsName}`
        : `https://visasponsor.jobs/api/jobs?country=${countryInfo.vsName}&page=${p}`;

      console.log(`  fetching ${url}`);
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

      const pageJobs = await page.evaluate(() => {
        const links = document.querySelectorAll('a[href*="/api/jobs/"]');
        const results = [];
        links.forEach(link => {
          const href = link.getAttribute('href') || '';
          const match = href.match(/\/api\/jobs\/([a-f0-9]{32})\/([^/?#]+)/);
          if (!match) return;
          const id = match[1];
          const slug = match[2];
          const container = link.closest('article, li, [class*="job"], [class*="card"]') || link.parentElement?.parentElement;
          const text = container?.innerText || '';

          const visaMatch = text.match(/(Skilled Worker|EU Blue Card|Highly Skilled Migrant|Critical Skills|Tech Visa|Health and Care Worker)/i);
          const dateMatch = text.match(/Publish date\s+(\d{2})-(\d{2})-(\d{4})/);

          // 회사명: 제목 다음 줄
          const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
          const titleIdx = lines.findIndex(l => l.length > 5 && l.length < 120);
          const company = titleIdx >= 0 && lines[titleIdx + 1] ? lines[titleIdx + 1] : '';

          // 위치
          const locMatch = text.match(/([A-Z][a-zA-Z\s]+),\s*([A-Z][a-zA-Z\s]+),\s*(Germany|Netherlands|Ireland|United Kingdom|Portugal)/);
          const location = locMatch ? `${locMatch[1].trim()}, ${locMatch[3]}` : '';

          results.push({
            id, slug,
            title: lines[titleIdx] || decodeURIComponent(slug.replace(/-/g, ' ')),
            company: company.replace(/---/g, '').trim(),
            location,
            visa_type: visaMatch ? visaMatch[1] : 'Sponsored',
            date_str: dateMatch ? `${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}` : null,
            url: `https://visasponsor.jobs${href}`,
          });
        });
        return results;
      });

      if (pageJobs.length === 0) {
        console.log(`  ${countryInfo.vsName} page ${p}: 0개 → 중단`);
        break;
      }

      console.log(`  ${countryInfo.vsName} page ${p}: ${pageJobs.length}개`);

      for (const j of pageJobs) {
        if (seen.has(j.id)) continue;
        seen.add(j.id);
        const title = j.title?.trim() || decodeURIComponent(j.slug.replace(/-/g, ' ')).trim();
        if (!title || title.length < 3) continue;
        jobs.push({
          id:         j.id,
          title:      title.slice(0, 120),
          company:    j.company || 'Unknown',
          location:   j.location || countryInfo.vsName.replace(/-/g, ' '),
          country:    countryInfo.code,
          visa_type:  j.visa_type,
          url:        j.url,
          posted_at:  j.date_str ? new Date(j.date_str).toISOString() : new Date().toISOString(),
          scraped_at: new Date().toISOString(),
        });
      }

      await new Promise(r => setTimeout(r, 1000));
    } catch(e) {
      console.log(`  ${countryInfo.vsName} page ${p} 오류: ${e.message}`);
      break;
    }
  }
  return jobs;
}

async function main() {
  console.log('🚀 visasponsor.jobs 스크래핑 시작...');

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

  const allJobs = [];
  for (const country of COUNTRIES) {
    const jobs = await scrapeCountry(page, country);
    allJobs.push(...jobs);
    console.log(`✅ ${country.vsName}: ${jobs.length}개`);
  }

  await browser.close();
  console.log(`\n총 ${allJobs.length}개 수집. Supabase에 저장 중...`);

  if (allJobs.length === 0) {
    console.log('저장할 데이터 없음');
    process.exit(0);
  }

  // 기존 데이터 삭제 후 새로 삽입 (매일 새로고침)
  const { error: delErr } = await sb.from('visa_jobs').delete().neq('id', '00000000');
  if (delErr) console.log('삭제 오류:', delErr.message);

  // 100개씩 나눠서 upsert
  const CHUNK = 100;
  for (let i = 0; i < allJobs.length; i += CHUNK) {
    const chunk = allJobs.slice(i, i + CHUNK);
    const { error } = await sb.from('visa_jobs').upsert(chunk, { onConflict: 'id' });
    if (error) console.log(`upsert 오류 (${i}~${i+CHUNK}):`, error.message);
    else console.log(`  저장 ${i + chunk.length}/${allJobs.length}`);
  }

  console.log('✅ 완료!');
}

main().catch(e => {
  console.error('치명적 오류:', e);
  process.exit(1);
});
