'use strict';
const AWS = require('aws-sdk');
const fs = require('fs');
const s3 = new AWS.S3({ apiVersion: '2006-03-01' });
const byline = require('byline');
const zlib = require('zlib');
var path = require('path');

/* Globals */
var _this = this;
var	endpoint = process.env.ELASTICSEARCH_URL;
var index = process.env.ELASTICSEARCH_INDEX;
var doc = process.env.ELASTICSEARCH_DOCTYPE;
var endpointParts = endpoint.match(/^([^\.]+)\.?([^\.]*)\.?([^\.]*)\.amazonaws\.com$/);
var region = endpointParts[2];

exports.handler = (event, context, callback) => {

	console.log('Received event:', JSON.stringify(event, null, 2));
    
    event.Records.forEach(function(record) {
		var bucket = record.s3.bucket.name;
		var objKey = decodeURIComponent(record.s3.object.key.replace(/\+/g, ' '));
		console.log("Bucket: ", bucket);
		console.log("objKey: ", objKey);
		var s3ReadStream = s3.getObject({Bucket: bucket, Key: objKey}).createReadStream();
		var gunzip = zlib.createGunzip();
		var unzipped = byline(s3ReadStream.pipe(gunzip));
		_this.getFileLinesBatch(unzipped, 100, callback, postToES, false);
		
	});
}


var timestamp = new Date();
//Object for all the ElasticSearch Domain Info
var esDomain = {
	region: region,
	endpoint: endpoint,
	index: [index + '-' + timestamp.getUTCFullYear(),              // year
            ('0' + (timestamp.getUTCMonth() + 1)).slice(-2),  // month
            ('0' + timestamp.getUTCDate()).slice(-2)          // day
        	].join('.'),
	doctype: doc
};

//AWS Endpoint from created ES Domain Endpoint
var endpoint = new AWS.Endpoint(esDomain.endpoint);
/*
 * The AWS credentials are picked up from the environment.
 * They belong to the IAM role assigned to the Lambda function.
 * Since the ES requests are signed using these credentials,
 * make sure to apply a policy that permits ES domain operations
 * to the role.
 */
var creds = new AWS.EnvironmentCredentials('AWS')


/**
 * Parse the log file and return a object representaion of the log
 * @param {String} logdata 
 * @return {Object} dataObject
 */
exports.parse = (logData) => {
	var regexp = /\<(.*)>(.*) (.*) (.*): ([\d|.]*) \"(.)\" \"(.)\" \[(.*)\] \"(.*)\" (\d*) \"(.*)\"/g;
	var arr = regexp.exec(logData);
	var dataObject = {};
	try {
		dataObject = {
			"message": arr[0],
			"fasly": arr[1],
			"date": arr[2],
			"fastlyCache": arr[3],
			"fastlyS3": arr[4],
			"ip": arr[5],
			"one": arr[6],
			"two": arr[7],
			"accessdate": arr[8],
			"method": arr[9],
			"httpcode": arr[10],
			"three": arr[11]
		};
	} catch (err) {
		console.log("Faild to parse log row");
		console.log(err);
		dataObject = {"message": logData}
	}
	return dataObject;
}


/**
 * ElasticSearch bulk require a format for every logline.
 * 
 *  ' { "index": {} }'
 *  ' { "message", "logmessage" }'
 * 
 * If there is no need to set parse False. 
 * @param {String} logline 
 * @param {Boolean} parse
 * @return {Number} batchBody
 */
exports.formatLogLine = (logline, parse) => {
	var batchBody = JSON.stringify({ "index": {} });
	batchBody += "\n";
	if (parse) {
		batchBody += JSON.stringify(_this.parse(logline));
	} else {
		batchBody += logline;
	}
	batchBody += "\n";
	return batchBody;
}

var sendToES = function (stream, streamFinised, batch) {
	stream.resume();
}

/**
 * Will send log messages in a byline stream. Set batch size of the number of loglines sent to ElasticSearch.
 * 
 * @param {Stream} bylineStream. A byline stream of the logs
 * @param {Integer} batchSize. Size of the batch to send to ElasticSearch
 * @param {Callback} lambdaCallback. The LambdaCallback
 * @param {Callback} sendToESCallback. Callback with to handle sending data to ElasticSearch.
 * @param {Boolean} parse. If the log line should be parsed.
 */
exports.getFileLinesBatch = (bylineStream, batchSize, lambdaCallback, sendToESCallback, parse) => {
	var lineCount = 0;
	var batch = '';

	bylineStream.on('data', function (line) {
		lineCount++;
		batch += _this.formatLogLine(line.toString("utf-8"), parse);
		if (lineCount >= batchSize) {
			bylineStream.pause();
			sendToESCallback(bylineStream, false, batch, lambdaCallback);
			batch = '';
			lineCount = 0;
		}
	});
	bylineStream.on('end', function () {
		if(batch.length > 0){
			sendToESCallback(bylineStream, true, batch, lambdaCallback);
		} else {
			console.log("LogFile empty");
			lambdaCallback(null, "LogFile empty");
		}
	});
}


/**
 * Httpclient sends data to ElasticSearch. Used as callback.
 * 
 * @param {Stream} bylineStream. A byline stream of the logs
 * @param {Boolean} streamFinished. Stream empty?
 * @param {doc} doc. The body.
 * @param {Callback} lambdaCallback. The LambdaCallback
 */
function postToES(stream, streamFinished, doc, lambdaCallback) {
	var req = new AWS.HttpRequest(esDomain.endpoint);

	req.method = 'POST';
	req.path = path.join('/', esDomain.index, esDomain.doctype, '_bulk');
	req.region = esDomain.region;
	req.headers['presigned-expires'] = false;
	req.body = doc;
	req.headers['Host'] = endpoint.host;
	
	// Sign the request (Sigv4)
	var signer = new AWS.Signers.V4(req, 'es');
	signer.addAuthorization(creds, new Date());
	var send = new AWS.NodeHttpClient();

	 send.handleRequest(req, null, function (httpResp) {
	 	var respBody = '';
	 	httpResp.on('data', function (chunk) {
	 		respBody += chunk;
	 	});
	 	httpResp.on('end', function (chunk) {
			if(JSON.parse(respBody).errors){
	 	        lambdaCallback("ERROR: " + respBody);
	 	    }
	 		if (!streamFinished) {
	 			stream.resume();
	 		} else {
	 			lambdaCallback(null, 'Lambda added document ' + doc);
	 		}
	 	});
	 }, function (err) {
	 	console.log('Error: ' + err);
	 	lambdaCallback('Lambda failed with error ' + err);
	 });
}

