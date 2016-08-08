(function() {
  var module = angular.module('loom_media_directive', ['ngSanitize']);

  module.directive('loomMedia',
      function($translate, $http, $sce, mediaService) {
        //console.log('---- loom_feature_info_box_directive');

        return {
          replace: false,
          restrict: 'E',
          link: function(scope, element, attrs) {
            scope.mediaService = mediaService;
          }

        }
      })
})();
