module.exports.isNode = !(typeof window !== 'undefined' && window !== null);

module.exports.isIE = typeof XDomainRequest !== 'undefined';

module.exports.addSlash = function(string) {
  return string.slice(-1) == '/' ? string : string + '/';
};

module.exports.escapeRegExp = function(string) {
  return string.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
};
