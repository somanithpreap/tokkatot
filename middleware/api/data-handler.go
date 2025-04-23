package api

import (
	"bytes"
	"crypto/sha256"
	"encoding/hex"
	"io"
	"net/http"

	// "middleware/database"
	"middleware/utils"

	"github.com/gofiber/fiber/v2"
)

var (
	dataProvider = "http://10.0.0.2"
	key          = GetSecret()
)

// ====== DATA HANDLERS ====== //
func getDataHandler(c **fiber.Ctx, endpoint string) error {
	resp, err := http.Get(dataProvider + endpoint)
	if err != nil || resp.StatusCode != http.StatusOK {
		return (*c).Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to get data from data provider"})
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return (*c).Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	data, err := utils.DecryptAESGCM(string(body), key)
	if err != nil {
		return (*c).Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return (*c).JSON(fiber.Map{"data": string(data)})
}

func GetInitialStateHandler(c *fiber.Ctx) error {
	return getDataHandler(&c, "/get-initial-state")
}

func GetCurrentDataHandler(c *fiber.Ctx) error {
	return getDataHandler(&c, "/get-current-data")
}

func GetHistoricalDataHandler(c *fiber.Ctx) error {
	return getDataHandler(&c, "/get-historical-data")
}

// ====== TOGGLE HANDLERS ====== //
func toggleHandler(c **fiber.Ctx, endpoint string) error {
	resp, err := http.Get(dataProvider + endpoint)
	if err != nil || resp.StatusCode != http.StatusOK {
		return (*c).Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to toggle device"})
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return (*c).Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	challenge, err := utils.DecryptAESGCM(string(body), key)
	if err != nil {
		return (*c).Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	hash := sha256.Sum256(challenge)
	hashHex := hex.EncodeToString(hash[:])

	verifyResp, err := http.Post(dataProvider+endpoint+"/verify", "text/plain", bytes.NewBufferString(hashHex))
	if err != nil || verifyResp.StatusCode != http.StatusOK {
		return (*c).Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to verify toggle"})
	}
	defer verifyResp.Body.Close()

	verifyBody, err := io.ReadAll(verifyResp.Body)
	if err != nil {
		return (*c).Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	newState, err := utils.DecryptAESGCM(string(verifyBody), key)
	if err != nil {
		return (*c).Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return (*c).Status(fiber.StatusOK).JSON(fiber.Map{"state": string(newState)})
}

func ToggleAutoHandler(c *fiber.Ctx) error {
	return toggleHandler(&c, "/toggle-auto")
}

func ToggleBeltHandler(c *fiber.Ctx) error {
    return toggleHandler(&c, "/toggle-belt")
}

func ToggleFanHandler(c *fiber.Ctx) error {
	return toggleHandler(&c, "/toggle-fan")
}

func ToggleBulbHandler(c *fiber.Ctx) error {
	return toggleHandler(&c, "/toggle-bulb")
}

func ToggleFeederHandler(c *fiber.Ctx) error {
	return toggleHandler(&c, "/toggle-feeder")
}

func ToggleWaterHandler(c *fiber.Ctx) error {
	return toggleHandler(&c, "/toggle-water")
}

// ====== SCHEDULE HANDLERS ====== //
/* func SaveScheduleHandler(c *fiber.Ctx) error {
	var schedule database.Schedule
	if err := c.BodyParser(&schedule); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid schedule data"})
	}

	// Save schedule to database
	if err := database.SaveSchedule(DB, schedule); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to save schedule"})
	}

	return c.JSON(fiber.Map{"message": "Schedule saved successfully"})
}

func GetScheduleHandler(c *fiber.Ctx) error {
	schedule, err := database.GetSchedule(DB)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to retrieve schedule"})
	}

	return c.JSON(schedule)
} */
