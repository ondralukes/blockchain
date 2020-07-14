#ifndef STORAGE_H
#define STORAGE_H

#include <stdbool.h>
#include <string.h>

#include <sys/stat.h>
#include <sys/types.h>

#include <openssl/sha.h>

#include "block.h"
#include "utils.h"

bool save(block_t * block);
block_t * load(uint64_t timestamp);

bool writeTrn(FILE * fp, trn_t * trn);
bool writeOutput(FILE * fp, trn_output_t * output);

trn_t * readTrn(FILE * fp);
void readOutput(FILE* fp, trn_output_t* output);
char * readString(FILE * fp);

void updateHeadCache(block_t * block);
#endif
