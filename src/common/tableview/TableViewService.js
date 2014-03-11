(function() {
  var module = angular.module('loom_table_view_service', []);

  var http_ = null;
  var service_ = null;
  var q_ = null;

  module.provider('tableViewService', function() {
    this.$get = function($q, $http) {
      http_ = $http;
      service_ = this;
      q_ = $q;
      return this;
    };

    this.featureList = [];
    this.attributeNameList = [];

    this.showTable = function(layer) {
      var deferredResponse = q_.defer();

      service_.featureList = [];
      service_.attributeNameList = [];

      var url = layer.get('metadata').url + '/wfs?version=' + '2.0.0' + '&request=GetFeature&typeNames=' +
          layer.get('metadata').name;
      http_.get(url).then(function(response) {
        var x2js = new X2JS();
        var json = x2js.xml_str2json(response.data);

        for (var i in layer.get('metadata').schema) {
          //if the type starts with gml rather than xsd then this is the geometry so we will skip it
          if (layer.get('metadata').schema[i]._type.split(':')[0] === 'gml') {
            continue;
          }
          service_.attributeNameList.push(layer.get('metadata').schema[i]._name);
        }

        var index = layer.get('metadata').name.split(':')[1];
        for (var feat in json.FeatureCollection.member) {
          var feature = {visible: true, properties: []};
          feature.properties.push(json.FeatureCollection.member[feat][index]['_gml:id']);
          for (var attr in service_.attributeNameList) {
            if (!goog.isDef(json.FeatureCollection.member[feat][index][service_.attributeNameList[attr]])) {
              feature.properties.push('');
            } else {
              feature.properties.push(
                  json.FeatureCollection.member[feat][index][service_.attributeNameList[attr]].toString());
            }
          }
          service_.featureList[feat] = feature;
        }
        deferredResponse.resolve();
      }, function(reject) {
        deferredResponse.reject(reject);
      });

      return deferredResponse.promise;
    };
  });
}());
