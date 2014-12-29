/**
 *
 * Validate Document Update
 *
 * This is a couchdb design function that validates insertions
 * into the database in two ways:
 *
 * 1. checks the user is authorized to insert
 * 2. checks the document conforms to the database schema
 *
 * @author Conor Mac Aoidh <conor.macaoidh@shotclip.com>
 */
'use strict';

var SchemaFactory = require('../lib/SchemaFactory');
var schema = require('../model/example-schema.json');
var sf = new SchemaFactory(schema);

var validate = function(newDoc, oldDoc, userCtx){ 

  // if we are deleting, no need to validate
  if(newDoc._deleted === true){
    return true;
  }

  var error = { id : newDoc._id };

  // if the user is admin, let them do anything (except insert invalid docs)
  var admin = (userCtx.name === 'admin');

  var name = 'org.couchdb.user:' + userCtx.name;

  // check user can submit doc
  if(!admin){
    // if there is an old doc, make sure the user
    // has permission over it
    if(oldDoc){
      if(name !== oldDoc.userID){
        error.forbidden = 'Not Authorized - User must be owner of document being updated.';
        throw(error); 
      }
      // make sure there is no change of document type
      if(oldDoc.userID !== newDoc.userID){
        error.forbidden = 'Cannot change document user, operation not permitted';
        throw(error);
      }
    }
    if(name !== newDoc.userID){
      error.forbidden = 'Not Authorized - User must be owner of new document.';
      throw(error);
    }
  }

  // don't validate design functions
  if(newDoc._id.indexOf('_design') > -1){
    return true;
  }

  var schema = this.schema;

  // find doc type in this.schema
  var ref = false, i, j;
  for(i in schema){
    for(j in schema[i]){
      // if item type is the same as newDoc type,
      // we have found the schema reference
      if(schema[i][j].type === newDoc.type){
        if(i === 'SubDocSchemas'){
          error.validation = 'Sub-documents may not be directly inserted';
          throw(error);
        }
        ref = schema[i][j];
        break;
      }
    }
  }

  if(!ref){
    error.validation = 'document type is not in schema';
    throw(error);
  }

  var getDocByType = __getDocByTypeFunction__;

  __validateDocFunction__;

  // validate newDoc conforms to schema
  try{
    validateDoc(newDoc, ref);
  }
  catch(error){
    error.id = newDoc._id;
    throw(error);
  }

};

// replace validateDoc function with provided one
module.exports = validate.toString() 
    .replace('__validateDocFunction__', sf.getValidateMethod.toString())
    .replace('__getDocByTypeFunction__', sf.getDocByType.toString())
    .replace(/\/\*.+?\*\/|\/\/.*(?=[\n\r])/g, '');
console.log(module.exports);
