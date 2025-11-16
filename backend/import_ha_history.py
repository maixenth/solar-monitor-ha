"""
Import Home Assistant History
Récupère l'historique depuis Home Assistant API et l'importe dans MongoDB
"""

import requests
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timezone, timedelta
import os
from dotenv import load_dotenv
from pathlib import Path
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Config
MONGO_URL = os.environ['MONGO_URL']
DB_NAME = os.environ['DB_NAME']
HA_URL = os.environ.get('HOME_ASSISTANT_URL', '')
HA_TOKEN = os.environ.get('HOME_ASSISTANT_TOKEN', '')
BATTERY_CAPACITY_KWH = float(os.environ.get('BATTERY_CAPACITY_KWH', '27.2'))


async def get_entity_mapping():
    """Get entity mapping from database"""
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    config = await db.home_assistant_config.find_one({})
    if not config or not config.get('entity_mapping'):
        logger.error("No entity mapping found in database")
        return None
    
    return config['entity_mapping']


def fetch_history(entity_id: str, days: int = 30):
    """
    Fetch history for an entity from Home Assistant
    
    Args:
        entity_id: Entity ID to fetch
        days: Number of days of history
        
    Returns:
        List of historical data points
    """
    if not HA_URL or not HA_TOKEN:
        logger.error("Home Assistant URL or token not configured")
        return []
    
    # Calculate start time
    end_time = datetime.now(timezone.utc)
    start_time = end_time - timedelta(days=days)
    
    # Format for API
    timestamp = start_time.isoformat()
    
    url = f"{HA_URL}/api/history/period/{timestamp}"
    params = {
        "filter_entity_id": entity_id,
        "minimal_response": "true",
        "no_attributes": "true"
    }
    headers = {
        "Authorization": f"Bearer {HA_TOKEN}",
        "Content-Type": "application/json"
    }
    
    try:
        logger.info(f"Fetching history for {entity_id} (last {days} days)...")
        response = requests.get(url, params=params, headers=headers, timeout=60)
        
        if response.status_code == 200:
            data = response.json()
            if data and len(data) > 0:
                logger.info(f"✅ Retrieved {len(data[0])} data points for {entity_id}")
                return data[0]  # Returns list of state changes
            else:
                logger.warning(f"No data found for {entity_id}")
                return []
        else:
            logger.error(f"Failed to fetch history: HTTP {response.status_code}")
            return []
            
    except Exception as e:
        logger.error(f"Error fetching history for {entity_id}: {e}")
        return []


def map_to_inverter_reading(timestamp: datetime, solar_data: dict):
    """Map data to InverterReading format"""
    solar_power = solar_data.get("solar_power", 0.0)
    battery_soc = solar_data.get("battery_soc", 0.0)
    battery_power = solar_data.get("battery_power", 0.0)
    grid_power = solar_data.get("grid_power", 0.0)
    load_power = solar_data.get("load_power", 0.0)
    energy_today = solar_data.get("energy_today", 0.0)
    energy_total = solar_data.get("energy_total", 0.0)
    
    # Calculate battery voltage (estimate from SOC)
    battery_voltage = 48.0 + (battery_soc / 100.0) * 6.0
    battery_current = battery_power / battery_voltage if battery_voltage > 0 else 0.0
    
    return {
        "timestamp": timestamp.isoformat(),
        "ac_power": solar_power,
        "dc_power": solar_power * 1.05,
        "ac_voltage": 230.0,
        "dc_voltage": 400.0,
        "ac_current": solar_power / 230.0 if solar_power > 0 else 0.0,
        "dc_current": (solar_power * 1.05) / 400.0 if solar_power > 0 else 0.0,
        "frequency": 50.0,
        "energy_today": energy_today,
        "energy_total": energy_total,
        "battery_voltage": battery_voltage,
        "battery_current": battery_current,
        "battery_soc": battery_soc,
        "battery_temperature": 25.0,
        "battery_power": battery_power,
        "grid_power": grid_power,
        "grid_voltage": 230.0,
        "grid_frequency": 50.0,
        "temperature": 45.0,
        "status": "ok"
    }


async def import_history(days: int = 30, batch_size: int = 1000):
    """
    Import historical data from Home Assistant
    
    Args:
        days: Number of days to import
        batch_size: Number of records to insert at once
    """
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    # Get entity mapping
    entity_mapping = await get_entity_mapping()
    if not entity_mapping:
        logger.error("Cannot proceed without entity mapping")
        return
    
    logger.info(f"📊 Starting import of {days} days of history...")
    logger.info(f"Entity mapping: {entity_mapping}")
    
    # Get or create virtual inverter
    virtual_inv = await db.inverters.find_one({"name": "Home Assistant"})
    if not virtual_inv:
        logger.error("Virtual inverter 'Home Assistant' not found. Please configure Home Assistant first.")
        return
    
    inverter_id = virtual_inv['id']
    
    # Fetch history for all entities
    histories = {}
    for data_type, entity_id in entity_mapping.items():
        if entity_id:
            history = fetch_history(entity_id, days)  # This is a regular function, not async
            if history:
                histories[data_type] = {item['last_updated']: item['state'] for item in history}
    
    if not histories:
        logger.error("No historical data retrieved")
        return
    
    # Get all unique timestamps
    all_timestamps = set()
    for history in histories.values():
        all_timestamps.update(history.keys())
    
    sorted_timestamps = sorted(all_timestamps)
    logger.info(f"📈 Processing {len(sorted_timestamps)} unique timestamps...")
    
    # Build readings
    readings_to_insert = []
    imported_count = 0
    skipped_count = 0
    
    for ts_str in sorted_timestamps:
        try:
            timestamp = datetime.fromisoformat(ts_str.replace('Z', '+00:00'))
            
            # Check if reading already exists
            existing = await db.readings.find_one({
                "inverter_id": inverter_id,
                "timestamp": timestamp.isoformat()
            })
            
            if existing:
                skipped_count += 1
                continue
            
            # Collect data for this timestamp
            solar_data = {}
            for data_type, history in histories.items():
                if ts_str in history:
                    try:
                        value = float(history[ts_str])
                        solar_data[data_type] = value
                    except (ValueError, TypeError):
                        solar_data[data_type] = 0.0
                else:
                    solar_data[data_type] = 0.0
            
            # Create reading
            reading = map_to_inverter_reading(timestamp, solar_data)
            reading['inverter_id'] = inverter_id
            
            readings_to_insert.append(reading)
            
            # Insert in batches
            if len(readings_to_insert) >= batch_size:
                await db.readings.insert_many(readings_to_insert)
                imported_count += len(readings_to_insert)
                logger.info(f"✅ Imported {imported_count} readings...")
                readings_to_insert = []
                
        except Exception as e:
            logger.error(f"Error processing timestamp {ts_str}: {e}")
            continue
    
    # Insert remaining readings
    if readings_to_insert:
        await db.readings.insert_many(readings_to_insert)
        imported_count += len(readings_to_insert)
    
    logger.info(f"""
    ✅ Import complete!
    - Imported: {imported_count} readings
    - Skipped (duplicates): {skipped_count}
    - Total processed: {len(sorted_timestamps)} timestamps
    - Time range: {sorted_timestamps[0]} to {sorted_timestamps[-1]}
    """)
    
    client.close()


if __name__ == "__main__":
    import sys
    
    days = int(sys.argv[1]) if len(sys.argv) > 1 else 30
    
    print(f"🚀 Starting Home Assistant history import ({days} days)...")
    asyncio.run(import_history(days))
    print("✅ Done!")
