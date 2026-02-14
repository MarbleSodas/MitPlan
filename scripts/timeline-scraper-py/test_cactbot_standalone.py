#!/usr/bin/env python3
"""
Direct test for CactbotTimelineAgent - standalone version
"""

import sys
import os

project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, project_root)

import re
from typing import List, Optional


class CactbotTimelineEntry:
    def __init__(self, time: float, name: str, original_name: Optional[str] = None,
                 ability_ids: Optional[List[str]] = None, hit_count: Optional[int] = None,
                 duration: Optional[float] = None, window: Optional[float] = None,
                 is_commented: bool = False):
        self.time = time
        self.name = name
        self.original_name = original_name
        self.ability_ids = ability_ids
        self.hit_count = hit_count
        self.duration = duration
        self.window = window
        self.is_commented = is_commented


class CactbotTimelineInput:
    def __init__(self, boss_id: str, timeline_path: str,
                 base_url: str = "https://raw.githubusercontent.com/OverlayPlugin/cactbot/main",
                 include_alerts: bool = True, filter_dodgeable: bool = False):
        self.boss_id = boss_id
        self.timeline_path = timeline_path
        self.base_url = base_url
        self.include_alerts = include_alerts
        self.filter_dodgeable = filter_dodgeable


class CactbotTimelineOutput:
    def __init__(self, boss_id: str, timeline_entries: List[CactbotTimelineEntry],
                 fetch_success: bool, error_message: Optional[str] = None, entry_count: int = 0):
        self.boss_id = boss_id
        self.timeline_entries = timeline_entries
        self.fetch_success = fetch_success
        self.error_message = error_message
        self.entry_count = entry_count


class HTTPClient:
    def __init__(self, timeout: float = 30.0):
        import httpx
        self.timeout = timeout
        self._client: Optional[httpx.Client] = None
    
    @property
    def client(self):
        import httpx
        if self._client is None:
            self._client = httpx.Client(
                timeout=self.timeout,
                follow_redirects=True,
            )
        return self._client
    
    def get(self, url: str, **kwargs):
        return self.client.get(url, **kwargs)
    
    def close(self):
        if self._client:
            self._client.close()
            self._client = None


class CactbotTimelineAgent:
    """Atomic agent for fetching and parsing Cactbot raid timelines."""
    
    def __init__(self):
        self.name = "CactbotTimelineAgent"
        self.client = HTTPClient()
        self.include_alerts = True
    
    def run(self, input_data: CactbotTimelineInput) -> CactbotTimelineOutput:
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
            entries = self._parse_timeline(timeline_text, input_data.include_alerts)
            
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
    
    def _parse_timeline(self, timeline_text: str, include_alerts: bool = True) -> List[CactbotTimelineEntry]:
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
            
            after_name = trimmed[match.end():].strip()
            entry_type = self._extract_entry_type(after_name)
            
            if not include_alerts and entry_type in ("alert", "alarm", "info"):
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
    
    def close(self):
        self.client.close()


def test_cactbot_agent():
    agent = CactbotTimelineAgent()
    
    test_cases = [
        {"name": "R1S - Black Cat", "path": "ui/raidboss/data/07-dt/raid/r1s.txt"},
        {"name": "R2S - Honey B. Lovely", "path": "ui/raidboss/data/07-dt/raid/r2s.txt"},
        {"name": "R3S - Brute Bomber", "path": "ui/raidboss/data/07-dt/raid/r3s.txt"},
        {"name": "R4S - Wicked Thunder", "path": "ui/raidboss/data/07-dt/raid/r4s.txt"},
        {"name": "R5S - Dancing Green", "path": "ui/raidboss/data/07-dt/raid/r5s.txt"},
        {"name": "R6S - Sugar Riot", "path": "ui/raidboss/data/07-dt/raid/r6s.txt"},
        {"name": "R7S - Brute Abombinator", "path": "ui/raidboss/data/07-dt/raid/r7s.txt"},
        {"name": "R8S - Howling Blade", "path": "ui/raidboss/data/07-dt/raid/r8s.txt"},
        {"name": "R9S - Vamp Fatale", "path": "ui/raidboss/data/07-dt/raid/r9s.txt"},
        {"name": "R10S - Red Hot", "path": "ui/raidboss/data/07-dt/raid/r10s.txt"},
        {"name": "R11S - The Tyrant", "path": "ui/raidboss/data/07-dt/raid/r11s.txt"},
    ]
    
    print("=" * 60)
    print("Testing CactbotTimelineAgent")
    print("=" * 60)
    
    for test in test_cases:
        input_data = CactbotTimelineInput(boss_id=test["name"], timeline_path=test["path"])
        print(f"\n>>> Testing: {test['name']}")
        
        result = agent.run(input_data)
        
        if result.fetch_success:
            print(f"    ✓ Success! Fetched {result.entry_count} entries")
            for entry in result.timeline_entries[:5]:
                print(f"      {entry.time:6.1f}s - {entry.name}")
        else:
            print(f"    ✗ {result.error_message}")
    
    agent.close()
    print("\n" + "=" * 60)


if __name__ == "__main__":
    test_cactbot_agent()
