package main

import (
	"log"
	"os"

	"middleware/authentication"

	"github.com/gofiber/fiber/v2"
)

// ====== SETUP ROUTES & START SERVER ====== //
func main() {
	app := fiber.New()

	// Serve static files
	app.Static("/assets", "../frontend/assets")
	app.Static("/components", "../frontend/components")
	app.Static("/css", "../frontend/css")
	app.Static("/js", "../frontend/js")

	// Home page route
	app.Get("/", func(c *fiber.Ctx) error {
		if authentication.ValidateCookie(c) != nil {
			return c.SendFile("../frontend/pages/login.html")
		}
		return c.SendFile("../frontend/pages/index.html")
	})

	app.Get("/signup", func(c *fiber.Ctx) error {
		if authentication.ValidateCookie(c) == nil {
			return c.Redirect("/")
		}
		return c.SendFile("../frontend/pages/signup.html")
	})

	app.Static("/dashboard", "../frontend/pages/dashboard.html")
	app.Static("/settings", "../frontend/pages/settings.html")

	// User authentication routes
	app.Post("/register", authentication.RegisterHandler)
	app.Post("/login", authentication.LoginHandler)

	// Protected route
	backend := app.Group("/backend", func(c *fiber.Ctx) error {
		if authentication.ValidateCookie(c) != nil {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized access"})
		}
		return nil
	})
	backend.Get("/test", func(c *fiber.Ctx) error {
		return c.SendString("You have accessed the backend route!")
	})

	defer authentication.DB.Close()

	log.Println("Server is running on port 5500")
	log.Fatal(app.ListenTLS(":5500", os.Getenv("TLS_CERT"), os.Getenv("TLS_KEY")))
}
