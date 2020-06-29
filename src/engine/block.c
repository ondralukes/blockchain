#include "block.h"

block_t * create_block(uint32_t trnCount){
  block_t * b = malloc(sizeof(block_t));
  b->trnCount = trnCount;
  b->trns = malloc(trnCount*sizeof(trn_t*));
  return b;
}
