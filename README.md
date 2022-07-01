# forward-to

### Installation

```
yarn global add forward-to
```

### Usage

```
forward-to localhost:3400 https://www.google.com
```

### Define response headers

```
forward-to localhost:3400 https://www.google.com -H "Access-Control-Allow-Origin: *"
```

### Multiple proxies

```
forward-to \
  localhost:3400 https://api.myapp.com \
  -H "Access-Control-Allow-Origin: *" \
  localhost:3500 https://api.myapp.com/x \
  -H "Access-Control-Allow-Origin: localhost.myapp.com"
```
