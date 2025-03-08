package websocket

import (
	"encoding/json"
	"log"
	"sync"

	"middleware/authentication"

	"github.com/gofiber/websocket/v2"
)

var clients = make(map[string]*websocket.Conn) // Keep track of connected WebSocket clients
var mutex = sync.Mutex{}                       // Prevent data issues when multiple clients connect

type Message struct {
	Type    string `json:"type"`
	Payload string `json:"payload"`
}

// ====== HANDLE WEBSOCKET CONNECTIONS ====== //
func handleWebSocket(c *websocket.Conn) {
	defer c.Close()

	clientID := authentication.ValidateToken(c.Cookies("token"))
	if clientID == "" {
		log.Println("Unauthorized client")
		c.WriteMessage(websocket.CloseMessage, websocket.FormatCloseMessage(websocket.ClosePolicyViolation, "Invalid token"))
		return
	}

	mutex.Lock()
	clients[clientID] = c
	mutex.Unlock()

	for {
		_, msg, err := c.ReadMessage()
		if err != nil {
			break
		}

		var receivedMsg Message
		err = json.Unmarshal(msg, &receivedMsg)
		if err != nil {
			continue
		}

		// Handle different message types
		switch receivedMsg.Type {
		case "ping":
			sendMessage(c, Message{Type: "pong", Payload: "alive"})
		}

	}
	mutex.Lock()
	delete(clients, clientID)
	mutex.Unlock()
}

// Send a message to a WebSocket client
func sendMessage(c *websocket.Conn, msg Message) {
	responseJSON, _ := json.Marshal(msg)
	_ = c.WriteMessage(websocket.TextMessage, responseJSON)
}
