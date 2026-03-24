// api/visaspot.js — visasponsor.jobs Puppeteer 스크래퍼
// @sparticuz/chromium + puppeteer-core 로 동적 렌더링 페이지 수집

export const maxDuration = 60;

const VISA_SPONSOR_COUNTRIES = [
  { vsName: 'Germany',        code: 'DE', flag: '🇩🇪' },
  { vsName: 'Netherlands',    code: 'NL', flag: '🇳🇱' },
  { vsName: 'Ireland',        code: 'IE', flag: '🇮🇪' },
  { vsName: 'United-Kingdom', code: 'GB', flag: '🇬🇧' },
  { vsName: 'Portugal',       code: 'PT', flag: '🇵🇹' },
];

function companyEmoji(name) {
  const e = ['🏢','💼','🏗️','🔬','⚡','🚀','🌐','🎯','📊','🏨'];
  return e[(name?.charCodeAt(0) || 0) % e.length] || '🏢';
}

function detectLevel(title) {
  const t = (title || '').toLowerCase();
  if (/\bdirector\b|\bvp\b|\bhead of\b/i.test(t)) return 'Director';
  if (/\blead\b|\bprincipal\b|\bstaff\b/i.test(t)) return 'Lead';
  if (/\bsenior\b|\bsr\b/i.test(t)) return 'Senior';
  if (/\bjunior\b|\bjr\b/i.test(t)) return 'Junior';
  if (/\bentry.level\b|\bgraduate\b|\bintern\b/i.test(t)) return 'Entry';
  if (/\bassociate\b/i.test(t)) return 'Associate';
  return '';
}

async function getBrowser() {
  // Vercel 프로덕션 환경
  if (process.env.VERCEL_ENV === 'production' || process.env.AWS_LAMBDA_FUNCTION_NAME) {
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
  // 로컬 개발 환경
  const puppeteer = (await import('puppeteer-core')).default;
  return puppeteer.launch({
    executablePath: process.platform === 'win32'
      ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
      : process.platform === 'darwin'
        ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
        : '/usr/bin/google-chrome',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
}

async function scrapeCountry(page, countryInfo) {
  const jobs = [];
  const seen = new Set();

  try {
    for (let p = 0; p <= 2; p++) {
      const url = p === 0
        ? `https://visasponsor.jobs/api/jobs?country=${countryInfo.vsName}`
        : `https://visasponsor.jobs/api/jobs?country=${countryInfo.vsName}&page=${p}`;

      await page.goto(url, { waitUntil: 'networkidle2', timeout: 20000 });

      // 공고 링크 수집
      const pageJobs = await page.evaluate(() => {
        const links = document.querySelectorAll('a[href*="/api/jobs/"]');
        const results = [];
        links.forEach(link => {
          const href = link.getAttribute('href') || '';
          const match = href.match(/\/api\/jobs\/([a-f0-9]{32})\/([^/?#]+)/);
          if (!match) return;

          const id   = match[1];
          const slug = match[2];

          // 링크 텍스트에서 제목 추출
          const titleEl = link.querySelector('h2, h3, [class*="title"], strong') || link;
          const title = titleEl.textContent?.trim() || decodeURIComponent(slug.replace(/-/g,' '));

          // 부모 컨테이너에서 회사명, 위치, 비자타입 추출
          const container = link.closest('[class*="job"], [class*="card"], article, li') || link.parentElement;
          const text = container?.textContent || '';

          // 날짜 추출
          const dateMatch = text.match(/Publish date\s+(\d{2})-(\d{2})-(\d{4})/);

          // 비자타입 추출
          const visaMatch = text.match(/(Skilled Worker|EU Blue Card|Highly Skilled Migrant|Critical Skills|Tech Visa|Health and Care Worker)/i);

          // 회사명 (--- 사이 텍스트)
          const companyMatch = text.match(/---\s*([\s\S]{2,80}?)\s*---/);
          const company = companyMatch ? companyMatch[1].trim().split('\n')[0].trim() : '';

          results.push({
            id, slug, title: title.trim(),
            company: company || '',
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

        const title = decodeURIComponent(j.title || j.slug.replace(/-/g,' ')).trim();
        if (!title || title.length < 3) continue;

        jobs.push({
          id:           `vs_${j.id}`,
          title:        title.slice(0, 120),
          level:        detectLevel(title),
          company:      j.company || 'Unknown',
          location:     countryInfo.vsName.replace(/-/g,' '),
          country:      countryInfo.code,
          flag:         countryInfo.flag,
          logo:         companyEmoji(j.company),
          description:  `[비자 스폰서 확정 - ${j.visaType}] visasponsor.jobs에서 검증된 공고입니다. 원문에서 상세 내용을 확인하세요.`,
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
    }
  } catch(e) {
    console.log(`  [${countryInfo.vsName}] 오류: ${e.message}`);
  }

  return jobs;
}

// 메모리 캐시 (12시간)
let vsCache = { jobs: [], fetchedAt: null };

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }

  const { refresh } = req.query;
  const cacheAge = vsCache.fetchedAt
    ? (Date.now() - new Date(vsCache.fetchedAt)) / 3600000
    : 999;

  if (vsCache.jobs.length > 0 && cacheAge < 12 && refresh !== '1') {
    return res.status(200).json({
      ok: true, count: vsCache.jobs.length,
      fetchedAt: vsCache.fetchedAt, cached: true, jobs: vsCache.jobs,
    });
  }

  console.log('🛂 visasponsor.jobs 수집 시작 (Puppeteer)...');
  let browser;

  try {
    browser = await getBrowser();
    const page = await browser.newPage();

    // User-Agent 설정
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    const allJobs = [];
    for (const country of VISA_SPONSOR_COUNTRIES) {
      const jobs = await scrapeCountry(page, country);
      allJobs.push(...jobs);
      console.log(`  ${country.vsName}: ${jobs.length}개`);
    }

    vsCache.jobs = allJobs;
    vsCache.fetchedAt = new Date().toISOString();
    console.log(`✅ visasponsor 완료: ${allJobs.length}개`);

    res.status(200).json({
      ok: true, count: allJobs.length,
      fetchedAt: vsCache.fetchedAt, cached: false, jobs: allJobs,
    });

  } catch(e) {
    console.error('Puppeteer 오류:', e.message);
    res.status(500).json({ ok: false, error: e.message, jobs: [] });
  } finally {
    if (browser) await browser.close();
  }
}
