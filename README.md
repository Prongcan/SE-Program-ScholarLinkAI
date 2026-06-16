# ScholarLink AI

ScholarLink AI 是一个面向学术论文发现与推荐的全栈项目。项目通过后端服务抓取 arXiv 论文、保存论文元数据、基于用户研究兴趣生成推荐内容，并在前端提供探索、收藏、个人资料、登录注册和论文问答等交互页面。

## 功能概览

- 论文抓取：从 arXiv 获取计算机科学相关论文并写入 MySQL。
- 用户管理：支持注册、登录、查看用户信息、更新研究兴趣。
- 个性化推荐：根据用户兴趣向量与论文向量生成推荐结果。
- AI 博客生成：为推荐论文生成面向用户阅读的解释性内容。
- 收藏管理：支持用户收藏或取消收藏推荐论文。
- 论文问答：围绕推荐论文摘要进行多轮 AI 对话，并保存对话历史。
- API 文档：后端提供 Swagger UI，便于查看和调试接口。

## 技术栈

### 后端

- Python
- Flask
- Flask-RESTX
- PyMySQL
- FAISS
- sentence-transformers
- OpenAI-compatible API / OpenRouter
- MySQL

### 前端

- React 18
- React Router DOM
- Vite
- CSS

## 项目结构

```text
SE-Program-ScholarLinkAI/
├── backend/                 # Flask 后端服务
│   ├── api_router/          # API 路由
│   ├── entity/              # 实体模型
│   ├── orchestrator/        # 抓取、推荐等流程编排
│   ├── service/             # 数据库、搜索、向量、论文抓取和 AI 服务
│   ├── test/                # 后端测试脚本
│   ├── app.py               # 后端入口
│   ├── config.py            # Flask 基础配置
│   └── requirements.txt     # Python 依赖
├── frontend/                # React 前端应用
│   ├── src/
│   │   ├── components/      # 公共组件
│   │   └── pages/           # 页面组件
│   ├── package.json
│   └── vite.config.js
├── config.yaml              # 项目运行配置
└── README.md
```

## 环境准备

请先确认本机已安装：

- Python 3.9 或更高版本
- Node.js 16 或更高版本
- MySQL 8.x

本地安装 MySQL 可参考原教程链接：

