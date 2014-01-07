(function() {
  var module = angular.module('loom_test_service', []);

  var service_ = null;
  var mapService_ = null;
  var http_ = null;

  var timeout = null;
  var projection4326 = null;
  var projectionTarget = null;
  var runCounter = 0;
  var dateLastRun = null;

  module.provider('testService', function() {
    this.config = {

      // which part of the map to select a random point from
      latMin: -90,
      latMax: 90,
      lonMin: -180,
      lonMax: 180,

      // how far to zoom in / out
      zoomMin: 0,
      zoomMax: 14,

      // how often to run in milliseconds
      frequency: 10000,

      // if set and greater than zero, run will only run these many times and then automatically stop
      runCounterMax: 0,

      // username and password to connect to geoserver when making a Wfs Transaction
      username: 'admin',
      password: 'admin',

      // when true, in addition to moving the camera
      createFeature: true,

      // when createFeature is true, createFeatureConcurrentCount number of features will be created at once.
      // default is 1 causing only 1 feature creation per timer trigger
      createFeatureConcurrentCount: 5,

      // name of the layer to to which features will be added
      layerName: 'canchas_de_futbol', //'incidentes_copeco',

      // projection of the layer
      layerProjection: 'EPSG:900913',

      // name of the column to which a log msg will be written to when a feature is placed
      attributeName: 'comentarios',

      // this string gets prepended to the date and run count and features'
      // attributeName value will be set to the result
      attributeValuePrefix: 'TestModule',

      // if teh geometry attribute type is not geom, it can be set here. for example, 'the_geom'
      geomAttributeName: 'geom'
    };
    this.$get = function(mapService, $http) {
      service_ = this;
      mapService_ = mapService;
      http_ = $http;

      config.layerProjection = mapService_.map.getView().getView2D().getProjection().getCode();

      timeout = null;
      projection4326 = 'EPSG:4326';
      projectionTarget = config.layerProjection;
      runCounter = 0;
      dateLastRun = null;
      return this;
    };

    this.start = function(frequency) {
      if (timeout) {
        service_.stop();
      }

      if (typeof frequency !== 'undefined' && frequency) {
        config.frequency = frequency;
      }

      console.log('====[ startTest. frequency: ', config.frequency, ', config: ', config);
      run();
    };

    this.stop = function() {
      console.log('====[ stopTest');
      clearTimeout(timeout);
    };
  });

  function getRandomBetween(min, max) {
    return Math.random() * (max - min) + min;
  }

  function getRandomView() {
    var lat = getRandomBetween(config.latMin, config.latMax);
    var lon = getRandomBetween(config.lonMin, config.lonMax);
    var zoom = Math.floor(getRandomBetween(config.zoomMin, config.zoomMax));
    var point = new ol.geom.Point([lon, lat]);
    var transform = ol.proj.getTransform(projection4326, projectionTarget);
    point.transform(transform);

    return {
      center: {
        lon: point.getCoordinates()[0],
        lat: point.getCoordinates()[1]
      },
      zoom: zoom
    };
  }

  function setTimer() {
    if (typeof config.runCounterMax !== 'undefined' && (!config.runCounterMax || runCounter < config.runCounterMax)) {
      timeout = setTimeout(run, config.frequency);
    } else {
      console.log('----[ stopping TestModule because runCounter reached runCounterMax. runCounter: ' + runCounter);
      alert(' TestModule stopped as requested by runCounterMax. number of times ran: ' + runCounter);
      service_.stop();
    }
  }

  function getWfsData(lon, lat, date) {
    return '' +
        '<?xml version="1.0" encoding="UTF-8"?>' +
        '<wfs:Transaction xmlns:wfs="http://www.opengis.net/wfs"' +
        ' xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" ' +
        'service= "WFS" version="1.1.0" ' +
        'xsi:schemaLocation="http://www.opengis.net/wfs http://schemas.opengis.net/wfs/1.1.0/wfs.xsd">' +
        '<wfs:Insert>' +
        '<feature:' + config.layerName + ' xmlns:feature="http://www.geonode.org/">' +
        '<feature:' + config.geomAttributeName + '>' +
        '<gml:Point xmlns:gml="http://www.opengis.net/gml" srsName="' + config.layerProjection + '">' +
        '<gml:pos>' + lon + ' ' + lat + '</gml:pos>' +
        '</gml:Point>' +
        '</feature:' + config.geomAttributeName + '>' +
        '<feature:' + config.attributeName + '>' + config.attributeValuePrefix + ' runCounter: ' +
        runCounter + ' ' + date + '</feature:' + config.attributeName + '>' +
        '</feature:' + config.layerName + '>' +
        '</wfs:Insert>' +
        '</wfs:Transaction>';
  }


  function run() {
    runCounter += 1;
    dateLastRun = new Date();

    var view = getRandomView();
    mapService_.map.getView().getView2D().setCenter(view.center.lon, view.center.lat);

    if (config.createFeature) {
      var concurrentCompletedCount = 0;

      var successFunc = function() {
        concurrentCompletedCount += 1;
        // once the number of completed concurrent runs complete, set timer
        if (concurrentCompletedCount >= config.createFeatureConcurrentCount) {
          setTimer();
        }
      };

      for (var i = 0; i < config.createFeatureConcurrentCount; i += 1) {
        // if we are creating features, only set timer after previous create completes
        createFeature(view.center.lon, view.center.lat, successFunc);
      }
    } else {
      // when in only move map mode, set timer again.
      setTimer();
      console.log('---- move map @ ' + dateLastRun + '. runCounter: ' + runCounter + ', view: ', view);
    }
  }

  function createFeature(lon, lat, callback_success, callback_error) {

    if (config.username && config.password && (typeof config.headerData === 'undefined')) {
      config.headerData = {
        'Content-Type': 'text/xml;charset=utf-8',
        'Authorization': 'Basic ' + $.base64.encode(config.username + ':' + config.password)
      };
    }

    var timeInMillies = Date.now();

    var url = '/geoserver/wfs/WfsDispatcher';
    http_.post(url, getWfsData(lon, lat, dateLastRun), {headers: config.headerData})
        .success(function(data, status, headers, config) {
          if (status === 200) {

            // if a feature was inserted, post succeeded
            if (data.indexOf('<wfs:totalInserted>1</wfs:totalInserted>') !== -1) {
              console.log('---- createFeature success @ ' + dateLastRun + '. runCounter: ' + runCounter +
                  ' post duration: ', (Date.now() - timeInMillies), ', response: ', response);

              if (callback_success) {
                callback_success();
              }
            } else if (data.indexOf('ExceptionReport') !== -1) {
              console.log('====[ TestModule. Wfs Transaction Exception occured: ', data);
              service_.stop();
              var begin = data.indexOf('<ows:ExceptionText>');
              var end = data.indexOf('</ows:ExceptionText>');
              var exceptionText = '';
              if (begin !== -1 && end !== -1) {
                exceptionText = data.substring(begin + '<ows:ExceptionText>'.length, end);
              }
              alert('Wfs-T Exception! See console for response. ExceptionText: ' + exceptionText);
              if (callback_error) {
                callback_error();
              }
            } else {
              console.log('====[ TestModule. Unknown Status or Error #1: ', data);
              service_.stop();
              alert('Wfs-T Unknown Status or Error. See console for response.');
              if (callback_error) {
                callback_error();
              }
            }
          } else if (status === 401) {
            console.log('====[ Error: Wfs Transaction, Unauthorized: ', data);
            alert('TestModule. Wfs-T, unauthorized. Verify username: ' + config.username +
                ', password: ' + config.password);
            if (callback_error) {
              callback_error();
            }
          } else {
            console.log('====[ TestModule. Unknown Status or Error #2: ', data);
            service_.stop();
            alert('Wfs-T Unknown Status or Error. See console for response.');
            if (callback_error) {
              callback_error();
            }
          }
        });
  }

}());
