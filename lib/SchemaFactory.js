/* 
 * SchemaFactory
 * -------------
 *
 * The SchemaFactory produces JSON objects which conform to a
 * schema. This enables the enforcement of application-level
 * schema validation.
 * 
 * @author Conor Mac Aoidh <conormacaoidh@gmail.com>
 */
/* jshint camelcase:false */
/* jshint unused:false */
'use strict';

/**
 * clone
 *
 * creates a clone of a variable
 *
 * @param object obj
 * @return object
 */
function clone(obj) {
    var copy;

    // Handle the 3 simple types, and null or undefined
    if(null === obj || 'object' !== typeof obj){
      return obj;
    }

    // Handle Date
    if (obj instanceof Date) {
        copy = new Date();
        copy.setTime(obj.getTime());
        return copy;
    }

    // Handle Array
    if (obj instanceof Array) {
        copy = [];
        for (var i = 0, len = obj.length; i < len; i++) {
            copy[i] = clone(obj[i]);
        }
        return copy;
    }

    // Handle Object
    if (obj instanceof Object) {
        copy = {};
        for (var attr in obj) {
            if (obj.hasOwnProperty(attr)) {
              copy[attr] = clone(obj[attr]);
            }
        }
        return copy;
    }

    return false;
}

/**
 * merge
 *
 * Recursively merge properties of two objects 
 *
 * @param object obj1
 * @param object obj2
 * @return object
 */
function merge(obj1, obj2) {

  for (var p in obj2) {
    try {
      // Property in destination object set; update its value.
      if ( obj2[p].constructor === Object ) {
        obj1[p] = merge(obj1[p], obj2[p]);

      } else {
        obj1[p] = obj2[p];

      }

    } catch(e) {
      // Property in destination object not set; create it and set its value.
      obj1[p] = obj2[p];

    }
  }

  return obj1;
}

/**
 *
 * SchemaFactory
 * =============
 *
 * The Schema Factory
 *
 * @return object
 **/
function SchemaFactory(schema){

  this.schema = schema;

  // create dynamic methods
  for(var i in this.schema){
    for(var j in this.schema[i]){
      this.createGetMethod(this.schema[i], j);
      this.createValidateMethod(this.schema[i], j);
      this.createSanitizeMethod(this.schema[i], j);
    }
  }

}


/**
 * createGetMethod
 *
 * Creates a GET accessor for the given object.
 *
 * @param object obj 
 * @param object key
 * @return void
 **/
SchemaFactory.prototype.createGetMethod = function(obj, key){
  var that = this;
  /**
   * getXXXDoc
   *
   * Get a doc from the schema populated with
   * default values.
   *
   * var doc = getExampleDoc({
   *    "name" : "A Name",
   *    "desc" : "A description"
   * });
   *
   * The options argument is merged with
   * the default schema object.
   *
   * Use 'includeSubTypes' option to get all
   * subtypes and place empty sub-docs in this
   * document.
   *
   * @param object options
   * @param bool includeSubTypes
   * @return object
   **/
  this['get' + key] = function(options, includeSubTypes){
    var tmp = clone(obj[key]);
    // replace subtypes (prefixed with '@' symbol)
    tmp = that._replaceSubTypes(tmp, includeSubTypes);
    return merge(tmp, options);
  };
};

/**
 * _replaceSubTypes
 *
 * replaces a document that contains fields
 * denoting sub-docs with a '@', with the
 * associated sub-doc in this.schema (recursively)
 *
 * @param object doc
 * @param bool includeSubTypes
 * @return object
 */
SchemaFactory.prototype._replaceSubTypes = function(doc, includeSubTypes){
  var i, subdoc, tmp;

  for(i in doc){
    // private key, remove '$' char
    if(i.indexOf('$') === 0){
      tmp = doc[i];
      delete doc[i];
      i = i.replace('$', '');
      doc[i] = tmp;
    }
    // optional key, remove '~' char
    if(i.indexOf('~') === 0){
      tmp = doc[i];
      delete doc[i];
      i = i.replace('~', '');
      doc[i] = tmp;
    }
    if(typeof doc[i] === 'object' && doc[i] !== null){

      // if the first element is a string with an '@' char, this means
      // that the field is a list that contain any of the sub-doc types
      // denoted
      if(typeof doc[i][0] === 'string' && doc[i][0].indexOf('@') !== -1){
        doc[i] = [];
      }
      // replace subtypes in the object 
      else{
        doc[i] = this._replaceSubTypes(doc[i], includeSubTypes);
      }
    }
    else if(typeof doc[i] === 'string' && doc[i].indexOf('@') !== -1){
      // if supports multiple types, replace with null (empty)
      if(doc[i].indexOf(',') !== -1){
        doc[i] = null;
      }
      // else actually insert a document of the
      // specified type here
      else{
        if(includeSubTypes){
          subdoc = this.getDocByType(doc[i].replace('@', ''));
          doc[i] = this._replaceSubTypes(subdoc, includeSubTypes);
        }
        else{
          doc[i] = null;
        }
      }
    }
  }
  return doc;
};

