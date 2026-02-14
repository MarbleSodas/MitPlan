import httpx
import re
from typing import List, Optional
from pydantic import Field

from atomic_agents import AtomicAgent, AgentConfig, BaseIOSchema
from atomic_agents.context import SystemPromptGenerator


class CactbotTimelineInput(BaseIOSchema):
    """Input schema for CactbotTimelineAgent"""
    boss_id: str = Field(..., description="Boss ID")
    timeline_path: str = Field(..., description="Path to timeline")


class TimelineEntryOutput(BaseIOSchema):
    """Single timeline entry"""
    time: float
    name: str
    original_name: Optional[str] = None
    hit_count: Optional[int] = None


class CactbotTimelineOutput(BaseIOSchema):
    """Output schema for CactbotTimelineAgent"""
    boss_id: str
    success: bool
    entries: List[TimelineEntryOutput]
    error_message: Optional[str] = None


SYSTEM_PROMPT = SystemPromptGenerator(
    background=["You parse Cactbot raid timelines for FFXIV."],
    steps=["Parse timeline entries from raw text"],
    output_instructions=["Return structured timeline data"],
)


class CactbotTimelineAgent:
    def __init__(self, client=None, model: str = "gpt-4o-mini"):
        self.name = "CactbotTimelineAgent"
        self.client = client
        self.model = model
        self._http_client = None
        
        if client:
            self._agent: Optional[AtomicAgent] = AtomicAgent(
                config=AgentConfig(
                    client=client,
                    model=model,
                    system_prompt_generator=SYSTEM_PROMPT,
                    model_api_parameters={},
                )
            )
        else:
            self._agent = None
    
    @property
    def http_client(self) -> httpx.Client:
        if self._http_client is None:
            self._http_client = httpx.Client(timeout=30.0, follow_redirects=True)
        return self._http_client
    
    def run(self, input_data: CactbotTimelineInput) -> CactbotTimelineOutput:
        url = f"https://raw.githubusercontent.com/OverlayPlugin/cactbot/main/{input_data.timeline_path}"
        
        try:
            response = self.http_client.get(url)
            
            if response.status_code == 404:
                return CactbotTimelineOutput(
                    boss_id=input_data.boss_id,
                    success=False,
                    entries=[],
                    error_message="Timeline not found",
                )
            
            entries = self._parse(response.text)
            
            return CactbotTimelineOutput(
                boss_id=input_data.boss_id,
                success=True,
                entries=entries,
            )
            
        except Exception as e:
            return CactbotTimelineOutput(
                boss_id=input_data.boss_id,
                success=False,
                entries=[],
                error_message=str(e),
            )
    
    def run_with_llm(self, input_data: CactbotTimelineInput) -> CactbotTimelineOutput:
        if not self._agent:
            raise ValueError("No LLM client provided")
        return self._agent.run(input_data)
    
    def _parse(self, text: str) -> List[TimelineEntryOutput]:
        entries = []
        
        for line in text.split("\n"):
            trimmed = line.strip()
            if not trimmed or trimmed.startswith("//"):
                continue
            
            match = re.match(r"^#?\s*(\d+\.?\d*)\s+\"([^\"]+)\"", trimmed)
            if not match:
                continue
            
            time_val, name = match.groups()
            time = float(time_val)
            name = name.strip()
            
            if name.startswith("--"):
                continue
            
            hit_match = re.search(r"\s+x(\d+)$", name, re.IGNORECASE)
            hit_count = int(hit_match.group(1)) if hit_match else None
            
            original_name = name
            if "(cast)" in name.lower():
                name = re.sub(r"\s*\(cast\)\s*$", "", name, flags=re.IGNORECASE).strip()
            
            entries.append(TimelineEntryOutput(
                time=round(time, 1),
                name=name,
                original_name=original_name if original_name != name else None,
                hit_count=hit_count,
            ))
        
        return sorted(entries, key=lambda e: e.time)
    
    def close(self):
        if self._http_client:
            self._http_client.close()


if __name__ == "__main__":
    agent = CactbotTimelineAgent()
    
    result = agent.run(CactbotTimelineInput(
        boss_id="r7s",
        timeline_path="ui/raidboss/data/07-dt/raid/r7s.txt",
    ))
    
    print(f"Success: {result.success}")
    print(f"Entries: {len(result.entries)}")
    for entry in result.entries[:5]:
        print(f"  {entry.time}s - {entry.name}")
    
    agent.close()
