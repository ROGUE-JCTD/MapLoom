(function() {

  var module = angular.module('loom_savemap_directive', []);

  module.directive('loomSaveMap',
      function(mapService, configService, $translate) {
        return {
          restrict: 'AC',
          templateUrl: 'map/partial/savemap.tpl.html',
          link: function(scope, element, attrs) {
            scope.mapService = mapService;
            scope.configService = configService;
            scope.translate = $translate;
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