/**
 * getDocByTypeFunction
 *
 * Returns a function which can be used to find a
 * document by its type. This function is used in the
 * validate_doc_update design function, which uses a
 * different 'schema' reference - so inject the
 * 'schema' reference as appropriate.
 *
 * @param string schema
 * @return function
 */
SchemaFactory.prototype.getDocByTypeFunction = function(schema){
  return function(type){
    for(var i in schema){
      for(var j in schema[i]){
        if(schema[i][j].type === type){
          return schema[i][j];
        }
      }
    }
    throw new Error('No Document of the specified type \'' + type + '\' are contained in the schema.');
  };
};

/**
 * getDocByType
 *
 * Returns a document by its type field.
 *
 * Throws an error if the type is not found.
 *
 * @param object doc
 * @return object
 */
SchemaFactory.prototype.getDocByType = function(type){
  // use our generic getDocByTypeFunction, inject schema
  // into it's scope
  return this.getDocByTypeFunction(this.schema)(type);
};

/**
 * getValidateMethod
 *
 * returns a validate method
 *
 * note:  Function is returned rather than just being
 *        defined normally as this is also used in the
 *        validate_doc_update design function, where the
 *        function needs to be able to call itself
 *        (without being an object member, just as
 *        'validateDoc').
 *
 * @param object ref
 * @return function
 */
SchemaFactory.prototype.getValidateMethod = function(){
  var getDocByType = this.getDocByTypeFunction(this.schema);
  /**
   * validateDoc
   * 
   * Validate an object conforms to the database
   * schema.
   *
   * Throws an error on failure.
   *
   * @param object doc 
   * @param object ref
   * @return bool
   **/
  return function validateDoc(doc, ref){

    var j, 
        p, 
        k,
        dj,
        allowedTypes,
        subTypeError,
        match;

    for(j in ref){

      // optional/private key, remove '$', '~' char
      if(j.indexOf('$') || j.indexOf('~')){
        dj = j.replace('$', '');
        dj = dj.replace('~', '');
      }

      //
      // Sub Document Handling
      // =====================
      //
      // if 'ref' contains sub-document, find out what
      // type(s) it is in 'doc' and validate against that type
      //
      subTypeError = 'The reference schema only permits sub-documents of the type \'@type\' in the field \'' + j + '\'';

      if(typeof ref[j] === 'object' && ref[j] !== null){

        // this field supports multiple sub-document types and is
        // a list (supports multiple documents)
        if(typeof ref[j][0] === 'string' && ref[j][0].indexOf('@') !== -1){

          // check if each doc is of a correct type
          for(k in doc[dj]){
            match = false;
            for(p in ref[j]){
              if('@' + doc[dj][k].type === ref[j][p]){
                match = ref[j][p].replace('@', '');
                break;
              }
            }
            
            // if no match, there is an error
            if(!match){
              throw({'validation' : subTypeError.replace('@type', ref[j].join(','))});
            }

            // now, actually validate the contents of the sub-doc
            validateDoc(doc[dj][k], getDocByType(match));
          }

        }
        // validate the object normally against the sub-element
        // of the reference
        else{
          validateDoc(doc[dj], ref[j]);
        }

      }
      else if(typeof ref[j] === 'string' && ref[j].indexOf('@') !== -1){

        // if null, this field contains no docs (which is allowed)
        if(doc[dj] === null){
          continue;
        }

        // multiple sub-document types are allowed by the
        // reference
        if(ref[j].indexOf(',') !== -1){

          // check if doc contains one of the
          // allowed types
          allowedTypes = ref[j].split(',');
          match = false;
          for(p in allowedTypes){
            if(doc[dj].type === '@' + allowedTypes[p]){
              match = allowedTypes[p].replace('@', '');
              break;
            }
          }

          if(!match){
            throw({'validation' : subTypeError.replace('@type', allowedTypes.join(','))});
          }

        }
        // only one sub-document type is allowed
        else{

          match = ref[j].replace('@', '');
          if(typeof doc[dj] === 'undefined' || typeof doc[dj].type === 'undefined'){
            throw({'validation':'doc of type \'' + match + '\' has missing subdocument \'' + dj + '\''});
          }
          else if(doc[dj].type !== match){
            throw({'validation': subTypeError.replace('@type', match)});
          }

        }

        // now, actually validate the contents of the sub-doc
        validateDoc(doc[dj], getDocByType(match));

      }
      // } Sub Document Handling

      // if this is not an optional or private key, make sure it exists/type is ok
      else if(j === dj){

        // property should be in doc
        if(!doc.hasOwnProperty(dj)){
          match = doc.type ? ' of type \'' + doc.type + '\'': '';
          throw({'validation':'doc' + match + ' has missing property \'' + j + '\''});
        } 

        // types should be the same
        if(typeof ref[j] !== typeof doc[dj]){
          throw({'validation':'doc field \'' + j + '\' has differing type to schema'});
        }
      }

    }

    return true;

  };

};

