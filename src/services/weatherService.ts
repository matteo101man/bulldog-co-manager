// Weather service for fetching weather data from Open-Meteo API
// Open-Meteo is free and doesn't require an API key
// Documentation: https://open-meteo.com/en/docs

const OPEN_METEO_BASE = 'https://api.open-meteo.com/v1/forecast';
// Athens, Georgia coordinates
const ATHENS_LAT = 33.9519;
const ATHENS_LON = -83.3576;

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
 * Uses Open-Meteo API which provides free weather forecasts
 */
export async function getWeatherForecast(date: string): Promise<{ forecast: WeatherForecast | null; error: WeatherError | null }> {
  // This function is kept for compatibility but getWeatherForecasts is the main function
  const result = await getWeatherForecasts([date]);
  const forecast = result.forecasts.get(date);
  const error = result.errors.get(date);
  
  return {
    forecast: forecast || null,
    error: error || null
  };
}

/**
 * Fetch weather for multiple dates
 * Uses Open-Meteo API to fetch daily forecasts for Athens, Georgia
 * Documentation: https://open-meteo.com/en/docs
 */
export async function getWeatherForecasts(dates: string[]): Promise<{ forecasts: Map<string, WeatherForecast>; errors: Map<string, WeatherError> }> {
  const forecasts = new Map<string, WeatherForecast>();
  const errors = new Map<string, WeatherError>();
  
  if (dates.length === 0) {
    return { forecasts, errors };
  }

  try {
    // Find the date range (earliest to latest)
    const sortedDates = [...dates].sort();
    const startDate = sortedDates[0];
    const endDate = sortedDates[sortedDates.length - 1];
    
    // Open-Meteo API: Get daily forecast with hourly data for precipitation day/night separation
    // We need both daily (for temps/wind) and hourly (for day/night precipitation)
    const url = new URL(OPEN_METEO_BASE);
    url.searchParams.set('latitude', ATHENS_LAT.toString());
    url.searchParams.set('longitude', ATHENS_LON.toString());
    url.searchParams.set('start_date', startDate);
    url.searchParams.set('end_date', endDate);
    url.searchParams.set('timezone', 'America/New_York');
    url.searchParams.set('temperature_unit', 'fahrenheit');
    url.searchParams.set('windspeed_unit', 'mph');
    url.searchParams.set('precipitation_unit', 'inch');
    
    // Daily variables: max/min temp, max wind speed, precipitation probability
    url.searchParams.set('daily', 'temperature_2m_max,temperature_2m_min,windspeed_10m_max,precipitation_probability_max');
    
    // Hourly variables: precipitation probability for day/night separation
    url.searchParams.set('hourly', 'precipitation_probability');
    
    console.log('Fetching weather from Open-Meteo:', url.toString());

    const response = await fetch(url.toString());

    if (!response.ok) {
      let errorDetails = '';
      let errorMessage = '';
      try {
        const errorData = await response.json();
        errorDetails = JSON.stringify(errorData);
        errorMessage = `Weather API error: ${response.status} ${response.statusText}`;
        if (errorData.reason) {
          errorMessage += ` - ${errorData.reason}`;
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
    
    if (!data.daily || !data.daily.time || !Array.isArray(data.daily.time)) {
      const error: WeatherError = {
        message: 'No daily forecast data in API response',
        details: `Response structure: ${JSON.stringify(Object.keys(data))}`
      };
      dates.forEach(date => {
        errors.set(date, error);
      });
      return { forecasts, errors };
    }

    // Process each requested date
    for (const dateStr of dates) {
      // Find the index of this date in the daily data
      const dateIndex = data.daily.time.findIndex((d: string) => d === dateStr);
      
      if (dateIndex >= 0) {
        const high = data.daily.temperature_2m_max[dateIndex];
        const low = data.daily.temperature_2m_min[dateIndex];
        const wind = data.daily.windspeed_10m_max[dateIndex];
        const precipProbMax = data.daily.precipitation_probability_max[dateIndex] || 0;
        
        // For day/night precipitation, use hourly data
        // Find hourly data for this date
        let precipDay = 0;
        let precipNight = 0;
        
        if (data.hourly && data.hourly.time && data.hourly.precipitation_probability) {
          const targetDate = new Date(dateStr + 'T00:00:00');
          const nextDate = new Date(targetDate);
          nextDate.setDate(nextDate.getDate() + 1);
          
          const dayPrecipProbs: number[] = [];
          const nightPrecipProbs: number[] = [];
          
          for (let i = 0; i < data.hourly.time.length; i++) {
            const hourTime = new Date(data.hourly.time[i]);
            if (hourTime >= targetDate && hourTime < nextDate) {
              const hour = hourTime.getHours();
              const prob = data.hourly.precipitation_probability[i] || 0;
              
              // Day: 6 AM to 6 PM, Night: 6 PM to 6 AM
              if (hour >= 6 && hour < 18) {
                dayPrecipProbs.push(prob);
              } else {
                nightPrecipProbs.push(prob);
              }
            }
          }
          
          precipDay = dayPrecipProbs.length > 0 ? Math.max(...dayPrecipProbs) : precipProbMax;
          precipNight = nightPrecipProbs.length > 0 ? Math.max(...nightPrecipProbs) : precipProbMax;
        } else {
          // Fallback to daily max probability for both
          precipDay = precipProbMax;
          precipNight = precipProbMax;
        }

        forecasts.set(dateStr, {
          date: dateStr,
          high: Math.round(high),
          low: Math.round(low),
          wind: Math.round(wind),
          precipDay: Math.round(precipDay),
          precipNight: Math.round(precipNight),
        });
      } else {
        // Date not found in forecast
        const error: WeatherError = {
          message: `No forecast data available for ${dateStr}`,
          details: 'Date is outside the forecast range (up to 16 days)'
        };
        errors.set(dateStr, error);
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

