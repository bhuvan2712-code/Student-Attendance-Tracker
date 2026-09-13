/**
 * ============================================================================
 * SMART ATTENDANCE TRACKER - FRONTEND JAVASCRIPT (script.js)
 * ============================================================================
 * This script powers all interactive functionality of the application.
 *
 * Key Concepts for 1st-Year BTech Students:
 * 1. DOM (Document Object Model): The browser's tree representation of HTML tags.
 *    JavaScript accesses elements using document.getElementById() or querySelector().
 * 2. Event Listeners: Functions that "listen" for user actions like clicks or form
 *    submissions (e.g., addEventListener('submit', ...)).
 * 3. Fetch API: Modern JavaScript way to send asynchronous HTTP requests (GET, POST,
 *    PUT, DELETE) to our Flask backend without reloading the browser page.
 * 4. Async / Await: Clean, modern syntax to handle asynchronous network operations
 *    step-by-step.
 * ============================================================================
 */

// ----------------------------------------------------------------------------
// 1. DOM Element References
// ----------------------------------------------------------------------------
// Stats Elements
const statConducted = document.getElementById("statConducted");
const statAttended = document.getElementById("statAttended");
const statPercentage = document.getElementById("statPercentage");
const statProgressBar = document.getElementById("statProgressBar");
const statusBadge = document.getElementById("statusBadge");
const statusBadgeText = document.getElementById("statusBadgeText");
const statusSubtext = document.getElementById("statusSubtext");
const statusIcon = document.getElementById("statusIcon");
const statusIconWrapper = document.getElementById("statusIconWrapper");

// Smart Banner Elements
const smartBanner = document.getElementById("smartBanner");
const bannerIcon = document.getElementById("bannerIcon");
const bannerTitle = document.getElementById("bannerTitle");
const bannerMessage = document.getElementById("bannerMessage");
const bannerMetricBox = document.getElementById("bannerMetricBox");
const bannerMetricVal = document.getElementById("bannerMetricVal");
const bannerMetricLabel = document.getElementById("bannerMetricLabel");

// Theme Toggle Elements
const themeToggleBtn = document.getElementById("themeToggleBtn");
const themeIcon = document.getElementById("themeIcon");

// Form Elements
const attendanceForm = document.getElementById("attendanceForm");
const entryDate = document.getElementById("entryDate");
const entryConducted = document.getElementById("entryConducted");
const entryAttended = document.getElementById("entryAttended");
const btnFullAttendance = document.getElementById("btnFullAttendance");
const toggleHolidayMode = document.getElementById("toggleHolidayMode");
const groupHolidayReason = document.getElementById("groupHolidayReason");
const groupClassInputs = document.getElementById("groupClassInputs");
const entryHolidayReason = document.getElementById("entryHolidayReason");
const sundayAlert = document.getElementById("sundayAlert");
const btnSubmitText = document.getElementById("btnSubmitText");

// Table & History Elements
const historyTableBody = document.getElementById("historyTableBody");
const emptyState = document.getElementById("emptyState");
const recordCounter = document.getElementById("recordCounter");
const headerCurrentDate = document.getElementById("headerCurrentDate");

// Modal Elements
const editModalOverlay = document.getElementById("editModalOverlay");
const editForm = document.getElementById("editForm");
const editRecordId = document.getElementById("editRecordId");
const editDate = document.getElementById("editDate");
const editConducted = document.getElementById("editConducted");
const editAttended = document.getElementById("editAttended");
const btnCloseModal = document.getElementById("btnCloseModal");
const btnCancelEdit = document.getElementById("btnCancelEdit");

// Student Profile Elements
const profileAvatar = document.getElementById("profileAvatar");
const profileAvatarWrapper = document.getElementById("profileAvatarWrapper");
const profileName = document.getElementById("profileName");
const profileRollNo = document.getElementById("profileRollNo");
const profileCourse = document.getElementById("profileCourse");
const profileBranch = document.getElementById("profileBranch");
const profileSemester = document.getElementById("profileSemester");
const profileCollege = document.getElementById("profileCollege");
const btnOpenEditProfile = document.getElementById("btnOpenEditProfile");

