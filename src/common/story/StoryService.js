(function() {
  var module = angular.module('loom_story_service', ['ngCookies']);
  var service_ = null;
  var mapService_ = null;
  var configService_ = null;
  var httpService_ = null;
  var dialogService_ = null;
  var translate_ = null;
  var tableViewService_ = null;
  var featureManagerService_ = null;
  var rootScope_ = null;
  var q_ = null;
  var historyService_ = null;
  var diffService_ = null;


  module.provider('storyService', function() {

    this.$get = function($window, $http, $q, $cookies, $location, $translate, $rootScope, mapService, featureManagerService,
                         configService, dialogService, historyService, diffService, tableViewService) {
      service_ = this;
      q_ = $q;
      mapService_ = mapService;
      configService_ = configService;
      httpService_ = $http;
      dialogService_ = dialogService;
      translate_ = $translate;
      rootScope_ = $rootScope;
      tableViewService_ = tableViewService;
      featureManagerService_ = featureManagerService;
      historyService_ = historyService;
      diffService_ = diffService;

      //When initializing the story service the mapService should already be initialized
      this.title = '';
      this.abstract = '';
      this.category = null;
      this.is_published = false;
      //Stores the list of chapter (map) configuration objects and uses mapService to save map based on config
      this.configurations = [];
      this.removedChapterIDs = [];
      this.configurations.push(angular.copy(mapService_.configuration));
      this.active_index = 0;
      //All mapstories have one default chapter added
      this.active_layer = null;
      this.active_box = null;
      this.active_pin = null;
      this.active_chapter = this.configurations[this.active_index];
      this.active_chapter.map['id'] = 0;
      this.active_chapter.about.title = '';
      this.active_chapter.about.abstract = '';
      console.log('-----story_config:', this.active_chapter);
      this.id = this.active_chapter.id;
      this.category = null;
      this.is_published = false;
      this.keywords = [];

      return this;
    };

    this.hasNoHistory = function() {
      if (this.active_layer === null) {
        return true;
      }
      return !this.active_layer.get('metadata').isGeoGig;
    };

    this.getHistory = function() {
      var pathFilter = this.active_layer.get('metadata').nativeName.split(':')[1];
      historyService_.getHistory(this.active_layer, pathFilter);
    };

    this.clearHistory = function() {
      historyService_.clearHistory();
      diffService_.clearDiff();
    };

    this.clearSelectedItems = function() {
      this.active_layer = null;
      this.active_index = null;
      this.active_box = null;
      this.active_pin = null;
      this.active_chapter = null;
    };

    this.selectLayer = function(layer_config) {
      this.active_layer = layer_config;
    };

    this.selectBox = function(box) {
      this.active_box = box;
    };


    this.selectPin = function(pin) {
      this.active_pin = pin;
    };

    this.toggleVisiblity = function(layer) {
      layer.set('visible', !layer.get('visible'));
    };

    this.historyLoading = function(commit) {
      return goog.isDefAndNotNull(commit.loading) && commit.loading === true;
    };

    this.zoomToCommit = function(commit) {
      if (!goog.isDefAndNotNull(commit.feature)) {
        commit.loading = true;

        var lastCommitId = '0000000000000000000000000000000000000000';
        if (goog.isDefAndNotNull(commit.parents) && goog.isObject(commit.parents)) {
          if (goog.isDefAndNotNull(commit.parents.id)) {
            if (goog.isArray(commit.parents.id)) {
              lastCommitId = commit.parents.id[0];
            } else {
              lastCommitId = commit.parents.id;
            }
          }
        }
        var diffOptions = new GeoGigDiffOptions();
        diffOptions.oldRefSpec = lastCommitId;
        diffOptions.newRefSpec = commit.id;
        diffOptions.showGeometryChanges = true;
        diffOptions.pathFilter = historyService_.pathFilter;
        diffOptions.show = 1000;
        diffService_.performDiff(historyService_.repoId, diffOptions, true).then(function(response) {
          if (goog.isDefAndNotNull(response.Feature)) {
            if (goog.isDefAndNotNull(response.nextPage) && response.nextPage === true) {
              dialogService_.warn(translate_.instant('warning'),
                  translate_.instant('too_many_changes'), [translate_.instant('btn_ok')]);
            } else {
              diffService_.setTitle(translate_.instant('summary_of_changes'));
            }
          } else {
            dialogService_.open(translate_.instant('history'),
                translate_.instant('no_changes_in_commit'), [translate_.instant('btn_ok')]);
          }
          commit.loading = false;
          commit.feature = response.Feature.feature;
          mapService_.zoomToExtent(response.Feature.feature.extent, null, null, 0.5);
        }, function(reject) {
          //failed to get diff
          dialogService_.error(translate_.instant('error'),
              translate_.instant('diff_unknown_error'), [translate_.instant('btn_ok')]);
          commit.loading = false;
        });
      } else {
        mapService_.zoomToExtent(commit.feature.extent, null, null, 0.5);
      }
    };

    this.historyClicked = function(commit) {
      commit.loading = true;
      $('.loom-history-popover').popover('hide');
      var lastCommitId = '0000000000000000000000000000000000000000';
      if (goog.isDefAndNotNull(commit.parents) && goog.isObject(commit.parents)) {
        if (goog.isDefAndNotNull(commit.parents.id)) {
          if (goog.isArray(commit.parents.id)) {
            lastCommitId = commit.parents.id[0];
          } else {
            lastCommitId = commit.parents.id;
          }
        }
      }
      var diffOptions = new GeoGigDiffOptions();
      diffOptions.oldRefSpec = lastCommitId;
      diffOptions.newRefSpec = commit.id;
      diffOptions.showGeometryChanges = true;
      diffOptions.pathFilter = historyService_.pathFilter;
      diffOptions.show = 1000;
      diffService_.performDiff(historyService_.repoId, diffOptions).then(function(response) {
        if (goog.isDefAndNotNull(response.Feature)) {
          if (goog.isDefAndNotNull(response.nextPage) && response.nextPage === true) {
            dialogService_.warn(translate_.instant('warning'),
                translate_.instant('too_many_changes'), [translate_.instant('btn_ok')]);
          } else {
            diffService_.setTitle(translate_.instant('summary_of_changes'));
          }
        } else {
          dialogService_.open(translate_.instant('history'),
              translate_.instant('no_changes_in_commit'), [translate_.instant('btn_ok')]);
        }
        commit.loading = false;
        commit.feature = response.Feature.feature;
      }, function(reject) {
        //failed to get diff
        dialogService_.error(translate_.instant('error'),
            translate_.instant('diff_unknown_error'), [translate_.instant('btn_ok')]);
        commit.loading = false;
      });
    };

    this.historyMerge = function(commit) {
      return goog.isDefAndNotNull(commit.parents) && goog.isArray(commit.parents.id) &&
          commit.parents.id.length > 1;
    };

    this.showTable = function() {
      service_.active_layer.get('metadata').loadingTable = true;
      tableViewService_.showTable(service_.active_layer).then(function() {
        service_.active_layer.get('metadata').loadingTable = false;
        $('#table-view-window').modal('show');
      }, function() {
        service_.active_layer.get('metadata').loadingTable = false;
        dialogService_.error(translate_.instant('show_table'), translate_.instant('show_table_failed'));
      });
    };

    this.removeLayer = function() {
      dialogResult = dialogService_.warn(translate_.instant('remove_layer'), translate_.instant('sure_remove_layer'),
          [translate_.instant('yes_btn'), translate_.instant('no_btn')], false).then(function(button) {
        switch (button) {
          case 0:
            mapService_.map.removeLayer(service_.active_layer);
            rootScope_.$broadcast('layerRemoved', service_.active_layer);
            return true;
          case 1:
            return false;
        }
      });
      return dialogResult;
    };

    this.isNotEditable = function() {
      if (this.active_layer == null) {
        return true;
      }
      return (!this.active_layer.get('metadata').editable);
    };

    this.startFeatureAdd = function() {
      if (this.active_layer == null) {
        return;
      }
      featureManagerService_.startFeatureInsert(this.active_layer);
    };

    this.startFeatureEdit = function() {
      rootScope_.$broadcast('begin-edit');
      toastr.success('To edit an existing feature, just click on a feature that you want to edit.');
    };

    this.addPinLocation = function(pin) {
      featureManagerService_.startPinInsert(pin);
    };

    this.addBoxExtent = function(box) {
      goog.object.extend(box, {'extent': mapService_.map.getView().calculateExtent(mapService_.map.getSize())});
      toastr.success('Your StoryBox Bounds have been saved');
    };

    this.updateBoxExtent = function() {
      if (this.active_box === null) {
        return;
      }
      this.active_box.set('extent', mapService_.map.getView().calculateExtent(mapService_.map.getSize()));
      toastr.success('Your StoryBox Bounds have been saved');
    };

    //Save all chapter configuration objects
    this.saveMaps = function() {
      //Go through each chapter configuration and save accordingly through mapService
      for (var iConfig = 0; iConfig < this.configurations.length; iConfig += 1) {
        //Chapter index is determined by order in configuration
        service_.configurations[iConfig]['chapter_index'] = iConfig;
        mapService_.updateActiveMap(iConfig);
        mapService_.save(service_.configurations[iConfig]);
      }
      this.print_configurations();
    };

    //Method saves mapstory and underlying chapters
    this.save = function() {
      var cfg = {
        id: this.id || 0,
        title: this.title,
        abstract: this.abstract,
        is_published: this.is_published,
        category: this.category,
        removed_chapters: this.removedChapterIDs
      };

      console.log('saving Mapstory: ', this.title);
      httpService_({
        url: service_.getSaveURL(),
        method: service_.getSaveHTTPMethod(),
        data: JSON.stringify(cfg),
        headers: {
          'X-CSRFToken': configService_.csrfToken
        }
      }).success(function(data, status, headers, config) {
        //After we successfully save a mapstory update the composer to reference the backend object
        //and save chapters
        service_.updateStoryID(data.id);
        service_.removedChapterIDs = [];
        service_.saveMaps();
        if (service_.active_index !== null) {
          service_.update_active_config(service_.active_index, true);
        }
        console.log('----[ mapstory.save success. ', data, status, headers, config);
        if (cfg.is_published === true) {
          toastr.success('Congratulations. Your MapStory has been published.', 'Publish Successful');
        }else {
          toastr.success('Your MapStory has successfully been saved.', 'Save Successful');
        }
      }).error(function(data, status, headers, config) {
        if (status == 403 || status == 401) {
          // dialogService_.error(translate_.instant('save_failed'), translate_.instant('mapstory_save_permission'));
          toastr.error('You do not have permission to do that.', 'Permissions Error');
        } else {
          // dialogService_.error(translate_.instant('save_failed'), translate_.instant('mapstory_save_failed', {value: status}));
          toastr.error('Your MapStory has failed to save.', 'Save Failed');
        }
      });

    };

    this.saveChapterView = function() {
      this.active_chapter.zoom = mapService_.getZoom();
      this.active_chapter.center = mapService_.getCenter();
      toastr.success(translate_.instant('saveChapterView'), translate_.instant('saveViewTitle'));
    };

    this.updateStoryID = function(id) {
      this.id = id;
      for (var iConfig = 0; iConfig < this.configurations.length; iConfig += 1) {
        this.configurations[iConfig].id = id;
      }
    };

    this.getSaveURL = function() {
      if (goog.isDefAndNotNull(this.id) && this.id) {
        return '/maps/' + this.id + '/save';
      } else {
        return '/maps/new/story';
      }
    };

    this.getSaveHTTPMethod = function() {
      if (goog.isDefAndNotNull(this.id) && this.id) {
        return 'PUT';
      } else {
        return 'POST';
      }
    };

    this.print_configurations = function() {
      console.log('=====configurations======');
      for (var iConfig = 0; iConfig < this.configurations.length; iConfig += 1) {
        console.log('configuration ', iConfig, this.configurations[iConfig]);
      }
    };

    //Composer only allows you to edit one chapter at a time
    //This function should be called whenever we select a different chapter from the list.
    this.update_active_config = function(index, deleteOverride) {
      //This function updates the active_chapter and propagates the new
      //active configuration to the other services.
      if (this.active_index === index && !goog.isDefAndNotNull(deleteOverride)) {
        return;
      }
      this.active_chapter = this.configurations[index];
      this.active_index = index;

      mapService_.updateActiveMap(this.active_index, this.active_chapter);
      rootScope_.$broadcast('chapter-switch', this.active_index);
    };

    this.getLayers = function() {
      var layers = mapService_.map.getLayers().getArray();

      for (var iLayer = 0; iLayer < layers.length; iLayer += 1) {
        var layer = layers[iLayer];
        if (!goog.isDefAndNotNull(layer.get('metadata')) ||
            (goog.isDefAndNotNull(layer.get('metadata').vectorEditLayer) &&
            layer.get('metadata').vectorEditLayer)) {
          layers.splice(iLayer, 1);
          console.log('Logging getLayers layer: ' + layer);

        }
      }

      return layers;
    };

    this.add_chapter = function() {
      //The config service is the entrypoint and contains the initial configuration for a chapter
      var new_chapter = angular.copy(configService_.initial_config);
      //If the initial config included a layer at load remove that from chapters after 1
      if (goog.isDefAndNotNull(new_chapter.fromLayer)) {
        delete new_chapter.fromLayer;
        new_chapter.map.layers.splice(new_chapter.map.layers.length - 1, 1);
        goog.object.remove(new_chapter.sources, goog.object.getCount(new_chapter.sources) - 1);
      }
      new_chapter['id'] = this.id;
      new_chapter.map['id'] = 0;
      new_chapter.about.title = '';
      new_chapter.about.abstract = '';
      this.configurations.push(new_chapter);
      //This creates the new layergroup on the open layers map that is being displayed.
      //Parameter is currently unused, but may be changed if we decide map load should occur here.
      mapService_.create_chapter(new_chapter);
      var new_index = (this.configurations.length - 1);
      //Immediately set focus to new chapter after creation. This causes the new chapter map to load
      service_.update_active_config(new_index);
      mapService_.loadMap(new_chapter);
      rootScope_.$broadcast('chapter-added', new_index);
      this.print_configurations();

      return new_index;
    };

    this.reorder_chapter = function(from_index, to_index) {
      this.configurations.splice(to_index, 0, this.configurations.splice(from_index, 1)[0]);
      mapService_.reorderLayerGroup(from_index, to_index);
    };

    this.canRemoveChapter = function() {
      return (service_.configurations.length > 1);
    };

    this.remove_chapter = function() {
      var removed_index = q_.defer();
      if (this.canRemoveChapter() === false) {
        dialogService_.error(translate_.instant('remove_chapter'), translate_.instant('cannot_remove_chapter'));
        removed_index.resolve(null);
        return removed_index.promise;
      }
      removed_index = dialogService_.warn(translate_.instant('remove_chapter'), translate_.instant('sure_remove_chapter'),
          [translate_.instant('yes_btn'), translate_.instant('no_btn')], false).then(function(button) {
        switch (button) {
          case 0:
            //If the chapter map has been saved beforehand we need to remove that chapter link
            map_id = service_.configurations[service_.active_index].map.id;
            if (map_id !== 0) {
              service_.removedChapterIDs.push(map_id);
            }

            //Remove the active chapter from the list of configurations
            removed_index = service_.active_index;
            mapService_.remove_chapter(removed_index);
            service_.configurations.splice(removed_index, 1);
            rootScope_.$broadcast('chapter-removed', removed_index);
            return removed_index;
          case 1:
            return null;
        }
      });
      return removed_index;
    };

  });

}());
