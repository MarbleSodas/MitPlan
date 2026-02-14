#!/usr/bin/env python3
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import argparse
import json
from pathlib import Path

from rich.console import Console
from rich.table import Table

from config import config
from schemas.timeline_schemas import TimelineGenerationRequest
from agents.orchestrator import TimelineGenerationOrchestrator


console = Console()


BANNER = """
 _______           ___          
/_  __(_)_ _  ___ / (_)__  ___  
 / / / /  ' \/ -_) / / _ \/ -_) 
/_/_/_/_/_/_/\__/_/_/_//_/\__/  
  / __/__________ ____  ___ ____
 _\ \/ __/ __/ _ `/ _ \/ -_) __/
/___/\__/_/  \_,_/ .__/\__/_/   
                /_/             
                    Timeline Scraper v2.0
                    (Atomic Agents Edition)
"""


def list_bosses():
    console.print(f"[cyan]{BANNER}[/cyan]")
    console.print("\n[yellow]Available Boss IDs:[/yellow]\n")
    
    bosses = config.cactbot.boss_mapping
    
    table = Table(show_header=True, header_style="bold magenta")
    table.add_column("ID", style="cyan")
    table.add_column("Name", style="white")
    table.add_column("Zone ID", style="dim")
    table.add_column("Encounter ID", style="dim")
    
    for boss_id, boss_info in bosses.items():
        table.add_row(
            boss_id,
            boss_info.get("name", "N/A"),
            str(boss_info.get("zone_id", "N/A")),
            str(boss_info.get("encounter_id", "N/A")),
        )
    
    console.print(table)


def generate_timeline(args):
    console.print(f"[cyan]{BANNER}[/cyan]\n")
    
    client_id = args.client_id or config.fflogs_client_id
    client_secret = args.client_secret or config.fflogs_client_secret
    
    if not client_id or not client_secret:
        console.print("[red]Error: FFLogs client_id and client_secret required[/red]")
        console.print("[yellow]Set via arguments or MITPLAN_FFLOGS_CLIENT_ID/MITPLAN_FFLOGS_CLIENT_SECRET environment variables[/yellow]")
        sys.exit(1)
    
    output_path = args.output
    if not output_path:
        boss_config = config.get_boss_config(args.boss)
        if boss_config:
            output_path = f"src/data/bosses/{boss_config.get('mitplan_id', args.boss)}_actions.json"
    
    request = TimelineGenerationRequest(
        boss_id=args.boss,
        boss_name=args.name,
        report_count=args.count,
        output_path=output_path,
        include_dodgeable=args.include_dodgeable,
        dodgeable_threshold=args.threshold,
        fflogs_client_id=client_id,
        fflogs_client_secret=client_secret,
    )
    
    console.print(f"[cyan]Generating timeline for {args.boss}...[/cyan]\n")
    
    orchestrator = TimelineGenerationOrchestrator(client_id, client_secret)
    result = orchestrator.run(request)
    
    if result.success:
        console.print("[green]✓ Timeline generated successfully![/green]\n")
        
        if result.summary:
            console.print("[blue]=== Summary ===[/blue]")
            console.print(f"  Unique abilities: {result.summary.unique_abilities}")
            console.print(f"  Total events: {result.summary.total_events}")
            console.print(f"  Reports used: {result.summary.reports_used}")
            console.print(f"  Tank busters: {result.summary.tank_busters}")
            console.print(f"  Raidwides: {result.summary.raidwides}")
            console.print(f"  Variants detected: {result.summary.variants_detected}")
            console.print(f"  Default coverage: {result.summary.default_coverage:.1%}")
        
        if result.warnings:
            console.print("\n[yellow]Warnings:[/yellow]")
            for warning in result.warnings:
                console.print(f"  ⚠ {warning}")
        
        if result.output_path:
            console.print(f"\n[green]Output: {result.output_path}[/green]")
    else:
        console.print("[red]✗ Failed to generate timeline[/red]")
        
        for error in result.errors:
            console.print(f"  [red]Error: {error}[/red]")
        
        sys.exit(1)


def show_info(args):
    console.print(f"[cyan]{BANNER}[/cyan]\n")
    
    boss_config = config.get_boss_config(args.boss)
    
    if not boss_config:
        console.print(f"[red]Unknown boss ID: {args.boss}[/red]")
        console.print("[yellow]Use 'list-bosses' to see available IDs.[/yellow]")
        sys.exit(1)
    
    console.print(f"[yellow]Boss Information:[/yellow]\n")
    console.print(f"  ID: [cyan]{args.boss}[/cyan]")
    console.print(f"  Name: [white]{boss_config.get('name', 'N/A')}[/white]")
    console.print(f"  Zone ID: {boss_config.get('zone_id', 'N/A')}")
    console.print(f"  Encounter ID: {boss_config.get('encounter_id', 'N/A')}")
    console.print(f"  Timeline: {boss_config.get('timeline_path', 'N/A')}")
    console.print(f"  MitPlan ID: {boss_config.get('mitplan_id', 'N/A')}")


def main():
    parser = argparse.ArgumentParser(
        description="MitPlan Timeline Scraper v2.0 (Atomic Agents)",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    
    subparsers = parser.add_subparsers(dest="command", help="Available commands")
    
    generate_parser = subparsers.add_parser("generate", help="Generate timeline for a boss")
    generate_parser.add_argument("boss", help="Boss ID (e.g., m7s, m8s)")
    generate_parser.add_argument("-c", "--count", type=int, default=30, help="Number of reports to analyze")
    generate_parser.add_argument("-o", "--output", help="Output file path")
    generate_parser.add_argument("--dry-run", action="store_true", help="Preview without saving")
    generate_parser.add_argument("--include-dodgeable", action="store_true", help="Include dodgeable abilities")
    generate_parser.add_argument("-t", "--threshold", type=float, default=0.7, help="Dodgeable threshold (0.0-1.0)")
    generate_parser.add_argument("--client-id", help="FFLogs client ID")
    generate_parser.add_argument("--client-secret", help="FFLogs client secret")
    generate_parser.add_argument("--name", help="Boss display name")
    
    list_parser = subparsers.add_parser("list-bosses", help="List available boss IDs")
    
    info_parser = subparsers.add_parser("info", help="Show information about a boss")
    info_parser.add_argument("boss", help="Boss ID")
    
    args = parser.parse_args()
    
    if args.command == "list-bosses":
        list_bosses()
    elif args.command == "generate":
        generate_timeline(args)
    elif args.command == "info":
        show_info(args)
    else:
        console.print(f"[cyan]{BANNER}[/cyan]")
        parser.print_help()


if __name__ == "__main__":
    main()
