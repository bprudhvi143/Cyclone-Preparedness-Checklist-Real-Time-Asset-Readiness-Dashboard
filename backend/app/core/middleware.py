import time
import json
import logging
from typing import Dict, Tuple
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse
import redis
from app.core.config import settings

logger = logging.getLogger("gvmc_api")

class RateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, requests_limit: int = 100, window_seconds: int = 60):
        super().__init__(app)
        self.requests_limit = requests_limit
        self.window_seconds = window_seconds
        
        # Redis connection setup
        try:
            self.redis_client = redis.from_url(settings.REDIS_URL, decode_responses=True)
            self.redis_client.ping()
            self.use_redis = True
        except Exception:
            logger.warning("Redis is unavailable. Falling back to local memory rate limiting.")
            self.use_redis = False
            self.memory_db: Dict[str, list] = {}

    async def dispatch(self, request: Request, call_next) -> Response:
        # Exclude documentation and health check endpoints
        if request.url.path in ["/docs", "/redoc", "/openapi.json", "/api/v1/health"]:
            return await call_next(request)

        client_ip = request.client.host if request.client else "unknown"
        current_time = time.time()

        if self.use_redis:
            # Redis rate limiter
            key = f"rate_limit:{client_ip}"
            try:
                pipeline = self.redis_client.pipeline()
                pipeline.rpush(key, current_time)
                pipeline.expire(key, self.window_seconds)
                pipeline.lrange(key, 0, -1)
                results = pipeline.execute()
                timestamps = [float(ts) for ts in results[2]]
                
                # Filter old records
                valid_timestamps = [ts for ts in timestamps if current_time - ts < self.window_seconds]
                if len(timestamps) != len(valid_timestamps):
                    self.redis_client.delete(key)
                    if valid_timestamps:
                        self.redis_client.rpush(key, *valid_timestamps)
                        self.redis_client.expire(key, self.window_seconds)
                
                if len(valid_timestamps) > self.requests_limit:
                    return JSONResponse(
                        status_code=429,
                        content={"detail": "Too many requests. Please try again later."}
                    )
            except Exception as e:
                logger.error(f"Redis rate limiter exception: {e}")
        else:
            # Memory-based fallback rate limiter
            timestamps = self.memory_db.get(client_ip, [])
            # Filter timestamps
            timestamps = [ts for ts in timestamps if current_time - ts < self.window_seconds]
            timestamps.append(current_time)
            self.memory_db[client_ip] = timestamps
            
            if len(timestamps) > self.requests_limit:
                return JSONResponse(
                    status_code=429,
                    content={"detail": "Too many requests. Please try again later."}
                )

        return await call_next(request)


class LoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        start_time = time.time()
        path = request.url.path
        method = request.method
        client_ip = request.client.host if request.client else "unknown"

        response = await call_next(request)
        
        duration = time.time() - start_time
        status_code = response.status_code

        log_payload = {
            "client_ip": client_ip,
            "method": method,
            "path": path,
            "status_code": status_code,
            "duration_ms": round(duration * 1000, 2)
        }
        
        # Log status levels
        if status_code >= 500:
            logger.error(json.dumps(log_payload))
        elif status_code >= 400:
            logger.warning(json.dumps(log_payload))
        else:
            logger.info(json.dumps(log_payload))

        return response
