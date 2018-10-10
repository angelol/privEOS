# Testing

To test the whole application (store + read file), call action `regnodes` in Makefile or verify that all nodes are registered (`make shownodes`), start all `pm2` services (`broker` and 5 `nodes` running) and then run the client test:

```
cd client
npm run test
```