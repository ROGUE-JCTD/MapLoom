(function() {

  var module = angular.module('loom_feature_blame_directive', []);

  module.directive('loomFeatureBlame',
      function($translate, featureBlameService) {
        return {
          restrict: 'C',
          templateUrl: 'diff/partial/featureblame.tpl.html',
          link: function(scope, element) {
            function updateVariables() {
              scope.featureBlameService = featureBlameService;
            }

            scope.cancel = function() {
              element.closest('.modal').modal('hide');
            };

            function onResize() {
              var height = $(window).height();
              element.children('.modal-body').css('max-height', (height - 200).toString() + 'px');
            }

            onResize();

            $(window).resize(onResize);
            scope.$on('feature-diff-feature-set', updateVariables);
          }
        };
      }
  );
})();
