// api/jobs.js — Vercel 서버리스 함수

export const maxDuration = 60;

const RAPIDAPI_KEY = '804d41afa6mshfacd6e6662b519ap1a1554jsn197924664c5f';

const QUERIES = [
  { q: 'Marketing Manager jobs in Spain',        country: 'es' },
  { q: 'Digital Marketing jobs in Spain',        country: 'es' },
  { q: 'Data Analyst jobs in Spain',             country: 'es' },
  { q: 'Data Scientist jobs in United Kingdom',  country: 'gb' },
  { q: 'Data Engineer jobs in Germany',          country: 'de' },
  { q: 'HR Manager jobs in Netherlands',         country: 'nl' },
  { q: 'Talent Acquisition jobs in Netherlands', country: 'nl' },
  { q: 'Software Engineer jobs in Spain',        country: 'es' },
];

function fetchJSearch(query, country) {
  return new Promise((resolve) => {
    const https = require('https');
    const params = new URLSearchParams({
      query,
      page: '1',
      num_pages: '1',
      country,
      date_posted: 'week',
    });

    const req = https.request({
      hostname: 'jsearch.p.rapidapi.com',
      path: `/search?${params}`,
      method: 'GET',
      headers: {
        'x-rapidapi-host': 'jsearch.p.rapidapi.com',
        'x-rapidapi-key': RAPIDAPI_KEY,
      },
    }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve(JSON.parse(data).data || []); }
        catch(e) { resolve([]); }
      });
    });

    req.on('error', () => resolve([]));
    req.setTimeout(8000, () => { req.destroy(); resolve([]); });
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

let cache = { jobs: [], fetchedAt: null };

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

  let allJobs = [];
  for (const q of QUERIES) {
    const jobs = await fetchJSearch(q.q, q.country);
    console.log(`${q.q}: ${jobs.length}개`);
    allJobs.push(...jobs);
    await new Promise(r => setTimeout(r, 200));
  }

  cache.jobs = removeDups(allJobs);
  cache.fetchedAt = new Date().toISOString();

  res.status(200).json({
    ok: true, count: cache.jobs.length,
    fetchedAt: cache.fetchedAt, cached: false, jobs: cache.jobs,
  });
}
