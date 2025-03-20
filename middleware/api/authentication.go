package api

import (
	"errors"
	"fmt"
	"log"
	"os"
	"regexp"
	"time"

	"middleware/database"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v4"
	"golang.org/x/crypto/bcrypt"
)

var DB = database.InitDB()
var LegalCharacters = regexp.MustCompile(`^[\p{L}\p{N}\p{M}\p{Zs}\p{Pd}\p{Pe}\p{Ps}\p{Pi}\p{Pf}]+$`)

func GetSecret() []byte {
	secret := os.Getenv("JWT_SECRET")
	if secret == "" {
		log.Fatal("JWT_SECRET environment variable not set")
	}
	return []byte(secret)
}

func GetRegKey() string {
	regKey := os.Getenv("REG_KEY")
	if regKey == "" {
		log.Fatal("REG_KEY environment variable not set")
	}
	return regKey
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

func GenerateToken(username string, expire time.Time) (string, error) {
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"client_id": username,
		"exp":       expire.Unix(),
	})

	signedToken, err := token.SignedString(GetSecret())
	return signedToken, err
}

const expiration = 6 * 30 * 24 * time.Hour // 6 months

func SetCookie(c **fiber.Ctx, username string, expire time.Time) error {
	// Generate JWT token
	expire = time.Now().Add(expiration)
	signedToken, err := GenerateToken(username, expire)
	if err != nil {
		return (*c).Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to generate token"})
	}

	// Set token in cookie
	(*c).Cookie(&fiber.Cookie{
		Name:    "token",
		Value:   signedToken,
		Expires: expire, // 6 months
	})
	return nil
}

func ValidateToken(raw_token string) string {
	if raw_token == "" {
		return ""
	}

	token, err := jwt.Parse(raw_token, func(token *jwt.Token) (interface{}, error) {
		// Ensure the signing method is HMAC
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("Unexpected signing method")
		}
		return GetSecret(), nil
	})

	if err != nil {
		return ""
	}

	// Extract claims if token is valid
	if claims, ok := token.Claims.(jwt.MapClaims); ok && token.Valid {
		return claims["client_id"].(string)
	}
	return ""
}

// Check if the user is logged in
func ValidateCookie(c *fiber.Ctx) error {
	// Parse and validate the token
	cookie := c.Cookies("token")
	validToken := ValidateToken(cookie)
	if validToken == "" {
		return errors.New("Token is not set or invalid")
	}
	return nil
}

// ====== REGISTER USER ====== //
func RegisterHandler(c *fiber.Ctx) error {
	if ValidateCookie(c) == nil {
		return c.Redirect("/login")
	}

	username := c.FormValue("username")
	password := c.FormValue("password")
	regKey := c.FormValue("key") // User must provide a product key

	// Validate username
	if !LegalCharacters.MatchString(username) {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid username"})
	}

	// Ensure password is at least 8 characters long
	if len(password) < 8 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Password must be at least 8 characters"})
	}

	// Check if username exists
	var exists bool
	err := DB.QueryRow("SELECT EXISTS(SELECT 1 FROM users WHERE username = ?)", username).Scan(&exists)
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

	// Check if registration key is valid
	if regKey != GetRegKey() {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid registration key"})
	}

	// Store user in database
	_, err = DB.Exec("INSERT INTO users (username, password) VALUES (?, ?)", username, hashedPassword)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to register"})
	}

	SetCookie(&c, username, time.Now().Add(expiration))

	return c.Redirect("/", fiber.StatusOK)
}

// ====== LOGIN USER ====== //
func LoginHandler(c *fiber.Ctx) error {
	if ValidateCookie(c) == nil {
		return c.Redirect("/")
	}

	username := c.FormValue("username")
	password := c.FormValue("password")

	var hashedPassword string
	err := DB.QueryRow("SELECT password FROM users WHERE username = ?", username).Scan(&hashedPassword)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Invalid username"})
	}

	// Check if password matches
	if err := CheckPassword(hashedPassword, password); err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Invalid password"})
	}

	SetCookie(&c, username, time.Now().Add(expiration))

	return c.Redirect("/", fiber.StatusOK)
}