// Profile Modal Elements
const profileModalOverlay = document.getElementById("profileModalOverlay");
const profileForm = document.getElementById("profileForm");
const inputProfileName = document.getElementById("inputProfileName");
const inputProfileRollNo = document.getElementById("inputProfileRollNo");
const inputProfileCourse = document.getElementById("inputProfileCourse");
const inputProfileBranch = document.getElementById("inputProfileBranch");
const inputProfileSemester = document.getElementById("inputProfileSemester");
const inputProfileCollege = document.getElementById("inputProfileCollege");
const btnCloseProfileModal = document.getElementById("btnCloseProfileModal");
const btnCancelProfile = document.getElementById("btnCancelProfile");

// Photo upload elements
const inputProfilePhoto = document.getElementById("inputProfilePhoto");
const photoPreview = document.getElementById("photoPreview");
const photoPreviewImg = document.getElementById("photoPreviewImg");
const photoPreviewInitials = document.getElementById("photoPreviewInitials");
const btnRemovePhoto = document.getElementById("btnRemovePhoto");

// Track currently saved photo URL
let currentPhotoUrl = "";
let pendingPhotoFile = null; // file selected but not yet uploaded

// Toast Notification Container
const toastContainer = document.getElementById("toastContainer");

// ----------------------------------------------------------------------------
// 2. Initialization & Setup
// ----------------------------------------------------------------------------
document.addEventListener("DOMContentLoaded", () => {
    // Initialize Theme (Dark/Light)
    initTheme();

    // Set default date to today in YYYY-MM-DD format
    const today = new Date();
    const formattedToday = today.toISOString().split("T")[0];
    entryDate.value = formattedToday;

    // Display formatted readable date in the header
    const options = { weekday: "short", year: "numeric", month: "short", day: "numeric" };
    headerCurrentDate.textContent = today.toLocaleDateString("en-US", options);

    // Check if today is Sunday and show alert
    checkSundayAlert(formattedToday);

    // Holiday Mode Toggle: show/hide relevant fields
    if (toggleHolidayMode) {
        toggleHolidayMode.addEventListener("change", () => {
            const isHoliday = toggleHolidayMode.checked;
            groupHolidayReason.style.display = isHoliday ? "block" : "none";
            groupClassInputs.style.display = isHoliday ? "none" : "block";
            if (btnSubmitText) {
                btnSubmitText.textContent = isHoliday ? "Save Holiday" : "Save Attendance Record";
            }
        });
    }

    // Date change → re-check Sunday
    if (entryDate) {
        entryDate.addEventListener("change", () => {
            checkSundayAlert(entryDate.value);
        });
    }

    // Initial data fetch from Flask backend
    fetchProfile();
    refreshAllData();
});

/**
 * Shows a Sunday warning banner if the selected date is a Sunday
 */
function checkSundayAlert(dateStr) {
    if (!sundayAlert || !dateStr) return;
    // dateStr is YYYY-MM-DD; new Date() interprets as UTC midnight
    const parts = dateStr.split("-");
    const localDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    if (localDate.getDay() === 0) {
        sundayAlert.style.display = "flex";
        // Auto-check the holiday toggle if user hasn't already
        if (toggleHolidayMode && !toggleHolidayMode.checked) {
            toggleHolidayMode.checked = true;
            toggleHolidayMode.dispatchEvent(new Event("change"));
            if (entryHolidayReason) entryHolidayReason.value = "Sunday Off";
        }
    } else {
        sundayAlert.style.display = "none";
    }
}

/**
 * Convenient shortcut: "100% Attended" button
 * Copies whatever number is in 'Classes Conducted' directly to 'Classes Attended'
 */
btnFullAttendance.addEventListener("click", () => {
    const conductedVal = parseInt(entryConducted.value, 10);
    if (!isNaN(conductedVal) && conductedVal > 0) {
        entryAttended.value = conductedVal;
    } else {
        entryConducted.focus();
        showToast("Please enter classes conducted first.", "info");
    }
});

