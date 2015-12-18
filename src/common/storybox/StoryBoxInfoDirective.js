(function() {
  var module = angular.module('loom_storybox_info_directive', []);

  module.directive('loomBoxInfo',
      function($translate, boxService) {
        return {
          templateUrl: 'storybox/partials/boxinfo.tpl.html',
          link: function(scope, element) {
            var resetVariables = function() {
              scope.box = null;
              scope.title = null;
              scope.description = null;
            };
            resetVariables();
            scope.$on('getBoxInfo', function(evt, box) {
              resetVariables();
              scope.box = box;
              var metadata = scope.box;
              if (goog.isDefAndNotNull(metadata.title)) {
                scope.title = metadata.title;
              }
              if (goog.isDefAndNotNull(metadata.description)) {
                scope.description = metadata.description;
              }

              element.closest('.modal').modal('toggle');
            });
            function onResize() {
              var height = $(window).height();
              element.children('.modal-body').css('max-height', (height - 200).toString() + 'px');
            }

            onResize();

            $(window).resize(onResize);
          }
        };
      });
}());
