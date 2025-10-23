#include "sensor_manager.h"
#include "esp_adc/adc_oneshot.h"
#include "esp_adc/adc_cali.h"
#include "esp_adc/adc_cali_scheme.h"
#include "esp_timer.h"
#include "esp_log.h"
#include "dht.h"
#include "adc.h"

static const char *TAG = "sensor_manager";
static adc_oneshot_config_t adc_config;
static sensor_history_t history = {0};

// DHT device configuration
static dht_sensor_type_t sensor_type = DHT_TYPE_AM2301; // DHT22 is also known as AM2301
static gpio_num_t dht_gpio = DHT22_PIN;

void sensor_manager_init(void)
{
    // Initialize DHT22 sensor GPIO
    gpio_config(&(gpio_config_t){
        .pin_bit_mask = (1ULL << DHT22_PIN),
        .mode = GPIO_MODE_INPUT_OUTPUT,
        .pull_up_en = GPIO_PULLUP_DISABLE,
        .pull_down_en = GPIO_PULLDOWN_ENABLE,
        .intr_type = GPIO_INTR_DISABLE
    });

    // Initialize water sensor ADC
    adc_config = init_adc(WATER_SENSOR_ADC_UNIT, WATER_SENSOR_ADC_CHANNEL);
}

esp_err_t read_dht22(float *temperature, float *humidity)
{
    float temp, hum;
    esp_err_t res = dht_read_float_data(sensor_type, dht_gpio, &hum, &temp);
    
    if (res == ESP_OK) {
        *temperature = temp;
        *humidity = hum;
    } else {
        ESP_LOGE(TAG, "Could not read data from DHT22 sensor");
        *temperature = 0.0f;
        *humidity = 0.0f;
    }
    
    return res;
}

esp_err_t get_current_sensor_data(sensor_data_t *data)
{
    float temp, humid;
    ESP_ERROR_CHECK(read_dht22(&temp, &humid));
    
    data->timestamp = esp_timer_get_time() / 1000000; // Convert to seconds
    data->temperature = temp;
    data->humidity = humid;
    
    ESP_ERROR_CHECK(update_sensor_history(data));
    return ESP_OK;
}

esp_err_t update_sensor_history(sensor_data_t *data)
{
    history.data[history.index] = *data;
    history.index = (history.index + 1) % QUEUE_SIZE;
    if (history.count < QUEUE_SIZE) {
        history.count++;
    }
    return ESP_OK;
}

esp_err_t get_sensor_history(sensor_history_t *hist)
{
    memcpy(hist, &history, sizeof(sensor_history_t));
    return ESP_OK;
}