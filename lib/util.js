module.exports.isNode = !(typeof window !== 'undefined' && window !== null);

module.exports.isIE = typeof XDomainRequest !== 'undefined';
