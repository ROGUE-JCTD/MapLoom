(function() {
  var module = angular.module('loom_geogit_service', []);

  // Private Variables
  var nextRepoId = 0;

  // services
  var q, http, rootScope, dialogService_;

  var service_ = null;

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
    this.repos = {};
    this.numRepos = 0;

    this.$get = function($q, $http, $rootScope, dialogService) {
      service_ = this;
      q = $q;
      http = $http;
      rootScope = $rootScope;
      dialogService_ = dialogService;
      rootScope.$on('layerRemoved', service_.removeRepo);
      return service_;
    };

    this.beginTransaction = function(repoId) {
      var deferredResponse = q.defer();

      service_.command(repoId, 'beginTransaction').then(function(response) {
        if (response.success === true) {
          var transaction = new GeoGitTransaction(service_.command, repoId, response.Transaction);
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
      var repo = service_.repos[repoId];
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

    this.addRepo = function(newRepo) {
      for (var repoId in service_.repos) {
        if (service_.repos.hasOwnProperty(repoId)) {
          var repo = service_.repos[repoId];
          if (repo.isEqual(newRepo)) {
            repo.refCount++;
            return repo.id;
          }
        }
      }
      newRepo.refCount = 1;
      newRepo.id = nextRepoId;
      nextRepoId = nextRepoId + 1;
      service_.repos[newRepo.id] = newRepo;
      service_.numRepos++;

      var remoteOptions = new GeoGitRemoteOptions();
      remoteOptions.list = true;
      service_.command(newRepo.id, 'remote', remoteOptions).then(function(response) {
        if (response.success === true) {
          if (goog.isDefAndNotNull(response.Remote)) {
            if (goog.isDefAndNotNull(response.Remote.length)) {
              for (var index = 0; index < response.Remote.length; index++) {
                newRepo.remotes.push(response.Remote[index]);
              }
            } else {
              newRepo.remotes.push({name: response.Remote.name, branches: []});
            }
          }
        }
      });
      var branchOptions = new GeoGitBranchOptions();
      branchOptions.list = true;
      branchOptions.remotes = true;
      service_.command(newRepo.id, 'branch', branchOptions).then(function(response) {
        if (response.success === true) {
          var index;
          var remoteIndex;
          console.log(response);
          if (goog.isDefAndNotNull(response.Local.Branch)) {
            if (goog.isDefAndNotNull(response.Local.Branch.length)) {
              for (index = 0; index < response.Local.Branch.length; index++) {
                newRepo.branches.push(response.Local.Branch[index].name);
              }
            } else {
              newRepo.branches.push(response.Local.Branch.name);
            }
          }
          if (goog.isDefAndNotNull(response.Remote.Branch)) {
            if (goog.isDefAndNotNull(response.Remote.Branch.length)) {
              for (index = 0; index < response.Remote.Branch.length; index++) {
                for (remoteIndex = 0; remoteIndex < newRepo.remotes.length; remoteIndex++) {
                  if (newRepo.remotes[remoteIndex].name === response.Remote.Branch[index].remoteName) {
                    newRepo.remotes[remoteIndex].branches.push(response.Remote.Branch[index].name);
                  }
                }
              }
            } else {
              for (remoteIndex = 0; remoteIndex < newRepo.remotes.length; remoteIndex++) {
                if (newRepo.remotes[remoteIndex].name === response.Remote.Branch.remoteName) {
                  newRepo.remotes[remoteIndex].branches.push(response.Remote.Branch.name);
                }
              }
            }
          }
        }
      });
      rootScope.$broadcast('repoAdded', newRepo);
      return newRepo.id;
    };

    this.removeRepo = function(event, removedLayer) {
      var repoId = removedLayer.get('metadata').repoId;
      var repo = service_.repos[repoId];
      repo.refCount--;
      if (repo.refCount <= 0) {
        delete service_.repos[repoId];
        service_.numRepos--;
        rootScope.$broadcast('repoRemoved', repo);
      }
    };

    this.parseWorkspaceRoute = function(featureType) {
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

    this.isNotLayerGroup = function(layer) {
      var featureType = layer.getSource().getParams().LAYERS;
      var url = layer.get('metadata').url + '/wms?SERVICE=WMS&VERSION=1.1.1&REQUEST=DescribeLayer&layers=' +
          featureType;
      if (SERVER_SERVICE_USE_PROXY) {
        url = '/proxy/?url=' + encodeURIComponent(url);
      }
      var deferredResponse = q.defer();
      http.get(url).then(function(response) {
        // TODO: Refactor once there is a proper DescribeLayer parser
        // TODO: Test with imagery, or any layer without an associated WFS
        // TODO: Check to make sure it isn't a layer group with one layer
        var strings = response.data.split('</LayerDescription>');
        if (strings.length <= 2) {
          deferredResponse.resolve(response.data);
        }
      }, function(reject) {
        deferredResponse.reject(reject);
      });
      return deferredResponse.promise;
    };

    this.getDataStoreName = function(layer) {
      var featureType = layer.getSource().getParams().LAYERS;
      var workspaceRoute = service_.parseWorkspaceRoute(featureType);
      // TODO: Make this work with a proxy once it supports authentication
      var url = layer.get('metadata').url + '/rest/layers/' + featureType + '.json';
      var deferredResponse = q.defer();
      http.get(url).then(function(response) {
        var resourceUrl = response.data.layer.resource.href;
        var datastoreStartIndex = resourceUrl.indexOf(workspaceRoute.workspace + '/datastores');
        datastoreStartIndex = datastoreStartIndex + workspaceRoute.workspace.length + 12;
        var datastoreEnd = resourceUrl.substr(datastoreStartIndex);
        var datastoreEndIndex = datastoreEnd.indexOf('/');
        var datastore = datastoreEnd.substring(0, datastoreEndIndex);
        deferredResponse.resolve(datastore);
      }, function(reject) {
        deferredResponse.reject(reject);
      });
      return deferredResponse.promise;
    };

    this.getDataStore = function(layer, name) {
      var featureType = layer.getSource().getParams().LAYERS;
      var workspaceRoute = service_.parseWorkspaceRoute(featureType);
      // TODO: Make this work with a proxy once it supports authentication
      var url = layer.get('metadata').url + '/rest/workspaces/' + workspaceRoute.workspace + '/datastores/' + name +
          '.json';
      var deferredResponse = q.defer();
      http.get(url).then(function(response) {
        if (goog.isDefAndNotNull(response.data) && goog.isDefAndNotNull(response.data.dataStore) &&
            goog.isDefAndNotNull(response.data.dataStore.type)) {
          deferredResponse.resolve(response.data.dataStore);
        }
        deferredResponse.reject('Something went wrong when getting the datastore.');
      }, function(reject) {
        deferredResponse.reject(reject);
      });
      return deferredResponse.promise;
    };

    this.getFeatureType = function(layer, dataStore) {
      var featureType = layer.getSource().getParams().LAYERS;
      var workspaceRoute = service_.parseWorkspaceRoute(featureType);
      // TODO: Make this work with a proxy once it supports authentication
      var url = layer.get('metadata').url + '/rest/workspaces/' + workspaceRoute.workspace + '/datastores/' +
          dataStore.name + '/featuretypes/' + workspaceRoute.typeName + '.json';
      var deferredResponse = q.defer();
      http.get(url).then(function(response) {
        response.data.featureType.workspace = workspaceRoute.workspace;
        deferredResponse.resolve(response.data.featureType);
      }, function(reject) {
        deferredResponse.reject(reject);
      });
      return deferredResponse.promise;
    };

    this.isGeoGit = function(layer) {
      if (goog.isDefAndNotNull(layer)) {
        var metadata = layer.get('metadata');
        if (!goog.isDefAndNotNull(metadata.isGeoGit)) {
          // First check to see if this is not a layer group
          service_.isNotLayerGroup(layer).then(function() {
            // Then get the layer information from the server for the datastore name
            service_.getDataStoreName(layer).then(function(dataStoreName) {
              // Then get the datastore to determine if it is a geogit datastore or not
              service_.getDataStore(layer, dataStoreName).then(function(dataStore) {
                // Finally get the needed information stored on the layer and create the repo object
                if (dataStore.type === 'GeoGIT') {
                  service_.getFeatureType(layer, dataStore).then(function(featureType) {
                    var repoName = dataStore.connectionParameters.entry[0].$;
                    repoName = repoName.substring(repoName.lastIndexOf('/' || '\\') + 1, repoName.length);
                    var id = service_.addRepo(
                        new GeoGitRepo(metadata.url + '/geogit/' + featureType.workspace + ':' + dataStore.name,
                            dataStore.connectionParameters.entry[1].$, repoName));
                    metadata.projection = featureType.srs;
                    metadata.isGeoGit = true;
                    metadata.workspace = featureType.workspace;
                    metadata.geogitStore = dataStore.name;
                    metadata.nativeName = featureType.nativeName;
                    metadata.repoId = id;
                  }, function(rejected) {
                    dialogService_.error(
                        'Error', 'Unable to get feature type of GeoGit data store. (' + rejected.status + ')');
                  });
                } else {
                  metadata.isGeoGit = false;
                }
              }, function(rejected) {
                dialogService_.error('Error', 'Unable to get the data store. (' + rejected.status + ')');
              });
            }, function(rejected) {
              dialogService_.error('Error', 'Unable to determine the data store name. (' + rejected.status + ')');
            });
          }, function(rejected) {
            dialogService_.error(
                'Error', 'Unable to determine if the layer was a layer group. (' + rejected.status + ')');
          });
        }
      }
    };
  });
}());
