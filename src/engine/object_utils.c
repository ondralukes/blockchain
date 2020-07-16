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

void toThreadsafeFunc(napi_env env, napi_value func, napi_threadsafe_function* res){
  napi_value resource_name;
  NAPI_CALL(
    env,
    napi_create_string_utf8(
      env,
      "engine",
      NAPI_AUTO_LENGTH,
      &resource_name
    )
  );

  NAPI_CALL(
    env,
    napi_create_threadsafe_function(
      env,  //env
      func, //func
      NULL, //async_resource
      resource_name, //async_resource_name
      0,    //max_queue_size
      2,    //initial_thread_count
      NULL, //thread_finalize_data
      NULL, //thread_finalize_cb
      NULL, //context
      get_head_threadsafe_js_cb, //call_js_cb
      res   //result
    )
  );
}

void callThreadsafe(napi_threadsafe_function func, trn_id_t* data){
  napi_call_threadsafe_function(
    func,
    data,
    napi_tsfn_blocking
  );
}


void get_head_threadsafe_js_cb(
  napi_env env,
  napi_value js_callback,
  void* context,
  void* data
){
  trn_id_t* id = (trn_id_t *)data;

  napi_value js_id;

  if(id != NULL){
    NAPI_CALL(
      env,
      napi_create_object(env, &js_id)
    );

    napi_value js_timestamp;
    NAPI_CALL(
      env,
      napi_create_int64(
        env,
        id->timestamp,
        &js_timestamp
      )
    );

    napi_value js_hash;
    NAPI_CALL(
      env,
      napi_create_string_utf8(
        env,
        id->hash,
        NAPI_AUTO_LENGTH,
        &js_hash
      )
    );

    NAPI_CALL(
      env,
      napi_set_named_property(
        env,
        js_id,
        "timestamp",
        js_timestamp
      )
    );

    NAPI_CALL(
      env,
      napi_set_named_property(
        env,
        js_id,
        "hash",
        js_hash
      )
    );
  } else {
    NAPI_CALL(
      env,
      napi_get_null(env, &js_id)
    );
  }

  free(id);

  NAPI_CALL(
    env,
    napi_call_function(
      env,
      js_callback,
      js_callback,
      1,
      &js_id,
      NULL
    )
  );
}
