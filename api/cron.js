// api/cron.js
// 매일 자동 실행 (vercel.json에서 스케줄 설정)
// schedule: "0 0 * * *" = 매일 UTC 00:00 (한국시간 오전 9시)

const https = require('https');

const RAPIDAPI_KEY = '804d41afa6mshfacd6e6662b519ap1a1554jsn197924664c5f';

const QUERIES = [
  { q: 'Marketing Manager',  country: 'es', location: 'Spain'         },
  { q: 'Digital Marketing',  country: 'es', location: 'Spain'         },
  { q: 'Data Analyst',       country: 'es', location: 'Spain'         },
  { q: 'HR Manager',         country: 'es', location: 'Spain'         },
  { q: 'Data Scientist',     country: 'gb', location: 'United Kingdom' },
  { q: 'Digital Marketing',  country: 'gb', location: 'United Kingdom' },
  { q: 'Data Engineer',      country: 'de', location: 'Germany'       },
  { q: 'HR Manager',         country: 'nl', location: 'Netherlands'   },
  { q: 'Talent Acquisition', country: 'nl', location: 'Netherlands'   },
  { q: 'Software Engineer',  country: 'nl', location: 'Netherlands'   },
];

function fetchJSearch(query, country, location) {
  return new Promise((resolve, reject) => {
    const params = new URLSearchParams({
      query:       `${query} jobs in ${location}`,
      page:        '1',
      num_pages:   '2',
      country:     country,
      date_posted: 'week',
    });
    const req = https.request({
      hostname: 'jsearch.p.rapidapi.com',
      path:     `/search?${params}`,
      method:   'GET',
      headers:  {
        'x-rapidapi-host': 'jsearch.p.rapidapi.com',
        'x-rapidapi-key':  RAPIDAPI_KEY,
      },
    }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve(JSON.parse(data).data || []); }
        catch(e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.setTimeout(12000, () => { req.destroy(); reject(new Error('timeout')); });
    req.end();
  });
}

module.exports = async function handler(req, res) {
  // Vercel cron 인증 확인
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}` && process.env.CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  console.log('⏰ Cron job 시작:', new Date().toISOString());
  let total = 0;

  for (const q of QUERIES) {
    try {
      const jobs = await fetchJSearch(q.q, q.country, q.location);
      total += jobs.length;
      console.log(`  ✅ ${q.q}/${q.location}: ${jobs.length}개`);
      await new Promise(r => setTimeout(r, 400));
    } catch(e) {
      console.error(`  ❌ ${q.q}: ${e.message}`);
    }
  }

  console.log(`⏰ Cron 완료: 총 ${total}개`);
  res.status(200).json({ ok: true, message: `Cron 완료: ${total}개 수집`, timestamp: new Date().toISOString() });
};
