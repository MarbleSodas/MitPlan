#!/usr/bin/env python3
"""
Test script for CactbotTimelineAgent
"""

import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from schemas.cactbot_schemas import CactbotTimelineInput
from agents.cactbot_agent import CactbotTimelineAgent


def test_cactbot_agent():
    agent = CactbotTimelineAgent()
    
    test_cases = [
        {
            "name": "M7S - Brute Abominator",
            "input": CactbotTimelineInput(
                boss_id="m7s",
                timeline_path="ui/raidboss/data/07-dt/raid/m7s.txt",
            ),
        },
        {
            "name": "M8S - Honey B. Lovely", 
            "input": CactbotTimelineInput(
                boss_id="m8s",
                timeline_path="ui/raidboss/data/07-dt/raid/m8s.txt",
            ),
        },
        {
            "name": "R1S - Zoraal Ja",
            "input": CactbotTimelineInput(
                boss_id="r1s",
                timeline_path="ui/raidboss/data/07-dt/raid/r1s.txt",
            ),
        },
    ]
    
    print("=" * 60)
    print("Testing CactbotTimelineAgent")
    print("=" * 60)
    
    for test in test_cases:
        print(f"\n>>> Testing: {test['name']}")
        print(f"    Timeline path: {test['input'].timeline_path}")
        
        result = agent.run(test['input'])
        
        if result.fetch_success:
            print(f"    ✓ Success! Fetched {result.entry_count} timeline entries")
            
            print("\n    First 10 entries:")
            for entry in result.timeline_entries[:10]:
                print(f"      {entry.time:6.1f}s - {entry.name}")
            
            if len(result.timeline_entries) > 10:
                print(f"      ... and {len(result.timeline_entries) - 10} more entries")
        else:
            print(f"    ✗ Failed: {result.error_message}")
    
    agent.close()
    print("\n" + "=" * 60)
    print("Tests complete!")


if __name__ == "__main__":
    test_cactbot_agent()
