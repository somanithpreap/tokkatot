#include <stdio.h>
#include "esp_system.h"
#include "nvs_flash.h"
#include "esp_event.h"
#include "esp_log.h"

#include "wifi_manager.h"
#include "sensor_manager.h"
#include "device_control.h"
#include "server_handlers.h"

static const char *TAG = "TOKKATOT";

void app_main(void)
{
    // Initialize NVS
    esp_err_t ret = nvs_flash_init();
    if (ret == ESP_ERR_NVS_NO_FREE_PAGES || ret == ESP_ERR_NVS_NEW_VERSION_FOUND) {
        ESP_ERROR_CHECK(nvs_flash_erase());
        ret = nvs_flash_init();
    }
    ESP_ERROR_CHECK(ret);

    // Initialize system components
    ESP_ERROR_CHECK(device_control_init());
    sensor_manager_init();
    
    // Start WiFi
    ESP_ERROR_CHECK(wifi_init_sta());

    // Start HTTPS server
    ESP_ERROR_CHECK(server_init());

    ESP_LOGI(TAG, "System initialization complete");

    // Main loop
    while (1) {
        sensor_data_t current_data;
        ESP_ERROR_CHECK(get_current_sensor_data(&current_data));
        
        // Auto mode logic
        device_state_t state;
        if (state.auto_mode) {
            // Temperature control
            if (current_data.temperature < 27.0f) {
                state.fan_state = false;
                state.bulb_state = true;
            } else if (current_data.temperature > 32.0f) {
                state.fan_state = true;
                state.bulb_state = false;
            } else {
                state.fan_state = false;
                state.bulb_state = false;
            }

            // Update device states
            ESP_ERROR_CHECK(update_device_state(&state));
        }

        vTaskDelay(pdMS_TO_TICKS(1000));
    }
}