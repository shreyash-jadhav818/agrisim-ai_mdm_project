import sqlite3
import json
import os
from contextlib import contextmanager
from typing import Generator
from app.core.config import settings

# Ensure DB_FILE resolves to the unified workspace root directory
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
raw_db_file = settings.DATABASE_URL.replace("sqlite:///", "")
if not os.path.isabs(raw_db_file):
    DB_FILE = os.path.join(BASE_DIR, os.path.basename(raw_db_file))
else:
    DB_FILE = raw_db_file

_initialized = False

def get_db_connection() -> sqlite3.Connection:
    global _initialized
    conn = sqlite3.connect(DB_FILE, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    if not _initialized:
        _init_tables(conn)
        _initialized = True
    return conn

def _init_tables(conn: sqlite3.Connection):
    cursor = conn.cursor()
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS farm_profiles (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        location TEXT NOT NULL,
        state TEXT NOT NULL,
        zone TEXT NOT NULL,
        total_acres REAL NOT NULL,
        soil_type TEXT NOT NULL,
        irrigation_system TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        data TEXT
    )
    """)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS simulation_runs (
        id TEXT PRIMARY KEY,
        farm_profile_id TEXT,
        name TEXT NOT NULL,
        crop_id TEXT NOT NULL,
        season TEXT NOT NULL,
        sowing_date TEXT NOT NULL,
        yield_quintal_acre REAL NOT NULL,
        water_consumed_m3 REAL NOT NULL,
        total_cost_inr REAL NOT NULL,
        revenue_inr REAL NOT NULL,
        profit_inr REAL NOT NULL,
        water_productivity_kg_m3 REAL NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        input_data TEXT NOT NULL,
        output_data TEXT NOT NULL,
        FOREIGN KEY (farm_profile_id) REFERENCES farm_profiles(id)
    )
    """)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS scenarios (
        id TEXT PRIMARY KEY,
        simulation_run_id TEXT NOT NULL,
        name TEXT NOT NULL,
        scenario_type TEXT NOT NULL,
        yield_quintal_acre REAL NOT NULL,
        water_saved_pct REAL NOT NULL,
        profit_change_pct REAL NOT NULL,
        summary TEXT,
        details TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (simulation_run_id) REFERENCES simulation_runs(id)
    )
    """)
    conn.commit()


def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # 1. Farm Profiles
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS farm_profiles (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        location TEXT NOT NULL,
        state TEXT NOT NULL,
        zone TEXT NOT NULL,
        total_acres REAL NOT NULL,
        soil_type TEXT NOT NULL,
        irrigation_system TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        data TEXT
    )
    """)
    
    # 2. Simulation Runs
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS simulation_runs (
        id TEXT PRIMARY KEY,
        farm_profile_id TEXT,
        name TEXT NOT NULL,
        crop_id TEXT NOT NULL,
        season TEXT NOT NULL,
        sowing_date TEXT NOT NULL,
        yield_quintal_acre REAL NOT NULL,
        water_consumed_m3 REAL NOT NULL,
        total_cost_inr REAL NOT NULL,
        revenue_inr REAL NOT NULL,
        profit_inr REAL NOT NULL,
        water_productivity_kg_m3 REAL NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        input_data TEXT NOT NULL,
        output_data TEXT NOT NULL,
        FOREIGN KEY (farm_profile_id) REFERENCES farm_profiles(id)
    )
    """)
    
    # 3. Scenarios
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS scenarios (
        id TEXT PRIMARY KEY,
        simulation_run_id TEXT NOT NULL,
        name TEXT NOT NULL,
        scenario_type TEXT NOT NULL,
        yield_quintal_acre REAL NOT NULL,
        water_saved_pct REAL NOT NULL,
        profit_change_pct REAL NOT NULL,
        summary TEXT,
        details TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (simulation_run_id) REFERENCES simulation_runs(id)
    )
    """)
    
    conn.commit()
    conn.close()

@contextmanager
def get_db() -> Generator[sqlite3.Connection, None, None]:
    conn = get_db_connection()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()
