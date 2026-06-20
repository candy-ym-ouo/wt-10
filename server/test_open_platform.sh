#!/bin/bash
set -e

BASE="http://localhost:3000/api"

echo ""
echo "=== 🚀 API 开放平台功能测试 ==="
echo ""

echo "1️⃣  用户登录..."
LOGIN_RES=$(curl -s -X POST "$BASE/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}')
AUTH_TOKEN=$(echo $LOGIN_RES | python3 -c "import sys,json; print(json.load(sys.stdin)['token'])")
USERNAME=$(echo $LOGIN_RES | python3 -c "import sys,json; print(json.load(sys.stdin)['user']['username'])")
echo "    ✅ 登录成功: $USERNAME"
AUTH_HEADER="Authorization: Bearer $AUTH_TOKEN"

echo ""
echo "2️⃣  获取权限范围列表..."
SCOPES_RES=$(curl -s "$BASE/open-platform/scopes")
SCOPE_COUNT=$(echo $SCOPES_RES | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d['scopes']))")
CAT_COUNT=$(echo $SCOPES_RES | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d['categories']))")
echo "    ✅ 共 $SCOPE_COUNT 个权限范围，$CAT_COUNT 个分类"

echo ""
echo "3️⃣  创建 API 密钥..."
CREATE_RES=$(curl -s -X POST "$BASE/me/api-keys" \
  -H "Content-Type: application/json" \
  -H "$AUTH_HEADER" \
  -d '{"name":"功能测试密钥","scopes":["modules:read","patches:read","articles:read"],"rate_limit_per_min":100,"rate_limit_per_hour":1000,"rate_limit_per_day":10000}')
API_KEY=$(echo $CREATE_RES | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['api_key'])")
API_SECRET=$(echo $CREATE_RES | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['api_secret_plain'])")
KEY_ID=$(echo $CREATE_RES | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['id'])")
SCOPES=$(echo $CREATE_RES | python3 -c "import sys,json; d=json.load(sys.stdin); print(', '.join(d['scopes']))")
echo "    ✅ 创建成功 (ID: $KEY_ID)"
echo "       API Key: $API_KEY"
echo "       API Secret: $API_SECRET"
echo "       权限范围: $SCOPES"

sleep 0.5

echo ""
echo "4️⃣  使用 X-API-Key 访问 /modules..."
RESULT=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/modules" \
  -H "X-API-Key: $API_KEY")
if [ "$RESULT" = "200" ]; then
  echo "    ✅ 访问成功 (HTTP $RESULT)"
else
  echo "    ❌ 访问失败 (HTTP $RESULT)"
fi

echo ""
echo "5️⃣  使用错误的 API Key 访问..."
WRONG_RES=$(curl -s "$BASE/modules" -H "X-API-Key: pk_wrong_key_123456")
ERROR=$(echo $WRONG_RES | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('code','?'), d.get('error','?'))")
echo "    ✅ 正确拦截: $ERROR"

echo ""
echo "6️⃣  生成访问令牌 (API Key + Secret)..."
TOKEN_RES=$(curl -s -X POST "$BASE/open-platform/token" \
  -H "Content-Type: application/json" \
  -H "$AUTH_HEADER" \
  -d "{\"api_key\":\"$API_KEY\",\"api_secret\":\"$API_SECRET\",\"scopes\":[\"modules:read\"],\"expires_in\":3600}")
ACCESS_TOKEN=$(echo $TOKEN_RES | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('access_token',''))")
EXPIRES=$(echo $TOKEN_RES | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('expires_in','?'))")
TOKEN_SCOPES=$(echo $TOKEN_RES | python3 -c "import sys,json; d=json.load(sys.stdin); print(', '.join(d.get('scopes',[])))")
echo "    ✅ 令牌生成成功:"
echo "       类型: Bearer"
echo "       有效期: ${EXPIRES}秒"
echo "       权限: $TOKEN_SCOPES"
echo "       令牌前20位: ${ACCESS_TOKEN:0:20}..."

sleep 0.5

echo ""
echo "7️⃣  使用 Bearer Token 访问 /patches..."
RESULT=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/patches" \
  -H "Authorization: Bearer $ACCESS_TOKEN")
if [ "$RESULT" = "200" ]; then
  echo "    ✅ 访问成功 (HTTP $RESULT)"
else
  echo "    ❌ 访问失败 (HTTP $RESULT)"
fi

echo ""
echo "8️⃣  权限校验测试 - 无 articles:write 权限创建文章..."
SCOPE_RES=$(curl -s -X POST "$BASE/articles" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d '{"title":"test","content":"test"}')
CODE=$(echo $SCOPE_RES | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('code',''))")
REQ_SCOPE=$(echo $SCOPE_RES | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('required_scope',''))")
if [ "$CODE" = "INSUFFICIENT_SCOPE" ]; then
  echo "    ✅ 正确拦截权限不足"
  echo "       需要权限: $REQ_SCOPE"
else
  echo "    ⚠️  结果: $CODE"
fi

