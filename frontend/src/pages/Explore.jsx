import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Toast from '../components/Toast'
import './Explore.css'

const truncate = (text = '', len = 120) => {
  if (!text) return ''
  return text.length > len ? `${text.slice(0, len)}...` : text
}

const mapRecommendation = (r, idx) => ({
  id: `${r.user_id}-${r.paper_id}-${idx}`,
  recommendation_id: r.id,
  user_id: r.user_id,
  paper_id: r.paper_id,
  title: r.title || '无标题',
  author: truncate(r.author || '未知作者', 40),
  date: (r.created_at || '').slice(0, 10) || new Date().toISOString().split('T')[0],
  summary: truncate(r.abstract || '暂无摘要', 180),
  blog_content: r.blog || '',
  pdf_url: r.pdf_url,
  liked: !!r.liked
})

const mapSearchResult = (r, idx) => ({
  id: `s-${r.paper_id}-${idx}`,
  recommendation_id: r.id,
  user_id: r.blog_user_id,
  paper_id: r.paper_id,
  title: r.title || '无标题',
  author: truncate(r.author || '未知作者', 40),
  date: new Date().toISOString().split('T')[0],
  summary: truncate(r.abstract || '暂无摘要', 180),
  blog_content: r.blog || '',
  pdf_url: r.pdf_url,
  liked: false
})

const recordBlogRead = (uid, paperId) => {
  if (!uid || !paperId) return
  const key = `scholarlink_read_history_${uid}`
  const current = JSON.parse(localStorage.getItem(key) || '[]')
  const next = Array.from(new Set([...current, paperId]))
  localStorage.setItem(key, JSON.stringify(next))
}

const BATCH_SIZE = 3

const getRecommendationBatch = (items, index = 0) => {
  if (items.length <= BATCH_SIZE) return items
  const maxStart = Math.max(items.length - BATCH_SIZE, 0)
  const start = Math.min(index * BATCH_SIZE, maxStart)
  return items.slice(start, start + BATCH_SIZE)
}

const LoadingState = () => (
  <div className="explore-loading-shell">
    <div className="loading-panel">
      <div className="loading-orbit">
        <div className="loading-spinner"></div>
      </div>
      <div>
        <p className="loading-kicker">ScholarLink AI</p>
        <h2>正在加载推荐博客...</h2>
        <p>正在为你匹配论文摘要、AI 博客和可对话的研究材料。</p>
      </div>
    </div>
    <div className="loading-skeleton-grid" aria-hidden="true">
      {[0, 1, 2].map(item => (
        <div className="skeleton-card" key={item}>
          <div className="skeleton-line wide"></div>
          <div className="skeleton-line"></div>
          <div className="skeleton-line short"></div>
          <div className="skeleton-actions">
            <span></span>
            <span></span>
          </div>
        </div>
      ))}
    </div>
  </div>
)

