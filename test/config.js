var fs   = require('fs');
var zlib = require('zlib');
var url  = require('url');

// Safari doesn't like localhost, see https://www.browserstack.com/question/663
module.exports.port = 8081;
module.exports.host = 'http://lvh.me:' + module.exports.port;

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
    data || (data = {url: req.url.replace(/solidus_client_jsonp_callback_\d+/, 'solidus_client_jsonp_callback')});
    res.writeHead(200, {'Content-Type': 'application/json'});
    var callback = url.parse(req.url, true).query.callback;
    if (callback) {
      res.end(callback + '(' + JSON.stringify(data) + ');');
    } else {
      res.end(JSON.stringify(data));
    }
  };

  var not_found = function() {
    res.writeHead(404, {'Content-Type': 'application/json'});
    res.end(JSON.stringify({error: 'Not Found: ' + req.url}));
  };

  switch ((req.method + ' ' + req.url).replace(/solidus_client_jsonp_callback_\d+/, 'solidus_client_jsonp_callback')) {
  case 'GET /page':
  case 'GET /page?a=':
  case 'GET /page?a=1':
  case 'GET /page?a=1&b=2':
  case 'GET /page?a=1&b=3&c=4':
  case 'GET /page?a=%2C&b=%2C&c=%2C&d=%252C':
  case 'GET /page?a=1&b=2&c%5B0%5D=3&c%5B1%5D=4&d%5Be%5D=5&d%5Bf%5D%5B0%5D=6&d%5Bf%5D%5B1%5D=7':
  case 'GET /page?a=1&b=2&c%5B0%5D=3&c%5B1%5D=4&d=%7B%22e%22%3A5%2C%22f%22%3A%5B6%2C7%5D%7D':
  case 'GET /api/resource.json?url=http%3A%2F%2Fsolidus.com%3Fa%3D1':
  case 'GET /custom/route/resource.json?url=http%3A%2F%2Fsolidus.com':
  case 'GET /page?a=1&b=2&callback=solidus_client_jsonp_callback':
  case 'GET /with-post-object?a=1&b=2&callback=solidus_client_jsonp_callback&id=1&type=object':
  case 'GET /with-post-string?a=1&b=2&callback=solidus_client_jsonp_callback&id=1&type=string':
  case 'GET /with-post-empty?a=1&b=2&callback=solidus_client_jsonp_callback':
    success();
    break;

  case 'GET /not-json':
    res.writeHead(200, {'Content-Type': 'text/plain'});
    res.end('not JSON');
    break;

  case 'GET /200-error':
    success({status: 'error', error: 'Something went wrong'});
    break;

  case 'GET /200-error-not-found':
    success({status: 'error', error: 'Item Not Found'});
    break;

  case 'GET /with-headers':
    if (req.headers.accept == 'application/json') success();
    else not_found();
    break;

  case 'GET /with-basic-auth':
    if (req.headers.authorization == 'Basic S2luZ1JvbGFuZDoxMjM0NQ==') success();
    else not_found();
    break;

  case 'GET /with-delay':
  case 'GET /api/resource.json?url=http%3A%2F%2Fsolidus.com%2Fwith-delay':
  case 'GET /with-delay?callback=solidus_client_jsonp_callback':
    setTimeout(success, 100);
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
