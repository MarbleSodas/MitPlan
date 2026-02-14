from pydantic import BaseModel
from typing import Optional, List, Dict, Any


class AggregatedAction(BaseModel):
    id: str
    name: str
    time: float
    occurrence: int
    unmitigated_damage: str
    damage_type: Optional[str] = None
    hit_count: Optional[int] = None
    per_hit_damage: Optional[str] = None
    target_count_median: float = 8.0
    target_count_std_dev: float = 0.0
    importance: str = "medium"
    is_tank_buster: bool = False
    is_dual_tank_buster: bool = False
    hit_rate: Optional[float] = None
    confidence: Optional[float] = None


class DamageThresholds(BaseModel):
    p50: float = 0.0
    p75: float = 0.0
    p90: float = 0.0
    median: float = 0.0


class AggregationInput(BaseModel):
    damage_events: List[Any]
    cactbot_timeline: List[Any]
    iqr_multiplier: float = 1.5
    occurrence_gap_seconds: float = 15.0


class AggregationOutput(BaseModel):
    aggregated_actions: List[AggregatedAction]
    damage_thresholds: DamageThresholds
    tank_buster_count: int = 0
    raidwide_count: int = 0
