import psycopg2
from psycopg2 import sql
import os
from datetime import datetime, timezone

# Database connection parameters
db_params = {
    'host': os.environ['PGHOST'],
    'database': os.environ['PGDATABASE'],
    'user': os.environ['PGUSER'],
    'password': os.environ['PGPASSWORD'],
    'port': os.environ['PGPORT']
}

def init_db():
    conn = psycopg2.connect(**db_params)
    cur = conn.cursor()

    try:
        cur.execute("""
            CREATE TABLE IF NOT EXISTS playoff_probabilities (
                id SERIAL PRIMARY KEY,
                team_name VARCHAR(100) NOT NULL,
                make_playoffs FLOAT NOT NULL,
                win_division FLOAT NOT NULL,
                first_round_bye FLOAT NOT NULL,
                win_conference FLOAT NOT NULL,
                win_super_bowl FLOAT NOT NULL,
                timestamp TIMESTAMP NOT NULL
            )
        """)
        conn.commit()
        print("Database initialized successfully.")
    except Exception as e:
        print(f"An error occurred while initializing the database: {str(e)}")
    finally:
        cur.close()
        conn.close()

def insert_playoff_probabilities(team_name, make_playoffs, win_division, first_round_bye, win_conference, win_super_bowl):
    conn = psycopg2.connect(**db_params)
    cur = conn.cursor()

    try:
        cur.execute("""
            INSERT INTO playoff_probabilities 
            (team_name, make_playoffs, win_division, first_round_bye, win_conference, win_super_bowl, timestamp)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
        """, (team_name, make_playoffs, win_division, first_round_bye, win_conference, win_super_bowl, datetime.now(timezone.utc)))
        conn.commit()
    except Exception as e:
        print(f"An error occurred while inserting data: {str(e)}")
    finally:
        cur.close()
        conn.close()

def get_most_recent_team_data(team_name):
    conn = psycopg2.connect(**db_params)
    cur = conn.cursor()

    try:
        cur.execute("""
            SELECT make_playoffs, win_division, first_round_bye, win_conference, win_super_bowl
            FROM playoff_probabilities
            WHERE team_name = %s
            ORDER BY timestamp DESC
            LIMIT 1
        """, (team_name,))
        result = cur.fetchone()
        if result:
            return {
                'make_playoffs': result[0],
                'win_division': result[1],
                'first_round_bye': result[2],
                'win_conference': result[3],
                'win_super_bowl': result[4]
            }
        return None
    except Exception as e:
        print(f"An error occurred while fetching most recent team data: {str(e)}")
        return None
    finally:
        cur.close()
        conn.close()

def get_playoff_probabilities():
    conn = psycopg2.connect(**db_params)
    cur = conn.cursor()

    try:
        cur.execute("""
            SELECT team_name, make_playoffs, win_division, first_round_bye, win_conference, win_super_bowl, timestamp
            FROM playoff_probabilities
            ORDER BY team_name, timestamp
        """)
        rows = cur.fetchall()

        probabilities = {}
        for row in rows:
            team_name, make_playoffs, win_division, first_round_bye, win_conference, win_super_bowl, timestamp = row
            if team_name not in probabilities:
                probabilities[team_name] = {
                    'make_playoffs': [],
                    'win_division': [],
                    'first_round_bye': [],
                    'win_conference': [],
                    'win_super_bowl': []
                }

            probabilities[team_name]['make_playoffs'].append({'x': timestamp.replace(tzinfo=timezone.utc).isoformat(), 'y': make_playoffs})
            probabilities[team_name]['win_division'].append({'x': timestamp.replace(tzinfo=timezone.utc).isoformat(), 'y': win_division})
            probabilities[team_name]['first_round_bye'].append({'x': timestamp.replace(tzinfo=timezone.utc).isoformat(), 'y': first_round_bye})
            probabilities[team_name]['win_conference'].append({'x': timestamp.replace(tzinfo=timezone.utc).isoformat(), 'y': win_conference})
            probabilities[team_name]['win_super_bowl'].append({'x': timestamp.replace(tzinfo=timezone.utc).isoformat(), 'y': win_super_bowl})

        return probabilities
    except Exception as e:
        print(f"An error occurred while fetching data: {str(e)}")
        return {}
    finally:
        cur.close()
        conn.close()

def get_all_playoff_probabilities():
    conn = psycopg2.connect(**db_params)
    cur = conn.cursor()

    try:
        cur.execute('''
            SELECT team_name, make_playoffs, win_division, first_round_bye, win_conference, win_super_bowl, timestamp
            FROM playoff_probabilities
            ORDER BY team_name, timestamp
        ''')
        rows = cur.fetchall()

        all_data = []
        for row in rows:
            team_name, make_playoffs, win_division, first_round_bye, win_conference, win_super_bowl, timestamp = row
            all_data.append({
                'team_name': team_name,
                'make_playoffs': make_playoffs,
                'win_division': win_division,
                'first_round_bye': first_round_bye,
                'win_conference': win_conference,
                'win_super_bowl': win_super_bowl,
                'timestamp': timestamp.replace(tzinfo=timezone.utc).isoformat()
            })

        return all_data
    except Exception as e:
        print(f"An error occurred while fetching all data: {str(e)}")
        return []
    finally:
        cur.close()
        conn.close()
