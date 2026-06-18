import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import './Login.css'
import { API_BASE } from '../config'

const Login = ({ onLogin }) => {
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
    if (error) setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      const response = await fetch(`${API_BASE}/users/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: formData.username,
          password: formData.password
        })
      })

      const data = await response.json()

      if (response.ok && data.status === 'success') {
        localStorage.setItem('user', JSON.stringify(data.data))
        localStorage.setItem('isLoggedIn', 'true')
        onLogin()
        navigate('/')
      } else {
        setError(data.message || '登录失败，请检查用户名和密码')
      }
    } catch (err) {
      console.error('登录错误:', err)
      setError('网络错误，请检查后端服务是否启动')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="auth-container">
      <section className="auth-card">
        <div className="auth-side">
          <span className="auth-kicker">ScholarLink AI</span>
          <h1>欢迎回来</h1>
          <p>登录后可获得个性化论文推荐、收藏同步和 AI 论文对话。</p>
          <div className="auth-points">
            <span>个性化推荐</span>
            <span>收藏资料库</span>
            <span>AI 研究助手</span>
          </div>
        </div>

        <div className="auth-form-panel">
          <div className="login-header">
            <h2>登录</h2>
            <p>继续使用 ScholarLink AI</p>
          </div>

          <form onSubmit={handleSubmit} className="login-form">
            {error && <div className="error-message">{error}</div>}

            <div className="form-group">
              <label htmlFor="username">用户名</label>
              <input
                type="text"
                id="username"
                name="username"
                value={formData.username}
                onChange={handleChange}
                placeholder="请输入用户名"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">密码</label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="请输入密码"
                required
              />
            </div>

            <button type="submit" className="btn-login-submit" disabled={isLoading}>
              {isLoading ? '登录中...' : '登录'}
            </button>
          </form>

          <div className="login-footer">
            <p>还没有账户？ <Link to="/register" className="link">立即注册</Link></p>
          </div>
        </div>
      </section>
    </div>
  )
}

export default Login
