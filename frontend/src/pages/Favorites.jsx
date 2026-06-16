import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Toast from '../components/Toast'
import './Favorites.css'

const truncate = (text = '', len = 180) => {
  if (!text) return ''
  return text.length > len ? `${text.slice(0, len)}...` : text
}

const recordBlogRead = (uid, paperId) => {
  if (!uid || !paperId) return
  const key = `scholarlink_read_history_${uid}`
  const current = JSON.parse(localStorage.getItem(key) || '[]')
  const next = Array.from(new Set([...current, paperId]))
  localStorage.setItem(key, JSON.stringify(next))
}

const buildReaderHtml = (safeTitle, blogContent) => `
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
        .rail-list { display: grid; gap: 4px; }
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
        .article-body li { margin: 0.25em 0; }
        .article-body strong { color: #2f3137; }
        .article-body a { color: #667eea; }
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
            <nav class="rail-list" id="toc"><span class="rail-empty">正在生成目录...</span></nav>
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
        if (first && first.tagName === 'P' && (firstText.startsWith('好的，作为') || firstText.includes('高质量的技术博客'))) {
          const next = first.nextElementSibling
          first.remove()
          if (next && next.tagName === 'HR') next.remove()
        }
        const duplicateTitle = app.querySelector('h1')
        if (duplicateTitle && duplicateTitle.textContent.trim() === ${JSON.stringify(safeTitle)}.trim()) duplicateTitle.remove()
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

const GuestPrompt = ({ kicker, title, description, primary, secondary, primaryTo, secondaryTo }) => (
  <section className="guest-prompt">
    <div className="guest-prompt-mark">SL</div>
    <span className="page-kicker">{kicker}</span>
    <h2>{title}</h2>
    <p>{description}</p>
    <div className="guest-actions">
      <Link to={primaryTo} className="btn-login">{primary}</Link>
      <Link to={secondaryTo} className="btn-ghost">{secondary}</Link>
    </div>
  </section>
)

const FavoritesLoading = () => (
  <div className="favorites-loading-shell">
    <div className="loading-panel">
      <div className="loading-orbit">
        <div className="loading-spinner"></div>
      </div>
      <div>
        <p className="loading-kicker">ScholarLink AI</p>
        <h2>正在加载收藏...</h2>
        <p>正在整理你的论文博客资料库。</p>
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

const Favorites = ({ isLoggedIn }) => {
  const [favs, setFavs] = useState([])
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState(null)
  const [toast, setToast] = useState({ message: '', type: 'success' })

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
  }

  useEffect(() => {
    if (!isLoggedIn) {
      setLoading(false)
      return
    }

    const userStr = localStorage.getItem('user')
    let uid = null
    if (userStr) {
      try {
        uid = JSON.parse(userStr)?.user_id
      } catch (e) {
        console.warn('解析用户信息失败', e)
      }
    }
    setUserId(uid)
    if (!uid) {
      setLoading(false)
      return
    }

    const fetchFavs = async () => {
      setLoading(true)
      try {
        const resp = await fetch(`http://localhost:3001/recommendationOrchestrator/favorites?user_id=${uid}&limit=50`)
        const data = await resp.json()
        if (resp.ok && data.status === 'success' && data.data?.favorites) {
          const list = data.data.favorites.map((r, idx) => ({
            id: `${r.user_id}-${r.paper_id}-${idx}`,
            user_id: r.user_id,
            paper_id: r.paper_id,
            title: r.title || '无标题',
            author: truncate(r.author || '未知作者', 40),
            date: (r.liked_at || '').slice(0, 10) || (r.blog_created_at || '').slice(0, 10),
            summary: truncate(r.abstract || '暂无摘要', 180),
            blog_content: r.blog || '',
            pdf_url: r.pdf_url,
            liked: true
          }))
          setFavs(list)
        } else {
          setFavs([])
        }
      } catch (e) {
        console.error('获取收藏失败', e)
        setFavs([])
        showToast('收藏列表加载失败', 'error')
      } finally {
        setLoading(false)
      }
    }

    fetchFavs()
  }, [isLoggedIn])

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
    win.document.write(buildReaderHtml(safeTitle, blogContent))
    win.document.close()
    recordBlogRead(userId, paperId)
    showToast('任务已完成：已打开博客')
  }

  const cancelLike = async (paperId) => {
    if (!userId) {
      showToast('请先登录', 'error')
      return
    }
    try {
      const resp = await fetch('http://localhost:3001/recommendationOrchestrator/like', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          paper_id: paperId,
          action: 'unlike'
        })
      })
      const data = await resp.json()
      if (!resp.ok || data.status !== 'success') {
        throw new Error(data.message || '取消收藏失败')
      }
      setFavs(prev => prev.filter(f => f.paper_id !== paperId))
      showToast('任务已完成：已取消收藏')
    } catch (e) {
      console.error('取消收藏失败', e)
      showToast('取消收藏失败，请稍后重试', 'error')
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

  if (!isLoggedIn) {
    return (
      <div className="favorites-container">
        <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: 'success' })} />
        <GuestPrompt
          kicker="Saved Library"
          title="登录后管理收藏"
          description="收藏论文、保留 AI 博客和快速回到原文 PDF，都需要登录后同步到你的个人资料库。"
          primary="立即登录"
          secondary="先去探索"
          primaryTo="/login"
          secondaryTo="/explore"
        />
      </div>
    )
  }

  if (loading) {
    return (
      <div className="favorites-container">
        <FavoritesLoading />
      </div>
    )
  }

  return (
    <div className="favorites-container">
      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: 'success' })} />

      <section className="favorites-hero">
        <div>
          <span className="page-kicker">Saved Library</span>
          <h1>我的收藏</h1>
          <p>集中管理你保留下来的论文、博客和原文资料。</p>
        </div>
        <div className="favorites-summary">
          <span>{favs.length}</span>
          <p>已收藏论文</p>
        </div>
      </section>

      {favs.length === 0 ? (
        <div className="favorites-empty">
          <h3>暂无收藏</h3>
          <p>去 Explore 收藏感兴趣的论文博客，它们会出现在这里。</p>
          <Link to="/explore" className="btn-primary">去探索</Link>
        </div>
      ) : (
        <div className="favorites-list">
          {favs.map(blog => (
            <article key={blog.id} className="favorite-card">
              <div className="favorite-card-main">
                <div className="favorite-tag">已收藏</div>
                <h3>{blog.title}</h3>
                <div className="favorite-meta">
                  <span>作者 {blog.author}</span>
                  <span>{blog.date || '暂无日期'}</span>
                </div>
                <p>{blog.summary}</p>
              </div>
              <div className="favorite-actions">
                <button className="btn-primary" onClick={() => openBlogMarkdown(blog.title, blog.blog_content, blog.pdf_url, blog.paper_id)}>
                  阅读博客
                </button>
                <button className="btn-secondary" onClick={() => openPdf(blog.pdf_url)}>
                  查看原文 PDF
                </button>
                <button className="btn-secondary danger" onClick={() => cancelLike(blog.paper_id)}>
                  取消收藏
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}

export default Favorites
