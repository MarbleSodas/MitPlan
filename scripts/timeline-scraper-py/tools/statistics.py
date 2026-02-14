from typing import List, Tuple
import math


def median(values: List[float]) -> float:
    if not values:
        return 0.0
    sorted_values = sorted(values)
    n = len(sorted_values)
    if n % 2 == 0:
        return (sorted_values[n // 2 - 1] + sorted_values[n // 2]) / 2
    return sorted_values[n // 2]


def mean(values: List[float]) -> float:
    if not values:
        return 0.0
    return sum(values) / len(values)


def std_dev(values: List[float]) -> float:
    if len(values) < 2:
        return 0.0
    m = mean(values)
    variance = sum((x - m) ** 2 for x in values) / len(values)
    return math.sqrt(variance)


def filter_outliers_iqr(values: List[float], multiplier: float = 1.5) -> Tuple[List[float], List[float]]:
    if len(values) < 4:
        return values, []
    
    sorted_values = sorted(values)
    n = len(sorted_values)
    q1_idx = n // 4
    q3_idx = 3 * n // 4
    
    q1 = sorted_values[q1_idx]
    q3 = sorted_values[q3_idx]
    iqr = q3 - q1
    
    lower_bound = q1 - multiplier * iqr
    upper_bound = q3 + multiplier * iqr
    
    filtered = [v for v in values if lower_bound <= v <= upper_bound]
    outliers = [v for v in values if v < lower_bound or v > upper_bound]
    
    return filtered, outliers


def percentile(values: List[float], p: float) -> float:
    if not values:
        return 0.0
    sorted_values = sorted(values)
    idx = math.ceil((p / 100) * len(sorted_values)) - 1
    return sorted_values[max(0, idx)]


def cluster_by_proximity(
    values: List[float],
    gap_threshold: float
) -> List[dict]:
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


def calculate_damage_thresholds(occurrences: List[dict]) -> dict:
    damages = [o.get("median_damage", 0) for o in occurrences if o.get("median_damage", 0) > 0]
    
    if not damages:
        return {"p50": 0, "p75": 0, "p90": 0, "median": 0}
    
    return {
        "p50": percentile(damages, 50),
        "p75": percentile(damages, 75),
        "p90": percentile(damages, 90),
        "median": median(damages),
    }


def get_most_common(values: List[str]) -> str:
    if not values:
        return ""
    counts: dict = {}
    for v in values:
        counts[v] = counts.get(v, 0) + 1
    return max(counts.items(), key=lambda x: x[1])[0]


def normalize_action_name(name: str) -> str:
    return (
        name.lower()
        .replace("(cast)", "")
        .replace("(casted)", "")
        .replace(" x1", "")
        .replace(" x2", "")
        .replace(" x3", "")
        .replace(" x4", "")
        .replace(" x5", "")
        .replace(" x6", "")
        .replace(" x7", "")
        .replace(" x8", "")
        .strip()
    )


def fuzzy_match(a: str, b: str, threshold: float = 0.8) -> bool:
    a_norm = normalize_action_name(a)
    b_norm = normalize_action_name(b)
    
    if a_norm == b_norm:
        return True
    
    if a_norm in b_norm or b_norm in a_norm:
        return True
    
    longer = a_norm if len(a_norm) > len(b_norm) else b_norm
    shorter = b_norm if len(a_norm) > len(b_norm) else a_norm
    
    if len(shorter) < 3:
        return False
    
    matches = sum(1 for c in shorter if c in longer)
    similarity = matches / len(longer)
    
    return similarity >= threshold
