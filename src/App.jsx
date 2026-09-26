import { useEffect, useMemo, useState } from "react";
import "./App.css";

const GEO_API = "https://geocoding-api.open-meteo.com/v1/search";
const WEATHER_API = "https://api.open-meteo.com/v1/forecast";

const DEFAULT_CITY = {
  name: "Mumbai",
  country: "India",
  latitude: 19.076,
  longitude: 72.8777,
  timezone: "Asia/Kolkata",
};

const weatherInfo = {
  0: ["Clear sky", "☀️"],
  1: ["Mainly clear", "🌤️"],
  2: ["Partly cloudy", "⛅"],
  3: ["Overcast", "☁️"],
  45: ["Fog", "🌫️"],
  48: ["Rime fog", "🌫️"],
  51: ["Light drizzle", "🌦️"],
  53: ["Drizzle", "🌦️"],
  55: ["Heavy drizzle", "🌧️"],
  61: ["Light rain", "🌦️"],
  63: ["Rain", "🌧️"],
  65: ["Heavy rain", "🌧️"],
  71: ["Light snow", "🌨️"],
  73: ["Snow", "❄️"],
  75: ["Heavy snow", "❄️"],
  80: ["Rain showers", "🌦️"],
  81: ["Rain showers", "🌧️"],
  82: ["Heavy showers", "⛈️"],
  95: ["Thunderstorm", "⛈️"],
  96: ["Thunderstorm + hail", "⛈️"],
  99: ["Thunderstorm + hail", "⛈️"],
};

function getWeatherInfo(code) {
  return weatherInfo[code] || ["Unknown", "🌡️"];
}

function formatHour(dateString) {
  return new Date(dateString).toLocaleTimeString([], {
    hour: "numeric",
  });
}

function formatDay(dateString) {
  return new Date(dateString).toLocaleDateString([], {
    weekday: "short",
  });
}

function getBackground(code, isDay) {
  if (!isDay) {
    return "night";
  }

  if ([95, 96, 99].includes(code)) return "storm";
  if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code)) {
    return "rain";
  }
  if ([1, 2, 3].includes(code)) return "cloudy";
  return "sunny";
}

