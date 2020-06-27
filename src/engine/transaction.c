#include "transaction.h"

trn_t * obj_to_trn(napi_env env, napi_value obj){
  printf("[Engine] [TRN Parse] BEGIN\n");
  trn_t * t = malloc(sizeof(trn_t));
  t->owner = napiToString(
    env,
    getProperty(env, obj, "owner")
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

  printf("[Engine] [TRN Parse] owner=%s\n",t->owner);
  printf("[Engine] [TRN Parse] inputs (%d):\n",t->inputCount);
  for(uint32_t i = 0;i<t->inputCount;i++){
    printf("[Engine] [TRN Parse] inputs[%d] = %s\n", i, t->inputs[i]);
  }
  printf("[Engine] [TRN Parse] outputs (%d):\n",t->outputCount);
  for(uint32_t i = 0;i<t->outputCount;i++){
    printf("[Engine] [TRN Parse] outputs[%d]\n", i);
    printf(
      "                                .receiver = %s\n",
      t->outputs[i].receiver
    );
    printf(
      "                                .amount = %ld\n",
      t->outputs[i].amount
    );
  }
  printf("[Engine] [TRN Parse] END\n");
}
