package main

import (
	"encoding/json"
	"log"
	"sync"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/websocket/v2"
	"github.com/golang-jwt/jwt/v4"
)

type Message struct {
	Type    string `json:"type"`
	Payload string `json:"payload"`
}

var clients = make(map[string]*websocket.Conn)
var mutex = sync.Mutex{}
var secretKey = []byte("your_secret_key")

func LoginHandler(c *fiber.Ctx) error {
	username := c.FormValue("username")
	password := c.FormValue("password")

	if username != "admin" || password != "password" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Invalid Credentials",
		})
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"client_id": username,
		"exp":       time.Now().Add(time.Hour * 1).Unix(),
	})

	signedToken, err := token.SignedString(secretKey)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to generate token",
		})
	}

	c.Cookie(&fiber.Cookie{
		Name:     "token",
		Value:    signedToken,
		Expires:  time.Now().Add(time.Hour * 1),
		HTTPOnly: true,
		Secure:   false,
		SameSite: fiber.CookieSameSiteLaxMode,
		Domain:   "",
		Path:     "/",
	})

	log.Println("Cookie Set:", signedToken)

	return c.JSON(fiber.Map{
		"message": "Login Successful",
		"token":   signedToken,
	})
}

func ProtectedHandler(c *fiber.Ctx) error {
	cookie := c.Cookies("token")
	if cookie == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "No token provided",
		})
	}
	return c.JSON(fiber.Map{
		"message": "Access granted",
		"token":   cookie,
	})
}

func main() {
	app := fiber.New()

	app.Get("/ws", websocket.New(handleWebSocket))
	go monitorConnections()

	// Public route
	app.Post("/login", LoginHandler)
	api := app.Group("/api")
	api.Get("/protected", ProtectedHandler)
	log.Println("Server is running on port 5500")
	log.Fatal(app.Listen(":5500"))
}

func HelloWorld(c *fiber.Ctx) error {
	return c.SendString("Hello World")
}

// WebSocket Connection
func handleWebSocket(c *websocket.Conn) {
	defer c.Close()

	clientID := validateToken(c)
	if clientID == "" {
		log.Println("Unauthorized client")
		c.WriteMessage(websocket.CloseMessage, websocket.FormatCloseMessage(websocket.ClosePolicyViolation, "Invalid token"))
		return
	}

	mutex.Lock()
	existingConn, exists := clients[clientID]
	if exists {
		log.Println("Closing previous connection for client:", clientID)
		existingConn.Close()
	}
	clients[clientID] = c
	mutex.Unlock()

	log.Println("Websocket client connected:", clientID)

	c.SetPongHandler(func(appData string) error {
		log.Println("Received Pong from client:", clientID)
		return nil
	})

	for {
		_, msg, err := c.ReadMessage()
		if err != nil {
			log.Println("Read error from", clientID, ":", err)
			break
		}

		var receivedMsg Message
		err = json.Unmarshal(msg, &receivedMsg)
		if err != nil {
			log.Println("Invalid message format:", err)
			continue
		}
		// WebSocket Request Handling
		switch receivedMsg.Type {
		case "sensor_data":
			log.Printf("Received sensor data from %s: %s\n", clientID, receivedMsg.Payload)
			response := Message{Type: "ack", Payload: "Command executed"}
			sendMessage(c, response)

		case "command":
			log.Printf("Received command from %s: %s\n", clientID, receivedMsg.Payload)
			response := Message{Type: "ack", Payload: "Command executed"}
			sendMessage(c, response)

		default:
			log.Println("Unknown message type from", clientID)
			response := Message{Type: "error", Payload: "Unknown message type"}
			sendMessage(c, response)
		}
	}

	// Remove client when disconnected
	mutex.Lock()
	delete(clients, clientID)
	mutex.Unlock()
	log.Println("disconnected:", clientID)
}

func sendMessage(c *websocket.Conn, msg Message) {
	responseJSON, _ := json.Marshal(msg)
	err := c.WriteMessage(websocket.TextMessage, responseJSON)
	if err != nil {
		log.Println("Write error:", err)
	}
}

func monitorConnections() {
	for {
		time.Sleep(10 * time.Second)
		mutex.Lock()
		for clientID, conn := range clients {
			err := conn.WriteMessage(websocket.PingMessage, nil)
			if err != nil {
				log.Println("Ping failed for client:", clientID, "removing client")
				conn.Close()
				delete(clients, clientID)
			}
		}
		mutex.Unlock()
	}
}

func validateToken(c *websocket.Conn) string {
	_, msg, err := c.ReadMessage()
	if err != nil {
		log.Println("Token read error:", err)
		return ""
	}

	var receivedMsg Message
	err = json.Unmarshal(msg, &receivedMsg)
	if err != nil {
		log.Println("Invalid token format:", err)
		return ""
	}

	token, err := jwt.Parse(receivedMsg.Payload, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fiber.ErrUnauthorized
		}
		return secretKey, nil
	})

	if claims, ok := token.Claims.(jwt.MapClaims); ok && token.Valid {
		return claims["client_id"].(string)
	} else {
		log.Println("Invalid token:", err)
		return ""
	}
}
