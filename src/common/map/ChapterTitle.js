(function() {

  var module = angular.module('loom_chapter_title', []);

  module.directive('loomChapterTitle',
      function($compile) {
        var template = '<p>{{ chapterContent }}</p>';

        return {
          link: function(scope, element, attrs) {
            element.html(template).show();
            $compile(element.contents())(scope);
          },
          scope: {
            chapterContent: '='
          }
        };
      });
})();
