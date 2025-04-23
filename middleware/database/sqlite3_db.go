package database

import (
	"database/sql"
	"log"
	"strings"

	_ "github.com/mattn/go-sqlite3"
)

type User struct {
	ID          int    `json:"id"`
	Username    string `json:"username"`
	Password    string `json:"password"`
	PhoneNumber string `json:"phone_number"`
	Gender      string `json:"gender"`
	Province    string `json:"province"`
}

type UserProfile struct {
	ID          int    `json:"id"`
	UserID      int    `json:"user_id"`
	PhoneNumber string `json:"phone_number"`
	Gender      string `json:"gender"`
	Province    string `json:"province"`
}

/* type Schedule struct {
	Lighting struct {
		Start string `json:"start"`
		End   string `json:"end"`
	} `json:"lighting"`
	Feeding       []string `json:"feeding"`
	WaterInterval int      `json:"waterInterval"`
	TempThreshold struct {
		Min float64 `json:"min"`
		Max float64 `json:"max"`
	} `json:"tempThreshold"`
	HumThreshold struct {
		Min float64 `json:"min"`
		Max float64 `json:"max"`
	} `json:"humThreshold"`
} */

// ====== INITIALIZE DATABASE ====== //
func InitDB() *sql.DB {
	var db *sql.DB // Database connection
	var err error
	db, err = sql.Open("sqlite3", "users.db")
	if err != nil {
		log.Fatal(err)
	}

	// Create Users table
	createUsersTable := `
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        phone_number TEXT,
        gender TEXT,
        province TEXT
    );
    `
	_, err = db.Exec(createUsersTable)
	if err != nil {
		log.Fatal("Error creating users table:", err)
	}

	// Initialize profiles table
	InitProfileDB(db)

/*	// Create Schedules table
	createSchedulesTable := `
    CREATE TABLE IF NOT EXISTS schedules (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        lighting_start TEXT NOT NULL,
        lighting_end TEXT NOT NULL,
        feeding_times TEXT NOT NULL,
        water_interval INTEGER NOT NULL,
        temp_min REAL NOT NULL,
        temp_max REAL NOT NULL,
        hum_min REAL NOT NULL,
        hum_max REAL NOT NULL
    );
    `
	_, err = db.Exec(createSchedulesTable)
	if err != nil {
		log.Fatal("Error creating schedules table:", err)
	}

	log.Println("Database initialized successfully")
	return db
} */

// Initialize profiles table
func InitProfileDB(db *sql.DB) error {
	createProfilesTable := `
    CREATE TABLE IF NOT EXISTS user_profiles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER UNIQUE,
        phone_number TEXT,
        gender TEXT,
        province TEXT,
        FOREIGN KEY (user_id) REFERENCES users(id)
    );`

	_, err := db.Exec(createProfilesTable)
	if err != nil {
		log.Println("Error creating profiles table:", err)
		return err
	}
	log.Println("Profiles table created successfully")
	return nil
}

// Update or create user profile
func UpsertProfile(db *sql.DB, profile UserProfile) error {
	query := `
    INSERT INTO user_profiles (user_id, phone_number, gender, province)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(user_id) DO UPDATE SET
        phone_number = excluded.phone_number,
        gender = excluded.gender,
        province = excluded.province;`

	_, err := db.Exec(query,
		profile.UserID,
		profile.PhoneNumber,
		profile.Gender,
		profile.Province)
	return err
}

// Get user profile by user ID
func GetProfile(db *sql.DB, userID int) (UserProfile, error) {
	var profile UserProfile
	query := `
    SELECT id, user_id, phone_number, gender, province
    FROM user_profiles
    WHERE user_id = ?`

	err := db.QueryRow(query, userID).Scan(
		&profile.ID,
		&profile.UserID,
		&profile.PhoneNumber,
		&profile.Gender,
		&profile.Province)

	if err == sql.ErrNoRows {
		return UserProfile{UserID: userID}, nil
	}
	return profile, err
}

// SaveSchedule saves or updates the schedule in the database
/* func SaveSchedule(db *sql.DB, schedule Schedule) error {
	query := `
    INSERT INTO schedules (lighting_start, lighting_end, feeding_times, water_interval, temp_min, temp_max, hum_min, hum_max)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
        lighting_start = excluded.lighting_start,
        lighting_end = excluded.lighting_end,
        feeding_times = excluded.feeding_times,
        water_interval = excluded.water_interval,
        temp_min = excluded.temp_min,
        temp_max = excluded.temp_max,
        hum_min = excluded.hum_min,
        hum_max = excluded.hum_max;
    `

	// Convert feeding times array to a comma-separated string
	feedingTimes := strings.Join(schedule.Feeding, ",")

	_, err := db.Exec(query,
		schedule.Lighting.Start,
		schedule.Lighting.End,
		feedingTimes,
		schedule.WaterInterval,
		schedule.TempThreshold.Min,
		schedule.TempThreshold.Max,
		schedule.HumThreshold.Min,
		schedule.HumThreshold.Max,
	)

	return err
}

// GetSchedule retrieves the schedule from the database
func GetSchedule(db *sql.DB) (Schedule, error) {
	var schedule Schedule
	query := `
    SELECT lighting_start, lighting_end, feeding_times, water_interval, temp_min, temp_max, hum_min, hum_max
    FROM schedules
    LIMIT 1
    `

	var feedingTimes string
	err := db.QueryRow(query).Scan(
		&schedule.Lighting.Start,
		&schedule.Lighting.End,
		&feedingTimes,
		&schedule.WaterInterval,
		&schedule.TempThreshold.Min,
		&schedule.TempThreshold.Max,
		&schedule.HumThreshold.Min,
		&schedule.HumThreshold.Max,
	)

	if err == sql.ErrNoRows {
		// Return an empty schedule if no rows exist
		return schedule, nil
	} else if err != nil {
		return schedule, err
	}

	// Convert feeding times string back to an array
	schedule.Feeding = strings.Split(feedingTimes, ",")

	return schedule, nil
} */
