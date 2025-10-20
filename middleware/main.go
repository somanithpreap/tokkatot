package main

import (
	"log"
	"os"
	"path/filepath"

	"middleware/api"
	"middleware/database"

	"github.com/gofiber/fiber/v2"
	"github.com/joho/godotenv"
)

func main() {
	// Initialize configuration and environment
	loadEnvironmentVariables()
	frontendPath := setupFrontendPath()

	// Initialize Fiber app with middleware
	app := setupFiberApp()

	// Initialize database
	api.DB = database.InitDB()
	defer api.DB.Close()

	// Setup static file serving
	setupStaticRoutes(app, frontendPath)

	// Setup page routes
	setupPageRoutes(app, frontendPath)

	// Setup authentication routes
	setupAuthRoutes(app)

	// Setup API routes
	setupAPIRoutes(app)

	// Setup 404 handler
	setup404Handler(app)

	// Start the server
	startServer(app)
}

// loadEnvironmentVariables loads environment variables from .env file
func loadEnvironmentVariables() {
	currentDir, _ := os.Getwd()
	var envPath string

	if filepath.Base(currentDir) == "middleware" {
		envPath = ".env"
	} else {
		envPath = "middleware/.env"
	}

	if err := godotenv.Load(envPath); err != nil {
		log.Printf("No .env file found at %s, using system environment variables", envPath)
	} else {
		log.Printf("Environment variables loaded from %s", envPath)
	}
}

// setupFrontendPath determines and validates the frontend directory path
func setupFrontendPath() string {
	currentDir, err := os.Getwd()
	if err != nil {
		log.Fatal("Could not get current working directory:", err)
	}

	log.Printf("Current working directory: %s", currentDir)

	var frontendPath string
	if filepath.Base(currentDir) == "middleware" {
		// We're in middleware, go up one level to tokkatot, then into frontend
		frontendPath = filepath.Join(filepath.Dir(currentDir), "frontend")
	} else {
		// We're likely in the tokkatot directory already, just add frontend
		frontendPath = filepath.Join(currentDir, "frontend")
	}

	// Verify the path exists
	if _, err := os.Stat(frontendPath); os.IsNotExist(err) {
		log.Fatalf("Frontend directory not found at: %s", frontendPath)
	}

	log.Printf("Frontend path resolved to: %s", frontendPath)
	return frontendPath
}

// setupFiberApp initializes Fiber app with common middleware
func setupFiberApp() *fiber.App {
	app := fiber.New(fiber.Config{
		ErrorHandler: func(c *fiber.Ctx, err error) error {
			code := fiber.StatusInternalServerError
			if e, ok := err.(*fiber.Error); ok {
				code = e.Code
			}
			return c.Status(code).JSON(fiber.Map{
				"error": err.Error(),
				"code":  code,
			})
		},
	})

	return app
}

// setupStaticRoutes configures static file serving
func setupStaticRoutes(app *fiber.App, frontendPath string) {
	app.Static("/assets", filepath.Join(frontendPath, "assets"))
	app.Static("/components", filepath.Join(frontendPath, "components"))
	app.Static("/css", filepath.Join(frontendPath, "css"))
	app.Static("/js", filepath.Join(frontendPath, "js"))
}

