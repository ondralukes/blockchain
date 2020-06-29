#ifndef BLOCK_H
#define BLOCK_H

#include <stdint.h>
#include <stdlib.h>

#include "transaction.h"

typedef struct {
  uint64_t timestamp;
  uint32_t trnCount;
  trn_t** trns;
} block_t;

block_t * create_block(uint32_t trnCount);
#endif
