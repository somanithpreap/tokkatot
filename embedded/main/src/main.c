#include <stdio.h>
#include "esp_system.h"
#include "nvs_flash.h"
#include "esp_event.h"
#include "esp_log.h"
#include "esp_timer.h"

#include "wifi_manager.h"
#include "sensor_manager.h"
#include "device_control.h"
#include "server_handlers.h"

static const char *TAG = "TOKKATOT";

// Conveyor timing constants (in milliseconds)
#define CONVEYOR_ON_TIME    10000  // 10 seconds
#define CONVEYOR_OFF_TIME   5000   // 5 seconds

void app_main(void)
{
    // Initialize NVS
    nvs_flash_init();
    device_control_init();
    sensor_manager_init();
    
    // Start WiFi
    ESP_ERROR_CHECK(wifi_init_sta());

    // Start HTTPS server
    ESP_ERROR_CHECK(server_init());

    ESP_LOGI(TAG, "System initialization complete");

    static bool was_water_low = false;  // Track previous water state to prevent rapid switching
    
    // Conveyor timing variables
    uint32_t last_conveyor_change = 0;
    bool is_conveyor_on = false;

    uint32_t last_dht_read = 0;

    // Main loop
    while (1) {
        uint32_t current_time = esp_timer_get_time() / 1000;  // Current time in milliseconds

        sensor_data_t current_data;
        if (current_time - last_dht_read >= 2000) {  // Read sensors every 2 seconds
            get_current_sensor_data(&current_data);
            last_dht_read = current_time;
        }

        // Auto mode logic
        if (device_states.auto_mode) {
            // Conveyor control timing
            uint32_t time_since_last_change = current_time - last_conveyor_change;

            if (is_conveyor_on && time_since_last_change >= CONVEYOR_ON_TIME) {
                // Turn off conveyor after ON_TIME
                device_states.conveyer_state = false;
                is_conveyor_on = false;
                last_conveyor_change = current_time;
                ESP_LOGI(TAG, "Auto: Conveyor OFF for %d seconds", CONVEYOR_OFF_TIME/1000);
            } 
            else if (!is_conveyor_on && time_since_last_change >= CONVEYOR_OFF_TIME) {
                // Turn on conveyor after OFF_TIME
                device_states.conveyer_state = true;
                is_conveyor_on = true;
                last_conveyor_change = current_time;
                ESP_LOGI(TAG, "Auto: Conveyor ON for %d seconds", CONVEYOR_ON_TIME/1000);
            }

            // Temperature control with hysteresis
            float temp = current_data.temperature;
            
            // Temperature control
            if (temp <= 28.0f) {
                // Cold condition: Turn on bulb, turn off fan
                device_states.bulb_state = true;
                device_states.fan_state = false;
                ESP_LOGI(TAG, "Auto: Cold (%.1f°C) - Bulb ON, Fan OFF", temp);
            } 
            else if (temp >= 32.0f) {
                // Hot condition: Turn on fan, turn off bulb
                device_states.bulb_state = false;
                device_states.fan_state = true;
                ESP_LOGI(TAG, "Auto: Hot (%.1f°C) - Bulb OFF, Fan ON", temp);
            }
            else if (temp > 29.0f && temp < 31.0f) {
                // Comfortable range: Both off
                device_states.bulb_state = false;
                device_states.fan_state = false;
                ESP_LOGI(TAG, "Auto: Normal (%.1f°C) - Both OFF", temp);
            }

            // Water level control with hysteresis
            if (current_data.water_level <= WATER_LEVEL_LOW) {
                if (!was_water_low) {
                    // Water level just became low
                    device_states.pump_state = true;
                    was_water_low = true;
                    ESP_LOGI(TAG, "Auto: Water Low (%.2fV) - Pump ON", current_data.water_level);
                }
            } 
            else if (current_data.water_level >= WATER_LEVEL_FULL) {
                if (was_water_low) {
                    // Water level reached full
                    device_states.pump_state = false;
                    was_water_low = false;
                    ESP_LOGI(TAG, "Auto: Water Full (%.2fV) - Pump OFF", current_data.water_level);
                }
            }

            // Update device states
            update_device_state(&device_states);
            
            // Log overall status periodically (every 30 seconds)
            static uint32_t last_status_log = 0;
            if ((current_time - last_status_log) >= 30000) {
                ESP_LOGI(TAG, "Status - Temp: %.1f°C, Water: %.2fV, Conveyor: %s, Time in state: %ds",
                        current_data.temperature,
                        current_data.water_level,
                        device_states.conveyer_state ? "ON" : "OFF",
                        time_since_last_change / 1000);
                last_status_log = current_time;
            }
        }
    }
}