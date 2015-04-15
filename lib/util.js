module.exports.isNode = !(typeof window !== 'undefined' && window !== null);

module.exports.supportsCORS = !module.exports.isNode && (('withCredentials' in new XMLHttpRequest()) || (typeof XDomainRequest !== 'undefined'));
