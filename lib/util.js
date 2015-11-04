var qs = require('querystring');

module.exports.isNode = !(typeof window !== 'undefined' && window !== null);

module.exports.supportsCORS = !module.exports.isNode && (typeof XMLHttpRequest !== 'undefined') && ('withCredentials' in new XMLHttpRequest());

module.exports.params = !module.exports.isNode?qs.parse(window.location.search.split('?').pop()):{};
