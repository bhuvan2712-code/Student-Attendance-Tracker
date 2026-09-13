# 🎓 Smart Attendance Tracker

A full-stack, beginner-friendly web application designed for college students to track daily attendance and stay comfortably above the mandatory **75% threshold** without ever needing to know the total classes scheduled for the semester in advance.

---

## 🚀 Key Features

1. **Daily Attendance Entry**:
   - Log classes held today and classes attended.
   - Built-in validation (attended classes cannot exceed conducted classes).
   - "100% Attended" quick-fill shortcut.
2. **Automatic Calculations**:
   - Sums all classes conducted across all logged days.
   - Sums all classes attended.
   - Calculates real-time overall percentage: $\frac{\text{Total Attended}}{\text{Total Conducted}} \times 100$.
3. **Interactive Dashboard**:
   - 4 metric cards: Total Conducted, Total Attended, Overall %, Standing Badge.
   - Visual progress bar that reflects standing.
4. **Smart Warning System**:
   - **Green Badge ($\ge 75\%$)**: Confirms safe standing.
   - **Red Alert Badge ($< 75\%$)**: Triggers an alert when attendance drops below 75%.
5. **Bonus Feature - Predictive Recovery & Bunk Calculator**:
   - **When Attendance $< 75\%$**: Calculates the exact number of consecutive upcoming classes you must attend to pull your attendance back up to 75%.
   - **When Attendance $\ge 75\%$**: Calculates how many classes you can safely skip ("bunk") without dropping below 75%.
6. **Attendance History**:
   - Table view showing Date, Conducted, Attended, Missed, and Daily Percentage.
7. **Full CRUD Support (Edit & Delete)**:
   - Edit any erroneous record in an intuitive popup modal.
   - Delete mistake records with automatic recalculation of overall stats.
8. **Persistent SQLite Database**:
   - Permanent local storage in `attendance.db`—no separate database server required.

---

## 📁 Folder Structure Explained

```
Smart Attendance Tracker/
│
├── app.py                  # Main Flask application: sets up web routes and REST API endpoints.
├── database.py             # SQLite helper module: manages database connection and table creation.
├── requirements.txt        # Python dependency list (Flask).
├── attendance.db           # SQLite database file (automatically created on first run).
├── README.md               # Project guide and explanation for BTech CSE students.
│
├── static/                 # Static assets directly served to the browser
│   ├── css/
│   │   └── style.css       # Complete modern CSS design (cards, responsive grid, animations).
│   └── js/
│       └── script.js       # Client-side JavaScript: Fetch API requests, modal, DOM updates.
│
└── templates/              # HTML templates rendered by Flask (Jinja2)
    └── index.html          # Main web page layout, dashboard cards, forms, and table.
```

### Why this structure?
- **Separation of Concerns**: We separate data storage (`database.py`), backend logic (`app.py`), presentation (`templates/index.html`, `static/css/`), and user interactivity (`static/js/`).
- **Flask Standard Convention**: Flask expects HTML files in a folder named `templates` and assets (CSS, JS, images) in a folder named `static`.

---

## 🗄️ Database Schema

The application uses **SQLite3**. The schema definition inside `database.py`:

