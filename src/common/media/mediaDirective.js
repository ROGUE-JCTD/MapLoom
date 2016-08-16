(function() {
  var module = angular.module('loom_media_directive', ['ngSanitize']);

  module.directive('loomMedia',
      function($translate, $http, $sce, $sanitize, mediaService) {

        return {
          replace: true,
          restrict: 'E',
          template: '<div ng-bind-html="embedContent"></div>',
          link: function(scope, element, attrs) {
            var embed_params = {
              nowrap: 'on',
              maxwidth: attrs.maxWidth,
              maxheight: attrs.maxHeight
            };
            scope.mediaService = mediaService;

            attrs.$observe('maxWidth', function(value) {
              embed_params.maxwidth = value;
            });
            attrs.$observe('maxHeight', function(value) {
              embed_params.maxheight = value;
            });
            attrs.$observe('src', function(value) {
              scope.mediaUrl = value;
              mediaService.getEmbedContent(scope.mediaUrl, embed_params).then(function(result) {
                scope.embedContent = $sce.trustAsHtml(result);
              });
            });
          }

        };
      });
})();
