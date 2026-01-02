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
 * Fetches the 5-day forecast once and extracts data for each requested date
 */
export async function getWeatherForecasts(dates: string[]): Promise<{ forecasts: Map<string, WeatherForecast>; errors: Map<string, WeatherError> }> {
  const forecasts = new Map<string, WeatherForecast>();
  const errors = new Map<string, WeatherError>();
  
  if (dates.length === 0) {
    return { forecasts, errors };
  }

  if (!WEATHER_API_KEY) {
    const error: WeatherError = {
      message: 'Weather API key not configured',
      details: 'VITE_WEATHER_API_KEY is not set and no fallback key is available'
    };
    dates.forEach(date => {
      errors.set(date, error);
    });
    return { forecasts, errors };
  }

  try {
    // Fetch 5-day forecast once (returns 3-hour intervals for 5 days)
    const url = `${WEATHER_API_BASE}/forecast?q=Athens,Georgia,US&appid=${WEATHER_API_KEY}&units=imperial`;
    const response = await fetch(url);

    if (!response.ok) {
      let errorDetails = '';
      let errorMessage = '';
      try {
        const errorData = await response.json();
        errorDetails = JSON.stringify(errorData);
        
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
      dates.forEach(date => {
        errors.set(date, error);
      });
      return { forecasts, errors };
    }

    const data = await response.json();
    
    if (!data.list || !Array.isArray(data.list) || data.list.length === 0) {
      const error: WeatherError = {
        message: 'No forecast data in API response',
        details: `Response structure: ${JSON.stringify(Object.keys(data))}`
      };
      dates.forEach(date => {
        errors.set(date, error);
      });
      return { forecasts, errors };
    }

    // Process each requested date
    for (const dateStr of dates) {
      const targetDate = new Date(dateStr + 'T12:00:00');
      const targetDateStr = targetDate.toDateString();
      
      // Filter forecasts for this specific date
      const dayForecasts = data.list.filter((f: any) => {
        const forecastDate = new Date(f.dt * 1000);
        return forecastDate.toDateString() === targetDateStr;
      });

      if (dayForecasts.length > 0) {
        // Calculate high/low from all temperatures for the day
        const temps = dayForecasts.map((f: any) => f.main.temp);
        const high = Math.max(...temps);
        const low = Math.min(...temps);
        
        // Wind speed: Use midday wind (12 PM) if available, otherwise average of daytime hours (9 AM - 3 PM)
        // This gives a more representative wind speed for the day
        const middayForecast = dayForecasts.find((f: any) => {
          const hour = new Date(f.dt * 1000).getHours();
          return hour === 12;
        });
        
        let windSpeed = 0;
        if (middayForecast && middayForecast.wind?.speed) {
          windSpeed = middayForecast.wind.speed;
        } else {
          // Average of daytime hours (9 AM - 3 PM)
          const daytimeForecasts = dayForecasts.filter((f: any) => {
            const hour = new Date(f.dt * 1000).getHours();
            return hour >= 9 && hour <= 15;
          });
          if (daytimeForecasts.length > 0) {
            const windSpeeds = daytimeForecasts
              .map((f: any) => f.wind?.speed || 0)
              .filter((speed: number) => speed > 0);
            if (windSpeeds.length > 0) {
              windSpeed = windSpeeds.reduce((sum: number, speed: number) => sum + speed, 0) / windSpeeds.length;
            }
          } else {
            // Fallback to first forecast of the day
            windSpeed = dayForecasts[0]?.wind?.speed || 0;
          }
        }
        
        // Precipitation calculation
        // Day: forecasts from 6 AM to 6 PM
        // Night: forecasts from 6 PM to 6 AM next day
        const dayForecastsFiltered = dayForecasts.filter((f: any) => {
          const hour = new Date(f.dt * 1000).getHours();
          return hour >= 6 && hour < 18;
        });
        const nightForecastsFiltered = dayForecasts.filter((f: any) => {
          const hour = new Date(f.dt * 1000).getHours();
          return hour < 6 || hour >= 18;
        });
        
        // Calculate precipitation probability (pop) for day and night
        // pop is probability of precipitation (0-1), convert to percentage (0-100)
        const getPrecipProbability = (forecasts: any[]): number => {
          if (forecasts.length === 0) return 0;
          // Use max probability from the period
          const probabilities = forecasts.map((f: any) => (f.pop || 0) * 100);
          return Math.max(...probabilities);
        };
        
        const precipDay = getPrecipProbability(dayForecastsFiltered);
        const precipNight = getPrecipProbability(nightForecastsFiltered);

        forecasts.set(dateStr, {
          date: dateStr,
          high: Math.round(high),
          low: Math.round(low),
          wind: Math.round(windSpeed),
          precipDay: Math.round(precipDay),
          precipNight: Math.round(precipNight),
        });
      } else {
        // No forecast for this date - find closest
        let closestForecast = data.list[0];
        let minDiff = Math.abs(new Date(closestForecast.dt * 1000).getTime() - targetDate.getTime());

        for (const forecast of data.list) {
          const forecastTime = new Date(forecast.dt * 1000).getTime();
          const diff = Math.abs(forecastTime - targetDate.getTime());
          if (diff < minDiff) {
            minDiff = diff;
            closestForecast = forecast;
          }
        }

        forecasts.set(dateStr, {
          date: dateStr,
          high: Math.round(closestForecast.main.temp_max || closestForecast.main.temp),
          low: Math.round(closestForecast.main.temp_min || closestForecast.main.temp),
          wind: Math.round(closestForecast.wind?.speed || 0),
          precipDay: Math.round((closestForecast.pop || 0) * 100),
          precipNight: Math.round((closestForecast.pop || 0) * 100),
        });
      }
    }
  } catch (error) {
    const errorInfo: WeatherError = {
      message: error instanceof Error ? error.message : 'Unknown error',
      details: error instanceof Error ? error.stack : String(error)
    };
    dates.forEach(date => {
      errors.set(date, errorInfo);
    });
  }
  
  return { forecasts, errors };
}

