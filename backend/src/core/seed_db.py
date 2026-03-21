"""
seed_db.py — Push dummy data to live DynamoDB

Run this script to test your AWS connection and populate the 'canopy-os-events'
table with our hardcoded dummy data.

Run from the backend/ directory:
    uv run python -m src.core.seed_db
"""

from src.core.db import put_fire_event
from src.ingestion.dummy import get_dummy_fires, get_dummy_burn_probability, get_dummy_assets_summary, get_dummy_choke_points

def seed():
    print("🌲 Seeding DynamoDB with CanopyOS Dummy Data...")
    
    fires = get_dummy_fires()
    
    for fire in fires:
        fire_id = fire["fire_id"]
        print(f"\nProcessing {fire_id} ({fire['name']})...")
        
        # 1. Get the base fire data
        # 2. Get the burn probability grid
        # 3. Get the choke points
        
        grid = get_dummy_burn_probability(fire_id)
        choke_points = get_dummy_choke_points(fire_id)
        
        # Combine them all into one massive DynamoDB Item.
        # This is the beauty of NoSQL single-table design!
        db_item = {
            "fire_id": fire_id,  # REQUIRED Partition Key
            "metadata": fire,
            "burn_probability_grid": grid,
            "tactical_choke_points": choke_points
        }
        
        print(f"  -> Uploading full item to DynamoDB...")
        success = put_fire_event(db_item)
        if success:
            print(f"  ✅ Success: {fire_id} written to AWS!")
        else:
            print(f"  ❌ Failed to write {fire_id}")
            
    print("\n✅ Seeding complete. Check your AWS Console to see the data live!")

if __name__ == "__main__":
    seed()
