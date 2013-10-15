(function() {
  var translations = {
    'new_map': 'New Map'
  };

  var module = angular.module('loom_translations_en', ['pascalprecht.translate']);

  module.config(function($translateProvider) {
    $translateProvider.translations('en', translations);
  });

}());
