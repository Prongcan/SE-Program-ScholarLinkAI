# Papers API 使用说明

## 重要提示：路由前缀变更

**所有接口已移除 `/api` 前缀**

- **旧路径**：`http://localhost:3001/api/papers/...`
- **新路径**：`http://localhost:3001/papers/...`

所有接口现在直接在根路径下，不再需要 `/api` 前缀。

---

## 基础信息

- **基础URL**: `http://localhost:3001`
- **命名空间**: `/papers`
- **完整基础路径**: `http://localhost:3001/papers`

## API 接口列表

### 1. 抓取论文

**接口**: `POST /papers/fetch`

**描述**: 从 arXiv 抓取前两天到前一天的 CS 类论文，并自动保存到数据库中。

**请求体** (可选):
```json
{
  "max_results": 10  // 可选，限制抓取数量，不指定则获取所有论文
}
```

**响应示例**:
```json
{
  "message": "成功抓取并保存 5 篇论文",
  "status": "success",
  "timestamp": "2024-01-01T12:00:00",
  "data": {
    "fetched_count": 5,
    "saved_count": 5,
    "failed_count": 0,
    "papers": [
      {
        "paper_id": 1,
        "title": "论文标题示例"
      }
    ]
  }
}
```

**状态码**:
- `200`: 抓取成功
- `500`: 服务器内部错误

**注意**: 
- 如果论文已存在（通过标题判断），会自动跳过
- 只返回前10篇论文的基本信息

---

### 2. 获取论文列表

**接口**: `GET /papers/list`

**描述**: 获取论文列表，支持分页查询。

**查询参数**:
- `page` (integer, 可选): 页码，默认为 1
- `page_size` (integer, 可选): 每页数量，默认为 20

**请求示例**:
```
GET /papers/list?page=1&page_size=10
```

**响应示例**:
```json
{
  "message": "获取论文列表成功",
  "status": "success",
  "timestamp": "2024-01-01T12:00:00",
  "data": {
    "papers": [
      {
        "paper_id": 1,
        "title": "论文标题",
        "author": "作者1, 作者2",
        "abstract": "论文摘要",
        "pdf_url": "https://arxiv.org/pdf/xxx.pdf"
      }
    ],
    "pagination": {
      "page": 1,
      "page_size": 10,
      "total": 100,
      "total_pages": 10
    }
  }
}
```

**状态码**:
- `200`: 获取成功
- `500`: 服务器内部错误

---

### 3. 获取论文详情

**接口**: `GET /papers/<paper_id>`

**描述**: 根据 paper_id 获取单篇论文的完整信息。

**路径参数**:
- `paper_id` (integer): 论文ID

**响应示例**:
```json
{
  "message": "获取论文详情成功",
  "status": "success",
  "timestamp": "2024-01-01T12:00:00",
  "data": {
    "paper": {
      "paper_id": 1,
      "title": "论文标题",
      "author": "作者1, 作者2",
      "abstract": "论文摘要",
      "pdf_url": "https://arxiv.org/pdf/xxx.pdf"
    }
  }
}
```

**状态码**:
- `200`: 获取成功
- `404`: 论文不存在
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

- **404 Not Found**: 资源不存在
- **500 Internal Server Error**: 服务器内部错误

## 注意事项

1. **论文抓取**: 从 arXiv 抓取 CS 类论文，时间窗口为前两天到前一天
2. **去重机制**: 通过标题判断论文是否已存在，避免重复保存
3. **分页**: 列表接口支持分页，默认每页20条记录
4. **数据字段**: 论文数据包含 `paper_id`, `title`, `author`, `abstract`, `pdf_url` 字段

