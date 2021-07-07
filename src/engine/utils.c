#include "utils.h"

char * bytesToHex(unsigned char* bytes, size_t size){
  size_t resultSize = size * 2;
  char* res = malloc(resultSize + 1);
  char* ptr = res;
  const char* chars = "0123456789abcdef";
  for(size_t i = 0;i<size;i++){
    unsigned char c = bytes[i];
    *ptr = chars[(c&0xf0) >> 4];
    ptr++;
    *ptr = chars[c&0xf];
    ptr++;
  }
  *ptr = '\0';
  return res;
}

char * sha1hex(char * string){
  unsigned char hash[SHA_DIGEST_LENGTH];
  SHA1(string, strlen(string), hash);
  return bytesToHex(hash, SHA_DIGEST_LENGTH);
}
