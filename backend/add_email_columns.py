"""
Script to add email verification columns to existing database
Run this once to add the new columns to the users table

Usage:
    cd backend
    python add_email_columns.py
"""
from sqlalchemy import text
from database import engine

def add_email_columns():
    """Add email verification columns if they don't exist"""
    with engine.begin() as conn:  # Use begin() for automatic transaction management
        try:
            # Check if columns exist and add them if they don't
            conn.execute(text("""
                DO $$ 
                BEGIN
                    -- Add email_verified column if it doesn't exist
                    IF NOT EXISTS (
                        SELECT 1 FROM information_schema.columns 
                        WHERE table_name='users' AND column_name='email_verified'
                    ) THEN
                        ALTER TABLE users ADD COLUMN email_verified BOOLEAN DEFAULT FALSE;
                        -- Update existing rows to have email_verified = FALSE
                        UPDATE users SET email_verified = FALSE WHERE email_verified IS NULL;
                        -- Now make it NOT NULL
                        ALTER TABLE users ALTER COLUMN email_verified SET NOT NULL;
                        ALTER TABLE users ALTER COLUMN email_verified SET DEFAULT FALSE;
                    END IF;
                    
                    -- Add verification_token column if it doesn't exist
                    IF NOT EXISTS (
                        SELECT 1 FROM information_schema.columns 
                        WHERE table_name='users' AND column_name='verification_token'
                    ) THEN
                        ALTER TABLE users ADD COLUMN verification_token VARCHAR;
                    END IF;
                    
                    -- Add verification_token_expires column if it doesn't exist
                    IF NOT EXISTS (
                        SELECT 1 FROM information_schema.columns 
                        WHERE table_name='users' AND column_name='verification_token_expires'
                    ) THEN
                        ALTER TABLE users ADD COLUMN verification_token_expires TIMESTAMP WITH TIME ZONE;
                    END IF;
                END $$;
            """))
            print("✓ Email verification columns checked/added successfully")
            
            # Set email_verified=True for existing admin users
            # Note: role is an enum, so we need to cast it properly
            result = conn.execute(text("""
                UPDATE users 
                SET email_verified = TRUE 
                WHERE role::text = 'admin' AND email_verified = FALSE
            """))
            print(f"✓ Updated {result.rowcount} admin user(s) with email_verified=True")
            
            print("\n✅ Migration completed successfully!")
            print("You can now restart your backend server and admin login should work.")
            
        except Exception as e:
            print(f"❌ Error adding columns: {e}")
            print("\nTroubleshooting:")
            print("1. Make sure your database is running")
            print("2. Check your DATABASE_URL in .env file")
            print("3. Ensure you have proper database permissions")
            raise

if __name__ == "__main__":
    print("Running email verification columns migration...")
    print("=" * 50)
    add_email_columns()

