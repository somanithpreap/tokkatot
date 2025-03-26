package main

import (
	"log"
	"os"

	"middleware/api"
	"middleware/database"

	"github.com/gofiber/fiber/v2"
)

func main() {
	app := fiber.New()

	// Initialize database
	api.DB = database.InitDB()

	// Serve static files
	app.Static("/assets", "../frontend/assets")
	app.Static("/components", "../frontend/components")
	app.Static("/css", "../frontend/css")
	app.Static("/js", "../frontend/js")

	// Authentication and static page routes
	app.Get("/login", func(c *fiber.Ctx) error {
		if api.ValidateCookie(c) == nil {
			return c.Redirect("/")
		}
		return c.SendFile("../frontend/pages/login.html")
	})

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

	// User authentication routes
	app.Post("/register", api.RegisterHandler)
	app.Post("/login", api.LoginHandler)

	// API routes (protected by authentication)
	apiRoutes := app.Group("/api", func(c *fiber.Ctx) error {
		if api.ValidateCookie(c) != nil {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized access"})
		}
		return c.Next()
	})

	// Profile routes
	apiRoutes.Get("/profile", api.GetProfileHandler)
	apiRoutes.Post("/profile", api.UpdateProfileHandler)

	// Poultry system sensor data retrieval
	apiRoutes.Get("/get-initial-state", api.GetInitialStateHandler)
	apiRoutes.Get("/get-current-data", api.GetCurrentDataHandler)
	apiRoutes.Get("/get-historical-data", api.GetHistoricalDataHandler)

	// Poultry system control routes
	apiRoutes.Get("/toggle-auto", api.ToggleAutoHandler)
	apiRoutes.Get("/toggle-fan", api.ToggleFanHandler)
	apiRoutes.Get("/toggle-bulb", api.ToggleBulbHandler)
	apiRoutes.Get("/toggle-feeder", api.ToggleFeederHandler)
	apiRoutes.Get("/toggle-water", api.ToggleWaterHandler)

	// Schedule management routes
	apiRoutes.Post("/schedule", api.SaveScheduleHandler)      // Save schedule
	apiRoutes.Get("/toggle-schedule", api.GetScheduleHandler) // Retrieve schedule

	// 404 Handler
	app.Use(func(c *fiber.Ctx) error {
		return c.Status(fiber.StatusNotFound).SendFile("../frontend/pages/404.html")
	})

	// Close the database connection when the application shuts down
	defer api.DB.Close()

	// Start the server
	log.Println("Server is running on port 4000")
	log.Fatal(app.ListenTLS(":4000", os.Getenv("TLS_CERT"), os.Getenv("TLS_KEY")))
}
