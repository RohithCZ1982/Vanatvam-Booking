"""
Fix quota inconsistencies caused by old adjust-quota code that only changed
balance but not the allotted quota. Reads the manual_adjustment transactions
and reapplies them to weekday_quota / weekend_quota where they were missed.
"""
import os
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/vanatvam")
engine = create_engine(DATABASE_URL)
Session = sessionmaker(bind=engine)
db = Session()

# Sum all manual adjustments per user
rows = db.execute(text("""
    SELECT user_id,
           SUM(weekday_change) AS total_weekday,
           SUM(weekend_change) AS total_weekend
    FROM quota_transactions
    WHERE transaction_type = 'manual_adjustment'
    GROUP BY user_id
""")).fetchall()

for row in rows:
    user_id, total_wd, total_we = row.user_id, row.total_weekday, row.total_weekend

    # Get the user's current quotas and the activation quota (what they started with)
    activation = db.execute(text("""
        SELECT SUM(weekday_change), SUM(weekend_change)
        FROM quota_transactions
        WHERE user_id = :uid AND transaction_type = 'activation'
    """), {"uid": user_id}).fetchone()

    if not activation or activation[0] is None:
        continue

    base_wd = activation[0]   # original allotted weekday
    base_we = activation[1]   # original allotted weekend

    expected_wd_quota = max(0, base_wd + total_wd)
    expected_we_quota = max(0, base_we + total_we)

    user = db.execute(text("SELECT id, name, weekday_quota, weekend_quota FROM users WHERE id = :uid"),
                      {"uid": user_id}).fetchone()
    if not user:
        continue

    if user.weekday_quota != expected_wd_quota or user.weekend_quota != expected_we_quota:
        print(f"Fixing {user.name} (id={user.id}):")
        print(f"  weekday_quota:  {user.weekday_quota} -> {expected_wd_quota}")
        print(f"  weekend_quota:  {user.weekend_quota} -> {expected_we_quota}")
        db.execute(text("""
            UPDATE users
            SET weekday_quota = :wdq, weekend_quota = :weq
            WHERE id = :uid
        """), {"wdq": expected_wd_quota, "weq": expected_we_quota, "uid": user_id})
    else:
        print(f"OK {user.name} (id={user.id}) - no fix needed")

db.commit()
db.close()
print("Done.")
