from typing import TypeVar, Generic, Optional
from pydantic import BaseModel
from atomic_agents import AtomicAgent, AgentConfig
from instructor import from_openai


TInput = TypeVar("TInput", bound=BaseModel)
TOutput = TypeVar("TOutput", bound=BaseModel)


class BaseAgent(Generic[TInput, TOutput]):
    def __init__(self, name: str, description: str):
        self.name = name
        self.description = description
        self._agent: Optional[AtomicAgent] = None
    
    def run(self, input_data: TInput) -> TOutput:
        raise NotImplementedError("Subclasses must implement run()")
    
    async def run_async(self, input_data: TInput) -> TOutput:
        raise NotImplementedError("Subclasses must implement run_async()")


class ToolAgent(BaseAgent[TInput, TOutput]):
    def __init__(self, name: str, description: str):
        super().__init__(name, description)
        self.name = name
        self.description = description


class LLMAAgent(BaseAgent[TInput, TOutput]):
    def __init__(
        self,
        name: str,
        description: str,
        model: str = "gpt-4o-mini",
        system_prompt: Optional[str] = None,
    ):
        super().__init__(name, description)
        self.model = model
        self.system_prompt = system_prompt or description
        self._setup_agent()
    
    def _setup_agent(self):
        pass
    
    def run(self, input_data: TInput) -> TOutput:
        raise NotImplementedError("Use run_async for LLM agents")
    
    async def run_async(self, input_data: TInput) -> TOutput:
        raise NotImplementedError("Subclasses must implement run_async()")
