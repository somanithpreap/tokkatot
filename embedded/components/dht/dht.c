#include "dht.h"
#include "esp_timer.h"
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include <string.h>

#define DHT_TIMEOUT_ERROR 0x01
#define DHT_CHECKSUM_ERROR 0x02
#define DHT_OK 0

static esp_err_t send_start_signal(gpio_num_t pin)
{
    gpio_set_direction(pin, GPIO_MODE_OUTPUT);
    gpio_set_level(pin, 0);
    esp_rom_delay_us(20000);  // At least 18ms for DHT22
    gpio_set_level(pin, 1);
    esp_rom_delay_us(30);     // 20-40us
    gpio_set_direction(pin, GPIO_MODE_INPUT);
    return ESP_OK;
}

static int wait_for_level(gpio_num_t pin, int level, int timeout)
{
    int64_t start = esp_timer_get_time();
    while (gpio_get_level(pin) == level) {
        if (esp_timer_get_time() - start > timeout)
            return DHT_TIMEOUT_ERROR;
    }
    return DHT_OK;
}

static esp_err_t read_data(gpio_num_t pin, uint8_t data[5])
{
    uint8_t buf = 0;
    uint8_t cnt = 7;
    uint8_t idx = 0;

    for (int i = 0; i < 40; i++) {
        if (wait_for_level(pin, 0, 50) != DHT_OK)
            return ESP_ERR_TIMEOUT;

        int64_t start = esp_timer_get_time();
        if (wait_for_level(pin, 1, 70) != DHT_OK)
            return ESP_ERR_TIMEOUT;
        
        int64_t duration = esp_timer_get_time() - start;
        
        if (duration > 40) {
            buf |= (1 << cnt);
        }
        
        if (cnt == 0) {
            cnt = 7;
            idx++;
        } else {
            cnt--;
        }
    }
    
    memcpy(data, &buf, 5);
    return ESP_OK;
}

esp_err_t dht_init(gpio_num_t pin, dht_sensor_type_t sensor_type)
{
    gpio_reset_pin(pin);
    gpio_set_direction(pin, GPIO_MODE_OUTPUT);
    gpio_set_level(pin, 1);
    return ESP_OK;
}

esp_err_t dht_read_float_data(dht_sensor_type_t sensor_type, gpio_num_t pin, float *humidity, float *temperature)
{
    uint8_t data[5] = {0};
    esp_err_t err;

    err = send_start_signal(pin);
    if (err != ESP_OK)
        return err;

    if (wait_for_level(pin, 0, 80) != DHT_OK)
        return ESP_ERR_TIMEOUT;
    if (wait_for_level(pin, 1, 80) != DHT_OK)
        return ESP_ERR_TIMEOUT;

    err = read_data(pin, data);
    if (err != ESP_OK)
        return err;

    if (data[4] != ((data[0] + data[1] + data[2] + data[3]) & 0xFF))
        return ESP_ERR_INVALID_CRC;

    if (sensor_type == DHT_TYPE_AM2301) {
        *humidity = (data[0] * 256 + data[1]) / 10.0f;
        *temperature = ((data[2] & 0x7F) * 256 + data[3]) / 10.0f;
        if (data[2] & 0x80)
            *temperature = -*temperature;
    } else {
        *humidity = data[0] + data[1] * 0.1f;
        *temperature = data[2] + data[3] * 0.1f;
    }

    return ESP_OK;
}