/**
 * Fetches both dashboard metrics and history records concurrently
 */
async function refreshAllData() {
    await Promise.all([fetchStats(), fetchRecords()]);
}

// ----------------------------------------------------------------------------
// Theme Switcher Logic (Dark / Light Mode)
// ----------------------------------------------------------------------------
function initTheme() {
    const savedTheme = localStorage.getItem("theme");
    // Default to dark mode for ultra-modern aesthetic
    const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    const initialTheme = savedTheme || (prefersDark ? "dark" : "dark"); // Default dark mode for wow factor

    setTheme(initialTheme);
}

function setTheme(theme) {
    if (theme === "dark") {
        document.documentElement.setAttribute("data-theme", "dark");
        if (themeIcon) themeIcon.className = "fa-solid fa-sun";
        localStorage.setItem("theme", "dark");
    } else {
        document.documentElement.removeAttribute("data-theme");
        if (themeIcon) themeIcon.className = "fa-solid fa-moon";
        localStorage.setItem("theme", "light");
    }
}

if (themeToggleBtn) {
    themeToggleBtn.addEventListener("click", () => {
        const isDark = document.documentElement.getAttribute("data-theme") === "dark";
        setTheme(isDark ? "light" : "dark");
        showToast(isDark ? "Switched to Light Mode" : "Switched to Dark Mode", "info");
    });
}

/**
 * Smoothly animates a numeric value from current to target
 */
function animateValue(element, start, end, duration = 650, suffix = "", isFloat = false) {
    if (!element) return;
    if (isNaN(start)) start = 0;
    if (isNaN(end)) end = 0;
    if (start === end) {
        element.textContent = isFloat ? end.toFixed(1) + suffix : Math.round(end) + suffix;
        return;
    }

    const startTime = performance.now();

    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        // Easing: easeOutCubic
        const ease = 1 - Math.pow(1 - progress, 3);
        const current = start + (end - start) * ease;

        element.textContent = isFloat ? current.toFixed(1) + suffix : Math.round(current) + suffix;

        if (progress < 1) {
            requestAnimationFrame(update);
        } else {
            element.textContent = isFloat ? end.toFixed(1) + suffix : Math.round(end) + suffix;
        }
    }

    requestAnimationFrame(update);
}

