#ifndef ENGINE_H
#define ENGINE_H

#include <js_native_api.h>
#include <node_api.h>

#include <stdio.h>
#include <stdlib.h>
#include <pthread.h>
#include <unistd.h>
#include <stdbool.h>

#include "queue.h"
#include "object_utils.h"
#include "request.h"

int start();

int stop();

void enqueue(napi_env env, napi_value request);
#endif
