#!/usr/bin/env python3
"""
Solar Monitoring API Backend Tests
Tests all API endpoints for the solar energy monitoring application
"""

import requests
import sys
import json
from datetime import datetime
import time

class SolarAPITester:
    def __init__(self, base_url="https://home-energy-hub-2.preview.emergentagent.com"):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0
        self.created_inverters = []

    def log(self, message):
        print(f"[{datetime.now().strftime('%H:%M:%S')}] {message}")

    def run_test(self, name, method, endpoint, expected_status, data=None, params=None):
        """Run a single API test"""
        url = f"{self.base_url}/api/{endpoint}"
        headers = {'Content-Type': 'application/json'}

        self.tests_run += 1
        self.log(f"🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, params=params, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, params=params, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=10)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                self.log(f"✅ {name} - Status: {response.status_code}")
                try:
                    return success, response.json() if response.text else {}
                except:
                    return success, {}
            else:
                self.log(f"❌ {name} - Expected {expected_status}, got {response.status_code}")
                self.log(f"   Response: {response.text[:200]}")
                return False, {}

        except Exception as e:
            self.log(f"❌ {name} - Error: {str(e)}")
            return False, {}

    def test_api_root(self):
        """Test API root endpoint"""
        return self.run_test("API Root", "GET", "", 200)

    def test_get_inverters_empty(self):
        """Test getting inverters when none exist"""
        success, response = self.run_test("Get Inverters (Empty)", "GET", "inverters", 200)
        if success and isinstance(response, list):
            self.log(f"   Found {len(response)} existing inverters")
        return success, response

    def test_create_growatt_inverter(self):
        """Test creating a GROWATT inverter"""
        inverter_data = {
            "name": "Test GROWATT Onduleur",
            "brand": "GROWATT",
            "connection_type": "USB",
            "port": "/dev/ttyUSB0",
            "baudrate": 9600,
            "slave_id": 1
        }
        success, response = self.run_test("Create GROWATT Inverter", "POST", "inverters", 200, inverter_data)
        if success and 'id' in response:
            self.created_inverters.append(response['id'])
            self.log(f"   Created inverter with ID: {response['id']}")
        return success, response

    def test_create_mppsolar_inverter(self):
        """Test creating an MPPSOLAR inverter"""
        inverter_data = {
            "name": "Test MPPSOLAR Onduleur",
            "brand": "MPPSOLAR",
            "connection_type": "RS485",
            "port": "/dev/ttyUSB1",
            "baudrate": 2400,
            "slave_id": 2
        }
        success, response = self.run_test("Create MPPSOLAR Inverter", "POST", "inverters", 200, inverter_data)
        if success and 'id' in response:
            self.created_inverters.append(response['id'])
            self.log(f"   Created inverter with ID: {response['id']}")
        return success, response

    def test_get_inverters_with_data(self):
        """Test getting inverters after creating some"""
        success, response = self.run_test("Get Inverters (With Data)", "GET", "inverters", 200)
        if success and isinstance(response, list):
            self.log(f"   Found {len(response)} inverters")
            for inv in response:
                self.log(f"     - {inv.get('name', 'Unknown')} ({inv.get('brand', 'Unknown')})")
        return success, response

    def test_get_specific_inverter(self, inverter_id):
        """Test getting a specific inverter"""
        success, response = self.run_test(f"Get Inverter {inverter_id[:8]}", "GET", f"inverters/{inverter_id}", 200)
        if success:
            self.log(f"   Inverter: {response.get('name', 'Unknown')} - Status: {response.get('status', 'Unknown')}")
        return success, response

    def test_dashboard_stats(self):
        """Test dashboard statistics endpoint"""
        success, response = self.run_test("Dashboard Stats", "GET", "dashboard/stats", 200)
        if success:
            self.log(f"   Total Power: {response.get('total_power', 0)}W")
            self.log(f"   Active Inverters: {response.get('active_inverters', 0)}/{response.get('total_inverters', 0)}")
            self.log(f"   Energy Today: {response.get('total_energy_today', 0)} kWh")
        return success, response

    def test_realtime_reading(self, inverter_id):
        """Test getting real-time reading for an inverter"""
        # Wait a bit for readings to be generated
        self.log("   Waiting 6 seconds for readings to be generated...")
        time.sleep(6)
        
        success, response = self.run_test(f"Realtime Reading {inverter_id[:8]}", "GET", f"inverters/{inverter_id}/realtime", 200)
        if success and response:
            self.log(f"   AC Power: {response.get('ac_power', 0)}W")
            self.log(f"   DC Power: {response.get('dc_power', 0)}W")
            self.log(f"   Temperature: {response.get('temperature', 0)}°C")
        elif success and not response:
            self.log("   No reading data available yet")
        return success, response

    def test_inverter_history(self, inverter_id):
        """Test getting inverter history"""
        success, response = self.run_test(f"Inverter History {inverter_id[:8]}", "GET", f"inverters/{inverter_id}/history", 200)
        if success and isinstance(response, list):
            self.log(f"   Found {len(response)} historical readings")
        return success, response

    def test_chart_data(self, inverter_id):
        """Test getting chart data for different periods"""
        periods = ["today", "week", "month"]
        all_success = True
        
        for period in periods:
            success, response = self.run_test(f"Chart Data {period} {inverter_id[:8]}", "GET", f"dashboard/chart-data/{inverter_id}", 200, params={"period": period})
            if success and isinstance(response, list):
                self.log(f"   {period.capitalize()}: {len(response)} data points")
            all_success = all_success and success
        
        return all_success

    def test_inverter_status_toggle(self, inverter_id):
        """Test toggling inverter status"""
        # First disconnect
        success1, _ = self.run_test(f"Disconnect Inverter {inverter_id[:8]}", "PUT", f"inverters/{inverter_id}/status", 200, params={"status": "disconnected"})
        
        # Then reconnect
        success2, _ = self.run_test(f"Reconnect Inverter {inverter_id[:8]}", "PUT", f"inverters/{inverter_id}/status", 200, params={"status": "connected"})
        
        return success1 and success2

    def test_delete_inverter(self, inverter_id):
        """Test deleting an inverter"""
        success, response = self.run_test(f"Delete Inverter {inverter_id[:8]}", "DELETE", f"inverters/{inverter_id}", 200)
        if success:
            self.log(f"   Inverter {inverter_id[:8]} deleted successfully")
        return success, response

    def cleanup(self):
        """Clean up created test data"""
        self.log("🧹 Cleaning up test data...")
        for inverter_id in self.created_inverters:
            try:
                self.test_delete_inverter(inverter_id)
            except:
                pass

def main():
    tester = SolarAPITester()
    
    print("=" * 60)
    print("🌞 SOLAR MONITORING API BACKEND TESTS")
    print("=" * 60)
    
    try:
        # Basic API tests
        tester.test_api_root()
        
        # Get initial state
        tester.test_get_inverters_empty()
        
        # Create inverters
        tester.test_create_growatt_inverter()
        tester.test_create_mppsolar_inverter()
        
        # Test with data
        tester.test_get_inverters_with_data()
        
        # Test individual inverter operations
        if tester.created_inverters:
            first_inverter = tester.created_inverters[0]
            
            # Test specific inverter
            tester.test_get_specific_inverter(first_inverter)
            
            # Test dashboard stats
            tester.test_dashboard_stats()
            
            # Test real-time data
            tester.test_realtime_reading(first_inverter)
            
            # Test history
            tester.test_inverter_history(first_inverter)
            
            # Test chart data
            tester.test_chart_data(first_inverter)
            
            # Test status toggle
            tester.test_inverter_status_toggle(first_inverter)
        
        # Final dashboard check
        tester.test_dashboard_stats()
        
    except KeyboardInterrupt:
        print("\n⚠️  Tests interrupted by user")
    except Exception as e:
        print(f"\n💥 Unexpected error: {e}")
    finally:
        # Cleanup
        tester.cleanup()
    
    # Results
    print("\n" + "=" * 60)
    print("📊 TEST RESULTS")
    print("=" * 60)
    print(f"Tests run: {tester.tests_run}")
    print(f"Tests passed: {tester.tests_passed}")
    print(f"Success rate: {(tester.tests_passed/tester.tests_run*100):.1f}%" if tester.tests_run > 0 else "No tests run")
    
    if tester.tests_passed == tester.tests_run:
        print("🎉 All tests passed!")
        return 0
    else:
        print(f"⚠️  {tester.tests_run - tester.tests_passed} tests failed")
        return 1

if __name__ == "__main__":
    sys.exit(main())