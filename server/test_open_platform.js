const axios = require('axios');

const baseURL = 'http://localhost:3000/api';
let authToken = '';
let apiKey = '';
let apiSecret = '';
let accessToken = '';

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function test() {
  console.log('\n=== 🚀 API 开放平台功能测试 ===\n');

  // 1. 登录
  console.log('1️⃣  用户登录...');
  try {
    const res = await axios.post(`${baseURL}/auth/login`, { username: 'admin', password: 'admin123' });
    authToken = res.data.token;
    console.log('    ✅ 登录成功:', res.data.user.username);
  } catch (e) {
    console.log('    ❌ 登录失败:', e.message);
    return;
  }

  const auth = { headers: { Authorization: `Bearer ${authToken}` } };

  // 2. 获取权限范围列表
  console.log('\n2️⃣  获取权限范围列表...');
  try {
    const res = await axios.get(`${baseURL}/open-platform/scopes`);
    console.log(`    ✅ 共 ${res.data.scopes.length} 个权限范围，${Object.keys(res.data.categories).length} 个分类`);
  } catch (e) {
    console.log('    ❌ 获取失败:', e.response?.data?.error || e.message);
  }

  // 3. 创建 API 密钥
  console.log('\n3️⃣  创建 API 密钥...');
  try {
    const res = await axios.post(`${baseURL}/me/api-keys`, {
      name: '功能测试密钥',
      scopes: ['modules:read', 'patches:read', 'articles:read'],
      rate_limit_per_min: 100,
      rate_limit_per_hour: 1000,
      rate_limit_per_day: 10000
    }, auth);
    apiKey = res.data.api_key;
    apiSecret = res.data.api_secret_plain;
    console.log('    ✅ 创建成功:');
    console.log(`       API Key: ${apiKey}`);
    console.log(`       API Secret: ${apiSecret}`);
    console.log(`       权限范围: ${res.data.scopes.join(', ')}`);
  } catch (e) {
    console.log('    ❌ 创建失败:', e.response?.data?.error || e.message);
    return;
  }

  await sleep(500);

  // 4. 使用 X-API-Key 访问
  console.log('\n4️⃣  使用 X-API-Key 直接访问 /modules...');
  try {
    const res = await axios.get(`${baseURL}/modules`, { headers: { 'X-API-Key': apiKey } });
    console.log(`    ✅ 访问成功，返回 ${res.data.length || (res.data.modules?.length || 0)} 条模块数据`);
  } catch (e) {
    console.log('    ❌ 访问失败:', e.response?.data?.error || e.message);
  }

  // 5. 使用错误的 API Key
  console.log('\n5️⃣  使用错误的 API Key 访问...');
  try {
    await axios.get(`${baseURL}/modules`, { headers: { 'X-API-Key': 'pk_wrong_key_123456' } });
    console.log('    ❌ 应该返回错误但没有');
  } catch (e) {
    const code = e.response?.data?.code;
    console.log(`    ✅ 正确拦截 [${code}]:`, e.response?.data?.error);
  }

  // 6. 生成访问令牌
  console.log('\n6️⃣  使用 API Key + Secret 生成访问令牌...');
  try {
    const res = await axios.post(`${baseURL}/open-platform/token`, {
      api_key: apiKey,
      api_secret: apiSecret,
      scopes: ['modules:read'],
      expires_in: 3600
    }, auth);
    accessToken = res.data.access_token;
    console.log('    ✅ 令牌生成成功:');
    console.log(`       类型: ${res.data.token_type}`);
    console.log(`       有效期: ${res.data.expires_in} 秒`);
    console.log(`       权限: ${res.data.scopes.join(', ')}`);
    console.log(`       令牌前20位: ${accessToken.substring(0, 20)}...`);
  } catch (e) {
    console.log('    ❌ 生成失败:', e.response?.data?.error || e.message);
  }

  await sleep(500);

  // 7. 使用 Bearer Token 访问
  console.log('\n7️⃣  使用 Bearer Token 访问 /patches...');
  try {
    const res = await axios.get(`${baseURL}/patches`, { headers: { Authorization: `Bearer ${accessToken}` } });
    console.log(`    ✅ 访问成功，返回 ${res.data.length || (res.data.patches?.length || 0)} 条 Patch 数据`);
  } catch (e) {
    console.log('    ❌ 访问失败:', e.response?.data?.error || e.message);
  }

  // 8. 测试权限范围校验 - 没有 patches:write 权限
  console.log('\n8️⃣  权限校验测试 - 无 articles:write 权限创建文章...');
  try {
    await axios.post(`${baseURL}/articles`, 
      { title: '测试', content: '测试内容' }, 
      { headers: { 'X-API-Key': apiKey } }
    );
    console.log('    ❌ 应该返回权限不足但没有');
  } catch (e) {
    const code = e.response?.data?.code;
    if (code === 'INSUFFICIENT_SCOPE') {
      console.log(`    ✅ 正确拦截权限不足 [${code}]`);
      console.log(`       需要权限: ${e.response.data.required_scope}`);
    } else {
      console.log(`    ⚠️  其他错误 [${e.response.status}]:`, e.response?.data?.error);
    }
  }

  // 9. 管理员查看密钥列表
  console.log('\n9️⃣  管理员获取所有 API 密钥...');
  try {
    const res = await axios.get(`${baseURL}/admin/api-keys?page_size=5`, auth);
    console.log(`    ✅ 获取成功，共 ${res.data.pagination.total} 个密钥`);
    res.data.keys.forEach(k => {
      console.log(`       - [${k.id}] ${k.name} (${k.username}) 状态: ${k.status}`);
    });
  } catch (e) {
    console.log('    ❌ 获取失败:', e.response?.data?.error || e.message);
  }

  // 10. 管理员封禁密钥
  console.log('\n🔟  管理员封禁密钥...');
  const keyId = 2; // 刚才创建的
  try {
    const res = await axios.post(`${baseURL}/admin/api-keys/${keyId}/ban`, 
      { reason: '测试封禁功能 - 违规使用' }, 
      auth
    );
    console.log(`    ✅ 封禁成功: 状态=${res.data.status}, 原因=${res.data.banned_reason}`);
  } catch (e) {
    console.log('    ❌ 封禁失败:', e.response?.data?.error || e.message);
  }

  await sleep(500);

  // 11. 使用被封禁的密钥访问
  console.log('\n1️⃣1️⃣  使用被封禁的密钥访问...');
  try {
    await axios.get(`${baseURL}/modules`, { headers: { 'X-API-Key': apiKey } });
    console.log('    ❌ 应该返回封禁错误但没有');
  } catch (e) {
    const code = e.response?.data?.code;
    console.log(`    ✅ 正确拦截封禁 [${code}]:`, e.response?.data?.error);
    if (e.response?.data?.banned_reason) {
      console.log(`       封禁原因: ${e.response.data.banned_reason}`);
    }
  }

  // 12. 管理员解封密钥
  console.log('\n1️⃣2️⃣  管理员解封密钥...');
  try {
    const res = await axios.post(`${baseURL}/admin/api-keys/${keyId}/unban`, {}, auth);
    console.log(`    ✅ 解封成功: 状态=${res.data.status}`);
  } catch (e) {
    console.log('    ❌ 解封失败:', e.response?.data?.error || e.message);
  }

  // 13. 管理员调整限流
  console.log('\n1️⃣3️⃣  管理员调整限流配置...');
  try {
    const res = await axios.put(`${baseURL}/admin/api-keys/${keyId}/rate-limit`, {
      rate_limit_per_min: 500,
      rate_limit_per_hour: 5000,
      rate_limit_per_day: 50000
    }, auth);
    console.log(`    ✅ 调整成功: ${res.data.rate_limit_per_min}/分, ${res.data.rate_limit_per_hour}/时, ${res.data.rate_limit_per_day}/天`);
  } catch (e) {
    console.log('    ❌ 调整失败:', e.response?.data?.error || e.message);
  }

  await sleep(500);

  // 14. 查看调用记录
  console.log('\n1️⃣4️⃣  查看调用记录...');
  try {
    const res = await axios.get(`${baseURL}/me/api-call-logs?page=1&page_size=10`, auth);
    const logs = res.data.logs;
    console.log(`    ✅ 调用记录: 共 ${res.data.pagination.total} 条，显示最新 5 条:`);
    logs.slice(0, 5).forEach(l => {
      const statusIcon = l.status_code >= 200 && l.status_code < 300 ? '✅' : (l.status_code >= 400 ? '❌' : '⚠️');
      console.log(`       ${statusIcon} ${l.method} ${l.endpoint} -> ${l.status_code} (${l.response_time_ms}ms)`);
    });
  } catch (e) {
    console.log('    ❌ 获取失败:', e.response?.data?.error || e.message);
  }

  // 15. 获取调用统计
  console.log('\n1️⃣5️⃣  获取调用统计...');
  try {
    const res = await axios.get(`${baseURL}/me/api-call-stats?days=7`, auth);
    const s = res.data.summary;
    console.log(`    ✅ 近 7 天统计:`);
    console.log(`       总调用: ${s.count}`);
    console.log(`       成功: ${s.success_count}`);
    console.log(`       错误: ${s.error_count}`);
    console.log(`       成功率: ${s.count ? ((s.success_count / s.count) * 100).toFixed(1) : 0}%`);
    console.log(`       平均响应时间: ${s.avg_response_time?.toFixed(0) || 0}ms`);
  } catch (e) {
    console.log('    ❌ 获取失败:', e.response?.data?.error || e.message);
  }

  // 16. 管理员平台总览
  console.log('\n1️⃣6️⃣  管理员开放平台总览...');
  try {
    const res = await axios.get(`${baseURL}/admin/open-platform/stats?days=30`, auth);
    const o = res.data.overview;
    console.log(`    ✅ 平台总览:`);
    console.log(`       总密钥数: ${o.total_keys}`);
    console.log(`       活跃密钥: ${o.active_keys}`);
    console.log(`       已封禁: ${o.banned_keys}`);
    console.log(`       近 30 日调用: ${o.count || 0} 次`);
  } catch (e) {
    console.log('    ❌ 获取失败:', e.response?.data?.error || e.message);
  }

  console.log('\n=== 🎉 所有测试完成 ===\n');
}

test().catch(e => console.error('测试异常:', e));
