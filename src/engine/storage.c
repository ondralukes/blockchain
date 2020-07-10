#include "storage.h"

void createDir(char * path){
  struct stat st;
  if(stat(path, &st) == -1){
    printf("[Engine/Storage] Creating directory %s\n", path);
    mkdir(path, 0700);
  }
}

bool save(block_t * block){
  uint64_t timestamp = block->timestamp;
  uint64_t year = 1970 + timestamp/31556926;
  timestamp %= 31556926;
  uint64_t day = timestamp/86400;
  timestamp %= 86400;
  uint64_t bl = timestamp/10;

  char* filename = malloc(1024);

  createDir("data");

  sprintf(filename, "data/%ld", year);
  createDir(filename);

  sprintf(filename, "data/%ld/%ld", year, day);
  createDir(filename);

  sprintf(filename, "data/%ld/%ld/%ld", year, day, bl);

  printf("[Engine/Storage] Storing block to %s\n", filename);
  FILE * fp = fopen(filename, "w");

  if(fp == NULL){
    printf("[Engine/Storage] Failed to open file %s\n", filename);
    return false;
  }

  if(fwrite(&block->timestamp, sizeof(uint64_t), 1, fp) != 1){
    printf("[Engine/Storage] Failed to write to file %s\n", filename);
    fclose(fp);
    return false;
  }

  if(fwrite(&block->trnCount, sizeof(uint32_t), 1, fp) != 1){
    printf("[Engine/Storage] Failed to write to file %s\n", filename);
    fclose(fp);
    return false;
  }

  for(uint32_t i = 0;i < block->trnCount;i++){
    if(!writeTrn(fp, block->trns[i])){
      printf("[Engine/Storage] Failed to write transaction to file %s\n", filename);
      fclose(fp);
      return false;
    }
  }

  printf("[Engine/Storage] Wrote block: %ld bytes\n", ftell(fp));
  fclose(fp);

  free(filename);

  return true;
}

bool writeTrn(FILE * fp, trn_t * trn){
  int64_t start = ftell(fp);
  if(fwrite(trn->owner, strlen(trn->owner) + 1,1,fp) != 1)
    return false;

  if(fwrite(&trn->inputCount, sizeof(uint32_t), 1, fp) != 1)
    return false;

  for(uint32_t i = 0;i<trn->inputCount;i++){
    if(fwrite(trn->inputs[i], strlen(trn->inputs[i]) + 1,1,fp) != 1)
      return false;
  }

  if(fwrite(&trn->outputCount, sizeof(uint32_t), 1, fp) != 1)
    return false;

  for(uint32_t i = 0;i<trn->outputCount;i++){
    if(!writeOutput(fp, &trn->outputs[i]))
      return false;
  }

  if(fwrite(trn->hash, strlen(trn->hash) + 1, 1, fp) != 1)
    return false;

  if(fwrite(trn->signature, strlen(trn->signature) + 1, 1, fp) != 1)
    return false;

  int64_t end = ftell(fp);
  printf("[Engine/Storage] Wrote transaction: %ld bytes\n", end - start);

  return true;
}

bool writeOutput(FILE * fp, trn_output_t * output){
  if(fwrite(output->receiver, strlen(output->receiver) + 1,1,fp) != 1)
    return false;

  if(fwrite(&output->amount, sizeof(int64_t), 1, fp) != 1)
    return false;

  return true;
}
