#ifndef STORAGE_H
#define STORAGE_H

#include <stdbool.h>
#include <string.h>

#include <sys/stat.h>
#include <sys/types.h>

#include "block.h"

bool save(block_t * block);
block_t * load(uint64_t timestamp);

bool writeTrn(FILE * fp, trn_t * trn);
bool writeOutput(FILE * fp, trn_output_t * output);

trn_t * readTrn(FILE * fp);
void readOutput(FILE* fp, trn_output_t* output);
char * readString(FILE * fp);
#endif
