from flask import Flask, render_template, jsonify
from apscheduler.schedulers.background import BackgroundScheduler
from scraper import scrape_nfl_data
from database import init_db, get_playoff_probabilities, get_all_playoff_probabilities
from datetime import datetime, timezone
import io
import sys

app = Flask(__name__)

# Initialize database
init_db()

# Set up scheduler
scheduler = BackgroundScheduler()
scheduler.add_job(func=scrape_nfl_data, trigger="interval", hours=2)
scheduler.start()

# Perform initial scraping
scrape_nfl_data()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/probabilities')
def get_probabilities():
    probabilities = get_playoff_probabilities()
    last_updated = datetime.now(timezone.utc).isoformat()
    return jsonify({
        "probabilities": probabilities,
        "last_updated": last_updated
    })

@app.route('/api/all_data')
def get_all_data():
    all_data = get_all_playoff_probabilities()
    return jsonify(all_data)

@app.route('/api/run_scraper')
def run_scraper():
    # Redirect stdout to capture print statements
    old_stdout = sys.stdout
    sys.stdout = output = io.StringIO()

    # Run the scraper
    scrape_nfl_data()

    # Get the captured output
    scraper_output = output.getvalue()

    # Restore stdout
    sys.stdout = old_stdout

    return jsonify({"scraper_output": scraper_output})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
