describe('layer/layerService', function() {
  var layerService;
  var createLayerWithMetadata = function(metadata) {
    return {
      metadata: metadata,
      get: function(key) {
        return this.metadata;
      },
      set: function(key, value) {
        this.metadata = value;
      }
    };
  };
  var createLayer = function(id, name, titleAlias) {
    data = {
      uniqueID: id,
      title: name,
      config: {}
    };
    if (titleAlias) { data.config.titleAlias = titleAlias; }
    return createLayerWithMetadata(data);
  };
  var createLayerWithAttributes = function(id, name, attributes) {
    data = {
      uniqueID: id,
      title: name,
      schema: []
    };
    if(attributes) { data.schema = attributes; }
    return createLayerWithMetadata(data);
  };
  beforeEach(module('MapLoom'));
  beforeEach(module('loom_layers'));
  beforeEach(module('loom_layer_service'));

  beforeEach(inject(function(_layerService_) {
    layerService = _layerService_;
  }));
  describe('#getTitle', function() {
    describe('no titleAlias', function() {
      it('returns the title ', function() {
        expect(layerService.getTitle(createLayer(1, 'Ocean Beach'))).toEqual('Ocean Beach');
      });
    });
    describe('has titleAlias', function() {
      it('returns the title alias', function() {
        expect(layerService.getTitle(createLayer(1, 'Ocean Beach', 'O.B.'))).toEqual('O.B.');
      });
    });
  });
  describe('#getAttributes', function() {
    describe('no attributes', function() {
      it('returns empty array', function() {
        expect(layerService.getAttributes(createLayerWithAttributes(1, 'Ocean Beach'))).toEqual([]);
      });
    });
    describe('has attributes', function() {
      it('returns array of attributes', function() {
        var attr = [{ _type: 'Test' }];
        expect(layerService.getAttributes(createLayerWithAttributes(1, 'Ocean Beach', attr))).toEqual(attr);
      });
    });
    describe('has gml attributes', function() {
      it('does not return gml attributes', function() {
        var attr = [{ _type: 'gml:Test' }];
        expect(layerService.getAttributes(createLayerWithAttributes(1, 'Ocean Beach', attr))).toEqual([]);
      });
    });
  });
});
