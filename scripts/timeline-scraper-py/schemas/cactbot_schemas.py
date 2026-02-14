from pydantic import BaseModel
from typing import Optional, List


class CactbotTimelineEntry(BaseModel):
    time: float
    name: str
    original_name: Optional[str] = None
    ability_ids: Optional[List[str]] = None
    hit_count: Optional[int] = None
    duration: Optional[float] = None
    window: Optional[float] = None
    is_commented: bool = False


class CactbotTimelineInput(BaseModel):
    boss_id: str
    timeline_path: str
    base_url: str = "https://raw.githubusercontent.com/OverlayPlugin/cactbot/main"
    include_alerts: bool = True
    filter_dodgeable: bool = False


class CactbotTimelineOutput(BaseModel):
    boss_id: str
    timeline_entries: List[CactbotTimelineEntry]
    fetch_success: bool
    error_message: Optional[str] = None
    entry_count: int = 0
