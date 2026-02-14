from typing import List, Optional, Dict, Any
from schemas.fflogs_schemas import (
    FFLogsReportData,
    FFLogsReportInput,
    FFLogsReportOutput,
    FFLogsFight,
)
from schemas.cactbot_schemas import CactbotTimelineEntry
from tools.fflogs_client import FFLogsClient, FFLogsAuth


class FFLogsReportAgent:
    """
    Atomic agent for FFLogs authentication and report discovery.
    
    Responsibilities:
    - OAuth2 authentication with FFLogs API
    - Discover recent kill reports for a boss encounter
    - Fetch fight metadata, master data (actors, abilities)
    - Validate reports meet minimum requirements
    """
    
    def __init__(self, client_id: str, client_secret: str):
        self.client_id = client_id
        self.client_secret = client_secret
        self._client: Optional[FFLogsClient] = None
    
    @property
    def client(self) -> FFLogsClient:
        if self._client is None:
            auth = FFLogsAuth(self.client_id, self.client_secret)
            token = auth.get_token()
            self._client = FFLogsClient(token)
        return self._client
    
    def run(self, input_data: FFLogsReportInput) -> FFLogsReportOutput:
        """
        Discover and fetch FFLogs reports for a boss.
        """
        try:
            if input_data.encounter_id:
                reports = self._discover_by_rankings(
                    input_data.encounter_id,
                    input_data.report_count,
                    input_data.require_kill,
                    input_data.min_fight_duration,
                )
            else:
                reports = []
            
            if not reports:
                return FFLogsReportOutput(
                    boss_id=input_data.boss_id,
                    reports=[],
                    fetch_success=False,
                    error_message="No reports found. Ensure encounter_id is configured.",
                    report_count=0,
                )
            
            return FFLogsReportOutput(
                boss_id=input_data.boss_id,
                reports=reports,
                fetch_success=True,
                report_count=len(reports),
            )
            
        except Exception as e:
            return FFLogsReportOutput(
                boss_id=input_data.boss_id,
                reports=[],
                fetch_success=False,
                error_message=str(e),
                report_count=0,
            )
    
    def _discover_by_rankings(
        self,
        encounter_id: int,
        count: int,
        require_kill: bool,
        min_duration: int,
    ) -> List[FFLogsReportData]:
        rankings = self.client.get_rankings(encounter_id, count)
        
        if not rankings:
            return []
        
        valid_reports = []
        
        for ranking in rankings:
            if require_kill and not ranking.get("kill", True):
                continue
            
            report_code = ranking.get("report", {}).get("code") if isinstance(ranking.get("report"), dict) else ranking.get("report")
            
            if not report_code:
                continue
            
            try:
                report_data = self.client.get_report(report_code)
                
                fights = self.client.find_fights_by_encounter(
                    report_data.fights, encounter_id
                )
                kill_fights = self.client.find_kill_fights(fights)
                
                if not kill_fights:
                    continue
                
                fight = max(kill_fights, key=lambda f: f.duration or 0)
                
                if fight.duration and fight.duration < min_duration:
                    continue
                
                valid_reports.append(report_data)
                
            except Exception:
                continue
        
        return valid_reports
    
    def fetch_report(self, report_code: str) -> FFLogsReportData:
        return self.client.get_report(report_code)
    
    def get_fight_events(
        self,
        report_code: str,
        fight_id: int,
        start_time: int,
        end_time: int,
        data_type: str = "DamageTaken",
    ) -> List[Dict[str, Any]]:
        return self.client.get_all_events(
            report_code, fight_id, start_time, end_time, data_type
        )
    
    def extract_boss_actor_ids(self, fight: FFLogsFight, report: FFLogsReportData) -> List[int]:
        if not report.master_data:
            return []
        return self.client.extract_boss_actor_ids(fight, report.master_data.actors)
    
    def create_ability_lookup(self, report: FFLogsReportData) -> Dict[int, str]:
        if not report.master_data:
            return {}
        return self.client.create_ability_lookup(report.master_data.abilities)
    
    def close(self):
        if self._client:
            self._client.close()
