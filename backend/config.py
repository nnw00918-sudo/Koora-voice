"""
Shared configuration for route modules
"""
import os
from motor.motor_asyncio import AsyncIOMotorClient

# Database
MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "koora_voice")
client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

# JWT
SECRET_KEY = os.environ.get("JWT_SECRET_KEY", "koraverse_secret_key_change_in_production")
ALGORITHM = "HS256"
