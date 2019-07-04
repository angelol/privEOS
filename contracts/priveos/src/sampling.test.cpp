#include <iostream>
#include <vector>
#include "sampling.hpp"

int main() {
  std::vector v{1,2,3,4,5};
  uint64_t offset{0};
  uint64_t step{6};
  auto callback = [&](int a, double sampling_factor) {
    std::cout << "a: "<< a << " sampling_factor: "<< sampling_factor << std::endl;
  };
  for(int i{0}; i <10; i++) {
    std::cout << "ohai" << std::endl;
    Sampling<int> x{offset, v, step, callback};
    offset = x.run();
    std::cout << "offset: " << offset << std::endl;
  }
  
  return 0;
}