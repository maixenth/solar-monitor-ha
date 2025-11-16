"""
Import UNIQUEMENT les données d'aujourd'hui depuis Home Assistant
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

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

MONGO_URL = os.environ['MONGO_URL']
DB_NAME = os.environ['DB_NAME']
HA_URL = os.environ.get('HOME_ASSISTANT_URL', '')
HA_TOKEN = os.environ.get('HOME_ASSISTANT_TOKEN', '')
BATTERY_CAPACITY_KWH = float(os.environ.get('BATTERY_CAPACITY_KWH', '27.2'))


def fetch_history_today(entity_id: str):
    """Fetch history for today only"""
    # Start of today UTC
    now = datetime.now(timezone.utc)
    start_today = now.replace(hour=0, minute=0, second=0, microsecond=0)
    
    timestamp = start_today.isoformat()
    
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
        logger.info(f"Fetching {entity_id} for today...")
        response = requests.get(url, params=params, headers=headers, timeout=60)
        
        if response.status_code == 200:
            data = response.json()
            if data and len(data) > 0:
                logger.info(f"✅ Retrieved {len(data[0])} data points")
                return data[0]
            else:
                logger.warning(f"No data for {entity_id}")
                return []
        else:
            logger.error(f"Failed: HTTP {response.status_code}")
            return []
            
    except Exception as e:
        logger.error(f"Error: {e}")
        return []


def map_to_inverter_reading(timestamp: datetime, solar_data: dict):
    """Map data to InverterReading format"""
    solar_power = solar_data.get("solar_power", 0.0)
    battery_soc = solar_data.get("battery_soc", 0.0)
    battery_power = solar_data.get("battery_power", 0.0)
    grid_power = solar_data.get("grid_power", 0.0)
    load_power = solar_data.get("load_power", 0.0)
    
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
        "energy_today": 0.0,
        "energy_total": 0.0,
        "battery_voltage": battery_voltage,
        "battery_current": battery_current,
        "battery_soc": battery_soc,
        "battery_temperature": 25.0,
        "battery_power": battery_power,
        "grid_power": grid_power,
        "grid_voltage": 230.0,
        "grid_frequency": 50.0,
        "load_power": load_power,
        "temperature": 45.0,
        "status": "ok"
    }


async def import_today():
    """Import only today's data"""
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    # Get entity mapping
    ha_config = await db.home_assistant_config.find_one({}, {"_id": 0})
    if not ha_config or not ha_config.get('entity_mapping'):
        logger.error("No entity mapping found")
        return
    
    entity_mapping = ha_config['entity_mapping']
    logger.info(f"📊 Entity mapping loaded: {len(entity_mapping)} entities")
    
    # Get virtual inverter
    virtual_inv = await db.inverters.find_one({"name": "Home Assistant"})
    if not virtual_inv:
        logger.error("Virtual inverter not found")
        return
    
    inverter_id = virtual_inv['id']
    
    # Fetch history for all entities
    histories = {}
    for data_type, entity_id in entity_mapping.items():
        if entity_id and not data_type.endswith('_inv2'):  # Only fetch base entities, inv2 will be added
            history = fetch_history_today(entity_id)
            if history:
                histories[data_type] = {item['last_updated']: item['state'] for item in history}
    
    # Fetch inv2 entities
    for data_type, entity_id in entity_mapping.items():
        if entity_id and data_type.endswith('_inv2'):
            history = fetch_history_today(entity_id)
            if history:
                histories[data_type] = {item['last_updated']: item['state'] for item in history}
    
    if not histories:
        logger.error("No data retrieved")
        return
    
    # Get all unique timestamps
    all_timestamps = set()
    for history in histories.values():
        all_timestamps.update(history.keys())
    
    sorted_timestamps = sorted(all_timestamps)
    logger.info(f"📈 Processing {len(sorted_timestamps)} unique timestamps for TODAY")
    
    # Build readings
    readings_to_insert = []
    imported_count = 0
    
    for ts_str in sorted_timestamps:
        try:
            timestamp = datetime.fromisoformat(ts_str.replace('Z', '+00:00'))
            
            # Collect data
            solar_data = {}
            
            # Base values from inv1
            for data_type in ['solar_power', 'battery_soc', 'battery_power', 'grid_power', 'load_power',
                            'battery_voltage', 'battery_current', 'grid_voltage', 'grid_frequency', 'temperature']:
                if data_type in histories and ts_str in histories[data_type]:
                    try:
                        solar_data[data_type] = float(histories[data_type][ts_str])
                    except:
                        solar_data[data_type] = 0.0
                else:
                    solar_data[data_type] = 0.0
            
            # Add inv2 values
            for metric in ['solar_power', 'grid_power', 'load_power']:
                inv2_key = f"{metric}_inv2"
                if inv2_key in histories and ts_str in histories[inv2_key]:
                    try:
                        inv2_value = float(histories[inv2_key][ts_str])
                        solar_data[metric] += inv2_value
                    except:
                        pass
            
            # Create reading
            reading = map_to_inverter_reading(timestamp, solar_data)
            reading['inverter_id'] = inverter_id
            
            readings_to_insert.append(reading)
            
            # Insert in batches
            if len(readings_to_insert) >= 500:
                await db.readings.insert_many(readings_to_insert)
                imported_count += len(readings_to_insert)
                logger.info(f"✅ Imported {imported_count} readings...")
                readings_to_insert = []
                
        except Exception as e:
            logger.error(f"Error processing {ts_str}: {e}")
            continue
    
    # Insert remaining
    if readings_to_insert:
        await db.readings.insert_many(readings_to_insert)
        imported_count += len(readings_to_insert)
    
    logger.info(f"""
    ✅ Import TODAY complete!
    - Imported: {imported_count} readings
    - Time range: {sorted_timestamps[0]} to {sorted_timestamps[-1]}
    - Date: TODAY (16 Nov 2025)
    """)
    
    client.close()


if __name__ == "__main__":
    print("🚀 Starting TODAY-ONLY import from Home Assistant...")
    asyncio.run(import_today())
    print("✅ Done!")
