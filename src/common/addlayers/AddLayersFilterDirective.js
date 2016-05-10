(function() {

  var module = angular.module('loom_addlayersfilter_directive', []);

  module.directive('loomAddlayersfilter', function() {
    return {
      templateUrl: 'addlayers/partials/addlayersfilter.tpl.html'
    };
  });
}());
