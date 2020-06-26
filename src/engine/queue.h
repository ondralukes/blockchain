#ifndef QUEUE_H
#define QUEUE_H

#include <stdlib.h>

struct queue_node {
  int value;
  struct queue_node* next;
};

typedef struct {
  int size;
  struct queue_node* ep;
  struct queue_node* dp;
} queue_t;

queue_t * create_queue();
void destroy_queue();

void queue_enqueue(queue_t * q, int val);
int queue_dequeue(queue_t * q);

#endif
