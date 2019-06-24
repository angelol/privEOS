using namespace std;

inline bool is_any(const char& s, const string& candidates) {
  for(const char& c : candidates) {
    if(s == c) {
      return true;
    }
  }
  return false;
}

inline string::size_type find_any(const string& s, const string& delimiters, const string::size_type start=0) {
  for(std::string::size_type i = start; i < s.size(); ++i) {
    if(is_any(s[i], delimiters)) {
      return i;
    }
  }
  return string::npos;
}
  

inline vector<string> split(const string& s, const string& delimiters) {
  vector<string> v{};
  string::size_type i = 0;
  string::size_type j = find_any(s, delimiters);

  while(j != string::npos) {
    v.push_back(s.substr(i, j-i));
    i = ++j;
    j = find_any(s, delimiters, j);

    if(j == string::npos) {
      v.push_back(s.substr(i, s.length()));
    }
  }
  return v;
}

template<typename ... Args>
inline vector<string> args_to_vector(Args const& ... args){
  vector<string> v{};
  auto x = {(v.push_back(args),0)...};
  return v;
}

template<typename... Args>
inline const char *fmt(const string& format, Args const& ... args){
  string res{};
  auto v = args_to_vector(args ...);
  const auto format_s = split(format, "%");
  auto begin = v.begin();
  for(const auto n : format_s) {
    res += n;
    if(begin == v.end()) {
      break;
    }
    res += *begin++;
  }
  return res.c_str();
}
