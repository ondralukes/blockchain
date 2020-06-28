#include "transaction.h"

trn_t * obj_to_trn(napi_env env, napi_value obj){
  trn_t * t = malloc(sizeof(trn_t));
  t->owner = napiToString(
    env,
    getProperty(env, obj, "owner")
  );
  t->hash = napiToString(
    env,
    getProperty(env, obj, "hash")
  );
  t->signature = napiToString(
    env,
    getProperty(env, obj, "signature")
  );

  napi_value inputs = getProperty(env, obj, "inputs");
  uint32_t inputCount = getArrayLength(env, inputs);

  t->inputCount = inputCount;
  t->inputs = malloc(sizeof(char*) * inputCount);
  for(uint32_t i = 0;i<inputCount;i++){
    t->inputs[i] = napiToString(
      env,
      getArrayElement(
        env,
        inputs,
        i
      )
    );
  }

  napi_value outputs = getProperty(env, obj, "outputs");
  uint32_t outputCount = getArrayLength(env, outputs);

  t->outputCount = outputCount;
  t->outputs = malloc(sizeof(trn_output_t) * outputCount);
  for(uint32_t i = 0;i<outputCount;i++){
    napi_value output = getArrayElement(
      env,
      outputs,
      i
    );

    t->outputs[i].receiver = napiToString(
      env,
      getProperty(
        env,
        output,
        "receiver"
      )
    );
    t->outputs[i].amount = napiToInt(
      env,
      getProperty(
        env,
        output,
        "amount"
      )
    );
  }

  return t;
}

void destroy_trn(trn_t* t){
  free(t->owner);
  free(t->hash);
  free(t->signature);

  for(uint32_t i = 0;i < t->inputCount;i++){
    free(t->inputs[i]);
  }
  free(t->inputs);

  for(uint32_t i = 0;i < t->outputCount;i++){
    free(t->outputs[i].receiver);
  }
  free(t->outputs);
  free(t);
}
