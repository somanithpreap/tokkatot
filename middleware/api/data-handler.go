package api

import (
	"bytes"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"io"
	"net/http"
	"os"
	"time"

	"middleware/utils"

	"github.com/gofiber/fiber/v2"
)

// IoT Configuration
var (
	dataProviderURL = getDataProviderURL()
	encryptionKey   []byte
	keyInitialized  = false
	httpClient      = &http.Client{Timeout: 10 * time.Second}
)

// IoT API endpoints
const (
	initialStateEndpoint   = "/get-initial-state"
	currentDataEndpoint    = "/get-current-data"
	historicalDataEndpoint = "/get-historical-data"
	toggleAutoEndpoint     = "/toggle-auto"
	toggleBeltEndpoint     = "/toggle-belt"
	toggleFanEndpoint      = "/toggle-fan"
	toggleBulbEndpoint     = "/toggle-bulb"
	toggleFeederEndpoint   = "/toggle-feeder"
	toggleWaterEndpoint    = "/toggle-water"
)

// Error messages
const (
	ErrDataProviderFailed = "Failed to get data from IoT device"
	ErrDeviceToggleFailed = "Failed to toggle device"
	ErrVerificationFailed = "Failed to verify device toggle"
	ErrDecryptionFailed   = "Failed to decrypt response"
)

// getDataProviderURL gets the IoT data provider URL from environment
func getDataProviderURL() string {
	url := os.Getenv("IOT_DATA_PROVIDER_URL")
	if url == "" {
		return "http://10.0.0.2" // Default value
	}
	return url
}

// getEncryptionKey gets the encryption key for IoT communication
func getEncryptionKey() []byte {
	if !keyInitialized {
		encryptionKey = getJWTSecret() // Reuse JWT secret for IoT encryption
		keyInitialized = true
	}
	return encryptionKey
}

// ==================== DATA RETRIEVAL HANDLERS ====================

// getDataFromDevice retrieves data from IoT device endpoint
func getDataFromDevice(c *fiber.Ctx, endpoint string) error {
	url := dataProviderURL + endpoint

	resp, err := httpClient.Get(url)
	if err != nil {
		return c.Status(fiber.StatusServiceUnavailable).JSON(fiber.Map{
			"error":   ErrDataProviderFailed,
			"details": err.Error(),
		})
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return c.Status(fiber.StatusServiceUnavailable).JSON(fiber.Map{
			"error":   ErrDataProviderFailed,
			"details": fmt.Sprintf("IoT device returned status %d", resp.StatusCode),
		})
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error":   "Failed to read response",
			"details": err.Error(),
		})
	}

	// Decrypt the response
	data, err := utils.DecryptAESGCM(string(body), getEncryptionKey())
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error":   ErrDecryptionFailed,
			"details": err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"data":    string(data),
	})
}

// GetInitialStateHandler retrieves the initial state of all IoT devices
func GetInitialStateHandler(c *fiber.Ctx) error {
	return getDataFromDevice(c, initialStateEndpoint)
}

// GetCurrentDataHandler retrieves current sensor data
func GetCurrentDataHandler(c *fiber.Ctx) error {
	return getDataFromDevice(c, currentDataEndpoint)
}

// GetHistoricalDataHandler retrieves historical sensor data
func GetHistoricalDataHandler(c *fiber.Ctx) error {
	return getDataFromDevice(c, historicalDataEndpoint)
}

// ==================== DEVICE CONTROL HANDLERS ====================

// toggleDeviceState toggles a device state using challenge-response protocol
func toggleDeviceState(c *fiber.Ctx, endpoint string) error {
	url := dataProviderURL + endpoint

	// Step 1: Get challenge from device
	resp, err := httpClient.Get(url)
	if err != nil {
		return c.Status(fiber.StatusServiceUnavailable).JSON(fiber.Map{
			"error":   ErrDeviceToggleFailed,
			"details": err.Error(),
		})
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return c.Status(fiber.StatusServiceUnavailable).JSON(fiber.Map{
			"error":   ErrDeviceToggleFailed,
			"details": fmt.Sprintf("Device returned status %d", resp.StatusCode),
		})
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error":   "Failed to read challenge response",
			"details": err.Error(),
		})
	}

	// Step 2: Decrypt challenge
	challenge, err := utils.DecryptAESGCM(string(body), getEncryptionKey())
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error":   ErrDecryptionFailed,
			"details": err.Error(),
		})
	}

	// Step 3: Generate hash response
	hash := sha256.Sum256(challenge)
	hashHex := hex.EncodeToString(hash[:])

	// Step 4: Send verification
	verifyURL := url + "/verify"
	verifyResp, err := httpClient.Post(verifyURL, "text/plain", bytes.NewBufferString(hashHex))
	if err != nil {
		return c.Status(fiber.StatusServiceUnavailable).JSON(fiber.Map{
			"error":   ErrVerificationFailed,
			"details": err.Error(),
		})
	}
	defer verifyResp.Body.Close()

	if verifyResp.StatusCode != http.StatusOK {
		return c.Status(fiber.StatusServiceUnavailable).JSON(fiber.Map{
			"error":   ErrVerificationFailed,
			"details": fmt.Sprintf("Verification returned status %d", verifyResp.StatusCode),
		})
	}

	verifyBody, err := io.ReadAll(verifyResp.Body)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error":   "Failed to read verification response",
			"details": err.Error(),
		})
	}

	// Step 5: Decrypt new state
	newState, err := utils.DecryptAESGCM(string(verifyBody), getEncryptionKey())
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error":   ErrDecryptionFailed,
			"details": err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"success":   true,
		"new_state": string(newState),
		"device":    endpoint,
	})
}

// Device-specific toggle handlers
func ToggleAutoHandler(c *fiber.Ctx) error {
	return toggleDeviceState(c, toggleAutoEndpoint)
}

func ToggleBeltHandler(c *fiber.Ctx) error {
	return toggleDeviceState(c, toggleBeltEndpoint)
}

func ToggleFanHandler(c *fiber.Ctx) error {
	return toggleDeviceState(c, toggleFanEndpoint)
}

func ToggleBulbHandler(c *fiber.Ctx) error {
	return toggleDeviceState(c, toggleBulbEndpoint)
}

func ToggleFeederHandler(c *fiber.Ctx) error {
	return toggleDeviceState(c, toggleFeederEndpoint)
}

func ToggleWaterHandler(c *fiber.Ctx) error {
	return toggleDeviceState(c, toggleWaterEndpoint)
}
