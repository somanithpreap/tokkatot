package api

import (
	"crypto/tls"
	"io"
	"net/http"
	"time"

	"github.com/gofiber/fiber/v2"
)

var (
	dataProvider = "https://192.168.0.4"
	key = getRegKey()
	timeout = 5 * time.Second
	skipTLS = true
)

func getDataHandler(c **fiber.Ctx, endpoint string) error {
	client := &http.Client{Timeout: timeout}

	if skipTLS {
		client.Transport = &http.Transport{
			TLSClientConfig: &tls.Config{InsecureSkipVerify: true},
		}
	}

	url := dataProvider + endpoint
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return (*c).Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	req.Header.Set("X-Reg-Key", key)

	resp, err := client.Do(req)
	if err != nil {
		return (*c).Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return (*c).Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to retrieve data"})
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return (*c).Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return (*c).Send(body)
}

func GetCurrentDataHandler(c *fiber.Ctx) error {
	return getDataHandler(&c, "/get-current-data")
}

func GetHistoricalDataHandler(c *fiber.Ctx) error {
	return getDataHandler(&c, "/get-historical-data")
}
