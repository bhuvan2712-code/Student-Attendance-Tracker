"""
Unit and Integration Tests for Smart Attendance Tracker
Tests Flask routes, SQLite transactions, mathematical formulas, and input validations.
"""

import unittest
import os
import json
from app import app
import database

class TestAttendanceTracker(unittest.TestCase):
    def setUp(self):
        # Configure app for testing
        app.config['TESTING'] = True
        self.client = app.test_client()

        # Use an isolated test database
        database.DB_NAME = "test_attendance.db"
        if os.path.exists("test_attendance.db"):
            os.remove("test_attendance.db")
        database.init_db()

    def tearDown(self):
        if os.path.exists("test_attendance.db"):
            os.remove("test_attendance.db")

    def test_homepage(self):
        """Verify homepage loads successfully with HTML content."""
        response = self.client.get('/')
        self.assertEqual(response.status_code, 200)
        self.assertIn(b"Smart Attendance Tracker", response.data)

    def test_empty_stats(self):
        """Verify stats endpoint returns empty state when no records exist."""
        response = self.client.get('/api/stats')
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertTrue(data['success'])
        self.assertEqual(data['total_conducted'], 0)
        self.assertEqual(data['percentage'], 0.0)
        self.assertEqual(data['status'], 'NO_DATA')

    def test_add_record_and_validation(self):
        """Verify input validation and record insertion."""
        # 1. Invalid: Attended > Conducted
        res_invalid = self.client.post('/api/records', json={
            'date': '2026-09-12',
            'conducted': 4,
            'attended': 5
        })
        self.assertEqual(res_invalid.status_code, 400)
        self.assertFalse(json.loads(res_invalid.data)['success'])

        # 2. Invalid: Conducted <= 0
        res_zero = self.client.post('/api/records', json={
            'date': '2026-09-12',
            'conducted': 0,
            'attended': 0
        })
        self.assertEqual(res_zero.status_code, 400)

        # 3. Valid record
        res_valid = self.client.post('/api/records', json={
            'date': '2026-09-12',
            'conducted': 4,
            'attended': 3
        })
        self.assertEqual(res_valid.status_code, 201)
        valid_data = json.loads(res_valid.data)
        self.assertTrue(valid_data['success'])
        record_id = valid_data['id']

        # Verify record exists in list
        res_list = self.client.get('/api/records')
        self.assertEqual(res_list.status_code, 200)
        records = json.loads(res_list.data)['records']
        self.assertEqual(len(records), 1)
        self.assertEqual(records[0]['conducted'], 4)
        self.assertEqual(records[0]['attended'], 3)
        self.assertEqual(records[0]['percentage'], 75.0)

    def test_invalid_date_is_rejected(self):
        """The API should not store dates that cannot be sorted reliably."""
        response = self.client.post('/api/records', json={
            'date': '12-09-2026',
            'conducted': 4,
            'attended': 3
        })
        self.assertEqual(response.status_code, 400)
        self.assertIn('YYYY-MM-DD', json.loads(response.data)['error'])

    def test_shortage_calculation_bonus(self):
        """
        Verify the mathematical formula when attendance is < 75%.
        Conducted = 10, Attended = 5 (50%).
        Classes needed = 3*10 - 4*5 = 10 classes.
        """
        self.client.post('/api/records', json={'date': '2026-09-10', 'conducted': 10, 'attended': 5})
        response = self.client.get('/api/stats')
        data = json.loads(response.data)

        self.assertEqual(data['total_conducted'], 10)
        self.assertEqual(data['total_attended'], 5)
        self.assertEqual(data['percentage'], 50.0)
        self.assertEqual(data['status'], 'SHORTAGE')
        self.assertEqual(data['classes_needed'], 10)
        self.assertEqual(data['safe_bunks'], 0)

    def test_safe_bunks_calculation_bonus(self):
        """
        Verify the safe bunks calculation when attendance >= 75%.
        Conducted = 20, Attended = 18 (90%).
        Safe bunks = floor((4*18 - 3*20)/3) = floor(12/3) = 4 bunks.
        """
        self.client.post('/api/records', json={'date': '2026-09-10', 'conducted': 20, 'attended': 18})
        response = self.client.get('/api/stats')
        data = json.loads(response.data)

        self.assertEqual(data['total_conducted'], 20)
        self.assertEqual(data['total_attended'], 18)
        self.assertEqual(data['percentage'], 90.0)
        self.assertEqual(data['status'], 'SAFE')
        self.assertEqual(data['safe_bunks'], 4)
        self.assertEqual(data['classes_needed'], 0)

    def test_edit_and_delete(self):
        """Verify update and delete operations."""
        # Insert initial entry
        res = self.client.post('/api/records', json={'date': '2026-09-10', 'conducted': 5, 'attended': 2})
        record_id = json.loads(res.data)['id']

        # Edit entry to 5 conducted, 5 attended
        res_put = self.client.put(f'/api/records/{record_id}', json={'date': '2026-09-10', 'conducted': 5, 'attended': 5})
        self.assertEqual(res_put.status_code, 200)

        # Check stats updated
        stats = json.loads(self.client.get('/api/stats').data)
        self.assertEqual(stats['total_attended'], 5)
        self.assertEqual(stats['percentage'], 100.0)

        # Delete entry
        res_del = self.client.delete(f'/api/records/{record_id}')
        self.assertEqual(res_del.status_code, 200)

        # Verify empty again
        stats_after = json.loads(self.client.get('/api/stats').data)
        self.assertEqual(stats_after['total_conducted'], 0)

    def test_get_and_update_student_profile(self):
        """Verify fetching and updating student profile details."""
        # 1. Fetch initial default profile
        res = self.client.get('/api/profile')
        self.assertEqual(res.status_code, 200)
        data = json.loads(res.data)
        self.assertTrue(data['success'])
        self.assertIn('profile', data)
        self.assertEqual(data['profile']['course'], 'B.Tech')

        # 2. Update profile with custom student details
        update_payload = {
            'name': 'Aarav Patel',
            'roll_no': '24CSE042',
            'course': 'B.Tech',
            'branch': 'AI & Data Science',
            'semester': '2nd Semester',
            'college': 'National Institute of Technology'
        }
        res_put = self.client.put('/api/profile', json=update_payload)
        self.assertEqual(res_put.status_code, 200)
        self.assertTrue(json.loads(res_put.data)['success'])

        # 3. Fetch again and verify updated info
        res_updated = self.client.get('/api/profile')
        self.assertEqual(res_updated.status_code, 200)
        updated_profile = json.loads(res_updated.data)['profile']
        self.assertEqual(updated_profile['name'], 'Aarav Patel')
        self.assertEqual(updated_profile['roll_no'], '24CSE042')
        self.assertEqual(updated_profile['branch'], 'AI & Data Science')
        self.assertEqual(updated_profile['semester'], '2nd Semester')
        self.assertEqual(updated_profile['college'], 'National Institute of Technology')

        # 4. Validation: Empty name should return 400
        res_empty = self.client.put('/api/profile', json={'name': ''})
        self.assertEqual(res_empty.status_code, 400)

if __name__ == '__main__':
    unittest.main()
