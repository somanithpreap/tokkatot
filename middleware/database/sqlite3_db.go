package database

import (
	"database/sql"
	"log"

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

// ====== INITIALIZE DATABASE ====== //
func InitDB() *sql.DB {
	var db *sql.DB // Database connection
	var err error
	db, err = sql.Open("sqlite3", "users.db")
	if err != nil {
		log.Fatal(err)
	}

	// Create Users table with username, password
	log.Println("Database initialized at: users.db")

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
	log.Println("Tables created successfully")

	// Initialize profiles table
	InitProfileDB(db)

	return db
}

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
