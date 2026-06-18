import React, { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import './Chat.css'
import { API_BASE } from '../config'

const suggestions = [
  '请总结一下这篇论文的主要贡献',
  '这篇论文使用了什么方法？',
  '论文的实验结果说明了什么？'
]

const Chat = () => {
  const { recommendationId } = useParams()
  const navigate = useNavigate()
  const [chatHistory, setChatHistory] = useState([])
  const [paperInfo, setPaperInfo] = useState(null)
  const [newMessage, setNewMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingHistory, setIsLoadingHistory] = useState(true)
  const messagesEndRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [chatHistory])

  useEffect(() => {
    if (recommendationId) {
      loadChatHistory()
    }
  }, [recommendationId])

  const loadChatHistory = async () => {
    try {
      setIsLoadingHistory(true)
      const response = await fetch(`${API_BASE}/chat/history/${recommendationId}`)
      const data = await response.json()

      if (data.status === 'success') {
        setChatHistory(data.data.chat_history)
        setPaperInfo(data.data.paper_info)
      } else {
        alert('加载对话历史失败：' + data.message)
      }
    } catch (error) {
      console.error('加载对话历史失败:', error)
      alert('加载对话历史失败，请稍后重试')
    } finally {
      setIsLoadingHistory(false)
    }
  }

  const sendMessage = async () => {
    if (!newMessage.trim() || isLoading) return

    const userMessage = newMessage.trim()
    setNewMessage('')
    setIsLoading(true)

    const tempUserMessage = {
      id: Date.now(),
      recommendation_id: parseInt(recommendationId),
      user_message: userMessage,
      ai_response: '',
      created_at: new Date().toISOString(),
      isPending: true
    }
    setChatHistory(prev => [...prev, tempUserMessage])

    try {
      const response = await fetch(`${API_BASE}/chat/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recommendation_id: parseInt(recommendationId),
          user_message: userMessage
        })
      })

      const data = await response.json()

      if (data.status === 'success') {
        await loadChatHistory()
      } else {
        alert('发送消息失败：' + data.message)
        setChatHistory(prev => prev.filter(msg => !msg.isPending))
      }
    } catch (error) {
      console.error('发送消息失败', error)
      alert('发送消息失败，请稍后重试')
      setChatHistory(prev => prev.filter(msg => !msg.isPending))
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const formatTime = (timestamp) => {
    const date = new Date(timestamp)
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (isLoadingHistory) {
    return (
      <div className="chat-container">
        <div className="chat-state-card">
          <div className="chat-loading-spinner"></div>
          <h2>正在加载对话...</h2>
          <p>正在读取论文信息和历史问答。</p>
        </div>
      </div>
    )
  }

  if (!paperInfo) {
    return (
      <div className="chat-container">
        <div className="chat-state-card chat-error">
          <h2>未找到论文信息</h2>
          <p>请返回推荐列表，重新选择一篇论文。</p>
          <button className="back-button" onClick={() => navigate(-1)}>返回</button>
        </div>
      </div>
    )
  }

  return (
    <div className="chat-container">
      <div className="chat-shell">
        <div className="chat-header">
          <button className="back-button" onClick={() => navigate(-1)}>
            返回
          </button>
          <div className="paper-info">
            <span className="paper-label">Paper Chat</span>
            <h2>{paperInfo.title}</h2>
            <p className="author">作者 {paperInfo.author}</p>
          </div>
        </div>

        <div className="chat-messages">
          {chatHistory.length === 0 ? (
            <div className="welcome-message">
              <span className="welcome-badge">AI Research Assistant</span>
              <h3>开始与 AI 对话</h3>
              <p>围绕这篇论文提出问题，AI 会结合论文博客内容给出结构化回答。</p>
              <div className="suggestions">
                {suggestions.map(item => (
                  <button
                    type="button"
                    className="suggestion-tag"
                    key={item}
                    onClick={() => setNewMessage(item)}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            chatHistory.map((chat) => (
              <div key={chat.id} className="message-group">
                <div className="message user-message">
                  <div className="message-avatar">我</div>
                  <div className="message-content">
                    <div className="message-text">{chat.user_message}</div>
                    <div className="message-time">{formatTime(chat.created_at)}</div>
                  </div>
                </div>

                <div className="message ai-message">
                  <div className="message-avatar">AI</div>
                  <div className="message-content">
                    <div className="message-text">
                      {chat.isPending ? (
                        <div className="typing-indicator" aria-label="AI 正在输入">
                          <span></span>
                          <span></span>
                          <span></span>
                        </div>
                      ) : (
                        <ReactMarkdown>{chat.ai_response}</ReactMarkdown>
                      )}
                    </div>
                    {!chat.isPending && (
                      <div className="message-time">{formatTime(chat.created_at)}</div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="chat-input">
          <div className="input-container">
            <textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="输入您的问题..."
              disabled={isLoading}
              rows={1}
            />
            <button
              onClick={sendMessage}
              disabled={!newMessage.trim() || isLoading}
              className="send-button"
            >
              {isLoading ? '发送中...' : '发送'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Chat
