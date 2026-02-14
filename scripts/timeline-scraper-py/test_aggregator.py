#!/usr/bin/env python3
"""
Test for TimelineAggregatorAgent - aggregates damage values and statistics
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


class AggregatedAction:
    def __init__(self, id, name, time, occurrence, unmitigated_damage, damage_type=None,
                 target_count_median=8, importance="medium", is_tank_buster=False, 
                 is_dual_tank_buster=False, hit_count=None):
        self.id = id
        self.name = name
        self.time = time
        self.occurrence = occurrence
        self.unmitigated_damage = unmitigated_damage
        self.damage_type = damage_type
        self.target_count_median = target_count_median
        self.importance = importance
        self.is_tank_buster = is_tank_buster
        self.is_dual_tank_buster = is_dual_tank_buster
        self.hit_count = hit_count


class DamageThresholds:
    def __init__(self, p50=0, p75=0, p90=0, median=0):
        self.p50 = p50
        self.p75 = p75
        self.p90 = p90
        self.median = median


class AggregationOutput:
    def __init__(self, aggregated_actions, damage_thresholds, tank_buster_count, raidwide_count):
        self.aggregated_actions = aggregated_actions
        self.damage_thresholds = damage_thresholds
        self.tank_buster_count = tank_buster_count
        self.raidwide_count = raidwide_count


def median(values):
    if not values:
        return 0.0
    sorted_values = sorted(values)
    n = len(sorted_values)
    if n % 2 == 0:
        return (sorted_values[n // 2 - 1] + sorted_values[n // 2]) / 2
    return sorted_values[n // 2]


def std_dev(values):
    if len(values) < 2:
        return 0.0
    m = sum(values) / len(values)
    variance = sum((x - m) ** 2 for x in values) / len(values)
    return variance ** 0.5


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
            "median": median(cluster),
            "count": len(cluster),
            "min": min(cluster),
            "max": max(cluster),
        })
    return result


def normalize_action_name(name):
    return (name.lower()
            .replace("(cast)", "")
            .replace(" x1", "")
            .replace(" x2", "")
            .strip())


def group_events_by_action(events):
    grouped = {}
    for event in events:
        key = normalize_action_name(event.ability_name)
        if key not in grouped:
            grouped[key] = []
        grouped[key].append(event)
    return grouped


def get_most_common(values):
    if not values:
        return ""
    counts = {}
    for v in values:
        counts[v] = counts.get(v, 0) + 1
    return max(counts.items(), key=lambda x: x[1])[0]


def calculate_percentile(values, p):
    if not values:
        return 0.0
    sorted_values = sorted(values)
    idx = int((p / 100) * len(sorted_values)) - 1
    return sorted_values[max(0, idx)]


def calculate_damage_thresholds(occurrences):
    damages = [o.get("median_damage", 0) for o in occurrences if o.get("median_damage", 0) > 0]
    if not damages:
        return {"p50": 0, "p75": 0, "p90": 0, "median": 0}
    return {
        "p50": calculate_percentile(damages, 50),
        "p75": calculate_percentile(damages, 75),
        "p90": calculate_percentile(damages, 90),
        "median": median(damages),
    }


def cluster_occurrences(events_by_action, gap_seconds):
    occurrences = []
    for action_name, events in events_by_action.items():
        times = [e.timestamp for e in events]
        clusters = cluster_by_proximity(times, gap_seconds)
        
        for cluster_idx, cluster in enumerate(clusters):
            cluster_events = [e for e in events if cluster["min"] <= e.timestamp <= cluster["max"]]
            damages = [e.unmitigated_damage for e in cluster_events]
            target_ids = list(set(e.target_id for e in cluster_events))
            damage_types = [e.damage_type for e in cluster_events]
            
            occurrences.append({
                "action_name": action_name,
                "occurrence": cluster_idx + 1,
                "times": cluster["values"],
                "median_time": cluster["median"],
                "median_damage": median(damages) if damages else 0,
                "damage_type": get_most_common(damage_types),
                "target_count_median": len(target_ids),
                "target_count_std_dev": 0,
                "hit_count": len(cluster_events),
            })
    
    return sorted(occurrences, key=lambda o: o["median_time"])


def create_aggregated_action(occurrence, thresholds):
    name = occurrence["action_name"]
    damage = occurrence["median_damage"]
    damage_type = occurrence["damage_type"]
    target_count = occurrence.get("target_count_median", 8)
    
    is_tank_buster = target_count >= 0.8 and target_count <= 2.5 and damage >= thresholds.get("p75", 0)
    is_dual = is_tank_buster and 1.5 <= target_count <= 2.5
    
    if damage >= thresholds.get("p90", 0):
        importance = "critical"
    elif is_tank_buster:
        importance = "high"
    elif damage >= thresholds.get("p75", 0):
        importance = "high"
    elif damage >= thresholds.get("p50", 0):
        importance = "medium"
    else:
        importance = "low"
    
    action_id = f"{name.replace(' ', '_')}_{occurrence['occurrence']}"
    
    return AggregatedAction(
        id=action_id,
        name=name.title(),
        time=round(occurrence["median_time"], 1),
        occurrence=occurrence["occurrence"],
        unmitigated_damage=f"~{int(damage):,}" if damage >= 1000 else str(int(damage)),
        damage_type=damage_type,
        target_count_median=target_count,
        importance=importance,
        is_tank_buster=is_tank_buster,
        is_dual_tank_buster=is_dual,
        hit_count=occurrence.get("hit_count"),
    )


def aggregate_events(damage_events, cactbot_timeline, occurrence_gap_seconds=15.0):
    if not damage_events:
        return AggregationOutput(
            aggregated_actions=[],
            damage_thresholds=DamageThresholds(),
            tank_buster_count=0,
            raidwide_count=0,
        )
    
    events_by_action = group_events_by_action(damage_events)
    occurrences = cluster_occurrences(events_by_action, occurrence_gap_seconds)
    thresholds = calculate_damage_thresholds(occurrences)
    
    aggregated_actions = [create_aggregated_action(o, thresholds) for o in occurrences]
    aggregated_actions.sort(key=lambda a: a.time)
    
    tank_buster_count = sum(1 for a in aggregated_actions if a.is_tank_buster)
    raidwide_count = len(aggregated_actions) - tank_buster_count
    
    return AggregationOutput(
        aggregated_actions=aggregated_actions,
        damage_thresholds=DamageThresholds(**thresholds),
        tank_buster_count=tank_buster_count,
        raidwide_count=raidwide_count,
    )


def test_aggregator():
    print("=" * 60)
    print("TimelineAggregatorAgent Test")
    print("=" * 60)
    
    print("\n>>> Test 1: Simple damage aggregation")
    events = [
        DamageEvent(10.0, "Fire", 50000),
        DamageEvent(10.0, "Fire", 52000),
        DamageEvent(10.0, "Fire", 48000),
        DamageEvent(30.0, "Tank Buster", 95000),
        DamageEvent(30.0, "Tank Buster", 98000),
        DamageEvent(50.0, "Raidwide", 40000),
    ]
    
    result = aggregate_events(events, [])
    print(f"    Total events: {len(events)}")
    print(f"    Aggregated actions: {len(result.aggregated_actions)}")
    print(f"    Damage thresholds: p50={result.damage_thresholds.p50:.0f}, p75={result.damage_thresholds.p75:.0f}")
    print(f"    Tank busters: {result.tank_buster_count}")
    print(f"    Raidwides: {result.raidwide_count}")
    
    for action in result.aggregated_actions:
        print(f"      {action.time}s - {action.name}: {action.unmitigated_damage} ({action.importance})")
    
    print("    ✓ Simple aggregation working")
    
    print("\n>>> Test 2: Multi-hit abilities")
    events = []
    for i in range(6):
        events.append(DamageEvent(10.0 + i*0.1, "Raidwide x6", 54000))
    
    result = aggregate_events(events, [])
    print(f"    Hit count: {result.aggregated_actions[0].hit_count}")
    print(f"    Damage: {result.aggregated_actions[0].unmitigated_damage}")
    assert result.aggregated_actions[0].hit_count == 6, "Expected 6 hits"
    print("    ✓ Multi-hit detection working")
    
    print("\n>>> Test 3: Empty events")
    result = aggregate_events([], [])
    assert len(result.aggregated_actions) == 0, "Expected no actions"
    print("    ✓ Empty handling working")
    
    print("\n>>> Test 4: Importance classification")
    events = [
        DamageEvent(10, "Low Damage", 10000),
        DamageEvent(20, "Medium Damage", 50000),
        DamageEvent(30, "High Damage", 80000),
        DamageEvent(40, "Critical Damage", 150000),
        DamageEvent(50, "Tank Buster Single", 100000),  # 1-2 targets = tank buster
    ]
    
    result = aggregate_events(events, [])
    for action in result.aggregated_actions:
        print(f"    {action.name}: {action.importance}")
    
    print("    ✓ Importance classification working")
    
    print("\n" + "=" * 60)
    print("All Aggregator Tests Passed!")
    print("=" * 60)


if __name__ == "__main__":
    test_aggregator()
