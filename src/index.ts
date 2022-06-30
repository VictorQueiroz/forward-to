#!/usr/bin/env node

import assert, { AssertionError } from 'assert';
import http from 'http';
import https from 'https';
import perf_hooks from 'perf_hooks';

interface IProxy {
  srcHostname: string;
  srcPort: number;
  dest: URL;
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
        assert.strict.ok(typeof dest === 'string');
        args.shift();
        proxies.push({
          srcHostname,
          srcPort,
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
        res2.pipe(res).on('finish',() => {
          console.log('%s:%d %s %s > %s (%d ms)',srcHostname,srcPort,req.url,req.method,dest.href,perf_hooks.performance.now() - startTime);
        });
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
