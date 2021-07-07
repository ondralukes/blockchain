#include "engine.h"

pthread_t composerThread;
pthread_t validatorThread;
bool shouldStop = false;

pthread_mutex_t requestQueueMutex;
queue_t* queue;

queue_t* pendingTransactions;

pthread_mutex_t pendingBlocksMutex;
queue_t* pendingBlocks;

uint64_t nextBlockTime;

void* composer_loop(void* args){
  queue = create_queue();
  pendingTransactions = create_queue();
  while(1){
    if(pthread_mutex_lock(&requestQueueMutex) != 0){
      printf("[Engine/Composer] Mutex lock error\n");
      break;
    }
    if(queue->size != 0){
      printf("[Engine/Composer] %d requests pending\n", queue->size);
      req_t * req = queue_dequeue(queue);
      if(req->type == REQ_ENQUEUE){

        printf("[Engine/Composer] Dequeued 'enqueue' request.\n");
        struct enqueue_request* requestData = req->data.enqueue;
        trn_t * trn = requestData->trn;
        printf("[Engine/Composer] [Enqueue] hash = %s\n", trn->hash);
        queue_enqueue(pendingTransactions, trn);
        free(requestData);

      } else if(req->type == REQ_GET_HEAD) {

        printf("[Engine/Composer] Dequeued 'getHead' request.\n");
        struct get_head_request* requestData = req->data.getHead;
        trn_id_t* res = getCachedHead(requestData->publicKey);
        //res is destroyed in callThreadsafe
        callThreadsafe(requestData->callback, res);
        free(requestData->publicKey);
        free(requestData);

      } else if(req->type == REQ_GET_TRN) {

        printf("[Engine/Composer] Dequeued 'getTrn' request.\n");
        struct get_trn_request* requestData = req->data.getTrn;
        trn_id_t * id = requestData->trn_id;
        trn_t* res = load_trn(id);
        //res is destroyed in callThreadsafe
        callThreadsafe(requestData->callback, res);
        destroy_trn_id(id);
        free(requestData);

      }
      free(req);
    }
    if(pthread_mutex_unlock(&requestQueueMutex) != 0){
      printf("[Engine/Composer] Mutex unlock error\n");
      break;
    }

    if(time(NULL) >= nextBlockTime){
      printf("[Engine/Composer] [Block finalize] New block\n");
      printf("[Engine/Composer] [Block finalize] %d transactions.\n", pendingTransactions->size);

      uint32_t trnCount = pendingTransactions->size;
      block_t* block = create_block(trnCount);
      block->timestamp = nextBlockTime;
      for(uint32_t i = 0;i<trnCount;i++){
        trn_t * trn = queue_dequeue(pendingTransactions);
        printf("[Engine/Composer] [Block finalize] Transaction hash = %s\n", trn->hash);
        block->trns[i] = trn;
      }

      if(pthread_mutex_lock(&pendingBlocksMutex) != 0){
        printf("[Engine/Composer] Mutex lock error\n");
        break;
      }
      queue_enqueue(pendingBlocks, block);
      if(pthread_mutex_unlock(&pendingBlocksMutex) != 0){
        printf("[Engine/Composer] Mutex unlock error\n");
        break;
      }
      struct timeval time;
      gettimeofday(&time, NULL);

      uint64_t offset = (time.tv_sec - nextBlockTime)*1000000 + time.tv_usec;
      printf("[Engine/Composer] [Block finalize] Finalized block with offset %ld us\n", offset);

      nextBlockTime += 10;
    }
    usleep(250000);
    if(shouldStop){
      printf("[Engine/Composer] Stopping.\n");
      break;
    }
  }
  destroy_queue(queue);
  destroy_queue(pendingTransactions);
  return NULL;
}

