(function() {
  var module = angular.module('loom_geogit_service', []);

  // Private Variables
  var repos = [];
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
    this.$get = function($q, $http, $rootScope) {
      q = $q;
      http = $http;
      rootScope = $rootScope;
      repos.push(
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
      var repo = repos[repoId];
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

    this.getRepos = function() {
      return repos;
    };

    this.addRepo = function(repo) {
      repo.id = nextRepoId;
      nextRepoId = nextRepoId + 1;
      repos.push(repo);
    };
  });

}());
