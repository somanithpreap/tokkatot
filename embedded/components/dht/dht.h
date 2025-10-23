#ifndef __DHT_H__
#define __DHT_H__

#include <driver/gpio.h>
#include <esp_err.h>

#ifdef __cplusplus
extern "C" {
#endif

typedef enum {
    DHT_TYPE_DHT11 = 0,   //!< DHT11
    DHT_TYPE_AM2301 = 1,  //!< AM2301 (DHT21, DHT22, AM2302, AM2321)
} dht_sensor_type_t;

esp_err_t dht_init(gpio_num_t pin, dht_sensor_type_t sensor_type);
esp_err_t dht_read_float_data(dht_sensor_type_t sensor_type, gpio_num_t pin, float *humidity, float *temperature);

#ifdef __cplusplus
}
#endif

#endif  // __DHT_H__