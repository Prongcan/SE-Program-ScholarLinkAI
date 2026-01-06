"""
统一Generator服务 - 封装多种文本生成提供商的API

支持：
- DeepSeek (默认，通过OpenAI兼容接口)
"""
from __future__ import annotations

from typing import List, Dict, Optional
import logging
import os

logger = logging.getLogger(__name__)

try:
    from service.Generate_blogs import BlogGenerator
    DEEPSEEK_AVAILABLE = True
except Exception as e:
    logger.warning(f"DeepSeek generator不可用: {e}")
    DEEPSEEK_AVAILABLE = False

class GeneratorService:
    """统一的Generator服务接口"""
    
    def __init__(self, provider: str = "deepseek"):
        """
        初始化generator服务
        
        Args:
            provider: "deepseek"
        """
        self.provider = provider.lower()
        
        if self.provider == "deepseek":
            if not DEEPSEEK_AVAILABLE:
                raise RuntimeError("DeepSeek generator服务不可用，请检查配置")
            # BlogGenerator内部使用OpenAI SDK，可以通过base_url配置DeepSeek
            self._client = BlogGenerator()
        else:
            raise ValueError(f"不支持的provider: {provider}，支持: deepseek")
    
    def generate(self, prompt: str, temperature: float = 0.7, max_tokens: Optional[int] = None) -> str:
        """生成文本"""
        if self.provider == "deepseek":
            # DeepSeek通过BlogGenerator，需要适配
            # 这里简化处理，实际使用时可能需要调整
            raise NotImplementedError("DeepSeek generator请使用generate_from_pdf_url方法")
        else:
            return self._client.generate(prompt, temperature=temperature, max_tokens=max_tokens)
    
    def chat(self, messages: List[Dict[str, str]], temperature: float = 0.7) -> str:
        """聊天完成"""
        if self.provider == "deepseek":
            # DeepSeek通过BlogGenerator，需要适配
            raise NotImplementedError("DeepSeek generator请使用generate_from_pdf_url方法")
        else:
            return self._client.chat(messages, temperature=temperature)
    
    def generate_from_pdf_url(self, pdf_url: str) -> str:
        """从PDF URL生成博客（仅DeepSeek支持）"""
        if self.provider == "deepseek":
            return self._client.generate_from_pdf_url(pdf_url)
        else:
            raise NotImplementedError("此方法仅支持DeepSeek provider")


__all__ = ["GeneratorService"]

