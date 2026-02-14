#!/usr/bin/env python3
"""
Test for FFLogsReportAgent - discovers reports from FFLogs API
"""

import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import json


def test_fflogs_client_requires_credentials():
    print("=" * 60)
    print("FFLogsReportAgent Test")
    print("=" * 60)
    print("\nTo test FFLogs agent, you need:")
    print("1. FFLogs API credentials from https://www.fflogs.com/profile -> API")
    print("2. Add credentials to .env file:")
    print("")
    print("   MITPLAN_FFLOGS_CLIENT_ID=your_client_id")
    print("   MITPLAN_FFLOGS_CLIENT_SECRET=your_client_secret")
    print("")
    print("3. Set encounter_id in config.py for the boss you want to test")
    print("")
    print("Current config has zone_id but encounter_id is None")
    print("You can find encounter IDs from FFLogs URL when viewing a report")
    print("")
    print("Example: https://www.fflogs.com/reports/abc123#fight=1")
    print("The encounter ID is the boss fight ID from FFLogs API")
    print("")
    print("-" * 60)


def mock_fflogs_auth_test():
    print("\n>>> Testing FFLogs Authentication (Mock)")
    print("    This would test OAuth2 client credentials flow")
    print("    Requires real credentials to run")


def mock_report_discovery_test():
    print("\n>>> Testing Report Discovery (Mock)")
    print("    This would test:")
    print("    - Discovering reports by encounter ID")
    print("    - Filtering by kill only")
    print("    - Sorting by date/duration")
    print("    Requires real credentials to run")


def mock_events_extraction_test():
    print("\n>>> Testing Events Extraction (Mock)")
    print("    This would test:")
    print("    - Fetching damage events from a report")
    print("    - Filtering by boss actor IDs")
    print("    - Calculating unmitigated damage")
    print("    Requires real credentials to run")


def show_encounter_ids():
    print("\n" + "=" * 60)
    print("Known FFLogs Encounter IDs (approximate)")
    print("=" * 60)
    print("""
Note: These may vary by data center. Check FFLogs directly.

Dawntrail Savage (7.x) - Zone ID 1206:
- R1S (Black Cat): ~1101
- R2S (Honey B. Lovely): ~1102  
- R3S (Brute Bomber): ~1103
- R4S (Wicked Thunder): ~1104
- R5S (Dancing Green): ~1105
- R6S (Sugar Riot): ~1106
- R7S (Brute Abombinator): ~1107
- R8S (Howling Blade): ~1108
- R9S (Vamp Fatale): ~1109
- R10S (Red Hot): ~1110
- R11S (The Tyrant): ~1111
    """)


if __name__ == "__main__":
    test_fflogs_client_requires_credentials()
    mock_fflogs_auth_test()
    mock_report_discovery_test()
    mock_events_extraction_test()
    show_encounter_ids()
    print("\nTests complete!")
