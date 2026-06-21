#!/bin/bash

BASE_URL="http://localhost:3000/api"

echo "=== 测试隐私设置功能 ==="
echo ""

# 1. 登录
echo "1. 登录获取 token..."
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}')

TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
echo "   登录成功!"
echo "   Token: ${TOKEN:0:20}..."

# 2. 获取隐私设置
echo ""
echo "2. 获取隐私设置..."
curl -s -X GET "$BASE_URL/me/privacy-settings" \
  -H "Authorization: Bearer $TOKEN"
echo ""

# 3. 更新隐私设置
echo ""
echo "3. 更新隐私设置..."
curl -s -X PUT "$BASE_URL/me/privacy-settings" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"privacy_email":"private","privacy_favorites":"followers","privacy_patches":"public"}'
echo ""

# 4. 再次获取验证
echo ""
echo "4. 验证更新结果..."
curl -s -X GET "$BASE_URL/me/privacy-settings" \
  -H "Authorization: Bearer $TOKEN"
echo ""

# 5. 获取自己的用户资料
echo ""
echo "5. 获取自己的用户资料..."
PROFILE_RESPONSE=$(curl -s -X GET "$BASE_URL/users/1" \
  -H "Authorization: Bearer $TOKEN")
echo "$PROFILE_RESPONSE" | head -c 500
echo ""

# 6. 获取用户的 patch 列表
echo ""
echo "6. 获取用户的 patch 列表..."
PATCHES_RESPONSE=$(curl -s -X GET "$BASE_URL/patches?user_id=1" \
  -H "Authorization: Bearer $TOKEN")
echo "$PATCHES_RESPONSE" | head -c 300
echo ""

echo ""
echo "=== 测试完成 ==="
