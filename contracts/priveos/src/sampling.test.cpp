#include <iostream>
#include <vector>

namespace eosio {
  void check(bool pred, const std::string& msg) {
    if(!pred) {
      throw std::runtime_error("Error " + msg);
    }
  }
}
#include "sampling.hpp"

int main() {
  std::vector v{1,2,3,4,5};
  uint64_t offset{0};
  uint64_t step{3};
  auto callback = [&](int a, double sampling_factor) {
    std::cout << "a: "<< a << " sampling_factor: "<< sampling_factor << std::endl;
  };
  for(int i{0}; i <100; i++) {
    std::cout << "ohai" << std::endl;
    offset = sampling<int>(offset, v, step, callback);
    std::cout << "offset: " << offset << std::endl;
  }
  
  return 0;
}