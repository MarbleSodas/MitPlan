import json
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
from tools.http_client import HTTPClient
from schemas.fflogs_schemas import (
    FFLogsReportData,
    FFLogsFight,
    FFLogsAbility,
    FFLogsActor,
    FFLogsMasterData,
)


class FFLogsClient:
    def __init__(self, access_token: str, api_url: str = "https://www.fflogs.com/api/v2"):
        self.access_token = access_token
        self.api_url = api_url
        self.client = HTTPClient(api_url)
        self._rate_limit_remaining = 60
        self._rate_limit_reset = datetime.now()
    
    def _headers(self) -> Dict[str, str]:
        return {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.access_token}",
        }
    
    def _query(self, query: str, variables: Dict[str, Any]) -> Dict[str, Any]:
        response = self.client.post(
            "",
            json={"query": query, "variables": variables},
            headers=self._headers(),
        )
        
        if response.status_code != 200:
            raise Exception(f"FFLogs API error: {response.status_code} {response.text}")
        
        data = response.json()
        
        if "errors" in data:
            raise Exception(f"GraphQL errors: {json.dumps(data['errors'])}")
        
        if "data" not in data:
            raise Exception("No data returned from FFLogs API")
        
        return data["data"]
    
    def get_report(self, code: str) -> FFLogsReportData:
        query = """
        query ReportData($code: String!) {
            reportData {
                report(code: $code) {
                    code
                    title
                    owner { name }
                    zone { id name }
                    fights {
                        id
                        encounterID
                        name
                        gameZone { id name }
                        startTime
                        endTime
                        kill
                        difficulty
                        enemyNPCs { id gameID groupCount instanceCount }
                        friendlyPlayers
                    }
                    startTime
                    endTime
                    masterData {
                        actors { id name type subType }
                        abilities { gameID name type }
                    }
                }
            }
        }
        """
        
        data = self._query(query, {"code": code})
        report = data["reportData"]["report"]
        
        master_data = None
        if report.get("masterData"):
            md = report["masterData"]
            master_data = FFLogsMasterData(
                abilities=[FFLogsAbility(**a) for a in md.get("abilities", [])],
                actors=[FFLogsActor(id=a["id"], name=a["name"], actor_type=a.get("type", "Unknown")) 
                        for a in md.get("actors", [])],
            )
        
        return FFLogsReportData(
            code=report["code"],
            title=report["title"],
            owner=report["owner"]["name"],
            zone_id=report["zone"]["id"],
            fights=[FFLogsFight(
                fight_id=f["id"],
                encounter_id=f["encounterID"],
                name=f["name"],
                start_time=f["startTime"],
                end_time=f["endTime"],
                kill=f["kill"],
                difficulty=f.get("difficulty"),
                duration=(f["endTime"] - f["startTime"]) // 1000,
            ) for f in report["fights"]],
            start_time=report["startTime"],
            end_time=report["endTime"],
            master_data=master_data,
        )
    
    def get_events(
        self,
        code: str,
        fight_id: int,
        start_time: int = 0,
        end_time: int = 9999999999,
        data_type: str = "DamageTaken",
        limit: int = 10000,
    ) -> tuple[List[Dict[str, Any]], Optional[int]]:
        query = """
        query EventsData($code: String!, $fightId: Int!, $startTime: Int!, $endTime: Int!, $dataType: String!, $limit: Int!) {
            reportData {
                report(code: $code) {
                    events(fightIDs: [$fightId], startTime: $startTime, endTime: $endTime, dataType: $dataType, limit: $limit) {
                        data
                        nextPageTimestamp
                    }
                }
            }
        }
        """
        
        variables = {
            "code": code,
            "fightId": fight_id,
            "startTime": start_time,
            "endTime": end_time,
            "dataType": data_type,
            "limit": limit,
        }
        
        data = self._query(query, variables)
        events_data = data["reportData"]["report"]["events"]
        
        return events_data["data"], events_data.get("nextPageTimestamp")
    
    def get_all_events(
        self,
        code: str,
        fight_id: int,
        start_time: int = 0,
        end_time: int = 9999999999,
        data_type: str = "DamageTaken",
    ) -> List[Dict[str, Any]]:
        all_events = []
        current_start = start_time
        
        while True:
            events, next_page = self.get_events(
                code, fight_id, current_start, end_time, data_type
            )
            all_events.extend(events)
            
            if next_page is None or next_page >= end_time:
                break
            
            current_start = next_page
        
        return all_events
    
    def get_rankings(self, encounter_id: int, limit: int = 100) -> List[Dict[str, Any]]:
        query = """
        query EncounterFightRankings($encounterId: Int!) {
            worldData {
                encounter(id: $encounterId) {
                    id
                    name
                    fightRankings(page: 1)
                }
            }
        }
        """
        
        try:
            data = self._query(query, {"encounterId": encounter_id})
            rankings_data = data.get("worldData", {}).get("encounter", {}).get("fightRankings")
            
            if not rankings_data:
                return []
            
            if isinstance(rankings_data, dict) and "rankings" in rankings_data:
                return rankings_data["rankings"][:limit]
            elif isinstance(rankings_data, list):
                return rankings_data[:limit]
            
            return []
        except Exception:
            return []
    
    def find_fights_by_encounter(
        self, fights: List[FFLogsFight], encounter_id: int
    ) -> List[FFLogsFight]:
        return [f for f in fights if f.encounter_id == encounter_id]
    
    def find_kill_fights(self, fights: List[FFLogsFight]) -> List[FFLogsFight]:
        return [f for f in fights if f.kill]
    
    def extract_boss_actor_ids(
        self, fight: FFLogsFight, actors: List[FFLogsActor]
    ) -> List[int]:
        boss_ids = []
        
        for actor in actors:
            if actor.actor_type in ("Boss", "Unknown"):
                boss_ids.append(actor.id)
        
        return boss_ids
    
    def create_ability_lookup(
        self, abilities: List[FFLogsAbility]
    ) -> Dict[int, str]:
        return {a.game_id: a.name for a in abilities}
    
    def close(self):
        self.client.close()


class FFLogsAuth:
    def __init__(self, client_id: str, client_secret: str, auth_url: str = "https://www.fflogs.com/oauth/token"):
        self.client_id = client_id
        self.client_secret = client_secret
        self.auth_url = auth_url
    
    def get_token(self) -> str:
        client = HTTPClient()
        
        response = client.post(
            self.auth_url,
            data={
                "grant_type": "client_credentials",
                "client_id": self.client_id,
                "client_secret": self.client_secret,
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
        
        client.close()
        
        if response.status_code != 200:
            raise Exception(f"FFLogs auth error: {response.status_code} {response.text}")
        
        data = response.json()
        return data["access_token"]
