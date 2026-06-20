const http = require('http');

const BASE_URL = 'localhost';
const PORT = 3000;

const request = (method, path, data = null, token = null) => {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: BASE_URL,
      port: PORT,
      path: '/api' + path,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    if (token) {
      options.headers['Authorization'] = 'Bearer ' + token;
    }

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(parsed);
          } else {
            reject({ status: res.statusCode, ...parsed });
          }
        } catch (e) {
          reject({ status: res.statusCode, error: body });
        }
      });
    });

    req.on('error', (e) => {
      reject(e);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
};

const runTests = async () => {
  console.log('=== 测试知识专栏权限控制 ===\n');

  let adminToken = null;
  let userToken = null;
  let otherUserToken = null;
  let privateArticleId = null;
  let publicPendingArticleId = null;

  try {
    // 1. 登录管理员
    console.log('1. 登录管理员...');
    const adminLoginRes = await request('POST', '/auth/login', {
      username: 'admin',
      password: 'admin123'
    });
    adminToken = adminLoginRes.token;
    console.log('   管理员登录成功！\n');

    // 2. 登录普通用户A
    console.log('2. 登录普通用户A (synthfan)...');
    const userLoginRes = await request('POST', '/auth/login', {
      username: 'synthfan',
      password: '123456'
    });
    userToken = userLoginRes.token;
    console.log('   用户A登录成功！\n');

    // 3. 创建私密文章 (用户A)
    console.log('3. 用户A创建私密文章...');
    const privateArticle = await request('POST', '/articles', {
      title: '私密文章：我的个人笔记',
      summary: '这是一篇私密文章',
      content: '这篇文章的内容只有我自己能看到',
      is_public: false,
      tags: ['私密', '笔记']
    }, userToken);
    privateArticleId = privateArticle.id;
    console.log(`   私密文章创建成功，ID: ${privateArticleId}\n`);

    // 4. 创建公开待审核文章 (用户A)
    console.log('4. 用户A创建公开待审核文章...');
    const pendingArticle = await request('POST', '/articles', {
      title: '待审核：新手指南',
      summary: '这是一篇待审核的文章',
      content: '这篇文章等待审核通过后才能被其他人看到',
      is_public: true,
      tags: ['教程', '新手']
    }, userToken);
    publicPendingArticleId = pendingArticle.id;
    console.log(`   待审核文章创建成功，ID: ${publicPendingArticleId}\n`);

    // 5. 测试：用户A查看自己的私密文章 - 应该成功
    console.log('5. 用户A查看自己的私密文章...');
    try {
      const detail = await request('GET', `/articles/${privateArticleId}`, null, userToken);
      console.log(`   成功！用户A可以查看自己的私密文章: "${detail.title}"\n`);
    } catch (err) {
      console.log(`   失败！用户A无法查看自己的私密文章: ${err.error}\n`);
    }

    // 6. 测试：未登录用户查看私密文章 - 应该失败
    console.log('6. 未登录用户查看私密文章...');
    try {
      await request('GET', `/articles/${privateArticleId}`);
      console.log('   失败！未登录用户居然能查看私密文章！\n');
    } catch (err) {
      console.log(`   成功！未登录用户被拒绝访问 (${err.error})\n`);
    }

    // 7. 测试：管理员查看私密文章 - 应该成功
    console.log('7. 管理员查看私密文章...');
    try {
      const detail = await request('GET', `/articles/${privateArticleId}`, null, adminToken);
      console.log(`   成功！管理员可以查看私密文章: "${detail.title}"\n`);
    } catch (err) {
      console.log(`   失败！管理员无法查看私密文章: ${err.error}\n`);
    }

    // 8. 测试：未登录用户查看待审核文章 - 应该失败
    console.log('8. 未登录用户查看待审核文章...');
    try {
      await request('GET', `/articles/${publicPendingArticleId}`);
      console.log('   失败！未登录用户居然能查看待审核文章！\n');
    } catch (err) {
      console.log(`   成功！未登录用户被拒绝访问 (${err.error})\n`);
    }

    // 9. 测试：用户A查看自己的待审核文章 - 应该成功
    console.log('9. 用户A查看自己的待审核文章...');
    try {
      const detail = await request('GET', `/articles/${publicPendingArticleId}`, null, userToken);
      console.log(`   成功！用户A可以查看自己的待审核文章: "${detail.title}"\n`);
    } catch (err) {
      console.log(`   失败！用户A无法查看自己的待审核文章: ${err.error}\n`);
    }

    // 10. 测试：未登录用户尝试点赞私密文章 - 应该失败
    console.log('10. 未登录用户尝试点赞私密文章...');
    try {
      await request('POST', `/articles/${privateArticleId}/like`);
      console.log('   失败！未登录用户居然能点赞私密文章！\n');
    } catch (err) {
      console.log(`   成功！未登录用户被拒绝 (${err.error})\n`);
    }

    // 11. 审核通过公开文章
    console.log('11. 管理员审核通过公开文章...');
    await request('PUT', `/admin/articles/${publicPendingArticleId}/review`, {
      status: 'approved'
    }, adminToken);
    console.log('   审核通过！\n');

    // 12. 测试：未登录用户查看审核通过的公开文章 - 应该成功
    console.log('12. 未登录用户查看审核通过的公开文章...');
    try {
      const detail = await request('GET', `/articles/${publicPendingArticleId}`);
      console.log(`   成功！未登录用户可以查看公开文章: "${detail.title}"\n`);
    } catch (err) {
      console.log(`   失败！未登录用户无法查看公开文章: ${err.error}\n`);
    }

    // 13. 测试：用户A在前台列表查看自己的全部文章（包含私密）
    console.log('13. 用户A查看自己的文章列表（包含私密和待审核）...');
    try {
      const userId = userLoginRes.user.id;
      const myArticles = await request('GET', `/articles?user_id=${userId}`, null, userToken);
      console.log(`   成功！用户A能看到 ${myArticles.list.length} 篇文章`);
      const titles = myArticles.list.map(a => a.title).join(', ');
      console.log(`   文章列表: ${titles}\n`);
    } catch (err) {
      console.log(`   失败: ${err.error}\n`);
    }

    // 14. 测试：未登录用户查看用户A的文章列表 - 只能看到公开审核通过的
    console.log('14. 未登录用户查看用户A的文章列表...');
    try {
      const userId = userLoginRes.user.id;
      const articles = await request('GET', `/articles?user_id=${userId}`);
      console.log(`   成功！未登录用户只能看到 ${articles.list.length} 篇公开审核通过的文章`);
      const titles = articles.list.map(a => a.title).join(', ');
      console.log(`   文章列表: ${titles}\n`);
    } catch (err) {
      console.log(`   失败: ${err.error}\n`);
    }

    console.log('=== 测试完成 ===');
  } catch (err) {
    console.error('测试失败:', err);
    process.exit(1);
  }
};

runTests();
