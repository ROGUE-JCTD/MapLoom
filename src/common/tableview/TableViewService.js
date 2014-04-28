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

    this.rows = [];
    this.attributeNameList = [];
    this.restrictionList = null;
    this.selectedLayer = null;

    this.showTable = function(layer, feature) {
      var deferredResponse = q_.defer();

      service_.rows = [];
      service_.attributeNameList = [];
      service_.restrictionList = {};
      service_.selectedLayer = layer;

      var projection = service_.selectedLayer.get('metadata').projection;
      console.log('proj', projection);
      var url = layer.get('metadata').url + '/wfs?version=' + settings.WFSVersion +
          '&srsName=' + projection +
          '&outputFormat=JSON&request=GetFeature&typeNames=' +
          layer.get('metadata').name;
      http_.get(url).then(function(response) {

        var getRestrictions = function() {
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

            service_.restrictionList[service_.attributeNameList[attr]] = attrRestriction;
          }
        };

        var row;
        if (response.data.features.length > 0) {
          for (var attrName in response.data.features[0].properties) {
            service_.attributeNameList.push(attrName);
          }
          getRestrictions();
          for (var feat in response.data.features) {
            var selectedFeature = false;
            console.log('feature', feature);

            console.log('response.data.features[feat]', response.data.features[feat]);
            if (goog.isDefAndNotNull(feature) && response.data.features[feat].id === feature.id) {
              selectedFeature = true;
            }
            row = {visible: true, selected: selectedFeature, feature: response.data.features[feat]};

            service_.rows[feat] = row;
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
