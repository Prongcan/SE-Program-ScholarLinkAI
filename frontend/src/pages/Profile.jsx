import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import Toast from '../components/Toast'
import './Profile.css'

const splitInterest = (interest = '') =>
  interest
    .split(',')
    .map(item => item.trim())
    .filter(Boolean)

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

const Profile = ({ isLoggedIn }) => {
  const [user, setUser] = useState(null)
  const [interest, setInterest] = useState('')
  const [isEditingInterest, setIsEditingInterest] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [toast, setToast] = useState({ message: '', type: 'success' })
  const [stats, setStats] = useState({
    favorites: 0,
    reads: 0
  })

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
  }

  useEffect(() => {
    const userStr = localStorage.getItem('user')
    if (userStr) {
      try {
        const userData = JSON.parse(userStr)
        setUser(userData)
        setInterest(userData.interest || '')
      } catch (e) {
        console.error('解析用户信息失败:', e)
      }
    }
  }, [])

  useEffect(() => {
    if (isLoggedIn && user?.user_id) {
      fetchUserInfo(user.user_id)
      fetchProfileStats(user.user_id)
    }
  }, [isLoggedIn, user?.user_id])

  const fetchUserInfo = async (userId) => {
    try {
      const response = await fetch(`http://localhost:3001/users/${userId}`)
      const data = await response.json()
      if (response.ok && data.status === 'success') {
        const userData = data.data.user
        setUser(userData)
        setInterest(userData.interest || '')
      }
    } catch (err) {
      console.error('获取用户信息失败:', err)
    }
  }

  const fetchProfileStats = async (userId) => {
    const readKey = `scholarlink_read_history_${userId}`
    const readHistory = JSON.parse(localStorage.getItem(readKey) || '[]')

    try {
      const response = await fetch(`http://localhost:3001/recommendationOrchestrator/favorites?user_id=${userId}&limit=50`)
      const data = await response.json()
      const favorites = response.ok && data.status === 'success' && data.data?.favorites
        ? data.data.favorites.length
        : 0

      setStats({
        favorites,
        reads: readHistory.length
      })
    } catch (err) {
      console.error('获取资料统计失败:', err)
      setStats(prev => ({
        ...prev,
        reads: readHistory.length
      }))
    }
  }

  const handleInterestChange = (e) => {
    setInterest(e.target.value)
    setError('')
  }

  const handleSaveInterest = async () => {
    if (!user || !user.user_id) {
      setError('用户信息不完整')
      showToast('用户信息不完整', 'error')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      const response = await fetch(`http://localhost:3001/users/${user.user_id}/interest`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          interest: interest.trim()
        })
      })

      const data = await response.json()

      if (response.ok && data.status === 'success') {
        setIsEditingInterest(false)

        const updatedUser = { ...user, interest: interest.trim() }
        setUser(updatedUser)
        localStorage.setItem('user', JSON.stringify(updatedUser))
        showToast('任务已完成：研究兴趣已保存')
      } else {
        const message = data.message || '更新失败，请重试'
        setError(message)
        showToast(message, 'error')
      }
    } catch (err) {
      console.error('更新兴趣失败:', err)
      const message = '网络错误，请检查后端服务是否启动'
      setError(message)
      showToast(message, 'error')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancelEdit = () => {
    setInterest(user?.interest || '')
    setIsEditingInterest(false)
    setError('')
    showToast('任务已完成：已取消编辑')
  }

  const startEdit = () => {
    setIsEditingInterest(true)
    setError('')
  }

  if (!isLoggedIn) {
    return (
      <div className="profile-container">
        <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: 'success' })} />
        <GuestPrompt
          kicker="Account Profile"
          title="登录后管理资料"
          description="设置研究兴趣、同步推荐偏好，并把收藏资料保存在你的个人账户中。"
          primary="立即登录"
          secondary="先去探索"
          primaryTo="/login"
          secondaryTo="/explore"
        />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="profile-container">
        <div className="profile-loading">
          <div className="loading-spinner"></div>
          <h2>正在加载资料...</h2>
          <p>正在同步您的账户信息。</p>
        </div>
      </div>
    )
  }

  const interestItems = splitInterest(interest)
  const initials = (user.username || 'U').slice(0, 2).toUpperCase()

  return (
    <div className="profile-container">
      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: 'success' })} />

      <section className="profile-hero">
        <div>
          <span className="page-kicker">Account Profile</span>
          <h1>个人资料</h1>
          <p>管理账户信息和研究偏好，让推荐更贴近你的方向。</p>
        </div>
        <div className="profile-id-card">
          <span>用户 ID</span>
          <strong>{user.user_id}</strong>
        </div>
      </section>

      <div className="profile-grid">
        <section className="profile-card">
          <div className="avatar-placeholder">{initials}</div>
          <div className="profile-info">
            <span className="profile-label">当前账户</span>
            <h3>{user.username}</h3>
            <p>您的研究偏好将用于推荐论文博客和语义搜索结果。</p>
          </div>
          <div className="profile-stats">
            <div className="stat">
              <span className="stat-number">{stats.favorites}</span>
              <span className="stat-label">收藏论文</span>
            </div>
            <div className="stat">
              <span className="stat-number">{stats.reads}</span>
              <span className="stat-label">阅读历史</span>
            </div>
          </div>
        </section>

        <section className="profile-section">
          <div className="section-heading">
            <div>
              <h2>研究兴趣</h2>
              <p className="section-description">设置您的研究兴趣领域，系统将基于此为您推荐相关论文。</p>
            </div>
            {!isEditingInterest && (
              <button className="btn-primary" onClick={startEdit}>编辑兴趣</button>
            )}
          </div>

          {error && <div className="error-message">{error}</div>}

          {isEditingInterest ? (
            <div className="interest-edit-form">
              <textarea
                className="interest-input"
                value={interest}
                onChange={handleInterestChange}
                placeholder="例如：Machine Learning, Natural Language Processing, Computer Vision"
                rows={4}
                disabled={isLoading}
              />
              <div className="interest-actions">
                <button
                  className="btn-primary"
                  onClick={handleSaveInterest}
                  disabled={isLoading || !interest.trim()}
                >
                  {isLoading ? '保存中...' : '保存'}
                </button>
                <button
                  className="btn-secondary"
                  onClick={handleCancelEdit}
                  disabled={isLoading}
                >
                  取消
                </button>
              </div>
            </div>
          ) : (
            <div className="interest-display">
              {interestItems.length ? (
                <div className="interest-chips">
                  {interestItems.map(item => (
                    <span key={item}>{item}</span>
                  ))}
                </div>
              ) : (
                <p className="no-interest">暂未设置研究兴趣</p>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

export default Profile
