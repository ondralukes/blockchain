#ifndef ENGINE_H
#define ENGINE_H

#include <stdio.h>
#include <pthread.h>
#include <unistd.h>
#include <stdbool.h>

#include "queue.h"

int start();

int stop();

void enqueue(int val);
#endif
