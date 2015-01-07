(function() {
  var module = angular.module('loom_table_view_service', []);

  var http_ = null;
  var service_ = null;
  var q_ = null;

  var searching = false;
  var searchText = '';

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
    this.totalFeatures = 0;

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

    var getFilterXML = function(attrName, resType, filter) {
      var xml = '';

      switch (filter.searchType) {
        case 'strContains':
          if (filter.text !== '') {
            if (resType === 'xsd:string' || resType === 'xsd:dateTime' || resType === 'xsd:date' || resType === 'xsd:time') {
              xml += '<ogc:PropertyIsLike matchCase="false" wildCard="*" singleChar="#" escapeChar="!">' +
                  '<ogc:PropertyName>' + attrName + '</ogc:PropertyName>' +
                  '<ogc:Literal>*' + filter.text + '*</ogc:Literal>' +
                  '</ogc:PropertyIsLike>';
            }
          }
          break;
        case 'exactMatch':
          if (filter.text !== '') {
            console.log('getting filter xml, exact match', resType);
            if (resType === 'xsd:dateTime' || resType === 'xsd:date') {
              var dateStringSansTime = filter.text.split('T')[0];

              var beginDate = moment(new Date(dateStringSansTime));
              //zone() returns the local time zone's offset from GMT in minutes
              beginDate.add(beginDate.zone(), 'm');
              var endDate = moment(beginDate).add(24, 'h');

              xml += '<And><ogc:PropertyIsGreaterThanOrEqualTo>' +
                  '<ogc:PropertyName>' + attrName + '</ogc:PropertyName>' +
                  '<ogc:Literal>' + beginDate.toISOString() + '</ogc:Literal>' +
                  '</ogc:PropertyIsGreaterThanOrEqualTo>' +
                  '<ogc:PropertyIsLessThan>' +
                  '<ogc:PropertyName>' + attrName + '</ogc:PropertyName>' +
                  '<ogc:Literal>' + endDate.toISOString() + '</ogc:Literal>' +
                  '</ogc:PropertyIsLessThan></And>';
            } else if (resType === 'xsd:time') {
              var startTime = new Date(filter.text);
              startTime.setSeconds(0);
              var endTime = new Date(filter.text);
              endTime.setSeconds(59.999);
              xml += '<ogc:PropertyIsGreaterThanOrEqualTo>' +
                  '<ogc:PropertyName>' + attrName + '</ogc:PropertyName>' +
                  '<ogc:Literal>' + startTime.toISOString() + '</ogc:Literal>' +
                  '</ogc:PropertyIsGreaterThanOrEqualTo>' +
                  '<ogc:PropertyIsLessThan>' +
                  '<ogc:PropertyName>' + attrName + '</ogc:PropertyName>' +
                  '<ogc:Literal>' + endTime.toISOString() + '</ogc:Literal>' +
                  '</ogc:PropertyIsLessThan>';
            } else {
              xml +=
                  '<ogc:PropertyIsEqualTo>' +
                      '<ogc:PropertyName>' + attrName + '</ogc:PropertyName>' +
                      '<ogc:Literal>' + filter.text + '</ogc:Literal>' +
                      '</ogc:PropertyIsEqualTo>';
            }
          }
          break;
        case 'numRange':
          if (resType === 'xsd:dateTime' || resType === 'xsd:date') {
            if (goog.isDefAndNotNull(filter.start) && filter.start !== '') {
              var startStringSansTime = filter.start.split('T')[0];
              var firstDate = moment(new Date(startStringSansTime));
              firstDate.add(firstDate.zone(), 'm');

              xml += '<ogc:PropertyIsGreaterThanOrEqualTo>' +
                  '<ogc:PropertyName>' + attrName + '</ogc:PropertyName>' +
                  '<ogc:Literal>' + firstDate.toISOString() + '</ogc:Literal>' +
                  '</ogc:PropertyIsGreaterThanOrEqualTo>';
            }
            if (goog.isDefAndNotNull(filter.end) && filter.end !== '') {
              var endStringSansTime = filter.end.split('T')[0];
              var secondDate = moment(new Date(endStringSansTime));
              secondDate.add(secondDate.zone(), 'm');
              secondDate.add(24, 'h');

              xml += '<ogc:PropertyIsLessThan>' +
                  '<ogc:PropertyName>' + attrName + '</ogc:PropertyName>' +
                  '<ogc:Literal>' + secondDate.toISOString() + '</ogc:Literal>' +
                  '</ogc:PropertyIsLessThan>';
            }
          } else if (resType === 'xsd:time') {
            if (goog.isDefAndNotNull(filter.start) && filter.start !== '') {
              var firstTime = new Date(filter.start);
              firstTime.setSeconds(0);

              xml += '<ogc:PropertyIsGreaterThanOrEqualTo>' +
                  '<ogc:PropertyName>' + attrName + '</ogc:PropertyName>' +
                  '<ogc:Literal>' + firstTime.toISOString() + '</ogc:Literal>' +
                  '</ogc:PropertyIsGreaterThanOrEqualTo>';
            }
            if (goog.isDefAndNotNull(filter.end) && filter.end !== '') {
              var secondTime = new Date(filter.end);
              secondTime.setSeconds(59.999);

              xml += '<ogc:PropertyIsLessThan>' +
                  '<ogc:PropertyName>' + attrName + '</ogc:PropertyName>' +
                  '<ogc:Literal>' + secondTime.toISOString() + '</ogc:Literal>' +
                  '</ogc:PropertyIsLessThan>';
            }
          } else {
            if (goog.isDefAndNotNull(filter.start) && filter.start !== '') {
              xml += '<ogc:PropertyIsGreaterThanOrEqualTo>' +
                  '<ogc:PropertyName>' + attrName + '</ogc:PropertyName>' +
                  '<ogc:Literal>' + filter.start + '</ogc:Literal>' +
                  '</ogc:PropertyIsGreaterThanOrEqualTo>';
            }
            if (goog.isDefAndNotNull(filter.end) && filter.end !== '') {
              xml += '<ogc:PropertyIsLessThan>' +
                  '<ogc:PropertyName>' + attrName + '</ogc:PropertyName>' +
                  '<ogc:Literal>' + filter.end + '</ogc:Literal>' +
                  '</ogc:PropertyIsLessThan>';
            }
          }
          break;
      }

      return xml;
    };

    this.getFeaturesPostPayloadXML = function(layer, filters, bbox, resultsPerPage, currentPage, exclude_header) {
      var paginationParamsStr = '';
      if (goog.isDefAndNotNull(resultsPerPage) && goog.isDefAndNotNull(currentPage)) {
        paginationParamsStr = ' maxFeatures="' + resultsPerPage + '" startIndex="' +
            (resultsPerPage * currentPage) + '"';
      }

      var bboxStr = '';
      if (goog.isDefAndNotNull(bbox)) {
        bboxStr = '<ogc:BBOX>' +
            '<ogc:Envelope srsName="EPSG:900913">' +
            '<ogc:PropertyName>BoundingBox</ogc:PropertyName>' +
            '<ogc:lowerCorner>' + bbox[0] + ' ' + bbox[1] + '</ogc:lowerCorner>' +
            '<ogc:upperCorner>' + bbox[2] + ' ' + bbox[3] + '</ogc:upperCorner>' +
            '</ogc:Envelope>' +
            '</ogc:BBOX>';
      }

      var metadata = layer.get('metadata');

      var validDateSearch = (new Date(searchText) !== 'Invalid Date' && !isNaN(new Date(searchText))) ? true : false;
      var xmlFilterBody = '';

      for (var attrName in filters) {
        var resType = layer.get('metadata').schema[attrName]._type;

        if (!searching) {
          xmlFilterBody += getFilterXML(attrName, resType, filters[attrName]);
        } else {
          // assume filter will be for text
          var filter = {text: searchText, searchType: 'strContains', start: '', end: ''};

          // if attribute type is date, only if the search string is a valid date, search the attribute
          if (resType === 'xsd:string') {
            xmlFilterBody += getFilterXML(attrName, resType, filter);
          } else if (resType === 'xsd:dateTime' || resType === 'xsd:date') {
            if (validDateSearch) {
              filter.searchType = 'exactMatch';
              filter.text = date.toISOString();
              xmlFilterBody += getFilterXML(attrName, resType, filter);
            }
          } else if (resType === 'xsd:long' || resType === 'xsd:int' || resType === 'xsd:integer' || resType === 'xsd:short') {
            if (isNaN(filter.text) === false && parseInt(filter.text, 10).toString() === filter.text) {
              filter.searchType = 'exactMatch';
              filter.text = filter.text;
              xmlFilterBody += getFilterXML(attrName, resType, filter);
            }
          } else if (resType === 'xsd:double' || resType === 'xsd:decimal') {
            if (isNaN(filter.text) === false && parseFloat(filter.text).toString() === filter.text) {
              filter.searchType = 'exactMatch';
              filter.text = filter.text;
              xmlFilterBody += getFilterXML(attrName, resType, filter);
            }
          } else if (resType === 'xsd:boolean') {
            if (filter.text === 'false' || filter.text === 'true') {
              filter.searchType = 'exactMatch';
              xmlFilterBody += getFilterXML(attrName, resType, filter);
            }
          }
        }
      }

      var xml = '';
      if (!goog.isDefAndNotNull(exclude_header) || exclude_header === false) {
        xml += '<?xml version="1.0" encoding="UTF-8"?>';
      }

      xml += '<wfs:GetFeature service="WFS" version="' + settings.WFSVersion + '"' +
          ' outputFormat="JSON"' +
          paginationParamsStr +
          ' xmlns:wfs="http://www.opengis.net/wfs"' +
          ' xmlns:ogc="http://www.opengis.net/ogc"' +
          ' xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"' +
          ' xsi:schemaLocation="http://www.opengis.net/wfs' +
          ' http://schemas.opengis.net/wfs/1.1.0/wfs.xsd">' +
          '<wfs:Query typeName="' + metadata.name + '"' +
          ' srsName="' + metadata.projection + '"' +
          '>' +
          '<ogc:Filter>';

      if (xmlFilterBody) {
        if (!searching) {
          xml += '<And>' + bboxStr + xmlFilterBody + '</And>';
        } else {
          if (bboxStr) {
            xml += '<And>' + bboxStr + '<Or>' + xmlFilterBody + '</Or></And>';
          } else {
            xml += '<Or>' + xmlFilterBody + '</Or>';
          }
        }
      }

      xml += '</ogc:Filter>' +
          '</wfs:Query>' +
          '</wfs:GetFeature>';

      return xml;
    };

    //TODO: add bbox to filters.geom instead
    this.getFeaturesWfs = function(layer, filters, bbox, resultsPerPage, currentPage) {
      //console.log('---- tableviewservice.getFeaturesWfs: ', layer, filters, bbox, resultsPerPage, currentPage);
      var deferredResponse = q_.defer();

      var metadata = layer.get('metadata');
      var postURL = metadata.url + '/wfs/WfsDispatcher';
      var xmlData = service_.getFeaturesPostPayloadXML(layer, filters, bbox, resultsPerPage, currentPage);
      http_.post(postURL, xmlData, {
        headers: {
          'Content-Type': 'text/xml;charset=utf-8'
        }
      }).success(function(data, status, headers, config) {
        deferredResponse.resolve(data);
      }).error(function(data, status, headers, config) {
        console.log('post error', data, status, headers, config);
        deferredResponse.reject(status);
      });
      return deferredResponse.promise;
    };

    this.loadData = function() {
      var deferredResponse = q_.defer();
      var metadata = service_.selectedLayer.get('metadata');

      var postURL = this.selectedLayer.get('metadata').url + '/wfs/WfsDispatcher';
      var xmlData;
      xmlData = service_.getFeaturesPostPayloadXML(service_.selectedLayer, metadata.filters, null,
          service_.resultsPerPage, service_.currentPage);
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
            else if (schemaType === 'xsd:double' || schemaType === 'xsd:decimal' ||
                schemaType === 'xsd:long' || schemaType === 'xsd:short') {
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
        service_.attributeNameList = [];
        if (!goog.isDefAndNotNull(metadata.filters)) {
          metadata.filters = {};
        }
        for (var propName in metadata.schema) {
          if (metadata.schema[propName]._type.search('gml:') === -1 && propName !== 'fotos' && propName !== 'photos') {
            if (!goog.isDefAndNotNull(metadata.filters[propName])) {
              metadata.filters[propName] = {text: '', searchType: 'exactMatch'};
            }
            service_.attributeNameList.push({name: propName, filter: metadata.filters[propName]});
          }
        }
        service_.totalFeatures = data.totalFeatures;
        service_.totalPages = Math.ceil(service_.totalFeatures / service_.resultsPerPage);
        getRestrictions();
        for (var feat in data.features) {
          var selectedFeature = false;
          if (goog.isDefAndNotNull(service_.feature) && data.features[feat].id === service_.feature.id) {
            selectedFeature = true;
          }
          row = {modified: false, selected: selectedFeature, feature: data.features[feat]};

          service_.rows[feat] = row;
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

    this.search = function(text) {
      searching = true;
      searchText = text;
      this.currentPage = 0;
    };
    this.stopSearch = function() {
      searching = false;
      searchText = '';
      this.currentPage = 0;
    };
  });
}());
