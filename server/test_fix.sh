#!/bin/bash
set -e

BASE="http://localhost:3000/api"

echo ""
echo "=== 🔧 修复验证测试 ==="
echo ""

echo "1️⃣  用户登录..."
LOGIN_RES=$(curl -s -X POST "$BASE/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}')
AUTH_TOKEN=$(echo $LOGIN_RES | python3 -c "import sys,json; print(json.load(sys.stdin)['token'])")
echo "    ✅ 登录成功"
AUTH_HEADER="Authorization: Bearer $AUTH_TOKEN"

echo ""
echo "2️⃣  先创建一个只有 articles:read 权限的密钥（没有 write）..."
CREATE_RES=$(curl -s -X POST "$BASE/me/api-keys" \
  -H "Content-Type: application/json" \
  -H "$AUTH_HEADER" \
  -d '{"name":"权限测试密钥","scopes":["articles:read"],"rate_limit_per_min":100,"rate_limit_per_hour":1000,"rate_limit_per_day":10000}')
API_KEY=$(echo $CREATE_RES | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['api_key'])")
API_SECRET=$(echo $CREATE_RES | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['api_secret_plain'])")
KEY_ID=$(echo $CREATE_RES | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['id'])")
echo "    ✅ 密钥创建成功: $API_KEY"

echo ""
echo "=== 🧪 测试1: 文章子路由权限范围校验 ==="
echo ""

echo "3️⃣  GET /articles (articles:read) - 应该允许..."
RESULT=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/articles" \
  -H "X-API-Key: $API_KEY")
if [ "$RESULT" = "200" ]; then
  echo "    ✅ 正确允许 (HTTP $RESULT)"
else
  echo "    ❌ 错误 (HTTP $RESULT)"
fi

echo ""
echo "4️⃣  GET /articles/1 (articles:read) - 应该允许..."
RESULT=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/articles/1" \
  -H "X-API-Key: $API_KEY")
if [ "$RESULT" = "200" ]; then
  echo "    ✅ 正确允许 (HTTP $RESULT)"
else
  echo "    ❌ 错误 (HTTP $RESULT)"
fi

echo ""
echo "5️⃣  GET /articles/1/module-refs (articles:read) - 应该允许..."
RESULT=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/articles/1/module-refs" \
  -H "X-API-Key: $API_KEY")
if [ "$RESULT" = "200" ]; then
  echo "    ✅ 正确允许 (HTTP $RESULT)"
else
  echo "    ❌ 错误 (HTTP $RESULT)"
fi

echo ""
echo "6️⃣  POST /articles/1/like (articles:write) - 应该拦截（权限不足）..."
LIKE_RES=$(curl -s -X POST "$BASE/articles/1/like" \
  -H "X-API-Key: $API_KEY")
CODE=$(echo $LIKE_RES | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('code',''))")
REQ_SCOPE=$(echo $LIKE_RES | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('required_scope',''))")
if [ "$CODE" = "INSUFFICIENT_SCOPE" ] && [ "$REQ_SCOPE" = "articles:write" ]; then
  echo "    ✅ 正确拦截权限不足 [$CODE]"
  echo "       需要权限: $REQ_SCOPE"
else
  echo "    ❌ 未正确拦截: $CODE, 需要: $REQ_SCOPE"
fi

echo ""
echo "7️⃣  POST /articles/1/favorite (articles:write) - 应该拦截..."
FAV_RES=$(curl -s -X POST "$BASE/articles/1/favorite" \
  -H "X-API-Key: $API_KEY")
CODE=$(echo $FAV_RES | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('code',''))")
REQ_SCOPE=$(echo $FAV_RES | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('required_scope',''))")
if [ "$CODE" = "INSUFFICIENT_SCOPE" ]; then
  echo "    ✅ 正确拦截权限不足 [$CODE], 需要: $REQ_SCOPE"
else
  echo "    ❌ 未正确拦截: $CODE"
fi

echo ""
echo "8️⃣  POST /articles/1/comments (articles:write) - 应该拦截..."
COMMENT_RES=$(curl -s -X POST "$BASE/articles/1/comments" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d '{"content":"test"}')
CODE=$(echo $COMMENT_RES | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('code',''))")
REQ_SCOPE=$(echo $COMMENT_RES | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('required_scope',''))")
if [ "$CODE" = "INSUFFICIENT_SCOPE" ]; then
  echo "    ✅ 正确拦截权限不足 [$CODE], 需要: $REQ_SCOPE"
else
  echo "    ❌ 未正确拦截: $CODE"
fi

echo ""
echo "9️⃣  DELETE /articles/1/comments/1 (articles:write) - 应该拦截..."
DEL_COMMENT_RES=$(curl -s -X DELETE "$BASE/articles/1/comments/1" \
  -H "X-API-Key: $API_KEY")
CODE=$(echo $DEL_COMMENT_RES | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('code',''))")
REQ_SCOPE=$(echo $DEL_COMMENT_RES | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('required_scope',''))")
if [ "$CODE" = "INSUFFICIENT_SCOPE" ]; then
  echo "    ✅ 正确拦截权限不足 [$CODE], 需要: $REQ_SCOPE"
else
  echo "    ❌ 未正确拦截: $CODE"
fi

echo ""
echo "=== 🧪 测试2: 调用记录不混入普通站内请求 ==="
echo ""

echo "🔍 先查看当前调用记录总数..."
LOGS_BEFORE=$(curl -s "$BASE/me/api-call-logs?page=1&page_size=1" \
  -H "$AUTH_HEADER")
COUNT_BEFORE=$(echo $LOGS_BEFORE | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['pagination']['total'])")
echo "    当前记录数: $COUNT_BEFORE"

echo ""
echo "1️⃣0️⃣  发送 5 次普通站内请求（用 JWT Token，不用 API Key）..."
for i in {1..5}; do
  curl -s -o /dev/null "$BASE/modules" -H "$AUTH_HEADER"
  curl -s -o /dev/null "$BASE/patches" -H "$AUTH_HEADER"
done
echo "    ✅ 已发送 10 次普通站内请求"

sleep 0.5

echo ""
echo "1️⃣1️⃣  再发送 2 次 API Key 请求（应该被记录）..."
curl -s -o /dev/null "$BASE/modules" -H "X-API-Key: $API_KEY"
curl -s -o /dev/null "$BASE/articles" -H "X-API-Key: $API_KEY"
echo "    ✅ 已发送 2 次 API Key 请求"

sleep 0.5

echo ""
echo "1️⃣2️⃣  查看调用记录数量变化..."
LOGS_AFTER=$(curl -s "$BASE/me/api-call-logs?page=1&page_size=1" \
  -H "$AUTH_HEADER")
COUNT_AFTER=$(echo $LOGS_AFTER | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['pagination']['total'])")
echo "    记录数变化: $COUNT_BEFORE -> $COUNT_AFTER"
INCREASE=$((COUNT_AFTER - COUNT_BEFORE))
echo "    新增记录: $INCREASE 条"

if [ "$INCREASE" = "2" ] || [ "$INCREASE" = "3" ]; then
  echo "    ✅ 正确 - 只记录了 API Key 请求（2-3条，包含权限测试的失败请求）"
  echo "       普通站内请求没有被混入!"
elif [ "$INCREASE" -gt "3" ]; then
  echo "    ❌ 错误 - 记录了 $INCREASE 条，可能混入了普通请求"
else
  echo "    ⚠️  记录数少于预期，请手动检查"
fi

echo ""
echo "1️⃣3️⃣  查看最近几条调用记录，确认 api_key_id 不为空..."
curl -s "$BASE/me/api-call-logs?page=1&page_size=5" \
  -H "$AUTH_HEADER" \
  | python3 -c "
import sys,json
d=json.load(sys.stdin)
print('    最近 5 条记录:')
for l in d['logs'][:5]:
    status = '✅' if l['api_key_id'] else '❌'
    print(f'       {status} [{l[\"id\"]}] {l[\"method\"]} {l[\"endpoint\"]} -> api_key_id={l[\"api_key_id\"]}')
if all(l['api_key_id'] for l in d['logs'][:5]):
    print('    ✅ 所有记录都有关联的 API Key ID，没有普通请求混入')
else:
    print('    ❌ 发现没有 API Key ID 的记录，普通请求被混入了!')
"

echo ""
echo "=== 🎉 修复验证完成 ==="
echo ""
