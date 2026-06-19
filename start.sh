#!/bin/bash

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVER_DIR="$PROJECT_DIR/server"
CLIENT_DIR="$PROJECT_DIR/client"
DB_FILE="$SERVER_DIR/data/patch_vault.db"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Patch Vault - 一键启动脚本${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

echo -e "${YELLOW}[1/6] 检查 Node.js 环境...${NC}"
if ! command -v node &> /dev/null; then
    echo "❌ 未检测到 Node.js，请先安装 Node.js >= 16.0.0"
    exit 1
fi
echo "✅ Node.js 版本: $(node -v)"
echo "✅ npm 版本: $(npm -v)"
echo ""

echo -e "${YELLOW}[2/6] 安装后端依赖...${NC}"
cd "$SERVER_DIR"
if [ ! -d "node_modules" ]; then
    echo "正在安装后端依赖..."
    npm install
fi
echo "✅ 后端依赖已就绪"
echo ""

echo -e "${YELLOW}[3/6] 初始化数据库...${NC}"
if [ ! -f "$DB_FILE" ]; then
    echo "数据库不存在，开始初始化..."
    npm run init
    npm run seed
else
    echo "数据库已存在，执行迁移..."
    npm run migrate 2>/dev/null || true
    npm run seed 2>/dev/null || true
fi
echo "✅ 数据库已就绪"
echo ""

echo -e "${YELLOW}[4/6] 安装前端依赖...${NC}"
cd "$CLIENT_DIR"
if [ ! -d "node_modules" ]; then
    echo "正在安装前端依赖..."
    npm install
fi
echo "✅ 前端依赖已就绪"
echo ""

echo -e "${YELLOW}[5/6] 清理端口占用...${NC}"
for PORT in 3000 5173; do
    if lsof -ti:$PORT &> /dev/null; then
        echo "正在清理端口 $PORT..."
        lsof -ti:$PORT | xargs kill -9 2>/dev/null || true
    fi
done
echo "✅ 端口已清理"
echo ""

echo -e "${YELLOW}[6/6] 启动服务...${NC}"
echo ""

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  启动后端服务 (端口: 3000)${NC}"
echo -e "${GREEN}========================================${NC}"
cd "$SERVER_DIR"
npm run dev &
SERVER_PID=$!
echo "后端服务 PID: $SERVER_PID"
echo ""

sleep 3

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  启动前端服务 (端口: 5173)${NC}"
echo -e "${GREEN}========================================${NC}"
cd "$CLIENT_DIR"
npm run dev &
CLIENT_PID=$!
echo "前端服务 PID: $CLIENT_PID"
echo ""

sleep 3

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  ✅ 服务启动完成！${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "📱 前端地址: ${GREEN}http://localhost:5173${NC}"
echo -e "🔧 后端 API: ${GREEN}http://localhost:3000/api${NC}"
echo ""
echo -e "👤 演示账号:"
echo -e "   管理员: ${YELLOW}admin / admin123${NC}"
echo -e "   普通用户: ${YELLOW}synthfan / 123456${NC}"
echo ""
echo -e "💡 提示: 按 Ctrl+C 停止所有服务"
echo ""

cleanup() {
    echo ""
    echo "正在停止服务..."
    kill $SERVER_PID 2>/dev/null || true
    kill $CLIENT_PID 2>/dev/null || true
    pkill -f "nodemon" 2>/dev/null || true
    pkill -f "vite" 2>/dev/null || true
    echo "✅ 服务已停止"
    exit 0
}

trap cleanup SIGINT SIGTERM

wait