const Explore = ({ isLoggedIn }) => {
  const navigate = useNavigate()
  const [blogs, setBlogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState(null)
  const [query, setQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [recommendationPool, setRecommendationPool] = useState([])
  const [batchIndex, setBatchIndex] = useState(0)
  const [toast, setToast] = useState({ message: '', type: 'success' })

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
  }

  const applyRecommendationBatch = (items, nextIndex = 0) => {
    setRecommendationPool(items)
    setBatchIndex(nextIndex)
    setBlogs(getRecommendationBatch(items, nextIndex))
  }

  const fetchRecommendations = async (uid = userId) => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.append('limit', uid ? '20' : '9')
      if (uid) params.append('user_id', uid)

      const response = await fetch(`http://localhost:3001/recommendationOrchestrator/list?${params.toString()}`)
      const data = await response.json()

      if (response.ok && data.status === 'success' && data.data?.recommendations) {
        applyRecommendationBatch(data.data.recommendations.map(mapRecommendation))
      } else {
        applyRecommendationBatch([])
      }
    } catch (err) {
      console.error('获取推荐博客失败:', err)
      applyRecommendationBatch([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const userStr = isLoggedIn ? localStorage.getItem('user') : null
    let uid = null
    if (userStr) {
      try {
        const u = JSON.parse(userStr)
        uid = u?.user_id
      } catch (e) {
        console.warn('解析用户信息失败', e)
      }
    }
    setUserId(uid || null)

    fetchRecommendations(uid)
  }, [isLoggedIn])

  const fetchSearch = async () => {
    if (!query.trim()) {
      alert('请输入搜索内容')
      return
    }
    setIsSearching(true)
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.append('query', query.trim())
      params.append('topk', '5')
      const resp = await fetch(`http://localhost:3001/recommendationOrchestrator/search?${params.toString()}`)
      const data = await resp.json()
      setRecommendationPool([])
      setBatchIndex(0)
      if (resp.ok && data.status === 'success' && data.data?.results) {
        setBlogs(data.data.results.map(mapSearchResult))
      } else {
        setBlogs([])
      }
    } catch (e) {
      console.error('搜索失败', e)
      setBlogs([])
    } finally {
      setLoading(false)
    }
  }

  const changeRecommendationBatch = async () => {
    setQuery('')
    setIsSearching(false)
    if (recommendationPool.length > BATCH_SIZE) {
      const totalBatches = Math.ceil(recommendationPool.length / BATCH_SIZE)
      const nextIndex = (batchIndex + 1) % totalBatches
      setBatchIndex(nextIndex)
      setBlogs(getRecommendationBatch(recommendationPool, nextIndex))
      showToast('任务已完成：已换一批推荐')
      return
    }
    await fetchRecommendations()
    showToast('任务已完成：已换一批推荐')
  }

  const fetchRefreshStatus = async (uid) => {
    const params = new URLSearchParams()
    params.append('user_id', uid)
    const resp = await fetch(`http://localhost:3001/recommendationOrchestrator/refresh/status?${params.toString()}`)
    const data = await resp.json()
    if (resp.ok && data.status === 'success' && data.data) {
      return data.data
    }
    return null
  }

  const refreshRecommendations = async () => {
    if (!userId) {
      showToast('请先登录后再刷新推荐', 'error')
      return
    }

    setIsSearching(false)
    setQuery('')
    setLoading(true)
    const refreshStartedAt = Date.now()

    try {
      const response = await fetch('http://localhost:3001/recommendationOrchestrator/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId })
      })
      const data = await response.json()
      if (!response.ok || data.status !== 'success') {
        throw new Error(data.message || '刷新推荐失败')
      }
      showToast('正在为您生成推荐')

      const maxAttempts = 60
      for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
        if (attempt > 0) {
          await new Promise(resolve => setTimeout(resolve, 2000))
        }

        const jobStatus = await fetchRefreshStatus(userId)
        if (jobStatus?.state === 'failed') {
          showToast(jobStatus.message || '刷新推荐失败，请稍后重试', 'error')
          return
        }

        if (jobStatus?.state === 'completed' && (jobStatus.saved_pairs ?? 0) === 0) {
          showToast('目前没有论文可更新', 'error')
          return
        }

        const params = new URLSearchParams()
        params.append('limit', '20')
        params.append('user_id', userId)
        const listResponse = await fetch(`http://localhost:3001/recommendationOrchestrator/list?${params.toString()}`)
        const listData = await listResponse.json()

        if (listResponse.ok && listData.status === 'success' && listData.data?.recommendations) {
          const recommendations = listData.data.recommendations
          const hasFresh = recommendations.some(r => {
            if (!r.created_at) return false
            return new Date(r.created_at).getTime() >= refreshStartedAt - 3000
          })
          if (hasFresh) {
            applyRecommendationBatch(recommendations.map(mapRecommendation))
            showToast('任务已完成：推荐已更新')
            return
          }

          if (jobStatus?.state === 'completed' && (jobStatus.saved_pairs ?? 0) > 0) {
            applyRecommendationBatch(recommendations.map(mapRecommendation))
            showToast('任务已完成：推荐已更新')
            return
          }
        }
      }

      const jobStatus = await fetchRefreshStatus(userId)
      if (jobStatus?.state === 'completed' && (jobStatus.saved_pairs ?? 0) === 0) {
        showToast('目前没有论文可更新', 'error')
        return
      }

      const params = new URLSearchParams()
      params.append('limit', '20')
      params.append('user_id', userId)
      const listResponse = await fetch(`http://localhost:3001/recommendationOrchestrator/list?${params.toString()}`)
      const listData = await listResponse.json()
      if (listResponse.ok && listData.status === 'success' && listData.data?.recommendations) {
        applyRecommendationBatch(listData.data.recommendations.map(mapRecommendation))
      }
    } catch (err) {
      console.error('刷新推荐失败:', err)
      showToast(err.message || '刷新推荐失败，请稍后重试', 'error')
    } finally {
      setLoading(false)
    }
  }

  const openBlogMarkdown = (title, blogContent, fallbackPdf, paperId) => {
    if (!blogContent) {
      if (fallbackPdf) {
        window.open(fallbackPdf, '_blank')
        showToast('任务已完成：已打开原文 PDF')
      } else {
        showToast('暂无博客内容', 'error')
      }
      return
    }

    const win = window.open('', '_blank')
    if (!win) return
    const safeTitle = title || 'AI 博客'
    const html = `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>${safeTitle}</title>
          <style>
            :root {
              color: #333;
              background: #f8f9fa;
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
            }
            * { box-sizing: border-box; }
            body {
              margin: 0;
              min-height: 100vh;
              background:
                radial-gradient(circle at top left, rgba(102, 126, 234, 0.14), transparent 34rem),
                linear-gradient(180deg, #ffffff 0%, #f8f9fa 45%, #f3f1fb 100%);
            }
            .reader-shell {
              width: min(1120px, calc(100% - 42px));
              margin: 0 auto;
              padding: 34px 0 64px;
            }
            .brand {
              margin-bottom: 16px;
              font-weight: 800;
              font-size: 22px;
              letter-spacing: -0.03em;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              -webkit-background-clip: text;
              color: transparent;
            }
            .reader-layout {
              display: grid;
              grid-template-columns: 220px minmax(0, 1fr);
              gap: 22px;
              align-items: start;
            }
            .reader-rail {
              position: sticky;
              top: 24px;
              padding: 18px 16px;
              border: 1px solid rgba(102, 126, 234, 0.14);
              border-radius: 18px;
              background: rgba(255, 255, 255, 0.72);
              box-shadow: 0 16px 36px rgba(102, 126, 234, 0.08);
            }
            .rail-title {
              margin: 0 0 12px;
              color: #667eea;
              font-size: 14px;
              font-weight: 800;
            }
            .rail-list {
              display: grid;
              gap: 4px;
            }
            .rail-empty {
              color: #8a90a0;
              font-size: 13px;
              line-height: 1.6;
            }
            .rail-item {
              display: block;
              padding: 7px 8px;
              border-radius: 10px;
              color: #5d6170;
              font-size: 13px;
              line-height: 1.35;
              text-decoration: none;
              transition: color 0.2s ease, background 0.2s ease;
            }
            .rail-item:hover {
              color: #667eea;
              background: rgba(102, 126, 234, 0.08);
            }
            .rail-item.level-3 {
              padding-left: 18px;
              color: #757b8b;
              font-size: 12px;
            }
            .article-card {
              overflow: hidden;
              border: 1px solid rgba(102, 126, 234, 0.16);
              border-radius: 20px;
              background: rgba(255, 255, 255, 0.94);
              box-shadow: 0 20px 56px rgba(102, 126, 234, 0.1);
            }
            .article-hero {
              padding: 34px 42px 26px;
              border-bottom: 1px solid #ececf5;
              background:
                linear-gradient(135deg, rgba(102, 126, 234, 0.08), rgba(118, 75, 162, 0.06)),
                #ffffff;
            }
            .article-hero h1 {
              margin: 0;
              max-width: 820px;
              color: #2f3137;
              font-size: clamp(28px, 4vw, 44px);
              line-height: 1.16;
              letter-spacing: -0.03em;
            }
            .article-meta {
              display: flex;
              flex-wrap: wrap;
              gap: 10px;
              margin-top: 14px;
              color: #667085;
              font-size: 13px;
            }
            .article-meta span {
              padding: 6px 10px;
              border-radius: 999px;
              background: rgba(255, 255, 255, 0.78);
              border: 1px solid rgba(102, 126, 234, 0.14);
            }
            .article-body {
              padding: 32px 42px 48px;
              font-size: 16px;
              line-height: 1.72;
            }
            .article-body h1:first-child { display: none; }
            .article-body h2 {
              margin: 1.8em 0 0.65em;
              color: #2f3137;
              font-size: 26px;
              line-height: 1.25;
              letter-spacing: -0.02em;
            }
            .article-body h3 {
              margin: 1.55em 0 0.55em;
              color: #333;
              font-size: 20px;
            }
            .article-body p { margin: 0.78em 0; }
            .article-body ul,
            .article-body ol {
              margin: 0.75em 0;
              padding-left: 1.35em;
            }
            .article-body li {
              margin: 0.25em 0;
            }
            .article-body strong { color: #2f3137; }
            .article-body a { color: #667eea; }
            .article-body blockquote {
              margin: 22px 0;
              padding: 18px 20px;
              border-left: 4px solid #667eea;
              border-radius: 14px;
              background: #f3f1ff;
              color: #4d4f5c;
            }
            .article-body pre {
              overflow: auto;
              padding: 18px;
              border-radius: 16px;
              background: #26243b;
              color: #f8f9fa;
            }
            .article-body code {
              padding: 2px 6px;
              border-radius: 7px;
              background: #f3f1ff;
              color: #5a4db3;
              font-size: 0.92em;
            }
            .article-body pre code {
              padding: 0;
              background: transparent;
              color: inherit;
            }
            @media (max-width: 900px) {
              .reader-shell { width: min(100% - 28px, 760px); }
              .reader-layout { grid-template-columns: 1fr; }
              .reader-rail { position: static; }
              .article-hero,
              .article-body { padding-left: 24px; padding-right: 24px; }
            }
          </style>
          <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
        </head>
        <body>
          <main class="reader-shell">
            <div class="brand">ScholarLink AI</div>
            <div class="reader-layout">
              <aside class="reader-rail">
                <p class="rail-title">文章目录</p>
                <nav class="rail-list" id="toc">
                  <span class="rail-empty">正在生成目录...</span>
                </nav>
              </aside>
              <article class="article-card" id="article">
                <header class="article-hero">
                  <h1>${safeTitle}</h1>
                  <div class="article-meta">
                    <span>AI Blog</span>
                    <span>${new Date().toLocaleDateString('zh-CN')}</span>
                  </div>
                </header>
                <div class="article-body" id="app"></div>
              </article>
            </div>
          </main>
          <script>
            const md = ${JSON.stringify(blogContent)}
            const app = document.getElementById('app')
            app.innerHTML = marked.parse(md)

            const first = app.firstElementChild
            const firstText = first ? first.textContent.trim() : ''
            if (
              first &&
              first.tagName === 'P' &&
              (firstText.startsWith('好的，作为') || firstText.includes('高质量的技术博客'))
            ) {
              const next = first.nextElementSibling
              first.remove()
              if (next && next.tagName === 'HR') next.remove()
            }

            const duplicateTitle = app.querySelector('h1')
            if (duplicateTitle && duplicateTitle.textContent.trim() === ${JSON.stringify(safeTitle)}.trim()) {
              duplicateTitle.remove()
            }

            const toc = document.getElementById('toc')
            const headings = Array.from(app.querySelectorAll('h2, h3')).filter(heading => heading.textContent.trim())
            if (!headings.length) {
              toc.innerHTML = '<span class="rail-empty">正文未检测到分节标题</span>'
            } else {
              toc.innerHTML = ''
              headings.forEach((heading, index) => {
                const id = 'section-' + index
                heading.id = id
                const link = document.createElement('a')
                link.className = 'rail-item level-' + heading.tagName.slice(1)
                link.href = '#' + id
                link.textContent = heading.textContent.trim()
                toc.appendChild(link)
              })
            }
          </script>
        </body>
      </html>
    `
    win.document.write(html)
    win.document.close()
    recordBlogRead(userId, paperId)
    showToast('任务已完成：已打开博客')
  }

  const toggleLike = async (paperId, liked) => {
    if (!userId) {
      showToast('请先登录再收藏', 'error')
      return
    }
    try {
      const resp = await fetch('http://localhost:3001/recommendationOrchestrator/like', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          paper_id: paperId,
          action: liked ? 'unlike' : 'like'
        })
      })
      const data = await resp.json()
      if (!resp.ok || data.status !== 'success') {
        throw new Error(data.message || '操作失败')
      }
      setBlogs(prev =>
        prev.map(b => b.paper_id === paperId ? { ...b, liked: !liked } : b)
      )
      setRecommendationPool(prev =>
        prev.map(b => b.paper_id === paperId ? { ...b, liked: !liked } : b)
      )
      showToast(liked ? '任务已完成：已取消收藏' : '任务已完成：已收藏')
    } catch (e) {
      console.error('收藏操作失败', e)
      showToast('收藏操作失败，请稍后重试', 'error')
    }
  }

  const openPdf = (pdfUrl) => {
    if (!pdfUrl) {
      showToast('暂无 PDF 链接', 'error')
      return
    }
    window.open(pdfUrl, '_blank')
    showToast('任务已完成：已打开原文 PDF')
  }

  if (loading) {
    return (
      <div className="explore-container explore-loading-container">
        <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: 'success' })} />
        <LoadingState />
      </div>
    )
  }

  return (
    <div className="explore-container">
      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: 'success' })} />
      <div className="explore-header">
        <span className="explore-eyebrow">Research Discovery</span>
        <h1>{isSearching ? '搜索结果' : (isLoggedIn ? '个性化推荐' : '论文库精选')}</h1>
        <p>{isSearching ? '基于语义搜索的论文博客匹配结果' : (isLoggedIn ? '基于兴趣与相似度，为你推荐可阅读、可收藏、可对话的论文博客' : '先浏览论文库中的精选内容，登录后可获得个性化推荐和收藏能力。')}</p>
        {!isLoggedIn && !isSearching && (
          <div className="guest-notice">
            <div>
              <strong>推荐登录使用</strong>
              <span>登录后可保存收藏、设置研究兴趣，并获得更贴合你的论文推荐。</span>
            </div>
            <button type="button" onClick={() => navigate('/login')}>去登录</button>
          </div>
        )}
        <div className="explore-search">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="输入关键词进行语义搜索"
          />
          <button className="btn-primary" onClick={fetchSearch}>搜索</button>
          <button className="btn-secondary" onClick={changeRecommendationBatch}>换一批</button>
          {isLoggedIn && (
            <button className="btn-secondary" onClick={refreshRecommendations}>刷新推荐</button>
          )}
        </div>
      </div>

      <div className="blogs-grid">
        {blogs.length === 0 && (
          <div className="empty-state">
            <h3>{isLoggedIn && !isSearching ? '正在为您生成推荐' : '暂无推荐数据'}</h3>
            <p>{isLoggedIn && !isSearching ? '推荐论文和 AI 博客正在后台生成，稍后刷新即可查看。' : '换一个关键词，或回到推荐列表重新加载。'}</p>
          </div>
        )}
        {blogs.map(blog => (
          <div key={blog.id} className="blog-card">
            <div className="blog-header">
              <h3 className="blog-title">{blog.title}</h3>
              <div className="blog-meta">
                <span className="author">作者 {blog.author}</span>
                <span className="date">{blog.date}</span>
              </div>
            </div>
            <p className="blog-summary">{blog.summary}</p>
            {blog.liked && <div className="tag liked-tag">已收藏</div>}
            <div className="blog-actions">
              <button
                className="btn-primary"
                onClick={() => openBlogMarkdown(blog.title, blog.blog_content, blog.pdf_url, blog.paper_id)}
              >
                阅读博客
              </button>
              <button
                className="btn-ai"
                onClick={() => navigate(`/chat/${blog.recommendation_id}`)}
              >
                AI 对话
              </button>
              <button
                className="btn-secondary"
                onClick={() => openPdf(blog.pdf_url)}
              >
                查看原文 PDF
              </button>
              <button
                className="btn-secondary"
                onClick={() => toggleLike(blog.paper_id, blog.liked)}
              >
                {blog.liked ? '取消收藏' : '收藏'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default Explore