```sql
-- 1. Daily Attendance Table
CREATE TABLE IF NOT EXISTS attendance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    conducted INTEGER NOT NULL,
    attended INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Student Profile Table
CREATE TABLE IF NOT EXISTS student_profile (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL DEFAULT 'Rahul Sharma',
    roll_no TEXT DEFAULT '24BCE1001',
    course TEXT DEFAULT 'B.Tech',
    branch TEXT DEFAULT 'Computer Science & Engineering',
    semester TEXT DEFAULT '1st Semester',
    college TEXT DEFAULT 'Indian Institute of Technology',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Explanation of Tables & Columns:
- **`attendance` Table**:
  - `id`: Unique primary key automatically assigned (1, 2, 3...).
  - `date`: Stores date formatted as `YYYY-MM-DD` (e.g. `2026-09-12`).
  - `conducted`: Number of lectures held on that day ($> 0$).
  - `attended`: Number of lectures attended ($0 \le \text{attended} \le \text{conducted}$).
  - `created_at`: The exact date and time the entry was saved.
- **`student_profile` Table**:
  - `name`: Student's full name.
  - `roll_no`: University roll number or enrollment ID.
  - `course`: Enrolled degree program (e.g. B.Tech, BCA, MCA).
  - `branch`: Department or specialization (e.g. Computer Science & Engineering).
  - `semester`: Current semester (e.g. 1st Semester).
  - `college`: Name of the university or institute.

---

## 📐 Mathematical Proofs (The "Smart" Logic)

### Formula 1: Recovery When Attendance $< 75\%$
Let:
- $C = \text{Total Classes Conducted}$
- $A = \text{Total Classes Attended}$
- $x = \text{Number of consecutive future classes to attend}$

We want the future attendance percentage to reach at least 75% ($0.75$):
$$\frac{A + x}{C + x} \ge 0.75$$

Multiply both sides by $(C + x)$:
$$A + x \ge 0.75(C + x)$$
$$A + x \ge 0.75C + 0.75x$$

Subtract $0.75x$ and $A$ from both sides:
$$x - 0.75x \ge 0.75C - A$$
$$0.25x \ge 0.75C - A$$

Multiply both sides by $4$ (since $\frac{1}{0.25} = 4$):
$$x \ge 3C - 4A$$

Since $C$ and $A$ are integers, $3C - 4A$ is an integer. Thus:
$$\mathbf{\text{Classes Needed } (x) = \max(0, 3C - 4A)}$$

---

### Formula 2: Safe Bunks When Attendance $\ge 75\%$
Let:
- $y = \text{Number of future classes you can skip/bunk}$

We want attendance to stay at or above 75% after missing $y$ classes:
$$\frac{A}{C + y} \ge 0.75$$

Multiply both sides by $(C + y)$:
$$A \ge 0.75(C + y)$$
$$A \ge 0.75C + 0.75y$$

Subtract $0.75C$ from both sides:
$$0.75y \le A - 0.75C$$

Divide by $0.75$ (which is multiplying by $\frac{4}{3}$):
$$y \le \frac{A - 0.75C}{0.75} = \frac{4A - 3C}{3}$$

Taking the floor (since you can only attend whole classes):
$$\mathbf{\text{Safe Bunks } (y) = \max\left(0, \left\lfloor \frac{4A - 3C}{3} \right\rfloor\right)}$$

---

## 🔌 REST API Endpoints

The Flask backend exposes clean JSON endpoints used by the JavaScript frontend:

| Method | Endpoint | Description | Request Body | Response |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/` | Serves main HTML webpage | None | HTML document |
| `GET` | `/api/records` | Returns all attendance entries | None | `{ "success": true, "records": [...] }` |
| `POST` | `/api/records` | Creates a new attendance entry | `{ "date": "...", "conducted": 4, "attended": 3 }` | `{ "success": true, "id": 1 }` |
| `PUT` | `/api/records/<id>` | Updates an existing entry | `{ "date": "...", "conducted": 4, "attended": 4 }` | `{ "success": true, "message": "..." }` |
| `DELETE` | `/api/records/<id>` | Deletes an entry | None | `{ "success": true, "message": "..." }` |
| `GET` | `/api/stats` | Aggregated metrics & target formulas | None | `{ "percentage": 80.0, "status": "SAFE", ... }` |
| `GET` | `/api/profile` | Fetches saved student profile details | None | `{ "success": true, "profile": { ... } }` |
| `PUT` | `/api/profile` | Updates student profile details | `{ "name": "...", "roll_no": "...", "course": "...", ... }` | `{ "success": true, "message": "..." }` |

