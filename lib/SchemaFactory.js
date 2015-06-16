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
      this['get' + j] = this.getGetMethod(this.schema[i][j]);
      this.createValidateMethod(this.schema[i], j);
      this.createSanitizeMethod(this.schema[i], j);
    }
  }

}


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
  this['get' + key] = function(options, includeSubTypes, includePrefixes){
    var tmp = clone(obj[key]);
    // replace subtypes (prefixed with '@' symbol)
    tmp = that._replaceSubTypes(tmp, includeSubTypes, includePrefixes || true);
    return merge(tmp, options);
  };
};

/**
 * getGetMethod
 *
 * Creates a GET accessor for the given object.
 *
 * @param object obj 
 * @param object key
 * @return void
 **/
SchemaFactory.prototype.getGetMethod = function(ref){
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
  return function(doc, includeSubTypes, includePrefixes){
    var tmp = clone(ref);
    // replace subtypes (prefixed with '@' symbol)
    tmp = this._replaceSubTypes(tmp, includeSubTypes, includePrefixes);
    return merge(tmp, doc);
  }.bind(this);
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
 * @param bool includePrefixes
 * @return object
 */
SchemaFactory.prototype._replaceSubTypes = function(doc, includeSubTypes, includePrefixes){
  var i, subdoc, tmp;

  for(i in doc){
    // private key, remove '$' char
    if(!includePrefixes && i.indexOf('$') === 0){
      tmp = doc[i];
      delete doc[i];
      i = i.replace('$', '');
      doc[i] = tmp;
    }
    // optional key, don't include this
    if(!includePrefixes && i.indexOf('~') === 0){
      tmp = doc[i];
      delete doc[i];
      continue;
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
        doc[i] = this._replaceSubTypes(doc[i], includeSubTypes, includePrefixes);
      }
    }
    else if(typeof doc[i] === 'string' && doc[i].indexOf('@') !== -1){
      // if supports multiple types, replace with null (empty)
      if(doc[i].indexOf(',') !== -1){
        if(includeSubTypes){
          subdoc = this.getDocByType(doc[i].split(',')[0].replace('@', ''));
          doc[i] = this._replaceSubTypes(subdoc, includeSubTypes, includePrefixes);
        }
        else{
          doc[i] = null;
        }
      }
      // else actually insert a document of the
      // specified type here
      else{
        if(includeSubTypes){
          subdoc = this.getDocByType(doc[i].replace('@', ''));
          doc[i] = this._replaceSubTypes(subdoc, includeSubTypes, includePrefixes);
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
          return clone(schema[i][j]);
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
        opt,
        priv,
        allowedTypes,
        subTypeError,
        match,
        errors = [],
        missingPropertyError;

    missingPropertyError = 'schema invalid, doc@type has missing property \'@prop\'';

    for(j in ref){

      // private field, remove '$' char
      priv = j.indexOf('$') === 0;
      dj = priv ? j.replace('$', '') : j;

      // optional field, remove '~' char
      opt = dj.indexOf('~') === 0;
      dj = opt ? dj.replace('~', '') : dj;

      // if this is not an optional field, make sure it exists
      if(!opt && typeof doc[dj] === 'undefined'){
        match = !!doc.type ? ' of type \'' + doc.type + '\'': '';
        errors.push(missingPropertyError.replace('@type', match).replace('@prop', dj));
        continue;
      }

      //
      // Sub Document Handling
      // =====================
      //
      // if 'ref' contains sub-document, find out what
      // type(s) it is in 'doc' and validate against that type
      //
      subTypeError = 'invalid subdocument, only type \'@type\' documents are permitted in the field \'' + j + '\'';

      if(typeof ref[j] === 'object' && ref[j] !== null){

        // this field supports multiple sub-document types and is
        // a list (supports multiple documents)
        if(typeof ref[j][0] === 'string' && ref[j][0].indexOf('@') !== -1){

          // check if each doc is of a correct type
          for(k = 0; k < doc[dj].length; ++k){
            match = false;
            for(p in ref[j]){
              if('@' + doc[dj][k].type === ref[j][p]){
                match = ref[j][p].replace('@', '');
                break;
              }
            }
            
            // if match, actually validate the contents of the sub-doc
            if(match){
              try{
                validateDoc(doc[dj][k], getDocByType(match));
              }
              catch(errs){
                if(!!errs.validation && errs.validation.length !== 0){
                  errors = errors.concat(errs.validation);
                }
              }
            }
            // else, there is an error
            else{
              errors.push(subTypeError.replace('@type', ref[j].join(',')));
            }
          }

        }
        // validate the object normally against the sub-element
        // of the reference
        else{
          try{
            validateDoc(doc[dj], ref[j]);
          }
          catch(errs){
            if(!!errs.validation && errs.validation.length !== 0){
              errors = errors.concat(errs.validation);
            }
          }
        }

      }
      else if(typeof ref[j] === 'string' && ref[j].indexOf('@') !== -1){

        // if null, this field contains no docs (which is allowed)
        // or, it is undefined and an optional field
        if(doc[dj] === null || (typeof doc[dj] === 'undefined' && opt)){
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
            if('@' + doc[dj].type === allowedTypes[p]){
              match = allowedTypes[p].replace('@', '');
              break;
            }
          }

          if(!match){
            errors.push(subTypeError.replace('@type', allowedTypes.join(',')));
          }

        }
        // only one sub-document type is allowed
        else{
          match = ref[j].replace('@', '');
          if(typeof doc[dj].type === 'undefined'){
            errors.push('invalid subdocument, doc of type \'' + match + '\' has missing subdocument in field \'' + dj + '\'');
            match = false;
          }
          else if(doc[dj].type !== match){
            errors.push(subTypeError.replace('@type', match));
            match = false;
          }

        }

        // if match, actually validate the contents of the sub-doc
        if(match){
          try{
            validateDoc(doc[dj], getDocByType(match));
          }
          catch(errs){
            if(!!errs.validation && errs.validation.length !== 0){
              errors = errors.concat(errs.validation);
            }
          }
        }

      }
      // } Sub Document Handling
      // if this is not an optional field, make sure type is ok
      else if(!opt && typeof ref[j] !== typeof doc[dj]){
        errors.push('schema invalid, property \'' + j + '\' has differing type to schema');
      }
    }

    // if errors detected, throw them
    if(errors.length !== 0){
      throw {
        validation : errors
      };
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
    var ref = clone(obj[key]);
    doc = JSON.parse(JSON.stringify(doc));
    return $this.sanitizeDoc(doc, ref);
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

  var i, k, j, res = {}, subdoc;

  // remove private fields from the document
  for(i in ref){
    k = i;
    if(i.indexOf('$') === 0){
      continue;
    }
    // remove optional key if present
    if(i.indexOf('~') === 0){
      k = i.replace('~', '');
      // allow these elements to be skipped
      if(typeof doc[k] === 'undefined'){
        continue;
      }
    }

    // its an object
    if(typeof ref[i] === 'object' && ref[i] !== null){
      if(doc[k] === null || typeof doc[k] === 'undefined'){
        res[k] = null;
      }
      // multiple documents, multiple types supported
      else if(typeof ref[i][0] === 'string' && ref[i][0].indexOf('@') !== -1){
        res[k] = [];
        // sanitize each sub doc
        for(j in doc[k]){
          subdoc = this.getDocByType(doc[k][j].type);
          res[k][j] = this.sanitizeDoc(doc[k][j], subdoc);
        }
      }
      else{
        // if array and empty, return
        if(Object.prototype.toString.call(doc[k]) === '[object Array]' &&
          doc[k].length === 0){
          res[k] = [];
        }
        // else, sanitize sub-object normally
        else{
          res[k] = this.sanitizeDoc(doc[k], ref[i]);
        }
      }
    }
    // one document -> multiple types supported
    else if(typeof ref[i] === 'string' && ref[i].indexOf('@') !== -1){
      if(doc[k] === null || typeof doc[k] === 'undefined'){
        res[k] = null;
      }
      else{
        // sanitize sub doc
        subdoc = this.getDocByType(doc[k].type);
        res[k] = this.sanitizeDoc(doc[k], subdoc);
      }
    }
    // its a string
    else if(typeof doc[k] !== 'undefined'){
      res[k] = doc[k]; 
    }
  }

  return res;

};

// export if we are using node.js
if( typeof module !== 'undefined' && !!module.exports ){
  module.exports = SchemaFactory;
}
