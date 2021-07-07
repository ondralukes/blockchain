#ifndef OBJECT_UTILS
#define OBJECT_UTILS

#include <js_native_api.h>
#include <node_api.h>
#include <stdlib.h>

#include "transaction.h"

napi_value getProperty(
  napi_env env,
  napi_value obj,
  char * name
);

napi_value getArrayElement(
  napi_env env,
  napi_value obj,
  uint32_t index
);

uint32_t getArrayLength(
  napi_env env,
  napi_value obj
);


int64_t napiToInt(napi_env env, napi_value obj);
char* napiToString(napi_env env, napi_value obj);

void toThreadsafeFunc(
  napi_env env,
  napi_value func,
  napi_threadsafe_function_call_js js_cb,
  napi_threadsafe_function* res);
void callThreadsafe(napi_threadsafe_function func, trn_id_t* data);

void get_head_threadsafe_js_cb(
  napi_env env,
  napi_value js_callback,
  void* context,
  void* data
);

void get_trn_threadsafe_js_cb(
  napi_env env,
  napi_value js_callback,
  void* context,
  void* data
);
#endif
