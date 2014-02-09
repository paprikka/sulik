var https = require('https');
var fs = require('fs')
var serve = require('koa-static');
var koa = require('koa');
var app = koa();


var options = {
  key: fs.readFileSync('./cert/webserver.nopass.key'),
  cert: fs.readFileSync('./cert/newcert.pem')
}

app.use(serve('dist/'));

console.log('listening on port 3000');


https.createServer(options, app.callback()).listen(3000);