#include "transaction.h"

#define NAPI_CALL(env, call)                                      \
  do {                                                            \
    napi_status status = (call);                                  \
    if (status != napi_ok) {                                      \
      const napi_extended_error_info* error_info = NULL;          \
      napi_get_last_error_info((env), &error_info);               \
      bool is_pending;                                            \
      napi_is_exception_pending((env), &is_pending);              \
      if (!is_pending) {                                          \
        const char* message = (error_info->error_message == NULL) \
            ? "empty error message"                               \
            : error_info->error_message;                          \
        napi_throw_error((env), NULL, message);                   \
        return NULL;                                              \
      }                                                           \
    }                                                             \
  } while(0)

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

napi_value trn_to_obj(napi_env env, trn_t* trn){
  napi_value res;
  NAPI_CALL(
    env,
    napi_create_object(
      env,
      &res
    )
  );

  napi_value owner;
  NAPI_CALL(
    env,
    napi_create_string_utf8(
      env,
      trn->owner,
      NAPI_AUTO_LENGTH,
      &owner
    )
  );

  NAPI_CALL(
    env,
    napi_set_named_property(
      env,
      res,
      "owner",
      owner
    )
  );

  napi_value hash;
  NAPI_CALL(
    env,
    napi_create_string_utf8(
      env,
      trn->hash,
      NAPI_AUTO_LENGTH,
      &hash
    )
  );

  NAPI_CALL(
    env,
    napi_set_named_property(
      env,
      res,
      "hash",
      hash
    )
  );

  napi_value signature;
  NAPI_CALL(
    env,
    napi_create_string_utf8(
      env,
      trn->signature,
      NAPI_AUTO_LENGTH,
      &signature
    )
  );

  NAPI_CALL(
    env,
    napi_set_named_property(
      env,
      res,
      "signature",
      signature
    )
  );

  napi_value inputs;
  NAPI_CALL(
    env,
    napi_create_array(
      env,
      &inputs
    )
  );

  for(uint32_t i = 0;i<trn->inputCount;i++){
    napi_value input;
    NAPI_CALL(
      env,
      napi_create_string_utf8(
        env,
        trn->inputs[i],
        NAPI_AUTO_LENGTH,
        &input
      )
    );
    NAPI_CALL(
      env,
      napi_set_element(
        env,
        inputs,
        i,
        input
      )
    );
  }

  NAPI_CALL(
    env,
    napi_set_named_property(
      env,
      res,
      "inputs",
      inputs
    )
  );

  napi_value outputs;
  NAPI_CALL(
    env,
    napi_create_array(
      env,
      &outputs
    )
  );

  for(uint32_t i = 0;i<trn->outputCount;i++){
    napi_value output;
    NAPI_CALL(
      env,
      napi_create_object(
        env,
        &output
      )
    );

    napi_value receiver;
    NAPI_CALL(
      env,
      napi_create_string_utf8(
        env,
        trn->outputs[i].receiver,
        NAPI_AUTO_LENGTH,
        &receiver
      )
    );

    napi_value amount;
    NAPI_CALL(
      env,
      napi_create_int64(
        env,
        trn->outputs[i].amount,
        &amount
      )
    );

    NAPI_CALL(
      env,
      napi_set_named_property(
        env,
        output,
        "receiver",
        receiver
      )
    );
    NAPI_CALL(
      env,
      napi_set_named_property(
        env,
        output,
        "amount",
        amount
      )
    );

    NAPI_CALL(
      env,
      napi_set_element(
        env,
        outputs,
        i,
        output
      )
    );
  }

  NAPI_CALL(
    env,
    napi_set_named_property(
      env,
      res,
      "outputs",
      outputs
    )
  );

  return res;
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

void print_trn(trn_t* t){
  printf("[Engine/Print/Transaction] Transaction %s\n", t->hash);
  printf("[Engine/Print/Transaction] owner: %s\n", t->owner);
  printf("[Engine/Print/Transaction] signature: %s\n", t->signature);
  printf("[Engine/Print/Transaction] inputs (%d):\n", t->inputCount);
  for(uint32_t i = 0;i<t->inputCount;i++){
    printf("[Engine/Print/Transaction] %s\n", t->inputs[i]);
  }
}

void destroy_trn_id(trn_id_t* id){
  free(id->hash);
  free(id);
}
