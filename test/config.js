var fs   = require('fs');
var zlib = require('zlib');

module.exports.port = 8081;
module.exports.host = 'http://localhost:' + module.exports.port;

module.exports.routes = function (req, res) {
  if (req.url.indexOf('/test/browser/') == 0) {
    fs.readFile('.' + req.url.replace(/\?.*$/, ''), function(err, data) {
      var content_type;
      if (/\.css$/.test(req.url)) content_type = 'text/css';
      else if (/\.js$/.test(req.url)) content_type = 'text/javascript';
      else content_type = 'text/html';
      res.writeHead(200, {'Content-Type': content_type});
      res.end(err || data);
    });
    return;
  }

  var success = function(data) {
    data || (data = {url: req.url});
    res.writeHead(200, {'Content-Type': 'application/json'});
    if (req.url.indexOf('solidus_client_jsonp_callback_100000') == -1) {
      res.end(JSON.stringify(data));
    } else {
      res.end('solidus_client_jsonp_callback_100000(' + JSON.stringify(data) + ');');
    }
  };
  var not_found = function() {
    res.writeHead(404, {'Content-Type': 'application/json'});
    res.end(JSON.stringify({error: 'Not Found: ' + req.url}));
  };

  switch (req.method + ' ' + req.url) {
  case 'GET /page':
  case 'GET /page?a=':
  case 'GET /page?a=1':
  case 'GET /page?a=1&b=2':
  case 'GET /page?a=1&b=3&c=4':
  case 'GET /page?a=,&b=%2C&c=,&d=%2C':
  case 'GET /api/resource.json?url=http%3A%2F%2Fsolidus.com':
  case 'GET /custom/route/resource.json?url=http%3A%2F%2Fsolidus.com':
  case 'GET /page?a=1&b=2&callback=solidus_client_jsonp_callback_100000':
  case 'GET /with-post-object?a=1&b=2&callback=solidus_client_jsonp_callback_100000&id=1&type=object':
  case 'GET /with-post-string?a=1&b=2&callback=solidus_client_jsonp_callback_100000&id=1&type=string':
  case 'GET /with-post-empty?a=1&b=2&callback=solidus_client_jsonp_callback_100000':
    success();
    break;

  case 'GET /not-json':
    res.writeHead(200, {'Content-Type': 'text/plain'});
    res.end('not JSON');
    break;

  case 'GET /with-headers':
    if (req.headers.accept == 'application/json') success();
    else not_found();
    break;

  case 'GET /with-basic-auth':
    if (req.headers.authorization == 'Basic S2luZ1JvbGFuZDoxMjM0NQ==') success();
    else not_found();
    break;

  case 'GET /with-gzip':
    if (req.headers['accept-encoding'].indexOf('gzip') >= 0) {
      zlib.gzip('{"url": "/with-gzip"}', function(err, response) {
        res.writeHead(200, {'Content-Encoding': 'gzip'});
        res.end(response);
      });
    } else not_found();
    break;

  case 'POST /with-post-object?a=1&b=2':
    var body = '';
    req.on('data', function(data) {body += data;});
    req.on('end', function() {
      if (body == '{"id":1,"type":"object"}') success();
      else not_found();
    });
    break;

  case 'POST /with-post-string?a=1&b=2':
    var body = '';
    req.on('data', function(data) {body += data;});
    req.on('end', function() {
      if (body == 'id=1&type=string') success();
      else not_found();
    });
    break;

  case 'POST /with-post-empty?a=1&b=2':
    var body = '';
    req.on('data', function(data) {body += data;});
    req.on('end', function() {
      if (!body) success();
      else not_found();
    });
    break;

  default:
    not_found();
  }
};
