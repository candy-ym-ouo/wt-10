#!/bin/bash
set -e

BASE="http://localhost:3000/api"

echo "=== Login ==="
LOGIN=$(curl -s -X POST "$BASE/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}')
TOKEN=$(echo "$LOGIN" | python3 -c "import sys,json; print(json.load(sys.stdin).get('token',''))")
AUTH="Authorization: Bearer $TOKEN"
echo "Got token: ${TOKEN:0:20}..."

echo ""
echo "=== 1. 创建专题 ==="
curl -s -X POST "$BASE/admin/collections" \
  -H "$AUTH" -H "Content-Type: application/json" \
  -d '{"title":"夏日氛围合成器","description":"精选适合夏日听的氛围合成器 Patch","cover_url":"https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600","is_published":true}'
echo ""

echo ""
echo "=== 2. 创建第二个专题（草稿）==="
curl -s -X POST "$BASE/admin/collections" \
  -H "$AUTH" -H "Content-Type: application/json" \
  -d '{"title":"Bass Patch 精选","description":"最震撼的 Bass Patch 合集","cover_url":"","is_published":false}'
echo ""

echo ""
echo "=== 3. 管理员专题列表 ==="
curl -s -H "$AUTH" "$BASE/admin/collections" | python3 -m json.tool

echo ""
echo "=== 4. 发布专题2 + 调整排序 (2在前, 1在后) ==="
curl -s -X PUT "$BASE/admin/collections/2" \
  -H "$AUTH" -H "Content-Type: application/json" \
  -d '{"is_published":true, "sort_order":5}'
echo ""
curl -s -X PUT "$BASE/admin/collections/1" \
  -H "$AUTH" -H "Content-Type: application/json" \
  -d '{"sort_order":10}'
echo ""

echo ""
echo "=== 5. 创建两个测试 Patch ==="
P1=$(curl -s -X POST "$BASE/patches" \
  -H "$AUTH" -H "Content-Type: application/json" \
  -d '{"title":"Sunny Day Pad","description":"温暖的夏日铺底音色","tags":["pad","ambient"], "is_public":true}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin).get('id',0))")
P2=$(curl -s -X POST "$BASE/patches" \
  -H "$AUTH" -H "Content-Type: application/json" \
  -d '{"title":"Ocean Wave Bass","description":"海浪般的低频 Bass","tags":["bass","deep"], "is_public":true}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin).get('id',0))")
echo "Patch IDs: $P1, $P2"

echo ""
echo "=== 6. 添加 Patch 到专题1 ==="
curl -s -X POST "$BASE/admin/collections/1/patches" \
  -H "$AUTH" -H "Content-Type: application/json" \
  -d "{\"patch_id\":$P1,\"note\":\"开场铺底\"}"
echo ""
curl -s -X POST "$BASE/admin/collections/1/patches" \
  -H "$AUTH" -H "Content-Type: application/json" \
  -d "{\"patch_id\":$P2,\"note\":\"中段 Bass\"}"
echo ""

echo ""
echo "=== 7. 更新 Patch1 备注 ==="
curl -s -X PUT "$BASE/admin/collections/1/patches/$P1" \
  -H "$AUTH" -H "Content-Type: application/json" \
  -d '{"note":"开场温暖铺底音色"}'
echo ""

echo ""
echo "=== 8. 前台专题列表 (应显示已发布的，按 sort_order 排序) ==="
curl -s "$BASE/collections" | python3 -c "
import sys, json
d = json.load(sys.stdin)
for c in d.get('list', []):
    print(f\"  [{c['sort_order']}] id={c['id']} title='{c['title']}' published={c['is_published']} patch_count={c['patch_count']}\")
"

echo ""
echo "=== 9. 前台专题1详情 (检查备注和 Patch 顺序) ==="
curl -s "$BASE/collections/1" | python3 -c "
import sys, json
d = json.load(sys.stdin)
print(f\"专题: {d['title']}  封面: {bool(d.get('cover_url'))}  Patches: {d.get('patch_count')}\")
print('包含 Patches:')
for p in d.get('patches', []):
    print(f\"  - order={p['cp_sort_order']:2} | {p['title']:20} | note='{p['cp_note']}'\")
"

echo ""
echo "=== 10. 重排专题1内 Patch (P2在前) ==="
curl -s -X PUT "$BASE/admin/collections/1/reorder" \
  -H "$AUTH" -H "Content-Type: application/json" \
  -d "{\"orders\":[{\"patch_id\":$P2,\"sort_order\":1},{\"patch_id\":$P1,\"sort_order\":2}]}"
echo ""

echo ""
echo "=== 11. 验证重排结果 ==="
curl -s "$BASE/collections/1" | python3 -c "
import sys, json
d = json.load(sys.stdin)
for p in d.get('patches', []):
    print(f\"  - order={p['cp_sort_order']:2} | {p['title']:20} | note='{p['cp_note']}'\")
"

echo ""
echo "=== 12. 删除专题2 ==="
curl -s -X DELETE "$BASE/admin/collections/2" -H "$AUTH"
echo ""

echo ""
echo "=== 13. 最终前台专题列表 (只剩1个) ==="
curl -s "$BASE/collections" | python3 -c "
import sys, json
d = json.load(sys.stdin)
print(f\"Total: {d['total']}\")
for c in d.get('list', []):
    print(f\"  - id={c['id']} title='{c['title']}' cover={bool(c.get('cover_url'))}\")
"

echo ""
echo "=== All tests completed ==="
