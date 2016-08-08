(function() {
  var module = angular.module('loom_media_directive', ['ngSanitize']);

  module.directive('loomMedia',
      function($translate, $http, $sce, $sanitize, mediaService) {

        return {
          replace: false,
          restrict: 'E',
          template: '<div ng-bind-html="embedContent"></div>',
          link: function(scope, element, attrs) {
            scope.mediaService = mediaService;
            attrs.$observe('src', function(value) {
              scope.mediaUrl = value;
              scope.embedContent = $sce.trustAsHtml(mediaService.getEmbedContent(scope.mediaUrl, 180, 180));
            });
          }

        };
      });
})();
