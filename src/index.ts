#!/usr/bin/env node

import assert, { AssertionError } from 'assert';
import http from 'http';
import https from 'https';
import perf_hooks from 'perf_hooks';

interface IProxy {
  srcHostname: string;
  srcPort: number;
  dest: URL;
  headers: Map<string,string>;
}

(async() => {
  const args = Array.from(process.argv);
  const proxies = new Array<IProxy>();
  while(args.length > 0) {
    const arg = args[0];
    assert.strict.ok(typeof arg === 'string');
    switch(arg){
      case process.argv[0]:
      case process.argv[1]:
        args.shift();
        break;
      case '-H': {
        args.shift();
        const proxy = proxies[proxies.length-1];
        assert.strict.ok(proxy);
        const value = args.shift();
        assert.strict.ok(typeof value === 'string' && value.indexOf(':') !== -1);
        const header = value.split(':');
        assert.strict.ok(typeof header[0] === 'string' && typeof header[1] === 'string');
        proxy.headers.set(header[0],header[1]);
        break;
      }
      default: {
        const slices = arg.split(':');
        const srcHostname = slices[0];
        const portAsString = slices[1];
        assert.strict.ok(
          arg.indexOf(':') !== -1 && typeof srcHostname === 'string' && typeof portAsString === 'string',
          'source must be in the following format: $hostname:$port'
        );
        const srcPort = parseInt(portAsString,10);
        assert.strict.ok(
          Number.isFinite(srcPort) && !Number.isNaN(srcPort) && typeof srcPort === 'number',
          `invalid port "${portAsString}" for source: ${srcHostname}`
        );
        args.shift();
        const dest = args[0];
        const headers = new Map<string,string>();
        assert.strict.ok(typeof dest === 'string');
        args.shift();
        proxies.push({
          srcHostname,
          srcPort,
          headers,
          dest: new URL(dest)
        });
        break;
      }
    }
  }
  assert.strict.ok(proxies.length > 0,'please specify at least one proxy');
  const servers = new Array<http.Server>();
  const agent = new https.Agent({  
    rejectUnauthorized: false
  });
  for(const {
    srcHostname,
    headers,
    srcPort,
    dest
  } of proxies){
    const server = http.createServer((req,res) => {
      const startTime = perf_hooks.performance.now();
      https.request(dest,{
        method: req.method,
        headers: req.headers,
        agent
      }, res2 => {
        console.log('%s:%d %s %s > %s (%d ms)',srcHostname,srcPort,req.url,req.method,dest.href,perf_hooks.performance.now() - startTime);
        for(const [k,v] of headers){
          res.setHeader(k,v);
        }
        res2.pipe(res);
      }).end();
    }).listen(srcPort,srcHostname,() => {
      console.log('%s:%d > %s',srcHostname,srcPort,dest);
    });
    servers.push(server);
  }
})().catch(reason => {
  if(reason instanceof AssertionError){
    console.error(reason.message);
  } else {
    console.error('proxy command failed with error: %o',reason);
  }
  process.exitCode = 1;
});
