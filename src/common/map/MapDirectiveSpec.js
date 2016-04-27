describe('MapDirective', function() {
  var element, scope, compiledElement, mapService;
  beforeEach(module('MapLoom'));
  beforeEach(module('loom_map_directive'));

  beforeEach(inject(function($rootScope, $compile, $templateCache, _mapService_) {
    scope = $rootScope.$new();
    element = angular.element('<div loom-map map-id="preview"></div>');
    compiledElement = $compile(element)(scope);
    scope.$digest();
    mapService = _mapService_;
  }));
  describe('creates a openlayers map', function() {
    it('includes the OL3 classes', function() {
      //expect(compiledElement.find('#preview')).to.beTrue;
    });
  });
});
