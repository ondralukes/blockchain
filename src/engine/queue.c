#include "queue.h"

queue_t * create_queue(){
  queue_t * q = malloc(sizeof(queue_t));
  q->size = 0;
  q->ep = NULL;
  q->dp = NULL;
  return q;
}

void destroy_queue(queue_t*q){
  while(q->size != 0){
    queue_dequeue(q);
  }
  free(q);
}

void queue_enqueue(queue_t * q, int val){
  struct queue_node * qn = malloc(sizeof(struct queue_node));
  qn->value = val;
  if(q->ep == NULL){
    qn->next = NULL;
    q->ep = qn;
    q->dp = qn;
  } else {
    q->ep->next = qn;
    qn->next = NULL;
    q->ep = qn;
  }

  q->size++;
}


int queue_dequeue(queue_t * q){
  struct queue_node * qn = q->dp;

  if(q->dp->next == NULL){
    q->dp = NULL;
    q->ep = NULL;
  } else {
    q->dp = q->dp->next;
  }

  int val = qn->value;
  free(qn);

  q->size--;
  return val;
}
