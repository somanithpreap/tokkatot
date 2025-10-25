package api

import (
	"middleware/database"

	"github.com/gofiber/fiber/v2"
)

func GetProfileHandler(c *fiber.Ctx) error {
	// Get username from token
	cookie := c.Cookies("token")
	username := ValidateToken(cookie)
	if username == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Unauthorized access",
		})
	}

	// Get user ID from username
	var userID int
	err := DB.QueryRow("SELECT id FROM users WHERE username = ?", username).Scan(&userID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Error fetching user",
		})
	}

	// Get user profile from database
	profile, err := database.GetProfile(DB, userID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Error fetching profile",
		})
	}

	return c.JSON(profile)
}

func UpdateProfileHandler(c *fiber.Ctx) error {
	// Get username from token
	cookie := c.Cookies("token")
	username := ValidateToken(cookie)
	if username == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Unauthorized access",
		})
	}

	// Get user ID from username
	var userID int
	err := DB.QueryRow("SELECT id FROM users WHERE username = ?", username).Scan(&userID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Error fetching user",
		})
	}

	// Parse request body
	var profile database.UserProfile
	if err := c.BodyParser(&profile); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	// Set the user ID from the token
	profile.UserID = userID

	// Update profile in database
	if err := database.UpsertProfile(DB, profile); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Error updating profile",
		})
	}

	return c.JSON(fiber.Map{
		"message": "Profile updated successfully",
	})
}
