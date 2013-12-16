(function() {
  var module = angular.module('loom_config_service', []);

  angular.module('loom').config(function($httpProvider) {
    $httpProvider.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';
  });

  module.provider('configService', function() {
    this.configuration = {};

    this.$get = function($window, $http, $cookies, $location) {
      this.configuration = {
        about: {
          title: 'New Map',
          abstract: ''
        },
        map: {
          center: [-9707182.048613328, 1585691.7893914054],
          zoom: 14,
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
            'url': ('http://' + $location.host() + '/geoserver/wms'),
            'restUrl': '/gs/rest',
            'ptype': 'gxp_wmscsource',
            'name': 'local geoserver'
          },
          {
            'ptype': 'gxp_osmsource',
            'name': 'OpenStreetMap'
          }
        ],
        userprofilename: 'Anonymous',
        userprofileemail: '',
        id: 0,
        proxy: '/proxy?url='
      };

      if (goog.isDefAndNotNull($window.config)) {
        goog.object.extend(this.configuration, $window.config, {});
      }
      this.username = this.configuration.username;
      this.user_profile_name = this.configuration.userprofilename;
      this.user_profile_email = this.configuration.userprofileemail;
      this.proxy = this.configuration.proxy;
      this.csrfToken = $cookies.csrftoken;

      if (goog.isDefAndNotNull(this.configuration.map.zoom) && this.configuration.map.zoom == 0) {
        this.configuration.map.zoom = 1;
      }

      return this;
    };
  });
}());