// ----------------------------------------------------------------------------
// 3. Fetch Dashboard Stats & Update Smart Banner with Animations
// ----------------------------------------------------------------------------
async function fetchStats() {
    try {
        const response = await fetch("/api/stats");
        const data = await response.json();

        if (!data.success) {
            showToast("Failed to load statistics.", "error");
            return;
        }

        // 1. Animate metric numbers with smooth counter transition
        const currentConducted = parseInt(statConducted.textContent, 10) || 0;
        const currentAttended = parseInt(statAttended.textContent, 10) || 0;
        const currentPercentage = parseFloat(statPercentage.textContent) || 0.0;

        animateValue(statConducted, currentConducted, data.total_conducted, 650);
        animateValue(statAttended, currentAttended, data.total_attended, 650);
        animateValue(statPercentage, currentPercentage, data.percentage, 750, "%", true);

        // 2. Animate Progress Bar with custom smooth easing
        const boundedPercent = Math.min(100, Math.max(0, data.percentage));
        statProgressBar.style.width = `${boundedPercent}%`;

        // Reset classes
        statusBadge.className = "status-badge";
        smartBanner.className = "smart-banner";

        // 3. Update Status Badge & Smart Warning Banner based on threshold
        if (data.status === "SAFE") {
            // Safe (>= 75%)
            statProgressBar.style.background = "linear-gradient(135deg, #10b981 0%, #059669 100%)";
            statProgressBar.style.boxShadow = "0 0 12px rgba(16, 185, 129, 0.4)";
            statusBadge.classList.add("status-safe");
            if (statusBadgeText) statusBadgeText.textContent = "On Track (≥ 75%)";
            statusSubtext.textContent = `Safe to bunk: ${data.safe_bunks} classes`;

            statusIcon.className = "fa-solid fa-shield-check";
            statusIconWrapper.className = "stat-icon icon-green";

            // Smart Banner: Green Theme
            smartBanner.classList.add("banner-safe");
            bannerIcon.className = "fa-solid fa-circle-check";
            bannerTitle.textContent = "Attendance is Safe & On Track!";
            bannerMessage.textContent = data.status_message;

            bannerMetricBox.style.display = "block";
            const currentBunks = parseInt(bannerMetricVal.textContent, 10) || 0;
            animateValue(bannerMetricVal, currentBunks, data.safe_bunks, 600);
            bannerMetricLabel.textContent = "Safe Bunks Left";

        } else if (data.status === "SHORTAGE") {
            // Shortage (< 75%)
            statProgressBar.style.background = "linear-gradient(135deg, #f43f5e 0%, #e11d48 100%)";
            statProgressBar.style.boxShadow = "0 0 12px rgba(244, 63, 94, 0.4)";
            statusBadge.classList.add("status-danger");
            if (statusBadgeText) statusBadgeText.textContent = "Shortage (< 75%)";
            statusSubtext.textContent = `Must attend: ${data.classes_needed} classes`;

            statusIcon.className = "fa-solid fa-triangle-exclamation";
            statusIconWrapper.className = "stat-icon icon-red";

            // Smart Banner: Red Alert Theme with Breathing Animation
            smartBanner.classList.add("banner-danger");
            bannerIcon.className = "fa-solid fa-triangle-exclamation";
            bannerTitle.textContent = "Attendance Warning: Below 75% Threshold!";
            bannerMessage.textContent = data.status_message;

            bannerMetricBox.style.display = "block";
            const currentNeeded = parseInt(bannerMetricVal.textContent, 10) || 0;
            animateValue(bannerMetricVal, currentNeeded, data.classes_needed, 600);
            bannerMetricLabel.textContent = "Classes Needed";

        } else {
            // No Data Yet
            statProgressBar.style.background = "var(--text-light)";
            statProgressBar.style.boxShadow = "none";
            statusBadge.classList.add("status-neutral");
            if (statusBadgeText) statusBadgeText.textContent = "No Records Yet";
            statusSubtext.textContent = "Add your daily logs";

            statusIcon.className = "fa-solid fa-clipboard-question";
            statusIconWrapper.className = "stat-icon icon-amber";

            // Smart Banner: Neutral
            smartBanner.classList.add("banner-neutral");
            bannerIcon.className = "fa-solid fa-circle-info";
            bannerTitle.textContent = "Welcome to Smart Attendance Tracker!";
            bannerMessage.textContent = "Log your daily classes conducted and attended below. The system will automatically calculate your standing and future class recommendations.";
            bannerMetricBox.style.display = "none";
        }

    } catch (err) {
        console.error("Error fetching stats:", err);
    }
}

