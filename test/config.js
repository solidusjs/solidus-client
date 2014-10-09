var fs   = require('fs');
var zlib = require('zlib');

module.exports.port = 8081;
module.exports.host = 'http://localhost:' + module.exports.port;

module.exports.routes = function (req, res) {
  if (req.url.indexOf('/test/browser/') == 0) {
    fs.readFile('.' + req.url.replace(/\?.*$/, ''), function(err, data) {
      res.writeHead(200);
      res.end(err || data);
    });
    return;
  }

  var success = function() {
    res.writeHead(200, {'Content-Type': 'application/json'});
    res.end(JSON.stringify({url: req.url}));
  };
  var not_found = function() {
    res.writeHead(404, {'Content-Type': 'application/json'});
    res.end(JSON.stringify({error: 'Not Found: ' + req.url}));
  };

  switch (req.url) {
  case '/page':
  case '/page?a=':
  case '/page?a=1':
  case '/page?a=1&b=2':
  case '/page?a=1&b=3&c=4':
  case '/page?a=,&b=%2C&c=,&d=%2C':
  case '/api/resource.json?url=http%3A%2F%2Fsolidus.com':
  case '/custom/route/resource.json?url=http%3A%2F%2Fsolidus.com':
    success();
    break;

  case '/page?a=1&b=2&callback=solidus_client_jsonp_callback_100000':
  case '/with-post-object?a=1&b=2&callback=solidus_client_jsonp_callback_100000&id=1&type=object':
  case '/with-post-string?a=1&b=2&callback=solidus_client_jsonp_callback_100000&id=1&type=string':
  case '/with-post-empty?a=1&b=2&callback=solidus_client_jsonp_callback_100000':
    if (req.method == 'GET') {
      res.writeHead(200, {'Content-Type': 'application/json'});
      res.end('solidus_client_jsonp_callback_100000(' + JSON.stringify({url: req.url}) + ');');
    } else not_found();
    break;

  case '/not-json':
    res.writeHead(200, {'Content-Type': 'text/plain'});
    res.end('not JSON');
    break;

  case '/with-headers':
    if (req.headers.accept == 'application/json') success();
    else not_found();
    break;

  case '/with-basic-auth':
    if (req.headers.authorization == 'Basic S2luZ1JvbGFuZDoxMjM0NQ==') success();
    else not_found();
    break;

  case '/with-gzip':
    if (req.headers['accept-encoding'].indexOf('gzip') >= 0) {
      zlib.gzip('{"url": "/with-gzip"}', function(err, response) {
        res.writeHead(200, {'Content-Encoding': 'gzip'});
        res.end(response);
      });
    } else not_found();
    break;

  case '/with-post-object?a=1&b=2':
    if (req.method == 'POST') {
      var body = '';
      req.on('data', function(data) {
        body += data;
      });
      req.on('end', function() {
        if (body == '{"id":1,"type":"object"}') success();
        else not_found();
      });
    } else not_found();
    break;

  case '/with-post-string?a=1&b=2':
    if (req.method == 'POST') {
      var body = '';
      req.on('data', function(data) {
        body += data;
      });
      req.on('end', function() {
        if (body == 'id=1&type=string') success();
        else not_found();
      });
    } else not_found();
    break;

  case '/with-post-empty?a=1&b=2':
    if (req.method == 'POST') {
      var body = '';
      req.on('data', function(data) {
        body += data;
      });
      req.on('end', function() {
        if (!body) success();
        else not_found();
      });
    } else not_found();
    break;

  default:
    not_found();
  }
};