void* validator_loop(void* args){
  pendingBlocks = create_queue();
  while(1){
    if(pthread_mutex_lock(&pendingBlocksMutex) != 0){
      printf("[Engine/Validator] Mutex lock error\n");
      break;
    }
    if(pendingBlocks->size != 0){
      printf("[Engine/Validator] %d blocks pending\n", pendingBlocks->size);
      block_t * block = queue_dequeue(pendingBlocks);
      if(pthread_mutex_unlock(&pendingBlocksMutex) != 0){
        printf("[Engine/Validator] Mutex unlock error\n");
        break;
      }

      printf("[Engine/Validator] Block contains %d transactions.\n", block->trnCount);
      printf("[Engine/Validator] WARNING: Engine validator is not implemented! Assuming valid.\n");
      while(!save(block)){
        printf("[Engine/Validator] Saving block...\n");
      }
      updateHeadCache(block);
      block_t * b = load(block->timestamp);
      print_block(b);

      free_block(b);
      free_block(block);
    } else {
      if(pthread_mutex_unlock(&pendingBlocksMutex) != 0){
        printf("[Engine/Validator] Mutex unlock error\n");
        break;
      }
    }

    usleep(25000);
    if(shouldStop){
      printf("[Engine/Validator] Stopping.\n");
      break;
    }
  }
  destroy_queue(pendingBlocks);
}

int start(){
  shouldStop = false;
  nextBlockTime = (time(NULL) / 10)*10 + 10;

  initStorage();

  if(pthread_mutex_init(&requestQueueMutex, NULL) != 0){
    return -1;
  }

  if(pthread_mutex_init(&pendingBlocksMutex, NULL) != 0){
    return -1;
  }

  int rc = pthread_create(
    &composerThread,
    NULL,
    composer_loop,
    NULL
  );

  if(rc != 0) return rc;

  return pthread_create(
    &validatorThread,
    NULL,
    validator_loop,
    NULL
  );
}

int stop(){
  shouldStop = true;
  if(pthread_join(composerThread, NULL) != 0) return -1;
  if(pthread_join(validatorThread, NULL) != 0) return -1;
  if(pthread_mutex_destroy(&requestQueueMutex) != 0) return -1;

  finishStorage();
  return pthread_mutex_destroy(&pendingBlocksMutex);
}

void enqueue(napi_env env, napi_value request){
  if(pthread_mutex_lock(&requestQueueMutex) != 0){
    printf("[Engine/API] Mutex lock error\n");
  }

  char * requestType = napiToString(
    env,
    getProperty(
      env,
      request,
      "type"
    )
  );

  req_t* req = malloc(sizeof(req_t));
  if(strcmp(requestType, "enqueue") == 0){

    req->type = REQ_ENQUEUE;
    req->data.enqueue = malloc(sizeof(struct enqueue_request));
    req->data.enqueue->trn = obj_to_trn(
      env,
      getProperty(
        env,
        request,
        "transaction"
      )
    );

    printf("[Engine/API] Enqueueing 'enqueue' request.\n");
    queue_enqueue(queue, req);

  } else if(strcmp(requestType, "getHead") == 0){

    req->type = REQ_GET_HEAD;
    req->data.getHead = malloc(sizeof(struct get_head_request));
    req->data.getHead->publicKey = napiToString(
      env,
      getProperty(
        env,
        request,
        "publicKey"
      )
    );
    toThreadsafeFunc(
      env,
      getProperty(
        env,
        request,
        "callback"
      ),
      get_head_threadsafe_js_cb,
      &req->data.getHead->callback
    );
    printf("[Engine/API] Enqueueing 'getHead' request.\n");
    queue_enqueue(queue, req);

  } else if(strcmp(requestType, "getTrn") == 0) {

    req->type = REQ_GET_TRN;
    req->data.getTrn = malloc(sizeof(struct get_trn_request));
    req->data.getTrn->trn_id = malloc(sizeof(trn_id_t));
    req->data.getTrn->trn_id->timestamp = napiToInt(
      env,
      getProperty(
        env,
        request,
        "timestamp"
      )
    );
    req->data.getTrn->trn_id->hash = napiToString(
      env,
      getProperty(
        env,
        request,
        "hash"
      )
    );
    toThreadsafeFunc(
      env,
      getProperty(
        env,
        request,
        "callback"
      ),
      get_trn_threadsafe_js_cb,
      &req->data.getTrn->callback
    );
    printf("[Engine/API] Enqueueing 'getTrn' request.\n");
    queue_enqueue(queue, req);

  } else {
    printf("[Engine/API] Unknown request type %s.\n", requestType);
  }

  free(requestType);
  if(pthread_mutex_unlock(&requestQueueMutex) != 0){
    printf("[Engine/API] Mutex unlock error\n");
  }
}
