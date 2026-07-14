const https = require('https');

function fetchContest(slug) {
  return new Promise((resolve, reject) => {
    https.get(`https://www.hackerrank.com/rest/contests/${slug}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0'
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data: JSON.parse(data || '{}') }));
    }).on('error', reject);
  });
}

async function main() {
  const summer = await fetchContest('acm-summer-challenge-2026');
  console.log('Summer:', summer.status, summer.data?.model?.name);
  
  const summerCh = await fetchContest('acm-summer-challenge-2026/challenges');
  console.log('Summer Problems:', summerCh.status, summerCh.data?.models?.length || 0);

  const mirrorCh = await fetchContest('acm-mirror-challenge-2026/challenges');
  console.log('Mirror Problems:', mirrorCh.status, mirrorCh.data?.models?.length || 0);
}

main().catch(console.error);
