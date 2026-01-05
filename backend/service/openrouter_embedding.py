"""
OpenRouter Embedding Service - 使用OpenRouter API进行文本嵌入

OpenRouter是一个API聚合服务，可以访问多个模型提供商的embedding API。

配置优先级（从高到低）：
1) config.yaml -> openrouter.api_key
2) 环境变量 OPENROUTER_API_KEY
"""
from __future__ import annotations

import os
import math
import json
from typing import Any, Dict, List, Optional

# Load .env if present
try:
    from dotenv import load_dotenv  # type: ignore
    for _p in [
        os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")),  # project root
        os.path.abspath(os.path.join(os.path.dirname(__file__), "..")),          # backend
        os.path.abspath(os.path.join(os.path.dirname(__file__), ".")),           # service
    ]:
        env_path = os.path.join(_p, ".env")
        if os.path.isfile(env_path):
            load_dotenv(env_path)
            break
    else:
        load_dotenv()
except Exception:
    pass

# Optional YAML support
try:
    import yaml  # type: ignore
except Exception:
    yaml = None

try:
    import requests  # type: ignore
except Exception as e:
    raise RuntimeError("未安装 requests 库，请先执行: pip install requests\n原始错误: %s" % e)


def _project_root_candidates() -> List[str]:
    base = os.path.dirname(__file__)
    return [
        os.path.abspath(os.path.join(base, "..", "..")),
        os.path.abspath(os.path.join(base, "..")),
        os.path.abspath(os.path.join(base, ".")),
    ]


def _load_yaml_config() -> Optional[Dict[str, Any]]:
    for root in _project_root_candidates():
        cfg = os.path.join(root, "config.yaml")
        if os.path.isfile(cfg):
            if yaml is None:
                raise RuntimeError("检测到 config.yaml，但未安装 PyYAML。请先执行: pip install PyYAML")
            with open(cfg, "r", encoding="utf-8") as f:
                return yaml.safe_load(f) or {}
    return None


def _resolve_proxy_url() -> Optional[str]:
    """Resolve proxy URL from config.yaml (preferred) or environment."""
    # 1) YAML
    try:
        data = _load_yaml_config()
        if isinstance(data, dict):
            pxy = data.get("proxy") or {}
            if isinstance(pxy, dict):
                enable = pxy.get("enable")
                if enable is False:
                    return None
                if pxy.get("url"):
                    return str(pxy["url"]).strip()
                host = str(pxy.get("host", "")).strip()
                port = pxy.get("port")
                scheme = str(pxy.get("scheme", "http")).strip() or "http"
                if host and port:
                    return f"{scheme}://{host}:{int(port)}"
    except Exception:
        pass
    # 2) Environment fallbacks
    for key in ("HTTPS_PROXY", "HTTP_PROXY", "ALL_PROXY"):
        val = os.getenv(key)
        if val:
            return val
    return None


