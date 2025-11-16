"""Test Solar Assistant MQTT connection"""

import time
from solar_assistant_mqtt import SolarAssistantMQTT
import logging

logging.basicConfig(level=logging.INFO)

# Test connection
print("🔌 Testing Solar Assistant MQTT connection...")
print(f"   Host: 192.168.1.162")
print(f"   Port: 1883\n")

client = SolarAssistantMQTT("192.168.1.162", 1883)

if client.connect():
    print("✅ Connected successfully!\n")
    print("📡 Waiting for data (10 seconds)...\n")
    
    time.sleep(10)
    
    # Get all data
    all_data = client.get_all_data()
    
    if all_data:
        print(f"📊 Received data from {len(all_data)} inverter(s):\n")
        for inverter_id, data in all_data.items():
            print(f"🔋 {inverter_id}:")
            for key, value in sorted(data.items()):
                if key != 'last_update':
                    print(f"   {key}: {value}")
            print()
        
        # Get aggregated
        print("📈 Aggregated data:")
        aggregated = client.get_aggregated_data()
        for key, value in sorted(aggregated.items()):
            print(f"   {key}: {value}")
        
    else:
        print("⚠️ No data received yet")
        print("   This could mean:")
        print("   - MQTT is not enabled in Solar Assistant")
        print("   - Solar Assistant is not publishing data")
        print("   - Network connectivity issues")
    
    client.disconnect()
else:
    print("❌ Failed to connect")
    print("\n💡 Possible issues:")
    print("   1. MQTT not enabled in Solar Assistant")
    print("   2. Firewall blocking port 1883")
    print("   3. Solar Assistant not running")
    print("   4. Wrong IP address")
    print("\n📝 To enable MQTT in Solar Assistant:")
    print("   1. Open Solar Assistant web interface (http://192.168.1.162)")
    print("   2. Go to Configuration tab")
    print("   3. Enable 'MQTT Output'")
    print("   4. Save and restart Solar Assistant")
