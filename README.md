# Patch Vault - 模块合成器 Patch 收藏站

一个专为模块合成器玩家打造的 Patch 分享和收藏平台。

## 技术栈

### 前端
- Vue 3 + Composition API
- Pinia 状态管理
- Vue Router 路由
- Element Plus UI 组件库
- Axios HTTP 客户端
- Vite 构建工具

### 后端
- Node.js
- Koa 框架
- SQLite 数据库 (better-sqlite3)
- JWT 身份认证
- bcryptjs 密码加密

## 功能模块

### 1. 用户系统
- 用户注册/登录
- 个人资料管理
- JWT 令牌认证
- 用户主页展示

### 2. 设备库
- 合成器模块浏览
- 厂商管理
- 模块详细信息和参数
- 按类型、厂商筛选

### 3. Patch 发布
- 创建和编辑 Patch
- 模块使用记录
- 参数配置保存
- 标签分类管理

### 4. 参数对比
- Patch 对比功能
- 多 Patch 参数并排对比
- 模块差异分析

### 5. 点赞收藏
- Patch 点赞功能
- 收藏夹管理
- 个人收藏列表

### 6. 后台管理
- 仪表盘统计
- 用户管理（角色分配、用户删除）
- Patch 审核管理
- 模块和厂商管理
- 数据统计概览

## 目录结构

```
wt-10/
├── client/                 # 前端项目
│   ├── src/
│   │   ├── api/            # API 接口定义
│   │   ├── components/     # 公共组件
│   │   ├── router/         # 路由配置
│   │   ├── stores/         # Pinia 状态管理
│   │   ├── styles/         # 全局样式
│   │   ├── views/          # 页面组件
│   │   │   └── admin/      # 后台管理页面
│   │   ├── App.vue
│   │   └── main.js
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
├── server/                 # 后端服务
│   ├── data/               # 数据库文件目录
│   ├── scripts/            # 初始化和种子脚本
│   │   ├── init.js         # 数据库初始化
│   │   └── seed.js         # 种子数据填充
│   ├── src/
│   │   ├── controllers/    # 控制器
│   │   ├── middleware/     # 中间件
│   │   ├── app.js          # 应用入口
│   │   ├── db.js           # 数据库连接
│   │   └── routes.js       # 路由定义
│   ├── .env
│   └── package.json
└── README.md
```

## 快速开始

### 环境要求
- Node.js >= 16.0.0
- npm 或 yarn

### 一键启动

**方式一：使用启动脚本（推荐）**

```bash
# 1. 进入后端目录，安装依赖并初始化数据库
cd server
npm install
npm run init    # 初始化数据库
npm run seed    # 填充示例数据

# 2. 启动后端服务
npm run dev     # 后端服务运行在 http://localhost:3000

# 3. 新开终端，进入前端目录，安装依赖并启动
cd ../client
npm install
npm run dev     # 前端运行在 http://localhost:5173
```

**方式二：分别启动**

```bash
# 终端 1 - 后端
cd server
npm install
npm run init
npm run seed
npm run dev

# 终端 2 - 前端
cd client
npm install
npm run dev
```

### 默认账户

- **管理员账户**: `admin` / `admin123`
- **普通用户**: `synthfan` / `123456`
- **普通用户**: `patchmaster` / `123456`

### 访问地址

- 前端首页: http://localhost:5173
- 后台管理: http://localhost:5173/admin
- API 服务: http://localhost:3000/api

## 数据库初始化

### 重新初始化数据库

如果需要重置数据库：

```bash
cd server
rm -f data/patch_vault.db
npm run init
npm run seed
```

### 初始化脚本说明

- `npm run init`: 创建数据库表结构和默认管理员账户
- `npm run seed`: 填充示例数据（厂商、模块、用户、Patch）

## API 接口文档

### 认证相关
- `POST /api/auth/register` - 用户注册
- `POST /api/auth/login` - 用户登录
- `GET /api/auth/me` - 获取当前用户信息
- `PUT /api/auth/profile` - 更新个人资料

### 用户相关
- `GET /api/users/:id` - 获取用户主页

### Patch 相关
- `GET /api/patches` - 获取 Patch 列表
- `GET /api/patches/:id` - 获取 Patch 详情
- `POST /api/patches` - 创建 Patch
- `PUT /api/patches/:id` - 更新 Patch
- `DELETE /api/patches/:id` - 删除 Patch
- `POST /api/patches/:id/comments` - 添加评论
- `DELETE /api/patches/:id/comments/:commentId` - 删除评论
- `POST /api/patches/:id/like` - 点赞/取消点赞
- `POST /api/patches/:id/favorite` - 收藏/取消收藏

### 模块相关
- `GET /api/manufacturers` - 获取厂商列表
- `GET /api/modules` - 获取模块列表
- `GET /api/modules/:id` - 获取模块详情

### 社交功能
- `GET /api/me/favorites` - 获取我的收藏
- `GET /api/me/patches` - 获取我发布的 Patch
- `GET /api/compare` - 获取对比列表
- `POST /api/compare/:id` - 添加到对比
- `DELETE /api/compare/:id` - 从对比中移除
- `POST /api/compare/clear` - 清空对比列表
- `GET /api/compare/result` - 对比结果

### 后台管理
- `GET /api/admin/stats` - 获取统计数据
- `GET /api/admin/users/recent` - 最近注册用户
- `GET /api/admin/users` - 用户列表
- `PUT /api/admin/users/:id` - 更新用户
- `DELETE /api/admin/users/:id` - 删除用户
- `GET /api/admin/patches/recent` - 最近发布 Patch
- `GET /api/admin/patches` - Patch 列表
- `PUT /api/admin/patches/:id/status` - 更新 Patch 状态
- `DELETE /api/admin/patches/:id` - 删除 Patch
- `GET /api/admin/modules` - 模块列表
- `POST /api/admin/modules` - 创建模块
- `PUT /api/admin/modules/:id` - 更新模块
- `GET /api/admin/manufacturers` - 厂商列表
- `POST /api/admin/manufacturers` - 创建厂商
- `PUT /api/admin/manufacturers/:id` - 更新厂商
- `DELETE /api/admin/manufacturers/:id` - 删除厂商

## 开发说明

### 前端开发

```bash
cd client
npm run dev      # 开发模式
npm run build    # 生产构建
npm run preview  # 预览构建结果
```

### 后端开发

```bash
cd server
npm run dev      # 开发模式 (nodemon 自动重启)
npm start        # 生产模式
```

### 数据库结构

主要数据表：
- `users` - 用户表
- `manufacturers` - 厂商表
- `modules` - 合成器模块表
- `patches` - Patch 表
- `likes` - 点赞表
- `favorites` - 收藏表
- `comments` - 评论表
- `compare_lists` - 对比列表

## 技术特点

1. **模块化架构**: 前后端分离，按功能模块划分，易于扩展
2. **开箱即用**: 提供完整的初始化脚本和示例数据
3. **响应式设计**: 适配桌面和移动设备
4. **权限控制**: JWT 认证 + 角色权限管理
5. **现代化 UI**: 基于 Element Plus 的精美界面
6. **性能优化**: 数据库索引、合理的查询优化

## 许可证

MIT License
