"""
测试登录功能
"""
import sys
import os

# 添加父目录到路径
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from service.dbmanager import DbManager
import hashlib


def hash_password(password: str) -> str:
    """密码哈希"""
    return hashlib.sha256(password.encode()).hexdigest()


def test_login():
    """测试登录功能"""
    print("=" * 80)
    print("测试登录功能")
    print("=" * 80)
    
    db = DbManager()
    
    # 1. 创建测试用户
    print("\n[步骤 1] 创建测试用户...")
    test_username = "test_login_user"
    test_password = "test123"
    
    try:
        # 删除已存在的测试用户
        db.execute("DELETE FROM users WHERE username = %s", (test_username,))
        
        # 创建新用户
        hashed_pwd = hash_password(test_password)
        result = db.execute(
            "INSERT INTO users (username, password, interest) VALUES (%s, %s, %s)",
            (test_username, hashed_pwd, "Machine Learning")
        )
        test_user_id = result['lastrowid']
        print(f"[OK] 测试用户创建成功 (ID={test_user_id})")
        
    except Exception as e:
        print(f"[ERROR] 创建测试用户失败: {e}")
        return False
    
    # 2. 测试正确的登录
    print("\n[步骤 2] 测试正确的用户名和密码...")
    try:
        user = db.query_one(
            "SELECT user_id, username, password, interest FROM users WHERE username = %s",
            (test_username,)
        )
        
        if not user:
            print("[ERROR] 找不到用户")
            return False
        
        # 验证密码
        if hash_password(test_password) == user['password']:
            print(f"[OK] 登录成功！")
            print(f"   用户ID: {user['user_id']}")
            print(f"   用户名: {user['username']}")
            print(f"   兴趣: {user['interest']}")
        else:
            print("[ERROR] 密码验证失败")
            return False
            
    except Exception as e:
        print(f"[ERROR] 登录测试失败: {e}")
        return False
    
    # 3. 测试错误的密码
    print("\n[步骤 3] 测试错误的密码...")
    wrong_password = "wrong_password"
    if hash_password(wrong_password) == user['password']:
        print("[ERROR] 错误的密码被接受了（这不应该发生）")
        return False
    else:
        print("[OK] 错误的密码被正确拒绝")
    
    # 4. 测试不存在的用户
    print("\n[步骤 4] 测试不存在的用户...")
    nonexistent_user = db.query_one(
        "SELECT user_id FROM users WHERE username = %s",
        ("nonexistent_user_12345",)
    )
    
    if nonexistent_user:
        print("[ERROR] 不存在的用户被找到了（这不应该发生）")
        return False
    else:
        print("[OK] 不存在的用户返回空结果（正确）")
    
    # 5. 清理测试数据
    print("\n[步骤 5] 清理测试数据...")
    try:
        db.execute("DELETE FROM users WHERE username = %s", (test_username,))
        print("[OK] 测试用户已删除")
    except Exception as e:
        print(f"[WARN] 清理失败: {e}")
    
    print("\n" + "=" * 80)
    print("[SUCCESS] 登录功能测试完成！")
    print("=" * 80)
    print("\n接下来:")
    print("  1. 启动后端: python backend/app.py")
    print("  2. 启动前端: cd frontend && npm run dev")
    print("  3. 访问登录页面测试")
    print()
    
    return True


if __name__ == "__main__":
    try:
        success = test_login()
        exit(0 if success else 1)
    except KeyboardInterrupt:
        print("\n\n测试被中断")
        exit(1)
    except Exception as e:
        print(f"\n\n测试出错: {e}")
        import traceback
        traceback.print_exc()
        exit(1)

