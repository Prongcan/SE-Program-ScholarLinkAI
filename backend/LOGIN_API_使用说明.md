# 登录功能使用说明

## 🔐 功能概述

实现了完整的用户登录功能，包括：
- ✅ 后端登录 API
- ✅ 前端登录页面
- ✅ 密码验证
- ✅ 错误提示
- ✅ 登录状态管理

---

## 📡 后端 API

### POST /api/users/login

**用户登录接口**

#### 请求示例

```bash
curl -X POST http://localhost:3001/api/users/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "test_user",
    "password": "password123"
  }'
```

#### 请求参数

```json
{
  "username": "用户名",
  "password": "密码"
}
```

#### 成功响应 (200)

```json
{
  "message": "登录成功",
  "status": "success",
  "timestamp": "2024-11-27T20:00:00",
  "data": {
    "user_id": 1,
    "username": "test_user",
    "interest": "Machine Learning, NLP"
  }
}
```

#### 失败响应 (401)

```json
{
  "message": "用户名或密码错误",
  "status": "error",
  "timestamp": "2024-11-27T20:00:00",
  "data": null
}
```

---

## 🎨 前端使用

### 登录页面

前端登录页面位于：`frontend/src/pages/Login.jsx`

#### 功能特性

1. **用户名密码输入**
   - 支持实时输入验证
   - 自动清除错误提示

2. **错误提示**
   - 显示后端返回的错误信息
   - 网络错误提示
   - 动画效果

3. **登录状态管理**
   - 成功登录后保存用户信息到 localStorage
   - 自动跳转到首页
   - 通知父组件更新登录状态

### 访问登录页面

```
http://localhost:3000/login
```

---

## 🧪 测试

### 1. 运行后端测试

```bash
# 激活虚拟环境
.\.venv\Scripts\Activate.ps1

# 运行登录测试
python backend/test/test_login.py
```

测试内容：
- ✅ 创建测试用户
- ✅ 正确用户名密码登录
- ✅ 错误密码登录（应失败）
- ✅ 不存在的用户登录（应失败）
- ✅ 清理测试数据

### 2. 完整流程测试

#### Step 1: 启动后端

```bash
python backend/app.py
```

#### Step 2: 启动前端

```bash
cd frontend
npm run dev
```

#### Step 3: 注册用户

```bash
curl -X POST http://localhost:3001/api/users/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "demo_user",
    "password": "demo123",
    "interest": "AI, Machine Learning"
  }'
```

#### Step 4: 测试登录

访问 http://localhost:3000/login

输入：
- 用户名: `demo_user`
- 密码: `demo123`

点击登录，应该：
1. 显示"登录中..."
2. 成功后自动跳转到首页
3. 顶部导航栏显示"登出"按钮

---

## 🔧 技术实现

### 后端实现

1. **密码哈希**
```python
import hashlib

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

def verify_password(password: str, hashed: str) -> bool:
    return hash_password(password) == hashed
```

2. **登录验证**
```python
# 1. 查询用户
user = db.query_one(
    "SELECT user_id, username, password, interest FROM users WHERE username = %s",
    (username,)
)

# 2. 验证密码
if not verify_password(password, user['password']):
    return 401 错误

# 3. 返回用户信息（不包含密码）
return {
    'user_id': user['user_id'],
    'username': user['username'],
    'interest': user['interest']
}
```

### 前端实现

1. **API 调用**
```javascript
const response = await fetch('http://localhost:3001/api/users/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    username: formData.username,
    password: formData.password
  })
})
```

2. **状态管理**
```javascript
// 保存用户信息
localStorage.setItem('user', JSON.stringify(data.data))
localStorage.setItem('isLoggedIn', 'true')

// 通知父组件
onLogin()

// 跳转首页
navigate('/')
```

3. **错误处理**
```javascript
if (response.ok && data.status === 'success') {
  // 登录成功
} else {
  // 显示错误信息
  setError(data.message || '登录失败')
}
```

---

## 🔒 安全建议

### 当前实现（开发环境）

- ✅ 密码使用 SHA256 哈希存储
- ✅ 不在响应中返回密码
- ✅ 数据库连接使用参数化查询

### 生产环境建议

1. **使用更强的密码哈希**
```bash
pip install bcrypt
```

```python
import bcrypt

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode(), hashed.encode())
```

2. **添加 JWT Token**
```bash
pip install PyJWT
```

```python
import jwt
from datetime import datetime, timedelta

def generate_token(user_id: int) -> str:
    payload = {
        'user_id': user_id,
        'exp': datetime.utcnow() + timedelta(days=1)
    }
    return jwt.encode(payload, SECRET_KEY, algorithm='HS256')
```

3. **添加请求限制**
   - 防止暴力破解
   - 限制登录尝试次数
   - IP 黑名单

4. **HTTPS**
   - 生产环境必须使用 HTTPS
   - 防止密码在传输中被窃取

---

## 📊 API 端点总览

| 端点 | 方法 | 功能 |
|-----|------|------|
| `/api/users/register` | POST | 用户注册 |
| `/api/users/login` | POST | 用户登录 ✨ |
| `/api/users/<id>` | GET | 获取用户信息 |
| `/api/users/<id>/interest` | PUT | 更新用户兴趣 |
| `/api/users/list` | GET | 用户列表 |

---

## 🎯 下一步功能

### 建议扩展

1. **忘记密码**
   - 邮箱验证码
   - 密码重置

2. **记住我**
   - 7天免登录
   - 使用 Cookie

3. **第三方登录**
   - GitHub OAuth
   - Google 登录

4. **登出功能**
   - 清除 localStorage
   - 清除 Token

---

## 💡 常见问题

### Q: 登录后刷新页面会退出登录吗？

A: 不会。用户信息保存在 localStorage 中，刷新后会自动恢复登录状态。

### Q: 如何实现登出？

A: 添加登出功能：
```javascript
const handleLogout = () => {
  localStorage.removeItem('user')
  localStorage.removeItem('isLoggedIn')
  onLogout()
  navigate('/login')
}
```

### Q: 密码忘记了怎么办？

A: 目前没有忘记密码功能，可以直接在数据库中更新：
```sql
UPDATE users 
SET password = SHA2('new_password', 256) 
WHERE username = 'your_username';
```

---

## ✅ 完成！

现在你可以：
1. 启动后端：`python backend/app.py`
2. 启动前端：`cd frontend && npm run dev`
3. 访问登录页面：http://localhost:3000/login
4. 使用注册的账号登录测试

**登录功能已完整实现！** 🎉

