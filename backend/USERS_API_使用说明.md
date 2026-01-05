# Users API 使用说明

## 重要提示：路由前缀变更

**所有接口已移除 `/api` 前缀**

- **旧路径**：`http://localhost:3001/api/users/...`
- **新路径**：`http://localhost:3001/users/...`

所有接口现在直接在根路径下，不再需要 `/api` 前缀。

---

## 基础信息

- **基础URL**: `http://localhost:3001`
- **命名空间**: `/users`
- **完整基础路径**: `http://localhost:3001/users`

## API 接口列表

### 1. 用户注册

**接口**: `POST /users/register`

**描述**: 创建新用户账号，如果提供了兴趣信息，会自动触发兴趣embedding的生成。

**请求体**:
```json
{
  "username": "testuser",
  "password": "password123",
  "interest": "Machine Learning, NLP"  // 可选
}
```

**响应示例**:
```json
{
  "message": "用户注册成功",
  "status": "success",
  "timestamp": "2024-01-01T12:00:00",
  "data": {
    "user_id": 1,
    "username": "testuser",
    "interest": "Machine Learning, NLP"
  }
}
```

**状态码**:
- `200`: 注册成功
- `400`: 请求数据格式错误或用户名/密码为空
- `409`: 用户名已存在
- `500`: 服务器内部错误

---

### 2. 用户登录

**接口**: `POST /users/login`

**描述**: 验证用户名和密码，返回用户信息。

**请求体**:
```json
{
  "username": "testuser",
  "password": "password123"
}
```

**响应示例**:
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

**状态码**:
- `200`: 登录成功
- `400`: 请求数据格式错误或用户名/密码为空
- `401`: 用户名或密码错误
- `500`: 服务器内部错误

---

### 3. 获取用户信息

**接口**: `GET /users/<user_id>`

**描述**: 根据 user_id 获取用户详情（不包含密码）。

**路径参数**:
- `user_id` (integer): 用户ID

**响应示例**:
```json
{
  "message": "获取用户信息成功",
  "status": "success",
  "timestamp": "2024-01-01T12:00:00",
  "data": {
    "user": {
      "user_id": 1,
      "username": "testuser",
      "interest": "Machine Learning, NLP"
    }
  }
}
```

**状态码**:
- `200`: 获取成功
- `404`: 用户不存在
- `500`: 服务器内部错误

---

### 4. 更新用户兴趣

**接口**: `PUT /users/<user_id>/interest`

**描述**: 修改用户的研究兴趣领域。**更新兴趣时会自动触发兴趣embedding的更新**。

**路径参数**:
- `user_id` (integer): 用户ID

**请求体**:
```json
{
  "interest": "Deep Learning, Computer Vision"
}
```

**响应示例**:
```json
{
  "message": "用户兴趣更新成功",
  "status": "success",
  "timestamp": "2024-01-01T12:00:00",
  "data": {
    "user_id": 1,
    "interest": "Deep Learning, Computer Vision",
    "updated_rows": 1
  }
}
```

**状态码**:
- `200`: 更新成功（即使embedding更新失败，兴趣文本也会保存）
- `400`: 请求数据格式错误或兴趣字段为空
- `404`: 用户不存在
- `500`: 服务器内部错误

**注意**: 如果embedding更新失败（如API配额限制），兴趣文本仍会保存，可以在后台任务中重试。

---

### 5. 获取用户兴趣

**接口**: `GET /users/<user_id>/interest`

**描述**: 查询用户的研究兴趣领域。

**路径参数**:
- `user_id` (integer): 用户ID

**响应示例**:
```json
{
  "message": "获取用户兴趣成功",
  "status": "success",
  "timestamp": "2024-01-01T12:00:00",
  "data": {
    "user_id": 1,
    "username": "testuser",
    "interest": "Machine Learning, NLP"
  }
}
```

**状态码**:
- `200`: 获取成功
- `404`: 用户不存在
- `500`: 服务器内部错误

---

### 6. 获取用户列表

**接口**: `GET /users/list`

**描述**: 获取用户列表，支持分页查询（不返回密码）。

**查询参数**:
- `page` (integer, 可选): 页码，默认为 1
- `page_size` (integer, 可选): 每页数量，默认为 20

**请求示例**:
```
GET /users/list?page=1&page_size=10
```

**响应示例**:
```json
{
  "message": "获取用户列表成功",
  "status": "success",
  "timestamp": "2024-01-01T12:00:00",
  "data": {
    "users": [
      {
        "user_id": 1,
        "username": "testuser",
        "interest": "Machine Learning, NLP"
      }
    ],
    "pagination": {
      "page": 1,
      "page_size": 10,
      "total": 50,
      "total_pages": 5
    }
  }
}
```

**状态码**:
- `200`: 获取成功
- `500`: 服务器内部错误

---

### 7. 删除用户

**接口**: `DELETE /users/<user_id>`

**描述**: 删除指定用户（及其相关推荐）。

**路径参数**:
- `user_id` (integer): 用户ID

**响应示例**:
```json
{
  "message": "用户删除成功",
  "status": "success",
  "timestamp": "2024-01-01T12:00:00",
  "data": {
    "deleted_user_id": 1,
    "deleted_rows": 1
  }
}
```

**状态码**:
- `200`: 删除成功
- `404`: 用户不存在
- `500`: 服务器内部错误

---

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

## 错误处理

- **400 Bad Request**: 请求参数错误
- **401 Unauthorized**: 认证失败（登录时）
- **404 Not Found**: 资源不存在
- **409 Conflict**: 资源冲突（如用户名已存在）
- **500 Internal Server Error**: 服务器内部错误

## 注意事项

1. **密码安全**: 密码使用 SHA256 哈希存储（生产环境建议使用 bcrypt）
2. **Embedding自动更新**: 注册和更新兴趣时会自动触发embedding生成，用于论文推荐
3. **配额限制**: 如果embedding API遇到配额限制，兴趣文本仍会保存，可以在后台重试
4. **分页**: 列表接口支持分页，默认每页20条记录

