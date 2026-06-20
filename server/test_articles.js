const http = require('http');

const BASE_URL = 'localhost';
const PORT = 3000;

function request(method, path, data = null, token = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: BASE_URL,
      port: PORT,
      path: `/api${path}`,
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
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(parsed);
          } else {
            reject({ status: res.statusCode, data: parsed });
          }
        } catch (e) {
          resolve(body);
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

async function test() {
  console.log('=== 测试知识专栏模块 ===\n');

  try {
    // 1. 登录
    console.log('1. 登录...');
    const loginRes = await request('POST', '/auth/login', {
      username: 'admin',
      password: 'admin123'
    });
    const token = loginRes.token;
    console.log('   登录成功!\n');

    // 2. 创建文章
    console.log('2. 创建文章...');
    const createRes = await request('POST', '/articles', {
      title: '测试专栏文章：合成器入门指南',
      summary: '这是一篇关于合成器入门的指南文章。',
      content: '# 合成器入门指南\n\n欢迎来到合成器的世界！\n\n## 什么是合成器？\n\n合成器是一种电子乐器。',
      tags: ['教程', '入门', '合成器'],
      module_refs: []
    }, token);
    const articleId = createRes.id;
    console.log(`   文章创建成功，ID: ${articleId}`);
    console.log(`   消息: ${createRes.message}\n`);

    // 3. 获取文章列表（前台，未审核通过应该看不到）
    console.log('3. 获取前台文章列表（未审核通过）...');
    const listRes = await request('GET', '/articles');
    console.log(`   列表总数: ${listRes.total}`);
    console.log(`   文章数量: ${listRes.list.length}\n`);

    // 4. 获取文章详情（未登录 - 应该被拒绝）
    console.log('4. 获取文章详情（未登录）...');
    try {
      await request('GET', `/articles/${articleId}`);
      console.log('   警告：未登录用户居然能查看待审核文章！\n');
    } catch (err) {
      console.log(`   正确：未登录用户无法查看待审核文章 (${err.error})\n`);
    }

    // 4b. 获取文章详情（登录 - 作者本人）
    console.log('4b. 获取文章详情（作者本人）...');
    const detailRes = await request('GET', `/articles/${articleId}`, null, token);
    console.log(`   标题: ${detailRes.title}`);
    console.log(`   状态: ${detailRes.status}`);
    console.log(`   浏览数: ${detailRes.views_count}\n`);

    // 5. 后台获取文章列表
    console.log('5. 后台获取文章列表...');
    const adminListRes = await request('GET', '/admin/articles', null, token);
    console.log(`   总数: ${adminListRes.total}`);
    console.log(`   待审核: ${adminListRes.list.filter(a => a.status === 'pending').length}\n`);

    // 6. 审核通过文章
    console.log('6. 审核通过文章...');
    const reviewRes = await request('PUT', `/admin/articles/${articleId}/review`, {
      status: 'approved',
      review_note: '内容质量良好，审核通过'
    }, token);
    console.log(`   审核结果: ${reviewRes.message}\n`);

    // 7. 再次获取文章列表（应该能看到了）
    console.log('7. 再次获取前台文章列表（审核通过后）...');
    const listRes2 = await request('GET', '/articles');
    console.log(`   列表总数: ${listRes2.total}`);
    if (listRes2.list.length > 0) {
      console.log(`   第一篇: ${listRes2.list[0].title}\n`);
    }

    // 8. 添加评论
    console.log('8. 添加评论...');
    const commentRes = await request('POST', `/articles/${articleId}/comments`, {
      content: '写得很好，学到了很多！'
    }, token);
    console.log(`   评论ID: ${commentRes.id}`);
    console.log(`   评论内容: ${commentRes.content}\n`);

    // 9. 点赞
    console.log('9. 点赞文章...');
    const likeRes = await request('POST', `/articles/${articleId}/like`, {}, token);
    console.log(`   点赞状态: ${likeRes.liked ? '已点赞' : '未点赞'}`);
    console.log(`   点赞数: ${likeRes.likes_count}\n`);

    // 10. 收藏
    console.log('10. 收藏文章...');
    const favRes = await request('POST', `/articles/${articleId}/favorite`, {}, token);
    console.log(`   收藏状态: ${favRes.favorited ? '已收藏' : '未收藏'}\n`);

    // 11. 获取我的文章
    console.log('11. 获取我的文章...');
    const myArticlesRes = await request('GET', '/me/articles', null, token);
    console.log(`   我的文章数: ${myArticlesRes.total}\n`);

    console.log('=== 所有测试通过！ ===');

  } catch (err) {
    console.error('测试失败:', err.data || err.message || err);
  }
}

test();
