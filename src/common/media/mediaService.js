(function() {
  var module = angular.module('loom_media_service', ['ngSanitize']);

  module.config(function($sceDelegateProvider) {
    $sceDelegateProvider.resourceUrlWhitelist([
      // Allow same origin resource loads.
      'self',
      'http://youtube.com/**',
      'http://soundcloud.com/**',
    ]);

  });

  module.provider('mediaService', function() {

  });

})();