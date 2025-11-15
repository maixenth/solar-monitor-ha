from fastapi import FastAPI, APIRouter, HTTPException, BackgroundTasks
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import asyncio
from apscheduler.schedulers.asyncio import AsyncIOScheduler
import random
from inverter_scanner import auto_discover_inverters
from network_info import get_network_info
from inverter_reader import read_inverter_data, close_all_connections
from home_assistant_reader import (
    initialize_ha_reader, 
    get_ha_reader, 
    HomeAssistantReader
)
from weather_service import (
    initialize_weather_service,
    get_weather_service
)

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Configuration du mode de fonctionnement
INVERTER_MODE = os.environ.get('INVERTER_MODE', 'SIMULATION').upper()
logger.info(f"🔧 Mode onduleurs: {INVERTER_MODE}")

# ===================== MODELS =====================

class InverterCreate(BaseModel):
    name: str
    brand: str  # "GROWATT" or "MPPSOLAR"
    connection_type: str  # "USB", "RS485", "Modbus"
    port: str  # e.g., "/dev/ttyUSB0"
    baudrate: int = 9600
    slave_id: Optional[int] = 1
    battery_capacity: Optional[float] = 0  # kWh

class Inverter(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    brand: str
    connection_type: str
    port: str
    baudrate: int
    slave_id: Optional[int]
    battery_capacity: Optional[float] = 0  # kWh
    status: str = "disconnected"  # "connected", "disconnected", "error"
    last_reading: Optional[datetime] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class InverterReading(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    inverter_id: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    
    # Power metrics
    ac_power: Optional[float] = None  # Watts
    dc_power: Optional[float] = None  # Watts
    ac_voltage: Optional[float] = None  # Volts
    dc_voltage: Optional[float] = None  # Volts
    ac_current: Optional[float] = None  # Amps
    dc_current: Optional[float] = None  # Amps
    frequency: Optional[float] = None  # Hz
    
    # Energy metrics
    energy_today: Optional[float] = None  # kWh
    energy_total: Optional[float] = None  # kWh
    
    # Battery metrics (if available)
    battery_voltage: Optional[float] = None  # Volts
    battery_current: Optional[float] = None  # Amps
    battery_soc: Optional[float] = None  # State of charge %
    battery_temperature: Optional[float] = None  # Celsius
    battery_power: Optional[float] = None  # Watts (+ charging, - discharging)
    
    # Grid metrics
    grid_power: Optional[float] = None  # Watts (+ importing, - exporting)
    grid_voltage: Optional[float] = None  # Volts
    grid_frequency: Optional[float] = None  # Hz
    
    # System
    temperature: Optional[float] = None  # Inverter temperature
    status: str = "ok"  # "ok", "warning", "error"

class EnergyManagementMode(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    mode: str = "automatic"  # "manual" or "automatic"
    manual_source: Optional[str] = None  # "solar", "battery", "grid" when manual
    priority_order: List[str] = ["solar", "battery", "grid"]  # Priority hierarchy
    
    # Automatic mode rules
    battery_min_soc: float = 20.0  # Switch to grid if battery below this %
    battery_max_soc: float = 90.0  # Stop charging at this %
    solar_min_power: float = 500.0  # Minimum solar power to use (W)
    grid_max_import: float = 5000.0  # Maximum grid import allowed (W)
    
    # Advanced rules
    enable_grid_charging: bool = False  # Allow grid to charge battery
    enable_grid_export: bool = True  # Allow exporting to grid
    peak_hours_start: Optional[str] = "17:00"  # Peak hours start time
    peak_hours_end: Optional[str] = "22:00"  # Peak hours end time
    avoid_grid_during_peak: bool = True  # Avoid grid during peak hours
    
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class EnergyManagementUpdate(BaseModel):
    mode: Optional[str] = None
    manual_source: Optional[str] = None
    priority_order: Optional[List[str]] = None
    battery_min_soc: Optional[float] = None
    battery_max_soc: Optional[float] = None
    solar_min_power: Optional[float] = None
    grid_max_import: Optional[float] = None
    enable_grid_charging: Optional[bool] = None
    enable_grid_export: Optional[bool] = None
    peak_hours_start: Optional[str] = None
    peak_hours_end: Optional[str] = None
    avoid_grid_during_peak: Optional[bool] = None

class DashboardStats(BaseModel):
    total_solar_power: float
    total_battery_power: float
    total_grid_power: float
    total_load_power: float
    battery_soc: float
    energy_today: float
    energy_total: float
    active_inverters: int
    total_inverters: int
    current_source: str  # "solar", "battery", "grid", "mixed"
    management_mode: str  # "manual" or "automatic"

# ===================== SIMULATED READINGS =====================

async def simulate_reading(inverter_id: str, brand: str) -> InverterReading:
    """Simulate inverter readings with grid and battery data"""
    
    # Simulate solar production (varies with time of day)
    current_hour = datetime.now().hour
    solar_factor = max(0, min(1, (current_hour - 6) / 6)) if current_hour < 12 else max(0, min(1, (18 - current_hour) / 6))
    
    ac_power = random.uniform(1500, 4500) * solar_factor
    dc_power = ac_power * random.uniform(1.05, 1.15)
    
    # Simulate battery (charging/discharging)
    battery_soc = random.uniform(60, 95)
    battery_power = random.uniform(-2000, 3000)  # Negative = discharging, Positive = charging
    
    # Simulate grid
    # If solar is high, export to grid (negative)
    # If solar is low, import from grid (positive)
    if ac_power > 3000:
        grid_power = random.uniform(-1500, 0)  # Exporting
    else:
        grid_power = random.uniform(0, 2000)  # Importing
    
    reading = InverterReading(
        inverter_id=inverter_id,
        ac_power=round(ac_power, 2),
        dc_power=round(dc_power, 2),
        ac_voltage=round(random.uniform(220, 240), 2),
        dc_voltage=round(random.uniform(350, 450), 2),
        ac_current=round(ac_power / 230, 2),
        dc_current=round(dc_power / 400, 2),
        frequency=round(random.uniform(49.5, 50.5), 2),
        energy_today=round(random.uniform(15, 35), 2),
        energy_total=round(random.uniform(5000, 15000), 2),
        temperature=round(random.uniform(35, 55), 2),
        battery_voltage=round(random.uniform(48, 54), 2),
        battery_current=round(battery_power / 50, 2),
        battery_soc=round(battery_soc, 1),
        battery_temperature=round(random.uniform(20, 35), 1),
        battery_power=round(battery_power, 2),
        grid_power=round(grid_power, 2),
        grid_voltage=round(random.uniform(220, 240), 2),
        grid_frequency=round(random.uniform(49.8, 50.2), 2),
        status="ok"
    )
    
    return reading

# ===================== ENERGY MANAGEMENT =====================

async def get_energy_management() -> EnergyManagementMode:
    """Get current energy management configuration"""
    config = await db.energy_management.find_one({}, {"_id": 0})
    if not config:
        # Create default configuration
        default_config = EnergyManagementMode()
        doc = default_config.model_dump()
        doc['updated_at'] = doc['updated_at'].isoformat()
        await db.energy_management.insert_one(doc)
        return default_config
    
    if isinstance(config.get('updated_at'), str):
        config['updated_at'] = datetime.fromisoformat(config['updated_at'])
    
    return EnergyManagementMode(**config)

async def determine_active_source(readings: List[dict], config: EnergyManagementMode) -> str:
    """Determine which energy source is currently being used"""
    
    if config.mode == "manual":
        return config.manual_source or "solar"
    
    # Automatic mode logic
    total_solar = sum(r.get('ac_power', 0) or 0 for r in readings)
    total_battery = sum(r.get('battery_power', 0) or 0 for r in readings)
    total_grid = sum(r.get('grid_power', 0) or 0 for r in readings)
    avg_battery_soc = sum(r.get('battery_soc', 0) or 0 for r in readings) / len(readings) if readings else 0
    
    # Check time for peak hours
    current_time = datetime.now().time()
    is_peak_hours = False
    if config.peak_hours_start and config.peak_hours_end:
        start = datetime.strptime(config.peak_hours_start, "%H:%M").time()
        end = datetime.strptime(config.peak_hours_end, "%H:%M").time()
        is_peak_hours = start <= current_time <= end
    
    # Priority logic
    for source in config.priority_order:
        if source == "solar" and total_solar >= config.solar_min_power:
            return "solar"
        elif source == "battery" and avg_battery_soc > config.battery_min_soc:
            if total_battery < 0:  # Discharging
                return "battery"
        elif source == "grid":
            if not (is_peak_hours and config.avoid_grid_during_peak):
                if total_grid > 0:  # Importing
                    return "grid"
    
    # If multiple sources active
    if total_solar > 0 and abs(total_battery) > 0:
        return "mixed"
    
    return "solar"  # Default

# ===================== BACKGROUND TASKS =====================

scheduler = AsyncIOScheduler()

async def collect_readings():
    """Background task to collect readings from all inverters"""
    try:
        inverters = await db.inverters.find({"status": "connected"}).to_list(100)
        
        for inv in inverters:
            try:
                # Choisir entre simulation ou lecture réelle selon la configuration
                if INVERTER_MODE == 'REAL':
                    # Mode RÉEL: Lire les vraies données de l'onduleur
                    data = read_inverter_data(inv)
                    
                    if data is None:
                        # Erreur de lecture
                        logger.error(f"Impossible de lire l'onduleur {inv['id']} ({inv['brand']})")
                        await db.inverters.update_one(
                            {"id": inv['id']},
                            {"$set": {"status": "error"}}
                        )
                        continue
                    
                    # Créer l'objet InverterReading à partir des données lues
                    reading = InverterReading(
                        inverter_id=inv['id'],
                        ac_power=data.get('ac_power', 0.0),
                        dc_power=data.get('dc_power', 0.0),
                        ac_voltage=data.get('ac_voltage', 0.0),
                        dc_voltage=data.get('dc_voltage', 0.0),
                        ac_current=data.get('ac_current', 0.0),
                        dc_current=data.get('dc_current', 0.0),
                        frequency=data.get('frequency', 50.0),
                        energy_today=data.get('energy_today', 0.0),
                        energy_total=data.get('energy_total', 0.0),
                        temperature=data.get('temperature', 0.0),
                        battery_voltage=data.get('battery_voltage', 0.0),
                        battery_current=data.get('battery_current', 0.0),
                        battery_soc=data.get('battery_soc', 0.0),
                        battery_temperature=data.get('battery_temperature', 0.0),
                        battery_power=data.get('battery_power', 0.0),
                        grid_power=data.get('grid_power', 0.0),
                        grid_voltage=data.get('grid_voltage', 0.0),
                        grid_frequency=data.get('grid_frequency', 50.0),
                        status=data.get('status', 'ok')
                    )
                else:
                    # Mode SIMULATION: Générer des données aléatoires
                    reading = await simulate_reading(inv['id'], inv['brand'])
                
                # Store reading
                reading_dict = reading.model_dump()
                reading_dict['timestamp'] = reading_dict['timestamp'].isoformat()
                await db.readings.insert_one(reading_dict)
                
                # Update inverter last_reading
                await db.inverters.update_one(
                    {"id": inv['id']},
                    {"$set": {
                        "last_reading": datetime.now(timezone.utc).isoformat(),
                        "status": "connected"
                    }}
                )
                
            except Exception as e:
                logger.error(f"Error reading from inverter {inv['id']}: {e}")
                await db.inverters.update_one(
                    {"id": inv['id']},
                    {"$set": {"status": "error"}}
                )
    except Exception as e:
        logger.error(f"Error in collect_readings: {e}")

# ===================== API ROUTES =====================

@api_router.get("/")
async def root():
    return {"message": "Solar Monitoring API with Energy Management"}

# ===== INVERTERS =====

@api_router.get("/inverters", response_model=List[Inverter])
async def get_inverters():
    """Get all inverters"""
    inverters = await db.inverters.find({}, {"_id": 0}).to_list(1000)
    for inv in inverters:
        if isinstance(inv.get('created_at'), str):
            inv['created_at'] = datetime.fromisoformat(inv['created_at'])
        if inv.get('last_reading') and isinstance(inv['last_reading'], str):
            inv['last_reading'] = datetime.fromisoformat(inv['last_reading'])
    return inverters

@api_router.post("/inverters", response_model=Inverter)
async def create_inverter(input: InverterCreate):
    """Add new inverter"""
    inverter = Inverter(**input.model_dump())
    inverter.status = "connected"
    
    doc = inverter.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    if doc['last_reading']:
        doc['last_reading'] = doc['last_reading'].isoformat()
    
    await db.inverters.insert_one(doc)
    return inverter

@api_router.get("/inverters/{inverter_id}", response_model=Inverter)
async def get_inverter(inverter_id: str):
    """Get specific inverter"""
    inverter = await db.inverters.find_one({"id": inverter_id}, {"_id": 0})
    if not inverter:
        raise HTTPException(status_code=404, detail="Inverter not found")
    
    if isinstance(inverter.get('created_at'), str):
        inverter['created_at'] = datetime.fromisoformat(inverter['created_at'])
    if inverter.get('last_reading') and isinstance(inverter['last_reading'], str):
        inverter['last_reading'] = datetime.fromisoformat(inverter['last_reading'])
    
    return inverter

@api_router.delete("/inverters/{inverter_id}")
async def delete_inverter(inverter_id: str):
    """Delete inverter"""
    result = await db.inverters.delete_one({"id": inverter_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Inverter not found")
    
    await db.readings.delete_many({"inverter_id": inverter_id})
    
    return {"message": "Inverter deleted"}

@api_router.put("/inverters/{inverter_id}/status")
async def update_inverter_status(inverter_id: str, status: str):
    """Update inverter status"""
    result = await db.inverters.update_one(
        {"id": inverter_id},
        {"$set": {"status": status}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Inverter not found")
    
    return {"message": f"Inverter status updated to {status}"}

# ===== READINGS =====

@api_router.get("/inverters/{inverter_id}/realtime", response_model=Optional[InverterReading])
async def get_realtime_reading(inverter_id: str):
    """Get latest reading for an inverter"""
    reading = await db.readings.find_one(
        {"inverter_id": inverter_id},
        {"_id": 0},
        sort=[("timestamp", -1)]
    )
    
    if not reading:
        return None
    
    if isinstance(reading.get('timestamp'), str):
        reading['timestamp'] = datetime.fromisoformat(reading['timestamp'])
    
    return reading

@api_router.get("/dashboard/stats", response_model=DashboardStats)
async def get_dashboard_stats():
    """Get overall dashboard statistics with energy sources"""
    inverters = await db.inverters.find({}, {"_id": 0}).to_list(1000)
    
    total_solar_power = 0
    total_battery_power = 0
    total_grid_power = 0
    total_load_power = 0
    battery_socs = []
    total_energy_today = 0
    total_energy_total = 0
    active_count = 0
    
    readings_list = []
    
    for inv in inverters:
        if inv['status'] == 'connected':
            active_count += 1
            
            reading = await db.readings.find_one(
                {"inverter_id": inv['id']},
                {"_id": 0},
                sort=[("timestamp", -1)]
            )
            
            if reading:
                readings_list.append(reading)
                total_solar_power += reading.get('ac_power', 0) or 0
                total_battery_power += reading.get('battery_power', 0) or 0
                total_grid_power += reading.get('grid_power', 0) or 0
                total_energy_today += reading.get('energy_today', 0) or 0
                total_energy_total += reading.get('energy_total', 0) or 0
                
                if reading.get('battery_soc'):
                    battery_socs.append(reading['battery_soc'])
    
    # Calculate total load
    total_load_power = total_solar_power + abs(total_battery_power) + total_grid_power
    
    # Get energy management config
    config = await get_energy_management()
    current_source = await determine_active_source(readings_list, config)
    
    return DashboardStats(
        total_solar_power=round(total_solar_power, 2),
        total_battery_power=round(total_battery_power, 2),
        total_grid_power=round(total_grid_power, 2),
        total_load_power=round(total_load_power, 2),
        battery_soc=round(sum(battery_socs) / len(battery_socs), 1) if battery_socs else 0,
        energy_today=round(total_energy_today, 2),
        energy_total=round(total_energy_total, 2),
        active_inverters=active_count,
        total_inverters=len(inverters),
        current_source=current_source,
        management_mode=config.mode
    )

@api_router.get("/statistics/period")
async def get_period_statistics(period: str = "today", start_date: Optional[str] = None, end_date: Optional[str] = None):
    """Get comprehensive statistics for a given period or custom date range"""
    
    now = datetime.now(timezone.utc)
    
    # Handle custom date range
    if start_date and end_date:
        start_time = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
        end_time = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
        prev_start = start_time - (end_time - start_time)
        prev_end = start_time
    else:
        # Predefined periods
        if period == "today":
            start_time = now.replace(hour=0, minute=0, second=0, microsecond=0)
            prev_start = start_time - timedelta(days=1)
            prev_end = start_time
        elif period == "yesterday":
            start_time = now.replace(hour=0, minute=0, second=0, microsecond=0) - timedelta(days=1)
            prev_start = start_time - timedelta(days=1)
            prev_end = start_time
        elif period == "week":
            start_time = now - timedelta(days=7)
            prev_start = start_time - timedelta(days=7)
            prev_end = start_time
        elif period == "month":
            start_time = now - timedelta(days=30)
            prev_start = start_time - timedelta(days=30)
            prev_end = start_time
        elif period == "year":
            start_time = now - timedelta(days=365)
            prev_start = start_time - timedelta(days=365)
            prev_end = start_time
        else:
            start_time = now.replace(hour=0, minute=0, second=0, microsecond=0)
            prev_start = start_time - timedelta(days=1)
            prev_end = start_time
    
    inverters = await db.inverters.find({}, {"_id": 0}).to_list(1000)
    
    # Get readings
    current_readings = await db.readings.find(
        {"timestamp": {"$gte": start_time.isoformat()}},
        {"_id": 0}
    ).to_list(10000)
    
    prev_readings = await db.readings.find(
        {
            "timestamp": {
                "$gte": prev_start.isoformat(),
                "$lt": prev_end.isoformat()
            }
        },
        {"_id": 0}
    ).to_list(10000)
    
    # Calculate statistics
    total_production = 0
    total_solar_energy = 0
    total_grid_import = 0
    total_grid_export = 0
    total_battery_charge = 0
    total_battery_discharge = 0
    total_power = 0
    peak_power = 0
    total_dc_power = 0
    total_ac_power = 0
    count = len(current_readings)
    
    inverter_stats = {}
    
    for reading in current_readings:
        energy = reading.get('energy_today', 0) or 0
        ac_power = reading.get('ac_power', 0) or 0
        dc_power = reading.get('dc_power', 0) or 0
        grid_power = reading.get('grid_power', 0) or 0
        battery_power = reading.get('battery_power', 0) or 0
        
        total_power += ac_power
        total_dc_power += dc_power
        total_ac_power += ac_power
        total_solar_energy += ac_power * (5/3600)  # 5 seconds intervals to kWh
        
        if grid_power > 0:
            total_grid_import += grid_power * (5/3600)
        else:
            total_grid_export += abs(grid_power) * (5/3600)
        
        if battery_power > 0:
            total_battery_charge += battery_power * (5/3600)
        else:
            total_battery_discharge += abs(battery_power) * (5/3600)
        
        if ac_power > peak_power:
            peak_power = ac_power
        
        inv_id = reading.get('inverter_id')
        if inv_id not in inverter_stats:
            inverter_stats[inv_id] = {
                'readings': [],
                'total_energy': 0,
                'max_power': 0,
                'total_power': 0,
                'total_dc': 0,
                'total_ac': 0,
                'count': 0
            }
        
        inverter_stats[inv_id]['readings'].append(reading)
        inverter_stats[inv_id]['total_energy'] = max(inverter_stats[inv_id]['total_energy'], energy)
        inverter_stats[inv_id]['max_power'] = max(inverter_stats[inv_id]['max_power'], ac_power)
        inverter_stats[inv_id]['total_power'] += ac_power
        inverter_stats[inv_id]['total_dc'] += dc_power
        inverter_stats[inv_id]['total_ac'] += ac_power
        inverter_stats[inv_id]['count'] += 1
        total_production += energy
    
    prev_total = sum(r.get('energy_today', 0) or 0 for r in prev_readings) if prev_readings else 0
    production_change = ((total_production - prev_total) / prev_total * 100) if prev_total > 0 else 0
    
    avg_power = total_power / count if count > 0 else 0
    avg_efficiency = (total_ac_power / total_dc_power * 100) if total_dc_power > 0 else 0
    runtime_hours = (count * 5) / 3600 if count > 0 else 0
    
    inverter_comparison = []
    for inv in inverters:
        inv_id = inv['id']
        if inv_id in inverter_stats:
            stats = inverter_stats[inv_id]
            inverter_comparison.append({
                'name': inv['name'],
                'brand': inv['brand'],
                'total_energy': stats['total_energy'],
                'avg_power': stats['total_power'] / stats['count'] if stats['count'] > 0 else 0,
                'max_power': stats['max_power'],
                'efficiency': (stats['total_ac'] / stats['total_dc'] * 100) if stats['total_dc'] > 0 else 0,
                'runtime_hours': (stats['count'] * 5) / 3600
            })
    
    # Prepare chart data with intelligent sampling
    sorted_readings = sorted(current_readings, key=lambda x: x['timestamp'])
    
    # Determine sampling interval based on data size and period
    total_points = len(sorted_readings)
    
    if period == "today" or period == "yesterday":
        max_points = 48  # 2 points per hour for 24h
    elif period == "week":
        max_points = 84  # 2 points per day for 7 days
    elif period == "month":
        max_points = 60  # 2 points per day for 30 days
    elif period == "year":
        max_points = 73  # ~1 point every 5 days for 365 days
    elif start_date and end_date:
        # Custom period - adaptive sampling
        max_points = 100
    else:
        max_points = 48
    
    # Calculate sampling step
    if total_points > max_points:
        step = total_points // max_points
    else:
        step = 1
    
    chart_data = []
    cumulative = 0
    
    for i in range(0, len(sorted_readings), step):
        reading = sorted_readings[i]
        energy = reading.get('energy_today', 0) or 0
        cumulative = max(cumulative, energy)
        chart_data.append({
            'timestamp': reading['timestamp'],
            'ac_power': reading.get('ac_power', 0),
            'dc_power': reading.get('dc_power', 0),
            'energy_cumulative': cumulative,
            'grid_power': reading.get('grid_power', 0),
            'battery_power': reading.get('battery_power', 0),
            'battery_soc': reading.get('battery_soc', 0)
        })
    
    return {
        'total_production': total_production,
        'total_solar_energy': round(total_solar_energy, 2),
        'total_grid_import': round(total_grid_import, 2),
        'total_grid_export': round(total_grid_export, 2),
        'total_battery_charge': round(total_battery_charge, 2),
        'total_battery_discharge': round(total_battery_discharge, 2),
        'avg_power': avg_power,
        'peak_power': peak_power,
        'runtime_hours': runtime_hours,
        'avg_efficiency': avg_efficiency,
        'production_change': production_change,
        'inverter_comparison': inverter_comparison,
        'chart_data': chart_data
    }

# ===== ENERGY MANAGEMENT =====

@api_router.get("/energy-management", response_model=EnergyManagementMode)
async def get_energy_management_config():
    """Get energy management configuration"""
    return await get_energy_management()

@api_router.put("/energy-management")
async def update_energy_management(update: EnergyManagementUpdate):
    """Update energy management configuration"""
    config = await get_energy_management()
    
    update_data = update.model_dump(exclude_unset=True)
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")
    
    update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
    
    await db.energy_management.update_one(
        {"id": config.id},
        {"$set": update_data}
    )
    
    return {"message": "Energy management configuration updated"}

# ===== AUTOMATIC INVERTER DISCOVERY =====

@api_router.post("/inverters/scan")
async def scan_inverters(background_tasks: BackgroundTasks):
    """Scan for GROWATT and MPPSOLAR inverters automatically"""
    logger.info("🔍 Starting manual inverter scan...")
    
    try:
        # Run discovery in background
        discovered = auto_discover_inverters()
        
        # Add discovered inverters to database if not already present
        added_count = 0
        for inv_data in discovered:
            # Check if inverter already exists (by port and slave_id)
            existing = await db.inverters.find_one({
                "port": inv_data['port'],
                "slave_id": inv_data.get('slave_id')
            })
            
            if not existing:
                # Create new inverter
                inverter = Inverter(**inv_data)
                inverter.status = "connected"
                
                doc = inverter.model_dump()
                doc['created_at'] = doc['created_at'].isoformat()
                if doc['last_reading']:
                    doc['last_reading'] = doc['last_reading'].isoformat()
                
                await db.inverters.insert_one(doc)
                added_count += 1
                logger.info(f"✅ Added {inv_data['brand']} inverter: {inv_data['name']}")
            else:
                logger.info(f"⏭️  Skipped existing inverter on port {inv_data['port']}")
        
        return {
            "message": f"Scan completed: {len(discovered)} inverters found, {added_count} added",
            "discovered": discovered,
            "added_count": added_count
        }
        
    except Exception as e:
        logger.error(f"Error during inverter scan: {e}")
        raise HTTPException(status_code=500, detail=f"Scan error: {str(e)}")

# ===== SYSTEM / NETWORK INFO =====

@api_router.get("/system/network-info")
async def get_system_network_info():
    """Get system network information for Settings page"""
    try:
        info = get_network_info()
        return info
    except Exception as e:
        logger.error(f"Error getting network info: {e}")
        raise HTTPException(status_code=500, detail=f"Error getting network info: {str(e)}")

@api_router.get("/system/inverter-mode")
async def get_inverter_mode():
    """Get current inverter reading mode (SIMULATION or REAL)"""
    return {
        "mode": INVERTER_MODE,
        "description": "SIMULATION: Données aléatoires pour tests | REAL: Lecture réelle des onduleurs connectés"
    }

@api_router.put("/system/inverter-mode")
async def set_inverter_mode(mode: str):
    """
    Change inverter reading mode
    Note: This changes the runtime variable only. To persist, update .env file
    """
    global INVERTER_MODE
    
    mode = mode.upper()
    if mode not in ['SIMULATION', 'REAL']:
        raise HTTPException(status_code=400, detail="Mode must be 'SIMULATION' or 'REAL'")
    
    INVERTER_MODE = mode
    logger.info(f"🔧 Mode onduleurs changé: {INVERTER_MODE}")
    
    return {
        "message": f"Mode changé en {INVERTER_MODE}",
        "note": "Pour rendre permanent, mettez à jour INVERTER_MODE dans /app/backend/.env"
    }

# Include the router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_event():
    logger.info("Starting Solar Monitoring API with Energy Management...")
    
    # Auto-discover inverters at startup
    logger.info("🔍 Starting automatic inverter discovery...")
    try:
        discovered = auto_discover_inverters()
        logger.info(f"✨ Auto-discovery: {len(discovered)} inverters found")
        
        # Add discovered inverters to database
        for inv_data in discovered:
            existing = await db.inverters.find_one({
                "port": inv_data['port'],
                "slave_id": inv_data.get('slave_id')
            })
            
            if not existing:
                inverter = Inverter(**inv_data)
                inverter.status = "connected"
                
                doc = inverter.model_dump()
                doc['created_at'] = doc['created_at'].isoformat()
                if doc['last_reading']:
                    doc['last_reading'] = doc['last_reading'].isoformat()
                
                await db.inverters.insert_one(doc)
                logger.info(f"✅ Auto-added: {inv_data['name']}")
    except Exception as e:
        logger.error(f"Error during auto-discovery: {e}")
    
    # Start background scheduler for reading collection
    scheduler.add_job(collect_readings, 'interval', seconds=5)
    scheduler.start()
    
    logger.info("Scheduler started - collecting readings every 5 seconds")

@app.on_event("shutdown")
async def shutdown_db_client():
    scheduler.shutdown()
    close_all_connections()  # Fermer connexions onduleurs
    client.close()
    logger.info("Application shutdown complete")