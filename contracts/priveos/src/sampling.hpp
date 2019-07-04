
template <class T> 
class Sampling {
  public:
    Sampling(uint64_t offset, const std::vector<T>& v, uint64_t step_size, std::function<void(T a, double b)> callback): 
      v{v}, 
      callback{callback}, 
      offset{offset}, 
      step_size{step_size} {
        sampling_factor = static_cast<double>(v.size()) / static_cast<double>(step_size);
    }
    ~Sampling() {}
    
  uint64_t run() {
    const auto len = static_cast<uint64_t>(v.size());

    if(step_size >= len) {
      /* Shortcut when step size is bigger than data set */
      for(auto it: v) {
        callback(it, 1.0);
      }
      offset = len;
      return offset;
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
        callback(*it, sampling_factor);
      }
    } else {
      // loop from a to b
      for (auto it = (v.begin() + a); it != (v.begin() + b); it++) {
        callback(*it, sampling_factor);
      }
    }
    offset = b;
    return offset;
  }
    
  private:
    std::vector<T> v;
    std::function<void(T a, double b)> callback;
    uint64_t step_size;
    uint64_t offset;
    double sampling_factor;
};