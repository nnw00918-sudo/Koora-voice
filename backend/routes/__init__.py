# Routes module
# Individual routers are imported directly in server.py

# Extracted routes from server.py
from .auth import router as auth_router, init_auth_router
from .users import router as users_router, init_users_router
from .threads import router as threads_router, init_threads_router
from .rooms import router as rooms_router, init_rooms_router
from .messages import router as messages_router, init_messages_router
from .admin import router as admin_router, init_admin_router

__all__ = [
    'auth_router', 'init_auth_router',
    'users_router', 'init_users_router', 
    'threads_router', 'init_threads_router',
    'rooms_router', 'init_rooms_router',
    'messages_router', 'init_messages_router',
    'admin_router', 'init_admin_router'
]
