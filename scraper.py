import requests
from bs4 import BeautifulSoup
from database import insert_playoff_probabilities
import logging
import psycopg2
import os

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
            logging.error("Table not found. The website structure might have changed.")
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
                    make_playoffs = float(cells[5].text.strip('%')) / 100 if '%' in cells[5].text else 0
                    win_division = float(cells[6].text.strip('%')) / 100 if '%' in cells[6].text else 0
                    first_round_bye = float(cells[7].text.strip('%')) / 100 if '%' in cells[7].text else 0
                    win_conference = float(cells[8].text.strip('%')) / 100 if '%' in cells[8].text else 0
                    win_super_bowl = float(cells[9].text.strip('%')) / 100 if '%' in cells[9].text else 0
                except ValueError as e:
                    logging.warning(f"Error parsing probabilities for {team_name}: {str(e)}")
                    continue

                # Verify probabilities are within expected range
                if not all(0 <= prob <= 1 for prob in [make_playoffs, win_division, first_round_bye, win_conference, win_super_bowl]):
                    logging.warning(f"Unexpected probability values for {team_name}")

                logging.info(f"Team: {team_name}")
                logging.info(f"Make Playoffs: {make_playoffs:.2f}")
                logging.info(f"Win Division: {win_division:.2f}")
                logging.info(f"First Round Bye: {first_round_bye:.2f}")
                logging.info(f"Win Conference: {win_conference:.2f}")
                logging.info(f"Win Super Bowl: {win_super_bowl:.2f}")
                logging.info("---")

                insert_playoff_probabilities(team_name, make_playoffs, win_division, first_round_bye, win_conference, win_super_bowl)
                team_count += 1

        logging.info(f"Scraping completed successfully. Total teams scraped: {team_count}")
        if team_count != 32:
            logging.warning(f"Expected 32 teams, but scraped {team_count} teams.")
    except requests.RequestException as e:
        logging.error(f"An error occurred while fetching the webpage: {str(e)}")
    except Exception as e:
        logging.error(f"An unexpected error occurred while scraping: {str(e)}")

if __name__ == "__main__":
    #clear_database()
    scrape_nfl_data()
