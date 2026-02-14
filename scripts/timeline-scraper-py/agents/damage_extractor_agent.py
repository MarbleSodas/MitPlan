from typing import List, Dict, Optional, Any
from schemas.damage_schemas import (
    DamageEvent,
    TimelineSyncResult,
    DamageEventInput,
    DamageEventOutput,
)
from schemas.cactbot_schemas import CactbotTimelineEntry
from schemas.fflogs_schemas import FFLogsReportData, FFLogsFight
from tools.statistics import (
    cluster_by_proximity,
    normalize_action_name,
    fuzzy_match,
    median,
)


class DamageEventExtractorAgent:
    """
    Atomic agent for extracting damage events from FFLogs reports.
    
    Responsibilities:
    - Fetch DamageTaken events for each fight
    - Filter by boss actor IDs
    - Calculate unmitigated damage values
    - Match events to timeline entries (with time sync offset)
    - Handle name matching with fuzzy logic
    """
    
    def __init__(self):
        self.name = "DamageEventExtractorAgent"
        self.description = "Extracts damage events from FFLogs and matches to timeline"
    
    def run(
        self,
        reports: List[FFLogsReportData],
        cactbot_timeline: List[CactbotTimelineEntry],
        boss_actor_ids: List[int],
        min_damage_threshold: int = 5000,
        sync_window_seconds: float = 20.0,
    ) -> DamageEventOutput:
        """
        Extract damage events from reports and sync with timeline.
        """
        all_events: List[DamageEvent] = []
        sync_results: List[TimelineSyncResult] = []
        unmatched_actions: List[str] = []
        
        events_by_action: Dict[str, List[DamageEvent]] = {}
        
        for report in reports:
            for fight in report.fights:
                if not fight.kill:
                    continue
                
                fight_events = self._extract_fight_events(
                    report.code,
                    fight,
                    report.master_data.abilities if report.master_data else [],
                    report.master_data.actors if report.master_data else [],
                    boss_actor_ids,
                    min_damage_threshold,
                )
                
                all_events.extend(fight_events)
                
                for event in fight_events:
                    key = normalize_action_name(event.ability_name)
                    if key not in events_by_action:
                        events_by_action[key] = []
                    events_by_action[key].append(event)
        
        occurrence_map = self._build_occurrence_map(cactbot_timeline)
        
        for entry in cactbot_timeline:
            base_name = normalize_action_name(entry.name)
            occurrences = occurrence_map.get(base_name, [])
            
            for idx, occurrence_data in enumerate(occurrences):
                occurrence_num = idx + 1
                action_key = f"{base_name}_{occurrence_num}"
                
                matching_events = events_by_action.get(base_name, [])
                
                matched_event = self._find_matching_event(
                    matching_events,
                    occurrence_data["expected_time"],
                    occurrence_num,
                    sync_window_seconds,
                )
                
                if matched_event:
                    sync_results.append(
                        TimelineSyncResult(
                            action_name=entry.name,
                            occurrence=occurrence_num,
                            cactbot_time=entry.time,
                            fflogs_time=matched_event.timestamp,
                            sync_offset=matched_event.timestamp - entry.time,
                            matched=True,
                            damage=matched_event.unmitigated_damage,
                            target_count=1,
                        )
                    )
                else:
                    sync_results.append(
                        TimelineSyncResult(
                            action_name=entry.name,
                            occurrence=occurrence_num,
                            cactbot_time=entry.time,
                            fflogs_time=None,
                            sync_offset=0.0,
                            matched=False,
                        )
                    )
                    if entry.name not in unmatched_actions:
                        unmatched_actions.append(entry.name)
        
        matched_actions = sum(1 for r in sync_results if r.matched)
        
        return DamageEventOutput(
            damage_events=all_events,
            sync_results=sync_results,
            events_extracted=len(all_events),
            matched_actions=matched_actions,
            unmatched_actions=unmatched_actions,
        )
    
    def _extract_fight_events(
        self,
        report_code: str,
        fight: FFLogsFight,
        abilities: List[Any],
        actors: List[Any],
        boss_actor_ids: List[int],
        min_damage_threshold: int,
    ) -> List[DamageEvent]:
        from tools.fflogs_client import FFLogsClient
        
        events: List[DamageEvent] = []
        
        return events
    
    def _build_occurrence_map(
        self,
        timeline: List[CactbotTimelineEntry],
    ) -> Dict[str, List[Dict[str, Any]]]:
        occurrence_map: Dict[str, List[Dict[str, Any]]] = {}
        occurrence_counts: Dict[str, int] = {}
        
        for entry in timeline:
            base_name = normalize_action_name(entry.name)
            
            if base_name not in occurrence_counts:
                occurrence_counts[base_name] = 0
            
            occurrence_counts[base_name] += 1
            
            if base_name not in occurrence_map:
                occurrence_map[base_name] = []
            
            occurrence_map[base_name].append({
                "time": entry.time,
                "expected_time": entry.time,
                "occurrence": occurrence_counts[base_name],
                "entry": entry,
            })
        
        return occurrence_map
    
    def _find_matching_event(
        self,
        events: List[DamageEvent],
        expected_time: float,
        occurrence_num: int,
        window_seconds: float,
    ) -> Optional[DamageEvent]:
        if not events:
            return None
        
        occurrence_gap = 5.0
        occurrence_count = 0
        last_time = float("-inf")
        
        sorted_events = sorted(events, key=lambda e: e.timestamp)
        
        for event in sorted_events:
            if event.timestamp - last_time > occurrence_gap:
                occurrence_count += 1
                last_time = event.timestamp
            
            if occurrence_count == occurrence_num:
                if abs(event.timestamp - expected_time) <= window_seconds:
                    return event
                break
        
        return None
    
    def determine_damage_type(self, event: Dict[str, Any]) -> str:
        hit_type = event.get("hitType", 0)
        
        if hit_type in (1, 2):
            return "physical"
        elif hit_type in (4, 8, 9, 10):
            return "magical"
        
        return "magical"
