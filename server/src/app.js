require('dotenv').config();
const Koa = require('koa');
const cors = require('@koa/cors');
const bodyParser = require('koa-bodyparser');

const { authMiddleware } = require('./middleware/auth');
const router = require('./routes');

const app = new Koa();
const PORT = process.env.PORT || 3000;

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  headers: ['Content-Type', 'Authorization']
}));

app.use(bodyParser({
  jsonLimit: '10mb'
}));

app.use(authMiddleware);

app.use(async (ctx, next) => {
  try {
    await next();
    if (ctx.status === 404 && !ctx.body) {
      ctx.body = { error: '接口不存在' };
    }
  } catch (err) {
    console.error(err);
    ctx.status = err.status || 500;
    ctx.body = { error: err.message || '服务器内部错误' };
  }
});

app.use(router.routes());
app.use(router.allowedMethods());

app.listen(PORT, () => {
  console.log(`
  ╔════════════════════════════════════════════════════════╗
  ║                                                        ║
  ║   Patch Vault Server 启动成功!                         ║
  ║   服务地址: http://localhost:${PORT}                       ║
  ║   API 前缀: http://localhost:${PORT}/api                   ║
  ║                                                        ║
  ║   管理员账户: admin / admin123                         ║
  ║                                                        ║
  ╚════════════════════════════════════════════════════════╝
  `);
});
