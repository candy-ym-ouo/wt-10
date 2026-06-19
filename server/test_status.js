const http = require('http');

function request(method, path, data, token, callback) {
  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api' + path,
    method: method,
    headers: { 'Content-Type': 'application/json' }
  };
  if (token) options.headers['Authorization'] = 'Bearer ' + token;

  const req = http.request(options, function(res) {
    let body = '';
    res.on('data', function(chunk) { body += chunk; });
    res.on('end', function() {
      try { callback(null, JSON.parse(body)); }
      catch (e) { callback(null, body); }
    });
  });
  req.on('error', callback);
  if (data) req.write(JSON.stringify(data));
  req.end();
}

console.log('=== 测试创作者认证状态同步 ===');

request('POST', '/auth/login', { username: 'admin', password: 'admin123' }, null, function(err, loginRes) {
  if (err) { console.error(err); return; }
  var token = loginRes.token;
  console.log('1. 登录成功');

  request('GET', '/creator/verification/status', null, token, function(err, statusRes) {
    if (err) { console.error(err); return; }
    console.log('2. 获取认证状态:');
    console.log('   - is_verified:', statusRes.is_verified);
    console.log('   - has user field:', 'user' in statusRes);
    if (statusRes.user) {
      console.log('   - user.is_creator_verified:', statusRes.user.is_creator_verified);
      console.log('   - user.creator_verified_at:', statusRes.user.creator_verified_at);
    }
    console.log('\n✅ 测试完成');
  });
});
