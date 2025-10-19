package api

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"os"
	"time"

	"github.com/gofiber/fiber/v2"
)

// ==================== AI SERVICE CONFIGURATION ====================

// AI Service Configuration
var (
	aiServiceURL = getAIServiceURL()
	aiClient     = &http.Client{Timeout: 30 * time.Second}
)

// AI Service endpoints
const (
	aiHealthEndpoint  = "/health"
	aiPredictEndpoint = "/predict"
)

// File validation constants
const (
	maxFileSize = 10 * 1024 * 1024 // 10MB
)

// Supported image content types
var validImageTypes = []string{
	"image/jpeg",
	"image/jpg",
	"image/png",
	"image/webp",
}

// Error messages
const (
	ErrAIServiceUnavailable = "AI service is currently unavailable"
	ErrInvalidImageFile     = "Invalid image file"
	ErrFileTooLarge         = "File size too large (max 10MB)"
	ErrNoImageProvided      = "No image file provided"
	ErrImageProcessing      = "Failed to process image"
)

// getAIServiceURL retrieves AI service URL from environment
func getAIServiceURL() string {
	url := os.Getenv("AI_SERVICE_URL")
	if url == "" {
		return "http://10.0.0.1:5000" // Default AI service URL to match your Python app
	}
	return url
}

// ==================== DATA STRUCTURES ====================

// DiseasePrediction represents the AI model's prediction result
type DiseasePrediction struct {
	PredictedDisease string             `json:"predicted_disease"`
	Confidence       float64            `json:"confidence"`
	AllProbabilities map[string]float64 `json:"all_probabilities"`
	IsHealthy        bool               `json:"is_healthy"`
	Recommendation   string             `json:"recommendation"`
}

// PredictionResponse represents the complete API response
type PredictionResponse struct {
	Success    bool              `json:"success"`
	Prediction DiseasePrediction `json:"prediction"`
	Timestamp  string            `json:"timestamp"`
	Error      string            `json:"error,omitempty"`
}

// AIHealthStatus represents AI service health information
type AIHealthStatus struct {
	Status      string `json:"status"`
	ModelLoaded bool   `json:"model_loaded"`
	Version     string `json:"version,omitempty"`
}

// ==================== HTTP HANDLERS ====================

// AIHealthCheckHandler checks the health status of the AI service
func AIHealthCheckHandler(c *fiber.Ctx) error {
	// Validate user authentication
	if err := ValidateCookie(c); err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Authentication required",
		})
	}

	// Check AI service health
	url := aiServiceURL + aiHealthEndpoint
	resp, err := aiClient.Get(url)
	if err != nil {
		return c.Status(fiber.StatusServiceUnavailable).JSON(fiber.Map{
			"error":   ErrAIServiceUnavailable,
			"details": err.Error(),
		})
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return c.Status(fiber.StatusServiceUnavailable).JSON(fiber.Map{
			"error":   ErrAIServiceUnavailable,
			"details": fmt.Sprintf("AI service returned status %d", resp.StatusCode),
		})
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error":   "Failed to read AI service response",
			"details": err.Error(),
		})
	}

	var healthStatus AIHealthStatus
	if err := json.Unmarshal(body, &healthStatus); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error":   "Failed to parse AI service response",
			"details": err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"data":    healthStatus,
	})
}

// PredictDiseaseHandler processes image upload and returns disease prediction
func PredictDiseaseHandler(c *fiber.Ctx) error {
	// Validate user authentication
	if err := ValidateCookie(c); err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Authentication required",
		})
	}

	// Get uploaded file
	file, err := c.FormFile("image")
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": ErrNoImageProvided,
			"hint":  "Please upload an image file using the 'image' form field",
		})
	}

	// Validate file
	if err := validateImageFile(file); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	// Process image and get prediction
	prediction, err := processImageForPrediction(file)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error":   ErrImageProcessing,
			"details": err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"data":    prediction,
	})
}

// ==================== HELPER FUNCTIONS ====================

// validateImageFile validates the uploaded image file
func validateImageFile(file *multipart.FileHeader) error {
	// Check file size
	if file.Size > maxFileSize {
		return fmt.Errorf("file size too large (max 10MB)")
	}

	// Check content type
	contentType := file.Header.Get("Content-Type")
	if !isValidImageType(contentType) {
		return fmt.Errorf("invalid image file: %s", contentType)
	}

	return nil
}

// isValidImageType checks if the content type is a valid image type
func isValidImageType(contentType string) bool {
	for _, validType := range validImageTypes {
		if contentType == validType {
			return true
		}
	}
	return false
}

