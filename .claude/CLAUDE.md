# Lahore Smog Dashboard

## Overview
Centralized air quality monitoring dashboard for Lahore, aggregating data from WAQI, OpenAQ, and weather APIs. Built for government stakeholders (PTA, WWF, Safe City, Urban Unit, Health, Agriculture, EPA, PHA).

## Stack
- **Frontend:** Next.js 15 + TypeScript + Tailwind CSS (in `web/`)
- **Data Pipeline:** Python 3.12 (in `pipeline/`)
- **Database:** PostgreSQL on Railway
- **Deploy:** Railway

## Project Structure
- `web/` — Next.js dashboard app
- `pipeline/` — Python data ingestion + ML forecasting
- `sql/` — Database schema and migrations

## Key APIs
- WAQI (api.waqi.info) — real-time AQI, free token
- OpenAQ v3 (api.openaq.org) — historical sensor data, free API key
- OpenWeatherMap — weather correlation data

## Commands
- `cd web && npm run dev` — start frontend
- `cd pipeline && python ingest.py` — run data ingestion
- `cd pipeline && python -m models.forecast` — run forecast model
