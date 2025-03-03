package main

import (
	"database/sql"
	"encoding/json"
	"log"
	"regexp"
	"sync"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/websocket/v2"
	"github.com/golang-jwt/jwt/v4"
	"golang.org/x/crypto/bcrypt"

	_ "github.com/mattn/go-sqlite3"
)

var db *sql.DB                                 // Database connection
var clients = make(map[string]*websocket.Conn) // Keep track of connected WebSocket clients
var mutex = sync.Mutex{}                       // Prevent data issues when multiple clients connect
var secretKey = []byte("your_secret_key")      // Secret key for JWT token

// ====== STRUCT FOR DATABASE & MESSAGES ====== //
type User struct {
	ID       int    `json:"id"`
	Username string `json:"username"`
	Password string `json:"password"`
	Key      string `json:"key"` // Registration Key for product verification
}

type Message struct {
	Type    string `json:"type"`    // Message type
	Payload string `json:"payload"` // Data sent in message
}

// ====== INITIALIZE DATABASE ====== //
func initDB() {
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
		password TEXT NOT NULL,
		key TEXT NOT NULL
	);
	`

	_, err = db.Exec(createUsersTable)
	if err != nil {
		log.Fatal("Error creating users table:", err)
	}
	log.Println("Tables created successfully")
}

// ====== AUTHENTICATION FUNCTIONS ====== //
// Encrypt password before storing in the database
func HashPassword(password string) (string, error) {
	hashed, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	return string(hashed), err
}

// Check if the entered password matches the stored hashed password
func CheckPassword(hashed, password string) error {
	return bcrypt.CompareHashAndPassword([]byte(hashed), []byte(password))
}

// Middleware to check if the user is logged in
func ValidateCookieMiddleware(c *fiber.Ctx) error {
	cookie := c.Cookies("token")
	if cookie == "" {
		// Redirect to sign-up page if no token
		return c.Redirect("/signup")
	}
	return c.Next() // Continue to the requested page
}

// ====== REGISTER USER ====== //
func RegisterHandler(c *fiber.Ctx) error {
	username := c.FormValue("username")
	password := c.FormValue("password")
	regKey := c.FormValue("key") // User must provide a product key

	// Validate username (only letters, numbers, and underscores allowed)
	validUsername := regexp.MustCompile(`^[a-zA-Z0-9_]+$`)
	if !validUsername.MatchString(username) {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid username. Only letters, numbers, and underscores are allowed"})
	}

	// Ensure password is at least 8 characters long
	if len(password) < 8 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Password must be at least 8 characters"})
	}

	// Check if username exists
	var exists bool
	err := db.QueryRow("SELECT EXISTS(SELECT 1 FROM users WHERE username = ?)", username).Scan(&exists)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Database error"})
	}
	if exists {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Username already taken"})
	}

	// Hash password
	hashedPassword, err := HashPassword(password)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to hash password"})
	}

	// Store user in database
	_, err = db.Exec("INSERT INTO users (username, password, key) VALUES (?, ?, ?)", username, hashedPassword, regKey)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to register"})
	}

	// Redirect to home page after successful signup
	return c.Redirect("/home")
}

// ====== LOGIN USER ====== //
func LoginHandler(c *fiber.Ctx) error {
	username := c.FormValue("username")
	password := c.FormValue("password")

	var hashedPassword string
	err := db.QueryRow("SELECT password FROM users WHERE username = ?", username).Scan(&hashedPassword)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Invalid username or password"})
	}

	// Check if password matches
	if err := CheckPassword(hashedPassword, password); err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Invalid username or password"})
	}

	// Generate JWT token
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"client_id": username,
		"exp":       time.Now().Add(time.Hour * 1).Unix(),
	})

	signedToken, err := token.SignedString(secretKey)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to generate token"})
	}

	// Set token in cookie
	c.Cookie(&fiber.Cookie{
		Name:     "token",
		Value:    signedToken,
		Expires:  time.Now().Add(time.Hour * 1),
		HTTPOnly: true,
	})

	// Redirect to home page after successful login
	return c.Redirect("/home")
}

// ====== HANDLE WEBSOCKET CONNECTIONS ====== //
func handleWebSocket(c *websocket.Conn) {
	defer c.Close()

	clientID := validateToken(c)
	if clientID == "" {
		log.Println("Unauthorized client")
		c.WriteMessage(websocket.CloseMessage, websocket.FormatCloseMessage(websocket.ClosePolicyViolation, "Invalid token"))
		return
	}

	mutex.Lock()
	clients[clientID] = c
	mutex.Unlock()

	for {
		_, msg, err := c.ReadMessage()
		if err != nil {
			break
		}

		var receivedMsg Message
		err = json.Unmarshal(msg, &receivedMsg)
		if err != nil {
			continue
		}

		// Handle different message types
		switch receivedMsg.Type {
		case "ping":
			sendMessage(c, Message{Type: "pong", Payload: "alive"})
		}

	}
	mutex.Lock()
	delete(clients, clientID)
	mutex.Unlock()
}

// Send a message to a WebSocket client
func sendMessage(c *websocket.Conn, msg Message) {
	responseJSON, _ := json.Marshal(msg)
	_ = c.WriteMessage(websocket.TextMessage, responseJSON)
}

// Validate JWT token for WebSocket connections
func validateToken(c *websocket.Conn) string {
	return ""
}

// ====== SETUP ROUTES & START SERVER ====== //
func main() {
	initDB()
	defer db.Close()

	app := fiber.New()

	// User authentication routes
	app.Post("/register", RegisterHandler)
	app.Post("/login", LoginHandler)

	// WebSocket route
	app.Get("/ws", websocket.New(handleWebSocket))

	// Protected route
	api := app.Group("/api", ValidateCookieMiddleware)
	api.Get("/protected", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{"message": "Access granted"})
	})

	// Home page route
	app.Get("/home", func(c *fiber.Ctx) error {
		return c.SendString("Welcome to the Home Page")
	})

	log.Println("Server is running on port 3000")
	log.Fatal(app.Listen(":3000"))
}
