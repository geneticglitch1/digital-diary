export interface WeatherData {
  city: string
  state: string
  temperature: number | null
  condition: string
  description: string
  humidity: number | null
  windSpeed: string | null
}

/**
 * Fetches weather data from National Weather Service API using coordinates
 */
export async function fetchWeatherFromCoordinates(
  latitude: number,
  longitude: number
): Promise<WeatherData | null> {
  try {
    // Step 1: Get the grid point for the coordinates
    const pointsResponse = await fetch(
      `https://api.weather.gov/points/${latitude.toFixed(4)},${longitude.toFixed(4)}`,
      {
        headers: {
          'User-Agent': 'Digital Diary (contact@example.com)', // NWS requires User-Agent
        },
      }
    )

    if (!pointsResponse.ok) {
      console.error('Failed to get grid point from NWS API')
      return null
    }

    const pointsData = await pointsResponse.json()
    
    // Extract location info
    const city = pointsData.properties?.relativeLocation?.properties?.city || 'Unknown'
    const state = pointsData.properties?.relativeLocation?.properties?.state || ''

    // Step 2: Get the forecast
    const forecastUrl = pointsData.properties?.forecast
    if (!forecastUrl) {
      console.error('No forecast URL in grid point response')
      return null
    }

    const forecastResponse = await fetch(forecastUrl, {
      headers: {
        'User-Agent': 'Digital Diary (contact@example.com)',
      },
    })

    if (!forecastResponse.ok) {
      console.error('Failed to get forecast from NWS API')
      return null
    }

    const forecastData = await forecastResponse.json()
    
    // Get current period (first period in the forecast)
    const currentPeriod = forecastData.properties?.periods?.[0]
    
    if (!currentPeriod) {
      console.error('No forecast periods available')
      return null
    }

    return {
      city,
      state,
      temperature: currentPeriod.temperature ?? null,
      condition: currentPeriod.shortForecast || 'Unknown',
      description: currentPeriod.detailedForecast || currentPeriod.shortForecast || '',
      humidity: currentPeriod.relativeHumidity?.value ?? null,
      windSpeed: currentPeriod.windSpeed || null,
    }
  } catch (error) {
    console.error('Error fetching weather data:', error)
    return null
  }
}

