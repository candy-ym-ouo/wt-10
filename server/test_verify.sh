#!/bin/bash

echo "=== 测试创作者认证状态同步 ==="

TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' | python3 -c "import sys,json;print(json.load(sys.stdin)['token'])")

echo "1. 登录成功，Token: ${TOKEN:0:30}..."

echo ""
echo "2. 获取认证状态:"
curl -s http://localhost:3000/api/creator/verification/status \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool

echo ""
echo "3. 测试 auth/me 接口:"
curl -s http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool

echo ""
echo "✅ 测试完成"
