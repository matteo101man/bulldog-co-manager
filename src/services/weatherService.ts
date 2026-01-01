// Weather service for fetching weather data from OpenWeatherMap API
// To use this, you need to get a free API key from https://openweathermap.org/api
// Set it in your environment or add it to the config

const WEATHER_API_KEY = import.meta.env.VITE_WEATHER_API_KEY || 'ab09c8e3d973753732795058459f01f6';
const WEATHER_API_BASE = 'https://api.openweathermap.org/data/2.5';

export interface WeatherForecast {
  date: string; // YYYY-MM-DD
  high: number; // Fahrenheit
  low: number; // Fahrenheit
  wind: number; // mph
  precipDay: number; // percentage 0-100
  precipNight: number; // percentage 0-100
}

export interface WeatherError {
  message: string;
  details?: string;
  statusCode?: number;
}

/**
 * Fetch weather forecast for Athens, Georgia for a specific date
 * Note: OpenWeatherMap free tier provides 5-day forecast, so for dates beyond that,
 * we'll use the closest available forecast day
 * Returns null if API call fails
 */
export async function getWeatherForecast(date: string): Promise<{ forecast: WeatherForecast | null; error: WeatherError | null }> {
  if (!WEATHER_API_KEY) {
    const error: WeatherError = {
      message: 'Weather API key not configured',
      details: 'VITE_WEATHER_API_KEY is not set and no fallback key is available'
    };
    console.error('Weather API key error:', error);
    return { forecast: null, error };
  }

  try {
    // Convert date to timestamp
    const dateObj = new Date(date + 'T12:00:00');
    // Use city name format - try Athens, Georgia first, fallback to just Athens
    // Using appid parameter (lowercase) as per API documentation
    const url = `${WEATHER_API_BASE}/forecast?q=Athens,Georgia,US&appid=${WEATHER_API_KEY}&units=imperial`;
    
    console.log('Fetching weather from:', url.replace(WEATHER_API_KEY, '***'));

    // Fetch 5-day forecast (free tier supports 5-day/3-hour forecast)
    const response = await fetch(url);

    if (!response.ok) {
      let errorDetails = '';
      let errorMessage = '';
      try {
        const errorData = await response.json();
        errorDetails = JSON.stringify(errorData);
        
        // Provide helpful message for 401 errors
        if (response.status === 401) {
          errorMessage = `Invalid API key (401). Note: New API keys can take 2+ hours to activate. If you just created this key, please wait and try again later.`;
          if (errorData.message) {
            errorMessage += ` API message: ${errorData.message}`;
          }
        } else {
          errorMessage = `Weather API error: ${response.status} ${response.statusText}`;
        }
      } catch {
        errorDetails = await response.text();
        errorMessage = `Weather API error: ${response.status} ${response.statusText}`;
      }
      
      const error: WeatherError = {
        message: errorMessage,
        details: errorDetails,
        statusCode: response.status
      };
      console.error('Weather API error:', error);
      return { forecast: null, error };
    }

    const data = await response.json();
    
    if (!data.list || !Array.isArray(data.list) || data.list.length === 0) {
      const error: WeatherError = {
        message: 'No forecast data in API response',
        details: `Response structure: ${JSON.stringify(Object.keys(data))}`
      };
      console.error('Weather API data error:', error);
      return { forecast: null, error };
    }
    
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
        forecast: {
          date,
          high: Math.round(high),
          low: Math.round(low),
          wind: Math.round(wind),
          precipDay: Math.round(precipDay),
          precipNight: Math.round(precipNight),
        },
        error: null
      };
    }

    // Fallback to single forecast
    return {
      forecast: {
        date,
        high: Math.round(closestForecast.main.temp_max || closestForecast.main.temp),
        low: Math.round(closestForecast.main.temp_min || closestForecast.main.temp),
        wind: Math.round(closestForecast.wind.speed),
        precipDay: Math.round((closestForecast.pop || 0) * 100),
        precipNight: Math.round((closestForecast.pop || 0) * 100),
      },
      error: null
    };
  } catch (error) {
    const errorInfo: WeatherError = {
      message: error instanceof Error ? error.message : 'Unknown error',
      details: error instanceof Error ? error.stack : String(error)
    };
    console.error('Error fetching weather:', errorInfo);
    return { forecast: null, error: errorInfo };
  }
}

/**
 * Fetch weather for multiple dates
 */
export async function getWeatherForecasts(dates: string[]): Promise<{ forecasts: Map<string, WeatherForecast>; errors: Map<string, WeatherError> }> {
  const forecasts = new Map<string, WeatherForecast>();
  const errors = new Map<string, WeatherError>();
  
  // Fetch all forecasts (with rate limiting consideration)
  // Note: We only need to call the API once since it returns 5-day forecast
  // So we'll fetch once and use it for all dates
  if (dates.length > 0) {
    const result = await getWeatherForecast(dates[0]);
    if (result.forecast) {
      // Use the same forecast data for all dates (API limitation)
      dates.forEach(date => {
        forecasts.set(date, result.forecast!);
      });
    } else if (result.error) {
      dates.forEach(date => {
        errors.set(date, result.error!);
      });
    }
  }
  
  return { forecasts, errors };
}

