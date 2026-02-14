from pydantic import BaseModel
from typing import Optional, List, Dict, Any


class TimelineBranch(BaseModel):
    branch_id: str
    description: str
    action_sequence: List[str]
    occurrence_count: int
    occurrence_ratio: float
    is_default: bool


class TimelineVariant(BaseModel):
    branch_point_time: float
    branch_point_name: str
    branches: List[TimelineBranch]


class VariantDetectionInput(BaseModel):
    damage_events_by_report: Dict[str, List["Any"]]
    cactbot_timeline: List["Any"]
    cluster_time_window: float = 15.0
    min_occurrence_ratio: float = 0.3


class VariantDetectionOutput(BaseModel):
    branches: List[TimelineBranch]
    default_timeline: List[str]
    variant_points: List[TimelineVariant]
    total_unique_timelines: int = 0
    default_coverage: float = 0.0
