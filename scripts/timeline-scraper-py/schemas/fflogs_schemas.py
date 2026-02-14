from pydantic import BaseModel
from typing import Optional, List, Any


class FFLogsFight(BaseModel):
    fight_id: int
    encounter_id: int
    name: str
    start_time: int
    end_time: int
    kill: bool
    duration: Optional[int] = None
    difficulty: Optional[int] = None


class FFLogsAbility(BaseModel):
    game_id: int
    name: str
    type: int


class FFLogsActor(BaseModel):
    id: int
    name: str
    actor_type: str


class FFLogsMasterData(BaseModel):
    abilities: List[FFLogsAbility]
    actors: List[FFLogsActor]


class FFLogsReportData(BaseModel):
    code: str
    title: str
    owner: str
    zone_id: int
    fights: List[FFLogsFight]
    start_time: int
    end_time: int
    master_data: Optional[FFLogsMasterData] = None


class FFLogsReportInput(BaseModel):
    boss_id: str
    encounter_id: Optional[int] = None
    zone_id: Optional[int] = None
    report_count: int = 30
    require_kill: bool = True
    min_fight_duration: int = 120


class FFLogsReportOutput(BaseModel):
    boss_id: str
    reports: List[FFLogsReportData]
    fetch_success: bool
    error_message: Optional[str] = None
    report_count: int = 0
