couch-schema
============

  A JavaScript application that implements a schema for couchdb.

  CouchDB is a schema-less database. This is useful in certain
circumstances and adds a degree of flexibility to the database.
However, in some cases a restricted schema is preferred.

  The SchemaFactory produces JSON objects which conform to a
schema. This enables the enforcement of application-level schema
validation. Also, an example couchdb design function is included
for validating documents inserted to the database on insertion.

- [Schema Documentation](#SubDocSchemas)
- [Example Schema Source (JSON)](/model/example-schema.json)
- [SchemaFactory Documentation](#SchemaFactory)
- [CouchDB validate_doc_update](#couchdb-validate_doc_update)

SubDocSchemas
=============

  These documents are sub-document types which can not be
directly inserted into the database. They are only inserted
as part of other documents.

  Fields with a subtype are denoted by an '@' symbol.

'key' : '@test'       

  This says that the field value should be replaced with a
sub-document of type 'test'.

'key' : '@test,@doc2' 

  This field accept either sub-documents of type 'test' or
those of type 'doc2'.

'key' : [ '@test1', '@test2' ]

  Finally, this denotes a field that acceptes multiple sub-
document types and has multiple documents as its value.

Private Fields
===============

Fields with a key containing the '$' symbol are considered
as private fields. Useful for API returns that want to return a
partial view of eg. a user account document.

Optional Fields
===============

Fields with a key containing the '~' symbol are considered
as optional/non-required fields.

The '~' symbol should be present only in the schema/reference,
not in the actual documents.

SchemaFactory
=============

  The SchemaFactory generates and validates documents that conform
to the schema. These documents can then be inserted into the
database with an assurance that they are valid.

SchemaFactory.getXXXDoc
=======================

Gets a document by its key. For example:

SchemaFactory.getExampleDoc()

If a second argument is provided, merges input
'doc' with doc in the schema:

```
var sf = new SchemaFactory(schema);
doc = sf.getExampleDoc({
  'name' : 'A Name'
});
```

The var doc should now look like this:

```
{
  type                  : example,
  name                  : 'A Name',
  subdoc                : null,
  subdoc_list           : [ ],
  subdoc_list_multiple  : [ ],
  object                : {
    test1   :   ,
    subdoc  :   null
  },
  test_list   : [ ],
  private    : ,
  optional   : ,
  private_optional : 
}
```

SchemaFactory.replaceSubTypes
=============================

  Search for sub-document identifiers (fields that begin with '@'
symbol) recursively. Replace them with the associated sub-document
in the schema.

For example (input):

```
{
  'type'        : 'example',
  'width'       : '',
  'height'      : '',
  'image'       : '@subdoc1'
}
```

Output:

```
{
  'type'        : 'example',
  'width'       : '',
  'height'      : '',
  'image'       : {
     'type'     : 'subdoc1',
     'bucket'   : '',
     'etag'     : '',
     'key'      : '',
     'location' : ''
  }
}
```

SchemaFactory.validateXXXDoc
============================

  The validate method ensures that a document conforms to the
schema specification.

For exaple (input):

```
SchemaFactory.validateExampleDoc({
  'type'        : 'example',
  'blah'        : ''
});
```

Should throw an error:

```
'blah' is not in schema.
```

SchemaFactory.sanitizeXXXDoc
============================

  Removes private fields from a document.

For exaple (input):

```
var doc = SchemaFactory.validateExampleDoc({
  'private' : 'test'
})
```

Should remove the element 'private' as
it is marked with an '$' in the schema.
