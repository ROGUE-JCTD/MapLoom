(function() {

  var module = angular.module('loom_chapter_delete', []);

  module.directive('loomChapterDelete',
      function(mapService, configService, $translate) {
        return {
          templateUrl: 'map/partial/chapterdelete.tpl.html',
          link: function(scope, element, attrs) {
            scope.mapService = mapService;
            scope.configService = configService;
            scope.translate = $translate;
          }
        };
      });
})();
