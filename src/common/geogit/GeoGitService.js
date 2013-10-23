(function() {
  var module = angular.module('loom_geogit_service', []);

  // Private Variables
  var nextRepoId = 0;

  // services
  var q, http, rootScope;

  var issueRequest = function(URL, deferredResponse) {
    http.jsonp(URL).then(function(response) {
      if (!goog.isDef(response.data.response.success) || response.data.response.success === true) {
        // Check for merge conflicts
        if (goog.isDef(response.data.response.Merge) && goog.isDef(response.data.response.Merge.conflicts)) {
          // Handle Merge Conflicts
          rootScope.$broadcast('geogit-merge-conflicts', response.data.response.Merge);
          deferredResponse.reject('CONFLICTS');
        } else {
          deferredResponse.resolve(response.data.response);
        }
      } else {
        deferredResponse.reject(response.data.response.error);
      }
    }, function(reject) {
      deferredResponse.reject(reject);
    }, function(update) {
      deferredResponse.update(update);
    });
  };

  module.provider('geogitService', function() {
    // public variables
    this.repos = [];

    this.$get = function($q, $http, $rootScope) {
      q = $q;
      http = $http;
      rootScope = $rootScope;
      this.addRepo(
          new GeoGitRepo('http://geoserver.rogue.lmnsolutions.com/geoserver/geogit/geonode:tegu_op_repo', 'master')
      );
      return this;
    };

    this.beginTransaction = function(repoId) {
      var deferredResponse = q.defer();
      var service = this;

      service.command(repoId, 'beginTransaction').then(function(response) {
        if (response.success === true) {
          var transaction = new GeoGitTransaction(service.command, repoId, response.Transaction);
          deferredResponse.resolve(transaction);
        } else {
          deferredResponse.reject(response.error);
        }
      }, function(reject) {
        deferredResponse.reject(reject);
      }, function(update) {
        deferredResponse.update(update);
      });

      return deferredResponse.promise;
    };

    this.command = function(repoId, command, options) {
      var deferredResponse = q.defer();
      var repo = this.repos[repoId];
      if (goog.isDefAndNotNull(repo)) {
        var URL = repo.url + '/' + command + '?output_format=JSON&callback=JSON_CALLBACK';
        if (goog.isDefAndNotNull(options)) {
          for (var property in options) {
            if (property !== null && options.hasOwnProperty(property)) {
              var underscore = property.indexOf('_');
              var trimmed;
              if (underscore > 0) {
                trimmed = property.substring(0, property.indexOf('_'));
              } else {
                trimmed = property;
              }
              if (goog.isArray(options[property])) {
                for (var i = 0; i < options[property].length; i++) {
                  var element = options[property][i];
                  URL += '&' + trimmed + '=' + element;
                }
              } else {
                URL += '&' + trimmed + '=' + options[property];
              }
            }
          }
        }
        issueRequest(URL, deferredResponse);
      }
      return deferredResponse.promise;
    };

    this.addRepo = function(repo) {
      repo.id = nextRepoId;
      nextRepoId = nextRepoId + 1;
      this.repos.push(repo);
      return repo.id;
    };

    this.parseFeatureType = function(featureType) {
      if (featureType) {
        var split = featureType.split(':');
        if (split.length === 1) {
          return {
            typeName: split[0]
          };
        }
        return {
          workspace: split[0],
          typeName: split[1]
        };
      }
      return null;
    };

    this.isLayerGroup = function(layer) {
      var featureType = layer.getSource().getParams().LAYERS;
      var url = layer.get('metadata').url + '/wms?SERVICE=WMS&VERSION=1.1.1&REQUEST=DescribeLayer&layers=' +
          featureType;
      url = '/proxy/?url=' + encodeURIComponent(url);

      var deferredResponse = q.defer();
      http.get(url).then(function(response) {
        // TODO: Refactor once there is a proper DescribeLayer parser
        // TODO: Test with imagery, or any layer without an associated WFS
        // TODO: Check to make sure it isn't a layer group with one layer
        var strings = response.data.split('</LayerDescription>');
        if (strings.length <= 2) {
          deferredResponse.resolve(response.data);
        } else {
          deferredResponse.reject('This is a layer group');
        }
      }, function(reject) {
        deferredResponse.reject(reject);
      }, function(update) {
        deferredResponse.update(update);
      });
      return deferredResponse.promise;
    };

    this.getLayer = function(layer) {
      var featureType = layer.getSource().getParams().LAYERS;

      var parsedFeatureType = this.parseFeatureType(featureType);
      // TODO: Make this work with a proxy once it supports authentication
      var url = layer.get('metadata').url + '/rest/layers/' + featureType + '.json';

      var deferredResponse = q.defer();
      http.get(url).then(function(response) {

        var resourceUrl = response.data.layer.resource.href;

        var datastoreStartIndex = resourceUrl.indexOf(parsedFeatureType.workspace + '/datastores');
        datastoreStartIndex = datastoreStartIndex + parsedFeatureType.workspace.length + 12;

        var datastoreEnd = resourceUrl.substr(datastoreStartIndex);
        var datastoreEndIndex = datastoreEnd.indexOf('/');
        var datastore = datastoreEnd.substring(0, datastoreEndIndex);
        deferredResponse.resolve(datastore);
      }, function(reject) {
        deferredResponse.reject(reject);
      }, function(update) {
        deferredResponse.update(update);
      });
      return deferredResponse.promise;
    };

    this.getDataStore = function(layer, name) {
      var featureType = layer.getSource().getParams().LAYERS;

      var parsedFeatureType = this.parseFeatureType(featureType);
      // TODO: Make this work with a proxy once it supports authentication
      var url = layer.get('metadata').url + '/rest/workspaces/' + parsedFeatureType.workspace + '/datastores/' + name +
          '.json';

      var deferredResponse = q.defer();
      http.get(url).then(function(response) {
        console.log(response);
        if (goog.isDefAndNotNull(response.data) && goog.isDefAndNotNull(response.data.dataStore) &&
            goog.isDefAndNotNull(response.data.dataStore.type)) {
          deferredResponse.resolve(response.data.dataStore);
        }
        deferredResponse.reject('Something went wrong when getting the datastore.');
      }, function(reject) {
        deferredResponse.reject(reject);
      }, function(update) {
        deferredResponse.update(update);
      });
      return deferredResponse.promise;
    };

    this.getFeatureType = function(layer, dataStore) {
      var featureType = layer.getSource().getParams().LAYERS;

      var parsedFeatureType = this.parseFeatureType(featureType);
      // TODO: Make this work with a proxy once it supports authentication
      var url = layer.get('metadata').url + '/rest/workspaces/' + parsedFeatureType.workspace + '/datastores/' +
          dataStore.name + '/featuretypes/' + parsedFeatureType.typeName + '.json';

      var deferredResponse = q.defer();
      http.get(url).then(function(response) {
        var metadata = layer.get('metadata');
        metadata.projection = response.data.featureType.srs;
        metadata.isGeoGit = true;
        metadata.geogitStore = dataStore.name;
        metadata.nativeName = response.data.featureType.nativeName;
        deferredResponse.resolve(response.data.featureType);
      }, function(reject) {
        deferredResponse.reject(reject);
      }, function(update) {
        deferredResponse.update(update);
      });
      return deferredResponse.promise;
    };

    this.isGeoGit = function(layer) {
      if (goog.isDefAndNotNull(layer)) {
        console.log(layer);
        if (!goog.isDefAndNotNull(layer.get('metadata').isGeoGit)) {
          // First check to see if this is a layer group
          var geogitService = this;
          var promise = this.isLayerGroup(layer);
          promise.then(function(resolved) {
            // Then get the layer information from the server for the datastore name
            console.log('resolved', resolved);
            promise = geogitService.getLayer(layer);
            promise.then(function(resolved) {
              // Then get the datastore to determine if it is a geogit datastore or not
              console.log('resolved', resolved);
              promise = geogitService.getDataStore(layer, resolved);
              promise.then(function(resolved) {
                // Finally get the needed information stored on the layer and create the repo object
                console.log('resolved', resolved);
                if (resolved.type === 'GeoGIT') {
                  promise = geogitService.getFeatureType(layer, resolved);
                  promise.then(function(resolved) {
                    console.log('resolved', resolved);
                    var id = geogitService.addRepo({url: layer.get('metadata').url});
                    layer.get('metadata').repoId = id;
                    console.log(layer);
                  }, function(rejected) {
                    console.log('rejected', rejected);
                  });
                } else {
                  layer.get('metadata').isGeoGit = false;
                }
              }, function(rejected) {
                console.log('rejected', rejected);
              });
            }, function(rejected) {
              console.log('rejected', rejected);
            });
          }, function(rejected) {
            console.log('rejected', rejected);
          });
        }
      }
      // If it is then get all of the information needed
    };
  });

}());
