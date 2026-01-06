"""
推荐Orchestrator - 协调embedding服务和数据库，实现论文推荐功能
"""
from __future__ import annotations

import logging
import os
from typing import List, Dict, Any, Optional
import numpy as np

from service.dbmanager import DbManager
from service.embedding_service import EmbeddingService
from service.retry_utils import retry_on_quota_error

logger = logging.getLogger(__name__)


def _get_default_embedding_provider() -> str:
    """从config.yaml或环境变量读取默认的embedding provider"""
    # 1. 环境变量优先
    provider = os.getenv("EMBEDDING_PROVIDER", "").strip()
    if provider:
        return provider.lower()
    
    # 2. 从config.yaml读取
    try:
        import yaml
        base = os.path.dirname(__file__)
        for root in [
            os.path.abspath(os.path.join(base, "..", "..")),
            os.path.abspath(os.path.join(base, "..")),
            os.path.abspath(os.path.join(base, ".")),
        ]:
            cfg = os.path.join(root, "config.yaml")
            if os.path.isfile(cfg):
                with open(cfg, "r", encoding="utf-8") as f:
                    data = yaml.safe_load(f) or {}
                    embedding_config = data.get("embedding") or {}
                    if isinstance(embedding_config, dict):
                        provider = embedding_config.get("provider", "").strip()
                        if provider:
                            return provider.lower()
                break
    except Exception as e:
        logger.debug(f"读取config.yaml失败: {e}")
    
    # 3. 默认值
    return "openrouter"


