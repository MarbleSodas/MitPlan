from typing import Optional, List, Dict, Any
import time as time_module

from schemas.cactbot_schemas import CactbotTimelineInput
from schemas.fflogs_schemas import FFLogsReportInput
from schemas.timeline_schemas import (
    TimelineGenerationRequest,
    TimelineGenerationResult,
    TimelineOutput,
    TimelineSummary,
)
from schemas.damage_schemas import DamageEvent

from agents.cactbot_agent import CactbotTimelineAgent
from agents.fflogs_agent import FFLogsReportAgent
from agents.damage_extractor_agent import DamageEventExtractorAgent
from agents.variant_detector_agent import TimelineVariantDetectorAgent
from agents.aggregator_agent import TimelineAggregatorAgent
from agents.timeline_builder_agent import TimelineBuilderAgent

from config import config


class TimelineGenerationOrchestrator:
    """
    Orchestrator agent that coordinates all atomic agents into a pipeline.
    
    This is the main entry point for timeline generation.
    
    Pipeline:
    1. CactbotTimelineAgent - Fetch timeline from Cactbot
    2. FFLogsReportAgent - Discover and fetch reports from FFLogs
    3. DamageEventExtractorAgent - Extract damage events and sync to timeline
    4. TimelineVariantDetectorAgent - Detect timeline variants and default path
    5. TimelineAggregatorAgent - Aggregate damage values and statistics
    6. TimelineBuilderAgent - Build final output with all variants
    """
    
    def __init__(self, client_id: str, client_secret: str):
        self.client_id = client_id
        self.client_secret = client_secret
        
        self.cactbot_agent = CactbotTimelineAgent()
        self.fflogs_agent = FFLogsReportAgent(client_id, client_secret)
        self.damage_extractor = DamageEventExtractorAgent()
        self.variant_detector = TimelineVariantDetectorAgent()
        self.aggregator = TimelineAggregatorAgent()
        self.builder = TimelineBuilderAgent()
    
    def run(
        self,
        request: TimelineGenerationRequest,
    ) -> TimelineGenerationResult:
        """
        Execute the full timeline generation pipeline.
        """
        errors: List[str] = []
        warnings: List[str] = []
        
        boss_config = config.get_boss_config(request.boss_id)
        if not boss_config:
            return TimelineGenerationResult(
                success=False,
                timeline=None,
                summary=None,
                errors=[f"Unknown boss ID: {request.boss_id}"],
                warnings=[],
            )
        
        boss_name = request.boss_name or boss_config.get("name", request.boss_id)
        timeline_path = boss_config.get("timeline_path")
        encounter_id = boss_config.get("encounter_id")
        
        if not timeline_path:
            errors.append(f"No timeline path configured for {request.boss_id}")
        
        if not encounter_id:
            warnings.append("No encounter_id configured - will use provided report codes only")
        
        timeline_output = None
        
        try:
            cactbot_input = CactbotTimelineInput(
                boss_id=request.boss_id,
                timeline_path=timeline_path or "",
            )
            cactbot_result = self.cactbot_agent.run(cactbot_input)
            
            if not cactbot_result.fetch_success:
                warnings.append(
                    cactbot_result.error_message or "Cactbot timeline fetch failed"
                )
            
            fflogs_input = FFLogsReportInput(
                boss_id=request.boss_id,
                encounter_id=encounter_id,
                report_count=request.report_count,
                require_kill=True,
                min_fight_duration=120,
            )
            fflogs_result = self.fflogs_agent.run(fflogs_input)
            
            if not fflogs_result.fetch_success:
                warnings.append(
                    fflogs_result.error_message or "FFLogs report discovery failed"
                )
            
            report_codes = [r.code for r in fflogs_result.reports]
            
            all_events: List[DamageEvent] = []
            
            for report in fflogs_result.reports:
                for fight in report.fights:
                    if not fight.kill:
                        continue
                    
                    try:
                        events = self._extract_events_from_fight(
                            report,
                            fight,
                        )
                        all_events.extend(events)
                    except Exception as e:
                        warnings.append(f"Failed to extract events from {report.code}: {e}")
            
            if not all_events and cactbot_result.fetch_success:
                warnings.append("No damage events extracted - using Cactbot timeline only")
            
            damage_events_by_report: Dict[str, List[DamageEvent]] = {}
            for event in all_events:
                if event.report_code not in damage_events_by_report:
                    damage_events_by_report[event.report_code] = []
                damage_events_by_report[event.report_code].append(event)
            
            variant_result = self.variant_detector.run(
                damage_events_by_report,
                cactbot_result.timeline_entries,
            )
            
            aggregation_result = self.aggregator.run(
                all_events,
                cactbot_result.timeline_entries,
            )
            
            timeline_output = self.builder.run(
                aggregation_result.aggregated_actions,
                variant_result,
                request.boss_id,
                boss_name,
                fflogs_report_codes=report_codes,
            )
            
            if request.output_path:
                self.builder.write_output(timeline_output, request.output_path)
            
            return TimelineGenerationResult(
                success=True,
                timeline=timeline_output,
                summary=timeline_output.summary,
                errors=errors,
                warnings=warnings,
                output_path=request.output_path,
            )
            
        except Exception as e:
            return TimelineGenerationResult(
                success=False,
                timeline=timeline_output,
                summary=None,
                errors=errors + [str(e)],
                warnings=warnings,
            )
        
        finally:
            self.close()
    
    def _extract_events_from_fight(
        self,
        report,
        fight,
    ) -> List[DamageEvent]:
        events: List[DamageEvent] = []
        
        try:
            raw_events = self.fflogs_agent.get_fight_events(
                report.code,
                fight.fight_id,
                fight.start_time,
                fight.end_time,
                "DamageTaken",
            )
            
            ability_lookup = self.fflogs_agent.create_ability_lookup(report)
            boss_ids = self.fflogs_agent.extract_boss_actor_ids(fight, report)
            
            for raw_event in raw_events:
                if raw_event.get("type") != "damage":
                    continue
                
                if boss_ids and raw_event.get("sourceID") not in boss_ids:
                    continue
                
                unmitigated = raw_event.get("unmitigatedAmount", 0) or 0
                if unmitigated < 5000:
                    continue
                
                ability_id = raw_event.get("abilityGameID") or raw_event.get("ability", {}).get("guid", 0)
                ability_name = (
                    ability_lookup.get(ability_id) or
                    raw_event.get("ability", {}).get("name") or
                    f"Unknown_{ability_id}"
                )
                
                if self._is_auto_attack(ability_name):
                    continue
                
                relative_time = (raw_event["timestamp"] - fight.start_time) / 1000
                if relative_time <= 0:
                    continue
                
                hit_type = raw_event.get("hitType", 0)
                damage_type = self._determine_damage_type(hit_type)
                
                events.append(
                    DamageEvent(
                        timestamp=relative_time,
                        ability_name=ability_name,
                        ability_id=ability_id,
                        unmitigated_damage=unmitigated,
                        damage_type=damage_type,
                        target_id=raw_event.get("targetID", 0),
                        source_id=raw_event.get("sourceID", 0),
                        report_code=report.code,
                    )
                )
        except Exception:
            pass
        
        return events
    
    def _is_auto_attack(self, name: str) -> bool:
        return name.lower() in ("attack", "auto-attack", "auto attack", "shot")
    
    def _determine_damage_type(self, hit_type: int) -> str:
        if hit_type in (1, 2):
            return "physical"
        elif hit_type in (4, 8, 9, 10):
            return "magical"
        return "magical"
    
    def close(self):
        self.cactbot_agent.close()
        self.fflogs_agent.close()
