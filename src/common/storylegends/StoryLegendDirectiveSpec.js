describe( 'StoryLegendDirective', function() {
  var element, scope;
  var createLayer = function(id, name, titleAlias) {
    data = {
      uniqueID: id,
      title: name,
      config: {}
    };
    if(titleAlias) { data.config.titleAlias = titleAlias; }
    return {
      metadata: data,
      get: function(key) {
        return this.metadata;
      },
      set: function(key, value) {
        this.metadata = value;
      }
    };
  };
  beforeEach( module( 'MapLoom' ) );
  beforeEach( module( 'loom_storylegend' ) );
  beforeEach(module('storylegends/partials/storylegend.tpl.html'));
	beforeEach(function () {
		module(function ($provide) {
			$provide.factory('mapService', function () {
				return {
          getLayers: function(hidden, editable) {
            return [createLayer(1, 'Ocean Beach'), createLayer(2,'Ocean Beach', 'O.B.') ];
          }
				};
			});
			$provide.factory('configService', function () {
        return {
          configuration: {
            map: {
              layers: []
            }
          }
        };
      });
		});
	});
  beforeEach( inject( function(  $rootScope , $compile, $templateCache ) {
    scope = $rootScope.$new();
    element = angular.element('<div class="loom-storylegend"></div>');
    $compile(element)(scope);
    scope.$digest();
  }));

  it('shows no layers', function() {
    var layers = element.find('div label');
    expect(layers.length).toBe(0);
  });
  describe('layer-added', function() {
    beforeEach(function() {
      scope.$broadcast('layer-added');
    });
    it('shows two layers', function() {
      scope.$digest();
      var layers = element.find('div label');
      expect(layers.length).toBe(2);
    });
    it( 'gets all layers', inject( function() {
      expect(scope.layers.length).toBe(2);
    }));
    it( 'the layers have an id', inject( function() {
      expect(scope.layers[0]).toEqual(jasmine.objectContaining({
            id: 1
          }));
    }));
    it( 'the layers have a title', inject( function() {
      expect(scope.layers[0]).toEqual(jasmine.objectContaining({
            title: 'Ocean Beach'
          }));
    }));
    it( 'the layers can have a titleAlias', inject( function() {
      expect(scope.layers[1]).toEqual(jasmine.objectContaining({
            title: 'O.B.'
          }));
    }));
  });
  describe('#saveMasking', function() {
    beforeEach(function() {
      scope.$broadcast('layer-added');
    });
    it('saves the masking to the configration', function() {
      scope.layers[0].title = 'Test';
      scope.saveMasking();
      expect(scope.layers[0].layer.get('metadata').config.titleAlias).toBe('Test');
    });
  });
});
