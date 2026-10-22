CREATE TABLE IF NOT EXISTS stations (
    id SERIAL PRIMARY KEY,
    external_id VARCHAR(64) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    source VARCHAR(32) NOT NULL, -- 'waqi', 'openaq', 'epa_punjab'
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    city VARCHAR(100) DEFAULT 'Lahore',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS readings (
    id BIGSERIAL PRIMARY KEY,
    station_id INTEGER NOT NULL REFERENCES stations(id),
    aqi INTEGER,
    pm25 DOUBLE PRECISION,
    pm10 DOUBLE PRECISION,
    no2 DOUBLE PRECISION,
    so2 DOUBLE PRECISION,
    co DOUBLE PRECISION,
    o3 DOUBLE PRECISION,
    temperature DOUBLE PRECISION,
    humidity DOUBLE PRECISION,
    wind_speed DOUBLE PRECISION,
    wind_direction DOUBLE PRECISION,
    recorded_at TIMESTAMPTZ NOT NULL,
    ingested_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_readings_station_time ON readings(station_id, recorded_at DESC);
CREATE INDEX idx_readings_recorded_at ON readings(recorded_at DESC);

CREATE TABLE IF NOT EXISTS forecasts (
    id BIGSERIAL PRIMARY KEY,
    station_id INTEGER REFERENCES stations(id),
    forecast_for TIMESTAMPTZ NOT NULL,
    predicted_aqi INTEGER NOT NULL,
    predicted_pm25 DOUBLE PRECISION,
    confidence DOUBLE PRECISION,
    model_version VARCHAR(32),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_forecasts_station_time ON forecasts(station_id, forecast_for);

CREATE TABLE IF NOT EXISTS alerts (
    id SERIAL PRIMARY KEY,
    station_id INTEGER REFERENCES stations(id),
    alert_type VARCHAR(32) NOT NULL, -- 'unhealthy', 'hazardous', 'forecast_spike'
    severity VARCHAR(16) NOT NULL, -- 'warning', 'danger', 'emergency'
    message TEXT NOT NULL,
    aqi_value INTEGER,
    is_active BOOLEAN DEFAULT TRUE,
    triggered_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);
