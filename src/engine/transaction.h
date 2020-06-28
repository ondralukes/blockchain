#ifndef TRANSACTION_H
#define TRANSACTION_H

#include <js_native_api.h>
#include <node_api.h>
#include <stdlib.h>
#include <stdio.h>

#include "object_utils.h"

typedef struct {
  char* receiver;
  int64_t amount;
} trn_output_t;

typedef struct {
  char* owner;

  uint32_t inputCount;
  char** inputs;

  uint32_t outputCount;
  trn_output_t* outputs;

  char* hash;
  char* signature;
} trn_t;

trn_t * obj_to_trn(napi_env env, napi_value obj);
void destroy_trn(trn_t* t);
#endif
