"""
=============================================================================
SMART ATTENDANCE TRACKER - MAIN FLASK BACKEND (app.py)
=============================================================================
This file is the brain of our web application. It runs a Python Flask web
server that handles HTTP requests, serves the HTML page, communicates with
the SQLite database, and provides REST API endpoints.

Key Concepts for 1st-Year BTech Students:
1. Flask: A lightweight Python web framework that routes incoming web URLs
   (routes) to specific Python functions.
2. REST API: An architectural style where frontend JavaScript uses HTTP methods
   (GET, POST, PUT, DELETE) to fetch, create, update, or remove data without
   reloading the whole webpage.
3. JSON (JavaScript Object Notation): A universal text format for exchanging
   data between Python (dictionaries/lists) and JavaScript (objects/arrays).
4. Attendance Math:
   - Overall % = (Total Attended / Total Conducted) * 100
   - If % < 75%: Consecutive classes needed = 3 * Conducted - 4 * Attended
   - If % >= 75%: Safe bunks allowed = floor((4 * Attended - 3 * Conducted) / 3)
=============================================================================
"""

import math
import os
from datetime import datetime
from flask import Flask, render_template, request, jsonify, send_from_directory
from werkzeug.utils import secure_filename
from database import get_db_connection, init_db

# Initialize the Flask application
app = Flask(__name__, template_folder="templates", static_folder="static")

# ---- Photo Upload Config ----
UPLOAD_FOLDER = os.path.join(os.path.dirname(__file__), "static", "uploads")
ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "gif", "webp"}
MAX_PHOTO_SIZE_MB = 5  # max 5 MB
app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER
app.config["MAX_CONTENT_LENGTH"] = MAX_PHOTO_SIZE_MB * 1024 * 1024
os.makedirs(UPLOAD_FOLDER, exist_ok=True)


def allowed_file(filename):
    """Return True if the uploaded file has an allowed image extension."""
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


# Ensure the SQLite database table exists whenever the server starts
init_db()


def validate_attendance_input(data):
    """Validate JSON received from the add and edit attendance forms.

    Supports both regular class days and official holidays / college-off days.
    """
    if not data:
        return None, "No data provided."

    date = str(data.get("date", "")).strip()
    if not date:
        return None, "Date is required."

    # An HTML date input sends YYYY-MM-DD, but APIs must validate it too.
    try:
        datetime.strptime(date, "%Y-%m-%d")
    except ValueError:
        return None, "Date must use the YYYY-MM-DD format."

    is_holiday = 1 if data.get("is_holiday") in (True, 1, "1", "true") else 0
    holiday_reason = str(data.get("holiday_reason", "")).strip()

    if is_holiday:
        # On a college holiday or Sunday off, 0 classes were held
        conducted = 0
        attended = 0
        return (date, conducted, attended, 1, holiday_reason or "College Holiday"), None

    try:
        conducted = int(data.get("conducted"))
        attended = int(data.get("attended"))
    except (ValueError, TypeError):
        return None, "Classes conducted and attended must be valid integers."

    if conducted <= 0:
        return None, "Classes conducted must be greater than 0."
    if attended < 0:
        return None, "Classes attended cannot be negative."
    if attended > conducted:
        return None, "Classes attended cannot be greater than classes conducted."

    return (date, conducted, attended, 0, ""), None


# ---------------------------------------------------------------------------
# ROUTE 1: HOME PAGE
# ---------------------------------------------------------------------------
@app.route("/")
def index():
    """
    Renders and serves the main single-page application dashboard.
    When a student visits http://127.0.0.1:5000/ in their browser, this runs.
    """
    return render_template("index.html")


