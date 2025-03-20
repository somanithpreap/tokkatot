package main

import (
	"log"
	"os"

	"middleware/api"
	"middleware/database"

	"github.com/gofiber/fiber/v2"
)

// ====== SETUP ROUTES & START SERVER ====== //
func main() {
	app := fiber.New()

	// Initialize profile table
	if err := database.InitProfileDB(api.DB); err != nil {
		log.Fatal("Error initializing profile table:", err)
	}

	// Serve static files
	app.Static("/assets", "../frontend/assets")
	app.Static("/components", "../frontend/components")
	app.Static("/css", "../frontend/css")
	app.Static("/js", "../frontend/js")

	app.Get("/login", func(c *fiber.Ctx) error {
		if api.ValidateCookie(c) == nil {
			return c.Redirect("/")
		}
		return c.SendFile("../frontend/pages/login.html")
	})

	// Home page route
	app.Get("/", func(c *fiber.Ctx) error {
		if api.ValidateCookie(c) != nil {
			return c.Redirect("/login")
		}
		return c.SendFile("../frontend/pages/index.html")
	})

	app.Get("/register", func(c *fiber.Ctx) error {
		if api.ValidateCookie(c) == nil {
			return c.Redirect("/")
		}
		return c.SendFile("../frontend/pages/signup.html")
	})

	app.Get("/profile", func(c *fiber.Ctx) error {
		if api.ValidateCookie(c) != nil {
			return c.Redirect("/login")
		}
		return c.SendFile("../frontend/pages/profile.html")
	})

	app.Get("/settings", func(c *fiber.Ctx) error {
		if api.ValidateCookie(c) != nil {
			return c.Redirect("/login")
		}
		return c.SendFile("../frontend/pages/settings.html")
	})

	// User auth routes
	app.Post("/register", api.RegisterHandler)
	app.Post("/login", api.LoginHandler)

	// API routes require authentication and authorization
	api_routes := app.Group("/api", func(c *fiber.Ctx) error {
		if api.ValidateCookie(c) != nil {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized access"})
		}
		return c.Next()
	})

	// Add profile routes to protected backend group
	api_routes.Get("/profile", api.GetProfileHandler)
	api_routes.Post("/profile", api.UpdateProfileHandler)

	// Poultry system sensor data retrieval
	api_routes.Get("/get-initial-state", api.GetInitialStateHandler)
	api_routes.Get("/get-current-data", api.GetCurrentDataHandler)
	api_routes.Get("/get-historical-data", api.GetHistoricalDataHandler)

	// Poultry system control routes
	api_routes.Get("/toggle-auto", api.ToggleAutoHandler)
	api_routes.Get("/toggle-fan", api.ToggleFanHandler)
	api_routes.Get("/toggle-bulb", api.ToggleBulbHandler)
	api_routes.Get("/toggle-feeder", api.ToggleFeederHandler)
	api_routes.Get("/toggle-water", api.ToggleWaterHandler)

	// 404 Handler
	app.Use(func(c *fiber.Ctx) error {
		return c.Status(fiber.StatusNotFound).SendFile("../frontend/pages/404.html")
	})

	defer api.DB.Close()

	log.Println("Server is running on port 4000")
	log.Fatal(app.ListenTLS(":4000", os.Getenv("TLS_CERT"), os.Getenv("TLS_KEY")))
}
