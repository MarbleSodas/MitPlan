from typing import Optional
from pydantic import BaseModel
from pydantic_settings import BaseSettings


class FFLogsConfig(BaseModel):
    client_id: str = ""
    client_secret: str = ""
    api_url: str = "https://www.fflogs.com/api/v2"
    auth_url: str = "https://www.fflogs.com/oauth/token"
    redirect_uri: str = "http://localhost:8080/callback"


class CactbotConfig(BaseModel):
    base_url: str = "https://raw.githubusercontent.com/OverlayPlugin/cactbot/main"
    
    boss_mapping: dict[str, dict] = {
        # Dawntrail Savage (7.x) - The Arcadion
        "r1s": {
            "name": "Arcadion - AAC Light-heavyweight M1 (Savage)",
            "short_name": "Black Cat",
            "timeline_path": "ui/raidboss/data/07-dt/raid/r1s.txt",
            "zone_id": 1206,
            "mitplan_id": "black-cat",
        },
        "r2s": {
            "name": "Arcadion - AAC Light-heavyweight M2 (Savage)",
            "short_name": "Honey B. Lovely",
            "timeline_path": "ui/raidboss/data/07-dt/raid/r2s.txt",
            "zone_id": 1206,
            "mitplan_id": "honey-b-lovely",
        },
        "r3s": {
            "name": "Arcadion - AAC Light-heavyweight M3 (Savage)",
            "short_name": "Brute Bomber",
            "timeline_path": "ui/raidboss/data/07-dt/raid/r3s.txt",
            "zone_id": 1206,
            "mitplan_id": "brute-bomber",
        },
        "r4s": {
            "name": "Arcadion - AAC Light-heavyweight M4 (Savage)",
            "short_name": "Wicked Thunder",
            "timeline_path": "ui/raidboss/data/07-dt/raid/r4s.txt",
            "zone_id": 1206,
            "mitplan_id": "wicked-thunder",
        },
        "r5s": {
            "name": "AAC Cruiserweight M1 (Savage)",
            "short_name": "Dancing Green",
            "timeline_path": "ui/raidboss/data/07-dt/raid/r5s.txt",
            "zone_id": 1206,
            "mitplan_id": "dancing-green",
        },
        "r6s": {
            "name": "AAC Cruiserweight M2 (Savage)",
            "short_name": "Sugar Riot",
            "timeline_path": "ui/raidboss/data/07-dt/raid/r6s.txt",
            "zone_id": 1206,
            "mitplan_id": "sugar-riot",
        },
        "r7s": {
            "name": "AAC Cruiserweight M3 (Savage)",
            "short_name": "Brute Abombinator",
            "timeline_path": "ui/raidboss/data/07-dt/raid/r7s.txt",
            "zone_id": 1206,
            "mitplan_id": "brute-abombinator",
        },
        "r8s": {
            "name": "AAC Cruiserweight M4 (Savage)",
            "short_name": "Howling Blade",
            "timeline_path": "ui/raidboss/data/07-dt/raid/r8s.txt",
            "zone_id": 1206,
            "mitplan_id": "howling-blade",
        },
        "r9s": {
            "name": "AAC Heavyweight M1 (Savage)",
            "short_name": "Vamp Fatale",
            "timeline_path": "ui/raidboss/data/07-dt/raid/r9s.txt",
            "zone_id": 1206,
            "mitplan_id": "vamp-fatale",
        },
        "r10s": {
            "name": "AAC Heavyweight M2 (Savage)",
            "short_name": "Red Hot",
            "timeline_path": "ui/raidboss/data/07-dt/raid/r10s.txt",
            "zone_id": 1206,
            "mitplan_id": "red-hot",
        },
        "r11s": {
            "name": "AAC Heavyweight M3 (Savage)",
            "short_name": "The Tyrant",
            "timeline_path": "ui/raidboss/data/07-dt/raid/r11s.txt",
            "zone_id": 1206,
            "mitplan_id": "the-tyrant",
        },
    }


class OutputConfig(BaseModel):
    base_path: str = "src/data/bosses"
    format: str = "mitplan"


class ScraperConfig(BaseSettings):
    fflogs_client_id: str = ""
    fflogs_client_secret: str = ""
    include_dodgeable: bool = False
    default_report_count: int = 30
    min_fight_duration: int = 120
    
    fflogs: FFLogsConfig = FFLogsConfig()
    cactbot: CactbotConfig = CactbotConfig()
    output: OutputConfig = OutputConfig()
    
    class Config:
        env_prefix = "MITPLAN_"
        env_file = ".env"
    
    def get_boss_config(self, boss_id: str) -> Optional[dict]:
        return self.cactbot.boss_mapping.get(boss_id)


config = ScraperConfig()
