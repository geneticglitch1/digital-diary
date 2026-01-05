"use client"

import { useState, useEffect, useRef } from "react"
import { WeatherData } from "@/lib/weather"

function getTemperatureEmoji(temperature: number | null): string {
  if (temperature === null) return "🌡️"
  
  if (temperature < 20) return "🥶" // Freezing
  if (temperature < 32) return "❄️" // Very cold
  if (temperature < 45) return "🌨️" // Cold
  if (temperature < 60) return "🌧️" // Cool
  if (temperature < 70) return "☁️" // Mild
  if (temperature < 80) return "🌤️" // Pleasant
  if (temperature < 90) return "☀️" // Warm
  return "🔥" // Hot
}

export default function WeatherDisplay() {
  const [weather, setWeather] = useState<WeatherData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const hasRequestedLocation = useRef(false)

  useEffect(() => {
    // Only request location once when component mounts
    if (hasRequestedLocation.current || !navigator.geolocation) {
      return
    }

    hasRequestedLocation.current = true
    setIsLoading(true)
    setError(null)

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const response = await fetch(
            `/api/weather?lat=${position.coords.latitude}&lng=${position.coords.longitude}`
          )
          
          if (!response.ok) {
            throw new Error("Failed to fetch weather")
          }
          
          const data = await response.json()
          setWeather(data.weather as WeatherData)
        } catch (err) {
          console.error("Error fetching weather:", err)
          setError("Weather unavailable")
        } finally {
          setIsLoading(false)
        }
      },
      (err) => {
        console.error("Error getting location:", err)
        setError("Location denied")
        setIsLoading(false)
      },
      {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 300000, // Cache for 5 minutes
      }
    )
  }, [])

  if (isLoading) {
    return (
      <div className="flex items-center space-x-2 text-sm text-[#1a4d3e]/70">
        <span className="animate-pulse">🌡️</span>
        <span>Getting Temperature...</span>
      </div>
    )
  }

  if (error || !weather || !weather.temperature) {
    return null // Don't show anything if there's an error or no weather data
  }

  const emoji = getTemperatureEmoji(weather.temperature)

  return (
    <div className="flex items-center space-x-2 text-sm">
      <span className="text-lg">{emoji}</span>
      <span className="text-[#1a4d3e] font-medium">
        {weather.temperature}°F
      </span>
      {weather.city && (
        <span className="text-[#1a4d3e]/70 hidden sm:inline">
          {weather.city}
        </span>
      )}
    </div>
  )
}

