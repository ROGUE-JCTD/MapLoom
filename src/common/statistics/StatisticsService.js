(function() {
  var module = angular.module('loom_statistics_service', []);

  var dialogService_ = null;
  var httpService_ = null;
  var tableViewService_ = null;
  var mapService_ = null;
  var q_ = null;
  var translate_ = null;

  module.provider('statisticsService', function() {
    this.$get = function($q, $http, mapService, dialogService, tableViewService, $translate) {
      q_ = $q;
      httpService_ = $http;
      mapService_ = mapService;
      dialogService_ = dialogService;
      tableViewService_ = tableViewService;
      translate_ = $translate;
      return this;
    };

    this.summarizeAttribute = function(layer, filters, attributeName) {
      var deferredResponse = q_.defer();
      if (!goog.isDefAndNotNull(layer)) {
        deferredResponse.reject('Invalid Layer');
        return deferredResponse.promise;
      }

      var wfsPayload = tableViewService_.getFeaturesPostPayloadXML(layer, filters, null, null, null, true);
      console.log('wfsPayload: ', wfsPayload);

      if (!mapService_.layerIsEditable(layer)) {
        var url = layer.get('metadata').url + '/wps?version=' + settings.WPSVersion;
        var wpsPostData = '' +
            '<?xml version="1.0" encoding="UTF-8"?><wps:Execute version="' + settings.WPSVersion + '" service="WPS" ' +
            'xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" ' +
            'xmlns="http://www.opengis.net/wps/1.0.0" ' +
            'xmlns:wfs="http://www.opengis.net/wfs" xmlns:wps="http://www.opengis.net/wps/1.0.0" ' +
            'xmlns:ows="http://www.opengis.net/ows/1.1" xmlns:gml="http://www.opengis.net/gml" ' +
            'xmlns:ogc="http://www.opengis.net/ogc" ' +
            'xmlns:wcs="http://www.opengis.net/wcs/1.1.1" ' +
            'xmlns:xlink="http://www.w3.org/1999/xlink" ' +
            'xsi:schemaLocation="http://www.opengis.net/wps/1.0.0 ' +
            'http://schemas.opengis.net/wps/1.0.0/wpsAll.xsd">' +
            '<ows:Identifier>py:summarize_attrib</ows:Identifier>' +
            '<wps:DataInputs>' +
            '<wps:Input>' +
            '<ows:Identifier>attributeName</ows:Identifier>' +
            '<wps:Data>' +
            '<wps:LiteralData>' + attributeName + '</wps:LiteralData>' +
            '</wps:Data>' +
            '</wps:Input>' +
            '<wps:Input>' +
            '<ows:Identifier>features</ows:Identifier>' +
            '<wps:Reference mimeType="text/xml" xlink:href="http://geoserver/wfs" method="POST">' +
            '<wps:Body>' +
            wfsPayload +
            '</wps:Body>' +
            '</wps:Reference>' +
            '</wps:Input>' +
            '</wps:DataInputs>' +
            '<wps:ResponseForm>' +
            '<wps:RawDataOutput>' +
            '<ows:Identifier>result</ows:Identifier>' +
            '</wps:RawDataOutput>' +
            '</wps:ResponseForm>' +
            '</wps:Execute>';

        httpService_.post(url, wpsPostData).success(function(data, status, headers, config) {
          if (typeof data == 'string' && (data.indexOf('ProcessFailed') > -1)) {
            deferredResponse.reject('Service Error');
            dialogService_.error(translate_.instant('error'), translate_.instant('error'));
          } else {
            var stats = {};
            stats.fieldname = attributeName;
            stats.statistics = {};
            goog.object.extend(stats.statistics, data);
            deferredResponse.resolve(stats);
          }
        }).error(function(data, status, headers, config) {
          console.log('----[ Warning: StatisticsService.summarizeAttribute error', data, status, headers, config);
          deferredResponse.reject('Service Error');
        });

      } else {
        deferredResponse.reject('Invalid layer type');
      }
      return deferredResponse.promise;
    };
  });
}());

