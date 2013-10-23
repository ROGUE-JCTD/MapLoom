(function() {
  var module = angular.module('ngBoilerplate', [
    'templates-app',
    'templates-common',
    'loom',
    'ui.bootstrap',
    'ui.router',
    'pascalprecht.translate',
    'loom_translations_en',
    'loom_translations_es'
  ]);

  module.run(function run() {
    console.log('---- app.js.run');
  });

  module.controller('AppCtrl', function AppCtrl($scope, $location, $translate, mapService) {
    console.log('---- ngBoilerplate.controller.');

    $scope.$on('$stateChangeSuccess', function(event, toState) {
      if (angular.isDefined(toState.data.pageTitle)) {
        $scope.pageTitle = toState.data.pageTitle + ' | ngBoilerplate';
      }
    });

    $translate.uses('en');

  });

  module.config(function($translateProvider) {
    $translateProvider.uses('en');
  });
}());

