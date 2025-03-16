package main

import (
	"log"
	"os"

	"middleware/authentication"
	"middleware/database"

	"github.com/gofiber/fiber/v2"
)

// ====== SETUP ROUTES & START SERVER ====== //
func main() {
	app := fiber.New()

	// Initialize profile table
	if err := database.InitProfileDB(authentication.DB); err != nil {
		log.Fatal("Error initializing profile table:", err)
	}

	// Serve static files
	app.Static("/assets", "../frontend/assets")
	app.Static("/components", "../frontend/components")
	app.Static("/css", "../frontend/css")
	app.Static("/js", "../frontend/js")

	app.Get("/login", func(c *fiber.Ctx) error {
		if authentication.ValidateCookie(c) == nil {
			return c.Redirect("/")
		}
		return c.SendFile("../frontend/pages/login.html")
	})

	// Home page route
	app.Get("/", func(c *fiber.Ctx) error {
		if authentication.ValidateCookie(c) != nil {
			return c.Redirect("/login")
		}
		return c.SendFile("../frontend/pages/index.html")
	})

	app.Get("/register", func(c *fiber.Ctx) error {
		if authentication.ValidateCookie(c) == nil {
			return c.Redirect("/")
		}
		return c.SendFile("../frontend/pages/signup.html")
	})

	app.Get("/profile", func(c *fiber.Ctx) error {
		if authentication.ValidateCookie(c) != nil {
			return c.Redirect("/login")
		}
		return c.SendFile("../frontend/pages/profile.html")
	})

	/*
		app.Get("/das hboard", func(c *fiber.Ctx) error {
			if authentication.ValidateCookie(c) == nil {
				return c.SendFile("../frontend/pages/dashboard.html")
			}
			return c.Redirect("/login")
		})
	*/
	app.Get("/settings", func(c *fiber.Ctx) error {
		if authentication.ValidateCookie(c) != nil {
			return c.Redirect("/login")
		}
		return c.SendFile("../frontend/pages/settings.html")
	})

	// User authentication routes
	app.Post("/register", authentication.RegisterHandler)
	app.Post("/login", authentication.LoginHandler)

	// Protected routes
	backend := app.Group("/backend", func(c *fiber.Ctx) error {
		if authentication.ValidateCookie(c) != nil {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized access"})
		}
		return c.Next()
	})

	// Add profile routes to protected backend group
	backend.Get("/profile", authentication.GetProfileHandler)
	backend.Post("/profile", authentication.UpdateProfileHandler)

	backend.Get("/test", func(c *fiber.Ctx) error {
		return c.SendString("You have accessed the backend route!")
	})

	// 404 Handler
	app.Use(func(c *fiber.Ctx) error {
		return c.Status(fiber.StatusNotFound).SendFile("../frontend/pages/404.html")
	})

	defer authentication.DB.Close()

	// app.Get("/ws", websocket.New(websocket.handleWebSocket))

	log.Println("Server is running on port 4000")
	log.Fatal(app.ListenTLS(":4000", os.Getenv("TLS_CERT"), os.Getenv("TLS_KEY")))
}