// ----------------------------------------------------------------------------
// 4. Fetch Attendance History & Populate Table
// ----------------------------------------------------------------------------
async function fetchRecords() {
    try {
        const response = await fetch("/api/records");
        const data = await response.json();

        if (!data.success) {
            showToast("Failed to load records.", "error");
            return;
        }

        const records = data.records;
        recordCounter.textContent = `${records.length} ${records.length === 1 ? "Entry" : "Entries"}`;

        if (records.length === 0) {
            historyTableBody.innerHTML = "";
            emptyState.style.display = "block";
            return;
        }

        emptyState.style.display = "none";
        historyTableBody.innerHTML = "";

        // Build table rows dynamically
        records.forEach((record) => {
            const tr = document.createElement("tr");

            if (record.is_holiday) {
                // ✅ Holiday row — show special badge, not class counts
                const reason = record.holiday_reason || "Holiday";
                tr.style.opacity = "0.75";
                tr.innerHTML = `
                    <td><strong>${escapeHtml(record.date)}</strong></td>
                    <td colspan="3" style="text-align:center;">
                        <span class="daily-badge" style="background:linear-gradient(135deg,#f59e0b,#d97706);color:#fff;padding:4px 12px;border-radius:20px;font-size:0.8rem;">
                            <i class="fa-solid fa-mug-hot"></i> ${escapeHtml(reason)}
                        </span>
                    </td>
                    <td>
                        <span class="daily-badge" style="background:var(--border-color);color:var(--text-muted);">
                            Holiday
                        </span>
                    </td>
                    <td>
                        <div class="action-buttons">
                            <button class="btn-icon btn-delete" onclick="handleDeleteClick(${record.id}, '${record.date}')" title="Delete Entry">
                                <i class="fa-solid fa-trash"></i>
                            </button>
                        </div>
                    </td>
                `;
            } else {
                // Regular class day row
                const missed = record.conducted - record.attended;
                const isSafe = record.percentage >= 75.0;

                tr.innerHTML = `
                    <td><strong>${escapeHtml(record.date)}</strong></td>
                    <td>${record.conducted}</td>
                    <td><span style="color: var(--success); font-weight: 600;">${record.attended}</span></td>
                    <td><span style="color: ${missed > 0 ? 'var(--danger)' : 'var(--text-muted)'}; font-weight: 600;">${missed}</span></td>
                    <td>
                        <span class="daily-badge ${isSafe ? 'safe' : 'danger'}">
                            ${record.percentage}%
                        </span>
                    </td>
                    <td>
                        <div class="action-buttons">
                            <button class="btn-icon btn-edit" onclick="handleEditClick(${record.id}, '${record.date}', ${record.conducted}, ${record.attended})" title="Edit Entry">
                                <i class="fa-solid fa-pen"></i>
                            </button>
                            <button class="btn-icon btn-delete" onclick="handleDeleteClick(${record.id}, '${record.date}')" title="Delete Entry">
                                <i class="fa-solid fa-trash"></i>
                            </button>
                        </div>
                    </td>
                `;
            }

            historyTableBody.appendChild(tr);
        });

    } catch (err) {
        console.error("Error fetching records:", err);
    }
}

