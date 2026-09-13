"""
=============================================================================
SMART ATTENDANCE TRACKER - DATABASE MODULE (database.py)
=============================================================================
This file handles all database operations using Python's built-in SQLite3.

Key Concepts for 1st-Year BTech Students:
1. SQLite: A self-contained, serverless database engine that stores all
   data inside a single file ('attendance.db'). No separate database server
   (like MySQL or PostgreSQL) needs to be installed or run.
2. Connection: The bridge between our Python program and the database file.
3. Cursor: A pointer used to execute SQL statements and retrieve query results.
4. Row Factory: Tells SQLite to return rows that behave like Python dictionaries,
   so we can access columns by name (e.g., row['date']) instead of numbers (row[1]).
=============================================================================
"""

import sqlite3
import os

# Define the database filename. It will be created in the current working directory.
DB_NAME = "attendance.db"


def get_db_connection():
    """
    Establishes and returns a connection to the SQLite database.
    Sets row_factory to sqlite3.Row so query results can be accessed by column name.
    """
    # Connect to the SQLite database file
    conn = sqlite3.connect(DB_NAME)

    # By default, sqlite3 returns tuples: (1, '2026-09-12', 4, 3)
    # Using sqlite3.Row allows accessing by name: row['date'], row['conducted'], etc.
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    """
    Initializes the database schema if it doesn't already exist.
    Creates the 'attendance' table to store daily attendance logs.
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    # SQL query to create the table if it does not already exist
    # AUTOINCREMENT: SQLite automatically assigns 1, 2, 3... to each new entry.
    create_table_query = """
    CREATE TABLE IF NOT EXISTS attendance (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL,
        conducted INTEGER NOT NULL,
        attended INTEGER NOT NULL,
        is_holiday INTEGER DEFAULT 0,
        holiday_reason TEXT DEFAULT '',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """
    cursor.execute(create_table_query)

    # Migration: Check if 'is_holiday' column exists in case database already exists
    cursor.execute("PRAGMA table_info(attendance)")
    columns = [col[1] for col in cursor.fetchall()]
    if "is_holiday" not in columns:
        cursor.execute("ALTER TABLE attendance ADD COLUMN is_holiday INTEGER DEFAULT 0")
    if "holiday_reason" not in columns:
        cursor.execute("ALTER TABLE attendance ADD COLUMN holiday_reason TEXT DEFAULT ''")

    # SQL query to create the 'student_profile' table (includes photo_path column)
    create_profile_table_query = """
    CREATE TABLE IF NOT EXISTS student_profile (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL DEFAULT 'Rahul Sharma',
        roll_no TEXT DEFAULT '24BCE1001',
        course TEXT DEFAULT 'B.Tech',
        branch TEXT DEFAULT 'Computer Science & Engineering',
        semester TEXT DEFAULT '1st Semester',
        college TEXT DEFAULT 'Indian Institute of Technology',
        photo_path TEXT DEFAULT '',
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """
    cursor.execute(create_profile_table_query)

    # Migration: add photo_path column if it doesn't exist (for existing databases)
    cursor.execute("PRAGMA table_info(student_profile)")
    profile_cols = [col[1] for col in cursor.fetchall()]
    if "photo_path" not in profile_cols:
        cursor.execute("ALTER TABLE student_profile ADD COLUMN photo_path TEXT DEFAULT ''")

    # Check if a profile already exists; if not, insert the default student profile
    cursor.execute("SELECT COUNT(*) FROM student_profile WHERE id = 1")
    if cursor.fetchone()[0] == 0:
        cursor.execute("""
            INSERT INTO student_profile (id, name, roll_no, course, branch, semester, college, photo_path)
            VALUES (1, 'Rahul Sharma', '24BCE1001', 'B.Tech', 'Computer Science & Engineering', '1st Semester', 'Engineering College', '')
        """)

    # Commit the changes to save them permanently to the file
    conn.commit()

    # Always close the connection when done to release file locks
    conn.close()
    print(" Database initialized successfully: 'attendance' and 'student_profile' tables are ready.")


# Allow running this file directly to initialize or test the database
if __name__ == "__main__":
    init_db()
