(function() {
  var translations = {
    'new_map': 'Nuevo'
  };

  var module = angular.module('loom_translations_es', ['pascalprecht.translate']);

  module.config(function($translateProvider) {
    $translateProvider.translations('es', translations);
  });

}());
