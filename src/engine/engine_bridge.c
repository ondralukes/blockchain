#include "engine_bridge.h"

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
b_start(napi_env env, napi_callback_info info){
  int output = start();

  napi_value result;
  NAPI_CALL(env, napi_create_int32(env, output, &result));

  return result;
}

static napi_value
b_stop(napi_env env, napi_callback_info info){
  int output = stop();

  napi_value result;
  NAPI_CALL(env, napi_create_int32(env, output, &result));

  return result;
}

static napi_value
b_enqueue(napi_env env, napi_callback_info info){
  napi_value argv[1];
  size_t argc = 1;

  NAPI_CALL(
    env,
    napi_get_cb_info(
      env,
      info,
      &argc,
      argv,
      NULL,
      NULL
    )
  );


  int val;

  NAPI_CALL(
    env,
    napi_get_value_int32(env, argv[0], &val)
  );
  enqueue(val);

  return NULL;
}

void*
add_function(
  napi_env env,
  napi_value obj,
  napi_value(*func)(napi_env, napi_callback_info),
  const char * name
){

  napi_value exported_func;
  NAPI_CALL(
    env,
    napi_create_function(
      env,
      name,
      NAPI_AUTO_LENGTH,
      func,
      NULL,
      &exported_func
    )
  );

  NAPI_CALL(
    env,
    napi_set_named_property(
      env,
      obj,
      name,
      exported_func
    )
  );

  return NULL;
}

napi_value create_addon(napi_env env){
  napi_value res;
  NAPI_CALL(env, napi_create_object(env, &res));

  add_function(
    env,
    res,
    b_start,
    "start"
  );

  add_function(
    env,
    res,
    b_stop,
    "stop"
  );

  add_function(
    env,
    res,
    b_enqueue,
    "enqueue"
  );

  return res;
}

NAPI_MODULE_INIT(){
  return create_addon(env);
}
