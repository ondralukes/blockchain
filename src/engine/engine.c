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
      int val = queue_dequeue(queue);
      printf("[Engine] Dequeued %d\n", val);
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

void enqueue(int val){
  if(pthread_mutex_lock(&mutex) != 0){
    printf("[Engine] Mutex lock error\n");
  }
  queue_enqueue(queue, val);
  if(pthread_mutex_unlock(&mutex) != 0){
    printf("[Engine] Mutex unlock error\n");
  }
}
