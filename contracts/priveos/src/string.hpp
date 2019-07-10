using namespace std;

template<typename T>
inline string toString(const T& x) {
  if constexpr(is_same<T, string>::value) {
    return x;
  } else if constexpr(is_same<T, eosio::name>::value || is_same<T, eosio::asset>::value){
    return x.to_string();
  } else if constexpr(is_same<T, eosio::symbol>::value) {
    return x.code().to_string();
  } else {
    return to_string(x);
  }
} 

template<typename... Args>
inline string fmt(const string& format, Args const& ... args){
  char buf[512];
  snprintf(buf, sizeof(buf), format.c_str(), toString(args).c_str()...);
  return buf;
}


