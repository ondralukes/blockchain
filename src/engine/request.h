#ifndef REQUEST_H
#define REQUEST_H

#include "transaction.h"

#define REQ_ENQUEUE 1
#define REQ_GET_HEAD 2
#define REQ_GET_TRN 3

struct enqueue_request {
  trn_t* trn;
};

struct get_head_request {
  char* publicKey;
  napi_threadsafe_function callback;
};

struct get_trn_request {
  trn_id_t* trn_id;
  napi_threadsafe_function callback;
};

typedef struct {
  int type;
  union {
    struct enqueue_request* enqueue;
    struct get_head_request* getHead;
    struct get_trn_request* getTrn;
  } data;
} req_t;
#endif
