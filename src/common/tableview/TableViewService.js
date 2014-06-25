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
    this.readOnly = false;
    this.resultsPerPage = 25;
    this.currentPage = 0;
    this.totalPages = 0;

    this.nextPage = function() {
      this.currentPage++;
      return this.loadData();
    };

    this.previousPage = function() {
      this.currentPage--;
      return this.loadData();
    };

    this.filter = function() {
      this.currentPage = 0;
      return this.loadData();
    };

    this.clear = function() {
      this.rows = [];
      this.attributeNameList = [];
    };

    this.showTable = function(layer, feature) {
      service_.rows = [];
      service_.attributeNameList = [];
      service_.restrictionList = {};
      service_.selectedLayer = layer;
      service_.feature = feature;
      service_.currentPage = 0;
      service_.totalPages = 0;

      return this.loadData();
    };

    this.loadData = function() {
      var deferredResponse = q_.defer();
      var metadata = service_.selectedLayer.get('metadata');
      var projection = metadata.projection;
      var url = metadata.url + '/wfs?version=' + settings.WFSVersion +
          '&srsName=' + projection +
          '&outputFormat=JSON&request=GetFeature&typeNames=' +
          metadata.name +
          '&maxFeatures=' + service_.resultsPerPage +
          '&startIndex=' + (service_.resultsPerPage * service_.currentPage);

      var filter = '';
      var hasFilter = false;
      if (goog.isDefAndNotNull(metadata.filters)) {
        for (var attrName in metadata.filters) {
          var attr = metadata.filters[attrName];
          if (goog.isDefAndNotNull(attr.filter) && attr.filter !== '') {
            if (hasFilter) {
              filter += ' and ';
            } else {
              hasFilter = true;
            }
            filter += attrName + ' like \'%' + attr.filter + '%\'';
          }
        }
        if (hasFilter) {
          url += '&cql_filter=' + encodeURIComponent(filter);
        }
      }
      http_.get(url).then(function(response) {

        var getRestrictions = function() {
          if (metadata.readOnly || !metadata.editable) {
            service_.readOnly = true;
            return;
          }
          for (var attrIndex in service_.attributeNameList) {
            var attr = service_.attributeNameList[attrIndex];
            var attrRestriction = {type: '', nillable: true};
            var schemaType = metadata.schema[attr.name]._type;

            if (schemaType === 'simpleType') {
              attrRestriction.type = metadata.schema[attr.name].simpleType.restriction.enumeration;
            }
            else if (schemaType === 'xsd:int' || schemaType === 'xsd:integer') {
              attrRestriction.type = 'int';
            }
            else if (schemaType === 'xsd:double' || schemaType === 'xsd:decimal') {
              attrRestriction.type = 'double';
            }
            else if (schemaType === 'xsd:dateTime') {
              attrRestriction.type = 'datetime';
            }
            else if (schemaType === 'xsd:date') {
              attrRestriction.type = 'date';
            }
            else if (schemaType === 'xsd:time') {
              attrRestriction.type = 'time';
            } else if (schemaType === 'xsd:boolean') {
              attrRestriction.type = [
                {_value: 'true'},
                {_value: 'false'}
              ];
            }

            attrRestriction.nillable = metadata.schema[attr.name]._nillable;

            service_.restrictionList[attr.name] = attrRestriction;
          }
        };

        var row;
        service_.rows = [];
        if (response.data.features.length > 0) {
          service_.attributeNameList = [];
          if (!goog.isDefAndNotNull(metadata.filters)) {
            metadata.filters = {};
          }
          for (var attrName in response.data.features[0].properties) {
            if (response.data.features[0].properties.hasOwnProperty(attrName) &&
                attrName !== 'fotos' && attrName !== 'photos') {
              if (!goog.isDefAndNotNull(metadata.filters[attrName])) {
                metadata.filters[attrName] = {filter: ''};
              }
              service_.attributeNameList.push({name: attrName, filter: metadata.filters[attrName]});
            }
          }
          var totalFeatures = response.data.totalFeatures;
          service_.totalPages = Math.ceil(totalFeatures / service_.resultsPerPage);
          getRestrictions();
          for (var feat in response.data.features) {
            var selectedFeature = false;
            if (goog.isDefAndNotNull(service_.feature) && response.data.features[feat].id === service_.feature.id) {
              selectedFeature = true;
            }
            row = {modified: false, selected: selectedFeature, feature: response.data.features[feat]};

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
