#ifndef UTILS
#define UTILS

#include <stdlib.h>
#include <stdio.h>
#include <string.h>

#include <openssl/sha.h>

char * bytesToHex(unsigned char* bytes, size_t size);
char * sha1hex(char * string);
#endif
