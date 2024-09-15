from flask import Flask, render_template, jsonify, request
from apscheduler.schedulers.background import BackgroundScheduler
from scraper import scrape_nfl_data
from database import init_db, get_playoff_probabilities, get_all_playoff_probabilities, bulk_insert_playoff_probabilities
from datetime import datetime, timezone
import io
import sys
import json
import logging

app = Flask(__name__)

# Set up logging
logging.basicConfig(level=logging.DEBUG, format='%(asctime)s - %(levelname)s - %(message)s')

# Set the maximum content length to 10MB (10 * 1024 * 1024 bytes)
app.config['MAX_CONTENT_LENGTH'] = 10 * 1024 * 1024

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

@app.route('/api/database_dump')
def database_dump():
    all_data = get_all_playoff_probabilities()
    return jsonify({
        "data": all_data,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "total_records": len(all_data)
    })

@app.route('/api/upload', methods=['POST'])
def upload_data():
    logging.info('Received request to /api/upload')
    logging.info(f'Request method: {request.method}')
    logging.info(f'Request content type: {request.content_type}')

    if not request.is_json:
        logging.error('Request is not JSON')
        return jsonify({"error": "Request must be JSON"}), 400
    
    try:
        logging.info('Parsing JSON data')
        data = request.get_json()
        logging.info(f'Received {len(data)} records')
    except Exception as e:
        logging.error(f'Error parsing JSON data: {str(e)}')
        return jsonify({"error": f"Failed to parse JSON data: {str(e)}"}), 400
    
    if not isinstance(data, list):
        logging.error('JSON data is not a list of objects')
        return jsonify({"error": "JSON data must be a list of objects"}), 400
    
    try:
        inserted_count = bulk_insert_playoff_probabilities(data)
        logging.info(f'Inserted {inserted_count} records')
        return jsonify({"message": f"Successfully inserted {inserted_count} records"}), 201
    except Exception as e:
        logging.error(f'Error occurred during bulk insert: {str(e)}')
        return jsonify({"error": str(e)}), 500

@app.errorhandler(413)
def request_entity_too_large(error):
    logging.error('Request entity too large')
    return jsonify({"error": "The uploaded file is too large. Maximum size is 10MB."}), 413

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
