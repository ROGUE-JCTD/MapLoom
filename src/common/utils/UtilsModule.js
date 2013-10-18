(function() {
  var module = angular.module('loom_utils', []);

  module.directive('stopEvent', function() {
    return {
      link: function(scope, element, attr) {
        var events = attr.stopEvent.split(' ');
        var stopFunction = function(e) {
          e.stopPropagation();
        };
        for (var i = 0; i < events.length; i++) {
          var event = events[i];
          element.bind(event, stopFunction);
        }
      }
    };
  });

  module.filter('reverse', function() {
    return function(items) {
      return items.slice().reverse();
    };
  });
})();
