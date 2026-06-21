const http = require('http');

const baseURL = 'http://localhost:3000/api';

function makeRequest(method, path, token = null, data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, baseURL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };
    
    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function runTests() {
  console.log('=== 测试隐私设置功能 ===\n');

  // 1. 登录
  console.log('1. 登录获取 token...');
  const loginRes = await makeRequest('POST', '/auth/login', null, {
    username: 'admin',
    password: 'admin123'
  });
  console.log('   登录响应状态:', loginRes.status);
  console.log('   登录响应数据:', JSON.stringify(loginRes.data, null, 2));
  const token = loginRes.data.token;
  console.log('   登录成功!');
  if (loginRes.data.user) {
    console.log('   用户隐私设置:', {
      privacy_email: loginRes.data.user.privacy_email,
      privacy_favorites: loginRes.data.user.privacy_favorites,
      privacy_patches: loginRes.data.user.privacy_patches
    });
  }

  // 2. 获取隐私设置
  console.log('\n2. 获取隐私设置...');
  const getPrivacyRes = await makeRequest('GET', '/me/privacy-settings', token);
  console.log('   状态码:', getPrivacyRes.status);
  console.log('   结果:', getPrivacyRes.data);

  // 3. 更新隐私设置
  console.log('\n3. 更新隐私设置...');
  const updatePrivacyRes = await makeRequest('PUT', '/me/privacy-settings', token, {
    privacy_email: 'private',
    privacy_favorites: 'followers',
    privacy_patches: 'public'
  });
  console.log('   状态码:', updatePrivacyRes.status);
  console.log('   结果:', updatePrivacyRes.data);

  // 4. 再次获取验证
  console.log('\n4. 验证更新结果...');
  const getPrivacyRes2 = await makeRequest('GET', '/me/privacy-settings', token);
  console.log('   状态码:', getPrivacyRes2.status);
  console.log('   结果:', getPrivacyRes2.data);

  // 5. 获取用户资料（作为自己查看
  console.log('\n5. 获取自己的用户资料...');
  const profileRes = await makeRequest('GET', '/users/1', token);
  console.log('   状态码:', profileRes.status);
  console.log('   邮箱可见:', profileRes.data.email !== undefined);
  console.log('   privacy_settings:', profileRes.data.privacy_settings);
  console.log('   total_patches:', profileRes.data.total_patches);
  console.log('   total_favorites:', profileRes.data.total_favorites);

  // 6. 注册一个新用户来测试从其他用户查看
  console.log('\n6. 注册测试用户...');
  const registerRes = await makeRequest('POST', '/auth/register', null, {
    username: 'testuser_privacy',
    email: 'test_privacy@example.com',
    password: 'test123456'
  });
  console.log('   状态码:', registerRes.status);
  const testToken = registerRes.data?.token;
  
  if (testToken) {
    console.log('   注册成功! 用户ID:', registerRes.data.user.id);
    
    // 7. 测试用admin的资料
    console.log('\n7. 测试用户查看 admin 的资料（未关注状态)...');
    const adminProfileByTest = await makeRequest('GET', '/users/1', testToken);
    console.log('   状态码:', adminProfileByTest.status);
    console.log('   邮箱可见:', adminProfileByTest.data.email !== undefined);
    console.log('   privacy_settings:', adminProfileByTest.data.privacy_settings);
    console.log('   total_patches:', adminProfileByTest.data.total_patches);
    console.log('   total_favorites:', adminProfileByTest.data.total_favorites);
    console.log('   patches 数量:', adminProfileByTest.data.patches?.length || 0);

    // 8. 测试获取 admin 的 patch 列表
    console.log('\n8. 测试用户查看 admin 的 Patch 列表...');
    const patchesByTest = await makeRequest('GET', '/patches?user_id=1', testToken);
    console.log('   状态码:', patchesByTest.status);
    console.log('   Patch 数量:', patchesByTest.data?.total || 0);

    // 9. 将 admin 的隐私设置改回 public，测试关注后能否看到
    console.log('\n9. 将 admin 隐私设置设为 followers，关注后测试...');
    await makeRequest('PUT', '/me/privacy-settings', token, {
      privacy_email: 'followers',
      privacy_favorites: 'followers',
      privacy_patches: 'followers'
    });
    
    // 关注 admin
    console.log('   测试用户关注 admin...');
    const followRes = await makeRequest('POST', '/users/1/follow', testToken);
    console.log('   关注结果:', followRes.data);
    
    console.log('\n10. 关注后查看 admin 资料...');
    const adminProfileAfterFollow = await makeRequest('GET', '/users/1', testToken);
    console.log('   状态码:', adminProfileAfterFollow.status);
    console.log('   邮箱可见:', adminProfileAfterFollow.data.email !== undefined);
    console.log('   privacy_settings:', adminProfileAfterFollow.data.privacy_settings);
    console.log('   total_patches:', adminProfileAfterFollow.data.total_patches);
    console.log('   total_favorites:', adminProfileAfterFollow.data.total_favorites);
    console.log('   patches 数量:', adminProfileAfterFollow.data.patches?.length || 0);

    // 11. 改回 public
    console.log('\n11. 将 admin 隐私设置改回 public...');
    await makeRequest('PUT', '/me/privacy-settings', token, {
      privacy_email: 'public',
      privacy_favorites: 'public',
      privacy_patches: 'public'
    });
    console.log('   已恢复默认设置');
  } else {
    console.log('   注册失败（可能用户已存在）');
  }

  console.log('\n=== 测试完成 ===');
}

runTests().catch(console.error);
