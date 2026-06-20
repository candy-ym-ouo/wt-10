const http = require('http');

function httpRequest(method, url, headers = {}, body = null) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname + urlObj.search,
      method,
      headers
    };
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, data }); }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function main() {
  const base = 'http://localhost:3000';

  console.log('1. 登录 admin...');
  const loginRes = await httpRequest('POST', `${base}/api/auth/login`, {
    'Content-Type': 'application/json'
  }, { username: 'admin', password: 'admin123' });
  console.log('   登录状态:', loginRes.status);
  const token = loginRes.data.token;

  console.log('\n2. 更新用户 2 的角色为 auditor (PUT /admin/users/:id)...');
  const updateRes = await httpRequest('PUT', `${base}/api/admin/users/7`, {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  }, { role: 'auditor' });
  console.log('   更新状态:', updateRes.status);
  console.log('   响应:', JSON.stringify(updateRes.data).substring(0, 200));

  console.log('\n3. 查询审计日志...');
}

main().catch(console.error);
