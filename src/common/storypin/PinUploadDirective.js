(function() {
  var module = angular.module('loom_pin_upload', []);

  module.directive('pinChange', function() {
    return {
      restrict: 'A',
      link: function(scope, element, attrs) {
        var onChangeHandler = scope.$eval(attrs.pinChange);
        element.bind('change', onChangeHandler);
      }
    };
  });

}());
