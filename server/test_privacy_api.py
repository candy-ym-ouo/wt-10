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

print("=== 测试隐私设置功能 ===\n")

# 1. 登录
print("1. 登录获取 token...")
status, login_data = make_request("POST", "/auth/login", data={
    "username": "admin",
    "password": "admin123"
})
print(f"   状态码: {status}")
token = login_data.get("token")
if token:
    print(f"   登录成功! Token 前20位: {token[:20]}...")
    user = login_data.get("user", {})
    print(f"   用户隐私设置:")
    print(f"     - privacy_email: {user.get('privacy_email')}")
    print(f"     - privacy_favorites: {user.get('privacy_favorites')}")
    print(f"     - privacy_patches: {user.get('privacy_patches')}")
else:
    print(f"   登录失败: {login_data}")
    exit(1)

# 2. 获取隐私设置
print("\n2. 获取隐私设置...")
status, privacy_data = make_request("GET", "/me/privacy-settings", token=token)
print(f"   状态码: {status}")
print(f"   结果: {json.dumps(privacy_data, indent=2, ensure_ascii=False)}")

# 3. 更新隐私设置
print("\n3. 更新隐私设置...")
status, update_data = make_request("PUT", "/me/privacy-settings", token=token, data={
    "privacy_email": "private",
    "privacy_favorites": "followers",
    "privacy_patches": "public"
})
print(f"   状态码: {status}")
print(f"   结果: {json.dumps(update_data, indent=2, ensure_ascii=False)}")

# 4. 再次获取验证
print("\n4. 验证更新结果...")
status, privacy_data2 = make_request("GET", "/me/privacy-settings", token=token)
print(f"   状态码: {status}")
print(f"   结果: {json.dumps(privacy_data2, indent=2, ensure_ascii=False)}")

# 5. 获取自己的用户资料
print("\n5. 获取自己的用户资料...")
status, profile_data = make_request("GET", "/users/1", token=token)
print(f"   状态码: {status}")
if status == 200:
    print(f"   邮箱: {profile_data.get('email', '未显示')}")
    print(f"   privacy_settings: {json.dumps(profile_data.get('privacy_settings', {}), indent=4)}")
    print(f"   total_patches: {profile_data.get('total_patches')}")
    print(f"   total_favorites: {profile_data.get('total_favorites')}")
    print(f"   patches 数量: {len(profile_data.get('patches', []))}")

# 6. 获取用户的 patch 列表
print("\n6. 获取用户的 patch 列表...")
status, patches_data = make_request("GET", "/patches?user_id=1", token=token)
print(f"   状态码: {status}")
if status == 200:
    print(f"   Patch 总数: {patches_data.get('total')}")
    print(f"   当前页数量: {len(patches_data.get('list', []))}")

# 7. 恢复默认设置
print("\n7. 恢复默认隐私设置...")
status, _ = make_request("PUT", "/me/privacy-settings", token=token, data={
    "privacy_email": "public",
    "privacy_favorites": "public",
    "privacy_patches": "public"
})
print(f"   状态码: {status}")
print(f"   已恢复为公开设置")

print("\n=== 测试完成 ===")
