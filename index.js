const LRU        = require('lru-cache');
const _          = require('lodash');
const lru_params = [ 'max', 'maxAge', 'length', 'dispose', 'stale' ];
const Lock       = require('lock');

module.exports = function (options) {
  const cache = new LRU(_.pick(options, lru_params));
  const load  = options.load;
  const hash  = options.hash;
  const lock  = Lock();

  const result = function () {
    const args       = _.toArray(arguments);
    const parameters = args.slice(0, -1);
    const callback   = args.slice(-1).pop();

    var key;

    if (parameters.length === 0 && !hash) {
      //the load function only receives callback.
      key = '_';
    } else {
      key = hash.apply(options, parameters);
    }

    lock(key, function (release) {
      const release_and_callback = release(callback);

      var fromCache = cache.get(key);

      if (fromCache) {
        return release_and_callback(null, fromCache);
      }

      load.apply(null, parameters.concat(function (err) {
        if (err) {
          return release_and_callback(err);
        }

        cache.set(key, _.toArray(arguments).slice(1));

        return release_and_callback.apply(null, arguments);

      }));
    });

  };

  result.keys = cache.keys.bind(cache);

  return result;
};


module.exports.sync = function (options) {
  var cache = new LRU(_.pick(options, lru_params));
  var load = options.load;
  var hash = options.hash;

  var result = function () {
    var args = _.toArray(arguments);

    var key = hash.apply(options, args);

    var fromCache = cache.get(key);

    if (fromCache) {
      return fromCache;
    }

    var result = load.apply(null, args);

    cache.set(key, result);

    return result;
  };

  result.keys = cache.keys.bind(cache);

  return result;
};
