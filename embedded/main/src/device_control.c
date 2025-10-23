#include "device_control.h"
#include "esp_log.h"
#include "driver/ledc.h"

static const char *TAG = "device_control";

// LEDC configuration for servo motor
#define LEDC_TIMER              LEDC_TIMER_0
#define LEDC_MODE               LEDC_LOW_SPEED_MODE
#define LEDC_CHANNEL            LEDC_CHANNEL_0
#define LEDC_DUTY_RES          LEDC_TIMER_13_BIT
#define LEDC_FREQUENCY          50 // 50Hz for servo motor
#define SERVO_MIN_PULSEWIDTH    500
#define SERVO_MAX_PULSEWIDTH    2500

static device_state_t current_state = {
    .auto_mode = true,
    .fan_state = false,
    .bulb_state = false,
    .feeder_state = false,
    .pump_state = false,
    .conveyer_state = false
};

esp_err_t device_control_init(void)
{
    // Configure GPIO pins
    gpio_config_t io_conf = {
        .intr_type = GPIO_INTR_DISABLE,
        .mode = GPIO_MODE_OUTPUT,
        .pin_bit_mask = (1ULL << CONVEYER_PIN) |
                       (1ULL << FAN_PIN) |
                       (1ULL << LIGHTBULB_PIN) |
                       (1ULL << WATERPUMP_PIN),
        .pull_down_en = 0,
        .pull_up_en = 0
    };
    ESP_ERROR_CHECK(gpio_config(&io_conf));

    // Configure LEDC for servo control
    ledc_timer_config_t ledc_timer = {
        .speed_mode = LEDC_MODE,
        .timer_num = LEDC_TIMER,
        .duty_resolution = LEDC_DUTY_RES,
        .freq_hz = LEDC_FREQUENCY,
        .clk_cfg = LEDC_AUTO_CLK
    };
    ESP_ERROR_CHECK(ledc_timer_config(&ledc_timer));

    ledc_channel_config_t ledc_channel = {
        .speed_mode = LEDC_MODE,
        .channel = LEDC_CHANNEL,
        .timer_sel = LEDC_TIMER,
        .intr_type = LEDC_INTR_DISABLE,
        .gpio_num = SERVO_PIN,
        .duty = 0,
        .hpoint = 0
    };
    ESP_ERROR_CHECK(ledc_channel_config(&ledc_channel));

    // Initialize all devices to OFF state
    ESP_ERROR_CHECK(gpio_set_level(CONVEYER_PIN, 1));
    ESP_ERROR_CHECK(gpio_set_level(FAN_PIN, 1));
    ESP_ERROR_CHECK(gpio_set_level(LIGHTBULB_PIN, 1));
    ESP_ERROR_CHECK(gpio_set_level(WATERPUMP_PIN, 1));
    
    return ESP_OK;
}

esp_err_t set_servo_position(int position)
{
    uint32_t duty = (position * (SERVO_MAX_PULSEWIDTH - SERVO_MIN_PULSEWIDTH) / 180) + SERVO_MIN_PULSEWIDTH;
    return ledc_set_duty_and_update(LEDC_MODE, LEDC_CHANNEL, duty, 0);
}

esp_err_t dispense_food(void)
{
    current_state.feeder_state = true;
    
    // Move servo from 90 to 15 degrees
    for (int pos = 90; pos >= 15; pos--) {
        ESP_ERROR_CHECK(set_servo_position(pos));
        vTaskDelay(pdMS_TO_TICKS(25));
    }
    
    // Move servo back from 15 to 90 degrees
    for (int pos = 15; pos <= 90; pos++) {
        ESP_ERROR_CHECK(set_servo_position(pos));
        vTaskDelay(pdMS_TO_TICKS(25));
    }
    
    current_state.feeder_state = false;
    return ESP_OK;
}

esp_err_t toggle_device(gpio_num_t pin, bool *state)
{
    *state = !*state;
    return gpio_set_level(pin, *state ? 0 : 1);
}

esp_err_t update_device_state(device_state_t *state)
{
    memcpy(&current_state, state, sizeof(device_state_t));
    
    ESP_ERROR_CHECK(gpio_set_level(FAN_PIN, state->fan_state ? 0 : 1));
    ESP_ERROR_CHECK(gpio_set_level(LIGHTBULB_PIN, state->bulb_state ? 0 : 1));
    ESP_ERROR_CHECK(gpio_set_level(WATERPUMP_PIN, state->pump_state ? 0 : 1));
    ESP_ERROR_CHECK(gpio_set_level(CONVEYER_PIN, state->conveyer_state ? 0 : 1));
    
    return ESP_OK;
}