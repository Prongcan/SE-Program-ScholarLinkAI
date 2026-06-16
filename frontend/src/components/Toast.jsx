import React, { useEffect } from 'react'
import './Toast.css'

const Toast = ({ message, type = 'success', onClose }) => {
  useEffect(() => {
    if (!message) return undefined
    const timer = setTimeout(onClose, 2400)
    return () => clearTimeout(timer)
  }, [message, onClose])

  if (!message) return null

  return (
    <div className={`toast toast-${type}`} role="status" aria-live="polite">
      <span className="toast-dot"></span>
      <span>{message}</span>
      <button type="button" onClick={onClose} aria-label="关闭提示">×</button>
    </div>
  )
}

export default Toast
