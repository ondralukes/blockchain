#include "object_utils.h"

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

napi_value create_napi_string(napi_env env, char * str){
  napi_value res;
  NAPI_CALL(
    env,
    napi_create_string_utf8(
      env,
      str,
      NAPI_AUTO_LENGTH,
      &res
    )
  );

  return res;
}

napi_value getProperty(napi_env env, napi_value obj, char * name){
  napi_value propName = create_napi_string(env, name);

  napi_value res;
  NAPI_CALL(
    env,
    napi_get_property(
      env,
      obj,
      propName,
      &res
    )
  );

  return res;
}

napi_value getArrayElement(
  napi_env env,
  napi_value obj,
  uint32_t index
){
  napi_value res;
  NAPI_CALL(
    env,
    napi_get_element(
      env,
      obj,
      index,
      &res
    )
  );

  return res;
}

uint32_t getArrayLength(napi_env env, napi_value obj){
  uint32_t len;
  NAPI_CALL(
    env,
    napi_get_array_length(
      env,
      obj,
      &len
    )
  );

  return len;
}

int64_t napiToInt(napi_env env, napi_value obj){
  int64_t i;
  NAPI_CALL(
    env,
    napi_get_value_int64(
      env,
      obj,
      &i
    )
  );

  return i;
}

char* napiToString(napi_env env, napi_value obj){
  size_t size;
  NAPI_CALL(
    env,
    napi_get_value_string_utf8(
      env,
      obj,
      NULL,
      0,
      &size
    )
  );

  char * buf = malloc(size + 1);

  NAPI_CALL(
    env,
    napi_get_value_string_utf8(
      env,
      obj,
      buf,
      size+1,
      &size
    )
  );

  return buf;
}
