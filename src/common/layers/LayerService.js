(function() {
  var module = angular.module('loom_layer_service', ['ngCookies']);
  //var service_ = null;
  module.provider('layerService', function() {
    this.$get = function($window, $cookies) {
      //service_ = this;
      return this;
    };
    this.getTitle = function(layer) {
      if (!layer || typeof layer.get !== 'function') { return ''; }
      return layer.get('metadata').config.titleAlias || layer.get('metadata').title;
    };
    this.getAttributes = function(layer) {
      var attrList = [];
      if (!layer || typeof layer.get !== 'function') { return attrList; }

      for (var i in layer.get('metadata').schema) {
        if (layer.get('metadata').schema[i]._type.search('gml:') > -1) {
          continue;
        }
        attrList.push(layer.get('metadata').schema[i]);
      }
      return attrList;
    };
  });
}());

