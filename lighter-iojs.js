#!/usr/bin/env iojs

require(__dirname + '/common/process/cli')({
  aliases: {
    n: 'new',
    d: 'debug',
    v: 'dev',
    s: 'stage',
    t: 'test',
    c: 'canary',
    p: 'prod'
  }
});