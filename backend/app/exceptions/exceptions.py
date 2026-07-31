from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
import logging

logger = logging.getLogger("gvmc_api")

class BaseAppException(Exception):
    def __init__(self, message: str, status_code: int = 500):
        super().__init__(message)
        self.message = message
        self.status_code = status_code


class AuthenticationError(BaseAppException):
    def __init__(self, message: str = "Authentication failed"):
        super().__init__(message, status_code=401)


class PermissionDenied(BaseAppException):
    def __init__(self, message: str = "Permission denied"):
        super().__init__(message, status_code=403)


class NotFoundError(BaseAppException):
    def __init__(self, message: str = "Resource not found"):
        super().__init__(message, status_code=404)


class ConflictError(BaseAppException):
    def __init__(self, message: str = "Resource conflict occurred"):
        super().__init__(message, status_code=409)


class ValidationError(BaseAppException):
    def __init__(self, message: str = "Validation failed"):
        super().__init__(message, status_code=422)


def register_exception_handlers(app: FastAPI):
    @app.exception_handler(BaseAppException)
    async def app_exception_handler(request: Request, exc: BaseAppException):
        return JSONResponse(
            status_code=exc.status_code,
            content={"detail": exc.message}
        )

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request: Request, exc: RequestValidationError):
        logger.warning(f"Request validation failure: {exc.errors()}")
        return JSONResponse(
            status_code=422,
            content={"detail": "Request validation failed", "errors": exc.errors()}
        )

    @app.exception_handler(Exception)
    async def global_exception_handler(request: Request, exc: Exception):
        logger.error(f"Unhandled system error: {str(exc)}", exc_info=True)
        return JSONResponse(
            status_code=500,
            content={"detail": "An internal server error occurred."}
        )