# ---------------------------------------------------------------------------
# ROUTE 2: GET ALL ATTENDANCE RECORDS (READ)
# ---------------------------------------------------------------------------
@app.route("/api/records", methods=["GET"])
def get_records():
    """
    Returns all attendance records from SQLite in reverse chronological order
    (newest dates first).
    HTTP Method: GET
    Response: JSON list of records
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    # Query all rows, ordered by date descending, then id descending
    cursor.execute("SELECT * FROM attendance ORDER BY date DESC, id DESC")
    rows = cursor.fetchall()
    conn.close()

    records = []
    for row in rows:
        conducted = row["conducted"]
        attended = row["attended"]
        is_holiday = bool(row["is_holiday"]) if "is_holiday" in row.keys() else False
        holiday_reason = (row["holiday_reason"] or "") if "holiday_reason" in row.keys() else ""
        daily_percentage = (
            round((attended / conducted) * 100, 1) if conducted > 0 else 0.0
        )

        records.append(
            {
                "id": row["id"],
                "date": row["date"],
                "conducted": conducted,
                "attended": attended,
                "is_holiday": is_holiday,
                "holiday_reason": holiday_reason,
                "percentage": daily_percentage,
                "created_at": row["created_at"],
            }
        )

    return jsonify({"success": True, "records": records}), 200


# ---------------------------------------------------------------------------
# ROUTE 3: ADD NEW ATTENDANCE RECORD (CREATE)
# ---------------------------------------------------------------------------
@app.route("/api/records", methods=["POST"])
def add_record():
    """
    Adds a new daily attendance log to the database.
    HTTP Method: POST
    Expects JSON body: { "date": "YYYY-MM-DD", "conducted": 4, "attended": 3, "is_holiday": false }
    """
    attendance, error = validate_attendance_input(request.get_json())
    if error:
        return jsonify({"success": False, "error": error}), 400
    date, conducted, attended, is_holiday, holiday_reason = attendance

    # Save to SQLite database using parameterized query (prevents SQL Injection!)
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO attendance (date, conducted, attended, is_holiday, holiday_reason) VALUES (?, ?, ?, ?, ?)",
        (date, conducted, attended, is_holiday, holiday_reason),
    )
    conn.commit()
    new_id = cursor.lastrowid
    conn.close()

    success_msg = "Holiday logged successfully!" if is_holiday else "Attendance record added successfully!"
    return jsonify(
        {
            "success": True,
            "message": success_msg,
            "id": new_id,
        }
    ), 201


# ---------------------------------------------------------------------------
# ROUTE 4: UPDATE AN ATTENDANCE RECORD (UPDATE)
# ---------------------------------------------------------------------------
@app.route("/api/records/<int:record_id>", methods=["PUT"])
def update_record(record_id):
    """
    Updates an existing attendance entry by ID.
    HTTP Method: PUT
    Expects JSON body: { "date": "YYYY-MM-DD", "conducted": 4, "attended": 3, "is_holiday": false }
    """
    attendance, error = validate_attendance_input(request.get_json())
    if error:
        return jsonify({"success": False, "error": error}), 400
    date, conducted, attended, is_holiday, holiday_reason = attendance

    conn = get_db_connection()
    cursor = conn.cursor()

    # Check if record exists
    cursor.execute("SELECT id FROM attendance WHERE id = ?", (record_id,))
    if not cursor.fetchone():
        conn.close()
        return jsonify(
            {"success": False, "error": f"Record with ID {record_id} not found."}
        ), 404

    # Update the record
    cursor.execute(
        "UPDATE attendance SET date = ?, conducted = ?, attended = ?, is_holiday = ?, holiday_reason = ? WHERE id = ?",
        (date, conducted, attended, is_holiday, holiday_reason, record_id),
    )
    conn.commit()
    conn.close()

    return jsonify(
        {"success": True, "message": "Record updated successfully!"}
    ), 200


# ---------------------------------------------------------------------------
# ROUTE 5: DELETE AN ATTENDANCE RECORD (DELETE)
# ---------------------------------------------------------------------------
@app.route("/api/records/<int:record_id>", methods=["DELETE"])
def delete_record(record_id):
    """
    Deletes a specific attendance entry by ID.
    HTTP Method: DELETE
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    # Check if record exists
    cursor.execute("SELECT id FROM attendance WHERE id = ?", (record_id,))
    if not cursor.fetchone():
        conn.close()
        return jsonify(
            {"success": False, "error": f"Record with ID {record_id} not found."}
        ), 404

    cursor.execute("DELETE FROM attendance WHERE id = ?", (record_id,))
    conn.commit()
    conn.close()

    return jsonify(
        {"success": True, "message": "Record deleted successfully!"}
    ), 200


