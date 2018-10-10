# Development Setup

The Development Setup makes it easy to orchestrate the different services. For management of processes we use `pm2`.

## Testing

Please see [TESTING.md](TESTING.md)

## Docker

When you're using the EOS Docker container (for `eosiocpp`, `cleos` etc..) please read through [DOCKER.md](DOCKER.md).

## Prerequisites

### EOS Installation

You need to have a working eos installation ready, either natively on your host machine (built manually) __or__ with a docker container.

### Global Node Modules

You need the following node modules in order to work properly. To install run:

```
npm install -g \
    pm2@3.2.1 \
    babel-cli@^6.26.0 \
    nodemon@^1.18.4 \
    rimraf@^2.6.2
```

### Local Node Modules

To install all local `node_modules` for the respective services, run:

```
bin/install-node-modules.sh
```

### Make EOS work smoother

Enable verbose error reporting in `config.ini`:

```
verbose-http-errors = true
contracts-console = true
max-transaction-time = 10000
```

### Enable MongoDB in Config

```
plugin = eosio::http_plugin
plugin = eosio::mongo_db_plugin
```

### Node Services

For the node services keep your working directory in the `local-development` folder and execute the commands there.

#### Start Services

To start the services `priveos_kms`, `broker` and `client` you can use the `package.json` start scripts in each folder or the pm2 process manager to start them in one window:

```
pm2 start pm2-services.json
```

#### Log to stdout

If you want do directly stream the outputs of each service to the console window, add the `--no-daemon` flag to `pm2`:

```
pm2 start pm2-services.json --no-daemon
```