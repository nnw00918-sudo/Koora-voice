from pydantic import BaseModel
from typing import Optional

class ThreadCreate(BaseModel):
    content: str
    media_url: Optional[str] = None
    media_type: Optional[str] = None
    twitter_url: Optional[str] = None

class ReplyCreate(BaseModel):
    content: str
