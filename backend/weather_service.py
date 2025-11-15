"""
Weather Service for Cotonou, Benin
Provides weather data and solar production forecasts
"""

import requests
import logging
from typing import Dict, Any, Optional
from datetime import datetime

logger = logging.getLogger(__name__)


class WeatherService:
    """Weather service using OpenWeatherMap API"""
    
    def __init__(self, api_key: str, city: str = "Cotonou", country: str = "BJ"):
        """
        Initialize weather service
        
        Args:
            api_key: OpenWeatherMap API key
            city: City name
            country: Country code (BJ for Benin)
        """
        self.api_key = api_key
        self.city = city
        self.country = country
        self.base_url = "https://api.openweathermap.org/data/2.5"
    
    def get_current_weather(self) -> Optional[Dict[str, Any]]:
        """
        Get current weather for Cotonou
        
        Returns:
            Weather data dictionary or None
        """
        if not self.api_key:
            return self._mock_weather_data()
        
        try:
            url = f"{self.base_url}/weather"
            params = {
                "q": f"{self.city},{self.country}",
                "appid": self.api_key,
                "units": "metric"
            }
            
            response = requests.get(url, params=params, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                return self._format_current_weather(data)
            else:
                logger.error(f"Weather API error: HTTP {response.status_code}")
                return self._mock_weather_data()
                
        except Exception as e:
            logger.error(f"Error fetching weather: {e}")
            return self._mock_weather_data()
    
    def get_forecast(self, days: int = 5) -> Optional[Dict[str, Any]]:
        """
        Get weather forecast
        
        Args:
            days: Number of days (max 5 for free tier)
            
        Returns:
            Forecast data or None
        """
        if not self.api_key:
            return self._mock_forecast_data()
        
        try:
            url = f"{self.base_url}/forecast"
            params = {
                "q": f"{self.city},{self.country}",
                "appid": self.api_key,
                "units": "metric",
                "cnt": days * 8  # 8 forecasts per day (3-hour intervals)
            }
            
            response = requests.get(url, params=params, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                return self._format_forecast(data)
            else:
                logger.error(f"Forecast API error: HTTP {response.status_code}")
                return self._mock_forecast_data()
                
        except Exception as e:
            logger.error(f"Error fetching forecast: {e}")
            return self._mock_forecast_data()
    
    def _format_current_weather(self, data: Dict) -> Dict[str, Any]:
        """Format OpenWeatherMap current weather response"""
        return {
            "temperature": data["main"]["temp"],
            "feels_like": data["main"]["feels_like"],
            "humidity": data["main"]["humidity"],
            "pressure": data["main"]["pressure"],
            "description": data["weather"][0]["description"],
            "icon": data["weather"][0]["icon"],
            "wind_speed": data["wind"]["speed"],
            "clouds": data["clouds"]["all"],
            "sunrise": datetime.fromtimestamp(data["sys"]["sunrise"]).isoformat(),
            "sunset": datetime.fromtimestamp(data["sys"]["sunset"]).isoformat(),
            "city": data["name"],
            "country": data["sys"]["country"]
        }
    
    def _format_forecast(self, data: Dict) -> Dict[str, Any]:
        """Format OpenWeatherMap forecast response"""
        forecasts = []
        
        for item in data["list"]:
            forecasts.append({
                "timestamp": item["dt_txt"],
                "temperature": item["main"]["temp"],
                "description": item["weather"][0]["description"],
                "icon": item["weather"][0]["icon"],
                "clouds": item["clouds"]["all"],
                "wind_speed": item["wind"]["speed"],
                "rain": item.get("rain", {}).get("3h", 0)
            })
        
        return {
            "city": data["city"]["name"],
            "country": data["city"]["country"],
            "forecasts": forecasts
        }
    
    def _mock_weather_data(self) -> Dict[str, Any]:
        """Return mock weather data when API is not configured"""
        return {
            "temperature": 28.5,
            "feels_like": 31.0,
            "humidity": 75,
            "pressure": 1013,
            "description": "partiellement nuageux",
            "icon": "02d",
            "wind_speed": 3.5,
            "clouds": 40,
            "sunrise": "2024-01-01T06:30:00",
            "sunset": "2024-01-01T18:45:00",
            "city": "Cotonou",
            "country": "BJ",
            "mock": True
        }
    
    def _mock_forecast_data(self) -> Dict[str, Any]:
        """Return mock forecast data"""
        forecasts = []
        for i in range(5):
            forecasts.append({
                "timestamp": f"2024-01-0{i+1} 12:00:00",
                "temperature": 28 + i,
                "description": "ensoleillé",
                "icon": "01d",
                "clouds": 20,
                "wind_speed": 3.0,
                "rain": 0
            })
        
        return {
            "city": "Cotonou",
            "country": "BJ",
            "forecasts": forecasts,
            "mock": True
        }
    
    def estimate_solar_production(self, weather_data: Dict) -> Dict[str, Any]:
        """
        Estimate solar production potential based on weather
        
        Args:
            weather_data: Current weather data
            
        Returns:
            Production estimate
        """
        # Base production capacity (example: 5 kW system)
        base_capacity = 5000  # Watts
        
        # Cloud factor (0-100% clouds)
        cloud_percentage = weather_data.get("clouds", 50)
        cloud_factor = 1.0 - (cloud_percentage / 100.0) * 0.7  # Max 70% reduction
        
        # Time of day factor
        current_hour = datetime.now().hour
        if 6 <= current_hour <= 18:
            # Sun is up
            if current_hour == 12:
                time_factor = 1.0  # Peak noon
            elif 10 <= current_hour <= 14:
                time_factor = 0.9  # Near peak
            elif 8 <= current_hour <= 16:
                time_factor = 0.7  # Good production
            else:
                time_factor = 0.4  # Morning/evening
        else:
            time_factor = 0.0  # Night
        
        # Temperature factor (panels lose efficiency in high heat)
        temp = weather_data.get("temperature", 25)
        if temp > 25:
            temp_factor = 1.0 - ((temp - 25) * 0.004)  # 0.4% loss per degree above 25°C
        else:
            temp_factor = 1.0
        
        # Calculate estimated production
        estimated_power = base_capacity * cloud_factor * time_factor * temp_factor
        
        return {
            "estimated_power_w": round(estimated_power, 2),
            "estimated_power_kw": round(estimated_power / 1000, 2),
            "cloud_factor": round(cloud_factor, 2),
            "time_factor": round(time_factor, 2),
            "temp_factor": round(temp_factor, 2),
            "production_quality": self._get_production_quality(cloud_factor, time_factor)
        }
    
    def _get_production_quality(self, cloud_factor: float, time_factor: float) -> str:
        """Get production quality description"""
        combined = cloud_factor * time_factor
        
        if combined > 0.8:
            return "Excellent"
        elif combined > 0.6:
            return "Bon"
        elif combined > 0.4:
            return "Moyen"
        elif combined > 0.2:
            return "Faible"
        else:
            return "Très faible"


# Global weather service instance
weather_service: Optional[WeatherService] = None


def initialize_weather_service(api_key: str, city: str = "Cotonou", country: str = "BJ"):
    """Initialize global weather service"""
    global weather_service
    weather_service = WeatherService(api_key, city, country)
    logger.info(f"✅ Weather service initialized for {city}, {country}")


def get_weather_service() -> Optional[WeatherService]:
    """Get global weather service instance"""
    return weather_service
