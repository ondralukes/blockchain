#ifndef TRANSACTION_H
#define TRANSACTION_H

#include <js_native_api.h>
#include <node_api.h>
#include <stdlib.h>
#include <stdio.h>

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

typedef struct {
  uint64_t timestamp;
  char* hash;
} trn_id_t;

#include "object_utils.h"

trn_t * obj_to_trn(napi_env env, napi_value obj);
napi_value trn_to_obj(napi_env env, trn_t* trn);

void destroy_trn(trn_t* t);
void destroy_trn_id(trn_id_t* id);

void print_trn(trn_t* t);
#endif
