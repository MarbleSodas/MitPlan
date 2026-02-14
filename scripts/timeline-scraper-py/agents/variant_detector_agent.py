from typing import List, Dict, Optional, Any, Tuple
from schemas.variant_schemas import (
    TimelineBranch,
    TimelineVariant,
    VariantDetectionInput,
    VariantDetectionOutput,
)
from schemas.cactbot_schemas import CactbotTimelineEntry
from schemas.damage_schemas import DamageEvent
from tools.statistics import (
    cluster_by_proximity,
    normalize_action_name,
    median,
    get_most_common,
)


class TimelineVariantDetectorAgent:
    """
    Atomic agent for detecting timeline variants.
    
    This is the core innovation for handling variable boss fight timelines:
    - Cluster actions by time + name similarity across reports
    - Identify branching points (where different reports show different abilities)
    - Calculate occurrence frequency for each branch
    - Determine "default" timeline (highest frequency path)
    """
    
    def __init__(self):
        self.name = "TimelineVariantDetectorAgent"
        self.description = "Identifies timeline branches and determines default path"
    
    def run(
        self,
        damage_events_by_report: Dict[str, List[DamageEvent]],
        cactbot_timeline: List[CactbotTimelineEntry],
        cluster_time_window: float = 15.0,
        min_occurrence_ratio: float = 0.3,
    ) -> VariantDetectionOutput:
        """
        Detect timeline variants across multiple reports.
        
        Key logic:
        1. Group actions by time windows
        2. For each time window, identify what abilities occurred
        3. Build action sequences for each report
        4. Find common sequences (branches) and their frequencies
        5. Mark the most common as "default"
        """
        time_buckets = self._bucket_actions_by_time(
            damage_events_by_report, cluster_time_window
        )
        
        report_sequences = self._build_action_sequences(time_buckets)
        
        branches = self._identify_branches(
            report_sequences, min_occurrence_ratio
        )
        
        default_timeline = self._determine_default_timeline(branches)
        
        variant_points = self._find_variant_points(
            time_buckets, report_sequences, default_timeline, min_occurrence_ratio
        )
        
        total_reports = len(damage_events_by_report)
        default_count = next(
            (b.occurrence_count for b in branches if b.is_default), 0
        )
        default_coverage = default_count / total_reports if total_reports > 0 else 0.0
        
        return VariantDetectionOutput(
            branches=branches,
            default_timeline=default_timeline,
            variant_points=variant_points,
            total_unique_timelines=len(branches),
            default_coverage=default_coverage,
        )
    
    def _bucket_actions_by_time(
        self,
        events_by_report: Dict[str, List[DamageEvent]],
        time_window: float,
    ) -> Dict[int, Dict[str, List[str]]]:
        buckets: Dict[int, Dict[str, List[str]]] = {}
        
        for report_code, events in events_by_report.items():
            bucketed: Dict[int, List[str]] = {}
            
            for event in events:
                bucket_key = int(event.timestamp / time_window)
                
                action_name = normalize_action_name(event.ability_name)
                
                if bucket_key not in bucketed:
                    bucketed[bucket_key] = []
                
                if action_name not in bucketed[bucket_key]:
                    bucketed[bucket_key].append(action_name)
            
            for bucket_key, actions in bucketed.items():
                if bucket_key not in buckets:
                    buckets[bucket_key] = {}
                
                for action in actions:
                    if action not in buckets[bucket_key]:
                        buckets[bucket_key][action] = []
                    buckets[bucket_key][action].append(report_code)
        
        return buckets
    
    def _build_action_sequences(
        self,
        time_buckets: Dict[int, Dict[str, List[str]]],
    ) -> List[List[str]]:
        if not time_buckets:
            return []
        
        sorted_keys = sorted(time_buckets.keys())
        
        sequences: List[List[str]] = []
        
        for bucket_key in sorted_keys:
            actions = list(time_buckets[bucket_key].keys())
            
            if not sequences:
                sequences = [[a] for a in actions]
            else:
                new_sequences = []
                for seq in sequences:
                    for action in actions:
                        new_sequences.append(seq + [action])
                sequences = new_sequences
        
        return sequences
    
    def _identify_branches(
        self,
        sequences: List[List[str]],
        min_ratio: float,
    ) -> List[TimelineBranch]:
        if not sequences:
            return []
        
        sequence_counts: Dict[str, int] = {}
        
        for seq in sequences:
            key = "|".join(seq)
            sequence_counts[key] = sequence_counts.get(key, 0) + 1
        
        total = len(sequences)
        
        sorted_sequences = sorted(
            sequence_counts.items(),
            key=lambda x: x[1],
            reverse=True,
        )
        
        branches = []
        for idx, (seq_key, count) in enumerate(sorted_sequences):
            ratio = count / total
            
            if ratio < min_ratio and idx > 0:
                continue
            
            branches.append(
                TimelineBranch(
                    branch_id=f"branch_{idx}",
                    description=seq_key.replace("|", " -> "),
                    action_sequence=seq_key.split("|"),
                    occurrence_count=count,
                    occurrence_ratio=ratio,
                    is_default=(idx == 0),
                )
            )
        
        return branches
    
    def _determine_default_timeline(self, branches: List[TimelineBranch]) -> List[str]:
        default_branch = next((b for b in branches if b.is_default), None)
        
        if default_branch:
            return default_branch.action_sequence
        
        if branches:
            return branches[0].action_sequence
        
        return []
    
    def _find_variant_points(
        self,
        time_buckets: Dict[int, Dict[str, List[str]]],
        report_sequences: List[List[str]],
        default_timeline: List[str],
        min_ratio: float,
    ) -> List[TimelineVariant]:
        if not time_buckets:
            return []
        
        variants: List[TimelineVariant] = []
        sorted_keys = sorted(time_buckets.keys())
        
        for idx, bucket_key in enumerate(sorted_keys):
            actions = list(time_buckets[bucket_key].keys())
            
            if len(actions) <= 1:
                continue
            
            action_counts: Dict[str, int] = {}
            for action in actions:
                action_counts[action] = len(time_buckets[bucket_key][action])
            
            total = sum(action_counts.values())
            
            branches = []
            sorted_actions = sorted(
                action_counts.items(),
                key=lambda x: x[1],
                reverse=True,
            )
            
            for action_idx, (action, count) in enumerate(sorted_actions):
                ratio = count / total
                
                branches.append(
                    TimelineBranch(
                        branch_id=f"variant_{bucket_key}_{action_idx}",
                        description=action,
                        action_sequence=[action],
                        occurrence_count=count,
                        occurrence_ratio=ratio,
                        is_default=(action_idx == 0 and ratio >= min_ratio),
                    )
                )
            
            if len(branches) > 1:
                variants.append(
                    TimelineVariant(
                        branch_point_time=bucket_key * 15.0,
                        branch_point_name=f"Time {bucket_key * 15.0}s",
                        branches=branches,
                    )
                )
        
        return variants
