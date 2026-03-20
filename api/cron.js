// api/cron.js — 매일 자동 실행 (한국시간 오전 9시)
// vercel.json: "schedule": "0 0 * * *"
// 1. 필요한 도구들을 맨 위에 불러옵니다.
const https = require('https'); 
const { createClient } = require('@supabase/supabase-js');

// 2. Vercel 설정 (기존에 있던 것)
export const maxDuration = 60;

// 3. 내 정보들 (여기에 Supabase 주소와 키를 꼭 넣으세요!)
const SUPABASE_URL = 'https://rorckellupiapjrfaqsp.supabase.co';
const SUPABASE_KEY = 'sb_publishable_kAK6n7JyQJUyf72RcIZqIQ_dsAlQ2L3';
const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

export const maxDuration = 60;

const ADZUNA_APP_ID  = '22308f32';
const ADZUNA_APP_KEY = '4902733d7210f0c75a0ad5a8d38a3c17';

const COUNTRIES = ['gb','de','es','nl','fr','at','be','it','pl','ch'];
const MAJOR_COUNTRIES = ['gb','de','es','nl','fr'];

const CATEGORIES = [
  'it-jobs',
  'pr-advertising-marketing-jobs',
  'hr-jobs',
  'scientific-qa-jobs',
];

const DATA_KEYWORDS = ['data analyst', 'data scientist', 'data engineer'];

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

export default async function handler(req, res) {
  if (process.env.CRON_SECRET &&
      req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  console.log('⏰ Cron 시작:', new Date().toISOString());
  let total = 0;

  // Adzuna 카테고리 수집
  for (const country of COUNTRIES) {
    for (const cat of CATEGORIES) {
      const jobs = await fetchAdzuna(country, cat);
      total += jobs.length;
      console.log(`  ${country} / ${cat}: ${jobs.length}개`);
      await new Promise(r => setTimeout(r, 150));
    }
  }

  // 데이터 직군 키워드 검색
  for (const country of MAJOR_COUNTRIES) {
    for (const kw of DATA_KEYWORDS) {
      const jobs = await fetchAdzunaKeyword(country, kw);
      total += jobs.length;
      console.log(`  ${country} / "${kw}": ${jobs.length}개`);
      await new Promise(r => setTimeout(r, 150));
    }
  }

  // Remotive 수집
  const remotive = await fetchRemotive();
  total += remotive.length;
  console.log(`  Remotive: ${remotive.length}개`);

  console.log(`⏰ Cron 완료: 총 ${total}개`);
  res.status(200).json({
    ok: true,
    message: `Cron 완료: ${total}개 수집`,
    timestamp: new Date().toISOString(),
  }));

  // ★ 중요: Supabase DB에 저장하는 코드 ★
  if (allJobs.length > 0) {
    const { error } = await sb
      .from('jobs_cache') // Supabase에 jobs_cache라는 테이블이 있어야 합니다.
      .upsert(allJobs, { onConflict: 'id' });
    
    if (error) console.error('DB 저장 중 에러:', error.message);
    else console.log('✅ DB에 성공적으로 저장되었습니다.');
  }

  console.log(`⏰ Cron 완료: 총 ${allJobs.length}개 처리됨`);
  res.status(200).json({
    ok: true,
    message: `Cron 완료 및 DB 저장 시도: ${allJobs.length}개`,
    timestamp: new Date().toISOString(),
  });
}
