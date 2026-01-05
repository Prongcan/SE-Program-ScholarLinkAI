"""
博客生成Orchestrator - 协调generator服务和数据库，实现博客生成功能
"""
from __future__ import annotations

import logging
from typing import Optional, Dict, Any

from service.dbmanager import DbManager
from service.generator_service import GeneratorService

logger = logging.getLogger(__name__)


class BlogGenerationOrchestrator:
    """博客生成业务流程编排器"""
    
    def __init__(self, generator_provider: str = "deepseek"):
        """
        初始化博客生成orchestrator
        
        Args:
            generator_provider: generator服务提供商，默认"deepseek"
        """
        self.db = DbManager()
        self.generator_service = GeneratorService(provider=generator_provider)
        logger.info(f"BlogGenerationOrchestrator初始化完成，使用{generator_provider} generator服务")
    
    def generate_blog_for_paper(self, user_id: int, paper_id: int, force_regenerate: bool = False) -> Optional[str]:
        """
        为指定论文生成博客
        
        Args:
            user_id: 用户ID
            paper_id: 论文ID
            force_regenerate: 是否强制重新生成（即使已存在）
            
        Returns:
            生成的博客内容，失败返回None
        """
        try:
            # 检查论文是否存在
            paper = self.db.query_one(
                "SELECT paper_id, pdf_url, title FROM papers WHERE paper_id = %s",
                (paper_id,)
            )
            if not paper:
                logger.error(f"论文不存在: paper_id={paper_id}")
                return None
            
            pdf_url = paper.get('pdf_url')
            if not pdf_url:
                logger.error(f"论文{paper_id}没有PDF URL")
                return None
            
            # 检查是否已存在博客
            if not force_regenerate:
                existing = self.db.query_one(
                    "SELECT blog FROM recommendations WHERE user_id = %s AND paper_id = %s",
                    (user_id, paper_id)
                )
                if existing and existing.get('blog'):
                    logger.info(f"用户{user_id}的论文{paper_id}已有博客，跳过生成")
                    return existing['blog']
            
            # 生成博客
            logger.info(f"开始为用户{user_id}生成论文{paper_id}的博客...")
            blog_content = self.generator_service.generate_from_pdf_url(pdf_url)
            
            if not blog_content:
                logger.error(f"博客生成失败: user_id={user_id}, paper_id={paper_id}")
                return None
            
            # 保存到数据库
            try:
                # 使用INSERT ... ON DUPLICATE KEY UPDATE
                self.db.execute(
                    """
                    INSERT INTO recommendations (user_id, paper_id, blog)
                    VALUES (%s, %s, %s)
                    ON DUPLICATE KEY UPDATE blog = %s
                    """,
                    (user_id, paper_id, blog_content, blog_content)
                )
                logger.info(f"博客已保存: user_id={user_id}, paper_id={paper_id}")
            except Exception as e:
                logger.error(f"保存博客失败: {str(e)}", exc_info=True)
                # 即使保存失败，也返回生成的内容
            
            return blog_content
            
        except Exception as e:
            logger.error(f"生成博客失败: {str(e)}", exc_info=True)
            return None
    
    def get_blog(self, user_id: int, paper_id: int) -> Optional[str]:
        """
        获取已生成的博客
        
        Args:
            user_id: 用户ID
            paper_id: 论文ID
            
        Returns:
            博客内容，不存在返回None
        """
        try:
            result = self.db.query_one(
                "SELECT blog FROM recommendations WHERE user_id = %s AND paper_id = %s",
                (user_id, paper_id)
            )
            if result and result.get('blog'):
                return result['blog']
            return None
        except Exception as e:
            logger.error(f"获取博客失败: {str(e)}", exc_info=True)
            return None
    
    def generate_and_save_recommendations(self, user_id: int, paper_ids: list[int]) -> Dict[str, Any]:
        """
        批量生成并保存推荐论文的博客
        
        Args:
            user_id: 用户ID
            paper_ids: 论文ID列表
            
        Returns:
            生成结果统计
        """
        success_count = 0
        fail_count = 0
        skipped_count = 0
        
        for paper_id in paper_ids:
            try:
                # 检查是否已存在
                existing = self.get_blog(user_id, paper_id)
                if existing:
                    skipped_count += 1
                    continue
                
                # 生成博客
                blog = self.generate_blog_for_paper(user_id, paper_id, force_regenerate=False)
                if blog:
                    success_count += 1
                else:
                    fail_count += 1
            except Exception as e:
                logger.error(f"处理论文{paper_id}失败: {str(e)}")
                fail_count += 1
        
        return {
            'total': len(paper_ids),
            'success': success_count,
            'failed': fail_count,
            'skipped': skipped_count
        }


__all__ = ["BlogGenerationOrchestrator"]


