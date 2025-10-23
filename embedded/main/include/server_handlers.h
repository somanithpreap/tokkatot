#ifndef SERVER_HANDLERS_H
#define SERVER_HANDLERS_H

#include "esp_https_server.h"

esp_err_t server_init(void);
esp_err_t register_server_handlers(httpd_handle_t server);

// Handler declarations
esp_err_t get_initial_state_handler(httpd_req_t *req);
esp_err_t get_current_data_handler(httpd_req_t *req);
esp_err_t get_historical_data_handler(httpd_req_t *req);
esp_err_t toggle_handler(httpd_req_t *req);

#endif // SERVER_HANDLERS_H