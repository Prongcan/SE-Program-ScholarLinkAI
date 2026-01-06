"""
统一Embedding服务 - 封装多种embedding提供商的API

支持：
- OpenRouter (默认，支持多个模型)
- OpenAI (备用)

包含缓存机制，避免重复调用相同文本
"""
from __future__ import annotations

from typing import List, Optional, Dict
import logging
import hashlib
import json

logger = logging.getLogger(__name__)

# 简单的内存缓存（生产环境建议使用Redis）
_embedding_cache: Dict[str, List[float]] = {}

try:
    from service.embedding import Embedding as OpenAIEmbedding
    OPENAI_AVAILABLE = True
except Exception as e:
    logger.warning(f"OpenAI embedding不可用: {e}")
    OPENAI_AVAILABLE = False

try:
    from service.openrouter_embedding import OpenRouterEmbedding
    OPENROUTER_AVAILABLE = True
except Exception as e:
    logger.warning(f"OpenRouter embedding不可用: {e}")
    OPENROUTER_AVAILABLE = False


class EmbeddingService:
    """统一的Embedding服务接口"""
    
    def __init__(self, provider: str = "openrouter"):
        """
        初始化embedding服务
        
        Args:
            provider: "openai" 或 "openrouter"
        """
        self.provider = provider.lower()
        
        if self.provider == "openai":
            if not OPENAI_AVAILABLE:
                raise RuntimeError("OpenAI embedding服务不可用，请检查配置")
            self._client = OpenAIEmbedding()
        elif self.provider == "openrouter":
            if not OPENROUTER_AVAILABLE:
                raise RuntimeError("OpenRouter embedding服务不可用，请检查配置")
            self._client = OpenRouterEmbedding()
        else:
            raise ValueError(f"不支持的provider: {provider}，支持: openai, openrouter")
    
    def embed_text(self, text: str, normalize: bool = False) -> List[float]:
        """嵌入单个文本（带缓存）"""
        if not text or not text.strip():
            return []
        
        # 生成缓存键（包含provider和normalize状态）
        cache_key = self._get_cache_key(text, normalize)
        
        # 检查缓存
        if cache_key in _embedding_cache:
            logger.debug(f"使用缓存的embedding: {text[:50]}...")
            return _embedding_cache[cache_key]
        
        # 调用API
        result = self._client.embed_text(text, normalize=normalize)
        
        # 存入缓存（限制缓存大小，避免内存溢出）
        if len(_embedding_cache) < 1000:  # 最多缓存1000个
            _embedding_cache[cache_key] = result
        else:
            # 如果缓存已满，清除最旧的（简单策略：清除一半）
            keys_to_remove = list(_embedding_cache.keys())[:500]
            for key in keys_to_remove:
                _embedding_cache.pop(key, None)
            _embedding_cache[cache_key] = result
        
        return result
    
    def embed_texts(self, texts: List[str], normalize: bool = False, batch_size: int = 100) -> List[List[float]]:
        """嵌入多个文本（带缓存）"""
        if not texts:
            return []
        
        results: List[List[float]] = []
        texts_to_call: List[str] = []
        text_indices: List[int] = []  # 记录哪些文本需要调用API
        
        # 检查缓存
        for idx, text in enumerate(texts):
            if not text or not text.strip():
                results.append([])
                continue
            
            cache_key = self._get_cache_key(text, normalize)
            if cache_key in _embedding_cache:
                results.append(_embedding_cache[cache_key])
            else:
                texts_to_call.append(text)
                text_indices.append(idx)
                results.append([])  # 占位，稍后填充
        
        # 如果有需要调用的文本，批量调用
        if texts_to_call:
            embeddings = self._client.embed_texts(texts_to_call, normalize=normalize, batch_size=batch_size)
            
            # 填充结果并更新缓存
            for i, (text, embedding) in enumerate(zip(texts_to_call, embeddings)):
                idx = text_indices[i]
                results[idx] = embedding
                
                # 更新缓存
                cache_key = self._get_cache_key(text, normalize)
                if len(_embedding_cache) < 1000:
                    _embedding_cache[cache_key] = embedding
        
        return results
    
    def _get_cache_key(self, text: str, normalize: bool) -> str:
        """生成缓存键"""
        # 使用文本内容和配置生成唯一键
        content = f"{self.provider}:{text}:{normalize}"
        return hashlib.md5(content.encode('utf-8')).hexdigest()
    
    @staticmethod
    def clear_cache():
        """清空缓存（用于测试或内存管理）"""
        global _embedding_cache
        _embedding_cache.clear()
        logger.info("Embedding缓存已清空")


__all__ = ["EmbeddingService"]

