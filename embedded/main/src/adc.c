#include "adc.h"

adc_oneshot_config_t init_adc(adc_unit_t unit, adc_channel_t channel) {
    // Configure specified ADC unit in oneshot mode
    adc_oneshot_unit_handle_t adc_handle;
    adc_oneshot_unit_init_cfg_t adc_unit_config = {
        .unit_id = unit,
        .clk_src = ADC_RTC_CLK_SRC_DEFAULT,
        .ulp_mode = ADC_ULP_MODE_DISABLE
    };
    adc_oneshot_new_unit(&adc_unit_config, &adc_handle);

    // Configure ADC channel
    adc_oneshot_chan_cfg_t adc_chan_config = {
        .atten = ADC_ATTEN_DB_12,
        .bitwidth = ADC_BITWIDTH_12
    };
    adc_oneshot_config_channel(adc_handle, channel, &adc_chan_config);

    // Configure ADC calibration
    adc_cali_handle_t adc_cali_handle = NULL;
    adc_cali_line_fitting_config_t adc_cali_config = {
        .unit_id = unit,
        .atten = ADC_ATTEN_DB_12,
        .bitwidth = ADC_BITWIDTH_12,
    };
    adc_cali_create_scheme_line_fitting(&adc_cali_config, &adc_cali_handle);

    return (adc_oneshot_config_t){ .adc_handle = adc_handle, .adc_cali_handle = adc_cali_handle };
}

int adc_read_raw(adc_oneshot_config_t adc_config, adc_channel_t adc_channel) {
    int value;
    adc_oneshot_read(adc_config.adc_handle, adc_channel, &value);
    return value;
}

float adc_read_voltage(adc_oneshot_config_t adc_config, adc_channel_t adc_channel) {
    int voltage;
    adc_cali_raw_to_voltage(adc_config.adc_cali_handle, adc_read_raw(adc_config, adc_channel), &voltage);
    return (float)voltage / 1000.0; // Convert mV to V
}