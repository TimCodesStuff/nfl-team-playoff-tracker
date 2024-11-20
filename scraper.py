import requests
from bs4 import BeautifulSoup
from database import insert_playoff_probabilities, get_most_recent_team_data
import logging
import psycopg2
import os
from datetime import datetime, timezone

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# Database connection parameters
db_params = {
    'host': os.environ['PGHOST'],
    'database': os.environ['PGDATABASE'],
    'user': os.environ['PGUSER'],
    'password': os.environ['PGPASSWORD'],
    'port': os.environ['PGPORT']
}

def clear_database():
    conn = psycopg2.connect(**db_params)
    cur = conn.cursor()
    try:
        cur.execute("DELETE FROM playoff_probabilities")
        conn.commit()
        print("Database cleared successfully.")
    except Exception as e:
        print(f"An error occurred while clearing the database: {str(e)}")
    finally:
        cur.close()
        conn.close()

def scrape_nfl_data():
    url = "https://www.playoffstatus.com/nfl/nflpostseasonprob.html"

    try:
        response = requests.get(url)
        response.raise_for_status()
        soup = BeautifulSoup(response.text, 'html.parser')

        # Find the table
        table = soup.find('table')
        if not table:
            print("Table not found. The website structure might have changed.")
            return

        # Extract data from the table
        rows = table.find_all('tr')
        team_count = 0
        for row in rows[2:]:  # Skip header rows
            cells = row.find_all('td')
            if len(cells) >= 10:  # Ensure we have enough cells
                team_name = cells[0].text.strip()
                # Fix the team name for 49ers
                if team_name == "49'ers":
                    team_name = "49ers"
                # Extract probabilities from the correct columns
                try:
                    def clean_probability(text):
                        # Remove '>' symbol and '%' symbol, then convert to float and divide by 100
                        cleaned_text = text.replace('>', '').strip('%')
                        return float(cleaned_text) / 100 if cleaned_text else 0

                    make_playoffs = clean_probability(cells[5].text)
                    win_division = clean_probability(cells[6].text)
                    first_round_bye = clean_probability(cells[7].text)
                    win_conference = clean_probability(cells[8].text)
                    win_super_bowl = clean_probability(cells[9].text)
                except ValueError as e:
                    print(f"Error parsing probabilities for {team_name}: {str(e)}")
                    continue

                # Verify probabilities are within expected range
                if not all(0 <= prob <= 1 for prob in [make_playoffs, win_division, first_round_bye, win_conference, win_super_bowl]):
                    print(f"Unexpected probability values for {team_name}")

                # Get the most recent data for this team
                most_recent_data = get_most_recent_team_data(team_name)

                # Compare new data with most recent data
                if most_recent_data is None or data_has_changed(most_recent_data, make_playoffs, win_division, first_round_bye, win_conference, win_super_bowl):
                    print(f"Inserting new data for {team_name}")
                    insert_playoff_probabilities(team_name, make_playoffs, win_division, first_round_bye, win_conference, win_super_bowl)
                    team_count += 1
                else:
                    print(f"No changes in data for {team_name}")

        print(f"Scraping completed successfully. Total teams with updated data: {team_count}")
        if team_count == 0:
            print("No changes in data for any team.")
        elif team_count != 32:
            print(f"Expected 32 teams, but updated {team_count} teams.")
    except requests.RequestException as e:
        print(f"An error occurred while fetching the webpage: {str(e)}")
    except Exception as e:
        print(f"An unexpected error occurred while scraping: {str(e)}")

def data_has_changed(old_data, make_playoffs, win_division, first_round_bye, win_conference, win_super_bowl):
    return (
        abs(old_data['make_playoffs'] - make_playoffs) > 1e-6 or
        abs(old_data['win_division'] - win_division) > 1e-6 or
        abs(old_data['first_round_bye'] - first_round_bye) > 1e-6 or
        abs(old_data['win_conference'] - win_conference) > 1e-6 or
        abs(old_data['win_super_bowl'] - win_super_bowl) > 1e-6
    )

if __name__ == "__main__":
    scrape_nfl_data()