# ---------------------------------------------------------------------------
# ROUTE 6: ATTENDANCE DASHBOARD STATS & SMART PREDICTOR
# ---------------------------------------------------------------------------
@app.route("/api/stats", methods=["GET"])
def get_stats():
    """
    Calculates overall metrics from all saved records:
    - Total Conducted
    - Total Attended
    - Overall Percentage
    - Status (SAFE >= 75% or SHORTAGE < 75%)
    - Bonus Calculation:
      * If < 75%: How many consecutive classes to attend to reach 75%
      * If >= 75%: How many classes can be safely bunked without dropping below 75%
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    # Aggregate total classes conducted and attended across non-holiday rows
    cursor.execute(
        "SELECT SUM(conducted) AS total_conducted, SUM(attended) AS total_attended FROM attendance WHERE is_holiday = 0"
    )
    result = cursor.fetchone()

    # Count total official holidays logged
    cursor.execute("SELECT COUNT(*) AS total_holidays FROM attendance WHERE is_holiday = 1")
    holiday_res = cursor.fetchone()
    total_holidays = holiday_res["total_holidays"] or 0
    conn.close()

    total_conducted = result["total_conducted"] or 0
    total_attended = result["total_attended"] or 0

    # If no class records exist yet
    if total_conducted == 0:
        return jsonify(
            {
                "success": True,
                "total_conducted": 0,
                "total_attended": 0,
                "total_missed": 0,
                "total_holidays": total_holidays,
                "percentage": 0.0,
                "status": "NO_DATA",
                "status_label": "No Data Yet",
                "status_message": "No lecture records found. Enter your daily classes below to get started!",
                "classes_needed": 0,
                "safe_bunks": 0,
            }
        ), 200

    # Calculate current percentage
    percentage = round((total_attended / total_conducted) * 100, 2)
    total_missed = total_conducted - total_attended

    # TARGET ATTENDANCE THRESHOLD: 75%
    # Mathematical derivation:
    # C = total_conducted, A = total_attended
    #
    # CASE 1: ATTENDANCE IS BELOW 75% (percentage < 75)
    # We want to find future consecutive classes 'x' to attend such that:
    # (A + x) / (C + x) >= 0.75
    # A + x >= 0.75 * C + 0.75 * x
    # 0.25 * x >= 0.75 * C - A
    # x >= (0.75 * C - A) / 0.25
    # x >= 3 * C - 4 * A
    # Since x must be an integer and non-negative:
    # classes_needed = max(0, 3 * C - 4 * A)
    #
    # CASE 2: ATTENDANCE IS AT OR ABOVE 75% (percentage >= 75)
    # We want to find how many future classes 'y' can be skipped (missed) such that:
    # A / (C + y) >= 0.75
    # A >= 0.75 * C + 0.75 * y
    # 0.75 * y <= A - 0.75 * C
    # y <= (A - 0.75 * C) / 0.75 = (4 * A - 3 * C) / 3
    # safe_bunks = max(0, floor((4 * A - 3 * C) / 3))

    if percentage >= 75.0:
        status = "SAFE"
        status_label = "On Track (≥ 75%)"
        safe_bunks = max(0, math.floor((4 * total_attended - 3 * total_conducted) / 3))
        classes_needed = 0
        if safe_bunks > 0:
            status_message = (
                f"You are safe! You can bunk up to {safe_bunks} "
                f"{'class' if safe_bunks == 1 else 'classes'} and still stay above 75%."
            )
        else:
            status_message = (
                "You are at the border (exactly 75%). Attend your next class to stay safe!"
            )
    else:
        status = "SHORTAGE"
        status_label = "Attendance Shortage (< 75%)"
        classes_needed = max(0, (3 * total_conducted) - (4 * total_attended))
        safe_bunks = 0
        status_message = (
            f"Warning! You must attend the next {classes_needed} "
            f"{'class' if classes_needed == 1 else 'classes'} consecutively to reach 75%."
        )

    return jsonify(
        {
            "success": True,
            "total_conducted": total_conducted,
            "total_attended": total_attended,
            "total_missed": total_missed,
            "total_holidays": total_holidays,
            "percentage": percentage,
            "status": status,
            "status_label": status_label,
            "status_message": status_message,
            "classes_needed": classes_needed,
            "safe_bunks": safe_bunks,
        }
    ), 200


# ---------------------------------------------------------------------------
# ROUTE 7: GET STUDENT PROFILE (READ)
# ---------------------------------------------------------------------------
@app.route("/api/profile", methods=["GET"])
def get_profile():
    """
    Retrieves the current student profile information.
    HTTP Method: GET
    Response: JSON with name, roll_no, course, branch, semester, college
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM student_profile WHERE id = 1")
    row = cursor.fetchone()
    conn.close()

    if row:
        profile = {
            "id": row["id"],
            "name": row["name"],
            "roll_no": row["roll_no"],
            "course": row["course"],
            "branch": row["branch"],
            "semester": row["semester"],
            "college": row["college"],
            "photo_path": row["photo_path"] if "photo_path" in row.keys() else "",
        }
    else:
        profile = {
            "id": 1,
            "name": "Rahul Sharma",
            "roll_no": "24BCE1001",
            "course": "B.Tech",
            "branch": "Computer Science & Engineering",
            "semester": "1st Semester",
            "college": "Engineering College",
            "photo_path": "",
        }

    return jsonify({"success": True, "profile": profile}), 200


