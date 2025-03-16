package database

import (
	"database/sql"
	"log"
)

type UserProfile struct {
	ID          int    `json:"id"`
	UserID      int    `json:"user_id"`
	FullName    string `json:"full_name"`
	PhoneNumber string `json:"phone_number"`
	Gender      string `json:"gender"`
	Province    string `json:"province"`
}

// Initialize profiles table
func InitProfileDB(db *sql.DB) error {
	createProfilesTable := `
	CREATE TABLE IF NOT EXISTS user_profiles (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		user_id INTEGER UNIQUE,
		full_name TEXT,
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
	INSERT INTO user_profiles (user_id, full_name, phone_number, gender, province)
	VALUES (?, ?, ?, ?, ?)
	ON CONFLICT(user_id) DO UPDATE SET
		full_name = excluded.full_name,
		phone_number = excluded.phone_number,
		gender = excluded.gender,
		province = excluded.province;`

	_, err := db.Exec(query,
		profile.UserID,
		profile.FullName,
		profile.PhoneNumber,
		profile.Gender,
		profile.Province)
	return err
}

// Get user profile by user ID
func GetProfile(db *sql.DB, userID int) (UserProfile, error) {
	var profile UserProfile
	query := `
	SELECT id, user_id, full_name, phone_number, gender, province
	FROM user_profiles
	WHERE user_id = ?`

	err := db.QueryRow(query, userID).Scan(
		&profile.ID,
		&profile.UserID,
		&profile.FullName,
		&profile.PhoneNumber,
		&profile.Gender,
		&profile.Province)

	if err == sql.ErrNoRows {
		return UserProfile{UserID: userID}, nil
	}
	return profile, err
}
