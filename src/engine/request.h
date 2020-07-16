#ifndef REQUEST_H
#define REQUEST_H

#include "transaction.h"

#define REQ_ENQUEUE 1
#define REQ_GET_HEAD 2

struct enqueue_request {
  trn_t* trn;
};

struct get_head_request {
  char* publicKey;
  napi_threadsafe_function callback;
};

typedef struct {
  int type;
  union {
    struct enqueue_request* enqueue;
    struct get_head_request* getHead;
  } data;
} req_t;
#endif
