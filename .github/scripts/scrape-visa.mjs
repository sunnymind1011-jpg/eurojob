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

    // 👇 여기서부터 (기존 코드 시작 부분)
    const pageJobs = await page.evaluate(() => {
      const results = [];
      const jobLinks = [...document.querySelectorAll('a[href*="/api/jobs/"]')];

      jobLinks.forEach(link => {
        const fullText = link.innerText;
        let lines = fullText.split('\n')
          .map(l => l.trim())
          .filter(l => l.length > 0 && !l.includes('View all jobs') && !l.includes('Publish date'));

        const idMatch = link.href.match(/\/jobs\/([a-f0-9]{32})/);
        if (!idMatch) return;

        const title = lines[0] || 'Unknown Title';
        let company = lines[1] || 'Unknown Company';
        let location = lines[2] || '';

        if (company.includes(',') && !location) {
          location = company;
          company = 'Unknown Company';
        }

        const dateMatch = fullText.match(/Publish date\s+(\d{2})-(\d{2})-(\d{4})/);

        results.push({
          id: idMatch[1],
          title: title,
          company: company,
          location: location,
          url: link.href,
          visa_type: fullText.includes('Skilled Worker') ? 'Skilled Worker' : 
                     fullText.includes('EU Blue Card') ? 'EU Blue Card' : 'Visa Sponsored',
          date_str: dateMatch ? `${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}` : null,
        });
      });
      return results;
    });
    //

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
        const cleanTitle = j.title.split('\n')[0].trim();
        const cleanCompany = (j.company || 'Unknown').split('\n')[0].trim();
        const cleanLocation = (j.location || country.vsName.replace(/-/g, ' ')).split('\n')[0].trim();

        allJobs.push({
          id:         j.id,
          title:      j.title.split('\n')[0].trim(),
          company:    j.company.replace('View all jobs and profile', '').trim(),
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
