(function() {

  var module = angular.module('loom_savemap_directive', []);

  module.directive('loomSaveMap',
      function(mapService, configService, $window, $translate) {
        return {
          restrict: 'AC',
          templateUrl: 'map/partial/savemap.tpl.html',
          link: function(scope, element, attrs) {
            scope.mapService = mapService;
            scope.configService = configService;
            scope.translate = $translate;

            scope.version_string = $window.MAPLOOM_VERSION.version_string;
            scope.build_date = $window.MAPLOOM_VERSION.build_date;

            function onResize() {
              var height = $(window).height();
              element.children('.modal-body').css('max-height', (height - 200).toString() + 'px');
            }

            onResize();

            $(window).resize(onResize);
          }
        };
      });
})();
