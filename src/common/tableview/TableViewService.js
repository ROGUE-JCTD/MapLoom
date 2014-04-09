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
    this.selectedLayer = null;

    this.showTable = function(layer) {
      var deferredResponse = q_.defer();

      service_.featureList = [];
      service_.attributeNameList = [];
      service_.selectedLayer = layer;

      var url = layer.get('metadata').url + '/wfs?version=2.0.0&request=GetFeature&typeNames=' +
          layer.get('metadata').name;
      http_.get(url).then(function(response) {
        var x2js = new X2JS();
        var json = x2js.xml_str2json(response.data);

        for (var i in layer.get('metadata').schema) {
          //if the type starts with gml rather than xsd then this is the geometry so we will skip it
          if (layer.get('metadata').schema[i]._type.split(':')[0] === 'gml') {
            continue;
          }
          if (layer.get('metadata').schema[i]._name === 'photos' || layer.get('metadata').schema[i]._name === 'fotos') {
            continue;
          }
          service_.attributeNameList.push(layer.get('metadata').schema[i]._name);
        }

        var index = layer.get('metadata').name.split(':')[1];
        var feature, jsonFeature;
        var pushAttributes = function(feature, jsonFeature) {
          feature.properties.push({value: jsonFeature['_gml:id'], restriction: 'noEdit'});

          for (var attr in service_.attributeNameList) {
            var attrRestriction = '';
            var schemaType = layer.get('metadata').schema[service_.attributeNameList[attr]]._type;

            if (schemaType === 'simpleType') {
              attrRestriction =
                  layer.get('metadata').schema[service_.attributeNameList[attr]].simpleType.restriction.enumeration;
            }
            else if (schemaType === 'xsd:int' || schemaType === 'xsd:integer') {
              attrRestriction = 'int';
            }
            else if (schemaType === 'xsd:double' || schemaType === 'xsd:decimal') {
              attrRestriction = 'double';
            }
            else if (schemaType === 'xsd:dateTime') {
              attrRestriction = 'datetime';
            }
            else if (schemaType === 'xsd:date') {
              attrRestriction = 'date';
            }
            else if (schemaType === 'xsd:time') {
              attrRestriction = 'time';
            }

            if (!goog.isDef(jsonFeature[service_.attributeNameList[attr]])) {
              feature.properties.push({value: '', restriction: attrRestriction});
            } else {
              feature.properties.push({value: jsonFeature[service_.attributeNameList[attr]].toString(),
                restriction: attrRestriction});
            }
          }
        };

        if (json.FeatureCollection.member) {
          if (json.FeatureCollection.member.length > 1) {
            for (var feat in json.FeatureCollection.member) {
              feature = {visible: true, properties: []};
              jsonFeature = json.FeatureCollection.member[feat][index];

              pushAttributes(feature, jsonFeature);

              service_.featureList[feat] = feature;
            }
          } else {
            feature = {visible: true, properties: []};
            jsonFeature = json.FeatureCollection.member[index];

            pushAttributes(feature, jsonFeature);

            service_.featureList.push(feature);
          }
        }
        deferredResponse.resolve();
      }, function(reject) {
        deferredResponse.reject(reject);
      });

      return deferredResponse.promise;
    };
  });
}());