// processImageForPrediction sends image to AI service and returns prediction
func processImageForPrediction(file *multipart.FileHeader) (*PredictionResponse, error) {
	// Open the uploaded file
	src, err := file.Open()
	if err != nil {
		return nil, fmt.Errorf("failed to open uploaded file: %v", err)
	}
	defer src.Close()

	// Create multipart form data
	var buf bytes.Buffer
	writer := multipart.NewWriter(&buf)

	// Create form file field
	fw, err := writer.CreateFormFile("image", file.Filename)
	if err != nil {
		return nil, fmt.Errorf("failed to create form data: %v", err)
	}

	// Copy file content
	if _, err := io.Copy(fw, src); err != nil {
		return nil, fmt.Errorf("failed to copy file data: %v", err)
	}

	// Close the writer to finalize the form
	writer.Close()

	// Create HTTP request to AI service
	url := aiServiceURL + aiPredictEndpoint
	req, err := http.NewRequest("POST", url, &buf)
	if err != nil {
		return nil, fmt.Errorf("failed to create AI service request: %v", err)
	}

	// Set content type
	req.Header.Set("Content-Type", writer.FormDataContentType())

	// Make request
	resp, err := aiClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("AI service request failed: %v", err)
	}
	defer resp.Body.Close()

	// Read response
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read AI service response: %v", err)
	}

	// Parse response
	var predictionResp PredictionResponse
	if err := json.Unmarshal(body, &predictionResp); err != nil {
		return nil, fmt.Errorf("failed to parse AI service response: %v", err)
	}

	// Check for API errors
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("AI service returned error (status %d): %s", resp.StatusCode, predictionResp.Error)
	}

	// Set timestamp
	predictionResp.Timestamp = time.Now().Format(time.RFC3339)

	return &predictionResp, nil
}

// GetDiseaseInfoHandler provides educational information about diseases
func GetDiseaseInfoHandler(c *fiber.Ctx) error {
	// Validate user authentication
	if err := ValidateCookie(c); err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Authentication required",
		})
	}

	// Disease information database
	diseaseInfo := getDiseaseInformationDatabase()

	// Get specific disease info or all diseases
	disease := c.Query("disease")
	if disease == "" {
		return c.JSON(fiber.Map{
			"success":  true,
			"diseases": diseaseInfo,
		})
	}

	info, exists := diseaseInfo[disease]
	if !exists {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Disease information not found",
			"hint":  "Available diseases: healthy, coccidiosis, salmonella, e_coli, newcastle",
		})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"disease": disease,
		"info":    info,
	})
}

// getDiseaseInformationDatabase returns educational information about chicken diseases
func getDiseaseInformationDatabase() map[string]interface{} {
	return map[string]interface{}{
		"healthy": map[string]string{
			"name":        "Healthy",
			"description": "Normal, healthy chicken droppings",
			"symptoms":    "Firm, brown droppings with white urates",
			"treatment":   "Continue good hygiene and regular monitoring",
			"prevention":  "Maintain clean environment, fresh water, and proper nutrition",
			"severity":    "None",
		},
		"coccidiosis": map[string]string{
			"name":        "Coccidiosis",
			"description": "Parasitic infection affecting the intestinal tract",
			"symptoms":    "Bloody or watery droppings, lethargy, poor growth",
			"treatment":   "Anticoccidial medication, supportive care",
			"prevention":  "Keep environment dry, avoid overcrowding, use medicated feed",
			"severity":    "Moderate to High",
		},
		"salmonella": map[string]string{
			"name":        "Salmonella",
			"description": "Bacterial infection that can affect digestive system",
			"symptoms":    "Watery droppings, decreased appetite, lethargy",
			"treatment":   "Antibiotics (consult veterinarian), supportive care",
			"prevention":  "Good hygiene, clean water, proper feed storage",
			"severity":    "Moderate",
		},
		"e_coli": map[string]string{
			"name":        "E. Coli Infection",
			"description": "Bacterial infection often secondary to other conditions",
			"symptoms":    "Watery droppings, depression, poor growth",
			"treatment":   "Antibiotics, improve environmental conditions",
			"prevention":  "Clean environment, good ventilation, stress reduction",
			"severity":    "Moderate",
		},
		"newcastle": map[string]string{
			"name":        "Newcastle Disease",
			"description": "Viral disease affecting respiratory and nervous systems",
			"symptoms":    "Greenish droppings, respiratory distress, neurological signs",
			"treatment":   "Supportive care (no specific treatment), isolation",
			"prevention":  "Vaccination, biosecurity measures, quarantine new birds",
			"severity":    "High",
		},
	}
}