[本地部署 MySQL 数据库教程](https://zhuanlan.zhihu.com/p/654087404)

按照当前项目配置，建议本地 MySQL 使用以下账户信息：

```text
host: localhost
port: 3306
database: scholarlink_ai
user: root
password: 111111
```

如果使用不同的数据库用户名或密码，请同步修改根目录下的 `config.yaml`，或通过环境变量覆盖相关配置。

## 后端启动

### 1. 创建并激活虚拟环境

在项目根目录执行：

Windows PowerShell：

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

macOS / Linux：

```bash
python -m venv .venv
source .venv/bin/activate
```

激活成功后，终端通常会出现 `(.venv)` 前缀。后续后端命令建议都在该虚拟环境中执行。

### 2. 安装依赖

```bash
cd backend
pip install -r requirements.txt
```

### 3. 初始化数据库

回到项目根目录后执行：

```bash
cd ..
python -m backend.service.init_db
```

该命令会根据配置创建 `scholarlink_ai` 数据库及所需数据表。

如果你的 MySQL root 密码就是默认的 `111111`，可以直接运行。

若不是默认密码，初始化脚本会提示你在命令行输入当前 MySQL 密码；输入正确后也可以正常初始化项目。

```text
Save this MySQL password to local .env for backend runs? [y/N]:
```

这里输入 `y` 后，项目会把密码保存到本地 `.env`，后续启动后端时会自动使用该密码，不需要反复输入。

初始化完成后，脚本会确保存在一个本地测试账号：

```text
username: test
password: test123456
interest: Machine Learning, Deep Learning, Natural Language Processing, Computer Vision
```

### 4. 启动后端服务

```bash
cd backend
python app.py
```

默认服务地址：

- API 根路径：`http://localhost:3001/`
- Swagger 文档：`http://localhost:3001/docs/`
- 健康检查：`http://localhost:3001/health`

## 前端启动

### 1. 安装依赖

```bash
cd frontend
npm install
```

### 2. 启动开发服务器

```bash
npm run dev
```

默认前端地址：

```text
http://localhost:3000
```

### 3. 构建生产版本

```bash
npm run build
```

## 常用 API

后端启动后，可以通过 Swagger UI 查看完整接口。以下是主要接口分组：

| 模块 | 接口 | 说明 |
| --- | --- | --- |
| 系统 | `GET /health` | 健康检查 |
| 论文 | `POST /papers/fetch` | 抓取并保存论文 |
| 论文 | `GET /papers/list` | 获取论文列表 |
| 论文 | `GET /papers/<paper_id>` | 获取论文详情 |
| 用户 | `POST /users/register` | 用户注册 |
| 用户 | `POST /users/login` | 用户登录 |
| 用户 | `GET /users/list` | 获取用户列表 |
| 用户 | `GET /users/<user_id>` | 获取用户详情 |
| 用户 | `PUT /users/<user_id>/interest` | 更新用户研究兴趣 |
| 推荐 | `POST /recommendationOrchestrator/` | 批量生成推荐博客 |
| 推荐 | `GET /recommendationOrchestrator/list` | 获取推荐列表 |
| 推荐 | `POST /recommendationOrchestrator/like` | 收藏或取消收藏论文 |
| 推荐 | `GET /recommendationOrchestrator/favorites` | 获取用户收藏列表 |
| 推荐 | `GET /recommendationOrchestrator/search` | 语义搜索论文 |
| 抓取 | `POST /fetchOrchestrator/` | 通过编排器抓取论文 |
| 对话 | `POST /chat/send` | 向 AI 发送论文相关问题 |
| 对话 | `GET /chat/history/<recommendation_id>` | 获取推荐论文的对话历史 |

## 数据库表

数据库初始化脚本会创建以下主要数据表：

| 表名 | 说明 |
| --- | --- |
| `papers` | 论文元数据，包括标题、作者、摘要和 PDF 链接 |
| `users` | 用户账户、密码哈希和研究兴趣 |
| `recommendations` | 用户与论文的推荐关系及生成内容 |
| `paper_embeddings` | 论文向量 |
| `interest_embeddings` | 用户兴趣向量 |
| `paper_liked` | 用户收藏论文关系 |
| `chat_history` | 论文问答对话历史 |

## 配置说明

项目根目录的 `config.yaml` 包含数据库、模型服务、Embedding 服务和代理配置。运行前请重点检查：

- `database`：MySQL 连接信息。
- `openai`：用于生成回答或博客内容的 OpenAI-compatible 服务配置。
- `openrouter`：用于 Embedding 的 OpenRouter 配置。
- `proxy`：如需通过本地代理访问外部模型服务，可在此配置。

注意：当前配置文件包含 API Key 字段。正式协作或公开仓库中应改为使用 `.env` 或部署平台的环境变量管理密钥，避免将真实密钥提交到版本库。

## 测试

后端测试脚本位于 `backend/test/`。可根据需要运行单个测试文件，例如：

```bash
python backend/test/test_all_apis.py
```

部分测试依赖本地 MySQL、后端服务和外部模型服务，请先确认相关服务已启动并完成配置。

## 开发备注

- 后端默认监听 `3001` 端口，前端默认监听 `3000` 端口。
- 前端开发时需要后端服务可用，否则涉及用户、推荐、收藏和对话的功能可能无法正常返回数据。
- 数据库结构以 `backend/service/init_db.py` 为准。
- 若修改数据库表结构，请同步更新初始化脚本、相关服务代码和本文档。
