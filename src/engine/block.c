#include "block.h"

block_t * create_block(uint32_t trnCount){
  block_t * b = malloc(sizeof(block_t));
  b->trnCount = trnCount;
  b->trns = malloc(trnCount*sizeof(trn_t*));
  b->hash = NULL;
  return b;
}

void print_block(block_t * b){
  printf("[Engine/Print] Block %ld, %d transactions\n", b->timestamp, b->trnCount);
  for(uint32_t i =0;i<b->trnCount;i++){
    printf("[Engine/Print] Transaction %d\n", i);
    print_trn(b->trns[i]);
  }
}

void free_block(block_t * b){
  for(uint32_t i =0;i<b->trnCount;i++){
    destroy_trn(b->trns[i]);
  }

  if(b->hash != NULL) free(b->hash);
  free(b);
}
