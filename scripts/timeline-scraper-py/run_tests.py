#!/usr/bin/env python3
"""
Run all agent tests
"""

import subprocess
import sys


def run_test(name, script):
    print(f"\n{'='*60}")
    print(f"Running {name}")
    print('='*60)
    result = subprocess.run([sys.executable, script], capture_output=True, text=True)
    print(result.stdout)
    if result.stderr:
        print(result.stderr)
    return result.returncode == 0


def main():
    tests = [
        ("CactbotTimelineAgent", "test_cactbot_standalone.py"),
        ("TimelineVariantDetectorAgent", "test_variant_detector.py"),
        ("TimelineAggregatorAgent", "test_aggregator.py"),
    ]
    
    results = []
    for name, script in tests:
        success = run_test(name, script)
        results.append((name, success))
    
    print("\n" + "="*60)
    print("TEST SUMMARY")
    print("="*60)
    
    all_passed = True
    for name, success in results:
        status = "✓ PASS" if success else "✗ FAIL"
        print(f"  {status}: {name}")
        if not success:
            all_passed = False
    
    print("="*60)
    
    if all_passed:
        print("All tests passed!")
        return 0
    else:
        print("Some tests failed!")
        return 1


if __name__ == "__main__":
    sys.exit(main())
