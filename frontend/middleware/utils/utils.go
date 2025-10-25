package utils

import (
	"crypto/aes"
	"crypto/cipher"
	"encoding/base64"
	"encoding/json"
	"fmt"
)

func DecryptAESGCM(jsonResponse string, key []byte) ([]byte, error) {
	// Define structure to parse JSON
	var resp struct {
		Data string `json:"data"`
		IV   string `json:"iv"`
		Tag  string `json:"tag"`
	}

	if err := json.Unmarshal([]byte(jsonResponse), &resp); err != nil {
		return nil, fmt.Errorf("Failed to parse JSON: %v", err)
	}

	ciphertext, err := base64.StdEncoding.DecodeString(resp.Data)
	if err != nil {
		return nil, fmt.Errorf("Failed to decode data: %v", err)
	}

	iv, err := base64.StdEncoding.DecodeString(resp.IV)
	if err != nil {
		return nil, fmt.Errorf("Failed to decode IV: %v", err)
	}

	tag, err := base64.StdEncoding.DecodeString(resp.Tag)
	if err != nil {
		return nil, fmt.Errorf("Failed to decode tag: %v", err)
	}

	block, err := aes.NewCipher(key)
	if err != nil {
		return nil, err
	}

	if len(iv) != 12 {
		return nil, fmt.Errorf("invalid IV length: %d", len(iv))
	}

	if len(tag) != 16 {
		return nil, fmt.Errorf("invalid tag length: %d", len(tag))
	}

	ciphertext = append(ciphertext, tag...)

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return nil, err
	}

	plaintext, err := gcm.Open(nil, iv, ciphertext, nil)
	if err != nil {
		return nil, err
	}

	return plaintext, nil
}
