# Docker Troubleshooting Guide

`eos_docker_rebuild` make command fails:

```
rm: it is dangerous to operate recursively on '/'
rm: use --no-preserve-root to override this failsafe
	Unable to remove directory /. Please remove this directory and run this script /eos/scripts/eosio_build_ubuntu.sh again. 0
	Exiting now.

make[1]: *** [eos_docker_build] Error 1
make: *** [eos_docker_rebuild] Error 2
```

Solution:
Execute the `/eos/eosio_build.sh` script directly in container.