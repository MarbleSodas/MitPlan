from typing import List, Dict, Any, Optional
import json
import time
from pathlib import Path
from schemas.timeline_schemas import (
    BossAction,
    TimelineSummary,
    TimelineOutput,
    TimelineBuildInput,
)
from schemas.aggregation_schemas import AggregatedAction
from schemas.variant_schemas import VariantDetectionOutput


class TimelineBuilderAgent:
    """
    Atomic agent for building final timeline output.
    
    Responsibilities:
    - Combine aggregated actions with variant information
    - Add descriptions, icons, metadata
    - Generate output in MitPlan format
    - Include all variants + mark default
    """
    
    def __init__(self):
        self.name = "TimelineBuilderAgent"
        self.description = "Builds final timeline output with all variants"
    
    def run(
        self,
        aggregated_actions: List[AggregatedAction],
        variant_info: VariantDetectionOutput,
        boss_id: str,
        boss_name: str,
        output_format: str = "mitplan",
        fflogs_report_codes: Optional[List[str]] = None,
    ) -> TimelineOutput:
        """
        Build final timeline with all variants.
        """
        variant_map = self._build_variant_map(variant_info)
        
        actions = []
        
        for agg_action in aggregated_actions:
            variants = variant_map.get(
                f"{agg_action.name}_{agg_action.occurrence}",
                None
            )
            
            boss_action = self._convert_to_boss_action(agg_action, variants)
            actions.append(boss_action)
        
        default_action_ids = self._get_default_action_ids(variant_info)
        default_actions = [
            a for a in actions if a.id in default_action_ids
        ]
        
        all_variants = self._build_all_variants_dict(variant_info)
        
        summary = TimelineSummary(
            unique_abilities=len(set(a.name for a in aggregated_actions)),
            total_events=len(aggregated_actions),
            reports_used=len(fflogs_report_codes) if fflogs_report_codes else 0,
            tank_busters=sum(1 for a in aggregated_actions if a.is_tank_buster),
            raidwides=len(aggregated_actions) - sum(1 for a in aggregated_actions if a.is_tank_buster),
            variants_detected=len(variant_info.variant_points),
            default_coverage=variant_info.default_coverage,
        )
        
        return TimelineOutput(
            name=boss_name,
            boss_id=boss_id,
            boss_name=boss_name,
            actions=actions,
            default_actions=default_actions,
            all_variants=all_variants,
            source="hybrid",
            generated_at=int(time.time()),
            version=1,
            fflogs_report_codes=fflogs_report_codes or [],
            summary=summary,
        )
    
    def _convert_to_boss_action(
        self,
        agg_action: AggregatedAction,
        variants: Optional[List[str]],
    ) -> BossAction:
        icon = self._get_icon(agg_action.name, agg_action.is_tank_buster)
        
        description = self._generate_description(
            agg_action.name,
            agg_action.is_tank_buster,
            agg_action.is_dual_tank_buster,
            agg_action.damage_type,
            agg_action.hit_count,
        )
        
        return BossAction(
            id=agg_action.id,
            name=agg_action.name,
            time=agg_action.time,
            description=description,
            unmitigated_damage=agg_action.unmitigated_damage,
            damage_type=agg_action.damage_type,
            importance=agg_action.importance,
            icon=icon,
            is_tank_buster=agg_action.is_tank_buster,
            is_dual_tank_buster=agg_action.is_dual_tank_buster,
            hit_count=agg_action.hit_count,
            per_hit_damage=agg_action.per_hit_damage,
            tags=None,
            variants=variants,
        )
    
    def _build_variant_map(
        self,
        variant_info: VariantDetectionOutput,
    ) -> Dict[str, List[str]]:
        variant_map: Dict[str, List[str]] = {}
        
        for variant in variant_info.variant_points:
            for branch in variant.branches:
                if not branch.is_default and branch.action_sequence:
                    key = f"{branch.action_sequence[0]}"
                    if key not in variant_map:
                        variant_map[key] = []
                    for action in branch.action_sequence:
                        if action not in variant_map[key]:
                            variant_map[key].append(action)
        
        return variant_map
    
    def _get_default_action_ids(
        self,
        variant_info: VariantDetectionOutput,
    ) -> set:
        default_ids = set()
        
        if variant_info.default_timeline:
            for idx, action_name in enumerate(variant_info.default_timeline):
                default_ids.add(f"{action_name.lower().replace(' ', '_')}_{idx + 1}")
        
        return default_ids
    
    def _build_all_variants_dict(
        self,
        variant_info: VariantDetectionOutput,
    ) -> Dict[str, List[str]]:
        all_variants: Dict[str, List[str]] = {}
        
        for variant in variant_info.variant_points:
            time_key = f"{variant.branch_point_time}s"
            
            all_variants[time_key] = [
                branch.action_sequence[0] if branch.action_sequence else branch.description
                for branch in variant.branches
            ]
        
        return all_variants
    
    def _get_icon(self, name: str, is_tank_buster: bool) -> str:
        if is_tank_buster:
            return "🛡️"
        
        name_lower = name.lower()
        
        icon_map = {
            "fire": "🔥", "flame": "🔥", "burn": "🔥", "heat": "🔥",
            "ice": "❄️", "freeze": "❄️", "frost": "❄️", "cold": "❄️",
            "lightning": "⚡", "thunder": "⚡", "volt": "⚡", "shock": "⚡",
            "earth": "🌍", "quake": "🌍", "stone": "🌍", "rock": "🌍",
            "wind": "💨", "gale": "💨", "aero": "💨",
            "water": "🌊", "drown": "🌊", "wave": "🌊", "flood": "🌊",
            "dark": "🌑", "shadow": "🌑", "umbra": "🌑",
            "light": "✨", "holy": "✨", "lumina": "✨",
            "explosion": "💥", "blast": "💥", "bomb": "💥", "impact": "💥",
            "stack": "🎯", "party": "🎯",
            "spread": "💫",
            "enrage": "💀",
            "seed": "🌱", "vine": "🌱", "plant": "🌱", "tendril": "🌱",
            "spore": "🍄",
            "revenge": "🌿", "vines": "🌿",
            "glower": "👁️", "power": "👁️",
        }
        
        for keyword, icon in icon_map.items():
            if keyword in name_lower:
                return icon
        
        return "⚔️"
    
    def _generate_description(
        self,
        name: str,
        is_tank_buster: bool,
        is_dual_tank_buster: bool,
        damage_type: Optional[str],
        hit_count: Optional[int],
    ) -> str:
        parts = []
        name_lower = name.lower()
        
        if hit_count and hit_count > 1:
            parts.append(f"{hit_count} hits of")
        
        if is_tank_buster:
            if is_dual_tank_buster or "dual" in name_lower or "both" in name_lower:
                parts.append("dual tank buster targeting both tanks.")
            elif "here" in name_lower:
                parts.append("tank buster on the closest player.")
            elif "there" in name_lower:
                parts.append("tank buster on the furthest player.")
            else:
                parts.append("tank buster requiring mitigation.")
        elif "raid" in name_lower or "party" in name_lower:
            parts.append("raidwide damage.")
        elif "stack" in name_lower:
            parts.append("stack marker damage.")
        elif "spread" in name_lower:
            parts.append("spread marker damage.")
        else:
            parts.append("damage mechanic.")
        
        if damage_type and parts:
            parts[-1] = f"{damage_type} {parts[-1]}"
        
        result = " ".join(parts).replace("  ", " ").strip()
        return result[0].upper() + result[1:] if result else ""
    
    def write_output(
        self,
        timeline: TimelineOutput,
        output_path: str,
    ) -> None:
        Path(output_path).parent.mkdir(parents=True, exist_ok=True)
        
        output_data = {
            "name": timeline.name,
            "boss_id": timeline.boss_id,
            "boss_name": timeline.boss_name,
            "actions": [
                {
                    "id": a.id,
                    "name": a.name,
                    "time": a.time,
                    "description": a.description,
                    "unmitigatedDamage": a.unmitigated_damage,
                    "damageType": a.damage_type,
                    "importance": a.importance,
                    "icon": a.icon,
                    "isTankBuster": a.is_tank_buster,
                    "isDualTankBuster": a.is_dual_tank_buster,
                    "hitCount": a.hit_count,
                    "perHitDamage": a.per_hit_damage,
                    "variants": a.variants,
                }
                for a in timeline.actions
            ],
            "default_actions": [
                {
                    "id": a.id,
                    "name": a.name,
                    "time": a.time,
                }
                for a in timeline.default_actions
            ],
            "all_variants": timeline.all_variants,
            "source": timeline.source,
            "generated_at": timeline.generated_at,
            "version": timeline.version,
        }
        
        with open(output_path, "w") as f:
            json.dump(output_data, f, indent=2)
