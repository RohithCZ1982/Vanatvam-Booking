"""
Migration script to add image_url column to cottages table.
Run this script once to update the database schema.
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from database import engine
from sqlalchemy import text

def migrate():
    with engine.connect() as conn:
        # Check if column already exists
        result = conn.execute(text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'cottages' AND column_name = 'image_url'
        """))
        
        if result.fetchone() is None:
            conn.execute(text("""
                ALTER TABLE cottages ADD COLUMN image_url VARCHAR NULL
            """))
            conn.commit()
            print("✅ Successfully added 'image_url' column to 'cottages' table.")
        else:
            print("ℹ️  Column 'image_url' already exists in 'cottages' table. No changes needed.")

if __name__ == "__main__":
    migrate()
