package database

import (
	"database/sql"
	"log"

	_ "github.com/mattn/go-sqlite3"
)

type User struct {
	ID       int    `json:"id"`
	Username string `json:"username"`
	Password string `json:"password"`
}

// ====== INITIALIZE DATABASE ====== //
func InitDB() *sql.DB {
	var db *sql.DB // Database connection
	var err error
	db, err = sql.Open("sqlite3", "users.db")
	if err != nil {
		log.Fatal(err)
	}

	// Create Users table with username, password, and registration key
	log.Println("Database initialized at: users.db")

	createUsersTable := `
	CREATE TABLE IF NOT EXISTS users (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		username TEXT UNIQUE NOT NULL,
		password TEXT NOT NULL
	);
	`

	_, err = db.Exec(createUsersTable)
	if err != nil {
		log.Fatal("Error creating users table:", err)
	}
	log.Println("Tables created successfully")

	return db
}
