#include "engine_bridge.h"

#define NAPI_ERR_CHECK \
if(status != napi_ok) \
  napi_throw_error(env, NULL, "Engine error."); \

#define NAPI_CALL(env, call)                                      \
  do {                                                            \
    napi_status status = (call);                                  \
    if (status != napi_ok) {                                      \
      const napi_extended_error_info* error_info = NULL;          \
      napi_get_last_error_info((env), &error_info);               \
      bool is_pending;                                            \
      napi_is_exception_pending((env), &is_pending);              \
      if (!is_pending) {                                          \
        const char* message = (error_info->error_message == NULL) \
            ? "empty error message"                               \
            : error_info->error_message;                          \
        napi_throw_error((env), NULL, message);                   \
        return NULL;                                              \
      }                                                           \
    }                                                             \
  } while(0)

static napi_value
b_multiply(napi_env env, napi_callback_info info){
  napi_status status;

  napi_value argv[2];
  size_t argc = 2;
  status = napi_get_cb_info(
    env,
    info,
    &argc,
    argv,
    NULL,
    NULL
  );

  NAPI_ERR_CHECK

  int a, b;

  status = napi_get_value_int32(env, argv[0], &a);
  NAPI_ERR_CHECK

  status = napi_get_value_int32(env, argv[1], &b);
  NAPI_ERR_CHECK

  int output = multiply(a, b);

  napi_value result;
  status = napi_create_int32(env, output, &result);
  return result;
}

napi_value create_addon(napi_env env){
  napi_value res;
  NAPI_CALL(env, napi_create_object(env, &res));

  napi_value exported_func;
  NAPI_CALL(
    env,
    napi_create_function(
      env,
      "multiply",
      NAPI_AUTO_LENGTH,
      b_multiply,
      NULL,
      &exported_func
    )
  );

  NAPI_CALL(
    env,
    napi_set_named_property(
      env,
      res,
      "multiply",
      exported_func
    )
  );

  return res;
}

NAPI_MODULE_INIT(){
  return create_addon(env);
}