/**
 * createValidateMethod
 *
 * Creates a validate method for the given obj, key.
 *
 * @param object obj
 * @param object key
 * @return void
 */
SchemaFactory.prototype.createValidateMethod = function(obj, key){
  var $this = this;
  /**
   * validateXXXDoc
   * 
   * Validate an object conforms to the database
   * schema. Example:
   *
   * if(validateExampleDoc(doc))
   *
   * Throws an error on failure.
   *
   * @param object doc 
   * @return bool
   **/
  $this['validate' + key] = function(doc){
    // make sure  the doc type is ok
    if(doc.type && doc.type !== obj[key].type){
      throw({'validation':'This document is of type ' + doc.type + ', however this validate method is for the type ' + obj[key].type});
    }
    // call our generic validate method, with our non-generic params
    return $this.getValidateMethod()(doc, obj[key]);
  };
};

/**
 * createSanitizeMethod
 *
 * Creates a sanitize method for the given obj, key.
 *
 * @param object obj
 * @param object key
 * @return void
 */
SchemaFactory.prototype.createSanitizeMethod = function(obj, key){
  var $this = this;
  /**
   * sanitizeXXXDoc
   * 
   * Sanitize a document, removing private fields
   * in the schema. Useful for API returns that
   * want to return a partial view of eg. a user
   * account document.
   *
   * if(sanitizeExampleDoc(doc))
   *
   * Throws an error on failure.
   *
   * @param object doc 
   * @return bool
   **/
  $this['sanitize' + key] = function(doc){
    // call our generic validate method, with our non-generic params
    return $this.sanitizeDoc(doc, obj[key]);
  };
};

/**
 * getSchema
 *
 * Returns the schema object.
 *
 * @return object
 **/
SchemaFactory.prototype.getSchema = function(){
  return this.schema;
};

/**
 * sanitizeDoc
 *
 * Returns a document stripped of all
 * private fields.
 *
 * @param object doc
 * @return object
 */
SchemaFactory.prototype.sanitizeDoc = function(doc, ref){

  var i, k, res = {};
  // remove private fields from the document
  for(i in ref){
    if(i.indexOf('$') !== 0){
      // remove optional key if present
      if(i.indexOf('~') === 0){
        k = i.replace('~', '');
        if(typeof doc[k] === 'object' && doc[k] !== null){
          res[k] = this.sanitizeDoc(doc[k], ref[i]);
        }
        if(typeof doc[k] !== 'undefined'){
          res[k] = doc[k];
        }
      }
      else if(typeof doc[i] === 'object' && doc[i] !== null){
        res[i] = this.sanitizeDoc(doc[i], ref[i]);
      }
      else if(typeof doc[i] !== 'undefined'){
        res[i] = doc[i];
      }
    }
  }

  return res;

};

// export if we are using node.js
if( typeof module !== 'undefined' && !!module.exports ){
  module.exports = SchemaFactory;
}
