import re
from typing import List, Optional
from schemas.cactbot_schemas import (
    CactbotTimelineEntry,
    CactbotTimelineInput,
    CactbotTimelineOutput,
)
from tools.http_client import HTTPClient


class CactbotTimelineAgent:
    """
    Atomic agent for fetching and parsing Cactbot raid timelines.
    
    Responsibilities:
    - Fetch timeline text from raw GitHub URL
    - Parse timeline entries (abilities, timings, IDs)
    - Handle name variations and normalize
    - Extract metadata (hit counts, duration, window hints)
    """
    
    def __init__(self):
        self.name = "CactbotTimelineAgent"
        self.description = "Fetches and parses boss timeline from Cactbot repository"
        self.client = HTTPClient()
    
    def run(self, input_data: CactbotTimelineInput) -> CactbotTimelineOutput:
        """
        Fetch and parse a Cactbot timeline for a boss.
        """
        url = f"{input_data.base_url}/{input_data.timeline_path}"
        
        try:
            response = self.client.get(url)
            
            if response.status_code == 404:
                return CactbotTimelineOutput(
                    boss_id=input_data.boss_id,
                    timeline_entries=[],
                    fetch_success=False,
                    error_message=f"Cactbot timeline not available for {input_data.boss_id}",
                    entry_count=0,
                )
            
            if response.status_code != 200:
                return CactbotTimelineOutput(
                    boss_id=input_data.boss_id,
                    timeline_entries=[],
                    fetch_success=False,
                    error_message=f"Failed to fetch timeline: {response.status_code}",
                    entry_count=0,
                )
            
            timeline_text = response.text
            entries = self._parse_timeline(
                timeline_text,
                include_alerts=input_data.include_alerts,
                filter_dodgeable=input_data.filter_dodgeable,
            )
            
            return CactbotTimelineOutput(
                boss_id=input_data.boss_id,
                timeline_entries=entries,
                fetch_success=True,
                entry_count=len(entries),
            )
            
        except Exception as e:
            return CactbotTimelineOutput(
                boss_id=input_data.boss_id,
                timeline_entries=[],
                fetch_success=False,
                error_message=str(e),
                entry_count=0,
            )
    
    def _parse_timeline(
        self,
        timeline_text: str,
        include_alerts: bool = True,
        filter_dodgeable: bool = False,
    ) -> List[CactbotTimelineEntry]:
        entries = []
        lines = timeline_text.split("\n")
        
        for line in lines:
            trimmed = line.strip()
            
            if not trimmed or trimmed.startswith("//"):
                continue
            
            if trimmed.startswith("#") and not self._is_timeline_entry(trimmed):
                continue
            
            is_commented = trimmed.startswith("#")
            
            match = re.match(r"^#?\s*(\d+\.?\d*)\s+\"([^\"]+)\"", trimmed)
            if not match:
                continue
            
            time_str, name = match.groups()
            time = float(time_str)
            
            name = name.strip()
            
            if name.startswith("--") and name.endswith("--"):
                continue
            
            after_name = trimmed[match.end() :].strip()
            
            entry_type = self._extract_entry_type(after_name)
            
            if not include_alerts and entry_type in ("alert", "alarm", "info"):
                continue
            
            if filter_dodgeable and self._is_dodgeable(name, entry_type):
                continue
            
            if is_commented and entry_type == "Ability":
                continue
            
            ability_ids = self._extract_ability_ids(after_name)
            
            hit_count_match = re.search(r"\s+x(\d+)$", name, re.IGNORECASE)
            hit_count = int(hit_count_match.group(1)) if hit_count_match else None
            
            duration_match = re.search(r"duration\s+(\d+\.?\d*)", after_name, re.IGNORECASE)
            duration = float(duration_match.group(1)) if duration_match else None
            
            window_match = re.search(r"window\s+(\d+\.?\d*)", after_name, re.IGNORECASE)
            window = float(window_match.group(1)) if window_match else None
            
            original_name = name
            if "(cast)" in name.lower():
                original_name = name
                name = re.sub(r"\s*\(cast\)\s*$", "", name, flags=re.IGNORECASE).strip()
            
            entries.append(
                CactbotTimelineEntry(
                    time=round(time, 1),
                    name=name,
                    original_name=original_name if original_name != name else None,
                    ability_ids=ability_ids if ability_ids else None,
                    hit_count=hit_count,
                    duration=duration,
                    window=window,
                    is_commented=is_commented,
                )
            )
        
        return sorted(entries, key=lambda e: e.time)
    
    def _is_timeline_entry(self, line: str) -> bool:
        return bool(re.match(r"^#?\s*\d+\.?\d*\s+\"", line))
    
    def _extract_entry_type(self, text: str) -> Optional[str]:
        type_match = re.match(r"^(Ability|StartsUsing|ActorControl|InCombat)\b", text, re.IGNORECASE)
        if type_match:
            return type_match.group(1).capitalize()
        
        legacy_match = re.match(r"^(alert|alarm|info)\b", text, re.IGNORECASE)
        if legacy_match:
            return legacy_match.group(1).lower()
        
        return None
    
    def _extract_ability_ids(self, text: str) -> List[str]:
        array_match = re.search(r"id:\s*\[([^\]]+)\]", text)
        if array_match:
            ids = array_match.group(1).split(",")
            return [i.strip().strip('"') for i in ids if i.strip()]
        
        single_match = re.search(r'id:\s*"([^"]+)"', text)
        if single_match:
            return [single_match.group(1)]
        
        return []
    
    def _is_dodgeable(self, name: str, entry_type: Optional[str]) -> bool:
        dodgeable_patterns = [
            r"\b(spread|stack|outside|inside|middle|away|close)\b",
            r"\b(sphere|circle|donut|line|cone|cleave)\b",
            r"\b(safe|danger)\b",
            r"\b(knockback|pull|push|drag)\b",
            r"\b(tether|beam|laser)\b",
        ]
        
        if entry_type == "info" or not entry_type:
            return any(re.search(p, name, re.IGNORECASE) for p in dodgeable_patterns)
        
        return False
    
    def close(self):
        self.client.close()
