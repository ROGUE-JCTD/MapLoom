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
    this.resultsPerPage = 2;
    this.currentPage = 0;
    this.totalPages = 0;
    this.textFilter = null;

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
      for (var attrIndex in service_.attributeNameList) {
        var attr = service_.attributeNameList[attrIndex];
        if (goog.isDefAndNotNull(attr.filter) && attr.filter !== '') {
          if (hasFilter) {
            filter += ' or ';
          } else {
            hasFilter = true;
          }
          filter += attr.name + ' like \'%' + attr.filter + '%\'';
        }
      }
      if (hasFilter) {
        url += '&cql_filter=' + encodeURIComponent(filter);
      }
      http_.get(url).then(function(response) {

        var getRestrictions = function() {
          if (metadata.readOnly || !metadata.editable) {
            service_.readOnly = true;
            return;
          }
          console.log(service_.attributeNameList);
          for (var attrIndex in service_.attributeNameList) {
            var attr = service_.attributeNameList[attrIndex];
            var attrRestriction = '';
            var schemaType = metadata.schema[attr.name]._type;

            if (schemaType === 'simpleType') {
              attrRestriction =
                  metadata.schema[attr.name].simpleType.restriction.enumeration;
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

            service_.restrictionList[attr.name] = attrRestriction;
          }
        };

        var row;
        service_.rows = [];
        if (response.data.features.length > 0) {
          var oldAttributeNameList = service_.attributeNameList;
          service_.attributeNameList = [];
          for (var attrName in response.data.features[0].properties) {
            var filter = '';
            for (var attrIndex in oldAttributeNameList) {
              if (oldAttributeNameList[attrIndex].name === attrName) {
                filter = oldAttributeNameList[attrIndex].filter;
              }
            }
            service_.attributeNameList.push({name: attrName, filter: filter});
          }
          var totalFeatures = response.data.totalFeatures;
          service_.totalPages = Math.ceil(totalFeatures / service_.resultsPerPage);
          getRestrictions();
          for (var feat in response.data.features) {
            var selectedFeature = false;
            if (goog.isDefAndNotNull(service_.feature) && response.data.features[feat].id === service_.feature.id) {
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