export default function App() {
  const [city, setCity] = useState(DEFAULT_CITY);
  const [search, setSearch] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState("");
  const [unit, setUnit] = useState("C");
  const [favorites, setFavorites] = useState(() => {
    return JSON.parse(localStorage.getItem("weatherFavorites") || "[]");
  });

  async function loadWeather(location = city) {
    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams({
        latitude: location.latitude,
        longitude: location.longitude,
        timezone: "auto",
        forecast_days: "7",
        current:
          "temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,wind_direction_10m,is_day,cloud_cover,pressure_msl",
        hourly:
          "temperature_2m,relative_humidity_2m,precipitation_probability,precipitation,weather_code,wind_speed_10m,uv_index",
        daily:
          "weather_code,temperature_2m_max,temperature_2m_min,apparent_temperature_max,precipitation_probability_max,precipitation_sum,sunrise,sunset,uv_index_max,wind_speed_10m_max",
      });

      const response = await fetch(`${WEATHER_API}?${params}`);

      if (!response.ok) {
        throw new Error("Weather service unavailable");
      }

      const data = await response.json();

      setWeather(data);
    } catch (err) {
      setError("Unable to load weather. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadWeather();
  }, []);

  useEffect(() => {
    localStorage.setItem(
      "weatherFavorites",
      JSON.stringify(favorites)
    );
  }, [favorites]);

  async function searchCity(value) {
    setSearch(value);

    if (value.trim().length < 2) {
      setSuggestions([]);
      return;
    }

    try {
      setSearching(true);

      const params = new URLSearchParams({
        name: value,
        count: "6",
        language: "en",
        format: "json",
      });

      const response = await fetch(`${GEO_API}?${params}`);
      const data = await response.json();

      setSuggestions(data.results || []);
    } catch {
      setSuggestions([]);
    } finally {
      setSearching(false);
    }
  }

  function selectCity(result) {
    const selected = {
      name: result.name,
      country: result.country,
      admin1: result.admin1,
      latitude: result.latitude,
      longitude: result.longitude,
      timezone: result.timezone,
    };

    setCity(selected);
    setSearch("");
    setSuggestions([]);
    loadWeather(selected);
  }

  function useCurrentLocation() {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser.");
      return;
    }

    setLoading(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;

        try {
          const params = new URLSearchParams({
            latitude,
            longitude,
            timezone: "auto",
            forecast_days: "7",
            current:
              "temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,wind_direction_10m,is_day,cloud_cover,pressure_msl",
            hourly:
              "temperature_2m,relative_humidity_2m,precipitation_probability,precipitation,weather_code,wind_speed_10m,uv_index",
            daily:
              "weather_code,temperature_2m_max,temperature_2m_min,apparent_temperature_max,precipitation_probability_max,precipitation_sum,sunrise,sunset,uv_index_max,wind_speed_10m_max",
          });

          const response = await fetch(`${WEATHER_API}?${params}`);
          const data = await response.json();

          setWeather(data);

          setCity({
            name: "Your Location",
            country: "",
            latitude,
            longitude,
            timezone: data.timezone,
          });

          setError("");
        } catch {
          setError("Could not detect your location.");
        } finally {
          setLoading(false);
        }
      },
      () => {
        setLoading(false);
        setError("Location permission was denied.");
      }
    );
  }

  function toggleFavorite() {
    const exists = favorites.some(
      (item) =>
        item.latitude === city.latitude &&
        item.longitude === city.longitude
    );

    if (exists) {
      setFavorites(
        favorites.filter(
          (item) =>
            item.latitude !== city.latitude ||
            item.longitude !== city.longitude
        )
      );
    } else {
      setFavorites([...favorites, city]);
    }
  }

  function changeUnit() {
    setUnit(unit === "C" ? "F" : "C");
  }

  function convertTemperature(value) {
    if (unit === "C") return Math.round(value);

    return Math.round((value * 9) / 5 + 32);
  }

  const current = weather?.current;
  const daily = weather?.daily;
  const hourly = weather?.hourly;

  const [condition, icon] = current
    ? getWeatherInfo(current.weather_code)
    : ["Loading", "🌡️"];

  const hourlyIndexes = useMemo(() => {
    if (!hourly) return [];

    const now = new Date();

    return hourly.time
      .map((time, index) => ({
        time,
        index,
      }))
      .filter(({ time }) => new Date(time) >= now)
      .slice(0, 12);
  }, [hourly]);

  const background = current
    ? getBackground(current.weather_code, current.is_day)
    : "cloudy";

  const isFavorite = favorites.some(
    (item) =>
      item.latitude === city.latitude &&
      item.longitude === city.longitude
  );

  return (
    <div className={`app ${background}`}>
      <div className="background-glow glow-one"></div>
      <div className="background-glow glow-two"></div>

      <header className="navbar">
        <div className="logo">
          <span className="logo-icon">☁️</span>
          <div>
            <h1>SkyCast</h1>
            <small>Weather Intelligence</small>
          </div>
        </div>

        <div className="nav-actions">
          <button onClick={changeUnit} className="unit-button">
            °{unit}
          </button>

          <button
            onClick={toggleFavorite}
            className={`favorite-button ${
              isFavorite ? "active" : ""
            }`}
          >
            {isFavorite ? "★" : "☆"}
          </button>
        </div>
      </header>

      <main className="main-container">
        <section className="search-section">
          <div className="search-wrapper">
            <span className="search-icon">⌕</span>

            <input
              value={search}
              onChange={(e) => searchCity(e.target.value)}
              placeholder="Search city..."
            />

            {searching && (
              <span className="search-loading">...</span>
            )}

            {suggestions.length > 0 && (
              <div className="suggestions">
                {suggestions.map((result) => (
                  <button
                    key={`${result.id}-${result.latitude}`}
                    onClick={() => selectCity(result)}
                  >
                    <strong>{result.name}</strong>
                    <span>
                      {result.admin1
                        ? `${result.admin1}, `
                        : ""}
                      {result.country}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            className="location-button"
            onClick={useCurrentLocation}
          >
            📍 My Location
          </button>
        </section>

        {error && (
          <div className="error-box">
            ⚠️ {error}
          </div>
        )}

        {loading ? (
          <div className="loading-screen">
            <div className="loader"></div>
            <p>Getting the latest weather...</p>
          </div>
        ) : (
          <>
            <section className="hero-weather glass">
              <div className="hero-left">
                <div className="location-title">
                  <div>
                    <span className="eyebrow">
                      CURRENT WEATHER
                    </span>

                    <h2>
                      {city.name}
                      {city.country && (
                        <span className="country">
                          , {city.country}
                        </span>
                      )}
                    </h2>

                    <p>{city.admin1 || city.timezone}</p>
                  </div>

                  <button
                    className="refresh-button"
                    onClick={() => loadWeather()}
                  >
                    ↻
                  </button>
                </div>

                <div className="temperature-row">
                  <span className="main-icon">{icon}</span>

                  <div className="temperature">
                    {convertTemperature(
                      current.temperature_2m
                    )}
                    <sup>°{unit}</sup>
                  </div>
                </div>

                <h3>{condition}</h3>

                <p className="feels">
                  Feels like{" "}
                  {convertTemperature(
                    current.apparent_temperature
                  )}
                  °{unit}
                </p>
              </div>

              <div className="hero-details">
                <WeatherMetric
                  icon="💧"
                  label="Humidity"
                  value={`${current.relative_humidity_2m}%`}
                />

                <WeatherMetric
                  icon="💨"
                  label="Wind"
                  value={`${Math.round(
                    current.wind_speed_10m
                  )} km/h`}
                />

                <WeatherMetric
                  icon="🌧️"
                  label="Precipitation"
                  value={`${current.precipitation} mm`}
                />

                <WeatherMetric
                  icon="☁️"
                  label="Cloud Cover"
                  value={`${current.cloud_cover}%`}
                />

                <WeatherMetric
                  icon="🧭"
                  label="Pressure"
                  value={`${Math.round(
                    current.pressure_msl
                  )} hPa`}
                />

                <WeatherMetric
                  icon="☀️"
                  label="UV Index"
                  value={`${daily.uv_index_max[0]}`}
                />
              </div>
            </section>

            <section className="section">
              <div className="section-heading">
                <div>
                  <span className="eyebrow">NEXT 12 HOURS</span>
                  <h2>Hourly Forecast</h2>
                </div>
              </div>

              <div className="hourly-list">
                {hourlyIndexes.map(({ time, index }) => {
                  const [hourCondition, hourIcon] =
                    getWeatherInfo(
                      hourly.weather_code[index]
                    );

                  return (
                    <div
                      className="hour-card glass"
                      key={time}
                    >
                      <span className="hour">
                        {index ===
                        new Date().getHours()
                          ? "Now"
                          : formatHour(time)}
                      </span>

                      <span className="weather-emoji">
                        {hourIcon}
                      </span>

                      <strong>
                        {convertTemperature(
                          hourly.temperature_2m[index]
                        )}
                        °
                      </strong>

                      <span className="rain-chance">
                        💧{" "}
                        {
                          hourly
                            .precipitation_probability[index]
                        }
                        %
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="section">
              <div className="section-heading">
                <div>
                  <span className="eyebrow">7 DAYS</span>
                  <h2>Daily Forecast</h2>
                </div>
              </div>

              <div className="daily-list">
                {daily.time.map((date, index) => {
                  const [dayCondition, dayIcon] =
                    getWeatherInfo(
                      daily.weather_code[index]
                    );

                  return (
                    <div
                      className="daily-card glass"
                      key={date}
                    >
                      <div className="day-name">
                        <strong>
                          {index === 0
                            ? "Today"
                            : formatDay(date)}
                        </strong>

                        <span>{dayCondition}</span>
                      </div>

                      <div className="day-icon">
                        {dayIcon}
                      </div>

                      <div className="day-rain">
                        💧{" "}
                        {
                          daily
                            .precipitation_probability_max[
                            index
                          ]
                        }
                        %
                      </div>

                      <div className="day-temp">
                        <strong>
                          {convertTemperature(
                            daily.temperature_2m_max[
                              index
                            ]
                          )}
                          °
                        </strong>

                        <span>
                          {convertTemperature(
                            daily.temperature_2m_min[
                              index
                            ]
                          )}
                          °
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="dashboard-grid">
              <div className="dashboard-card glass">
                <span className="eyebrow">
                  SUN INFORMATION
                </span>

                <h2>☀️ Daylight</h2>

                <div className="sun-times">
                  <div>
                    <span>🌅 Sunrise</span>
                    <strong>
                      {new Date(
                        daily.sunrise[0]
                      ).toLocaleTimeString([], {
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </strong>
                  </div>

                  <div>
                    <span>🌇 Sunset</span>
                    <strong>
                      {new Date(
                        daily.sunset[0]
                      ).toLocaleTimeString([], {
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </strong>
                  </div>
                </div>
              </div>

              <div className="dashboard-card glass">
                <span className="eyebrow">
                  WIND CONDITIONS
                </span>

                <h2>💨 Wind</h2>

                <div className="wind-display">
                  <div
                    className="compass"
                    style={{
                      transform: `rotate(${current.wind_direction_10m}deg)`,
                    }}
                  >
                    ↑
                  </div>

                  <div>
                    <strong>
                      {Math.round(
                        current.wind_speed_10m
                      )}{" "}
                      km/h
                    </strong>

                    <span>
                      Direction{" "}
                      {Math.round(
                        current.wind_direction_10m
                      )}
                      °
                    </span>
                  </div>
                </div>
              </div>

              <div className="dashboard-card glass">
                <span className="eyebrow">
                  WEATHER INSIGHT
                </span>

                <h2>🧠 Quick Summary</h2>

                <p className="summary">
                  Today in {city.name}, expect{" "}
                  <strong>{condition.toLowerCase()}</strong>{" "}
                  conditions with a high of{" "}
                  <strong>
                    {convertTemperature(
                      daily.temperature_2m_max[0]
                    )}
                    °{unit}
                  </strong>{" "}
                  and a low of{" "}
                  <strong>
                    {convertTemperature(
                      daily.temperature_2m_min[0]
                    )}
                    °{unit}
                  </strong>
                  .
                </p>
              </div>
            </section>

            {favorites.length > 0 && (
              <section className="section favorites-section">
                <div className="section-heading">
                  <div>
                    <span className="eyebrow">
                      SAVED PLACES
                    </span>
                    <h2>Favorite Locations</h2>
                  </div>
                </div>

                <div className="favorites">
                  {favorites.map((favorite) => (
                    <button
                      className="favorite-card glass"
                      key={`${favorite.latitude}-${favorite.longitude}`}
                      onClick={() => {
                        setCity(favorite);
                        loadWeather(favorite);
                      }}
                    >
                      <span>📍</span>

                      <div>
                        <strong>{favorite.name}</strong>
                        <small>
                          {favorite.country}
                        </small>
                      </div>
                    </button>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </main>

      <footer className="footer">
        <p>
          SkyCast • Built with React + Open-Meteo API
        </p>

        <p>
          Weather data powered by Open-Meteo
        </p>
      </footer>
    </div>
  );
}

function WeatherMetric({ icon, label, value }) {
  return (
    <div className="metric">
      <span className="metric-icon">{icon}</span>

      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
    </div>
  );
}
