(function() {

DBObject = function(db) {
	this._db = db;
	this._collectionID = this.constructor.COLLECTION ? this.constructor.COLLECTION : DBObject.COLLECTION;
	this._collection = null;
};

DBObject.COLLECTION="";

/*
 * static memebers
 */
DBObject.toObjectID = function( id, db ) {
    var mongoObjects = db.bson_serializer;
    return new mongoObjects.ObjectID(id);
};

/*
 * public methods
 */
DBObject.prototype.load = function( query, filter, options, callback, params, scope ) {
	var self = this,
		db = this._db,
		result = [], idx = 0;
	
	if(!this._collectionID || this._collectionID == "" ) {
	    return false;
	}
	
	db.collection( this._collectionID, function( err, col ) {
		self._collection = col;
		col.find( query, filter, options, function(err, cursor) {
			cursor.each(function(err, doc) {
				if(doc) {
					if(self.preParseData)
						doc = self.preParseData.call(self, doc);
					result[idx++] = doc;
				} else {
				    self._postLoad.call( self, result, callback, params, scope);
				}
			});
		});
	});
	
	return true;
};

DBObject.prototype._postLoad = function(data, callback, params, scope) {
	if(scope === true || !scope) {
		scope = params;
		params = null;
	}
	
	if( !params ) {
		params = [];
	}
	params[params.length] = data;
    
    callback.apply(scope, params);
};

DBObject.prototype._create = function( col, obj, scope ) {
	col.insert(obj, function(err, docs) {
		if(scope)
			scope.apply(scope, arguments);
	});
};

DBObject.prototype.create = function( obj, scope ) {
	var self = this,
		db = this._db,
		result = [], idx = 0;
	
	if(!this._collectionID || this._collectionID == "" ) {
	    return false;
	}
	if(this._collection)
		this._create(this._collection, obj, scope);
	else
	    db.collection( this._collectionID, function( err, col ) {
		    self._collection = col;
		    self._create.call(self, col, obj, scope);
	    });
	
	return true;
};

DBObject.prototype._save = function(col, obj, callback, scope) {
    var sys = require("sys");
    sys.log("save dbobj");
    col.save(obj, function(err, docs) {
        if(callback && scope)
            callback.apply(scope, arguments);
    });
};

DBObject.prototype.save = function(obj, callback, scope) {
    if(this._collection)
        this._save(this._collection, obj, callback, scope);
    else
        callback.call(scope, "error: no collection found");
};

DBObject.prototype.toString = function() {
    var name = this.constructor.NAME ? this.constructor.NAME : this.constructor.COLLECTION;
	return "DBObject::" + name;
};

exports.DBObject = DBObject;

})();