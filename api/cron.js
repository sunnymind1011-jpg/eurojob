// api/cron.js — 매일 자동 실행 (한국시간 오전 9시)
// vercel.json: "schedule": "0 0 * * *"

export const maxDuration = 60;

const ADZUNA_APP_ID  = '22308f32';
const ADZUNA_APP_KEY = '4902733d7210f0c75a0ad5a8d38a3c17';

const COUNTRIES = [
  'gb','de','es','nl','fr','at','be','it','pl','ch'
];

const CATEGORIES = [
  'it-jobs',
  'sales-jobs',
  'scientific-qa-jobs',
  'hr-jobs',
];

function fetchAdzuna(countryCode, categoryTag) {
  return new Promise((resolve) => {
    const https = require('https');
    const params = new URLSearchParams({
      app_id:           ADZUNA_APP_ID,
      app_key:          ADZUNA_APP_KEY,
      results_per_page: '20',
      max_days_old:     '30',
      content_type:     'application/json',
    });

    const req = https.request({
      hostname: 'api.adzuna.com',
      path:     `/api/v1/jobs/${countryCode}/search/1?${params}&category=${categoryTag}`,
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

export default async function handler(req, res) {
  // Vercel cron 인증
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
      console.log(`  ${country} / ${cat}: ${jobs.length}개`);
      await new Promise(r => setTimeout(r, 150));
    }
  }

  console.log(`⏰ Cron 완료: 총 ${total}개`);
  res.status(200).json({
    ok: true,
    message: `Cron 완료: ${total}개 수집`,
    timestamp: new Date().toISOString(),
  });
}
