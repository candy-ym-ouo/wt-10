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
        try { resolve(JSON.parse(body)); }
        catch (e) { resolve(body); }
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
  const token = loginRes.token;
  console.log('登录成功');

  console.log('\n=== 获取认证状态 ===');
  const statusRes = await request('GET', '/creator/verification/status', null, token);
  console.log('is_verified:', statusRes.is_verified);
  console.log('has user:', !!statusRes.user);
  if (statusRes.user) {
    console.log('user.username:', statusRes.user.username);
    console.log('user.is_creator_verified:', statusRes.user.is_creator_verified);
    console.log('user.creator_verified_at:', statusRes.user.creator_verified_at);
  }

  console.log('\n=== 测试审核通过后状态同步 ===');
  console.log('先提交一个申请...');
  const submitRes = await request('POST', '/creator/verification', {
    real_name: '测试用户',
    phone: '13800138000',
    email: 'test@test.com',
    experience_years: 3,
    professional_field: 'modular_performance',
    bio: '测试'
  }, token);
  console.log('申请提交成功，ID:', submitRes.verification?.id);

  console.log('\n审核通过...');
  const reviewRes = await request('PUT', '/admin/creator-verifications/' + submitRes.verification.id + '/review', {
    status: 'approved',
    review_note: '测试通过'
  }, token);
  console.log('审核结果:', reviewRes.verification?.status);

  console.log('\n再次获取认证状态（验证是否返回已认证的user）...');
  const statusRes2 = await request('GET', '/creator/verification/status', null, token);
  console.log('is_verified:', statusRes2.is_verified);
  console.log('verified_at:', statusRes2.verified_at);
  if (statusRes2.user) {
    console.log('user.is_creator_verified:', statusRes2.user.is_creator_verified);
    console.log('user.creator_verified_at:', statusRes2.user.creator_verified_at);
  }

  console.log('\n=== 测试 auth/me 接口是否返回认证字段 ===');
  const meRes = await request('GET', '/auth/me', null, token);
  console.log('me.is_creator_verified:', meRes.is_creator_verified);
  console.log('me.creator_verified_at:', meRes.creator_verified_at);

  console.log('\n✅ 所有测试完成！');
}

test().catch(console.error);
