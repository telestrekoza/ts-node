/*
 * API call wrapper
 */

(function() {
var sys = require('util');

var T = function() {
    T.superclass.constructor.apply(this, arguments);
    this.controller  = null;
};

T.BASE_API_PATH = "./api-latest/";
T.API_FILE_EXT = ".js";
T.FORMAT_JSON = ".json";
T.DOMAIN = "node.kliopa.net";
T.MSG_BOOTSTRAP = "Telestrekoza API bootstrap";
T.MSG_AUTH_NEEDED = "Authorization is needed to use this service";
T.DEBUG = true;

Base.extend( T, Base.HtmlController );

T.prototype.doHeaders = function() {
    var controllerType,
		headers = this.req.headers,
		auth = (headers || headers.authorization) ? headers.authorization : false;
	this._checkAuth(auth, this.getAuth, this);
};

T.prototype.getAuth = function(oauth) {
    //TODO:check too fast usage
	if(oauth) {
	    this._auth = oauth;
	    this._parseQuery( this.query );
		controllerType = (this._format == T.FORMAT_JSON) ? Base.JsonController : Base.HtmlController;
		this.controller = new controllerType(this.server, this.req, this.res, this.query);
		this.controller.doHeaders.call(this);
	} else {
	    var sys = require('util');
		sys.log("auth needed");
	    T.superclass.doHeaders.call(this);
	}
};

T.prototype.doBody = function() {
    var buf = T.MSG_BOOTSTRAP;
    if(this.query) {
    	//check auth
    	if(this._auth) {
    		//execute api request
    		buf = this.executeQuery(this._fileName, this._method, this.POST ? this.POST : this.GET);
    	} else
    		buf = T.MSG_AUTH_NEEDED;
    }
    this.res.write( this._formatResult( buf, this._format ));
    if(this.controller)
    	this.controller.doBody.call(this);
    else
    	T.superclass.doBody.call(this);
};

T.prototype._parseQuery = function( query ) {
	var url = require('url'),
		path = require('path'),
		_urlObj = url.parse(query, true),
		pathName = _urlObj.pathname;

	this._format = path.extname(pathName);
	this._fileName = path.dirname(pathName);
	this._method = path.basename(pathName,this._format);
	this._params = _urlObj.query;
};

T.prototype.executeQuery = function(  fileName, method, params) {
	var result,
	    API_Interface = Base.loadFile(T.BASE_API_PATH + 'api_interface.js'),
		API = Base.loadFile(T.BASE_API_PATH + fileName + T.API_FILE_EXT, API_Interface).API,
		ApiObject = API ? new API(this._auth) : null;
	
	if(ApiObject && ApiObject[method])
		try{
			result = ApiObject[method].apply(ApiObject, [params]);
			return result;
		} catch(e) { 
			if(T.DEBUG)
				return e;
			else
				return new Error("We catched error our side, sorry for that, please contact us and write a bug report.");
		}
	return new Error("Method not found");
};

T.prototype._parseAuthentification = function( data ) {
	var querystring = require('querystring'),
		oaData = data ? data.split('OAuth ')[1] : "",
		oaObject = oaData ? querystring.parse(oaData, ',') : null,
		key;
	for(key in oaObject) {
		oaObject[key] = oaObject[key].replace(/^\"(.*)\"$/, "$1");
	}
	return oaObject;
};

T.prototype._checkAuth = function(oauthString, callback, scope) {
	//TODO: use something like cookie, or sessions to cache this step
	//make async
	var self = this;
	process.nextTick( function() {
	   var oauth = self._parseAuthentification.call(self, oauthString),
	       sign_org = oauth.oauth_signature,
	       method = oauth.oauth_signature_method;
	   /*
	   var OAuth = require('node-oauth').OAuth;
	   var oa = new OAuth(
	          "http://node.kliopa.net/node/oauth/service.js/request_token"
            , "http://node.kliopa.net/node/oauth/service.js/access_token"
            , "WZBmfGH0u9cExrDB5iYow",  "9XpDfArpTBTONhraJoIF2zNN9Eg11vIwzLDlKzans"
            , "1.0", "http://node.kliopa.net/node/oauth/service.js/trace", 'HMAC-SHA1'//'PLAINTEXT'//"HMAC-SHA1"
	       );
	   */
	   var sys= require('util');
	   //sys.log(sys.inspect(oauth));
	   var signBase = self._createSignBase.call(self, oauth),
	       sign = self._createSignature.call(self, method, signBase, 'ahuOyEgcJe4j5XkSA0ggx5YjO9XkOSOIwrItZ8jI', '9XpDfArpTBTONhraJoIF2zNN9Eg11vIwzLDlKzans');
	   if(sign_org != sign) {
	       sys.log(sys.inspect(signBase));
	       sys.puts(sys.inspect(sign_org)+"\n"+sys.inspect(sign));
	   }
	   callback.call(scope ? scope : self, (sign_org == sign ) ? oauth : null);    
	});
};

T.prototype._formatResult = function(result, format) {
	switch( format) {
		case T.FORMAT_JSON: result = JSON.stringify(result);
				break;
		default: break;
	}
	return result;
};

/*
 util
*/

T.prototype._createSignBase = function(_oauth) {
        var sys = require('util');
        var urlUtil = require('url'),
            req = this.req,
            oauth = _oauth;
            method = req.method,
            proto = 'http://',
            host = req.headers.host ? req.headers.host : T.DOMAIN,
            urlObject = urlUtil.parse(req.url, true),
            url = this._encodeData(proto + host  + urlObject.pathname);
        delete oauth.oauth_signature;
        if(method == "GET" && urlObject.query) {
            //sys.log("D:"+sys.inspect(urlObject.query));
            oauth = Base.mix(oauth, urlObject.query);
        } else {
            //sys.log("Method:"+sys.inspect(this.POST));
            oauth = Base.mix(oauth, this.POST);
        }
        return [ method, url, this._encodeData( this._normaliseRequestParams(oauth) )].join('&');
};

T.prototype._createSignature= function(method, signatureBase, tokenSecret, consumerSecret) {
       if( tokenSecret === undefined ) var tokenSecret= "";
       else tokenSecret= this._encodeData( tokenSecret );
       // consumerSecret is already encoded
       var key= consumerSecret + "&" + tokenSecret;
    
       var hash= ""
       if( method == "PLAINTEXT" ) {
         hash= this._encodeData(key);
       }
       else {
         var sha1 = require('node-oauth/lib/sha1');
         //var sys = require('util');
         //sys.log(sys.inspect( signatureBase ));
         hash= sha1.HMACSHA1(key, signatureBase);
       }
    
       return hash;
};

T.prototype._encodeData= function(toEncode){
	if( !toEncode || toEncode == "" ) return ""
	else {
		var result= encodeURIComponent(toEncode);
		// Fix the mismatch between OAuth's  RFC3986's and Javascript's beliefs in what is right and wrong ;)
		return result.replace(/\!/g, "%21")
		          .replace(/\'/g, "%27")
		          .replace(/\(/g, "%28")
		          .replace(/\)/g, "%29")
		          .replace(/\*/g, "%2A");
		}
};
 
 // Takes a literal in, then returns a sorted array
T.prototype._sortRequestParams= function(argumentsHash) {
   var argument_pairs= [];
   for(var key in argumentsHash ) {
       argument_pairs[argument_pairs.length]= [key, argumentsHash[key]];
   }
   // Sort by name, then value.
   argument_pairs.sort(function(a,b) {
       if ( a[0]== b[0] )  {
         return a[1] < b[1] ? -1 : 1;
       }
       else return a[0] < b[0] ? -1 : 1;
   });
 
   return argument_pairs;
};
 
T.prototype._normaliseRequestParams= function(arguments) {
   var argument_pairs= this._sortRequestParams( arguments );
   var args= "";
   for(var i=0;i<argument_pairs.length;i++) {
       args+= this._encodeData( argument_pairs[i][0] );
       args+= "="
       args+= this._encodeData( argument_pairs[i][1] );
       if( i < argument_pairs.length-1 ) args+= "&";
   }
   return args;
};

export = T;

})();