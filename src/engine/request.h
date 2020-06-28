#ifndef REQUEST_H
#define REQUEST_H

#include "transaction.h"

#define REQ_ENQUEUE 1
struct enqueue_request {
  trn_t* trn
};

typedef struct {
  int type;
  union {
    struct enqueue_request* enqueue;
  } data;
} req_t;
#endif