class RecommendationOrchestrator:
    """推荐业务流程编排器"""
    
    def __init__(self, embedding_provider: Optional[str] = None):
        """
        初始化推荐orchestrator
        
        Args:
            embedding_provider: embedding服务提供商，如果为None则从config.yaml读取，默认"openrouter"
        """
        self.db = DbManager()
        if embedding_provider is None:
            embedding_provider = _get_default_embedding_provider()
        self.embedding_service = EmbeddingService(provider=embedding_provider)
        logger.info(f"RecommendationOrchestrator初始化完成，使用{embedding_provider} embedding服务")
    
    @retry_on_quota_error(max_retries=2, initial_delay=5.0)
    def update_user_interest_embedding(self, user_id: int, interest: str) -> bool:
        """
        更新用户兴趣的embedding向量
        
        Args:
            user_id: 用户ID
            interest: 用户兴趣文本
            
        Returns:
            是否成功更新
        """
        try:
            # 检查用户是否存在
            user = self.db.query_one(
                "SELECT user_id FROM users WHERE user_id = %s",
                (user_id,)
            )
            if not user:
                logger.error(f"用户不存在: user_id={user_id}")
                return False
            
            # 生成兴趣的embedding向量
            if not interest or not interest.strip():
                logger.warning(f"用户{user_id}的兴趣为空，跳过embedding更新")
                return False
            
            try:
                embedding = self.embedding_service.embed_text(interest.strip(), normalize=True)
            except RuntimeError as e:
                error_msg = str(e)
                # 如果是配额错误，记录警告但继续（允许稍后重试）
                if "quota" in error_msg.lower() or "429" in error_msg or "rate limit" in error_msg.lower():
                    logger.warning(f"用户{user_id}的兴趣embedding生成失败（配额限制），稍后可以重试: {error_msg}")
                    return False
                # 其他错误直接抛出
                raise
            
            # 将向量转换为字符串存储（JSON格式）
            import json
            embedding_str = json.dumps(embedding)
            
            # 更新数据库
            # 首先检查interest_embedding字段是否存在
            try:
                self.db.execute(
                    "UPDATE users SET interest_embedding = %s WHERE user_id = %s",
                    (embedding_str, user_id)
                )
            except Exception as e:
                # 如果字段不存在，先添加字段
                logger.warning(f"interest_embedding字段可能不存在，尝试添加: {e}")
                try:
                    self.db.execute(
                        "ALTER TABLE users ADD COLUMN interest_embedding TEXT"
                    )
                    self.db.execute(
                        "UPDATE users SET interest_embedding = %s WHERE user_id = %s",
                        (embedding_str, user_id)
                    )
                except Exception as alter_e:
                    logger.error(f"添加interest_embedding字段失败: {alter_e}")
                    return False
            
            logger.info(f"用户{user_id}的兴趣embedding更新成功")
            return True
            
        except Exception as e:
            logger.error(f"更新用户兴趣embedding失败: {str(e)}", exc_info=True)
            return False
    
    def get_user_interest_embedding(self, user_id: int) -> Optional[List[float]]:
        """
        获取用户兴趣的embedding向量
        
        Args:
            user_id: 用户ID
            
        Returns:
            embedding向量，如果不存在则返回None
        """
        try:
            user = self.db.query_one(
                "SELECT interest_embedding FROM users WHERE user_id = %s",
                (user_id,)
            )
            if not user or not user.get('interest_embedding'):
                return None
            
            import json
            embedding_str = user['interest_embedding']
            if isinstance(embedding_str, str):
                return json.loads(embedding_str)
            return None
            
        except Exception as e:
            logger.error(f"获取用户兴趣embedding失败: {str(e)}", exc_info=True)
            return None
    
    def compute_paper_embedding(self, paper_id: int) -> Optional[List[float]]:
        """
        计算论文的embedding向量（基于标题和摘要）
        
        Args:
            paper_id: 论文ID
            
        Returns:
            embedding向量
        """
        try:
            paper = self.db.query_one(
                "SELECT title, abstract FROM papers WHERE paper_id = %s",
                (paper_id,)
            )
            if not paper:
                return None
            
            # 组合标题和摘要
            text = f"{paper.get('title', '')} {paper.get('abstract', '')}"
            text = text.strip()
            if not text:
                return None
            
            # 生成embedding
            embedding = self.embedding_service.embed_text(text, normalize=True)
            return embedding
            
        except Exception as e:
            logger.error(f"计算论文embedding失败: {str(e)}", exc_info=True)
            return None
    
    def recommend_papers(self, user_id: int, top_k: int = 10) -> List[Dict[str, Any]]:
        """
        为用户推荐论文
        
        Args:
            user_id: 用户ID
            top_k: 返回前k个推荐结果
            
        Returns:
            推荐的论文列表，包含相似度分数
        """
        try:
            # 获取用户兴趣embedding
            user_embedding = self.get_user_interest_embedding(user_id)
            if not user_embedding:
                # 如果没有embedding，尝试从兴趣文本生成
                user = self.db.query_one(
                    "SELECT interest FROM users WHERE user_id = %s",
                    (user_id,)
                )
                if user and user.get('interest'):
                    self.update_user_interest_embedding(user_id, user['interest'])
                    user_embedding = self.get_user_interest_embedding(user_id)
            
            if not user_embedding:
                logger.warning(f"用户{user_id}没有兴趣embedding，无法推荐")
                return []
            
            # 获取所有论文
            papers = self.db.query_all(
                "SELECT paper_id, title, abstract, author, pdf_url FROM papers"
            )
            
            if not papers:
                return []
            
            # 计算每篇论文的相似度
            recommendations = []
            user_vec = np.array(user_embedding)
            
            for paper in papers:
                paper_id = paper['paper_id']
                
                # 计算论文embedding（可以缓存，这里简化处理）
                paper_embedding = self.compute_paper_embedding(paper_id)
                if not paper_embedding:
                    continue
                
                # 计算余弦相似度
                paper_vec = np.array(paper_embedding)
                # 确保向量长度一致
                if len(user_vec) != len(paper_vec):
                    logger.warning(f"向量维度不匹配: user={len(user_vec)}, paper={len(paper_vec)}")
                    continue
                similarity = float(np.dot(user_vec, paper_vec))
                
                recommendations.append({
                    'paper_id': paper_id,
                    'title': paper['title'],
                    'abstract': paper['abstract'],
                    'author': paper['author'],
                    'pdf_url': paper['pdf_url'],
                    'similarity': similarity
                })
            
            # 按相似度排序，返回top_k
            recommendations.sort(key=lambda x: x['similarity'], reverse=True)
            return recommendations[:top_k]
            
        except Exception as e:
            logger.error(f"推荐论文失败: {str(e)}", exc_info=True)
            return []


__all__ = ["RecommendationOrchestrator"]

