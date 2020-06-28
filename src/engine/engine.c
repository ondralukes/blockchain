#include "engine.h"

pthread_t thread;
bool shouldStop = false;

pthread_mutex_t mutex;
queue_t* queue;

void* engine_loop(void* args){
  queue = create_queue();
  while(1){
    if(pthread_mutex_lock(&mutex) != 0){
      printf("[Engine] Mutex lock error\n");
      break;
    }
    printf("[Engine] %d requests pending\n", queue->size);
    if(queue->size != 0){
      req_t * req = queue_dequeue(queue);
      if(req->type == REQ_ENQUEUE){
        printf("[Engine] Dequeued 'enqueue' request.\n");
        struct enqueue_request* requestData = req->data.enqueue;
        trn_t * trn = requestData->trn;
        printf("[Engine] [Enqueue] hash = %s\n", trn->hash);
        destroy_trn(trn);
        free(requestData);
      }
      free(req);
    }
    if(pthread_mutex_unlock(&mutex) != 0){
      printf("[Engine] Mutex unlock error\n");
      break;
    }
    usleep(250000);
    if(shouldStop) break;
  }
  destroy_queue(queue);
  return NULL;
}

int start(){
  shouldStop = false;

  if(pthread_mutex_init(&mutex, NULL) != 0){
    return -1;
  }

  return pthread_create(
    &thread,
    NULL,
    engine_loop,
    NULL
  );
}

int stop(){
  shouldStop = true;
  if(pthread_join(thread, NULL) != 0) return -1;
  return pthread_mutex_destroy(&mutex);
}

void enqueue(napi_env env, napi_value request){
  if(pthread_mutex_lock(&mutex) != 0){
    printf("[Engine API] Mutex lock error\n");
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

    printf("[Engine API] Enqueueing 'enqueue' request.\n");
    queue_enqueue(queue, req);
  } else {
    printf("[Engine API] Unknown request type.\n");
  }

  free(requestType);
  if(pthread_mutex_unlock(&mutex) != 0){
    printf("[Engine API] Mutex unlock error\n");
  }
}
