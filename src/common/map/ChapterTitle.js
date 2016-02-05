(function() {

  var module = angular.module('loom_chapter_title', []);

  module.directive('loomChapterTitle',
      function(storyService, configService, $translate) {
        return {
          scope: {
            index: '@chapterIndex'
          },
          templateUrl: 'map/partial/chaptertitle.tpl.html',
          link: function(scope, element, attrs) {
            console.log('Recorded index:');
            console.log(scope.index);
            scope.title = storyService.configurations[scope.index].title;
          }
        };
      });
})();