// setupPageRoutes configures page routes with authentication checks
func setupPageRoutes(app *fiber.App, frontendPath string) {
	// Login page - redirect if already authenticated
	app.Get("/login", func(c *fiber.Ctx) error {
		if api.ValidateCookie(c) == nil {
			return c.Redirect("/")
		}
		return c.SendFile(filepath.Join(frontendPath, "pages", "login.html"))
	})

	// Home page - require authentication
	app.Get("/", func(c *fiber.Ctx) error {
		if api.ValidateCookie(c) != nil {
			return c.Redirect("/login")
		}
		return c.SendFile(filepath.Join(frontendPath, "pages", "index.html"))
	})

	// Registration page - redirect if already authenticated
	app.Get("/register", func(c *fiber.Ctx) error {
		if api.ValidateCookie(c) == nil {
			return c.Redirect("/")
		}
		return c.SendFile(filepath.Join(frontendPath, "pages", "signup.html"))
	})

	// Disease detection page - require authentication
	app.Get("/disease-detection", func(c *fiber.Ctx) error {
		if api.ValidateCookie(c) != nil {
			return c.Redirect("/login")
		}
		return c.SendFile(filepath.Join(frontendPath, "pages", "disease-detection.html"))
	})

	// Profile page - require authentication
	app.Get("/profile", func(c *fiber.Ctx) error {
		if api.ValidateCookie(c) != nil {
			return c.Redirect("/login")
		}
		return c.SendFile(filepath.Join(frontendPath, "pages", "profile.html"))
	})

	// Settings page - require authentication
	app.Get("/settings", func(c *fiber.Ctx) error {
		if api.ValidateCookie(c) != nil {
			return c.Redirect("/login")
		}
		return c.SendFile(filepath.Join(frontendPath, "pages", "settings.html"))
	})
}

// setupAuthRoutes configures authentication routes
func setupAuthRoutes(app *fiber.App) {
	app.Post("/register", api.RegisterHandler)
	app.Post("/login", api.LoginHandler)

	// Logout route
	app.Post("/logout", func(c *fiber.Ctx) error {
		c.ClearCookie("token")
		return c.Redirect("/login")
	})
}

// setupAPIRoutes configures protected API routes
func setupAPIRoutes(app *fiber.App) {
	// API routes with authentication middleware
	apiRoutes := app.Group("/api", func(c *fiber.Ctx) error {
		if api.ValidateCookie(c) != nil {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error":   "Unauthorized access",
				"message": "Please login to access this resource",
			})
		}
		return c.Next()
	})

	// User profile management
	apiRoutes.Get("/profile", api.GetProfileHandler)
	apiRoutes.Post("/profile", api.UpdateProfileHandler)

	// IoT sensor data endpoints
	apiRoutes.Get("/get-initial-state", api.GetInitialStateHandler)
	apiRoutes.Get("/get-current-data", api.GetCurrentDataHandler)
	apiRoutes.Get("/get-historical-data", api.GetHistoricalDataHandler)

	// IoT device control endpoints
	apiRoutes.Get("/toggle-auto", api.ToggleAutoHandler)
	apiRoutes.Get("/toggle-belt", api.ToggleBeltHandler)
	apiRoutes.Get("/toggle-fan", api.ToggleFanHandler)
	apiRoutes.Get("/toggle-bulb", api.ToggleBulbHandler)
	apiRoutes.Get("/toggle-feeder", api.ToggleFeederHandler)
	apiRoutes.Get("/toggle-water", api.ToggleWaterHandler)

	// AI disease detection endpoints
	apiRoutes.Get("/ai/health", api.AIHealthCheckHandler)
	apiRoutes.Post("/ai/predict-disease", api.PredictDiseaseHandler)
	apiRoutes.Get("/ai/disease-info", api.GetDiseaseInfoHandler)

	// Future: Schedule management endpoints
	// apiRoutes.Post("/schedule", api.SaveScheduleHandler)
	// apiRoutes.Get("/schedule", api.GetScheduleHandler)
}

// setup404Handler configures the 404 error handler
func setup404Handler(app *fiber.App) {
	app.Use(func(c *fiber.Ctx) error {
		return c.Status(fiber.StatusNotFound).SendFile("../frontend/pages/404.html")
	})
}

// startServer starts the HTTP server
func startServer(app *fiber.App) {
	port := os.Getenv("PORT")
	if port == "" {
		port = "4000"
	}

	log.Printf("🚀 Server starting on port %s", port)
	log.Fatal(app.Listen(":" + port))
}
