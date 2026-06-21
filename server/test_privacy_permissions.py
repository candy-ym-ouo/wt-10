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

print("=== 隐私权限完整测试 ===\n")

# 1. 获取 admin token
print("1. 获取 admin token...")
status, admin_login = make_request("POST", "/auth/login", data={
    "username": "admin",
    "password": "admin123"
})
admin_token = admin_login.get("token")
print(f"   admin token: {admin_token[:20]}...")

# 2. 注册或获取测试用户 token
print("\n2. 获取测试用户 token...")
test_username = "testuser_privacy_" + str(hash("privacy_test") % 10000)
test_email = f"test_{test_username}@example.com"

status, register_data = make_request("POST", "/auth/register", data={
    "username": test_username,
    "email": test_email,
    "password": "test123456"
})

if status == 200:
    test_token = register_data.get("token")
    test_user_id = register_data.get("user", {}).get("id")
    print(f"   注册成功! 用户ID: {test_user_id}")
else:
    print(f"   注册失败 (状态码: {status}), 尝试登录...")
    status, login_data = make_request("POST", "/auth/login", data={
        "username": test_username,
        "password": "test123456"
    })
    test_token = login_data.get("token")
    test_user_id = login_data.get("user", {}).get("id")
    if test_token:
        print(f"   登录成功! 用户ID: {test_user_id}")
    else:
        print(f"   登录也失败了: {login_data}")
        exit(1)

# 3. 将 admin 的隐私设置全部设为 private
print("\n3. 将 admin 隐私设置全部设为 private...")
status, _ = make_request("PUT", "/me/privacy-settings", token=admin_token, data={
    "privacy_email": "private",
    "privacy_favorites": "private",
    "privacy_patches": "private"
})
print(f"   设置完成，状态码: {status}")

# 4. 测试用户（未关注）查看 admin 的资料
print("\n4. 测试用户（未关注）查看 admin 的资料（全部 private）...")
status, profile_data = make_request("GET", "/users/1", token=test_token)
print(f"   状态码: {status}")
print(f"   邮箱可见: {'email' in profile_data and profile_data['email'] is not None}")
print(f"   privacy_settings: {json.dumps(profile_data.get('privacy_settings', {}), ensure_ascii=False)}")
print(f"   total_patches: {profile_data.get('total_patches')}")
print(f"   total_favorites: {profile_data.get('total_favorites')}")
print(f"   patches 数量: {len(profile_data.get('patches', []))}")

# 5. 测试用户查看 admin 的 patch 列表
print("\n5. 测试用户查看 admin 的 Patch 列表（全部 private）...")
status, patches_data = make_request("GET", "/patches?user_id=1", token=test_token)
print(f"   状态码: {status}")
print(f"   Patch 总数: {patches_data.get('total')}")
print(f"   当前页数量: {len(patches_data.get('list', []))}")

# 6. 将 admin 的隐私设置改为 followers
print("\n6. 将 admin 隐私设置改为 followers...")
status, _ = make_request("PUT", "/me/privacy-settings", token=admin_token, data={
    "privacy_email": "followers",
    "privacy_favorites": "followers",
    "privacy_patches": "followers"
})
print(f"   设置完成，状态码: {status}")

# 7. 未关注状态下再次查看
print("\n7. 未关注状态下查看 admin 资料（followers 级别）...")
status, profile_data2 = make_request("GET", "/users/1", token=test_token)
print(f"   状态码: {status}")
print(f"   邮箱可见: {'email' in profile_data2 and profile_data2['email'] is not None}")
print(f"   privacy_settings: {json.dumps(profile_data2.get('privacy_settings', {}), ensure_ascii=False)}")
print(f"   total_patches: {profile_data2.get('total_patches')}")
print(f"   total_favorites: {profile_data2.get('total_favorites')}")
print(f"   patches 数量: {len(profile_data2.get('patches', []))}")

# 8. 测试用户关注 admin
print("\n8. 测试用户关注 admin...")
status, follow_data = make_request("POST", "/users/1/follow", token=test_token)
print(f"   状态码: {status}")
print(f"   结果: {json.dumps(follow_data, ensure_ascii=False)}")

# 9. 关注后查看 admin 资料
print("\n9. 关注后查看 admin 资料（followers 级别）...")
status, profile_data3 = make_request("GET", "/users/1", token=test_token)
print(f"   状态码: {status}")
print(f"   邮箱可见: {'email' in profile_data3 and profile_data3['email'] is not None}")
print(f"   privacy_settings: {json.dumps(profile_data3.get('privacy_settings', {}), ensure_ascii=False)}")
print(f"   total_patches: {profile_data3.get('total_patches')}")
print(f"   total_favorites: {profile_data3.get('total_favorites')}")
print(f"   patches 数量: {len(profile_data3.get('patches', []))}")

# 10. 关注后查看 admin 的 patch 列表
print("\n10. 关注后查看 admin 的 Patch 列表...")
status, patches_data2 = make_request("GET", "/patches?user_id=1", token=test_token)
print(f"   状态码: {status}")
print(f"   Patch 总数: {patches_data2.get('total')}")
print(f"   当前页数量: {len(patches_data2.get('list', []))}")

# 11. 未登录用户查看
print("\n11. 未登录用户查看 admin 资料（followers 级别）...")
status, profile_data4 = make_request("GET", "/users/1")
print(f"   状态码: {status}")
print(f"   邮箱可见: {'email' in profile_data4 and profile_data4['email'] is not None}")
print(f"   privacy_settings: {json.dumps(profile_data4.get('privacy_settings', {}), ensure_ascii=False)}")
print(f"   total_patches: {profile_data4.get('total_patches')}")
print(f"   total_favorites: {profile_data4.get('total_favorites')}")

# 12. 恢复 admin 的默认设置
print("\n12. 恢复 admin 的默认隐私设置为 public...")
status, _ = make_request("PUT", "/me/privacy-settings", token=admin_token, data={
    "privacy_email": "public",
    "privacy_favorites": "public",
    "privacy_patches": "public"
})
print(f"   状态码: {status}")
print(f"   已恢复为公开设置")

# 13. 取消关注
print("\n13. 测试用户取消关注 admin...")
status, _ = make_request("DELETE", "/users/1/follow", token=test_token)
print(f"   状态码: {status}")

print("\n=== 所有测试完成 ===")
