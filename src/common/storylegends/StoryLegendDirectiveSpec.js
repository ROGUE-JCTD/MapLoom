describe('StoryLegendDirective', function() {
  var element, scope, compiledElement;
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

  it('shows one layer', function() {
    scope.$digest();
    var layers = element.find('div label');
    expect(layers.length).toBe(1);
  });
  it('the layers have an id', inject(function() {
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
  });
});
