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
      console.log('Status code:', res.statusCode);
      console.log('Body length:', body.length);
      console.log('Body:', body.substring(0, 500));
      try { callback(null, res.statusCode, JSON.parse(body)); }
      catch (e) { callback(null, res.statusCode, body); }
    });
  });
  req.on('error', callback);
  if (data) req.write(JSON.stringify(data));
  req.end();
}

console.log('=== 基础接口测试 ===');
request('GET', '/', null, null, function(err, status, data) {
  if (err) { console.error('Request error:', err); return; }
  console.log('Root API works:', data.message);

  console.log('\n=== 登录测试 ===');
  request('POST', '/auth/login', { username: 'admin', password: 'admin123' }, null, function(err, status, loginRes) {
    if (err) { console.error(err); return; }
    console.log('Login ok, user:', loginRes.user?.username);
    var token = loginRes.token;

    console.log('\n=== 认证状态测试 ===');
    request('GET', '/creator/verification/status', null, token, function(err, status, data) {
      if (err) { console.error(err); return; }
      console.log('Response:', typeof data);
      if (typeof data === 'object') {
        console.log('Keys:', Object.keys(data));
      }
    });
  });
});
