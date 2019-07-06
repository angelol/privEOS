
    
template<typename T>
uint32_t sampling(const uint32_t offset, const std::vector<T>& v, const uint32_t step_size, std::function<void(T a, double b)> callback) {
  const auto len = v.size();

  const auto sampling_factor = static_cast<double>(len) / static_cast<double>(step_size);

  if(step_size >= len) {
    /* Shortcut when step size is bigger than data set */
    for(auto it: v) {
      callback(it, 1.0);
    }
    return len;
  }
  const auto a = offset % len;
  const auto b = (a + step_size) % len;
  if(b < a) {
    // loop from a to end
    for (auto it = (v.begin() + a); it != v.end(); it++) {
      callback(*it, sampling_factor);
    }
    // loop from 0 to b
    for (auto it = v.begin(); it != (v.begin() + b); it++) {
      // the following check is just there for peace of mind, it can't happen because b is guaranteed to be < v.size()
      eosio::check(it != v.end(), "PrivEOS: Trying to access a container outside its valid range.");
      callback(*it, sampling_factor);
    }
  } else {
    // loop from a to b
    for (auto it = (v.begin() + a); it != (v.begin() + b); it++) {
      eosio::check(it != v.end(), "PrivEOS: Trying to access a container outside its valid range.");
      callback(*it, sampling_factor);
    }
  }
  return b;
}
  
