# Login API 使用说明

## 重要提示：路由前缀变更

**所有接口已移除 `/api` 前缀**

- **旧路径**：`http://localhost:3001/api/users/login`
- **新路径**：`http://localhost:3001/users/login`

登录接口现在直接在根路径下，不再需要 `/api` 前缀。

---

## 基础信息

- **基础URL**: `http://localhost:3001`
- **接口路径**: `/users/login`
- **完整URL**: `http://localhost:3001/users/login`

## 用户登录接口

### 接口详情

**接口**: `POST /users/login`

**描述**: 验证用户名和密码，返回用户信息（不包含密码）。

**请求体**:
```json
{
  "username": "testuser",
  "password": "password123"
}
```

**请求头**:
```
Content-Type: application/json
```

**响应示例（成功）**:
```json
{
  "message": "登录成功",
  "status": "success",
  "timestamp": "2024-01-01T12:00:00",
  "data": {
    "user_id": 1,
    "username": "testuser",
    "interest": "Machine Learning, NLP"
  }
}
```

**响应示例（失败）**:
```json
{
  "message": "用户名或密码错误",
  "status": "error",
  "timestamp": "2024-01-01T12:00:00",
  "data": null
}
```

## 状态码说明

- **200 OK**: 登录成功
- **400 Bad Request**: 请求数据格式错误或用户名/密码为空
- **401 Unauthorized**: 用户名或密码错误
- **500 Internal Server Error**: 服务器内部错误

## 使用示例

### cURL 示例

```bash
curl -X POST http://localhost:3001/users/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "password": "password123"
  }'
```

### JavaScript (fetch) 示例

```javascript
fetch('http://localhost:3001/users/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    username: 'testuser',
    password: 'password123'
  })
})
.then(response => response.json())
.then(data => {
  if (data.status === 'success') {
    console.log('登录成功:', data.data);
    // 保存用户信息到本地存储
    localStorage.setItem('user', JSON.stringify(data.data));
  } else {
    console.error('登录失败:', data.message);
  }
})
.catch(error => {
  console.error('网络错误:', error);
});
```

### Python 示例

```python
import requests

url = "http://localhost:3001/users/login"
data = {
    "username": "testuser",
    "password": "password123"
}

response = requests.post(url, json=data)
result = response.json()

if result["status"] == "success":
    print("登录成功:", result["data"])
    user_id = result["data"]["user_id"]
else:
    print("登录失败:", result["message"])
```

## 响应格式

所有接口都遵循统一的响应格式：

```json
{
  "message": "操作结果描述",
  "status": "success|error",
  "timestamp": "ISO 8601 格式的时间戳",
  "data": {}  // 具体数据，失败时为 null
}
```

## 安全注意事项

1. **密码传输**: 密码通过 HTTPS 传输（生产环境必须使用）
2. **密码存储**: 密码使用 SHA256 哈希存储（生产环境建议使用 bcrypt）
3. **会话管理**: 当前版本不包含会话管理，客户端需要自行保存用户信息
4. **错误信息**: 登录失败时统一返回"用户名或密码错误"，不区分是用户名错误还是密码错误

## 相关接口

- **用户注册**: `POST /users/register` - 创建新用户账号
- **获取用户信息**: `GET /users/<user_id>` - 获取用户详情
- **更新用户兴趣**: `PUT /users/<user_id>/interest` - 更新用户兴趣

更多详细信息请参考 [USERS_API_使用说明.md](./USERS_API_使用说明.md)

