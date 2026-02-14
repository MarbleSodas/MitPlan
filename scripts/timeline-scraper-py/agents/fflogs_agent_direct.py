"""
FFLogs Report Agent - Direct HTTP, no LLM needed
"""

import httpx
from typing import List, Optional, Dict, Any
from pydantic import BaseModel


class FFLogsFight(BaseModel):
    fight_id: int
    encounter_id: int
    name: str
    start_time: int
    end_time: int
    kill: bool
    duration: Optional[int] = None


class FFLogsReportData(BaseModel):
    code: str
    title: str
    owner: str
    zone_id: int
    fights: List[FFLogsFight]
    start_time: int
    end_time: int


class FFLogsClient:
    """Direct HTTP client for FFLogs API - no LLM needed"""
    
    def __init__(self, access_token: str):
        self.access_token = access_token
        self.api_url = "https://www.fflogs.com/api/v2"
        self._client = httpx.Client(timeout=30.0)
    
    def _headers(self) -> Dict[str, str]:
        return {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.access_token}",
        }
    
    def _query(self, query: str, variables: Dict[str, Any]) -> Dict[str, Any]:
        response = self._client.post(
            self.api_url,
            json={"query": query, "variables": variables},
            headers=self._headers(),
        )
        
        if response.status_code != 200:
            raise Exception(f"FFLogs API error: {response.status_code}")
        
        data = response.json()
        if "errors" in data:
            raise Exception(f"GraphQL errors: {data['errors']}")
        
        return data.get("data", {})
    
    def get_report(self, code: str) -> FFLogsReportData:
        query = """
        query ReportData($code: String!) {
            reportData {
                report(code: $code) {
                    code
                    title
                    owner { name }
                    zone { id }
                    fights {
                        id
                        encounterID
                        name
                        startTime
                        endTime
                        kill
                    }
                    startTime
                    endTime
                    masterData {
                        actors { id name type }
                        abilities { gameID name }
                    }
                }
            }
        }
        """
        
        data = self._query(query, {"code": code})
        report = data["reportData"]["report"]
        
        return FFLogsReportData(
            code=report["code"],
            title=report["title"],
            owner=report["owner"]["name"],
            zone_id=report["zone"]["id"],
            fights=[FFLogsFight(**f) for f in report["fights"]],
            start_time=report["startTime"],
            end_time=report["endTime"],
        )
    
    def get_events(
        self,
        code: str,
        fight_id: int,
        start_time: int,
        end_time: int,
        limit: int = 10000,
    ) -> List[Dict[str, Any]]:
        query = """
        query Events($code: String!, $fightId: Int!, $start: Int!, $end: Int!, $limit: Int!) {
            reportData {
                report(code: $code) {
                    events(fightIDs:[$fightId], startTime:$start, endTime:$end, dataType:DamageTaken, limit:$limit) {
                        data
                    }
                }
            }
        }
        """
        
        data = self._query(query, {
            "code": code,
            "fightId": fight_id,
            "start": start_time,
            "end": end_time,
            "limit": limit,
        })
        
        return data["reportData"]["report"]["events"]["data"]
    
    def get_rankings(self, encounter_id: int, limit: int = 50) -> List[Dict[str, Any]]:
        query = """
        query Rankings($id: Int!) {
            worldData {
                encounter(id: $id) {
                    fightRankings
                }
            }
        }
        """
        
        try:
            data = self._query(query, {"id": encounter_id})
            rankings = data.get("worldData", {}).get("encounter", {}).get("fightRankings", {})
            if isinstance(rankings, dict) and "rankings" in rankings:
                return rankings["rankings"][:limit]
        except:
            pass
        
        return []
    
    def close(self):
        self._client.close()


class FFLogsAuth:
    """OAuth2 authentication for FFLogs"""
    
    def __init__(self, client_id: str, client_secret: str):
        self.client_id = client_id
        self.client_secret = client_secret
    
    def get_token(self) -> str:
        response = httpx.post(
            "https://www.fflogs.com/oauth/token",
            data={
                "grant_type": "client_credentials",
                "client_id": self.client_id,
                "client_secret": self.client_secret,
            },
        )
        
        if response.status_code != 200:
            raise Exception(f"Auth failed: {response.status_code}")
        
        return response.json()["access_token"]


class FFLogsReportAgent:
    """
    Direct agent for FFLogs - fetches reports without LLM.
    
    Use this for:
    - Authentication
    - Report discovery
    - Event extraction
    
    For complex correlation with Cactbot timelines, use the correlation agent.
    """
    
    def __init__(self, client_id: str, client_secret: str):
        self.auth = FFLogsAuth(client_id, client_secret)
        self._client: Optional[FFLogsClient] = None
    
    @property
    def client(self) -> FFLogsClient:
        if self._client is None:
            token = self.auth.get_token()
            self._client = FFLogsClient(token)
        return self._client
    
    def discover_reports(self, encounter_id: int, count: int = 30) -> List[str]:
        """Get report codes for an encounter"""
        rankings = self.client.get_rankings(encounter_id, count)
        
        report_codes = []
        for r in rankings:
            if r.get("kill"):
                code = r.get("report", {}).get("code") if isinstance(r.get("report"), dict) else r.get("report")
                if code:
                    report_codes.append(code)
        
        return report_codes[:count]
    
    def fetch_report(self, code: str) -> FFLogsReportData:
        """Fetch a single report"""
        return self.client.get_report(code)
    
    def fetch_events(self, code: str, fight_id: int, start: int, end: int) -> List[Dict[str, Any]]:
        """Fetch damage events from a fight"""
        return self.client.get_events(code, fight_id, start, end)
    
    def close(self):
        if self._client:
            self._client.close()
