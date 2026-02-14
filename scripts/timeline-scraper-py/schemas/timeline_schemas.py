from pydantic import BaseModel
from typing import Optional, List, Dict, Any


class BossAction(BaseModel):
    id: str
    name: str
    time: float
    description: Optional[str] = None
    unmitigated_damage: Optional[str] = None
    damage_type: Optional[str] = None
    importance: str = "medium"
    icon: Optional[str] = None
    is_tank_buster: bool = False
    is_dual_tank_buster: bool = False
    hit_count: Optional[int] = None
    per_hit_damage: Optional[str] = None
    tags: Optional[List[str]] = None
    variants: Optional[List[str]] = None


class TimelineSummary(BaseModel):
    unique_abilities: int
    total_events: int
    reports_used: int
    tank_busters: int
    raidwides: int
    variants_detected: int
    default_coverage: float


class TimelineOutput(BaseModel):
    name: str
    boss_id: str
    boss_name: str
    actions: List[BossAction]
    default_actions: List[BossAction]
    all_variants: Dict[str, List[str]]
    source: str
    generated_at: int
    version: int = 1
    fflogs_report_codes: List[str]
    summary: Optional[TimelineSummary] = None


class TimelineBuildInput(BaseModel):
    aggregated_actions: List[Any]
    variant_info: Any
    boss_id: str
    boss_name: str
    output_format: str = "mitplan"


class TimelineGenerationRequest(BaseModel):
    boss_id: str
    boss_name: Optional[str] = None
    report_count: int = 30
    output_path: Optional[str] = None
    include_dodgeable: bool = False
    dodgeable_threshold: float = 0.7
    fflogs_client_id: str = ""
    fflogs_client_secret: str = ""


class TimelineGenerationResult(BaseModel):
    success: bool
    timeline: Optional[TimelineOutput]
    summary: Optional[TimelineSummary]
    errors: List[str] = []
    warnings: List[str] = []
    output_path: Optional[str] = None
