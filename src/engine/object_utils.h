#ifndef OBJECT_UTILS
#define OBJECT_UTILS

#include <js_native_api.h>
#include <node_api.h>
#include <stdlib.h>

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
#endif
