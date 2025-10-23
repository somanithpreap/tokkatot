#include "server_handlers.h"
#include "esp_log.h"
#include "esp_https_server.h"
#include "sensor_manager.h"
#include "device_control.h"
#include "cJSON.h"

static const char *TAG = "server_handlers";
static httpd_handle_t server = NULL;

// SSL certificate - to be replaced with the generated certificate
extern const unsigned char servercert_start[] asm("_binary_cert_pem_start");
extern const unsigned char servercert_end[] asm("_binary_cert_pem_end");
extern const unsigned char serverkey_start[] asm("_binary_key_pem_start");
extern const unsigned char serverkey_end[] asm("_binary_key_pem_end");

esp_err_t server_init(void)
{
    httpd_ssl_config_t config = HTTPD_SSL_CONFIG_DEFAULT();
    
    config.servercert = servercert_start;
    config.servercert_len = servercert_end - servercert_start;
    config.prvtkey_pem = serverkey_start;
    config.prvtkey_len = serverkey_end - serverkey_start;

    esp_err_t ret = httpd_ssl_start(&server, &config);
    if (ret != ESP_OK) {
        ESP_LOGE(TAG, "Failed to start server!");
        return ret;
    }

    // Register URI handlers
    httpd_uri_t initial_state = {
        .uri = "/get-initial-state",
        .method = HTTP_GET,
        .handler = get_initial_state_handler
    };
    httpd_register_uri_handler(server, &initial_state);

    httpd_uri_t current_data = {
        .uri = "/get-current-data",
        .method = HTTP_GET,
        .handler = get_current_data_handler
    };
    httpd_register_uri_handler(server, &current_data);

    httpd_uri_t historical_data = {
        .uri = "/get-historical-data",
        .method = HTTP_GET,
        .handler = get_historical_data_handler
    };
    httpd_register_uri_handler(server, &historical_data);

    return ESP_OK;
}

esp_err_t send_json_response(httpd_req_t *req, cJSON *root)
{
    char *json_str = cJSON_Print(root);
    httpd_resp_set_type(req, "application/json");
    httpd_resp_sendstr(req, json_str);
    free(json_str);
    cJSON_Delete(root);
    return ESP_OK;
}

esp_err_t get_initial_state_handler(httpd_req_t *req)
{
    sensor_data_t current_data;
    get_current_sensor_data(&current_data);

    cJSON *root = cJSON_CreateObject();
    cJSON_AddNumberToObject(root, "timestamp", current_data.timestamp);
    cJSON_AddNumberToObject(root, "temperature", current_data.temperature);
    cJSON_AddNumberToObject(root, "humidity", current_data.humidity);
    
    return send_json_response(req, root);
}

esp_err_t get_current_data_handler(httpd_req_t *req)
{
    sensor_data_t current_data;
    get_current_sensor_data(&current_data);

    cJSON *root = cJSON_CreateObject();
    cJSON_AddNumberToObject(root, "timestamp", current_data.timestamp);
    cJSON_AddNumberToObject(root, "temperature", current_data.temperature);
    cJSON_AddNumberToObject(root, "humidity", current_data.humidity);
    
    return send_json_response(req, root);
}

esp_err_t get_historical_data_handler(httpd_req_t *req)
{
    sensor_history_t history;
    get_sensor_history(&history);

    cJSON *root = cJSON_CreateArray();
    
    for (int i = 0; i < history.count; i++) {
        int idx = (history.index - history.count + i + QUEUE_SIZE) % QUEUE_SIZE;
        cJSON *entry = cJSON_CreateObject();
        cJSON_AddNumberToObject(entry, "timestamp", history.data[idx].timestamp);
        cJSON_AddNumberToObject(entry, "temperature", history.data[idx].temperature);
        cJSON_AddNumberToObject(entry, "humidity", history.data[idx].humidity);
        cJSON_AddItemToArray(root, entry);
    }
    
    return send_json_response(req, root);
}