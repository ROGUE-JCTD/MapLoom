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
  });

  module.controller('AppCtrl', function AppCtrl($scope, $window, $location, $translate, mapService, debugService,
                                                refreshService) {
        $scope.$on('$stateChangeSuccess', function(event, toState) {
          if (angular.isDefined(toState.data.pageTitle)) {
            $scope.pageTitle = toState.data.pageTitle;
          }
        });

        $('body').on('show.bs.modal', function(e) {
          var modals = $('.modal.in');
          var backdrops = $('.modal-backdrop');
          for (var i = 0; i < modals.length; i++) {
            modals.eq(i).css('z-index', 760 - (modals.length - i) * 20);
            backdrops.eq(i).css('z-index', 750 - (modals.length - i) * 20);
          }
          $(e.target).css('z-index', 760);
        });

        // Enable Proj4JS
        ol.HAVE_PROJ4JS = ol.ENABLE_PROJ4JS && typeof Proj4js == 'object';

        $scope.mapService = mapService;
        $scope.refreshService = refreshService;
      });

  module.provider('debugService', function() {
    this.$get = function() {
      return this;
    };

    this.showDebugButtons = false;
  });

  module.config(function($translateProvider) {
    $translateProvider.preferredLanguage('en');
  });
}());