# ---------------------------------------------------------------------------
# ROUTE 8: UPDATE STUDENT PROFILE (UPDATE)
# ---------------------------------------------------------------------------
@app.route("/api/profile", methods=["PUT"])
def update_profile():
    """
    Updates the student profile details.
    HTTP Method: PUT
    Expects JSON: { name, roll_no, course, branch, semester, college }
    """
    data = request.get_json()
    if not data:
        return jsonify({"success": False, "error": "No profile data provided."}), 400

    name = data.get("name", "").strip()
    roll_no = data.get("roll_no", "").strip()
    course = data.get("course", "").strip()
    branch = data.get("branch", "").strip()
    semester = data.get("semester", "").strip()
    college = data.get("college", "").strip()

    if not name:
        return jsonify({"success": False, "error": "Student name cannot be empty."}), 400

    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
        UPDATE student_profile
        SET name = ?, roll_no = ?, course = ?, branch = ?, semester = ?, college = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = 1
    """, (name, roll_no, course, branch, semester, college))
    conn.commit()
    conn.close()

    return jsonify({"success": True, "message": "Student profile updated successfully!"}), 200


# ---------------------------------------------------------------------------
# ROUTE 9: UPLOAD PROFILE PHOTO
# ---------------------------------------------------------------------------
@app.route("/api/profile/photo", methods=["POST"])
def upload_profile_photo():
    """
    Handles profile photo upload.
    Expects multipart/form-data with a 'photo' file field.
    Saves to static/uploads/ and stores filename in SQLite.
    """
    if "photo" not in request.files:
        return jsonify({"success": False, "error": "No photo file in request."}), 400

    file = request.files["photo"]
    if file.filename == "":
        return jsonify({"success": False, "error": "No file selected."}), 400

    if not allowed_file(file.filename):
        return jsonify({"success": False, "error": "Only PNG, JPG, JPEG, GIF, and WEBP files are allowed."}), 400

    # Build a safe unique filename: profile_photo.<ext>
    ext = file.filename.rsplit(".", 1)[1].lower()
    filename = f"profile_photo.{ext}"
    save_path = os.path.join(app.config["UPLOAD_FOLDER"], filename)

    # Delete any old profile photo files to avoid clutter
    for old_ext in ALLOWED_EXTENSIONS:
        old_path = os.path.join(app.config["UPLOAD_FOLDER"], f"profile_photo.{old_ext}")
        if os.path.exists(old_path) and old_path != save_path:
            os.remove(old_path)

    file.save(save_path)

    # Store relative URL path in database
    photo_url = f"/static/uploads/{filename}"
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "UPDATE student_profile SET photo_path = ?, updated_at = CURRENT_TIMESTAMP WHERE id = 1",
        (photo_url,)
    )
    conn.commit()
    conn.close()

    return jsonify({"success": True, "message": "Photo uploaded successfully!", "photo_url": photo_url}), 200


# ---------------------------------------------------------------------------
# ROUTE 10: DELETE PROFILE PHOTO
# ---------------------------------------------------------------------------
@app.route("/api/profile/photo", methods=["DELETE"])
def delete_profile_photo():
    """
    Removes the profile photo file and clears photo_path in the database.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT photo_path FROM student_profile WHERE id = 1")
    row = cursor.fetchone()
    photo_path = row["photo_path"] if row else ""

    # Delete the file from disk if it exists
    if photo_path:
        disk_path = os.path.join(os.path.dirname(__file__), photo_path.lstrip("/").replace("/", os.sep))
        if os.path.exists(disk_path):
            os.remove(disk_path)

    cursor.execute(
        "UPDATE student_profile SET photo_path = '', updated_at = CURRENT_TIMESTAMP WHERE id = 1"
    )
    conn.commit()
    conn.close()

    return jsonify({"success": True, "message": "Profile photo removed."}), 200


# ---------------------------------------------------------------------------
# APPLICATION ENTRYPOINT
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    # debug=True automatically reloads the server on code changes
    # and displays helpful error tracebacks during development.
    print("\n" + "=" * 60)
    print("  Smart Attendance Tracker Server is Starting...")
    print("  Open your browser and navigate to: http://127.0.0.1:5000")
    print("=" * 60 + "\n")
    app.run(host="127.0.0.1", port=5000, debug=True)
