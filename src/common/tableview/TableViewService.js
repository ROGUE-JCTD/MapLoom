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

    function getfilterXML() {
      var metadata = service_.selectedLayer.get('metadata');
      var xml = '<?xml version="1.0" encoding="UTF-8"?>' +
          '<wfs:GetFeature service="WFS" version="' + settings.WFSVersion + '"' +
          ' outputFormat="JSON"' +
          ' maxFeatures="' + service_.resultsPerPage + '"' +
          ' startIndex="' + (service_.resultsPerPage * service_.currentPage) + '"' +
          ' xmlns:wfs="http://www.opengis.net/wfs"' +
          ' xmlns:ogc="http://www.opengis.net/ogc"' +
          ' xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"' +
          ' xsi:schemaLocation="http://www.opengis.net/wfs' +
          ' http://schemas.opengis.net/wfs/1.1.0/wfs.xsd">' +
          '<wfs:Query typeName="' + metadata.name + '"' +
          ' srsName="' + metadata.projection + '"' +
          '>' +
          '<ogc:Filter>' +
          '<And>';
      //the <And> will need to change if we add a non-exclusive search option

      var searchType;

      console.log('metadata', metadata);
      for (var attrName in metadata.filters) {
        searchType = metadata.filters[attrName].searchType;
        console.log('filter type', searchType);

        var schemaType = metadata.schema[attrName]._type;
        if (metadata.filters[attrName].filter !== '') {
          if (searchType === 'strContains') {
            xml +=
                '<ogc:PropertyIsLike wildCard="*" singleChar="#" escapeChar="!">' +
                '<ogc:PropertyName>' + attrName + '</ogc:PropertyName>' +
                '<ogc:Literal>*' + metadata.filters[attrName].filter + '*</ogc:Literal>' +
                '</ogc:PropertyIsLike>';
          } else if (searchType === 'exactMatch') {
            xml +=
                '<ogc:PropertyIsEqualTo>' +
                '<ogc:PropertyName>' + attrName + '</ogc:PropertyName>' +
                '<ogc:Literal>' + metadata.filters[attrName].filter + '</ogc:Literal>' +
                '</ogc:PropertyIsEqualTo>';
          } else if (searchType === 'numRange') {
            if (schemaType === 'xsd:int' || schemaType === 'xsd:integer' || schemaType === 'xsd:decimal' ||
                schemaType === 'xsd:double') {
              xml += '<ogc:PropertyIsGreaterThanOrEqualTo>' +
                  '<ogc:PropertyName>' + attrName + '</ogc:PropertyName>' +
                  '<ogc:Literal>' + metadata.filters[attrName].filter + '</ogc:Literal>' +
                  '</ogc:PropertyIsGreaterThanOrEqualTo>' +
                  '<ogc:PropertyIsLessThan>' +
                  '<ogc:PropertyName>' + attrName + '</ogc:PropertyName>' +
                  '<ogc:Literal>53</ogc:Literal>' +
                  '</ogc:PropertyIsLessThan>';
            }
          }
          //for number types use equalTo
          //datetime, use between
        }
      }
      xml += '</And>' +
          '</ogc:Filter>' +
          '</wfs:Query>' +
          '</wfs:GetFeature>';

      return xml;
    }
    this.loadData = function() {
      console.log('getting data for table');
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
          console.log('filtering, filter obj:', filter);
          url += '&cql_filter=' + encodeURIComponent(filter);
          console.log('filtering, filter url:', url);
        }
      }

      var postURL = this.selectedLayer.get('metadata').url + '/wfs/WfsDispatcher';
      var xmlData = getfilterXML();
      console.log('xmldata', xmlData);
      http_.post(postURL, xmlData, {headers: {
        'Content-Type': 'text/xml;charset=utf-8'
      }}).success(function(data, status, headers, config) {
        console.log('post success', data, status, headers, config);
        var getRestrictions = function() {
          if (metadata.readOnly || !metadata.editable) {
            service_.readOnly = true;
            return;
          }
          service_.readOnly = false;
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
        if (data.features.length > 0) {
          service_.attributeNameList = [];
          if (!goog.isDefAndNotNull(metadata.filters)) {
            metadata.filters = {};
          }
          for (var propName in metadata.schema) {
            if (data.features[0].properties.hasOwnProperty(propName) &&
                propName !== 'fotos' && propName !== 'photos') {
              if (!goog.isDefAndNotNull(metadata.filters[propName])) {
                metadata.filters[propName] = {filter: '', searchType: 'exactMatch'};
              }
              service_.attributeNameList.push({name: propName, filter: metadata.filters[propName]});
            }
          }
          var totalFeatures = data.totalFeatures;
          service_.totalPages = Math.ceil(totalFeatures / service_.resultsPerPage);
          getRestrictions();
          for (var feat in data.features) {
            var selectedFeature = false;
            if (goog.isDefAndNotNull(service_.feature) && data.features[feat].id === service_.feature.id) {
              selectedFeature = true;
            }
            row = {modified: false, selected: selectedFeature, feature: data.features[feat]};

            service_.rows[feat] = row;
          }
        }
        deferredResponse.resolve();
      }).error(function(data, status, headers, config) {
        console.log('post error', data, status, headers, config);
        deferredResponse.reject(status);
      });

      /*http_.get(url).then(function(response) {
      }, function(reject) {
        deferredResponse.reject(reject);
      });*/

      return deferredResponse.promise;
    };
  });
}());
