import json
import os
import random
from pathlib import Path
from datetime import datetime, timedelta

def generate_data():
    base_dir = Path(__file__).parent.parent / "data" / "synthetic"
    os.makedirs(base_dir, exist_ok=True)
    random.seed(42)  # Reproducible

    # ── Case ────────────────────────────────────────────────────────────
    case = {
        "id": "CNX-2026-041",
        "name": "Operation Shadow Network",
        "status": "ACTIVE",
        "risk_level": "HIGH",
        "created_at": "2026-01-15T10:00:00Z",
        "description": "Multi-city criminal syndicate investigation spanning drug distribution, financial fraud, and logistics smuggling networks across Mumbai, Delhi, and Pune.",
        "stats": {}
    }

    # ── Persons ─────────────────────────────────────────────────────────
    NAMES_A = [
        ("P-001", "Ravi Shankar", ["R. Shankar"]),
        ("P-002", "Manoj Tiwari", ["M. Tiwari"]),
        ("P-003", "Arjun Patel", ["A. Patel", "Arjun P."]),
        ("P-004", "Sandeep Kulkarni", []),
        ("P-005", "Nitin Deshmukh", ["N. Deshmukh"]),
        ("P-006", "Rohit Jadhav", []),
        ("P-007", "Prasad Rao", ["P. Rao"]),
        ("P-008", "Kiran Naik", []),
        ("P-009", "Sunil Patil", ["S. Patil"]),
        ("P-010", "Ajay Sharma", ["A. Sharma"]),
        ("P-011", "Rahul Mane", []),
        ("P-012", "Vijay Pawar", []),
        ("P-013", "Ganesh Sawant", []),
        ("P-014", "Sanjay Bhosle", []),
        ("P-015", "Dinesh Shinde", []),
    ]
    NAMES_B = [
        ("P-020", "Rakesh Agarwal", ["R. Agarwal"]),
        ("P-021", "Praveen Malhotra", []),
        ("P-022", "Suresh Gupta", ["S. Gupta", "Suresh G."]),
        ("P-023", "Naveen Khanna", []),
        ("P-024", "Deepak Mehra", ["D. Mehra"]),
        ("P-025", "Yogesh Bhatia", ["Y. Bhatia"]),
        ("P-026", "Harish Kapoor", []),
        ("P-027", "Mukesh Jindal", []),
        ("P-028", "Tarun Sethi", ["T. Sethi"]),
        ("P-029", "Lalit Grover", []),
        ("P-030", "Ashok Bansal", []),
        ("P-031", "Pankaj Saxena", []),
    ]
    NAMES_C = [
        ("P-035", "Sachin Gaikwad", []),
        ("P-036", "Mahesh Deshpande", ["M. Deshpande"]),
        ("P-037", "Amol Chavan", []),
        ("P-038", "Deepak Joshi", ["D. Joshi", "DJ"]),
        ("P-039", "Vaibhav More", []),
        ("P-040", "Tushar Kamble", ["T. Kamble"]),
        ("P-041", "Akshay Salunkhe", []),
        ("P-042", "Prashant Jagtap", ["P. Jagtap"]),
        ("P-043", "Nilesh Wagh", []),
        ("P-044", "Sagar Kale", []),
    ]
    PERIPHERALS = [
        ("P-045", "Irfan Sheikh", []),
        ("P-046", "Vishal Dubey", []),
        ("P-047", "Ramesh Yadav", []),
        ("P-048", "Anand Mishra", []),
        ("P-049", "Sameer Khan", []),
        ("P-050", "Gautam Reddy", []),
    ]

    persons = []
    for pid, name, aliases in NAMES_A:
        role = "Leader" if pid == "P-003" else "Operative"
        risk = "HIGH" if pid in ("P-003", "P-007", "P-010") else "MEDIUM"
        persons.append({"id": pid, "name": name, "aliases": aliases, "type": "PERSON",
                        "cluster": "A", "cluster_name": "Shadow Syndicate",
                        "role": role, "risk_level": risk})
    for pid, name, aliases in NAMES_B:
        role = "Leader" if pid == "P-022" else "Operative"
        risk = "HIGH" if pid in ("P-022", "P-025", "P-028") else "MEDIUM"
        persons.append({"id": pid, "name": name, "aliases": aliases, "type": "PERSON",
                        "cluster": "B", "cluster_name": "Golden Circuit",
                        "role": role, "risk_level": risk})
    for pid, name, aliases in NAMES_C:
        role = "Leader" if pid == "P-038" else "Operative"
        risk = "HIGH" if pid in ("P-038", "P-040", "P-042") else "MEDIUM"
        persons.append({"id": pid, "name": name, "aliases": aliases, "type": "PERSON",
                        "cluster": "C", "cluster_name": "Silk Route",
                        "role": role, "risk_level": risk})

    # Bridge node P-017
    persons.append({
        "id": "P-017", "name": "Vikram Reddy",
        "aliases": ["V. Reddy", "Vikram R.", "VR", "The Connector"],
        "type": "PERSON", "cluster": "BRIDGE", "cluster_name": "Bridge Node",
        "role": "Connector", "risk_level": "CRITICAL"
    })
    # Secondary bridge
    persons.append({
        "id": "P-032", "name": "Amit Verma",
        "aliases": ["A. Verma"],
        "type": "PERSON", "cluster": "AB_BRIDGE", "cluster_name": "Bridge Node",
        "role": "Facilitator", "risk_level": "HIGH"
    })
    for pid, name, aliases in PERIPHERALS:
        persons.append({"id": pid, "name": name, "aliases": aliases, "type": "PERSON",
                        "cluster": "PERIPHERAL", "cluster_name": "Associates",
                        "role": "Associate", "risk_level": "LOW"})

    # ── Locations ───────────────────────────────────────────────────────
    locations = [
        # Mumbai (10)
        {"id": "L-001", "name": "Andheri West Hub", "address": "42 Link Road, Andheri West", "city": "Mumbai", "lat": 19.1364, "lng": 72.8296, "type": "WAREHOUSE", "risk_level": "HIGH"},
        {"id": "L-002", "name": "Bandra East Market", "address": "17 Station Road, Bandra East", "city": "Mumbai", "lat": 19.0596, "lng": 72.8495, "type": "COMMERCIAL", "risk_level": "MEDIUM"},
        {"id": "L-003", "name": "Dharavi Workshop", "address": "Sector 5, Dharavi", "city": "Mumbai", "lat": 19.0422, "lng": 72.8518, "type": "WORKSHOP", "risk_level": "HIGH"},
        {"id": "L-004", "name": "Colaba Safe House", "address": "88 Shahid Bhagat Singh Rd, Colaba", "city": "Mumbai", "lat": 18.9067, "lng": 72.8147, "type": "RESIDENTIAL", "risk_level": "HIGH"},
        {"id": "L-005", "name": "Juhu Beach Point", "address": "Juhu Tara Rd", "city": "Mumbai", "lat": 19.0883, "lng": 72.8263, "type": "MEETING_POINT", "risk_level": "LOW"},
        {"id": "L-006", "name": "Dadar Transit Hub", "address": "Dadar TT Circle", "city": "Mumbai", "lat": 19.0178, "lng": 72.8478, "type": "TRANSIT", "risk_level": "MEDIUM"},
        {"id": "L-007", "name": "Kurla Container Yard", "address": "Kurla Industrial Area", "city": "Mumbai", "lat": 19.0728, "lng": 72.8789, "type": "WAREHOUSE", "risk_level": "HIGH"},
        {"id": "L-008", "name": "Borivali National Park Entrance", "address": "SGNP Main Gate, Borivali", "city": "Mumbai", "lat": 19.2307, "lng": 72.8567, "type": "MEETING_POINT", "risk_level": "LOW"},
        {"id": "L-009", "name": "Goregaon Film City Area", "address": "Aarey Colony Rd, Goregaon", "city": "Mumbai", "lat": 19.1663, "lng": 72.8526, "type": "COMMERCIAL", "risk_level": "LOW"},
        {"id": "L-010", "name": "Worli Sea Face", "address": "Worli Sea Face Rd", "city": "Mumbai", "lat": 19.0176, "lng": 72.8153, "type": "MEETING_POINT", "risk_level": "MEDIUM"},
        # Delhi (10)
        {"id": "L-011", "name": "Connaught Place Office", "address": "Block F, CP", "city": "Delhi", "lat": 28.6315, "lng": 77.2167, "type": "OFFICE", "risk_level": "HIGH"},
        {"id": "L-012", "name": "Chandni Chowk Exchange", "address": "Dariba Kalan, Chandni Chowk", "city": "Delhi", "lat": 28.6507, "lng": 77.2334, "type": "COMMERCIAL", "risk_level": "HIGH"},
        {"id": "L-013", "name": "Saket Mall Meeting", "address": "Select Citywalk, Saket", "city": "Delhi", "lat": 28.5244, "lng": 77.2066, "type": "MEETING_POINT", "risk_level": "MEDIUM"},
        {"id": "L-014", "name": "Dwarka Sector 12", "address": "Sector 12, Dwarka", "city": "Delhi", "lat": 28.5921, "lng": 77.0460, "type": "RESIDENTIAL", "risk_level": "MEDIUM"},
        {"id": "L-015", "name": "Karol Bagh Hotel", "address": "Ajmal Khan Rd, Karol Bagh", "city": "Delhi", "lat": 28.6519, "lng": 77.1909, "type": "HOTEL", "risk_level": "HIGH"},
        {"id": "L-016", "name": "Lajpat Nagar Market", "address": "Central Market, Lajpat Nagar", "city": "Delhi", "lat": 28.5700, "lng": 77.2373, "type": "COMMERCIAL", "risk_level": "LOW"},
        {"id": "L-017", "name": "Paharganj Guest House", "address": "Main Bazaar, Paharganj", "city": "Delhi", "lat": 28.6438, "lng": 77.2126, "type": "HOTEL", "risk_level": "MEDIUM"},
        {"id": "L-018", "name": "Rohini Sector 7", "address": "Pocket 3, Rohini", "city": "Delhi", "lat": 28.7495, "lng": 77.0565, "type": "RESIDENTIAL", "risk_level": "LOW"},
        {"id": "L-019", "name": "Nehru Place Electronics", "address": "Nehru Place Complex", "city": "Delhi", "lat": 28.5491, "lng": 77.2533, "type": "COMMERCIAL", "risk_level": "MEDIUM"},
        {"id": "L-020", "name": "IGI Airport Terminal 3", "address": "T3, IGI Airport", "city": "Delhi", "lat": 28.5562, "lng": 77.1000, "type": "TRANSIT", "risk_level": "HIGH"},
        # Pune (10)
        {"id": "L-021", "name": "Kothrud Distribution Center", "address": "Paud Rd, Kothrud", "city": "Pune", "lat": 18.5074, "lng": 73.8077, "type": "WAREHOUSE", "risk_level": "HIGH"},
        {"id": "L-022", "name": "Hinjewadi IT Park", "address": "Phase 1, Hinjewadi", "city": "Pune", "lat": 18.5912, "lng": 73.7380, "type": "OFFICE", "risk_level": "MEDIUM"},
        {"id": "L-023", "name": "Shivajinagar Court Area", "address": "JM Rd, Shivajinagar", "city": "Pune", "lat": 18.5314, "lng": 73.8446, "type": "COMMERCIAL", "risk_level": "MEDIUM"},
        {"id": "L-024", "name": "Koregaon Park Villa", "address": "Lane 5, Koregaon Park", "city": "Pune", "lat": 18.5362, "lng": 73.8930, "type": "RESIDENTIAL", "risk_level": "HIGH"},
        {"id": "L-025", "name": "Viman Nagar Complex", "address": "Phoenix Mall, Viman Nagar", "city": "Pune", "lat": 18.5679, "lng": 73.9143, "type": "COMMERCIAL", "risk_level": "LOW"},
        {"id": "L-026", "name": "Hadapsar Industrial Zone", "address": "MIDC, Hadapsar", "city": "Pune", "lat": 18.5089, "lng": 73.9260, "type": "WAREHOUSE", "risk_level": "HIGH"},
        {"id": "L-027", "name": "Pune Station", "address": "Pune Railway Station", "city": "Pune", "lat": 18.5285, "lng": 73.8743, "type": "TRANSIT", "risk_level": "MEDIUM"},
        {"id": "L-028", "name": "Sinhagad Road Depot", "address": "Sinhagad Rd, Vadgaon", "city": "Pune", "lat": 18.4848, "lng": 73.8219, "type": "WAREHOUSE", "risk_level": "HIGH"},
        {"id": "L-029", "name": "Baner Hills", "address": "Baner Pashan Link Rd", "city": "Pune", "lat": 18.5590, "lng": 73.7868, "type": "MEETING_POINT", "risk_level": "LOW"},
        {"id": "L-030", "name": "Pune Airport", "address": "Lohegaon Airport", "city": "Pune", "lat": 18.5822, "lng": 73.9197, "type": "TRANSIT", "risk_level": "MEDIUM"},
    ]

    # Add sightings_count and linked_persons to locations
    for loc in locations:
        loc["sightings_count"] = random.randint(3, 25)
        loc["linked_persons"] = random.randint(2, 12)

    # ── Phones ──────────────────────────────────────────────────────────
    phones = []
    phone_counter = 1
    for p in persons:
        num_phones = 2 if p["risk_level"] in ("HIGH", "CRITICAL") else 1
        for _ in range(num_phones):
            phones.append({
                "id": f"PH-{phone_counter:03d}",
                "number": f"+91-{random.randint(70000,99999)}{random.randint(10000,99999)}",
                "owner_id": p["id"],
                "type": "PHONE",
                "status": random.choice(["ACTIVE", "ACTIVE", "INACTIVE"]),
                "imei": f"{random.randint(100000000000000, 999999999999999)}"
            })
            phone_counter += 1

    # ── Vehicles ────────────────────────────────────────────────────────
    vehicle_types = ["Car", "SUV", "Motorcycle", "Van", "Truck"]
    vehicle_makes = ["Maruti Swift", "Hyundai Creta", "Toyota Fortuner", "Tata Nexon",
                     "Honda Activa", "Mahindra Bolero", "Tata Ace", "Royal Enfield Classic"]
    vehicles = []
    v_owners = ["P-003", "P-007", "P-010", "P-017", "P-022", "P-025", "P-028",
                "P-032", "P-038", "P-040", "P-042", "P-001", "P-005", "P-020",
                "P-024", "P-035", "P-039", "P-045", "P-046", "P-047",
                "P-011", "P-036", "P-043", "P-029", "P-044"]
    for i, owner in enumerate(v_owners, 1):
        state = random.choice(["MH", "DL", "GJ", "RJ", "UP"])
        vehicles.append({
            "id": f"V-{i:03d}",
            "registration": f"{state}-{random.randint(1,99):02d}-{chr(random.randint(65,90))}{chr(random.randint(65,90))}-{random.randint(1000,9999)}",
            "make": random.choice(vehicle_makes),
            "type": random.choice(vehicle_types),
            "owner_id": owner,
            "color": random.choice(["White", "Black", "Silver", "Red", "Blue", "Grey"]),
            "status": "TRACKED"
        })

    # ── Bank Accounts ───────────────────────────────────────────────────
    banks = ["SBI", "HDFC", "ICICI", "Axis", "PNB", "Kotak", "Yes Bank"]
    a_owners = ["P-003", "P-007", "P-017", "P-022", "P-025", "P-028", "P-032",
                "P-038", "P-040", "P-001", "P-010", "P-020", "P-024", "P-035",
                "P-042", "P-045", "P-005", "P-011", "P-026", "P-029",
                "P-036", "P-039", "P-043", "P-046", "P-047", "P-048",
                "P-049", "P-050", "P-021", "P-023"]
    accounts = []
    for i, owner in enumerate(a_owners, 1):
        accounts.append({
            "id": f"A-{i:03d}",
            "bank": random.choice(banks),
            "account_number": f"{random.randint(10000000000, 99999999999)}",
            "owner_id": owner,
            "type": "BANK_ACCOUNT",
            "balance": round(random.uniform(10000, 5000000), 2),
            "status": "ACTIVE"
        })

    # ── Relationships ───────────────────────────────────────────────────
    relationships = []
    rel_id = 1

    def add_rel(src, tgt, rtype, weight=None, conf=None):
        nonlocal rel_id
        relationships.append({
            "id": f"R-{rel_id:03d}",
            "source": src, "target": tgt, "type": rtype,
            "weight": weight or random.randint(1, 10),
            "confidence": conf or round(random.uniform(0.75, 0.99), 2)
        })
        rel_id += 1

    # Cluster A internal (Mumbai drug network)
    a_ids = [n[0] for n in NAMES_A]
    add_rel("P-003", "P-001", "CALLED", 15, 0.97)
    add_rel("P-003", "P-002", "MET", 8, 0.92)
    add_rel("P-003", "P-004", "CALLED", 12, 0.95)
    add_rel("P-003", "P-005", "ASSOCIATED_WITH", 6, 0.88)
    add_rel("P-003", "P-007", "CALLED", 20, 0.98)
    add_rel("P-003", "P-010", "MET", 10, 0.94)
    add_rel("P-003", "P-011", "CALLED", 7, 0.85)
    add_rel("P-001", "P-002", "MET", 4, 0.82)
    add_rel("P-001", "P-004", "CALLED", 5, 0.80)
    add_rel("P-002", "P-005", "ASSOCIATED_WITH", 3, 0.78)
    add_rel("P-004", "P-006", "CALLED", 6, 0.84)
    add_rel("P-005", "P-006", "MET", 3, 0.79)
    add_rel("P-006", "P-008", "CALLED", 4, 0.81)
    add_rel("P-007", "P-008", "MET", 9, 0.91)
    add_rel("P-007", "P-009", "CALLED", 11, 0.93)
    add_rel("P-007", "P-010", "ASSOCIATED_WITH", 7, 0.89)
    add_rel("P-009", "P-010", "CALLED", 5, 0.83)
    add_rel("P-009", "P-011", "MET", 3, 0.77)
    add_rel("P-010", "P-012", "CALLED", 4, 0.80)
    add_rel("P-011", "P-012", "ASSOCIATED_WITH", 2, 0.75)
    add_rel("P-012", "P-013", "CALLED", 6, 0.85)
    add_rel("P-013", "P-014", "MET", 3, 0.78)
    add_rel("P-014", "P-015", "CALLED", 4, 0.80)
    # Vehicle ownership in A
    add_rel("P-003", "V-001", "OWNS", 10, 0.99)
    add_rel("P-007", "V-002", "OWNS", 10, 0.99)
    add_rel("P-010", "V-003", "OWNS", 10, 0.99)
    # Location visits A
    for pid in ["P-003", "P-007", "P-010"]:
        for lid in ["L-001", "L-002", "L-003"]:
            add_rel(pid, lid, "VISITED", random.randint(3, 8), round(random.uniform(0.8, 0.95), 2))

    # Cluster B internal (Delhi financial fraud)
    b_ids = [n[0] for n in NAMES_B]
    add_rel("P-022", "P-020", "CALLED", 14, 0.96)
    add_rel("P-022", "P-021", "MET", 9, 0.93)
    add_rel("P-022", "P-023", "CALLED", 11, 0.94)
    add_rel("P-022", "P-025", "CALLED", 18, 0.97)
    add_rel("P-022", "P-028", "MET", 12, 0.95)
    add_rel("P-020", "P-021", "ASSOCIATED_WITH", 5, 0.84)
    add_rel("P-020", "P-023", "CALLED", 6, 0.86)
    add_rel("P-023", "P-024", "MET", 4, 0.82)
    add_rel("P-024", "P-025", "CALLED", 8, 0.90)
    add_rel("P-025", "P-026", "MET", 5, 0.85)
    add_rel("P-025", "P-027", "CALLED", 7, 0.88)
    add_rel("P-026", "P-027", "ASSOCIATED_WITH", 3, 0.79)
    add_rel("P-027", "P-028", "CALLED", 9, 0.91)
    add_rel("P-028", "P-029", "MET", 6, 0.87)
    add_rel("P-029", "P-030", "CALLED", 4, 0.81)
    add_rel("P-030", "P-031", "ASSOCIATED_WITH", 3, 0.78)
    # Financial transfers in B
    add_rel("P-022", "P-025", "TRANSFERRED_TO", 15, 0.96)
    add_rel("P-025", "P-028", "TRANSFERRED_TO", 12, 0.94)
    add_rel("P-028", "P-020", "TRANSFERRED_TO", 10, 0.93)  # Circular!
    add_rel("P-020", "P-022", "TRANSFERRED_TO", 8, 0.91)   # Circular!
    # Location visits B
    for pid in ["P-022", "P-025", "P-028"]:
        for lid in ["L-011", "L-012", "L-015"]:
            add_rel(pid, lid, "VISITED", random.randint(3, 8), round(random.uniform(0.8, 0.95), 2))

    # Cluster C internal (Pune logistics)
    c_ids = [n[0] for n in NAMES_C]
    add_rel("P-038", "P-035", "CALLED", 13, 0.95)
    add_rel("P-038", "P-036", "MET", 8, 0.91)
    add_rel("P-038", "P-037", "CALLED", 10, 0.93)
    add_rel("P-038", "P-040", "CALLED", 16, 0.97)
    add_rel("P-038", "P-042", "MET", 11, 0.94)
    add_rel("P-035", "P-036", "ASSOCIATED_WITH", 4, 0.82)
    add_rel("P-036", "P-037", "CALLED", 5, 0.84)
    add_rel("P-037", "P-039", "MET", 3, 0.79)
    add_rel("P-039", "P-040", "CALLED", 7, 0.88)
    add_rel("P-040", "P-041", "MET", 6, 0.86)
    add_rel("P-041", "P-042", "CALLED", 5, 0.84)
    add_rel("P-042", "P-043", "ASSOCIATED_WITH", 4, 0.81)
    add_rel("P-043", "P-044", "CALLED", 3, 0.78)
    # Vehicle ownership in C
    add_rel("P-038", "V-009", "OWNS", 10, 0.99)
    add_rel("P-040", "V-010", "OWNS", 10, 0.99)
    add_rel("P-042", "V-011", "OWNS", 10, 0.99)
    # Location visits C
    for pid in ["P-038", "P-040", "P-042"]:
        for lid in ["L-021", "L-024", "L-026"]:
            add_rel(pid, lid, "VISITED", random.randint(3, 8), round(random.uniform(0.8, 0.95), 2))

    # ── P-017 BRIDGE CONNECTIONS ──────────────────────────────────────
    # Connects to Cluster A
    add_rel("P-017", "P-003", "CALLED", 14, 0.96)
    add_rel("P-017", "P-007", "MET", 9, 0.93)
    add_rel("P-017", "P-010", "CALLED", 7, 0.89)
    # Connects to Cluster B
    add_rel("P-017", "P-022", "CALLED", 12, 0.95)
    add_rel("P-017", "P-025", "MET", 8, 0.91)
    add_rel("P-017", "P-028", "CALLED", 6, 0.87)
    # Connects to Cluster C
    add_rel("P-017", "P-038", "CALLED", 11, 0.94)
    add_rel("P-017", "P-040", "MET", 7, 0.90)
    add_rel("P-017", "P-042", "CALLED", 5, 0.86)
    # Other P-017 connections
    add_rel("P-017", "P-032", "SHARED_VEHICLE", 10, 0.97)
    add_rel("P-017", "P-032", "CALLED", 9, 0.93)
    add_rel("P-017", "P-045", "CALLED", 4, 0.82)
    add_rel("P-017", "P-046", "MET", 3, 0.78)
    # P-017 financial
    add_rel("P-017", "A-003", "OWNS", 10, 0.99)
    add_rel("P-017", "P-022", "TRANSFERRED_TO", 8, 0.92)
    add_rel("P-017", "P-038", "TRANSFERRED_TO", 6, 0.88)
    # P-017 vehicles
    add_rel("P-017", "V-004", "OWNS", 10, 0.99)
    # P-017 locations (11 locations across all 3 cities)
    p017_locations = ["L-001", "L-003", "L-005", "L-010",  # Mumbai
                      "L-011", "L-015", "L-020",             # Delhi
                      "L-021", "L-024", "L-027", "L-030"]    # Pune
    for lid in p017_locations:
        add_rel("P-017", lid, "VISITED", random.randint(2, 6), round(random.uniform(0.8, 0.95), 2))

    # P-032 secondary bridge (A-B)
    add_rel("P-032", "P-003", "CALLED", 5, 0.84)
    add_rel("P-032", "P-022", "CALLED", 6, 0.86)
    add_rel("P-032", "P-025", "MET", 4, 0.81)
    add_rel("P-032", "V-008", "OWNS", 10, 0.99)  # Shared vehicle

    # Peripheral connections
    add_rel("P-045", "P-003", "CALLED", 2, 0.76)
    add_rel("P-046", "P-022", "MET", 2, 0.74)
    add_rel("P-047", "P-038", "CALLED", 3, 0.77)
    add_rel("P-048", "P-001", "ASSOCIATED_WITH", 2, 0.73)
    add_rel("P-049", "P-020", "CALLED", 2, 0.75)
    add_rel("P-050", "P-035", "MET", 2, 0.74)

    # More intra-cluster edges for density
    for _ in range(40):
        cluster_choice = random.choice(["A", "B", "C"])
        ids = a_ids if cluster_choice == "A" else b_ids if cluster_choice == "B" else c_ids
        s, t = random.sample(ids, 2)
        rtype = random.choice(["CALLED", "MET", "ASSOCIATED_WITH", "MENTIONED_IN"])
        add_rel(s, t, rtype)

    # ── Events ──────────────────────────────────────────────────────────
    event_types = ["COMMUNICATION", "VEHICLE_SIGHTING", "FINANCIAL_TRANSACTION",
                   "LOCATION_EVENT", "PERSON_INTERACTION", "SURVEILLANCE_EVENT"]
    event_sources = ["Synthetic CCTV Report", "Synthetic CDR Analysis", "Synthetic Financial Alert",
                     "Synthetic Surveillance Report", "Synthetic HUMINT Report", "Synthetic Signal Intelligence"]
    event_descriptions = {
        "COMMUNICATION": ["Phone communication detected between entities", "Encrypted messaging activity observed",
                          "Multiple call bursts recorded", "Cross-network communication intercepted"],
        "VEHICLE_SIGHTING": ["Vehicle spotted at location", "Vehicle movement tracked via ANPR",
                             "Suspicious vehicle parked near target location"],
        "FINANCIAL_TRANSACTION": ["Wire transfer detected", "Cash deposit flagged",
                                  "Suspicious transaction pattern identified", "Cross-border transfer flagged"],
        "LOCATION_EVENT": ["Person sighted at location", "Meeting observed at location",
                           "Unusual activity reported at location"],
        "PERSON_INTERACTION": ["Face-to-face meeting observed", "Group gathering detected",
                               "Handoff interaction recorded"],
        "SURVEILLANCE_EVENT": ["Surveillance footage reviewed", "Undercover report filed",
                                "Electronic surveillance hit"]
    }

    events = []
    all_person_ids = [p["id"] for p in persons]
    all_location_ids = [l["id"] for l in locations]
    start_date = datetime(2021, 1, 1)
    end_date = datetime(2026, 8, 31)
    date_range = (end_date - start_date).days

    for i in range(1, 251):
        etype = random.choice(event_types)
        ts = start_date + timedelta(
            days=random.randint(0, date_range),
            hours=random.randint(0, 23),
            minutes=random.randint(0, 59)
        )
        # Make P-017 appear in ~12% of events
        if random.random() < 0.12:
            involved = ["P-017"] + random.sample([x for x in all_person_ids if x != "P-017"], min(2, len(all_person_ids)-1))
        else:
            involved = random.sample(all_person_ids, min(random.randint(1, 3), len(all_person_ids)))

        events.append({
            "id": f"EV-{i:04d}",
            "type": etype,
            "timestamp": ts.isoformat() + "Z",
            "location_id": random.choice(all_location_ids),
            "entities": involved,
            "confidence": round(random.uniform(0.70, 0.99), 2),
            "source": random.choice(event_sources),
            "description": random.choice(event_descriptions[etype])
        })

    events.sort(key=lambda e: e["timestamp"])

    # ── Sightings ───────────────────────────────────────────────────────
    sightings = []
    for i in range(1, 121):
        ts = start_date + timedelta(days=random.randint(0, date_range), hours=random.randint(6, 23), minutes=random.randint(0, 59))
        sightings.append({
            "id": f"S-{i:04d}",
            "person_id": random.choice(all_person_ids),
            "location_id": random.choice(all_location_ids),
            "timestamp": ts.isoformat() + "Z",
            "confidence": round(random.uniform(0.65, 0.98), 2),
            "source": random.choice(["Synthetic CCTV", "Synthetic ANPR", "Synthetic Witness Report", "Synthetic Cell Tower"]),
        })
    # Ensure P-017 has sightings across all 3 cities
    for j, lid in enumerate(p017_locations):
        ts = start_date + timedelta(days=random.randint(0, date_range), hours=random.randint(6, 23))
        sightings.append({
            "id": f"S-{121+j:04d}",
            "person_id": "P-017",
            "location_id": lid,
            "timestamp": ts.isoformat() + "Z",
            "confidence": round(random.uniform(0.80, 0.97), 2),
            "source": random.choice(["Synthetic CCTV", "Synthetic ANPR"]),
        })
    sightings.sort(key=lambda s: s["timestamp"])

    # ── FIRs ────────────────────────────────────────────────────────────
    fir_descriptions = [
        "Complaint regarding suspicious financial transactions involving multiple entities",
        "Report of drug distribution network operating in western suburbs",
        "Complaint about organized smuggling through logistics networks",
        "Report of money laundering through shell companies",
        "Suspicious vehicle movements reported near warehouse district",
        "Anonymous tip about criminal syndicate meetings",
        "Financial fraud complaint involving forged documents",
        "Report of illegal arms movement",
        "Complaint regarding hawala transactions",
        "Suspicious activity reported near port area",
        "Multiple complaints of extortion linked to syndicate",
        "Report of counterfeit currency distribution",
        "Complaint about illegal construction linked to criminal funds",
        "Report of cyber fraud with links to known criminals",
        "Anonymous tip about upcoming criminal operation",
    ]
    firs = []
    for i in range(1, 16):
        ts = start_date + timedelta(days=random.randint(0, date_range))
        station = random.choice(["Andheri PS", "Bandra PS", "CP PS", "Saket PS", "Kothrud PS", "Shivajinagar PS"])
        mentioned = random.sample(all_person_ids, min(random.randint(2, 5), len(all_person_ids)))
        firs.append({
            "id": f"FIR-{i:03d}",
            "date": ts.strftime("%Y-%m-%d"),
            "station": station,
            "description": fir_descriptions[i-1],
            "mentioned_entities": mentioned,
            "status": random.choice(["OPEN", "UNDER_INVESTIGATION", "CLOSED"]),
            "severity": random.choice(["HIGH", "MEDIUM", "CRITICAL"])
        })

    # ── CDRs ────────────────────────────────────────────────────────────
    cdrs = []
    phone_lookup = {p["owner_id"]: p["id"] for p in phones}
    for i in range(1, 61):
        ts = start_date + timedelta(days=random.randint(0, date_range), hours=random.randint(0, 23), minutes=random.randint(0, 59))
        caller = random.choice(all_person_ids)
        receiver_candidates = [x for x in all_person_ids if x != caller]
        receiver = random.choice(receiver_candidates) if receiver_candidates else caller
        cdrs.append({
            "id": f"CDR-{i:03d}",
            "caller_id": caller,
            "caller_phone": phone_lookup.get(caller, "UNKNOWN"),
            "receiver_id": receiver,
            "receiver_phone": phone_lookup.get(receiver, "UNKNOWN"),
            "timestamp": ts.isoformat() + "Z",
            "duration_seconds": random.randint(15, 3600),
            "tower_location": random.choice(all_location_ids),
            "type": random.choice(["VOICE", "SMS", "DATA"])
        })
    cdrs.sort(key=lambda c: c["timestamp"])

    # ── Transactions ────────────────────────────────────────────────────
    transactions = []
    acct_lookup = {a["owner_id"]: a["id"] for a in accounts}
    for i in range(1, 51):
        ts = start_date + timedelta(days=random.randint(0, date_range))
        sender = random.choice([a["owner_id"] for a in accounts])
        receiver_candidates = [a["owner_id"] for a in accounts if a["owner_id"] != sender]
        receiver = random.choice(receiver_candidates) if receiver_candidates else sender
        transactions.append({
            "id": f"TXN-{i:03d}",
            "sender_id": sender,
            "sender_account": acct_lookup.get(sender, "UNKNOWN"),
            "receiver_id": receiver,
            "receiver_account": acct_lookup.get(receiver, "UNKNOWN"),
            "amount": round(random.uniform(5000, 2500000), 2),
            "currency": "INR",
            "timestamp": ts.strftime("%Y-%m-%d"),
            "type": random.choice(["WIRE", "CASH", "UPI", "NEFT", "RTGS"]),
            "flagged": random.random() < 0.3
        })
    transactions.sort(key=lambda t: t["timestamp"])

    # ── Update case stats ───────────────────────────────────────────────
    case["stats"] = {
        "persons": len(persons),
        "locations": len(locations),
        "events": len(events),
        "relationships": len(relationships),
        "phones": len(phones),
        "vehicles": len(vehicles),
        "accounts": len(accounts),
        "sightings": len(sightings),
        "firs": len(firs),
        "cdrs": len(cdrs),
        "transactions": len(transactions)
    }

    # ── Write files ─────────────────────────────────────────────────────
    def write_json(filename, data):
        filepath = base_dir / filename
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        print(f"  Written {filepath.name}: {len(data) if isinstance(data, list) else 1} records")

    print("Generating CRIMENET-X synthetic intelligence dataset...")
    write_json("case.json", case)
    write_json("persons.json", persons)
    write_json("locations.json", locations)
    write_json("events.json", events)
    write_json("relationships.json", relationships)
    write_json("phones.json", phones)
    write_json("vehicles.json", vehicles)
    write_json("accounts.json", accounts)
    write_json("sightings.json", sightings)
    write_json("firs.json", firs)
    write_json("cdrs.json", cdrs)
    write_json("transactions.json", transactions)
    print(f"\nDone! Generated {len(persons)} persons, {len(locations)} locations, {len(events)} events, {len(relationships)} relationships")
    print(f"Data directory: {base_dir.resolve()}")

if __name__ == "__main__":
    generate_data()