// ----------------------------------------------------------------------------
// 5. Add New Record (Form Submission)
// ----------------------------------------------------------------------------
attendanceForm.addEventListener("submit", async (e) => {
    e.preventDefault(); // Prevent page reload

    const date = entryDate.value.trim();
    // Read the holiday checkbox
    const isHoliday = toggleHolidayMode ? toggleHolidayMode.checked : false;
    const holidayReason = (entryHolidayReason ? entryHolidayReason.value.trim() : "") || "College Holiday";

    // Validation
    if (!date) {
        showToast("Please select a date.", "error");
        return;
    }

    let payload;

    if (isHoliday) {
        // ✅ Holiday mode — no class counts needed
        payload = { date, is_holiday: true, holiday_reason: holidayReason };
    } else {
        // Regular class day — validate class counts
        const conducted = parseInt(entryConducted.value, 10);
        const attended = parseInt(entryAttended.value, 10);

        if (isNaN(conducted) || conducted <= 0) {
            showToast("Conducted classes must be at least 1.", "error");
            entryConducted.focus();
            return;
        }
        if (isNaN(attended) || attended < 0) {
            showToast("Attended classes cannot be negative.", "error");
            entryAttended.focus();
            return;
        }
        if (attended > conducted) {
            showToast("Attended classes cannot exceed conducted classes.", "error");
            entryAttended.focus();
            return;
        }
        payload = { date, conducted, attended, is_holiday: false };
    }

    try {
        const response = await fetch("/api/records", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        const result = await response.json();

        if (response.ok && result.success) {
            const msg = isHoliday ? "Holiday saved! It won't affect your attendance %." : "Attendance record saved successfully!";
            showToast(msg, "success");

            // Reset form
            entryConducted.value = "";
            entryAttended.value = "";
            if (entryHolidayReason) entryHolidayReason.value = "";
            if (toggleHolidayMode) {
                toggleHolidayMode.checked = false;
                toggleHolidayMode.dispatchEvent(new Event("change"));
            }
            entryConducted.focus();

            // Refresh table and summary metrics
            refreshAllData();
        } else {
            showToast(result.error || "Failed to save record.", "error");
        }
    } catch (err) {
        console.error("Submission error:", err);
        showToast("Network error. Could not connect to server.", "error");
    }
});

// ----------------------------------------------------------------------------
// 6. Edit Record Logic & Modal Control
// ----------------------------------------------------------------------------
window.handleEditClick = (id, date, conducted, attended) => {
    editRecordId.value = id;
    editDate.value = date;
    editConducted.value = conducted;
    editAttended.value = attended;

    editModalOverlay.classList.add("active");
};

function closeModal() {
    editModalOverlay.classList.remove("active");
    editForm.reset();
}

btnCloseModal.addEventListener("click", closeModal);
btnCancelEdit.addEventListener("click", closeModal);

// Close modal if user clicks outside the dialog box
editModalOverlay.addEventListener("click", (e) => {
    if (e.target === editModalOverlay) {
        closeModal();
    }
});

// Edit modal: holiday toggle logic
const editToggleHoliday = document.getElementById("editToggleHoliday");
const editGroupHolidayReason = document.getElementById("editGroupHolidayReason");
const editGroupClassInputs = document.getElementById("editGroupClassInputs");
const editHolidayReason = document.getElementById("editHolidayReason");

if (editToggleHoliday) {
    editToggleHoliday.addEventListener("change", () => {
        const isHol = editToggleHoliday.checked;
        if (editGroupHolidayReason) editGroupHolidayReason.style.display = isHol ? "block" : "none";
        if (editGroupClassInputs) editGroupClassInputs.style.display = isHol ? "none" : "block";
    });
}

// Submit updated record
editForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const id = editRecordId.value;
    const date = editDate.value.trim();
    const isHoliday = editToggleHoliday ? editToggleHoliday.checked : false;
    const holidayReason = (editHolidayReason ? editHolidayReason.value.trim() : "") || "College Holiday";

    if (!date) {
        showToast("Date is required.", "error");
        return;
    }

    let payload;

    if (isHoliday) {
        payload = { date, is_holiday: true, holiday_reason: holidayReason };
    } else {
        const conducted = parseInt(editConducted.value, 10);
        const attended = parseInt(editAttended.value, 10);

        if (isNaN(conducted) || conducted <= 0) {
            showToast("Conducted classes must be greater than 0.", "error");
            return;
        }
        if (isNaN(attended) || attended < 0) {
            showToast("Attended classes cannot be negative.", "error");
            return;
        }
        if (attended > conducted) {
            showToast("Attended classes cannot exceed conducted classes.", "error");
            return;
        }
        payload = { date, conducted, attended, is_holiday: false };
    }

    try {
        const response = await fetch(`/api/records/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        const result = await response.json();

        if (response.ok && result.success) {
            showToast("Record updated successfully!", "success");
            closeModal();
            refreshAllData();
        } else {
            showToast(result.error || "Failed to update record.", "error");
        }
    } catch (err) {
        console.error("Update error:", err);
        showToast("Network error during update.", "error");
    }
});

// ----------------------------------------------------------------------------
// 7. Delete Record Logic
// ----------------------------------------------------------------------------
window.handleDeleteClick = async (id, date) => {
    const isConfirmed = window.confirm(`Are you sure you want to delete the record for ${date}?`);

    if (!isConfirmed) return;

    try {
        const response = await fetch(`/api/records/${id}`, {
            method: "DELETE"
        });

        const result = await response.json();

        if (response.ok && result.success) {
            showToast("Record deleted successfully.", "info");
            refreshAllData();
        } else {
            showToast(result.error || "Failed to delete record.", "error");
        }
    } catch (err) {
        console.error("Delete error:", err);
        showToast("Network error during deletion.", "error");
    }
};

// ----------------------------------------------------------------------------
// 8. Utility Functions: Toast Notification & HTML Escaping
// ----------------------------------------------------------------------------
/**
 * Displays a non-blocking toast message on screen
 * @param {string} message - Message text to display
 * @param {string} type - 'success', 'error', or 'info'
 */
function showToast(message, type = "info") {
    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;

    let iconClass = "fa-circle-info";
    if (type === "success") iconClass = "fa-circle-check";
    if (type === "error") iconClass = "fa-circle-xmark";

    toast.innerHTML = `<i class="fa-solid ${iconClass}"></i> <span>${escapeHtml(message)}</span>`;

    toastContainer.appendChild(toast);

    // Auto remove after 3.5 seconds
    setTimeout(() => {
        toast.style.opacity = "0";
        toast.style.transform = "translateY(10px)";
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

/**
 * Escapes HTML characters to prevent XSS (Cross-Site Scripting) injection
 */
function escapeHtml(string) {
    const div = document.createElement("div");
    div.textContent = string;
    return div.innerHTML;
}

// ----------------------------------------------------------------------------
// 9. Student Profile Logic
// ----------------------------------------------------------------------------
/**
 * Fetches the student's profile from SQLite backend and updates the UI
 */
async function fetchProfile() {
    try {
        const response = await fetch("/api/profile");
        const data = await response.json();

        if (!data.success || !data.profile) return;

        const p = data.profile;
        profileName.textContent = p.name || "Student Name";
        profileRollNo.textContent = p.roll_no || "Roll No";
        profileCourse.textContent = p.course || "B.Tech";
        profileBranch.textContent = p.branch || "CSE";
        profileSemester.textContent = p.semester || "1st Semester";
        profileCollege.textContent = p.college || "Engineering College";

        // Store current photo URL
        currentPhotoUrl = p.photo_path || "";

        // Update the header avatar
        if (currentPhotoUrl) {
            // Show actual photo image inside avatar
            profileAvatar.innerHTML = `<img src="${currentPhotoUrl}?t=${Date.now()}" alt="Profile Photo" style="width:100%;height:100%;object-fit:cover;border-radius:50%;display:block;">`;
        } else {
            // Show initials
            const words = (p.name || "Student").trim().split(" ");
            let initials = "";
            if (words.length >= 2) {
                initials = (words[0][0] + words[1][0]).toUpperCase();
            } else if (words.length === 1 && words[0].length > 0) {
                initials = words[0].slice(0, 2).toUpperCase();
            } else {
                initials = "ST";
            }
            profileAvatar.innerHTML = initials;
        }

    } catch (err) {
        console.error("Error fetching student profile:", err);
    }
}

// Open Profile Edit Modal and prefill with current values
btnOpenEditProfile.addEventListener("click", () => openProfileModal());

// Clicking the avatar wrapper also opens the profile modal
if (profileAvatarWrapper) {
    profileAvatarWrapper.addEventListener("click", () => openProfileModal());
}

function openProfileModal() {
    inputProfileName.value = profileName.textContent;
    inputProfileRollNo.value = profileRollNo.textContent;
    inputProfileCourse.value = profileCourse.textContent;
    inputProfileBranch.value = profileBranch.textContent;
    inputProfileSemester.value = profileSemester.textContent;
    inputProfileCollege.value = profileCollege.textContent;

    // Reset pending file selection
    pendingPhotoFile = null;
    if (inputProfilePhoto) inputProfilePhoto.value = "";

    // Populate photo preview
    syncModalPhotoPreview();

    profileModalOverlay.classList.add("active");
}

/**
 * Sync the modal photo preview circle with current state.
 * Shows photo if one exists, else shows initials.
 */
function syncModalPhotoPreview() {
    const initials = profileAvatar.tagName === "DIV" && !profileAvatar.querySelector("img")
        ? profileAvatar.textContent.trim()
        : (profileName.textContent.trim().split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase() || "ST");

    if (currentPhotoUrl) {
        photoPreviewImg.src = currentPhotoUrl + "?t=" + Date.now();
        photoPreviewImg.style.display = "block";
        photoPreviewInitials.style.display = "none";
        if (btnRemovePhoto) btnRemovePhoto.style.display = "inline-flex";
    } else {
        photoPreviewImg.style.display = "none";
        photoPreviewImg.src = "";
        photoPreviewInitials.textContent = initials;
        photoPreviewInitials.style.display = "block";
        if (btnRemovePhoto) btnRemovePhoto.style.display = "none";
    }
}

// File input: show a live preview of the chosen image immediately
if (inputProfilePhoto) {
    inputProfilePhoto.addEventListener("change", () => {
        const file = inputProfilePhoto.files[0];
        if (!file) return;

        // Basic size check (5 MB)
        if (file.size > 5 * 1024 * 1024) {
            showToast("Photo is too large. Max size is 5 MB.", "error");
            inputProfilePhoto.value = "";
            return;
        }

        pendingPhotoFile = file;

        // Preview locally using FileReader (no server round-trip needed yet)
        const reader = new FileReader();
        reader.onload = (e) => {
            photoPreviewImg.src = e.target.result;
            photoPreviewImg.style.display = "block";
            photoPreviewInitials.style.display = "none";
            if (btnRemovePhoto) btnRemovePhoto.style.display = "inline-flex";
        };
        reader.readAsDataURL(file);
    });
}

// Remove Photo button
if (btnRemovePhoto) {
    btnRemovePhoto.addEventListener("click", async () => {
        if (pendingPhotoFile) {
            // Just cancel the pending local selection
            pendingPhotoFile = null;
            inputProfilePhoto.value = "";
            currentPhotoUrl = "";
            syncModalPhotoPreview();
            return;
        }

        // Remove the saved photo from server
        try {
            const res = await fetch("/api/profile/photo", { method: "DELETE" });
            const result = await res.json();
            if (res.ok && result.success) {
                currentPhotoUrl = "";
                syncModalPhotoPreview();
                showToast("Profile photo removed.", "info");
                await fetchProfile();
            } else {
                showToast(result.error || "Failed to remove photo.", "error");
            }
        } catch (err) {
            showToast("Network error while removing photo.", "error");
        }
    });
}

/**
 * Upload pending photo file to server (called during profile save)
 */
async function uploadPendingPhoto() {
    if (!pendingPhotoFile) return true; // nothing to upload

    const formData = new FormData();
    formData.append("photo", pendingPhotoFile);

    const res = await fetch("/api/profile/photo", {
        method: "POST",
        body: formData  // no Content-Type header — browser sets multipart boundary automatically
    });
    const result = await res.json();

    if (res.ok && result.success) {
        currentPhotoUrl = result.photo_url;
        pendingPhotoFile = null;
        return true;
    } else {
        showToast(result.error || "Photo upload failed.", "error");
        return false;
    }
}

// Close Profile Edit Modal
function closeProfileModal() {
    profileModalOverlay.classList.remove("active");
}

btnCloseProfileModal.addEventListener("click", closeProfileModal);
btnCancelProfile.addEventListener("click", closeProfileModal);

profileModalOverlay.addEventListener("click", (e) => {
    if (e.target === profileModalOverlay) {
        closeProfileModal();
    }
});

// Submit Updated Profile Details
profileForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const name = inputProfileName.value.trim();
    const roll_no = inputProfileRollNo.value.trim();
    const course = inputProfileCourse.value.trim();
    const branch = inputProfileBranch.value.trim();
    const semester = inputProfileSemester.value.trim();
    const college = inputProfileCollege.value.trim();

    if (!name) {
        showToast("Student name cannot be empty.", "error");
        inputProfileName.focus();
        return;
    }

    // 1. Upload photo first (if a new one was selected)
    const photoOk = await uploadPendingPhoto();
    if (!photoOk) return; // stop if photo upload failed

    // 2. Save profile text fields
    try {
        const response = await fetch("/api/profile", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, roll_no, course, branch, semester, college })
        });

        const result = await response.json();

        if (response.ok && result.success) {
            showToast("Profile updated successfully!", "success");
            closeProfileModal();
            fetchProfile();
        } else {
            showToast(result.error || "Failed to update profile.", "error");
        }
    } catch (err) {
        console.error("Error saving profile:", err);
        showToast("Network error while saving profile.", "error");
    }
});