def _resolve_openrouter_conf(
    override: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    # Defaults
    conf: Dict[str, Any] = {
        "api_key": os.getenv("OPENROUTER_API_KEY", ""),
        "model": os.getenv("OPENROUTER_EMBEDDING_MODEL", "text-embedding-3-small"),  # 默认使用OpenAI模型
        "base_url": "https://openrouter.ai/api/v1",
        "timeout": 30,
    }

    # YAML overrides if available
    try:
        data = _load_yaml_config()
        if data and isinstance(data, dict):
            # Preferred: openrouter section
            or_config = data.get("openrouter") or {}
            if isinstance(or_config, dict):
                # api_key: 如果配置了（包括空字符串），使用配置的值；否则保持环境变量的值
                api_key_val = or_config.get("api_key")
                if api_key_val is not None:  # 允许空字符串，但会稍后检查
                    conf["api_key"] = str(api_key_val).strip()
                if or_config.get("embedding_model"):
                    conf["model"] = or_config.get("embedding_model")
                if or_config.get("base_url"):
                    conf["base_url"] = or_config.get("base_url")
                if or_config.get("timeout"):
                    conf["timeout"] = int(or_config.get("timeout"))
            # Also support: secret_key.openrouter_api_key
            sk = data.get("secret_key") or {}
            if isinstance(sk, dict):
                api_from_secret = sk.get("openrouter_api_key") or sk.get("openrouter_api")
                if api_from_secret:
                    conf["api_key"] = api_from_secret
    except Exception as e:
        print(f"[WARN] 读取 config.yaml 失败，将使用环境变量: {e}")

    # Runtime override
    if override:
        conf.update({k: v for k, v in override.items() if v not in (None, "")})

    if not conf["api_key"]:
        raise RuntimeError(
            "未找到 OPENROUTER_API_KEY。请在环境变量/.env 或 config.yaml 的 openrouter.api_key 中配置。"
        )

    return conf


def _l2_normalize(vec: List[float]) -> List[float]:
    s = sum(v * v for v in vec)
    if s <= 0:
        return vec
    norm = math.sqrt(s)
    if norm == 0:
        return vec
    return [v / norm for v in vec]


class OpenRouterEmbedding:
    """Wrapper for OpenRouter embedding API.

    OpenRouter支持多个embedding模型，包括：
    - text-embedding-3-small (OpenAI)
    - text-embedding-3-large (OpenAI)
    - text-embedding-ada-002 (OpenAI)
    - 以及其他提供商模型

    - Default model: text-embedding-3-small (dim=1536)
    - Set OPENROUTER_API_KEY in env/.env or config.yaml
    """

    def __init__(
        self,
        model: Optional[str] = None,
        api_key: Optional[str] = None,
        base_url: Optional[str] = None,
        timeout: Optional[int] = None,
    ) -> None:
        conf = _resolve_openrouter_conf(
            {
                "model": model,
                "api_key": api_key,
                "base_url": base_url,
                "timeout": timeout,
            }
        )
        self.model = conf["model"]
        self.base_url = conf["base_url"]
        self.api_key = conf["api_key"]
        self.timeout = conf["timeout"]

    def embed_text(self, text: str, normalize: bool = False) -> List[float]:
        """Embed a single text string."""
        if not isinstance(text, str):
            raise TypeError("text must be a string")
        text = text.strip()
        if not text:
            return []
        
        try:
            url = f"{self.base_url}/embeddings"
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
                "HTTP-Referer": "https://github.com/your-repo",  # 可选，用于统计
            }
            
            payload = {
                "model": self.model,
                "input": text
            }
            
            # Get proxy from environment
            proxies = None
            proxy_url = _resolve_proxy_url()
            if proxy_url:
                proxies = {
                    "http": proxy_url,
                    "https": proxy_url
                }
                # 对于 OpenRouter，可能不需要代理，如果代理导致问题可以禁用
                # 如果遇到连接问题，可以尝试不使用代理
                # proxies = None
            
            # 增加重试和更详细的错误处理
            try:
                response = requests.post(url, headers=headers, json=payload, proxies=proxies, timeout=self.timeout)
            except (requests.exceptions.ConnectionError, requests.exceptions.ConnectTimeout) as conn_err:
                # 如果使用代理失败，尝试不使用代理
                if proxies:
                    print(f"[WARN] 使用代理失败，尝试直接连接: {conn_err}")
                    response = requests.post(url, headers=headers, json=payload, proxies=None, timeout=self.timeout)
                else:
                    raise
            response.raise_for_status()
            
            result = response.json()
            vec = result['data'][0]['embedding']  # type: ignore
            
            if normalize:
                vec = _l2_normalize(vec)
            return vec
            
        except requests.exceptions.RequestException as e:
            error_msg = str(e)
            if hasattr(e, 'response') and e.response is not None:
                try:
                    error_detail = e.response.json()
                    error_msg = f"{error_msg}: {error_detail}"
                    # 特殊处理 402 错误（需要充值）
                    if e.response.status_code == 402:
                        raise RuntimeError(
                            f"OpenRouter API需要账户余额:\n"
                            f"  错误: {error_detail.get('error', {}).get('message', 'Payment Required')}\n"
                            f"  解决方案:\n"
                            f"  1. 访问 https://openrouter.ai/settings/credits 充值\n"
                            f"  2. 或使用其他embedding服务（如OpenAI）\n"
                            f"  3. 在代码中使用: EmbeddingService(provider='openai')"
                        )
                except RuntimeError:
                    raise
                except:
                    error_msg = f"{error_msg}: {e.response.text}"
            raise RuntimeError(f"OpenRouter embedding API调用失败: {error_msg}")
        except Exception as e:
            raise RuntimeError(f"OpenRouter embedding API调用失败: {str(e)}")

    def embed_texts(self, texts: List[str], normalize: bool = False, batch_size: int = 100) -> List[List[float]]:
        """Embed multiple text strings."""
        if not texts:
            return []
        results: List[List[float]] = []
        # Process in batches
        start = 0
        n = len(texts)
        while start < n:
            batch = [t.strip() if isinstance(t, str) else "" for t in texts[start : start + batch_size]]
            # Filter empty items, keep placeholder
            to_call = [t if t else " " for t in batch]
            try:
                url = f"{self.base_url}/embeddings"
                headers = {
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json",
                    "HTTP-Referer": "https://github.com/your-repo",
                }
                
                payload = {
                    "model": self.model,
                    "input": to_call  # OpenRouter支持批量输入
                }
                
                # Get proxy from environment
                proxies = None
                proxy_url = _resolve_proxy_url()
                if proxy_url:
                    proxies = {
                        "http": proxy_url,
                        "https": proxy_url
                    }
                
                response = requests.post(url, headers=headers, json=payload, proxies=proxies, timeout=self.timeout)
                response.raise_for_status()
                
                result = response.json()
                vecs = [item['embedding'] for item in result['data']]  # type: ignore
                
                if normalize:
                    vecs = [_l2_normalize(v) for v in vecs]
                results.extend(vecs)
            except Exception as e:
                # Fallback to individual calls if batch fails
                for text in to_call:
                    try:
                        vec = self.embed_text(text, normalize=normalize)
                        results.append(vec)
                    except Exception:
                        # Return zero vector for failed items
                        dim = 1536  # default dimension for text-embedding-3-small
                        results.append([0.0] * dim)
            start += batch_size
        return results


__all__ = ["OpenRouterEmbedding"]

