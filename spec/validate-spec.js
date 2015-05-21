/**
 * SchemaFactory tests
 *
 * These tests verify the schema get/validate methods
 *
 * @author Conor Mac Aoidh <conormacaoidh@gmail.com>
 */
/* jshint camelcase:false */
'use strict';
console.log('test');

var SchemaFactory = require('../index');
var schema = require('../model/example-schema.json');

describe('tests methods of the SchemaFactory', function(){

  var sf;

  it('[beforeAll]: initializing schema factory with example schema', function(){
    sf = new SchemaFactory(schema);
  });

  it('should get a default document and insert all sub-types', function(){

    // make sure array was inserted for multiple sub-doc
    var doc = sf.getExampleDoc({
      subdoc_list_multiple : [ sf.getSubDoc2() ]
    }, true);

    // test properties exist
    expect(typeof doc.subdoc_list).toEqual('object');
    expect(typeof doc.object.subdoc).toEqual('object');
    expect(typeof doc.private).toEqual('string');
    expect(typeof doc.optional).toEqual('undefined');
    expect(typeof doc.private_optional).toEqual('undefined');

    // test subdoc
    expect(typeof doc.subdoc).toEqual('object');
    expect(typeof doc.subdoc.subdoc).toEqual('object');
    expect(typeof doc.subdoc.name).toEqual('string');
    expect(typeof doc.subdoc.private).toEqual('string');
    expect(typeof doc.subdoc.optional).toEqual('undefined');
    expect(typeof doc.subdoc.private_optional).toEqual('undefined');

    // test subdoc list
    expect(typeof doc.subdoc_list_multiple).toEqual('object');
    expect(typeof doc.subdoc_list_multiple[0]).toEqual('object');
    expect(typeof doc.subdoc_list_multiple[0].private).toEqual('string');
    expect(typeof doc.subdoc_list_multiple[0].optional).toEqual('undefined');
    expect(typeof doc.subdoc_list_multiple[0].private_optional).toEqual('undefined');

  });

  it('should fail validation of an example document', function(){
    try{
      sf.validateExampleDoc({
        name    : '',
        type    : 'example'
      });
    }
    catch(e){
      expect(e.validation[0]).toEqual('schema invalid, doc of type \'example\' has missing property \'subdoc\''); 
    }
  });

  it('should fail validation of an example document', function(){
    try{
      sf.validateExampleDoc({
        type    : 'example'
      });
    }
    catch(e){
      expect(e.validation[0]).toEqual('schema invalid, doc of type \'example\' has missing property \'name\'');
    }
  });

  it('should fail validation of an example document with sub-documents', function(){
    var doc = sf.getExampleDoc({ 
      'name'        : 'test',
      'subdoc_list' : sf.getSubDoc2()
    });
    try{
      sf.validateExampleDoc(doc);
    }
    catch(err){
      expect(err.validation[0]).toEqual('invalid subdocument, only type \'@subdoc1\' documents are permitted in the field \'subdoc_list\'');
    }
  });

  it('should pass validation of an example doc with sub-docs', function(){
    var doc = sf.getExampleDoc({ 
      'name'        : 'test',
      'subdoc'      : sf.getSubDoc1({}, true)
    }, true);
    try{
      sf.validateExampleDoc(doc);
    }
    catch(e){
      console.log(e);
      expect(false).toBe(true);
    }
  });

  it('should pass validation -> validating directly a get object', function(){
    try{
      sf.validateExampleDoc(sf.getExampleDoc({}, true));
    } catch(e){
      expect(false).toBe(true);
      console.log(e);
    }
  });

  it('should create and validate  example doc with optional fields', function() {
    var doc = sf.getExampleDoc();
    expect(typeof doc.optional).toEqual('undefined');
    expect(typeof doc.private_optional).toEqual('undefined');
    doc.optional = 'test';
    doc.private_optional = 'test1';
    try{
      sf.validateExampleDoc(doc);
    } catch(e){
      expect(false).toBe(true);
      console.log(e);
    }
  });

  it('should sanitize an example doc removing private fields', function() {
    var doc = sf.getExampleDoc();
    try{
      var cleanDoc = sf.sanitizeExampleDoc(doc);
      expect(typeof cleanDoc.private).toEqual('undefined');
      expect(typeof cleanDoc.private_optional).toEqual('undefined');
      expect(typeof cleanDoc.object.private).toEqual('undefined');
    } catch(e){
      expect(false).toBe(true);
      console.log(e);
    }
  });

});
