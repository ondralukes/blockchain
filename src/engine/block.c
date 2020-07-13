#include "block.h"

block_t * create_block(uint32_t trnCount){
  block_t * b = malloc(sizeof(block_t));
  b->trnCount = trnCount;
  b->trns = malloc(trnCount*sizeof(trn_t*));
  return b;
}

void print_block(block_t * b){
  printf("[Engine/Print] Block %ld, %d transactions\n", b->timestamp, b->trnCount);
  for(uint32_t i =0;i<b->trnCount;i++){
    printf("[Engine/Print] Transaction %d\n", i);
    print_trn(b->trns[i]);
  }
}
