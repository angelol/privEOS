
using namespace std;

inline vector<string> split(const string &s, const string &delim)
{
  vector<string> v{};
  if (delim.empty()) {
    v.push_back(move(s));
    return v;
  }
  string::size_type i = 0;
  string::size_type j = s.find(delim);
  while(j != std::string::npos) {
    v.push_back(move(s.substr(i, j - i)));
    i = j + delim.length();
    j = s.find(delim, i);
  }
  v.push_back(move(s.substr(i, s.length() - i)));
  return v;
}

/**
  * Lightweight format string function that does not depend on iostream 
  * or snprintf. Returns plain char* so it can be used to beautify 
  * eosio::check error messages.
  */
template<typename... Args>
inline const char *fmt(const string& format, Args const& ... args){
  string res{};
  string v[] = { args... };
  const auto format_s = split(format, "{}");
  auto begin = std::begin(v);
  for(const auto n : format_s) {
    res += n;
    if(begin == std::end(v)) {
      break;
    }
    res += *begin++;
  }
  return res.c_str();
}
