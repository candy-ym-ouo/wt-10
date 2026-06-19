const http = require('http');

function request(method, path, data = null, token = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api' + path,
      method: method,
      headers: { 'Content-Type': 'application/json' }
    };
    if (token) options.headers['Authorization'] = 'Bearer ' + token;

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(body) }); }
        catch (e) { resolve({ status: res.statusCode, data: body }); }
      });
    });
    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function test() {
  console.log('=== 登录 ===');
  const loginRes = await request('POST', '/auth/login', { username: 'admin', password: 'admin123' });
  console.log('status:', loginRes.status);
  const token = loginRes.data.token;
  console.log('登录成功，token:', token?.substring(0, 20) + '...');

  console.log('\n=== 获取认证状态 ===');
  const statusRes = await request('GET', '/creator/verification/status', null, token);
  console.log('status:', statusRes.status);
  console.log('data:', JSON.stringify(statusRes.data, null, 2));

  console.log('\n=== 检查 creator_verifications 表是否存在数据 ===');
  const db = require('./src/db');
  const count = db.prepare('SELECT COUNT(*) as c FROM creator_verifications').get();
  console.log('认证申请总数:', count.c);

  const pending = db.prepare('SELECT * FROM creator_verifications WHERE status = ?').all('pending');
  console.log('待审核申请数:', pending.length);
  if (pending.length > 0) {
    console.log('第一条待审核ID:', pending[0].id);
  }
}

test().catch(console.error);
