# Routes module
# Individual routers are imported directly in server.py

# Extracted routes from server.py
from .auth import router as auth_router, init_auth_router
from .users import router as users_router, init_users_router
from .threads import router as threads_router, init_threads_router

__all__ = [
    'auth_router', 'init_auth_router',
    'users_router', 'init_users_router', 
    'threads_router', 'init_threads_router'
]
