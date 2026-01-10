"""
Script to add email configuration tables to existing database
Run this once to create the email_config and email_templates tables
"""
from sqlalchemy import text
from database import engine

def add_email_tables():
    """Create email configuration tables if they don't exist"""
    with engine.begin() as conn:
        try:
            # Create email_config table
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS email_config (
                    id SERIAL PRIMARY KEY,
                    smtp_server VARCHAR NOT NULL DEFAULT 'smtp.gmail.com',
                    smtp_port INTEGER NOT NULL DEFAULT 587,
                    smtp_username VARCHAR,
                    smtp_password VARCHAR,
                    from_email VARCHAR,
                    frontend_url VARCHAR NOT NULL DEFAULT 'http://localhost:3000',
                    enabled BOOLEAN DEFAULT TRUE,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP WITH TIME ZONE
                );
            """))
            print("✓ email_config table created/verified")
            
            # Create email_templates table
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS email_templates (
                    id SERIAL PRIMARY KEY,
                    template_type VARCHAR UNIQUE NOT NULL,
                    subject VARCHAR NOT NULL,
                    html_body TEXT NOT NULL,
                    text_body TEXT,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP WITH TIME ZONE
                );
            """))
            print("✓ email_templates table created/verified")
            
            print("\n✅ Email configuration tables created successfully!")
            
        except Exception as e:
            print(f"❌ Error creating tables: {e}")
            raise

if __name__ == "__main__":
    print("Creating email configuration tables...")
    print("=" * 50)
    add_email_tables()

