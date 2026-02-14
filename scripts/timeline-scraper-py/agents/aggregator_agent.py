from typing import List, Dict, Any, Optional
from schemas.aggregation_schemas import (
    AggregatedAction,
    DamageThresholds,
    AggregationInput,
    AggregationOutput,
)
from schemas.cactbot_schemas import CactbotTimelineEntry
from schemas.damage_schemas import DamageEvent
from tools.statistics import (
    cluster_by_proximity,
    filter_outliers_iqr,
    median,
    std_dev,
    calculate_damage_thresholds,
    get_most_common,
    normalize_action_name,
)


class TimelineAggregatorAgent:
    """
    Atomic agent for aggregating damage values and statistics.
    
    Responsibilities:
    - For each action occurrence: calculate median damage, IQR filter outliers
    - Determine damage type (physical/magical/mixed)
    - Calculate importance based on damage thresholds
    - Handle multi-hit abilities (aggregate per-hit -> total)
    """
    
    def __init__(self):
        self.name = "TimelineAggregatorAgent"
        self.description = "Aggregates damage values and computes statistics"
    
    def run(
        self,
        damage_events: List[DamageEvent],
        cactbot_timeline: List[CactbotTimelineEntry],
        iqr_multiplier: float = 1.5,
        occurrence_gap_seconds: float = 15.0,
    ) -> AggregationOutput:
        """
        Aggregate damage events into timeline actions.
        """
        if not damage_events:
            return AggregationOutput(
                aggregated_actions=[],
                damage_thresholds=DamageThresholds(),
                tank_buster_count=0,
                raidwide_count=0,
            )
        
        events_by_action = self._group_events_by_action(damage_events)
        
        occurrences = self._cluster_occurrences(
            events_by_action, occurrence_gap_seconds
        )
        
        thresholds = calculate_damage_thresholds(occurrences)
        
        aggregated_actions = []
        
        for occ in occurrences:
            action = self._create_aggregated_action(occ, thresholds)
            aggregated_actions.append(action)
        
        aggregated_actions.sort(key=lambda a: a.time)
        
        tank_buster_count = sum(1 for a in aggregated_actions if a.is_tank_buster)
        raidwide_count = len(aggregated_actions) - tank_buster_count
        
        return AggregationOutput(
            aggregated_actions=aggregated_actions,
            damage_thresholds=DamageThresholds(**thresholds),
            tank_buster_count=tank_buster_count,
            raidwide_count=raidwide_count,
        )
    
    def _group_events_by_action(
        self,
        events: List[DamageEvent],
    ) -> Dict[str, List[DamageEvent]]:
        grouped: Dict[str, List[DamageEvent]] = {}
        
        for event in events:
            key = normalize_action_name(event.ability_name)
            
            if key not in grouped:
                grouped[key] = []
            
            grouped[key].append(event)
        
        return grouped
    
    def _cluster_occurrences(
        self,
        events_by_action: Dict[str, List[DamageEvent]],
        gap_seconds: float,
    ) -> List[Dict[str, Any]]:
        occurrences = []
        
        for action_name, events in events_by_action.items():
            times = [e.timestamp for e in events]
            clusters = cluster_by_proximity(times, gap_seconds)
            
            for cluster_idx, cluster in enumerate(clusters):
                cluster_events = [
                    e for e in events
                    if cluster["min"] <= e.timestamp <= cluster["max"]
                ]
                
                damages = [e.unmitigated_damage for e in cluster_events]
                filtered_damages, _ = filter_outliers_iqr(damages, 1.5)
                
                target_ids = list(set(e.target_id for e in cluster_events))
                target_counts = [len(target_ids)]
                
                damage_types = [e.damage_type for e in cluster_events]
                dominant_damage_type = get_most_common(damage_types)
                
                occurrences.append({
                    "action_name": action_name,
                    "occurrence": cluster_idx + 1,
                    "times": cluster["values"],
                    "median_time": cluster["median"],
                    "median_damage": median(filtered_damages) if filtered_damages else 0,
                    "damage_type": dominant_damage_type,
                    "target_count_median": median(target_counts),
                    "target_count_std_dev": std_dev(target_counts),
                    "hit_count": len(cluster_events),
                })
        
        return sorted(occurrences, key=lambda o: o["median_time"])
    
    def _create_aggregated_action(
        self,
        occurrence: Dict[str, Any],
        thresholds: Dict[str, float],
    ) -> AggregatedAction:
        name = occurrence["action_name"]
        damage = occurrence["median_damage"]
        damage_type = occurrence["damage_type"]
        target_count = occurrence.get("target_count_median", 8)
        
        is_tank_buster = self._detect_tank_buster(name, damage, target_count, thresholds)
        is_dual = is_tank_buster and 1.5 <= target_count <= 2.5
        
        importance = self._determine_importance(
            damage, is_tank_buster, thresholds
        )
        
        action_id = (
            name.lower()
            .replace(" ", "_")
            .replace("'", "")
            .replace("(", "")
            .replace(")", "") +
            f"_{occurrence['occurrence']}"
        )
        
        return AggregatedAction(
            id=action_id,
            name=name.title(),
            time=round(occurrence["median_time"], 1),
            occurrence=occurrence["occurrence"],
            unmitigated_damage=self._format_damage(damage),
            damage_type=damage_type,
            target_count_median=target_count,
            target_count_std_dev=occurrence.get("target_count_std_dev", 0),
            importance=importance,
            is_tank_buster=is_tank_buster,
            is_dual_tank_buster=is_dual,
        )
    
    def _detect_tank_buster(
        self,
        name: str,
        damage: float,
        target_count: float,
        thresholds: Dict[str, float],
    ) -> bool:
        buster_patterns = [
            "buster", "cleave", "divide", "saber", "slam", "strike"
        ]
        
        name_lower = name.lower()
        if any(p in name_lower for p in buster_patterns):
            return True
        
        is_consistent = target_count >= 0.8 and target_count <= 2.5
        is_high_damage = damage >= thresholds.get("p75", 0)
        
        return is_consistent and is_high_damage
    
    def _determine_importance(
        self,
        damage: float,
        is_tank_buster: bool,
        thresholds: Dict[str, float],
    ) -> str:
        if damage >= thresholds.get("p90", 0):
            return "critical"
        if is_tank_buster:
            return "high"
        if damage >= thresholds.get("p75", 0):
            return "high"
        if damage >= thresholds.get("p50", 0):
            return "medium"
        return "low"
    
    def _format_damage(self, damage: float) -> str:
        if damage >= 1000:
            return f"~{int(damage):,}"
        return str(int(damage))
