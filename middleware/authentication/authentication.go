package authentication

import (
	"crypto/rand"
	"encoding/base64"
	"time"

	"github.com/gofiber/fiber/v2"
	jwtware "github.com/gofiber/jwt/v3"
	"github.com/golang-jwt/jwt/v4"
)

var SecretKey string

type LoginRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

func generateRandomSecret() (string, error) {
	b := make([]byte, 32)
	_, err := rand.Read(b)
	if err != nil {
		return "", err
	}
	return base64.StdEncoding.EncodeToString(b), nil
}

func LoginHandler(c *fiber.Ctx) error {
	// Parse request
	var req LoginRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request"})
	}

	// Check credentials
	if req.Username != "admin" || req.Password != "password" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Invalid credentials"})
	}

	// Generate JWT token
	token := jwt.New(jwt.SigningMethodHS256)
	claims := token.Claims.(jwt.MapClaims)
	claims["sub"] = req.Username
	claims["exp"] = time.Now().Add(time.Hour * 24).Unix()
	t, err := token.SignedString([]byte(SecretKey))
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not generate token"})
	}

	return c.JSON(fiber.Map{"token": t})
}

func Jwtware() fiber.Handler {
	return jwtware.New(jwtware.Config{
		SigningKey:   []byte(SecretKey),
		ErrorHandler: JwtErrorHandler,
	})
}

func JwtErrorHandler(c *fiber.Ctx, err error) error {
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}
	return c.Next()
}

func ProtectedHandler(c *fiber.Ctx) error {
	return c.JSON(fiber.Map{"message": "You have access to this protected route"})
}

func init() {
	secret, err := generateRandomSecret()
	if err != nil {
		panic(err)
	}
	SecretKey = secret
}
