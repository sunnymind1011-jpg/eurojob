// api/jobs.js
// Vercel 서버리스 함수 — JSearch API 호출 (CORS 없음)
// 브라우저 → Vercel 서버 → JSearch API

const https = require('https');

const RAPIDAPI_KEY = '804d41afa6mshfacd6e6662b519ap1a1554jsn197924664c5f';

const QUERIES = [
  { q: 'Marketing Manager',  country: 'es', location: 'Spain'          },
  { q: 'Digital Marketing',  country: 'es', location: 'Spain'          },
  { q: 'Data Analyst',       country: 'es', location: 'Spain'          },
  { q: 'HR Manager',         country: 'es', location: 'Spain'          },
  { q: 'Data Scientist',     country: 'gb', location: 'United Kingdom'  },
  { q: 'Digital Marketing',  country: 'gb', location: 'United Kingdom'  },
  { q: 'Data Analyst',       country: 'gb', location: 'United Kingdom'  },
  { q: 'Data Engineer',      country: 'de', location: 'Germany'        },
  { q: 'Marketing Manager',  country: 'de', location: 'Germany'        },
  { q: 'HR Manager',         country: 'nl', location: 'Netherlands'    },
  { q: 'Talent Acquisition', country: 'nl', location: 'Netherlands'    },
  { q: 'Data Engineer',      country: 'nl', location: 'Netherlands'    },
  { q: 'Software Engineer',  country: 'es', location: 'Spain'          },
  { q: 'Software Engineer',  country: 'nl', location: 'Netherlands'    },
];

function fetchJSearch(query, country, location) {
  return new Promise((resolve, reject) => {
    const fullQuery = `${query} jobs in ${location}`;
    const params = new URLSearchParams({
      query:       fullQuery,
      page:        '1',
      num_pages:   '2',
      country:     country,
      date_posted: 'week',
    });

    const options = {
      hostname: 'jsearch.p.rapidapi.com',
      path:     `/search?${params}`,
      method:   'GET',
      headers:  {
        'x-rapidapi-host': 'jsearch.p.rapidapi.com',
        'x-rapidapi-key':  RAPIDAPI_KEY,
      },
    };

    const req = https.request(options, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve(parsed.data || []);
        } catch(e) {
          reject(new Error('JSON parse error'));
        }
      });
    });
    req.on('error', reject);
    req.setTimeout(12000, () => { req.destroy(); reject(new Error('timeout')); });
    req.end();
  });
}

function removeDups(jobs) {
  const seen = new Set();
  return jobs.filter(j => {
    const key = `${j.job_title}__${j.employer_name}`.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// 메모리 캐시 (Vercel 서버리스는 인스턴스가 재사용될 때 유지됨)
let cache = { jobs: [], fetchedAt: null };

async function collectJobs() {
  let allJobs = [];
  for (const q of QUERIES) {
    try {
      const jobs = await fetchJSearch(q.q, q.country, q.location);
      allJobs.push(...jobs);
      await new Promise(r => setTimeout(r, 300));
    } catch(e) {
      console.error(`Failed: ${q.q} — ${e.message}`);
    }
  }
  cache.jobs = removeDups(allJobs);
  cache.fetchedAt = new Date().toISOString();
  console.log(`✅ Collected ${cache.jobs.length} jobs`);
  return cache.jobs;
}

module.exports = async function handler(req, res) {
  // CORS 허용
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }

  const { refresh } = req.query;

  // 캐시가 없거나 24시간 지났거나 강제 새로고침이면 수집
  const cacheAge = cache.fetchedAt
    ? (Date.now() - new Date(cache.fetchedAt)) / 1000 / 60 / 60
    : 999;

  if (!cache.jobs.length || cacheAge > 23 || refresh === '1') {
    console.log('🔄 Fetching fresh jobs...');
    await collectJobs();
  } else {
    console.log(`📦 Serving cached jobs (${Math.round(cacheAge * 60)}min old)`);
  }

  res.status(200).json({
    ok: true,
    count: cache.jobs.length,
    fetchedAt: cache.fetchedAt,
    jobs: cache.jobs,
  });
};
