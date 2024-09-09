from flask import Flask, request, jsonify, send_from_directory
import pandas as pd
import os
from datetime import datetime
import logging
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

DATA_DIR = './data'
ANNOTATED_DIR = './annotated'
CSV_FILE = 'questions.csv'
current_file = CSV_FILE
changed_rows = set()

# Set up logging
logging.basicConfig(level=logging.INFO)

# Function to safely convert a value to string
def safe_str(value):
    if pd.isna(value):
        return ''
    return str(value)

# Function to load CSV data
def load_csv(file_path):
    try:
        df = pd.read_csv(file_path)
        if 'invalid_label' not in df.columns:
            df['invalid_label'] = 0
        if 'not_specified' not in df.columns:
            df['not_specified'] = 0
        if 'Reviewed' not in df.columns:
            df['Reviewed'] = 0
        if 'edited' not in df.columns:
            df['edited'] = 0
        return df
    except Exception as e:
        app.logger.error(f"Error loading CSV: {e}")
        return pd.DataFrame()

# Load CSV data if exists
data_path = os.path.join(DATA_DIR, CSV_FILE)
if os.path.exists(data_path):
    df = load_csv(data_path)
else:
    df = pd.DataFrame()

def save_to_annotated():
    global df, changed_rows
    if changed_rows:
        try:
            annotated_path = os.path.join(ANNOTATED_DIR, f"{os.path.splitext(current_file)[0]}_annotated.csv")
            df.to_csv(annotated_path, index=False)
            changed_rows.clear()
            reviewed_count = int(df['Reviewed'].sum())
            app.logger.info(f"Changes saved to {annotated_path} with {reviewed_count} notes reviewed")
            return reviewed_count
        except Exception as e:
            app.logger.error(f"Error saving annotated CSV: {e}")
            return 0

@app.route('/api/note/<int:row_id>', methods=['GET'])
def get_note(row_id):
    try:
        if 0 <= row_id < len(df):
            note = df.iloc[row_id].to_dict()
            note = {k: safe_str(v) for k, v in note.items()}
            note['row_id'] = row_id
            note['total_rows'] = len(df)
            df.at[row_id, 'Reviewed'] = 1
            app.logger.error(f"not specified: {note['not_specified']}")
            return jsonify(note)
        else:
            return jsonify({'error': 'Row ID out of range'}), 404
    except Exception as e:
        app.logger.error(f"Error getting note: {e}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/note/<int:row_id>', methods=['POST'])
def update_note(row_id):
    global df, changed_rows
    try:
        if 0 <= row_id < len(df):
            data = request.json
            for key in data:
                if df.at[row_id, key] != data[key]:
                    df.at[row_id, 'edited'] = 1
                df.at[row_id, key] = data[key] if data[key] != '' else None
            df.at[row_id, 'Reviewed'] = 1
            changed_rows.add(row_id)
            reviewed_count = save_to_annotated()
            return jsonify({'status': 'success', 'reviewed_count': reviewed_count})
        else:
            return jsonify({'error': 'Row ID out of range'}), 404
    except Exception as e:
        app.logger.error(f"Error updating note: {e}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/file', methods=['POST'])
def change_file():
    global df, current_file, changed_rows
    try:
        file = request.files['file']
        if file:
            current_file = file.filename
            data_path = os.path.join(DATA_DIR, current_file)
            file.save(data_path)
            df = load_csv(data_path)
            changed_rows.clear()
            app.logger.info(f"File changed to {current_file}")
            return jsonify({'status': 'success', 'total_rows': len(df)})
        else:
            return jsonify({'error': 'No file uploaded'}), 400
    except Exception as e:
        app.logger.error(f"Error changing file: {e}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/')
def index():
    try:
        return send_from_directory('static', 'index.html')
    except Exception as e:
        app.logger.error(f"Error serving index.html: {e}")
        return "Internal server error", 500

if __name__ == '__main__':
    try:
        if not os.path.exists(ANNOTATED_DIR):
            os.makedirs(ANNOTATED_DIR)
        app.run(debug=True, host='0.0.0.0', port=5000)
    except Exception as e:
        app.logger.error(f"Error starting Flask app: {e}")
