package api

import (
	"bytes"
	"crypto/sha256"
	"encoding/hex"
	"io"
	"net/http"

	"middleware/utils"

	"github.com/gofiber/fiber/v2"
)

var (
	dataProvider = "http://10.0.0.2"
	key          = GetSecret()
)

func getDataHandler(c **fiber.Ctx, endpoint string) error {
	resp, err := http.Get(dataProvider + endpoint)
	if resp.StatusCode != http.StatusOK {
		return (*c).Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to get data from data provider"})
	}
	if err != nil {
		return (*c).Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
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

func toggleHandler(c **fiber.Ctx, endpoint string) error {
	resp, err := http.Get(dataProvider + endpoint)
	if resp.StatusCode != http.StatusOK {
		return (*c).Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to get data from data provider"})
	}
	if err != nil {
		return (*c).Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
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
	if err != nil {
		return (*c).Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	defer verifyResp.Body.Close()

	verifyBody, err := io.ReadAll(verifyResp.Body)
	if verifyResp.StatusCode != http.StatusOK {
		return (*c).Status(verifyResp.StatusCode).JSON(fiber.Map{"error": string(verifyBody)})
	}
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

func ToggleScheduleHandler(c *fiber.Ctx) error {
	return toggleHandler(&c, "/toggle-schedule")
}
