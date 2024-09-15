import json
from database import db_params, init_db
import psycopg2
from datetime import datetime, timezone

def regenerate_db_from_json(json_file_path):
    with open(json_file_path, 'r') as file:
        data = json.load(file)

    init_db()  # Ensure the table exists

    conn = psycopg2.connect(**db_params)
    cur = conn.cursor()

    try:
        for entry in data:
            cur.execute('''
                INSERT INTO playoff_probabilities 
                (team_name, make_playoffs, win_division, first_round_bye, win_conference, win_super_bowl, timestamp)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
            ''', (
                entry['team_name'],
                entry['make_playoffs'],
                entry['win_division'],
                entry['first_round_bye'],
                entry['win_conference'],
                entry['win_super_bowl'],
                datetime.fromisoformat(entry['timestamp'])
            ))
        conn.commit()
        print("Database regenerated successfully.")
    except Exception as e:
        print(f"An error occurred while regenerating the database: {str(e)}")
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    json_file_path = "backup.json"  # Replace with the actual path to your JSON backup file
    regenerate_db_from_json(json_file_path)