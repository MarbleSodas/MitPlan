"""
Timeline-FFLogs Correlation Agent - Uses LLM for reasoning
This agent correlates Cactbot timeline entries with FFLogs damage events.
"""

from typing import List, Optional
from pydantic import Field

from atomic_agents import AtomicAgent, AgentConfig, BaseIOSchema
from atomic_agents.context import SystemPromptGenerator


class TimelineEntryInput(BaseIOSchema):
    """Single timeline entry from Cactbot"""
    time: float
    name: str
    hit_count: Optional[int] = None


class FFLogsEventInput(BaseIOSchema):
    """Single damage event from FFLogs"""
    timestamp: float
    ability_name: str
    ability_id: int
    unmitigated_damage: int
    target_count: int


class CorrelationInput(BaseIOSchema):
    """Input for correlation task"""
    timeline_entries: List[TimelineEntryInput]
    fflogs_events: List[FFLogsEventInput]
    sync_window_seconds: float = Field(default=20.0, description="Time window for matching")


class MatchedAction(BaseIOSchema):
    """A matched action between timeline and FFLogs"""
    timeline_time: float
    timeline_name: str
    fflogs_time: Optional[float]
    fflogs_name: Optional[str]
    matched: bool
    unmitigated_damage: Optional[int] = None
    confidence: str = Field(default="high", description="high/medium/low")


class CorrelationOutput(BaseIOSchema):
    """Output showing correlations"""
    matches: List[MatchedAction]
    unmatched_timeline: List[str]
    unmatched_fflogs: List[str]
    sync_offset_seconds: float = Field(default=0.0, description="Average sync offset")


SYSTEM_PROMPT = SystemPromptGenerator(
    background=[
        "You are an expert at correlating FFXIV raid timeline data.",
        "You match Cactbot timeline abilities with FFLogs damage events.",
    ],
    steps=[
        "1. Analyze each Cactbot timeline entry and find corresponding FFLogs events",
        "2. Consider time proximity (within sync_window) and ability name similarity",
        "3. Handle name variations (e.g., 'Fire IV' vs 'Fire', 'Tank Buster' vs 'Cleave')",
        "4. Calculate sync offset between timeline and FFLogs times",
        "5. Mark unmatched entries and explain why",
    ],
    output_instructions=[
        "Provide high/medium/low confidence for each match",
        "If no match found, explain why (wrong timing, name mismatch, etc.)",
        "Calculate average sync offset across all matched events",
    ],
)


class TimelineCorrelationAgent:
    """
    Uses LLM to correlate Cactbot timeline entries with FFLogs events.
    
    This is where atomic-agents adds value - reasoning about:
    - Name variations (Fire IV → Fire, etc.)
    - Time sync offsets
    - Ambiguous matches
    """
    
    def __init__(self, client, model: str = "gpt-4o-mini"):
        self.client = client
        self.model = model
        
        self._agent: AtomicAgent[CorrelationInput, CorrelationOutput] = AtomicAgent(
            config=AgentConfig(
                client=client,
                model=model,
                system_prompt_generator=SYSTEM_PROMPT,
                model_api_parameters={},
            )
        )
    
    def run(self, input_data: CorrelationInput) -> CorrelationOutput:
        """Run LLM-powered correlation"""
        return self._agent.run(input_data)
    
    def close(self):
        pass


class DirectCorrelation:
    """
    Fallback: Direct correlation without LLM.
    Use when you don't need reasoning capabilities.
    """
    
    def __init__(self):
        pass
    
    def run(
        self,
        timeline_entries: List[dict],
        fflogs_events: List[dict],
        sync_window: float = 20.0,
    ) -> dict:
        """Simple direct correlation using time proximity"""
        
        matches = []
        matched_fflogs_indices = set()
        
        for entry in timeline_entries:
            entry_time = entry["time"]
            entry_name = entry["name"].lower()
            
            best_match = None
            best_distance = float('inf')
            
            for idx, event in enumerate(fflogs_events):
                if idx in matched_fflogs_indices:
                    continue
                
                time_diff = abs(event["timestamp"] - entry_time)
                
                if time_diff > sync_window:
                    continue
                
                event_name = event["ability_name"].lower()
                
                if entry_name in event_name or event_name in entry_name:
                    if time_diff < best_distance:
                        best_distance = time_diff
                        best_match = (idx, event)
            
            if best_match:
                idx, event = best_match
                matched_fflogs_indices.add(idx)
                matches.append(MatchedAction(
                    timeline_time=entry_time,
                    timeline_name=entry["name"],
                    fflogs_time=event["timestamp"],
                    fflogs_name=event["ability_name"],
                    matched=True,
                    unmitigated_damage=event["unmitigated_damage"],
                    confidence="high" if best_distance < 5 else "medium",
                ))
            else:
                matches.append(MatchedAction(
                    timeline_time=entry_time,
                    timeline_name=entry["name"],
                    fflogs_time=None,
                    fflogs_name=None,
                    matched=False,
                    confidence="low",
                ))
        
        unmatched_timeline = [m.timeline_name for m in matches if not m.matched]
        unmatched_fflogs = [
            e["ability_name"] for i, e in enumerate(fflogs_events) 
            if i not in matched_fflogs_indices
        ]
        
        matched = [m for m in matches if m.matched]
        offset = 0.0
        if matched:
            offsets = [
                m.fflogs_time - m.timeline_time 
                for m in matched if m.fflogs_time
            ]
            if offsets:
                offset = sum(offsets) / len(offsets)
        
        return CorrelationOutput(
            matches=matches,
            unmatched_timeline=unmatched_timeline,
            unmatched_fflogs=unmatched_fflogs,
            sync_offset_seconds=offset,
        )


# Usage example:
if __name__ == "__main__":
    # With LLM (for complex matching)
    # from openai import OpenAI
    # import instructor
    # client = instructor.from_openai(OpenAI())
    # agent = TimelineCorrelationAgent(client)
    
    # Without LLM (simple matching)
    agent = DirectCorrelation()
    
    timeline = [
        {"time": 10.0, "name": "Fire IV"},
        {"time": 30.0, "name": "Tank Buster"},
        {"time": 50.0, "name": "Raidwide"},
    ]
    
    events = [
        {"timestamp": 11.0, "ability_name": "Fire IV", "ability_id": 123, "unmitigated_damage": 50000},
        {"timestamp": 31.0, "ability_name": "Tank Buster", "ability_id": 456, "unmitigated_damage": 95000},
        {"timestamp": 51.0, "ability_name": "Raidwide", "ability_id": 789, "unmitigated_damage": 40000},
    ]
    
    result = agent.run(timeline, events)
    
    print(f"Matches: {len(result.matches)}")
    for m in result.matches:
        print(f"  {m.timeline_time}s {m.timeline_name} -> {m.fflogs_name} ({m.confidence})")
    print(f"Sync offset: {result.sync_offset_seconds:.1f}s")
