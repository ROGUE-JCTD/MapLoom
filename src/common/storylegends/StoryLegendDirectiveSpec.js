describe('StoryLegendDirective', function() {
  var element, scope, compiledElement;
  var createAttribute = function(name, type) {
    return {
      __prefix: '',
      _maxOccurs: 1,
      _minOccurs: 0,
      _name: name,
      _nillable: 'true',
      _type: type,
      visible: true
    };
  };
  var createLayer = function(id, name, titleAlias) {
    data = {
      uniqueID: id,
      title: name,
      config: {}
    };
    if (titleAlias) { data.config.titleAlias = titleAlias; }
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
  beforeEach(module('MapLoom'));
  beforeEach(module('loom_storylegend'));
  beforeEach(module('storylegends/partials/storylegend.tpl.html'));

  beforeEach(inject(function($rootScope, $compile, $templateCache) {
    scope = $rootScope.$new();
    scope.activeLayer = createLayer(1, 'Ocean Beach');
    element = angular.element('<div class="loom-storylegend" layer="activeLayer"></div>');
    compiledElement = $compile(element)(scope);
    scope.$digest();
  }));

  it('the layer has an id', inject(function() {
    expect(compiledElement.isolateScope().layerAlias).toEqual(jasmine.objectContaining({
      id: 1
    }));
  }));
  it('the layers have a title', inject(function() {
    expect(compiledElement.isolateScope().layerAlias).toEqual(jasmine.objectContaining({
      title: 'Ocean Beach'
    }));
  }));
  it('the layers can have a titleAlias', inject(function() {
    scope.activeLayer = createLayer(1, 'Ocean Beach', 'O.B.');
    scope.$digest();
    expect(compiledElement.isolateScope().layerAlias).toEqual(jasmine.objectContaining({
      title: 'O.B.'
    }));
  }));
  describe('#saveMasking', function() {
    it('saves the masking to the configration', function() {
      compiledElement.isolateScope().layerAlias.title = 'Test';
      compiledElement.isolateScope().saveMasking();
      expect(compiledElement.isolateScope().layer.get('metadata').config.titleAlias).toBe('Test');
    });
    it('saves the masking to the configration', function() {
      compiledElement.isolateScope().attributes = [{ name: 'Ocean Beach', alias: 'O.B.', show: true}];
      compiledElement.isolateScope().saveMasking();
      expect(compiledElement.isolateScope().layer.get('metadata').config.maskings['Ocean Beach'].alias).toBe('O.B.');
    });
  });
  describe('attributes', function() {
    var activeLayer;
    beforeEach(function() {
      activeLayer = createLayer(1, 'Ocean Beach', 'O.B.');
      var metadata = activeLayer.get('metadata');
      metadata.schema = [ createAttribute('Ocean', 'water')];
      activeLayer.set('metadata', metadata);
      scope.activeLayer = activeLayer;
      scope.$digest();
    });
    describe('by default', function() {
      it('have a name', inject(function() {
        expect(compiledElement.isolateScope().attributes[0]).toEqual(jasmine.objectContaining({
          name: 'Ocean'
        }));
      }));
      it('are shown', inject(function() {
        expect(compiledElement.isolateScope().attributes[0]).toEqual(jasmine.objectContaining({
          show: true
        }));
      }));
      it('have no alias', inject(function() {
        expect(compiledElement.isolateScope().attributes[0]).toEqual(jasmine.objectContaining({
          alias: ''
        }));
      }));
    });
  });
  describe('retrieve from config', function() {
    beforeEach(function() {
      activeLayer = createLayer(1, 'Ocean Beach', 'O.B.');
      var metadata = activeLayer.get('metadata');
      metadata.schema = [ createAttribute('Ocean', 'water')];
      metadata.config.maskings = { 'Ocean': { name: 'Ocean', alias: 'O.B.', show: false } };
      activeLayer.set('metadata', metadata);
      scope.activeLayer = activeLayer;
      scope.$digest();
    });
    it('have the alias', inject(function() {
      expect(compiledElement.isolateScope().attributes[0]).toEqual(jasmine.objectContaining({
        alias: 'O.B.'
      }));
    }));
    it('shown as expected', inject(function() {
      expect(compiledElement.isolateScope().attributes[0]).toEqual(jasmine.objectContaining({
        show: false
      }));
    }));
  });
});
