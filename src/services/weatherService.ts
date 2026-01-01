// Weather service for fetching weather data from OpenWeatherMap API
// To use this, you need to get a free API key from https://openweathermap.org/api
// Set it in your environment or add it to the config

const WEATHER_API_KEY = import.meta.env.VITE_WEATHER_API_KEY || 'd4421d9accb0571ecbc8c8d17ef112e2';
const WEATHER_API_BASE = 'https://api.openweathermap.org/data/2.5';

export interface WeatherForecast {
  date: string; // YYYY-MM-DD
  high: number; // Fahrenheit
  low: number; // Fahrenheit
  wind: number; // mph
  precipDay: number; // percentage 0-100
  precipNight: number; // percentage 0-100
}

/**
 * Fetch weather forecast for Athens, Georgia for a specific date
 * Note: OpenWeatherMap free tier provides 5-day forecast, so for dates beyond that,
 * we'll use the closest available forecast day
 * Returns null if API call fails
 */
export async function getWeatherForecast(date: string): Promise<WeatherForecast | null> {
  if (!WEATHER_API_KEY) {
    console.error('Weather API key not configured.');
    return null;
  }

  try {
    // Convert date to timestamp
    const dateObj = new Date(date + 'T12:00:00');

    // Fetch 5-day forecast
    const response = await fetch(
      `${WEATHER_API_BASE}/forecast?q=Athens,GA,US&appid=${WEATHER_API_KEY}&units=imperial`
    );

    if (!response.ok) {
      console.error('Weather API error:', response.statusText);
      return null;
    }

    const data = await response.json();
    
    // Find the forecast closest to the requested date
    let closestForecast = data.list[0];
    let minDiff = Math.abs(new Date(closestForecast.dt * 1000).getTime() - dateObj.getTime());

    for (const forecast of data.list) {
      const forecastTime = new Date(forecast.dt * 1000).getTime();
      const diff = Math.abs(forecastTime - dateObj.getTime());
      if (diff < minDiff) {
        minDiff = diff;
        closestForecast = forecast;
      }
    }

    // For a more accurate forecast, we'd need to use the daily forecast API (requires paid tier)
    // For now, we'll use the hourly forecast and estimate high/low
    const dayForecasts = data.list.filter((f: any) => {
      const forecastDate = new Date(f.dt * 1000);
      return forecastDate.toDateString() === dateObj.toDateString();
    });

    if (dayForecasts.length > 0) {
      const temps = dayForecasts.map((f: any) => f.main.temp);
      const high = Math.max(...temps);
      const low = Math.min(...temps);
      const wind = dayForecasts[0].wind.speed; // mph
      const precipDay = (dayForecasts[0].pop || 0) * 100; // Convert to percentage
      const precipNight = (dayForecasts[dayForecasts.length - 1]?.pop || 0) * 100;

      return {
        date,
        high: Math.round(high),
        low: Math.round(low),
        wind: Math.round(wind),
        precipDay: Math.round(precipDay),
        precipNight: Math.round(precipNight),
      };
    }

    // Fallback to single forecast
    return {
      date,
      high: Math.round(closestForecast.main.temp_max || closestForecast.main.temp),
      low: Math.round(closestForecast.main.temp_min || closestForecast.main.temp),
      wind: Math.round(closestForecast.wind.speed),
      precipDay: Math.round((closestForecast.pop || 0) * 100),
      precipNight: Math.round((closestForecast.pop || 0) * 100),
    };
  } catch (error) {
    console.error('Error fetching weather:', error);
    return null;
  }
}

/**
 * Fetch weather for multiple dates
 */
export async function getWeatherForecasts(dates: string[]): Promise<Map<string, WeatherForecast>> {
  const forecasts = new Map<string, WeatherForecast>();
  
  // Fetch all forecasts (with rate limiting consideration)
  for (const date of dates) {
    const forecast = await getWeatherForecast(date);
    if (forecast) {
      forecasts.set(date, forecast);
    }
    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  return forecasts;
}