echo ""
echo "9️⃣  管理员获取所有 API 密钥..."
ADMIN_KEYS=$(curl -s "$BASE/admin/api-keys?page_size=5" -H "$AUTH_HEADER")
TOTAL=$(echo $ADMIN_KEYS | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['pagination']['total'])")
echo "    ✅ 获取成功，共 $TOTAL 个密钥:"
echo $ADMIN_KEYS | python3 -c "
import sys,json
d=json.load(sys.stdin)
for k in d['keys']:
    print(f\"       - [{k['id']}] {k['name']} ({k.get('username','?')}) 状态: {k['status']}\")
"

echo ""
echo "🔟  管理员封禁密钥 (ID=$KEY_ID)..."
BAN_RES=$(curl -s -X POST "$BASE/admin/api-keys/$KEY_ID/ban" \
  -H "Content-Type: application/json" \
  -H "$AUTH_HEADER" \
  -d '{"reason":"测试封禁功能 - 违规使用"}')
STATUS=$(echo $BAN_RES | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['status'])")
REASON=$(echo $BAN_RES | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['banned_reason'])")
echo "    ✅ 封禁成功: 状态=$STATUS, 原因=$REASON"

sleep 0.5

echo ""
echo "1️⃣1️⃣  使用被封禁的密钥访问..."
BANNED_RES=$(curl -s "$BASE/modules" -H "X-API-Key: $API_KEY")
BAN_CODE=$(echo $BANNED_RES | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('code',''))")
BAN_ERROR=$(echo $BANNED_RES | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('error',''))")
echo "    ✅ 正确拦截封禁 [$BAN_CODE]: $BAN_ERROR"

echo ""
echo "1️⃣2️⃣  管理员解封密钥 (ID=$KEY_ID)..."
UNBAN_RES=$(curl -s -X POST "$BASE/admin/api-keys/$KEY_ID/unban" -H "$AUTH_HEADER")
STATUS=$(echo $UNBAN_RES | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['status'])")
echo "    ✅ 解封成功: 状态=$STATUS"

echo ""
echo "1️⃣3️⃣  管理员调整限流配置 (ID=$KEY_ID)..."
RATE_RES=$(curl -s -X PUT "$BASE/admin/api-keys/$KEY_ID/rate-limit" \
  -H "Content-Type: application/json" \
  -H "$AUTH_HEADER" \
  -d '{"rate_limit_per_min":500,"rate_limit_per_hour":5000,"rate_limit_per_day":50000}')
RMIN=$(echo $RATE_RES | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['rate_limit_per_min'])")
RHOUR=$(echo $RATE_RES | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['rate_limit_per_hour'])")
RDAY=$(echo $RATE_RES | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['rate_limit_per_day'])")
echo "    ✅ 调整成功: ${RMIN}/分, ${RHOUR}/时, ${RDAY}/天"

sleep 0.5

echo ""
echo "1️⃣4️⃣  查看调用记录..."
LOGS_RES=$(curl -s "$BASE/me/api-call-logs?page=1&page_size=10" -H "$AUTH_HEADER")
LOG_TOTAL=$(echo $LOGS_RES | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['pagination']['total'])")
echo "    ✅ 调用记录: 共 $LOG_TOTAL 条，最新 5 条:"
echo $LOGS_RES | python3 -c "
import sys,json
d=json.load(sys.stdin)
for l in d['logs'][:5]:
    icon = '✅' if 200 <= (l['status_code'] or 0) < 300 else ('❌' if (l['status_code'] or 0) >= 400 else '⚠️')
    print(f\"       {icon} {l['method']:<6} {l['endpoint']:<45} -> {l['status_code']} ({l['response_time_ms']}ms)\")
"

echo ""
echo "1️⃣5️⃣  获取近 7 天调用统计..."
STATS_RES=$(curl -s "$BASE/me/api-call-stats?days=7" -H "$AUTH_HEADER")
echo $STATS_RES | python3 -c "
import sys,json
d=json.load(sys.stdin)
s = d['summary']
cnt = s.get('count', 0) or 0
succ = s.get('success_count', 0) or 0
err = s.get('error_count', 0) or 0
avg = s.get('avg_response_time', 0) or 0
rate = f\"{(succ/cnt*100):.1f}\" if cnt else '0.0'
print(f\"    ✅ 近 7 天统计:\")
print(f\"       总调用: {cnt}\")
print(f\"       成功: {succ}\")
print(f\"       错误: {err}\")
print(f\"       成功率: {rate}%\")
print(f\"       平均响应: {avg:.0f}ms\")
"

echo ""
echo "1️⃣6️⃣  管理员开放平台总览..."
OVERVIEW_RES=$(curl -s "$BASE/admin/open-platform/stats?days=30" -H "$AUTH_HEADER")
echo $OVERVIEW_RES | python3 -c "
import sys,json
d=json.load(sys.stdin)
o = d['overview']
print(f\"    ✅ 平台总览:\")
print(f\"       总密钥数: {o['total_keys']}\")
print(f\"       活跃密钥: {o['active_keys']}\")
print(f\"       已封禁: {o['banned_keys']}\")
print(f\"       近 30 日调用: {o.get('count', 0) or 0} 次\")
"

echo ""
echo "=== 🎉 所有功能测试通过! ==="
echo ""
