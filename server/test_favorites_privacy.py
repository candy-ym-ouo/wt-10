import json
import urllib.request
import urllib.error

BASE_URL = "http://localhost:3000/api"

def make_request(method, path, token=None, data=None):
    url = BASE_URL + path
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    
    body = json.dumps(data).encode() if data else None
    
    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    
    try:
        with urllib.request.urlopen(req) as response:
            return response.status, json.loads(response.read().decode())
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode())

print("=== 测试收藏夹隐私功能 ===\n")

# 1. 获取 admin token
print("1. 获取 admin token...")
status, admin_login = make_request("POST", "/auth/login", data={
    "username": "admin",
    "password": "admin123"
})
admin_token = admin_login.get("token")
print(f"   admin token: {admin_token[:20]}...")

# 2. 获取测试用户 token
print("\n2. 获取测试用户 token...")
status, test_login = make_request("POST", "/auth/login", data={
    "username": "synthfan",
    "password": "123456"
})
test_token = test_login.get("token")
test_user = test_login.get("user", {})
print(f"   测试用户: {test_user.get('username')}, ID: {test_user.get('id')}")

# 3. 获取 admin 用户资料（以测试用户身份，未设置隐私前）
print("\n3. 获取 admin 用户资料（默认公开设置）...")
status, profile = make_request("GET", "/users/1", token=test_token)
print(f"   状态码: {status}")
print(f"   邮箱可见: {'email' in profile and profile['email'] is not None}")
print(f"   privacy_settings: {json.dumps(profile.get('privacy_settings', {}), ensure_ascii=False)}")
print(f"   total_favorites: {profile.get('total_favorites')}")

# 4. 获取 admin 的收藏列表（测试用户身份）
print("\n4. 获取 admin 收藏列表（公开设置）...")
status, favorites = make_request("GET", "/users/1/favorites?page=1&limit=10", token=test_token)
print(f"   状态码: {status}")
print(f"   总数: {favorites.get('total')}")
print(f"   列表数量: {len(favorites.get('list', []))}")
print(f"   can_view: {favorites.get('can_view')}")

# 5. 将 admin 的收藏夹设为仅粉丝
print("\n5. 将 admin 收藏夹设为仅粉丝...")
status, update_res = make_request("PUT", "/me/privacy-settings", token=admin_token, data={
    "privacy_favorites": "followers"
})
print(f"   状态码: {status}")
print(f"   结果: {json.dumps(update_res, ensure_ascii=False)}")

# 6. 测试用户（未关注）查看收藏
print("\n6. 测试用户（未关注）查看 admin 收藏（仅粉丝设置）...")
status, favorites2 = make_request("GET", "/users/1/favorites?page=1&limit=10", token=test_token)
print(f"   状态码: {status}")
print(f"   总数: {favorites2.get('total')}")
print(f"   列表数量: {len(favorites2.get('list', []))}")
print(f"   can_view: {favorites2.get('can_view')}")

# 7. 测试用户（未关注）查看资料
print("\n7. 测试用户（未关注）查看 admin 资料（仅粉丝设置）...")
status, profile2 = make_request("GET", "/users/1", token=test_token)
print(f"   状态码: {status}")
print(f"   total_favorites: {profile2.get('total_favorites')}")
print(f"   privacy_settings: {json.dumps(profile2.get('privacy_settings', {}), ensure_ascii=False)}")

# 8. 测试用户关注 admin
print("\n8. 测试用户关注 admin...")
status, follow_res = make_request("POST", "/users/1/follow", token=test_token)
print(f"   状态码: {status}")
print(f"   结果: {json.dumps(follow_res, ensure_ascii=False)}")

# 9. 关注后查看收藏
print("\n9. 关注后查看 admin 收藏列表...")
status, favorites3 = make_request("GET", "/users/1/favorites?page=1&limit=10", token=test_token)
print(f"   状态码: {status}")
print(f"   总数: {favorites3.get('total')}")
print(f"   列表数量: {len(favorites3.get('list', []))}")
print(f"   can_view: {favorites3.get('can_view')}")

# 10. 关注后查看资料
print("\n10. 关注后查看 admin 资料...")
status, profile3 = make_request("GET", "/users/1", token=test_token)
print(f"   状态码: {status}")
print(f"   total_favorites: {profile3.get('total_favorites')}")
print(f"   privacy_settings: {json.dumps(profile3.get('privacy_settings', {}), ensure_ascii=False)}")

# 11. 设为仅自己
print("\n11. 将 admin 收藏夹设为仅自己...")
status, update_res2 = make_request("PUT", "/me/privacy-settings", token=admin_token, data={
    "privacy_favorites": "private"
})
print(f"   状态码: {status}")

# 12. 关注后也看不到了
print("\n12. 设为仅自己后，粉丝查看收藏...")
status, favorites4 = make_request("GET", "/users/1/favorites?page=1&limit=10", token=test_token)
print(f"   状态码: {status}")
print(f"   总数: {favorites4.get('total')}")
print(f"   can_view: {favorites4.get('can_view')}")

# 13. 恢复默认设置
print("\n13. 恢复默认公开设置...")
status, _ = make_request("PUT", "/me/privacy-settings", token=admin_token, data={
    "privacy_favorites": "public"
})
print(f"   状态码: {status}")

# 14. 取消关注
print("\n14. 取消关注...")
status, _ = make_request("DELETE", "/users/1/follow", token=test_token)
print(f"   状态码: {status}")

print("\n=== 所有测试完成 ===")