---

## 💻 Setup Instructions

### Prerequisites
- Python 3.8 or higher installed on your computer.

### Step 1: Clone or Navigate to the Project Folder
Open your terminal (PowerShell, Command Prompt, or Bash) and go to the project directory:
```bash
cd "c:\Users\Bhopal Singh\Desktop\Attenddence Tracker"
```

### Step 2: Create a Virtual Environment
A virtual environment keeps your project dependencies isolated from global Python packages:

- **Windows (PowerShell or CMD)**:
  ```powershell
  python -m venv .venv
  ```
- **macOS / Linux**:
  ```bash
  python3 -m venv .venv
  ```

### Step 3: Activate the Virtual Environment
- **Windows PowerShell**:
  ```powershell
  .\.venv\Scripts\Activate.ps1
  ```
  *(If PowerShell gives an execution policy error, run `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser` once).*
- **Windows Command Prompt (CMD)**:
  ```cmd
  .\.venv\Scripts\activate.bat
  ```
- **macOS / Linux**:
  ```bash
  source .venv/bin/activate
  ```

### Step 4: Install Dependencies
Install Flask using pip:
```bash
pip install -r requirements.txt
```

---

## ▶️ How to Run the Application

Start the Flask development server:
```bash
python app.py
```

You will see output similar to:
```
============================================================
  Smart Attendance Tracker Server is Starting...
  Open your browser and navigate to: http://127.0.0.1:5000
============================================================
 * Serving Flask app 'app'
 * Debug mode: on
 * Running on http://127.0.0.1:5000
```

Open your browser (Chrome, Edge, Firefox, Brave) and visit:
👉 **`http://127.0.0.1:5000`**

---

## 🧑‍💻 Technical Concepts for 1st-Year BTech Students

### 1. What is Client-Server Architecture?
- **Client (Frontend)**: Your web browser. It renders HTML elements, applies styling via CSS, and listens for user clicks via JavaScript.
- **Server (Backend)**: Our Python script (`app.py`). It receives requests from the browser, validates inputs, queries the database, and sends back data.

### 2. How does the Frontend talk to the Backend?
In traditional websites, submitting a form reloads the whole page. In this project, we use the **Fetch API**:
- When you click "Save", JavaScript intercepts the submission (`e.preventDefault()`).
- JavaScript packages the numbers into a JSON string: `JSON.stringify({ date, conducted, attended })`.
- It sends this package to `/api/records` via an asynchronous HTTP `POST` request.
- When Flask replies, JavaScript updates only the specific numbers on screen instantly, without flickering or page refresh!

### 3. What is SQL Injection and how do we prevent it?
If we constructed SQL queries using string formatting:
```python
# DANGEROUS! DO NOT DO THIS!
query = f"INSERT INTO attendance VALUES ('{date}', {conducted}, {attended})"
```
A malicious user could enter text like `2026-09-12'); DROP TABLE attendance;--` and delete the entire database.
Instead, we use **parameterized queries**:
```python
# SECURE AND SAFE
cursor.execute("INSERT INTO attendance (date, conducted, attended) VALUES (?, ?, ?)", (date, conducted, attended))
```
SQLite automatically sanitizes the inputs, making SQL injection impossible.

---

## 🧪 Testing Your Installation

You can test edge cases right in the app:
1. **Full Attendance**: Conducted = 5, Attended = 5 $\to$ Attendance = 100%, Safe Bunks = 1.
2. **Attendance Drop**: Conducted = 10, Attended = 5 $\to$ Attendance = 50%, Warning banner turns red, Classes Needed = 10.
3. **Recovery Verification**: Attend the next 10 classes continuously $\to$ Total Conducted = 20, Total Attended = 15 $\to$ Attendance = 75%.
4. **Validation Test**: Try submitting Attended = 6 when Conducted = 4 $\to$ UI warns you immediately that attended cannot exceed conducted.
