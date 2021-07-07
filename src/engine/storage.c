#include "storage.h"

pthread_mutex_t storageMutex;
void initStorage(){
  if(pthread_mutex_init(&storageMutex, NULL) != 0){
      printf("[Engine/Storage] Mutex init error\n");
  }
}

void finishStorage(){
  if(pthread_mutex_destroy(&storageMutex) != 0){
      printf("[Engine/Storage] Mutex destroy error\n");
  }
}

void createDir(char * path){
  struct stat st;
  if(stat(path, &st) == -1){
    printf("[Engine/Storage] Creating directory %s\n", path);
    mkdir(path, 0700);
  }
}

bool save(block_t * block){
  if(pthread_mutex_lock(&storageMutex) != 0){
    printf("[Engine/Storage] Mutex lock error\n");
    return false;
  }
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
  FILE * fp = fopen(filename, "w+b");

  if(fp == NULL){
    printf("[Engine/Storage] Failed to open file %s\n", filename);
    pthread_mutex_unlock(&storageMutex);
    return false;
  }

  if(fwrite(&block->timestamp, sizeof(uint64_t), 1, fp) != 1){
    printf("[Engine/Storage] Failed to write to file %s\n", filename);
    fclose(fp);
    pthread_mutex_unlock(&storageMutex);
    return false;
  }

  if(fwrite(&block->trnCount, sizeof(uint32_t), 1, fp) != 1){
    printf("[Engine/Storage] Failed to write to file %s\n", filename);
    fclose(fp);
    pthread_mutex_unlock(&storageMutex);
    return false;
  }

  for(uint32_t i = 0;i < block->trnCount;i++){
    if(!writeTrn(fp, block->trns[i])){
      printf("[Engine/Storage] Failed to write transaction to file %s\n", filename);
      fclose(fp);
      pthread_mutex_unlock(&storageMutex);
      return false;
    }
  }

  printf("[Engine/Storage] Wrote block: %ld bytes\n", ftell(fp));
  fseek(fp, 0, SEEK_SET);

  SHA512_CTX hashContext;
  if(SHA512_Init(&hashContext) != 1){
    printf("[Engine/Storage] OpenSSL sha512 error\n");
    pthread_mutex_unlock(&storageMutex);
    return false;
  }

  unsigned char * buf = malloc(2048);
  size_t sz;
  while((sz = fread(buf, 1, 2048, fp)) != 0){
    if(SHA512_Update(&hashContext, buf, sz) != 1){
      printf("[Engine/Storage] OpenSSL sha512 error\n");
      pthread_mutex_unlock(&storageMutex);
      return false;
    }
  }

  unsigned char * hash = malloc(SHA512_DIGEST_LENGTH);

  if(SHA512_Final(hash, &hashContext) != 1){
    printf("[Engine/Storage] OpenSSL sha512 error\n");
    pthread_mutex_unlock(&storageMutex);
    return false;
  }

  char* hexhash = bytesToHex(hash, SHA512_DIGEST_LENGTH);
  printf("[Engine/Storage] Block hash: %s\n", hexhash);
  free(hexhash);

  fseek(fp, 0, SEEK_END);

  if(fwrite(hash, SHA512_DIGEST_LENGTH, 1, fp) != 1){
    printf("[Engine/Storage] Failed to write to file %s\n", filename);
    fclose(fp);
    pthread_mutex_unlock(&storageMutex);
    return false;
  }

  fclose(fp);

  block->hash = hash;

  free(filename);

  if(pthread_mutex_unlock(&storageMutex) != 0){
    printf("[Engine/Storage] Mutex unlock error\n");
    return false;
  }
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

block_t * load(uint64_t t){
  if(pthread_mutex_lock(&storageMutex) != 0){
    printf("[Engine/Storage] Mutex lock error\n");
    return false;
  }
  uint64_t timestamp = t;
  uint64_t year = 1970 + timestamp/31556926;
  timestamp %= 31556926;
  uint64_t day = timestamp/86400;
  timestamp %= 86400;
  uint64_t bl = timestamp/10;

  char* filename = malloc(1024);

  sprintf(filename, "data/%ld/%ld/%ld", year, day, bl);

  printf("[Engine/Storage] Loading block from %s\n", filename);

  FILE * fp = fopen(filename, "rb");

  if(fp == NULL){
    printf("[Engine/Storage] Failed to open file.\n");
    pthread_mutex_unlock(&storageMutex);
    return NULL;
  }

  if(fread(&timestamp, sizeof(uint64_t), 1, fp) != 1){
    printf("[Engine/Storage] Failed to read from file.\n");
    fclose(fp);
    pthread_mutex_unlock(&storageMutex);
    return NULL;
  }

  if(t != timestamp){
    printf("[Engine/Storage] Timestamps does not match. (%ld != %ld)\n", t, timestamp);
    fclose(fp);
    pthread_mutex_unlock(&storageMutex);
    return NULL;
  }

  uint32_t trnCount;
  if(fread(&trnCount, sizeof(uint32_t), 1, fp) != 1){
    printf("[Engine/Storage] Failed to read from file.\n");
    fclose(fp);
    pthread_mutex_unlock(&storageMutex);
    return NULL;
  }

  block_t * block = create_block(trnCount);
  block->timestamp = timestamp;

  for(uint32_t i =0;i<trnCount;i++){
    block->trns[i] = readTrn(fp);
  }

  if(pthread_mutex_unlock(&storageMutex) != 0){
    printf("[Engine/Storage] Mutex unlock error\n");
    return false;
  }

  return block;
}

trn_t * readTrn(FILE * fp){
  trn_t * res = malloc(sizeof(trn_t));
  res->owner = readString(fp);
  if(fread(&res->inputCount, sizeof(uint32_t), 1, fp) != 1){
    printf("[Engine/Storage] Failed to read from file.\n");
    fclose(fp);
    return NULL;
  }

  res->inputs = malloc(res->inputCount * sizeof(char*));
  for(uint32_t i = 0;i<res->inputCount;i++){
    res->inputs[i] = readString(fp);
  }

  if(fread(&res->outputCount, sizeof(uint32_t), 1, fp) != 1){
    printf("[Engine/Storage] Failed to read from file.\n");
    fclose(fp);
    return NULL;
  }

  res->outputs = malloc(res->outputCount * sizeof(trn_output_t));
  for(uint32_t i =0;i<res->outputCount;i++){
    readOutput(fp, &res->outputs[i]);
  }

  res->hash = readString(fp);
  res->signature = readString(fp);
  return res;
}

void readOutput(FILE* fp, trn_output_t* output){
  output->receiver = readString(fp);
  fread(&output->amount, sizeof(int64_t), 1, fp);
}

char * readString(FILE * fp){
  int64_t start = ftell(fp);
  size_t len = 1;
  while(fgetc(fp) != '\0') len++;

  fseek(fp, start, SEEK_SET);

  char* res = malloc(len);
  fread(res, len, 1, fp);
  printf("[Engine/Storage] Read string %s\n", res);
  return res;
}

void updateHeadCache(block_t * block){
  if(pthread_mutex_lock(&storageMutex) != 0){
    printf("[Engine/Storage] Mutex lock error\n");
    return;
  }

  for(uint32_t i = 0;i<block->trnCount;i++){
    char* owner = block->trns[i]->owner;
    char* hexhash = sha1hex(owner);

    createDir("data/head_cache");

    char * path = malloc(2048);
    sprintf(path, "data/head_cache/%s", hexhash);

    FILE * cacheFile = fopen(path, "wb");

    if(fwrite(block->trns[i]->hash, strlen(block->trns[i]->hash) + 1, 1, cacheFile) != 1){
      printf("[Engine/Storage] Failed to write to file %s\n", path);
    }

    if(fwrite(&block->timestamp, sizeof(uint64_t), 1, cacheFile) != 1){
      printf("[Engine/Storage] Failed to write to file %s\n", path);
    }

    fclose(cacheFile);

    free(path);

    printf("[Engine/Storage] Updated cache at %s\n", hexhash);
    free(hexhash);
  }
  if(pthread_mutex_unlock(&storageMutex) != 0){
    printf("[Engine/Storage] Mutex unlock error\n");
    return;
  }
}

trn_id_t* getCachedHead(char * publicKey){
  if(pthread_mutex_lock(&storageMutex) != 0){
    printf("[Engine/Storage] Mutex lock error\n");
    return NULL;
  }
  trn_id_t * res = malloc(sizeof(trn_id_t));
  char * hexhash = sha1hex(publicKey);

  char * path = malloc(2048);

  sprintf(path, "data/head_cache/%s", hexhash);

  FILE * cacheFile = fopen(path, "rb");
  if(cacheFile == NULL){
    if(pthread_mutex_unlock(&storageMutex) != 0){
      printf("[Engine/Storage] Mutex unlock error\n");
    }
    return NULL;
  }

  res->hash = readString(cacheFile);

  if(fread(&res->timestamp, sizeof(uint64_t), 1, cacheFile) != 1){
    printf("[Engine/Storage] Failed to read file %s\n", path);
  }

  fclose(cacheFile);

  free(path);
  free(hexhash);
  if(pthread_mutex_unlock(&storageMutex) != 0){
    printf("[Engine/Storage] Mutex unlock error\n");
  }
  return res;
}

trn_t* load_trn(trn_id_t* id){
  block_t* b = load(id->timestamp);
  if(b == NULL) return NULL;

  trn_t * trn;
  for(uint32_t i = 0;i<b->trnCount;i++){
    char* hash = b->trns[i]->hash;
    if(strcmp(id->hash, hash) == 0){
      trn = b->trns[i];
    } else {
      destroy_trn(b->trns[i]);
    }
  }

  if(b->hash != NULL) free(b->hash);
  free(b);
  return trn;
}
