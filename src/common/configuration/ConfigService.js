(function() {
  var module = angular.module('loom_config_service', []);

  var service_ = null;

  module.factory('httpRequestInterceptor', function($cookieStore, $location) {
    return {
      request: function(config) {
        if (goog.isDefAndNotNull(config) && config.url.indexOf($location.protocol() + '://' + $location.host()) > -1 &&
            (config.method.toLowerCase() === 'post' || config.method.toLowerCase() === 'put')) {
          config.headers['X-CSRFToken'] = service_.csrfToken;
        }
        if (goog.isDefAndNotNull(config) && goog.isDefAndNotNull(config.url) && config.url.indexOf('http') === 0 &&
            config.url.indexOf($location.protocol() + '://' + $location.host()) !== 0) {
          var server = service_.getServerByURL(config.url);
          if (goog.isDefAndNotNull(server)) {
            if (!goog.isDefAndNotNull(server.authentication)) {
              config.headers['Authorization'] = '';
            } else {
              config.headers['Authorization'] = 'Basic ' + server.authentication;
            }
          }
          var configCopy = $.extend(true, {}, config);
          // var proxy = service_.configuration.proxy;
          // if (goog.isDefAndNotNull(proxy)) {
          //   configCopy.url = proxy + encodeURIComponent(configCopy.url);
          // }
          return configCopy;
        }
        return config;
      }
    };
  });

  module.config(function($httpProvider) {
    $httpProvider.interceptors.push('httpRequestInterceptor');
    $httpProvider.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';
  });

  module.provider('configService', function() {
    this.configuration = {};
    // This is to avoid a ciruclar dependency with the server service.
    this.serverList = null;

    this.$get = function($window, $http, $cookies, $location, $translate) {
      service_ = this;

      this.configuration = {
        about: {
          title: $translate.instant('new_map'),
          abstract: ''
        },
        map: {
          projection: 'EPSG:900913',
          center: [-9707182.048613328, 1585691.7893914054],
          zoom: 1,
          layers: [
            {
              'opacity': 1,
              'selected': true,
              'group': 'background',
              'name': 'mapnik',
              'title': 'OpenStreetMap',
              'args': ['OpenStreetMap'],
              'visibility': true,
              'source': 1,
              'fixed': true,
              'type': 'OpenLayers.Layer.OSM'
            }
          ]
        },
        sources: [
          {
            'url': (location.host + '/geoserver/web/'),
            'restUrl': '/gs/rest',
            'ptype': 'gxp_wmscsource',
            'name': 'local geoserver',
            'alwaysAnonymous': true,
            'isPrimaryGeoserver': true,
            'lazy': true
          },
          {
            'ptype': 'gxp_osmsource',
            'name': 'OpenStreetMap'
          }
        ],
        currentLanguage: 'en',
        username: 'anonymous',
        userprofilename: 'Anonymous',
        userprofileemail: '',
        authStatus: 401,
        id: 0,
        proxy: '/proxy/?url=',
        registryEnabled: true,
        nominatimUrl: 'http://nominatim.openstreetmap.org',
        fileserviceUrlTemplate: '/api/fileservice/view/{}',
        fileserviceUploadUrl: '/api/fileservice/',
        registryUrl: 'http://52.38.116.143',
        catalogList: [
          {name: 'hypersearch catalog 1', url: 'http://geoshape.geointservices.io/search/hypermap/'},
          {name: 'hypersearch catalog 2', url: 'http://geoshape.geointservices.io/search/hypermap/'}
        ]
      };

      if (goog.isDefAndNotNull($window.config)) {
        var sourceLen = Object.keys($window.config.sources).length;
        for (var i = 0; i < this.configuration.sources.length; i++) {
          $window.config.sources[sourceLen] = this.configuration.sources[i];
          sourceLen++;
        }
        $window.config.sources[sourceLen - 1] = this.configuration.sources[this.configuration.sources.length - 1];
        goog.object.extend(this.configuration, $window.config, {});

        console.log(this.configuration);
      }
      this.username = this.configuration.username;
      this.currentLanguage = this.configuration.currentLanguage;
      this.user_profile_name = this.configuration.userprofilename;
      this.user_profile_email = this.configuration.userprofileemail;
      this.user_name = this.configuration.username;
      this.proxy = this.configuration.proxy;
      this.csrfToken = $cookies.csrftoken;

      if (goog.isDefAndNotNull(this.configuration.map.zoom) && this.configuration.map.zoom === 0) {
        this.configuration.map.zoom = 0;
      }

      $translate.use(this.currentLanguage);

      return this;
    };

    this.isAuthenticated = function() {
      return service_.configuration.authStatus == 200;
    };

    this.getServerByURL = function(url) {
      var server = null;

      if (!goog.isDefAndNotNull(url)) {
        throw ({
          name: 'configService',
          level: 'High',
          message: 'undefined server url.',
          toString: function() {
            return this.name + ': ' + this.message;
          }
        });
      }

      for (var index = 0; index < service_.serverList.length; index += 1) {
        var subURL = service_.serverList[index].url;
        if (goog.isDefAndNotNull(subURL)) {
          if (subURL.indexOf('/wms') >= 0) {
            subURL = subURL.substring(0, subURL.indexOf('/wms'));
          }
          if (url.indexOf(subURL) === 0) {
            server = service_.serverList[index];
            break;
          }
        }
      }

      return server;
    };
  });
}());
