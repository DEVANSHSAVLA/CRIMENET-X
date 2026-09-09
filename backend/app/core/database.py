import json
from pathlib import Path
from typing import Dict, Any

class DataStore:
    def __init__(self):
        self.data_dir = Path(__file__).parent.parent.parent / "data" / "synthetic"
        self.cases = []
        self.persons = []
        self.locations = []
        self.events = []
        self.relationships = []
        self.phones = []
        self.vehicles = []
        self.accounts = []
        self.sightings = []
        self.firs = []
        self.cdrs = []
        self.transactions = []
        self.notices = []
        self.cameras = []
        self.traffic_signals = []
        self.traffic_flow = []
        self.evidence = []
        self.audit_logs = []

    def load_data(self):
        try:
            files_and_targets = [
                ("case.json", "cases"),
                ("persons.json", "persons"),
                ("notices.json", "notices"),
                ("locations.json", "locations"),
                ("events.json", "events"),
                ("evidence.json", "evidence"),
                ("relationships.json", "relationships"),
                ("cameras.json", "cameras"),
                ("traffic_signals.json", "traffic_signals"),
                ("traffic_flow.json", "traffic_flow"),
                ("phones.json", "phones"),
                ("vehicles.json", "vehicles"),
                ("accounts.json", "accounts"),
                ("sightings.json", "sightings"),
                ("firs.json", "firs"),
                ("cdrs.json", "cdrs"),
                ("transactions.json", "transactions"),
            ]
            for filename, attr in files_and_targets:
                filepath = self.data_dir / filename
                if filepath.exists():
                    with open(filepath, "r", encoding="utf-8") as f:
                        setattr(self, attr, json.load(f))
            print("Successfully loaded synthetic data into DataStore.")
        except Exception as e:
            print(f"Warning: Could not load some synthetic data: {e}")

data_store = DataStore()
