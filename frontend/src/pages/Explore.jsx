import React, { useState, useEffect } from 'react'
import './Explore.css'

const Explore = () => {
  const [blogs, setBlogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)

  // 从后端 API 获取论文数据
  useEffect(() => {
    const fetchPapers = async () => {
      try {
        const response = await fetch('http://localhost:3001/papers/list?page=1&page_size=20')
        const data = await response.json()
        
        if (response.ok && data.status === 'success' && data.data.papers) {
          // 转换论文数据格式以匹配前端显示
          const papers = data.data.papers.map(paper => ({
            id: paper.paper_id,
            title: paper.title || '无标题',
            author: paper.author || '未知作者',
            date: new Date().toISOString().split('T')[0], // 使用当前日期作为占位
            summary: paper.abstract || '暂无摘要',
            tags: [], // 论文没有标签字段，可以后续添加
            readTime: "10分钟", // 默认阅读时间
            pdf_url: paper.pdf_url
          }))
          setBlogs(papers)
          
          // 检查是否还有更多
          const totalPages = data.data.pagination?.total_pages || 1
          if (1 >= totalPages) {
            setHasMore(false)
          }
        } else {
          // 如果获取失败，使用空数组
          setBlogs([])
          setHasMore(false)
        }
      } catch (err) {
        console.error('获取论文列表失败:', err)
        // 网络错误时使用空数组
        setBlogs([])
        setHasMore(false)
      } finally {
        setLoading(false)
      }
    }
    
    fetchPapers()
  }, [])

  const handleLoadMore = async () => {
    if (!hasMore || loading) return
    
    setLoading(true)
    try {
      const nextPage = page + 1
      const response = await fetch(`http://localhost:3001/papers/list?page=${nextPage}&page_size=20`)
      const data = await response.json()
      
      if (response.ok && data.status === 'success' && data.data.papers) {
        const newPapers = data.data.papers.map(paper => ({
          id: paper.paper_id,
          title: paper.title || '无标题',
          author: paper.author || '未知作者',
          date: new Date().toISOString().split('T')[0],
          summary: paper.abstract || '暂无摘要',
          tags: [],
          readTime: "10分钟",
          pdf_url: paper.pdf_url
        }))
        
        if (newPapers.length > 0) {
          setBlogs(prev => [...prev, ...newPapers])
          setPage(nextPage)
          
          // 检查是否还有更多
          const totalPages = data.data.pagination?.total_pages || 1
          if (nextPage >= totalPages) {
            setHasMore(false)
          }
        } else {
          setHasMore(false)
        }
      } else {
        setHasMore(false)
      }
    } catch (err) {
      console.error('加载更多论文失败:', err)
      setHasMore(false)
    } finally {
      setLoading(false)
    }
  }

  const handleReadFull = (pdfUrl) => {
    if (pdfUrl) {
      window.open(pdfUrl, '_blank')
    } else {
      alert('该论文暂无PDF链接')
    }
  }

  const handleFavorite = (paperId) => {
    // TODO: 实现收藏功能
    const userStr = localStorage.getItem('user')
    if (!userStr) {
      alert('请先登录以收藏论文')
      return
    }
    console.log('收藏论文:', paperId)
    alert('收藏功能待实现')
  }

  if (loading) {
    return (
      <div className="explore-container">
        <div className="loading">
          <div className="loading-spinner"></div>
          <p>正在加载更多论文...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="explore-container">
      <div className="explore-header">
        <h1>探索论文</h1>
        <p>发现最新的学术研究成果和前沿技术</p>
      </div>
      
      <div className="blogs-grid">
        {blogs.map(blog => (
          <div key={blog.id} className="blog-card">
            <div className="blog-header">
              <h3 className="blog-title">{blog.title}</h3>
              <div className="blog-meta">
                <span className="author">作者: {blog.author}</span>
                <span className="date">{blog.date}</span>
                <span className="read-time">{blog.readTime}</span>
              </div>
            </div>
            <p className="blog-summary">{blog.summary}</p>
            <div className="blog-tags">
              {blog.tags.map(tag => (
                <span key={tag} className="tag">{tag}</span>
              ))}
            </div>
            <div className="blog-actions">
              <button 
                className="btn-primary" 
                onClick={() => handleReadFull(blog.pdf_url)}
              >
                阅读全文
              </button>
              <button 
                className="btn-secondary" 
                onClick={() => handleFavorite(blog.id)}
              >
                收藏
              </button>
            </div>
          </div>
        ))}
      </div>
      
      {hasMore && (
        <div className="load-more">
          <button 
            className="btn-load-more" 
            onClick={handleLoadMore}
            disabled={loading}
          >
            {loading ? '加载中...' : '加载更多论文...'}
          </button>
        </div>
      )}
      {!hasMore && blogs.length > 0 && (
        <div className="load-more">
          <p style={{ textAlign: 'center', color: '#666', padding: '20px' }}>
            没有更多论文了
          </p>
        </div>
      )}
    </div>
  )
}

export default Explore
