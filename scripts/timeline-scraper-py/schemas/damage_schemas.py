from pydantic import BaseModel
from typing import Optional, List, Dict, Any


class DamageEvent(BaseModel):
    timestamp: float
    ability_name: str
    ability_id: int
    unmitigated_damage: int
    damage_type: str
    target_id: int
    source_id: int
    report_code: str


class TimelineSyncResult(BaseModel):
    action_name: str
    occurrence: int
    cactbot_time: float
    fflogs_time: Optional[float]
    sync_offset: float
    matched: bool
    damage: Optional[int] = None
    target_count: Optional[int] = None


class DamageEventInput(BaseModel):
    reports: List[Any]
    cactbot_timeline: List[Any]
    boss_actor_ids: List[int]
    min_damage_threshold: int = 5000
    sync_window_seconds: float = 20.0


class DamageEventOutput(BaseModel):
    damage_events: List[DamageEvent]
    sync_results: List[TimelineSyncResult]
    events_extracted: int = 0
    matched_actions: int = 0
    unmatched_actions: List[str] = []
