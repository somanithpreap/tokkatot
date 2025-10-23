#ifndef SENSOR_MANAGER_H
#define SENSOR_MANAGER_H

#include <stdint.h>
#include "esp_err.h"

#define DHT22_PIN       GPIO_NUM_32
// GPIO 34
#define WATER_SENSOR_ADC_UNIT ADC_UNIT_1
#define WATER_SENSOR_ADC_CHANNEL ADC_CHANNEL_6

#define QUEUE_SIZE 10

typedef struct {
    uint64_t timestamp;
    float temperature;
    float humidity;
} sensor_data_t;

typedef struct {
    sensor_data_t data[QUEUE_SIZE];
    int index;
    int count;
} sensor_history_t;

void sensor_manager_init(void);
esp_err_t read_dht22(float *temperature, float *humidity);
esp_err_t get_current_sensor_data(sensor_data_t *data);
esp_err_t update_sensor_history(sensor_data_t *data);
esp_err_t get_sensor_history(sensor_history_t *history);

#endif // SENSOR_MANAGER_H