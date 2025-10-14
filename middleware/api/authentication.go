package api

import (
	"database/sql"
	"errors"
	"fmt"
	"log"
	"os"
	"regexp"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v4"
	"golang.org/x/crypto/bcrypt"
)

// Global variables
var (
	DB                *sql.DB
	LegalCharacters   = regexp.MustCompile(`^[\p{L}\p{N}\p{M}\p{Zs}\p{Pd}\p{Pe}\p{Ps}\p{Pi}\p{Pf}]+$`)
	TokenExpiration   = 6 * 30 * 24 * time.Hour // 6 months
	MinPasswordLength = 8
	CookieName        = "token"
)

// Authentication error messages
const (
	ErrInvalidUsername    = "Invalid username format"
	ErrPasswordTooShort   = "Password must be at least 8 characters"
	ErrUsernameExists     = "Username already taken"
	ErrInvalidCredentials = "Invalid username or password"
	ErrInvalidRegKey      = "Invalid registration key"
	ErrTokenGeneration    = "Failed to generate token"
	ErrPasswordHashing    = "Failed to hash password"
	ErrDatabaseError      = "Database error occurred"
	ErrTokenInvalid       = "Token is not set or invalid"
)

// getJWTSecret retrieves the JWT secret from environment variables
func getJWTSecret() []byte {
	secret := os.Getenv("JWT_SECRET")
	if secret == "" {
		log.Fatal("JWT_SECRET environment variable not set")
	}
	return []byte(secret)
}

// getRegistrationKey retrieves the registration key from environment variables
func getRegistrationKey() string {
	regKey := os.Getenv("REG_KEY")
	if regKey == "" {
		log.Fatal("REG_KEY environment variable not set")
	}
	return regKey
}

// ==================== AUTHENTICATION FUNCTIONS ====================

// HashPassword encrypts a password using bcrypt before storing in database
func HashPassword(password string) (string, error) {
	hashed, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	return string(hashed), err
}

// CheckPassword verifies if the entered password matches the stored hashed password
func CheckPassword(hashedPassword, password string) error {
	return bcrypt.CompareHashAndPassword([]byte(hashedPassword), []byte(password))
}

// GenerateToken creates a new JWT token for the given username
func GenerateToken(username string, expireTime time.Time) (string, error) {
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"client_id": username,
		"exp":       expireTime.Unix(),
	})

	return token.SignedString(getJWTSecret())
}

// SetAuthCookie sets the authentication cookie with a JWT token
func SetAuthCookie(c *fiber.Ctx, username string) error {
	expireTime := time.Now().Add(TokenExpiration)

	// Generate JWT token
	signedToken, err := GenerateToken(username, expireTime)
	if err != nil {
		return err
	}

	// Set secure cookie
	c.Cookie(&fiber.Cookie{
		Name:     CookieName,
		Value:    signedToken,
		Expires:  expireTime,
		HTTPOnly: true,
		Secure:   false, // Set to true in production with HTTPS
		SameSite: "Lax",
	})

	return nil
}

// ValidateToken validates a JWT token and returns the username if valid
func ValidateToken(tokenString string) string {
	if tokenString == "" {
		return ""
	}

	token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
		// Ensure the signing method is HMAC
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return getJWTSecret(), nil
	})

	if err != nil {
		return ""
	}

	// Extract claims if token is valid
	if claims, ok := token.Claims.(jwt.MapClaims); ok && token.Valid {
		if clientID, exists := claims["client_id"]; exists {
			return clientID.(string)
		}
	}

	return ""
}

// ValidateCookie checks if the user has a valid authentication cookie
func ValidateCookie(c *fiber.Ctx) error {
	cookie := c.Cookies(CookieName)
	username := ValidateToken(cookie)

	if username == "" {
		return errors.New(ErrTokenInvalid)
	}

	return nil
}

// ==================== HTTP HANDLERS ====================

// RegisterHandler handles user registration requests
func RegisterHandler(c *fiber.Ctx) error {
	// Redirect if already authenticated
	if ValidateCookie(c) == nil {
		return c.Redirect("/")
	}

	// Extract form data
	username := c.FormValue("username")
	password := c.FormValue("password")
	regKey := c.FormValue("key")

	// Validate input
	if err := validateRegistrationInput(username, password, regKey); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	// Check if username already exists
	if exists, err := checkUserExists(username); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": ErrDatabaseError,
		})
	} else if exists {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": ErrUsernameExists,
		})
	}

	// Hash password
	hashedPassword, err := HashPassword(password)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": ErrPasswordHashing,
		})
	}

	// Create user in database
	if err := createUser(username, hashedPassword); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to create user account",
		})
	}

	// Set authentication cookie
	if err := SetAuthCookie(c, username); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": ErrTokenGeneration,
		})
	}

	return c.Redirect("/")
}

// LoginHandler handles user login requests
func LoginHandler(c *fiber.Ctx) error {
	// Redirect if already authenticated
	if ValidateCookie(c) == nil {
		return c.Redirect("/")
	}

	// Extract form data
	username := c.FormValue("username")
	password := c.FormValue("password")

	// Validate credentials
	if err := validateCredentials(username, password); err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	// Set authentication cookie
	if err := SetAuthCookie(c, username); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": ErrTokenGeneration,
		})
	}

	return c.Redirect("/")
}

// ==================== VALIDATION FUNCTIONS ====================

// validateRegistrationInput validates user registration input
func validateRegistrationInput(username, password, regKey string) error {
	// Validate username format
	if !LegalCharacters.MatchString(username) {
		return errors.New(ErrInvalidUsername)
	}

	// Validate password length
	if len(password) < MinPasswordLength {
		return errors.New(ErrPasswordTooShort)
	}

	// Validate registration key
	if regKey != getRegistrationKey() {
		return errors.New(ErrInvalidRegKey)
	}

	return nil
}

// validateCredentials validates user login credentials
func validateCredentials(username, password string) error {
	// Get user's hashed password from database
	var hashedPassword string
	err := DB.QueryRow("SELECT password FROM users WHERE username = ?", username).Scan(&hashedPassword)
	if err != nil {
		if err == sql.ErrNoRows {
			return errors.New(ErrInvalidCredentials)
		}
		return errors.New(ErrDatabaseError)
	}

	// Check if password matches
	if err := CheckPassword(hashedPassword, password); err != nil {
		return errors.New(ErrInvalidCredentials)
	}

	return nil
}

// ==================== DATABASE FUNCTIONS ====================

// checkUserExists checks if a username already exists in the database
func checkUserExists(username string) (bool, error) {
	var exists bool
	err := DB.QueryRow("SELECT EXISTS(SELECT 1 FROM users WHERE username = ?)", username).Scan(&exists)
	return exists, err
}

// createUser creates a new user in the database
func createUser(username, hashedPassword string) error {
	_, err := DB.Exec("INSERT INTO users (username, password) VALUES (?, ?)", username, hashedPassword)
	return err
}
