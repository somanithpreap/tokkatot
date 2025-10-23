#include "esp_adc/adc_oneshot.h"
#include "esp_adc/adc_cali.h"
#include "esp_adc/adc_cali_scheme.h"

typedef struct {
    adc_oneshot_unit_handle_t adc_handle;
    adc_cali_handle_t adc_cali_handle;
} adc_oneshot_config_t;

adc_oneshot_config_t init_adc(adc_unit_t unit, adc_channel_t channel);

int adc_read_raw(adc_oneshot_config_t adc_config, adc_channel_t adc_channel);

float adc_read_voltage(adc_oneshot_config_t adc_config, adc_channel_t adc_channel);