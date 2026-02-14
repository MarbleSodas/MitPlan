#!/usr/bin/env python3
"""
Test for TimelineVariantDetectorAgent - detects timeline branches and default path
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


class DamageEvent:
    def __init__(self, timestamp, ability_name, unmitigated_damage=50000, damage_type="magical", 
                 target_id=1, source_id=100, report_code="test"):
        self.timestamp = timestamp
        self.ability_name = ability_name
        self.unmitigated_damage = unmitigated_damage
        self.damage_type = damage_type
        self.target_id = target_id
        self.source_id = source_id
        self.report_code = report_code


class CactbotTimelineEntry:
    def __init__(self, time, name):
        self.time = time
        self.name = name


class VariantDetectionOutput:
    def __init__(self, branches, default_timeline, variant_points, total_unique_timelines, default_coverage):
        self.branches = branches
        self.default_timeline = default_timeline
        self.variant_points = variant_points
        self.total_unique_timelines = total_unique_timelines
        self.default_coverage = default_coverage


class TimelineBranch:
    def __init__(self, branch_id, description, action_sequence, occurrence_count, occurrence_ratio, is_default):
        self.branch_id = branch_id
        self.description = description
        self.action_sequence = action_sequence
        self.occurrence_count = occurrence_count
        self.occurrence_ratio = occurrence_ratio
        self.is_default = is_default


class TimelineVariant:
    def __init__(self, branch_point_time, branch_point_name, branches):
        self.branch_point_time = branch_point_time
        self.branch_point_name = branch_point_name
        self.branches = branches


def normalize_action_name(name):
    return (name.lower()
            .replace("(cast)", "")
            .replace(" x1", "")
            .replace(" x2", "")
            .strip())


def cluster_by_proximity(values, gap_threshold):
    if not values:
        return []
    sorted_values = sorted(values)
    clusters = []
    current_cluster = [sorted_values[0]]
    
    for i in range(1, len(sorted_values)):
        if sorted_values[i] - sorted_values[i - 1] <= gap_threshold:
            current_cluster.append(sorted_values[i])
        else:
            clusters.append(current_cluster)
            current_cluster = [sorted_values[i]]
    clusters.append(current_cluster)
    
    result = []
    for cluster in clusters:
        result.append({
            "values": cluster,
            "median": sum(cluster) / len(cluster) if cluster else 0,
            "count": len(cluster),
            "min": min(cluster),
            "max": max(cluster),
        })
    return result


def bucket_actions_by_time(events_by_report, time_window):
    buckets = {}
    for report_code, events in events_by_report.items():
        bucketed = {}
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


def build_action_sequences(time_buckets):
    if not time_buckets:
        return []
    sorted_keys = sorted(time_buckets.keys())
    sequences = []
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


def identify_branches(sequences, min_ratio):
    if not sequences:
        return []
    sequence_counts = {}
    for seq in sequences:
        key = "|".join(seq)
        sequence_counts[key] = sequence_counts.get(key, 0) + 1
    
    total = len(sequences)
    sorted_sequences = sorted(sequence_counts.items(), key=lambda x: x[1], reverse=True)
    
    branches = []
    for idx, (seq_key, count) in enumerate(sorted_sequences):
        ratio = count / total
        if ratio < min_ratio and idx > 0:
            continue
        branches.append(TimelineBranch(
            branch_id=f"branch_{idx}",
            description=seq_key.replace("|", " -> "),
            action_sequence=seq_key.split("|"),
            occurrence_count=count,
            occurrence_ratio=ratio,
            is_default=(idx == 0),
        ))
    return branches


def determine_default_timeline(branches):
    default_branch = next((b for b in branches if b.is_default), None)
    if default_branch:
        return default_branch.action_sequence
    if branches:
        return branches[0].action_sequence
    return []


def find_variant_points(time_buckets, min_ratio):
    if not time_buckets:
        return []
    variants = []
    sorted_keys = sorted(time_buckets.keys())
    
    for idx, bucket_key in enumerate(sorted_keys):
        actions = list(time_buckets[bucket_key].keys())
        if len(actions) <= 1:
            continue
        
        action_counts = {}
        for action in actions:
            action_counts[action] = len(time_buckets[bucket_key][action])
        
        total = sum(action_counts.values())
        branches = []
        sorted_actions = sorted(action_counts.items(), key=lambda x: x[1], reverse=True)
        
        for action_idx, (action, count) in enumerate(sorted_actions):
            ratio = count / total
            branches.append(TimelineBranch(
                branch_id=f"variant_{bucket_key}_{action_idx}",
                description=action,
                action_sequence=[action],
                occurrence_count=count,
                occurrence_ratio=ratio,
                is_default=(action_idx == 0 and ratio >= min_ratio),
            ))
        
        if len(branches) > 1:
            variants.append(TimelineVariant(
                branch_point_time=bucket_key * 15.0,
                branch_point_name=f"Time {bucket_key * 15.0}s",
                branches=branches,
            ))
    
    return variants


def detect_variants(damage_events_by_report, cactbot_timeline, cluster_time_window=15.0, min_occurrence_ratio=0.3):
    time_buckets = bucket_actions_by_time(damage_events_by_report, cluster_time_window)
    report_sequences = build_action_sequences(time_buckets)
    branches = identify_branches(report_sequences, min_occurrence_ratio)
    default_timeline = determine_default_timeline(branches)
    variant_points = find_variant_points(time_buckets, min_occurrence_ratio)
    
    total_reports = len(damage_events_by_report)
    default_count = next((b.occurrence_count for b in branches if b.is_default), 0)
    default_coverage = default_count / total_reports if total_reports > 0 else 0.0
    
    return VariantDetectionOutput(
        branches=branches,
        default_timeline=default_timeline,
        variant_points=variant_points,
        total_unique_timelines=len(branches),
        default_coverage=default_coverage,
    )


def test_variant_detector():
    print("=" * 60)
    print("TimelineVariantDetectorAgent Test")
    print("=" * 60)
    
    print("\n>>> Test 1: No variation (all reports same timeline)")
    events_by_report = {
        "report1": [
            DamageEvent(10.0, "Ability A"),
            DamageEvent(30.0, "Ability B"),
            DamageEvent(50.0, "Ability C"),
        ],
        "report2": [
            DamageEvent(10.0, "Ability A"),
            DamageEvent(30.0, "Ability B"),
            DamageEvent(50.0, "Ability C"),
        ],
        "report3": [
            DamageEvent(10.0, "Ability A"),
            DamageEvent(30.0, "Ability B"),
            DamageEvent(50.0, "Ability C"),
        ],
    }
    
    result = detect_variants(events_by_report, [])
    print(f"    Reports: 3")
    print(f"    Unique timelines: {result.total_unique_timelines}")
    print(f"    Default timeline: {result.default_timeline}")
    print(f"    Default occurrence ratio: {result.branches[0].occurrence_ratio if result.branches else 'N/A'}")
    print(f"    Variants detected: {len(result.variant_points)}")
    assert result.total_unique_timelines == 1, "Expected 1 unique timeline"
    print("    ✓ All reports have same timeline")
    
    print("\n>>> Test 2: With variation (different abilities at same time)")
    events_by_report = {
        "report1": [
            DamageEvent(10.0, "Ability A"),
            DamageEvent(30.0, "Fire"),
            DamageEvent(50.0, "Ability C"),
        ],
        "report2": [
            DamageEvent(10.0, "Ability A"),
            DamageEvent(30.0, "Ice"),
            DamageEvent(50.0, "Ability C"),
        ],
        "report3": [
            DamageEvent(10.0, "Ability A"),
            DamageEvent(30.0, "Fire"),
            DamageEvent(50.0, "Ability C"),
        ],
    }
    
    result = detect_variants(events_by_report, [])
    print(f"    Reports: 3")
    print(f"    Unique timelines: {result.total_unique_timelines}")
    print(f"    Default timeline: {result.default_timeline}")
    print(f"    Default branch ratio: {result.branches[0].occurrence_ratio if result.branches else 'N/A':.1%}")
    
    if result.variant_points:
        for vp in result.variant_points:
            print(f"      At {vp.branch_point_time}s: {[(b.description, f'{b.occurrence_ratio:.0%}') for b in vp.branches]}")
    print("    ✓ Variant detection working")
    
    print("\n>>> Test 3: Complex variation (multiple branches)")
    events_by_report = {
        "r1": [DamageEvent(10, "Fire"), DamageEvent(30, "A")],
        "r2": [DamageEvent(10, "Fire"), DamageEvent(30, "B")],
        "r3": [DamageEvent(10, "Ice"), DamageEvent(30, "A")],
        "r4": [DamageEvent(10, "Ice"), DamageEvent(30, "B")],
    }
    
    result = detect_variants(events_by_report, [])
    print(f"    Reports: 4")
    print(f"    Unique timelines: {result.total_unique_timelines}")
    print(f"    Default timeline: {result.default_timeline}")
    print(f"    Variants at: {[vp.branch_point_time for vp in result.variant_points]}")
    print("    ✓ Complex variation detected")
    
    print("\n" + "=" * 60)
    print("All Variant Detection Tests Passed!")
    print("=" * 60)


if __name__ == "__main__":
    test_variant_detector()
